import type { Metadata } from "next";
import Link from "next/link";
import { fallbackTier, formatPrice, reportTitle } from "@/lib/purchase";
import { pricedCatalog } from "@/lib/server/paddle";

export const metadata: Metadata = {
  title: "요금 안내 | 톡티비티",
  description: "톡티비티 무료 분석, 유료 리포트 가격과 크레딧 이용·결제·환불 안내",
};

export const dynamic = "force-static";
export const revalidate = 600;

export default async function PricingPage() {
  const products = await pricedCatalog().catch((error: unknown) => {
    if (!(error instanceof Error)) throw error;
    console.warn("Pricing catalog unavailable", { error: error.name });
    return [];
  });
  const rows =
    products.length > 0
      ? products
      : [
          {
            priceId: "fallback",
            name: "상세 리포트 1회",
            credits: 1,
            amount: fallbackTier,
            currency: "KRW",
          },
        ];

  return (
    <article className="legal-page">
      <h1>요금 안내</h1>
      <section>
        <h2>무료 분석</h2>
        <ul>
          <li>대화 말투 분석</li>
          <li>4글자 대화 유형과 캐릭터</li>
          <li>공유 카드</li>
        </ul>
      </section>
      <section>
        <h2>유료 상세 리포트</h2>
        <p>{reportTitle}</p>
        <p>크레딧은 유료 리포트 이용 단위입니다. 상세 리포트 1회에 크레딧 1개를 사용합니다.</p>
        <div className="legal-table-wrap">
          <table>
            <caption>유료 리포트 상품 가격</caption>
            <thead>
              <tr>
                <th scope="col">상품명</th>
                <th scope="col">이용 단위</th>
                <th scope="col">가격</th>
                <th scope="col">결제 방식</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.priceId}>
                  <td>{product.name}</td>
                  <td>크레딧 {product.credits}개</td>
                  <td>{formatPrice(product.amount, product.currency)}</td>
                  <td>일회성 결제 (구독 아님)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>이용·결제·환불 안내</h2>
        <ul>
          <li>
            크레딧은 생성된 리포트가 저장될 때에만 차감됩니다. 리포트 생성에 실패하면 차감되지
            않습니다.
          </li>
          <li>구매일부터 7일 이내에 사용하지 않은 크레딧은 전액 환불합니다.</li>
          <li>모든 결제는 Paddle.com이 판매기록자(Merchant of Record)로서 처리합니다.</li>
          <li>
            자세한 기준은 <Link href="/terms">이용약관</Link>과 <Link href="/refund">환불정책</Link>
            을 확인해 주세요.
          </li>
          <li>
            문의: <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>
          </li>
        </ul>
      </section>
      <p>
        <Link href="/">무료로 분석 시작하기</Link>
      </p>
    </article>
  );
}
