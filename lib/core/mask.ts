import { parseKakao } from "./parse-kakao";

export function maskPII(input: string): string {
  return input
    .replace(/https?:\/\/[^\s]+|www\.[^\s]+/gi, "[링크]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일]")
    .replace(/(?:\+82[- .]?(?:0)?|0)(?:1[016789]|2|[3-6][1-5]|70)[- .]?\d{3,4}[- .]?\d{4}/g, "[전화번호]")
    .replace(/\d(?:[\d -]{6,}\d)/g, "[계좌번호]");
}

export function prepareConversation(input: string, mySpeaker?: string): string {
  const messages = parseKakao(input);
  const names = [...new Set(messages.flatMap((m) => m.speaker ? [m.speaker] : []))];
  return messages.map((message) => {
    let body = message.text;
    for (const name of names) body = body.replaceAll(name, name === mySpeaker ? "나" : "상대");
    const label = message.speaker ? (message.speaker === mySpeaker ? "나" : "상대") : "대화";
    return `${label}: ${maskPII(body)}`;
  }).join("\n");
}
