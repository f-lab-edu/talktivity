# Talktivity (톡티비티) - Implementation Spec

This file is the source of truth for the MVP. It combines the original product brief
(6-step UX) with the decisions and guardrails agreed during planning.

## Product summary

A 2030 user pastes 3-5 lines of a KakaoTalk conversation and gets a "fact-bomb" (팩폭)
character card with stats, then shares it to KakaoTalk. Goal: 6 of 10 users who submit
input reach the result and share or save it.

The v1 flow remains free. Payments v2 adds a server-only credit ledger, coupons,
Paddle checkout/webhooks and saved paid reports. Payment UI and live account setup remain
out of scope for this backend increment. Storing conversations and KakaoTalk .txt export
parsing remain out of scope.

All user-facing copy is Korean. Mobile-first: content column `max-w-[480px] mx-auto`.

## Stack (decided)

- Next.js 16 (App Router, TypeScript strict), package manager **bun**
- Tailwind CSS v4, shadcn/ui (only needed components: button, dialog, badge), lucide-react
- `motion` for loading/stat-bar/card animations
- Vercel AI SDK (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`) + `zod` v4
- `html-to-image` for saving the card as PNG (NOT html2canvas: it breaks on Tailwind v4 oklch colors)
- `next/og` for dynamic OG images, Pretendard font (ttf/otf/woff, not woff2 - satori limitation)
- `@upstash/ratelimit` + `@upstash/redis` for rate limiting
- `posthog-js` for funnel analytics
- Vitest for unit tests, Biome for lint/format

## Architecture rules (portability guardrails)

1. **Framework-free core.** All business logic lives in `lib/core/` as pure TypeScript with
   zero imports from `next/*` or React: conversation parsing, PII masking, input validation,
   the result schema, the character catalog, the analyzer (provider adapter + mock),
   share-token encode/sign/verify. Route handlers and pages are thin shells around it.
2. **Explicit REST boundary.** The client calls `POST /api/analyze` via `fetch`, using
   `process.env.NEXT_PUBLIC_API_BASE_URL ?? ""` as the base. No Server Actions anywhere.
3. **Language-neutral contract.** `zod` schemas are the single source; a script
   (`bun run export-schema`) writes JSON Schema files to `contracts/` using `z.toJSONSchema`.
   Commit the generated files.
4. **Versioned, canonical share token** (see below), with golden test vectors in
   `tests/golden/` that a future backend in another language can reuse.
5. Keep Next usage simple: the analysis flow is client components; server features are used
   only for REST APIs, the shared-result page metadata, and the OG image. No custom caching.
6. Optional Kakao/Google login starts only at paid result cards. Supabase Auth owns browser
   PKCE sessions in localStorage; APIs verify ES256 Bearer tokens with Supabase JWKS.
   Business tables are server-only. Store profile ID, provider and nickname, paid report
   content and the credit ledger. Never store original conversations or screenshot input.
   Free analysis results are not persisted. No cookie sessions, middleware/proxy or analytics identify.

## Graceful degradation (every external key optional)

| Env var | When missing |
|---|---|
| `LLM_PROVIDER` (`anthropic`/`openai`/`mock`), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_MODEL` | Fall back to the deterministic mock analyzer (hash of input -> stable result) |
| `ANALYZE_SYSTEM_PROMPT`, `EXTRACT_SYSTEM_PROMPT` | Server warns once per missing variable; analyzer returns the deterministic mock, extractor returns the existing example conversation, exactly like missing provider keys. Core receives prompts as arguments and never reads env. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | In-memory per-instance limiter (dev only; log a warning once) |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics wrapper becomes a no-op (console.debug in dev) |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | Kakao button falls back to Web Share API, then copy-link |
| `SHARE_TOKEN_SECRET` | Dev-only fixed fallback secret with a warning; in production, throw at startup of the share routes |
| `NEXT_PUBLIC_SITE_URL` | Default `http://localhost:3000`; used for absolute OG/Kakao image URLs |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Keep the existing coming-soon dialog on paid cards; login is disabled |
| `SUPABASE_SECRET_KEY` | Profile API returns 503; analysis and sharing remain available |
| `REPORT_SYSTEM_PROMPT` | Warn once and generate the deterministic paid report mock, like a missing LLM provider key |
| `PADDLE_ENV` (`sandbox`/`production`), `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` | Checkout returns 503 `BILLING_DISABLED`; credits, coupons and reports remain available. Webhooks require their secret, otherwise return 503. Products and credit quantities are stored in the server-only `products` table. |
| `BILLING_TEST_USER_IDS` | Comma-separated UUID allowlist for sandbox purchasing; defaults to no users. Production has no user restriction. |

`GET /api/credits` returns `{ balance, products: [{ priceId, name, credits, amount, currency }] }`.
Only active products are listed, ordered by `sort`, then `price_id`. Paddle prices are cached per
instance and price for ten minutes. `amount` is an integer in the currency's minor unit (KRW: won,
USD: cents). Missing Paddle configuration or a sandbox user outside the allowlist yields `products: []`;
an unavailable price is omitted without failing the balance response.
`POST /api/billing/checkout` accepts `{ priceId, posthogId? }` (`posthogId` at most 200 characters).
An unknown or inactive product returns 400 `PRODUCT_NOT_FOUND`; a sandbox non-tester receives
403 `BILLING_UNAVAILABLE`.

Newly applied purchases capture `payment_success { credits, amount, currency }`, using the completed
transaction's total in minor units. Newly applied refunds capture `refund_processed { credits }`.
Both use `custom_data.posthogId` as the distinct ID and existing PostHog key/host configuration.
Refund events without their own `custom_data.posthogId` skip capture; no extra Paddle lookup is made.
Capture has a three-second timeout, never changes webhook acknowledgments, and is not retried on replay.

Provide `.env.example` documenting all of them. Default models: pick the current cheap tier
for each provider (Anthropic Haiku-class, OpenAI mini-class) and allow override via `LLM_MODEL`.

## Result schema (`lib/core/schema.ts`, `contracts/analysis-result.json`)

```
AnalysisResult {
  typeCode: one of 16 codes (OLCD ... RBMG)
  axes: { direction, length, color, stance }         // int 0-100, strength of the first pole
  axisReasons: { direction, length, color, stance }  // Korean, 1-80 chars each
  confidence: "low" | "medium" | "high"
  sampleSize: int >= 0                               // analyzed turns
  badges: ("comedian" | "emoji")[]                   // max 2, canonical order comedian, emoji
  roastLines: [string, string, string]               // 1-60 chars each
  reading: {
    loveFortune: string             // 2-4 sentences
    tips: string[3]
    recommendedLines: string[2-3]
  }
  partnerTemperature?: {                             // omitted when the partner has < 2 turns
    level: int 1-5
    reason: string                  // Korean, 1-80 chars, counts only when source is code
    source: "llm" | "code"
  }
}
```

The result stores no separate character id. Character metadata and asset ids are looked
up in code from `typeCode` (`lib/core/characters.ts`).

## Four-axis classification (`lib/core/classification.ts`)

Axis order is fixed: O/R direction (주도/반응), L/B length (장문/단문), C/M color (컬러/모노),
D/G stance (직진/조율). Every value is the strength of the first pole (O, L, C, D).

Turns: consecutive messages from the same speaker merge into one turn. If a speaker `나`
exists, only `나` turns are analyzed; otherwise every unattributed turn is analyzed.

Raw scores (`rawScore`) and evidence counts (`n`):

| Axis | rawScore | n |
|---|---|---|
| L/B | `clamp(round(m * 2), 0, 100)`, `m` = median turn length in characters with expression tokens removed | analyzed turns |
| C/M | `clamp(round(d * 50), 0, 100)`, `d` = expression tokens per turn (Unicode emoji, `[이모티콘]`, runs of ㅋ/ㅎ/ㅠ/ㅜ, repeated `!?~`, exclamation/emotion words) | analyzed turns |
| O/R | LLM integer score; fallback `round((question + proposal) / n * 100)` | question + proposal + reaction hint matches |
| D/G | LLM integer score; fallback `round(assertion / n * 100)` | assertion + softener + delegation + cushion hint matches |

When `n == 0`, rawScore is defined as 50.

Displayed score (`axes`): `λ = n / (n + 4)`, `s = Math.round(50 + λ * (rawScore - 50))`, then a
direction-preserving clamp: `rawScore < 50 → min(s, 49)`, `rawScore > 50 → max(s, 51)`,
`rawScore == 50 → 50`.

Letter rule (four cases only): `rawScore > 50` → first pole; `rawScore < 50` → second pole;
`rawScore == 50` with `n ≥ 1` → first pole; `n == 0` → 32-bit FNV-1a over the UTF-8 bytes of
`${axisId}:${normalized analyzed text}`, even hash → first pole, odd → second pole.
Scores 45-55 are shown as 경계형 in the UI, but the type code is always one code.

### Ownership

- Code computes: turns, hints, L/B and C/M scores, all evidence counts, shrinkage, letters,
  `typeCode`, confidence, `sampleSize`, the `emoji` badge.
- The LLM returns only the O/R and D/G integer scores with a reason (80 chars max) each, the
  `comedian` flag, the roast lines and the reading. Its output schema is strict, so it cannot
  return a type code, L/B or C/M scores or a character. With no model, or after two failed
  attempts, the deterministic fallback scores above are used and `comedian` is false.
- Partner temperature (`lib/core/partner-temperature.ts`): partner turns are grouped turns whose
  speaker is not `나`. With fewer than 2 partner turns it is omitted. Otherwise the LLM
  `partnerTemperature { level, reason }` is used (`source: "llm"`); without a judgment, code sums
  three signals each capped at 2 - (question + proposal) per partner turn, reaction per turn +
  expressions per turn, partner median length / my median length - and maps the sum
  `<1 / <2 / <3 / <4 / >=4` to levels 1-5 (`source: "code"`). The prompt also receives
  `partnerHints` (counts only). Partner temperature never enters the share token.

### Confidence

`semanticN = min(n(O/R), n(D/G))`. `low` if fewer than 3 turns or `semanticN < 2`;
`medium` if fewer than 5 turns or `semanticN < 4`; otherwise `high`. A type is always
returned regardless of confidence. On `low`, the result shows exactly:
`분석 신뢰도가 낮아요. 대화를 조금 더 추가하면 더 정확해져요.`

### Badges

- `emoji` (이모티콘): code-awarded when emoji/`[이모티콘]` appear 2+ times in total, or in at
  least 50% of analyzed turns.
- `comedian` (드립): the LLM judges whether the user created humor in the conversation. The
  mock fallback never awards it.

## Character catalog (`lib/core/characters.ts`)

16 types, one per code, plus 2 badges. Each type has `name`, `assetId` (SVG in
`public/characters/`), `tagline`, `color` (hex pair, not oklch, so OG rendering and image
capture work) and a generic `description` for the shared page.

| Code | Name | assetId | Code | Name | assetId |
|---|---|---|---|---|---|
| OLCD | 약속 설계자 | planner | RLCD | 은근히 답정너 | answer |
| OLCG | 읽씹 방지 파수꾼 | guardian | RLCG | 장문 편지 작가 | novelist |
| OLMD | 본론 브리핑 장인 | briefing | RLMD | 말투 탐정 | detective |
| OLMG | 신중한 안부 장인 | checkin | RLMG | 잔잔한 공감 DJ | nightowl |
| OBCD | 한 줄 스파크 | spark | RBCD | 단호박 치어리더 | cheerleader |
| OBCG | 플러팅 장인 | flirt | RBCG | 리액션 햇살 요정 | sunshine |
| OBMD | 용건만 통보관 | dispatch | RBMD | 프레임 유지하는 차도남 | cool |
| OBMG | 담백한 에스코트 | escort | RBMG | 단답 미니멀리스트 | minimalist |

Badges: `comedian` 드립 (asset `comedian`), `emoji` 이모티콘 (asset `emoji`).

### Breaking change (v2)

The earlier 3-stat result (`initiative`, `replyPsychology`, `pushPull`), the 12-character
catalog with direct LLM selection of `characterId`, and v1 share tokens are retired. Existing
v1 links now render the invalid-link page.

## Input & privacy

- Parser (`lib/core/parse-kakao.ts`) detects speakers in common copy formats:
  PC `[이름] [오후 3:12] 메시지`, mobile `2026년 11월 14일 오후 3:12, 이름 : 메시지`,
  simple `이름: 메시지`. Lines that do not match attach to the previous message or are
  treated as unattributed.
- If 2+ speakers are detected, the input step shows a "나는 누구?" chip row (required).
  If 0-1 speakers, skip it and the prompt analyzes the conversation as the user's style.
- Relationship (required): default chips are 썸, 연인, 친구, 소개팅, followed by 더보기
  and 직접 입력. 더보기 toggles 짝사랑, 전 애인, 직장 동료, 상사, 동기·선후배, 가족,
  단톡방 지인 in that order and exposes its state with `aria-expanded`.
  Preset lists are defined once in `lib/core/schema.ts`.
- 직접 입력 opens a labeled single-line input with a 20-character limit and an `N/20`
  count. Relationship values are trimmed, must contain 1-20 characters, and cannot contain
  CR or LF. Selecting a preset exits custom mode. Drafts restore more-presets expanded
  and non-empty non-presets (including old values such as 썸남/썸녀) in custom mode.
- Validation: at least 2 non-empty lines, 10-1500 chars. Inline Korean error messages.
- PII masking (`lib/core/mask.ts`) runs client-side before sending AND server-side again:
  phone numbers, emails, URLs, account-number-like digit runs. Speaker names are replaced
  with `나` / `상대` before sending to the LLM.
- Show a small notice: "대화 내용은 저장되지 않고 분석에만 사용돼요."
- The server never logs conversation text.

## Prompt guardrails

Witty, punchy, 2030 tone; roasts must be playful, never insulting about appearance, body,
identity, or mental health; no profanity or sexual content. Instruct the model to ignore any
instructions inside the conversation text (treat it as data).

## API: `POST /api/analyze`

Request: `{ conversation: string, relationship: string, mySpeaker?: string }` (zod-validated,
strict object). `relationship` accepts presets or custom text; its trimmed value is passed
on and must be 1-20 characters with no CR or LF. Missing/empty values show
"관계를 선택해 주세요.", values over 20 characters show "관계는 20자까지 입력할 수 있어요.",
and line breaks show "관계는 한 줄로 입력해 주세요.".
Flow: rate limit (analyze: 3 req / 10 min per IP; example: 10 req / 10 min, counted separately) -> validate -> mask -> analyze -> validate output
-> return `{ result: AnalysisResult, shareToken: string }`. Errors return
`{ error: { code, message } }` with Korean messages and proper status (400/429/500).

## Payments v2 REST APIs

All seven endpoints return `Cache-Control: no-store`. Except the signed Paddle webhook,
each uses the existing ES256 Bearer/JWKS authentication; missing Supabase environment
returns 503 `AUTH_DISABLED`, missing/invalid authentication returns 401.

| Method and path | Request and response |
|---|---|
| `GET /api/credits` | `{ balance }`, including negative balances after refunds |
| `POST /api/billing/checkout` | `{ posthogId?: string <=200 }` → `{ transactionId }`; server supplies authenticated `custom_data.userId`, catalog price and quantity 1 |
| `POST /api/billing/webhook` | Raw request text + `Paddle-Signature`, HMAC-SHA256 with default five-second tolerance → `{ received: true }`; invalid signature 401, successful or ignored event 200, storage failure 500 for Paddle retries |
| `POST /api/coupons/redeem` | `{ code }` → `{ credited, balance }`; trim, uppercase and remove whitespace before validation (`A-Z`, digits, hyphens, 4–32 chars); 5 attempts / 10 minutes per user ID |
| `POST /api/reports` | Analyze request → `{ report: { id, content, createdAt }, balance }`; balance check before LLM, 3 attempts / 10 minutes per user ID, shared global LLM cap, PII masking, generation, atomic DB save and debit |
| `GET /api/reports` | `{ reports: [{ id, headline, createdAt }] }`, own reports only, newest first, limit 50 |
| `GET /api/reports/[id]` | `{ report: { id, content, createdAt }, balance }`, own report only, 404 for missing, foreign or malformed ID |

Coupon errors: 400 `COUPON_INVALID`, 404 `COUPON_NOT_FOUND`, 410 `COUPON_EXPIRED` or
`COUPON_EXHAUSTED`, 409 `COUPON_ALREADY_USED`. Reports return 402 `INSUFFICIENT_CREDITS`
both before generation and when another request spends the last credit before saving.
Generation uses analyzer provider/model configuration and the same two-attempt deterministic
mock fallback. A successful saved report consumes exactly one credit; a save failure saves
neither report nor debit.

`lib/core/billing/` owns catalog parsing, coupon normalization, webhook decisions, signature
verification, paid report validation and prompt-message construction. Server adapters own
environment access and a shared secret-key Supabase client. System prompt text lives only in
ignored `docs/local/prompts/*.md` and private environment variables.

`0002_billing.sql` creates server-only `credit_ledger`, `coupons` and `reports`, with RLS and
no client policies. Table privileges and all five billing functions are restricted to
`service_role`; functions pin `search_path = public`. Purchases and refunds are idempotent
by ledger reference. Approved refund adjustments recover the purchase's full credit amount,
even if credits have already been spent. Refunds arriving before the purchase ledger return
500 so Paddle can retry. User advisory transaction locks serialize report balance checks,
inserts and debits. Coupon rows are locked during redemption. No original conversation is
stored in any billing table. Create promotional coupons by SQL insert; no admin UI is added.

Generated JSON Schema contracts in `contracts/` cover credits, checkout, coupon redemption,
paid reports, report responses and report lists. `tests/golden/paddle-signature.json` contains
portable UTF-8 signature vectors. `bun run test` stays Docker-free; `bun run test:db` starts
an isolated Postgres 17 container on localhost:54329, emulates Supabase default privileges,
applies migrations, tests permissions/idempotency/concurrency, then tears down.

## Share token (`lib/core/share-token.ts`)

- Payload v2 holds ONLY `typeCode`, `axes`, `badges` and `roastLines`. Never conversation
  text, axis reasons, reading or sample size.
- Canonical encoding: a fixed-order JSON array
  `[2, typeCode, direction, length, color, stance, badges, roast1, roast2, roast3]`,
  e.g. `[2,"OBCG",72,38,81,44,["comedian","emoji"],"…","…","…"]`, serialized with
  `JSON.stringify` (no whitespace), UTF-8 bytes, base64url without padding.
- Signature: HMAC-SHA256 over the exact base64url payload string, truncated to 16 bytes,
  base64url. Token = `payload.signature`. Uses Web Crypto (works in Node and edge).
- Verify rejects bad signatures, non-canonical encodings, invalid schema and any version
  other than 2. A v1 array is rejected even with a valid signature.
- `tests/golden/share-token-v2.json`: `{ secret, payload, token }` vectors including Korean
  text, emoji, empty badges and 50/50 boundary scores; tests assert encode and verify.

## Screens

Single page `app/page.tsx` drives steps with `useReducer`: landing -> input -> loading -> result.
Persist the last result in `sessionStorage` so refresh on the result step keeps it.

1. **LandingStep**: biggest title "카톡 대화 팩폭 분석기"; subtitle
   "스레드/릴스 화제의 카톡 말투 테스트! 3초 만에 보는 내 톡 성향"; one modern illustration
   area (inline SVG/CSS chat-bubble art, no external images); bottom-fixed thumb-zone primary
   CTA "무료로 내 톡 팩폭 보기 (가입 없이 3초 소요)" with `env(safe-area-inset-bottom)`;
   secondary "예시 대화로 1초 만에 테스트하기".
2. **InputStep**: textarea with placeholder example, speaker chips (when detected),
   relationship chips, "팩폭 분석 시작하기" with validation.
3. **LoadingStep**: messages rotate "카톡 말투 감정 분석 중...", "네 가지 말투 축 계산 중...",
   "팩폭 캐릭터 생성 중..." with animation. Minimum display ~2.4s so all three are seen,
   but don't wait longer than the API.
4. **ResultStep**: the meme card (character illustration, character name, the first roast line
   large, badges, small type code) - contains no conversation text; the other two roast lines
   below it; "톡에서 보이는 모습" with the type's `strength` and `misread` from `lib/core/type-guide.ts`
   and a button "대화가 잘 통하는 유형·부딪히기 쉬운 유형 보기" to `/types/[code]`
   (`types_entry_click{source:result}`); share/save buttons; paywall; the partner temperature gauge
   ("상대 대화 온도", 5 steps, reason, link that scrolls to the paid report area above) when present;
   "이렇게 분석했어요" with the four axis bars, confidence and axis reasons; the reading section
   (대화 흐름 코멘트, 팁, 추천 대화법); restart. Save image captures only the meme card.
5. **Share**: `lib/kakao.ts` loads the SDK via `next/script`, `Kakao.init` once, then
   `Kakao.Share.sendDefault` feed template:
   - title and description from `lib/share-meta.ts` (`[톡티비티] 나 무슨 유형 나왔게? 맞혀 봐`);
     they never contain the character name or type code
   - button `맞히러 가기`
   - imageUrl = absolute URL of the dynamic OG image for this token with `imageWidth` 1200 and
     `imageHeight` 630; link = `/r/[token]`.
   Also a "링크 복사" button.
   **Save image**: `html-to-image` (dynamic import on click) -> PNG. Prefer
   `navigator.share({ files })` when `canShare` supports files; else `<a download>`; and in
   KakaoTalk/Instagram in-app browsers (UA detection) show a modal with the image and
   "이미지를 길게 눌러 저장하세요".
6. **Paywall card** (`components/paywall-card.tsx`): one locked card per state (login, credit,
   checkout, coming soon) with the report title ("속마음 힌트 리포트 + 맞춤 답장 3개"; `reportTitle`
   in `lib/purchase.ts` before checkout, Supabase `products.name` at checkout) and price, a
   one-line lead, five included items that map to `paidReportSchema` fields or the saved-report page (상대 반응 해석, 근거 3가지와 조심할 점,
   답장 3개와 의도, 다음 행동, 내 리포트 다시 보기), and the limit line "대화에 드러난 만큼만 해석해요.
   상대의 마음을 확정하지 않아요." The card must not promise anything the report does not contain. The
   partner temperature button reads "속마음 힌트 리포트 보기" and scrolls to this card.

## Policy pages

Static server components `app/privacy`, `app/terms` and `app/refund` (개인정보처리방침, 이용약관,
환불정책; effective 2026-11-21) share `app/styles/legal.css`. The root layout footer links to all three
and shows the contact email (hhmmmteam@gmail.com). Seller is the individual "문성재 (Moon Sungjae)"
(no postal address published); Paddle is the Merchant of Record. Refund rule: unused credits are fully
refundable within 7 days of purchase; credits spent on a report are withdrawal-restricted (전자상거래법
제17조 제2항 제5호) unless the content differs from the advertisement (제17조 제3항). The pre-purchase
notice with a `/refund` link renders under the buy button in `components/paywall-card.tsx` (checkout
cards only), before checkout opens.

## Shared result page `app/r/[token]/page.tsx`

Server component: verify token (invalid -> friendly error page with CTA). `generateMetadata`
sets og:title/og:description/alt from `lib/share-meta.ts` without the character name or type code,
and og:image. The page is a quiz: the first roast line as a hint, four character options from
`quizOptions(typeCode, token)` (`lib/core/quiz.ts`: deterministic, the answer plus three codes
1-2 letters away), and "그냥 결과 볼래". Answering or skipping reveals the verdict, the meme card,
all roast lines, the generic description and the CTA "너는 뭐 나올 것 같아? 3초 만에 확인" -> `/`.
The OG image (`app/api/og/route.tsx`, 1200x630, Pretendard) is a spoiler-free teaser: a ❓
silhouette, the first roast line and "이 말투, 무슨 유형일까? 맞혀 봐", all inside the centered
square safe zone; no character name, code, image or axes. Also a default OG image for `/`.

## Analytics events (`lib/analytics.ts`)

`landing_view` (only when the landing step is shown, not when input/result is restored),
`cta_click` ({variant: main|example}), `input_view` (the input step opened by a button: landing
main CTA, type guide CTA or "다시 하기"; not on reload restore), `input_mode_text`, `capture_select` ({count: valid images
selected, 1-3}), `extract_submit`
({count}), `extract_success`, `extract_error` ({code}),
`analyze_submit` ({source: text|screenshot, relationship: preset string|"custom"}), `analyze_success`,
`analyze_error` ({code}), `result_view`, `share_kakao_click`, `share_link_copy`,
`image_save` ({method}), `paywall_teaser_click` ({tier: 1000|1900}), `shared_page_view`,
`shared_page_cta_click` ({answered}), `shared_quiz_answer` ({correct}), `shared_quiz_skip`,
`temperature_fallback` (real analyses whose partner temperature came from code),
`temperature_detail_click` ({level}).

`entry` is a tab-scoped super property (`shared`|`types`): landing `?from=` values overwrite
`sessionStorage["talktivity:entry"]` (last touch), then `from` is removed from the URL.
Register it on arrival and every PostHog initialization so all subsequent events retain
attribution across reloads. Direct visits keep the stored value; invalid values are ignored.
PostHog persistence remains `memory`; no analytics identifier is stored.
`start` is a second tab-scoped super property for the button that started the current run
(`landing`|`types`|`restart`|`example`), stored in `sessionStorage["talktivity:start"]` when
the button is pressed and registered the same way, so every later event (capture, extract,
analyze, result, share, paywall) can be split by `entry` x `start`. The expired share link page CTA
also uses `?from=shared`.
The type guide CTA links to `/?from=types&step=input`: `step=input` opens the input step directly
(clearing any stored result, no `landing_view`) and is removed from the URL as well.

`result_view.origin` is `analysis` for a completed real analysis, `example` for an example,
and `restored` after reloading a stored result (including older results without origin).
`result_view` additionally sends `partner_temperature` (1-5) and `temperature_source`
(`llm`|`code`) when the result has a partner temperature.

Both `result_view` and `shared_page_view` send `typeCode`, `badges` and each axis as a
10-point bucket (`0-9` ... `90-100`). Properties outside the allowlist are dropped.
`analyze_submit.relationship` preserves only exact preset values; all other relationship
values become the literal `"custom"`. Custom relationship text is never sent to analytics.

## Example conversation

A fixed example conversation with a **precomputed** result in `lib/core/example.ts`;
the example button goes straight to loading -> result without calling the API (still show
the short loading animation) and still gets a valid share token (sign via a tiny API call
or include a pre-signed token computed at build time; choose the simpler correct option).

## Tests (Vitest)

Parser formats, masking, input validation, schema, mock analyzer determinism, share-token
golden vectors + tamper rejection. `bun run test` must pass in one run.

## Scripts

`dev`, `build`, `start`, `lint` (biome), `format`, `typecheck` (`tsc --noEmit`), `test`,
`export-schema`.
