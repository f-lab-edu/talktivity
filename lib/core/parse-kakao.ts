export type Message = {
  readonly speaker: string | null;
  readonly text: string;
  readonly time?: string;
};

export function parseKakao(input: string): readonly Message[] {
  const messages: Message[] = [];
  for (const line of input.split(/\r?\n/).filter((line) => line.trim())) {
    const match =
      line.match(
        /^\[(?<speaker>[^\]]+)\]\s*\[(?<time>(?:(?:\d{4}년\s*)?\d{1,2}월\s*\d{1,2}일\s*)?(?:오전|오후)?\s*\d{1,2}:\d{2})\]\s*(?<text>.*)$/,
      ) ??
      line.match(
        /^(?<time>\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*(?:오전|오후)\s*\d{1,2}:\d{2}),\s*(?<speaker>[^:]+?)\s*:\s*(?<text>.*)$/,
      ) ??
      line.match(/^(?<speaker>[^:[\]\n]{1,100}?)\s*:(?!\/\/)\s*(?<text>.*)$/);
    const fields = match?.groups;
    if (fields?.speaker && fields.text !== undefined) {
      messages.push({
        speaker: fields.speaker.trim(),
        text: fields.text,
        ...(fields.time ? { time: fields.time } : {}),
      });
    } else {
      const previous = messages.at(-1);
      if (previous)
        messages[messages.length - 1] = { ...previous, text: `${previous.text}\n${line}` };
      else messages.push({ speaker: null, text: line });
    }
  }
  return messages;
}

export function speakersIn(input: string): readonly string[] {
  return [
    ...new Set(parseKakao(input).flatMap((message) => (message.speaker ? [message.speaker] : []))),
  ];
}
