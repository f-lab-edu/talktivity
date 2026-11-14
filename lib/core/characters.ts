export const characterIds = [
  "flirt", "cool", "answer", "guardian", "sunshine", "detective",
  "emoji", "novelist", "minimalist", "comedian", "planner", "nightowl",
] as const;

export type CharacterId = (typeof characterIds)[number];
export type Character = {
  readonly id: CharacterId;
  readonly name: string;
  readonly emoji: string;
  readonly tagline: string;
  readonly color: readonly [string, string];
  readonly description: string;
};

export const characters: Record<CharacterId, Character> = {
  flirt: { id: "flirt", name: "플러팅 장인", emoji: "🦊", tagline: "별말 아닌 척, 설렘은 풀충전", color: ["#ffe8d5", "#ffc5ad"], description: "가벼운 한마디로 대화의 온도를 올리는 타입이에요." },
  cool: { id: "cool", name: "프레임 유지하는 차도남", emoji: "🐈‍⬛", tagline: "답장은 짧게, 여운은 길게", color: ["#e1e5ff", "#b6c4ff"], description: "자기만의 속도로 대화를 이어가는 여유로운 타입이에요." },
  answer: { id: "answer", name: "은근히 답정너", emoji: "🦉", tagline: "질문은 했지만 정답은 준비 완료", color: ["#f0e4ff", "#dbc5ff"], description: "취향이 뚜렷하고 공감을 받으면 신나는 타입이에요." },
  guardian: { id: "guardian", name: "읽씹 방지 파수꾼", emoji: "🐕", tagline: "대화의 불씨? 내가 지킨다", color: ["#fff4ce", "#ffe191"], description: "상대가 편하게 답할 수 있도록 대화를 돌보는 타입이에요." },
  sunshine: { id: "sunshine", name: "리액션 햇살 요정", emoji: "🐥", tagline: "ㅋㅋㅋ 세 글자에도 진심을 담아", color: ["#fff5b8", "#ffdd85"], description: "작은 이야기도 반갑게 받아주는 따뜻한 타입이에요." },
  detective: { id: "detective", name: "말투 탐정", emoji: "🕵️", tagline: "마침표 하나까지 읽어드립니다", color: ["#dceee7", "#b7d9ca"], description: "대화의 작은 변화도 잘 알아차리는 섬세한 타입이에요." },
  emoji: { id: "emoji", name: "이모티콘 외교관", emoji: "🐼", tagline: "어색한 공기도 표정 하나면 해결", color: ["#ffe6ef", "#ffc7dc"], description: "표현력으로 거리감을 좁히는 친근한 타입이에요." },
  novelist: { id: "novelist", name: "장문 편지 작가", emoji: "🐳", tagline: "한 줄의 안부에 세 문단의 진심", color: ["#dcefff", "#b1d9ff"], description: "맥락과 마음을 차근차근 전하는 정성스러운 타입이에요." },
  minimalist: { id: "minimalist", name: "단답 미니멀리스트", emoji: "🦥", tagline: "말은 아껴도 마음은 절전 아님", color: ["#e8eddf", "#cad7b2"], description: "군더더기 없이 필요한 말을 전하는 담백한 타입이에요." },
  comedian: { id: "comedian", name: "드립 배달부", emoji: "🦦", tagline: "대화가 멈추면 농담 배송 출발", color: ["#ffe6d6", "#ffccaa"], description: "유쾌한 농담으로 분위기를 살리는 타입이에요." },
  planner: { id: "planner", name: "약속 설계자", emoji: "🦫", tagline: "언제 볼까? 장소까지 예약 완료", color: ["#d9f2ee", "#a6dfd6"], description: "막연한 이야기를 즐거운 약속으로 만드는 타입이에요." },
  nightowl: { id: "nightowl", name: "새벽 감성 DJ", emoji: "🌙", tagline: "밤이 깊으면 대화도 깊어지는 편", color: ["#e8e1fa", "#cbbbea"], description: "조용한 시간에 진솔한 이야기를 나누는 타입이에요." },
};
