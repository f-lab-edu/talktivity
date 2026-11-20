import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { SQL } from "bun";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("Use bun run test:db to start the isolated local database.");
const db = new SQL(databaseUrl, { max: 4, idleTimeout: 5, connectionTimeout: 5 });
const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";

beforeEach(async () => {
  await db`truncate public.products, public.credit_ledger, public.coupons, public.reports, auth.users cascade`;
  await db`insert into auth.users(id) values (${user}), (${other})`;
});
afterAll(() => db.close());

describe("쿠폰 원장", () => {
  it("성공 시 잔액과 사용 횟수를 늘리고 사용자별 중복을 거절한다", async () => {
    await db`insert into coupons(code, credits) values ('WELCOME', 3)`;
    expect(await db`select redeem_coupon(${user}, 'WELCOME') as credited`).toEqual([
      { credited: 3 },
    ]);
    await expect(Promise.resolve(db`select redeem_coupon(${user}, 'WELCOME')`)).rejects.toThrow(
      "COUPON_ALREADY_USED",
    );
    expect(await db`select credit_balance(${user}) as balance`).toEqual([{ balance: 3 }]);
    expect(await db`select redeemed_count from coupons`).toEqual([{ redeemed_count: 1 }]);
    expect(await db`select redeem_coupon(${other}, 'WELCOME') as credited`).toEqual([
      { credited: 3 },
    ]);
  });

  it.each([
    ["EXPIRED", "now() - interval '1 second'", true, 0, null, "COUPON_EXPIRED"],
    ["INACTIVE", "null", false, 0, null, "COUPON_NOT_FOUND"],
    ["EXHAUSTED", "null", true, 1, 1, "COUPON_EXHAUSTED"],
  ] as const)(
    "사용할 수 없는 쿠폰 %s를 거절한다",
    async (code, expiry, active, count, max, error) => {
      await db.unsafe(
        "insert into coupons(code, credits, expires_at, active, redeemed_count, max_redemptions) values ($1, 2, " +
          expiry +
          ", $2, $3, $4)",
        [code, active, count, max],
      );
      await expect(Promise.resolve(db`select redeem_coupon(${user}, ${code})`)).rejects.toThrow(
        error,
      );
      expect(await db`select credit_balance(${user}) as balance`).toEqual([{ balance: 0 }]);
    },
  );

  it("존재하지 않는 쿠폰을 거절한다", async () => {
    await expect(Promise.resolve(db`select redeem_coupon(${user}, 'MISSING')`)).rejects.toThrow(
      "COUPON_NOT_FOUND",
    );
  });

  it("마지막 쿠폰을 동시에 사용해도 한 사용자에게만 지급한다", async () => {
    await db`insert into coupons(code, credits, max_redemptions) values ('LAST', 2, 1)`;
    const results = await Promise.allSettled([
      db`select redeem_coupon(${user}, 'LAST')`,
      db`select redeem_coupon(${other}, 'LAST')`,
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db`select sum(delta)::int as total from credit_ledger`).toEqual([{ total: 2 }]);
  });
});

describe("구매·리포트·환불", () => {
  it("거래 재전송은 크레딧을 중복 지급하지 않는다", async () => {
    expect(await db`select grant_credits(${user}, 5, 'purchase', 'txn_one') as inserted`).toEqual([
      { inserted: true },
    ]);
    expect(await db`select grant_credits(${user}, 5, 'purchase', 'txn_one') as inserted`).toEqual([
      { inserted: false },
    ]);
    expect(await db`select credit_balance(${user}) as balance`).toEqual([{ balance: 5 }]);
  });

  it("잔액이 없으면 리포트도 원장도 저장하지 않는다", async () => {
    await expect(
      Promise.resolve(db`select save_report(${user}, '{"headline":"test"}'::jsonb)`),
    ).rejects.toThrow("INSUFFICIENT_CREDITS");
    expect(await db`select count(*)::int as count from reports`).toEqual([{ count: 0 }]);
    expect(await db`select count(*)::int as count from credit_ledger`).toEqual([{ count: 0 }]);
  });

  it("잔액 1에서 동시 저장은 정확히 하나만 성공한다", async () => {
    await db`select grant_credits(${user}, 1, 'purchase', 'txn_race')`;
    const results = await Promise.allSettled([
      db`select save_report(${user}, '{"headline":"first"}'::jsonb)`,
      db`select save_report(${user}, '{"headline":"second"}'::jsonb)`,
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason.message).toBe("INSUFFICIENT_CREDITS");
    expect(await db`select credit_balance(${user}) as balance`).toEqual([{ balance: 0 }]);
    expect(await db`select count(*)::int as count from reports`).toEqual([{ count: 1 }]);
    expect(await db`select delta from credit_ledger where reason = 'report'`).toEqual([
      { delta: -1 },
    ]);
  });

  it("환불은 해당 거래의 지급량만 회수하며 중복 회수하지 않는다", async () => {
    await db`select grant_credits(${user}, 5, 'purchase', 'txn_refund')`;
    await db`select grant_credits(${user}, 2, 'coupon', 'OTHER')`;
    await db`select save_report(${user}, '{}'::jsonb)`;
    expect(await db`select revoke_purchase(${user}, 'txn_refund', 'adj_one') as inserted`).toEqual([
      { inserted: true },
    ]);
    expect(await db`select revoke_purchase(${user}, 'txn_refund', 'adj_one') as inserted`).toEqual([
      { inserted: false },
    ]);
    expect(await db`select credit_balance(${user}) as balance`).toEqual([{ balance: 1 }]);
    expect(await db`select delta from credit_ledger where reason = 'refund'`).toEqual([
      { delta: -5 },
    ]);
  });

  it("이미 쓴 크레딧의 환불은 음수 잔액을 허용한다", async () => {
    await db`select grant_credits(${user}, 1, 'purchase', 'txn_spent')`;
    await db`select save_report(${user}, '{}'::jsonb)`;
    await db`select revoke_purchase(${user}, 'txn_spent', 'adj_spent')`;
    expect(await db`select credit_balance(${user}) as balance`).toEqual([{ balance: -1 }]);
  });
});

describe.each(["anon", "authenticated"])("%s 권한 경계", (role) => {
  const calls = [
    `select credit_balance('${user}')`,
    `select grant_credits('${user}', 1, 'purchase', 'fake')`,
    `select redeem_coupon('${user}', 'WELCOME')`,
    `select save_report('${user}', '{}')`,
    `select revoke_purchase('${user}', 'txn', 'adj')`,
  ];
  it.each(calls)("결제 함수를 실행할 수 없다: %s", async (query) => {
    await expect(
      db.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        await tx.unsafe(query);
      }),
    ).rejects.toThrow("permission denied for function");
  });
  it.each(["credit_ledger", "coupons", "reports", "products"])(
    "%s 테이블을 조회할 수 없다",
    async (table) => {
      await expect(
        db.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx.unsafe(`select * from ${table}`);
        }),
      ).rejects.toThrow("permission denied for table");
    },
  );
  it("상품을 등록할 수 없다", async () => {
    await expect(
      db.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        await tx`insert into products(price_id, name, credits) values ('pri_denied', '팩', 1)`;
      }),
    ).rejects.toThrow("permission denied for table");
  });
});

it("service_role은 RLS가 켜진 결제 함수와 테이블을 사용한다", async () => {
  const rows = await db.begin(async (tx) => {
    await tx`set local role service_role`;
    await tx`select grant_credits(${user}, 1, 'purchase', 'txn_service')`;
    await tx`select save_report(${user}, '{}'::jsonb)`;
    return tx`select credit_balance(${user}) as balance`;
  });
  expect(rows).toEqual([{ balance: 0 }]);
});

it("service_role은 상품을 등록하고 기본값과 함께 조회한다", async () => {
  const rows = await db.begin(async (tx) => {
    await tx`set local role service_role`;
    await tx`insert into products(price_id, name, credits) values ('pri_service', '팩', 3)`;
    return tx`select price_id, name, credits, active, sort from products`;
  });
  expect(rows).toEqual([
    { price_id: "pri_service", name: "팩", credits: 3, active: true, sort: 0 },
  ]);
});
