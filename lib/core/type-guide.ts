import type { TypeCode } from "./classification";

export type TypeGuide = {
  readonly summary: string;
  readonly strength: string;
  readonly misread: string;
  readonly tip: string;
  readonly goodWith: TypeCode;
  readonly goodReason: string;
  readonly clashWith: TypeCode;
  readonly clashReason: string;
};

export type TypeGroup = {
  readonly name: string;
  readonly description: string;
  readonly codes: readonly TypeCode[];
};

export const typeGroups: readonly TypeGroup[] = [
  {
    name: "리더형",
    description: "먼저 말을 걸고 길게 풀어내요",
    codes: ["OLCD", "OLCG", "OLMD", "OLMG"],
  },
  {
    name: "스파크형",
    description: "먼저 짧게 툭 던져요",
    codes: ["OBCD", "OBCG", "OBMD", "OBMG"],
  },
  {
    name: "리스너형",
    description: "상대 말을 받아 길게 답해요",
    codes: ["RLCD", "RLCG", "RLMD", "RLMG"],
  },
  {
    name: "리액션형",
    description: "상대 말에 짧게 반응해요",
    codes: ["RBCD", "RBCG", "RBMD", "RBMG"],
  },
];

// Pair draft rule: goodWith flips direction (O<->R) and keeps stance; clashWith keeps direction and
// flips stance. Pairs were then hand-adjusted so every type is picked at most once per column.
export const typeGuides: Record<TypeCode, TypeGuide> = {
  OLCD: {
    summary: "대화를 먼저 열고 날짜와 장소까지 확실하게 정해 버리는 추진력 있는 계획가입니다.",
    strength: "흐지부지될 약속도 날짜와 장소까지 확실하게 정해 줘요.",
    misread: "일정 얘기만 하면 숙제 검사받는 기분이라는 말을 들어요.",
    tip: "확답을 좋아해요. '생각해 볼게'보다 '토요일 좋아!'처럼 답해 주세요.",
    goodWith: "RBCD",
    goodReason: "약속표 보내면 '가자!!'로 바로 달려와요",
    clashWith: "OLMG",
    clashReason: "확정한 일정에 '글쎄요…'가 돌아와 답답해요",
  },
  OLCG: {
    summary: "먼저 다정하게 말을 걸고 상대가 답하기 편한 질문까지 챙기는 세심한 대화 지킴이입니다.",
    strength: "먼저 말을 걸고 답하기 쉬운 질문까지 챙겨 줘요.",
    misread: "질문이 계속 이어져서 면접 보는 것 같다는 말을 들어요.",
    tip: "질문에 답만 하지 말고 가끔은 먼저 질문을 돌려주세요.",
    goodWith: "RLMG",
    goodReason: "길게 건넨 안부를 끝까지 듣고 공감해 줘요",
    clashWith: "OLMD",
    clashReason: "돌려 말했더니 '그래서 결론은?'이 돌아와요",
  },
  OLMD: {
    summary: "인사보다 본론이 먼저인, 할 말을 차분하고 빈틈없이 정리하는 실속파입니다.",
    strength: "할 말을 빠짐없이 정리해서 오해가 생길 틈이 없어요.",
    misread: "인사 없이 본론부터 보내서 화났냐는 말을 들어요.",
    tip: "내용을 확인했다는 한마디만 줘도 마음을 놓아요.",
    goodWith: "RLMD",
    goodReason: "정리한 내용을 끝까지 읽고 빈틈까지 짚어 줘요",
    clashWith: "OLCG",
    clashReason: "핵심만 말했는데 부드러운 장문이 빙빙 돌아와요",
  },
  OLMG: {
    summary: "먼저 안부를 묻지만 한 줄 한 줄 고민해서 보내는 조심스럽고 진심 어린 다정가입니다.",
    strength: "상대의 상황을 먼저 살피고 진심을 담아 안부를 건네요.",
    misread: "너무 조심스러워서 속마음을 모르겠다는 말을 들어요.",
    tip: "안부에 반가운 티를 내 주세요. 다음엔 더 편하게 말을 걸어요.",
    goodWith: "RBCG",
    goodReason: "조심스러운 안부에 환한 리액션이 바로 와요",
    clashWith: "OLCD",
    clashReason: "천천히 마음 여는 사이 상대는 일정을 확정해요",
  },
  OBCD: {
    summary: "짧은 한마디로 단톡방 분위기를 단숨에 살리는 거침없는 분위기 메이커입니다.",
    strength: "조용하던 단톡방도 한마디로 금방 살려 내요.",
    misread: "툭툭 던지는 말이 장난처럼 가볍게 들린다는 말을 들어요.",
    tip: "리액션을 크게 받아 주세요. 신나서 대화가 길어져요.",
    goodWith: "RLCD",
    goodReason: "툭 던진 한 줄에도 길고 확실하게 받아쳐요",
    clashWith: "OBMG",
    clashReason: "던진 한 줄에 '편한 대로 해요'만 돌아와요",
  },
  OBCG: {
    summary: "짧은 말 속에 다정함과 여지를 슬쩍 담는, 밀고 당기기에 능한 낭만파입니다.",
    strength: "짧은 말에도 다정함을 담아 대화를 설레게 만들어요.",
    misread: "누구에게나 다정해서 진심인지 헷갈린다는 말을 들어요.",
    tip: "여지를 준 말에는 질문으로 받아 주세요. 대화가 자연스럽게 이어져요.",
    goodWith: "RLCG",
    goodReason: "짧은 한마디에 정성 가득한 장문이 돌아와요",
    clashWith: "OBMD",
    clashReason: "다정한 여지를 줬더니 '용건만요'라는 칼답이 와요",
  },
  OBMD: {
    summary: "필요한 말만 먼저 짧고 분명하게 전하는 군더더기 없는 효율주의자입니다.",
    strength: "필요한 말만 빠르고 분명하게 전해서 일이 금방 끝나요.",
    misread: "짧고 단호한 말투 때문에 차갑다는 말을 들어요.",
    tip: "돌려 말하기보다 되는지 안 되는지 바로 답해 주세요.",
    goodWith: "RBMD",
    goodReason: "용건만 보내면 용건만 답해서 깔끔해요",
    clashWith: "OBCG",
    clashReason: "용건 한 줄에 눈웃음 섞인 답장이 돌아와요",
  },
  OBMG: {
    summary: "말은 짧게 건네고 선택은 상대에게 맡기는 부담 없는 배려형 리더입니다.",
    strength: "먼저 제안하되 상대가 편하게 고를 수 있게 해 줘요.",
    misread: "다 맞춰 주다 보니 자기 의견이 없다는 말을 들어요.",
    tip: "선택을 맡기면 고민하지 말고 원하는 걸 바로 말해 주세요.",
    goodWith: "RBMG",
    goodReason: "짧게 맡기면 짧게 받아서 부담이 없어요",
    clashWith: "OBCD",
    clashReason: "선택권을 줬더니 상대가 혼자 다 정해 버려요",
  },
  RLCD: {
    summary: "상대 말을 잘 들어 주다가도 결국 자기 의견을 확실히 밝히는 소신 있는 수다쟁이입니다.",
    strength: "상대 말을 잘 들어 주면서도 자기 생각을 분명히 전해요.",
    misread: "물어봐 놓고 결국 자기 답으로 간다는 말을 들어요.",
    tip: "의견을 물으면 이유와 함께 답해 주세요. 설득되면 쿨하게 바꿔요.",
    goodWith: "OBCD",
    goodReason: "툭 던지는 한 줄에 내 의견을 신나게 풀어요",
    clashWith: "RBMG",
    clashReason: "의견을 길게 풀었더니 '아무거나'만 돌아와요",
  },
  RLCG: {
    summary: "상대의 한마디에 마음을 꾹꾹 눌러 담은 장문으로 답하는 감성 충만한 이야기꾼입니다.",
    strength: "상대가 한 말을 하나도 흘리지 않고 정성껏 답해 줘요.",
    misread: "가벼운 질문에도 장문이 와서 부담스럽다는 말을 들어요.",
    tip: "짧게라도 감정 리액션을 붙여 주세요. 'ㅇㅇ'만 오면 서운해해요.",
    goodWith: "OBCG",
    goodReason: "짧은 한마디도 장문으로 받아 주니 서로 좋아요",
    clashWith: "RBCD",
    clashReason: "긴 마음을 보냈는데 '넵!' 한 마디가 와요",
  },
  RLMD: {
    summary: "상대의 말을 끝까지 듣고 작은 차이까지 정확히 짚어내는 예리한 관찰자입니다.",
    strength: "말의 앞뒤를 꼼꼼히 살펴 상대가 놓친 부분까지 짚어 줘요.",
    misread: "하나하나 따져서 피곤하다는 말을 들어요.",
    tip: "애매하게 넘기기보다 근거를 들어 분명하게 말해 주세요.",
    goodWith: "OLMD",
    goodReason: "꼼꼼한 질문에 정리된 답이 돌아와요",
    clashWith: "RLMG",
    clashReason: "사실을 짚었더니 공감부터 해 달라고 해요",
  },
  RLMG: {
    summary: "이야기를 차분히 들어 주고 조곤조곤 공감을 건네는 편안한 밤의 상담가입니다.",
    strength: "상대의 이야기를 끝까지 듣고 차분하게 공감해 줘요.",
    misread: "공감만 하고 자기 얘기는 안 한다는 말을 들어요.",
    tip: "해결책보다 공감이 먼저예요. '그랬구나'로 시작해 주세요.",
    goodWith: "OLCG",
    goodReason: "먼저 말 걸고 여지까지 줘서 마음이 놓여요",
    clashWith: "RLMD",
    clashReason: "공감해 달라는데 사실부터 짚여서 서운해요",
  },
  RBCD: {
    summary: "짧지만 힘찬 한마디로 상대의 등을 확 밀어주는 시원시원한 응원단장입니다.",
    strength: "짧지만 확실한 응원으로 망설이는 상대의 등을 밀어 줘요.",
    misread: "고민을 길게 털어놨는데 답이 너무 짧다는 말을 들어요.",
    tip: "고민은 핵심만 짧게 말해 주세요. 시원한 답이 바로 와요.",
    goodWith: "OLCD",
    goodReason: "확실한 계획 앞에서 응원이 제일 신나요",
    clashWith: "RLCG",
    clashReason: "짧게 응원했는데 장문의 고민이 돌아와요",
  },
  RBCG: {
    summary: "ㅋㅋ와 이모지로 상대의 말에 환하게 반응하는 대화의 비타민입니다.",
    strength: "ㅋㅋ와 이모지로 어떤 말이든 즐겁게 받아 줘요.",
    misread: "리액션은 많은데 정작 내용이 없다는 말을 들어요.",
    tip: "진지한 얘기는 진지하다고 먼저 알려 주세요. 금방 맞춰 줘요.",
    goodWith: "OLMG",
    goodReason: "조용한 안부에 햇살 리액션이 딱 맞아요",
    clashWith: "RBMD",
    clashReason: "환하게 반응했는데 차갑게 '응'만 돌아와요",
  },
  RBMD: {
    summary: "필요한 만큼만 반응하고 페이스를 절대 잃지 않는 쿨한 포커페이스입니다.",
    strength: "감정에 휩쓸리지 않고 차분하게 필요한 말만 해요.",
    misread: "반응이 무심해서 관심 없냐는 말을 들어요.",
    tip: "짧은 답장이 기본이니 서운해하지 마세요. 물으면 꼭 답해요.",
    goodWith: "OBMD",
    goodReason: "서로 용건만 주고받으니 깔끔해요",
    clashWith: "RBCG",
    clashReason: "담백하게 답했더니 이모지 폭죽이 쏟아져요",
  },
  RBMG: {
    summary: "짧고 무심한 듯한 답장으로 부담 없이 대화를 이어가는 느긋한 평화주의자입니다.",
    strength: "답장에 부담을 주지 않아 대화가 편하게 이어져요.",
    misread: "'ㅇㅇ', 'ㄱㄱ' 같은 단답 때문에 대화하기 싫냐는 말을 들어요.",
    tip: "질문을 구체적으로 해 주세요. 열린 질문엔 단답이 와요.",
    goodWith: "OBMG",
    goodReason: "짧게 맡겨 주니 짧게 답해도 부담이 없어요",
    clashWith: "RLCD",
    clashReason: "한 줄 답했는데 의견 장문이 쏟아져요",
  },
};

export function getTypeGuide(code: TypeCode): TypeGuide {
  return typeGuides[code];
}
