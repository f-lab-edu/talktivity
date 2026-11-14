# 톡티비티

카톡 대화 3~5줄로 내 톡 캐릭터를 찾는 모바일 웹 MVP입니다.
대화는 저장하지 않습니다. 공유 링크에는 캐릭터, 스탯, 팩폭 3줄만 들어갑니다.

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

| 변수                                                    | 용도와 기본 동작                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| `LLM_PROVIDER`                                          | `mock`(기본), `anthropic`, `openai`, `google`                      |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | 선택한 공급자 키가 없으면 결정적 mock                              |
| `LLM_MODEL`                                             | 기본 `claude-haiku-5-5` / `gpt-5.4-mini` / `gemini-3.5-flash-lite` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`    | 둘 다 없으면 인스턴스 메모리 제한, 운영 시 Redis 설정              |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`   | 둘 다 있어야 이벤트 수집, 자동 클릭/세션 녹화 비활성               |
| `NEXT_PUBLIC_KAKAO_JS_KEY`                              | 없으면 Web Share, 미지원이면 링크 복사                             |
| `SHARE_TOKEN_SECRET`                                    | 개발용 대체값 제공. 운영 시작 시 필수, 변경하면 기존 링크 무효     |
| `NEXT_PUBLIC_SITE_URL`                                  | 기본 `http://localhost:3000`, 배포 시 실제 HTTPS 도메인            |
| `NEXT_PUBLIC_API_BASE_URL`                              | 기본 빈 문자열, REST API 분리 시 사용                              |

빌드는 키 없이 가능합니다. 운영 실행은 `SHARE_TOKEN_SECRET`을 설정한 다음
`bun run build && bun run start`를 사용합니다.
메모리 제한기는 여러 인스턴스 간 공유되지 않으므로 운영에서는 Upstash가 필요합니다.
프록시 배포 시 신뢰하는 프록시가 `x-forwarded-for`를 덮어쓰도록 구성하세요.

## 스크립트

`dev`, `build`, `start`: Next 개발/빌드/운영 서버.
`typecheck`: 엄격한 TypeScript 검사. `lint`, `format`: Biome 검사/수정.
`test`: Vitest 전체 단발 실행. `export-schema`: Zod v4에서 `contracts/` JSON Schema 재생성.
`tests/golden/share-token.json`은 독립 Node HMAC로 계산한 다른 언어용 고정 벡터입니다.
`lib/core/`에는 Next/React 의존성이 없습니다.

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
이미지 모달을 제공합니다. 로그인, DB, 실제 결제는 없습니다.
Pretendard Bold OTF와 SIL OFL 라이선스는 `assets/`에 포함되어 외부 폰트 요청이 없습니다.
캐릭터 SVG는 Twemoji (CC BY 4.0, jdecked/twemoji)이며 `public/characters/`에
라이선스와 함께 포함했습니다. 이모지 글꼴이 없는 기기에서도 동일하게 표시합니다.
