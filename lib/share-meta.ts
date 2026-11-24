export const shareTitle = "[톡티비티] 나 무슨 유형 나왔게? 맞혀 봐";
export const shareDescription = "팩폭 한 줄 보고 내 카톡 유형 맞혀 봐! 너는 뭐 나올 것 같아?";

export function shareMeta(firstRoastLine: string) {
  return {
    title: shareTitle,
    description: shareDescription,
    alt: `톡티비티 유형 맞히기 퀴즈 이미지: 물음표 실루엣과 팩폭 한 줄 "${firstRoastLine}", 이 말투는 무슨 유형일까?`,
  };
}
