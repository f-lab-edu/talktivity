# 톡티비티

카톡 대화 3~5줄로 내 톡 유형을 찾는 모바일 웹 MVP입니다.
말투를 주도/반응(O/R), 장문/단문(L/B), 컬러/모노(C/M), 직진/조율(D/G) 4축으로 나눠
16개 유형 캐릭터 중 하나와 배지 2종(드립, 이모티콘)을 보여 줍니다.
길이·표현 축과 유형 코드, 이모티콘 배지는 코드가 계산하고, LLM은 주도·직진 축 점수와 근거,
드립 여부, 팩폭 문구만 맡습니다. 계산 규칙은 `docs/SPEC.md`에 있습니다.

대화는 저장하지 않습니다. 공유 링크에는 유형 코드, 4축 점수, 배지, 팩폭 3줄만 들어가고
대화 원문, 축 근거, 연애운, 분석 턴 수는 빠집니다. 분석 이벤트도 유형 코드, 배지,
10점 단위 축 구간만 보냅니다.

v2 변경 사항: 예전 3스탯(`replyPsychology`, `pushPull`)과 LLM의 직접 캐릭터 선택, v1 공유
링크 지원은 없어졌습니다. 기존 v1 링크는 이제 잘못된 링크 화면을 보여 줍니다.

## 시작하기

Node 24와 Bun 1.4에서 실행합니다. Git 저장소 초기화는 하지 않습니다.

```sh
bun install
bun run dev
```

http://localhost:3000 을 엽니다. `.env` 없이 모의 분석, 예시 대화,
공유 링크, OG 이미지, 이미지 저장까지 사용할 수 있습니다.
예시는 사전 계산된 결과를 사용하며 `/api/example`은 서명만 합니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사해서 필요한 값만 설정하세요.

| 변수                                                               | 용도와 기본 동작                                                   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `LLM_PROVIDER`                                                     | `mock`(기본), `anthropic`, `openai`, `google`                      |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`            | 선택한 공급자 키가 없으면 결정적 mock                              |
| `LLM_MODEL`                                                        | 기본 `claude-haiku-5-5` / `gpt-5.4-mini` / `gemini-3.5-flash-lite` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`               | 둘 다 없으면 인스턴스 메모리 제한, 운영 시 Redis 설정              |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`              | 둘 다 있어야 이벤트 수집, 자동 클릭/세션 녹화 비활성               |
| `NEXT_PUBLIC_KAKAO_JS_KEY`                                         | 없으면 Web Share, 미지원이면 링크 복사                             |
| `SHARE_TOKEN_SECRET`                                               | 개발용 대체값 제공. 운영 시작 시 필수, 변경하면 기존 링크 무효     |
| `NEXT_PUBLIC_SITE_URL`                                             | 기본 `http://localhost:3000`, 배포 시 실제 HTTPS 도메인            |
| `NEXT_PUBLIC_API_BASE_URL`                                         | 기본 빈 문자열, REST API 분리 시 사용                              |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 둘 다 있어야 유료 카드에서 선택 로그인, 없으면 기존 곧 오픈 안내   |
| `SUPABASE_SECRET_KEY`                                              | 서버 전용 프로필 저장 키, 없으면 내 정보 API 503                   |

빌드는 키 없이 가능합니다. 운영 실행은 `SHARE_TOKEN_SECRET`을 설정한 다음
`bun run build && bun run start`를 사용합니다.
메모리 제한기는 여러 인스턴스 간 공유되지 않으므로 운영에서는 Upstash가 필요합니다.
프록시 배포 시 신뢰하는 프록시가 `x-forwarded-for`를 덮어쓰도록 구성하세요.

## 스크립트

`dev`, `build`, `start`: Next 개발/빌드/운영 서버.
`typecheck`: 엄격한 TypeScript 검사. `lint`, `format`: Biome 검사/수정.
`test`: Vitest 전체 단발 실행. `export-schema`: Zod v4에서 `contracts/` JSON Schema 재생성.
`tests/golden/share-token-v2.json`은 독립 Node HMAC로 계산한 다른 언어용 고정 벡터입니다.
`tests/golden/auth-token-es256.json`은 ES256 공개 JWK·JWT·issuer·audience·기대 프로필을
담은 인증 검증 벡터입니다(만료 2100-01-01). 개인 키는 포함하지 않습니다.
닉네임은 `name`, `full_name`, `nickname`, `preferred_username`, `user_name` 순으로
첫 비어 있지 않은 문자열을 골라 공백 제거 후 최대 80자로 제한하며, 없으면 `null`입니다.
변경 후 검증은 `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` 순서로 돌립니다.
스키마를 바꿨다면 `bun run export-schema`로 `contracts/`를 다시 만듭니다.
`lib/core/`에는 Next/React 의존성이 없습니다.

## 선택 로그인 설정

Supabase 프로젝트를 만든 후 Auth에서 ES256 서명 키와 Kakao·Google 공급자를 켜세요.
Site URL과 Redirect URLs에 운영 도메인의 `/`와 `http://localhost:3000/`를 등록합니다.
Kakao 공급자는 **Allow users without an email**을 켭니다. 서비스 DB(`profiles`)에는
이메일을 저장하지 않고 계정 연결도 사용하지 않습니다. `supabase/migrations/0001_profiles.sql`을 적용하고 서버에
`SUPABASE_SECRET_KEY`를 설정하세요. 브라우저는 공개 키만 사용하고 DB를 조회하지 않습니다.

Kakao Developers에서 카카오 로그인을 켜고 닉네임 동의 항목만 사용하세요.
REST API 키·Client Secret을 Supabase Kakao 공급자에 등록하고 리디렉션 URI는
`https://<project-ref>.supabase.co/auth/v1/callback`으로 설정합니다.
Google Cloud 웹 OAuth 클라이언트도 같은 Supabase 콜백을 등록합니다.

Supabase Auth 기본 Kakao scope는 `account_email,profile_image,profile_nickname`,
Google은 `email,profile`입니다. `options.scopes`는 기본값에 추가하므로 사용하지 않고,
`options.queryParams.scope`로 Kakao는 `profile_nickname`만 요청합니다. Google은 기본 scope를
유지합니다. Supabase Auth는 이메일 없는 로그인을 email optional 공급자에서만 허용하는데, 이 설정은
Kakao 가이드에만 문서화돼 있습니다(이메일은 Supabase `auth.users`에만 남습니다). Kakao의 `account_email` 동의 항목이나 비즈 앱 전환은 필요하지 않습니다.
근거는 Supabase의 Kakao 공식 가이드와 Auth 소스의 `provider/kakao.go`,
`provider/google.go`, `external.go`, `custom_oauth_admin.go`입니다.
실제 프로젝트를 설정한 뒤 동의 화면의 scope와 이메일 없는 로그인 허용을 확인하세요.
이미 연결된 기존 Supabase 계정을 분리하는 기능은 제공하지 않습니다.

로그인은 결과 화면 유료 카드에서만 시작합니다. 세션은 브라우저 localStorage의 PKCE
방식을 쓰며, OAuth 복귀 후 sessionStorage에 남은 결과와 유료 카드 안내를 다시 엽니다.
인스타그램 내부 브라우저에서는 구글 버튼을 비활성화하고 외부 브라우저 이용을 안내합니다.
프로필 API 오류가 나도 분석 결과는 계속 볼 수 있습니다.

## Kakao Developers 설정

1. Kakao Developers에서 앱을 생성하고 앱 키의 **JavaScript 키**를 확인합니다.
2. 플랫폼의 Web 설정에서 사이트 도메인을 등록합니다. 개발용
   `http://localhost:3000`과 실제 운영 도메인(예: `https://your-domain.com`)을 각각 등록합니다.
3. 제품 설정에서 카카오톡 공유 사용 가능 상태와 링크 도메인을 확인합니다.
4. `NEXT_PUBLIC_KAKAO_JS_KEY`에 JavaScript 키, `NEXT_PUBLIC_SITE_URL`에
   등록한 도메인을 넣고 서버를 재시작합니다. 공개 환경 변수는 빌드에 포함됩니다.
5. 실제 휴대폰에서 공유 제목, 이미지, 버튼과 `/r/[token]` 진입을 확인합니다.
   카카오 크롤러가 접근할 수 있는 공개 HTTPS 배포가 필요합니다.

이미지는 `html-to-image`로 생성합니다. 파일 공유 지원 시 네이티브 공유,
일반 브라우저는 다운로드, 카카오톡/인스타그램 내부 브라우저는 길게 눌러 저장하는
이미지 모달을 제공합니다. 유료 카드에서 카카오·구글 선택 로그인을 제공하며,
서버는 사용자 ID·공급자·닉네임만 프로필 DB에 저장합니다. 분석·공유는 로그인 없이
사용할 수 있고 대화·분석 결과는 저장하지 않습니다. 실제 결제는 없습니다.
Pretendard Bold OTF와 SIL OFL 라이선스는 `assets/`에 포함되어 외부 폰트 요청이 없습니다.
유형 16종과 배지 2종의 SVG는 Twemoji (CC BY 4.0, jdecked/twemoji)이며 `public/characters/`에
라이선스와 함께 포함했습니다. 파일별 원본 이모지와 수정 내용(`role`, `aria-label` 추가)은
`public/characters/LICENSE` 머리말에 적었고, 캐릭터 SVG를 추가하면 그 목록도 함께 갱신합니다.
이모지 글꼴이 없는 기기에서도 동일하게 표시합니다.
