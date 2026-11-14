<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 커밋 메시지 규칙

- `Co-authored-by` 같은 에이전트/도구 표기 트레일러를 넣지 않는다.
- 제목은 Conventional Commits 형식(`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`)에 한국어 설명으로 쓴다.
- 본문은 제목만으로 이유나 맥락이 드러나지 않을 때만 쓴다(설계 이유, 외부 제약, 여러 변경을 한 커밋으로 묶은 사정 등). 자명한 변경은 제목만 쓴다.
