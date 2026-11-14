"use client";

type KakaoSDK = {
  readonly isInitialized: () => boolean;
  readonly init: (key: string) => void;
  readonly Share: {
    readonly sendDefault: (options: {
      readonly objectType: "feed";
      readonly content: {
        readonly title: string;
        readonly description: string;
        readonly imageUrl: string;
        readonly link: { readonly mobileWebUrl: string; readonly webUrl: string };
      };
      readonly buttons: readonly {
        readonly title: string;
        readonly link: { readonly mobileWebUrl: string; readonly webUrl: string };
      }[];
    }) => void;
  };
};
declare global {
  interface Window {
    readonly Kakao?: KakaoSDK;
  }
}
export const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
export function initKakao() {
  if (kakaoKey && window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(kakaoKey);
}
export async function shareKakao(options: {
  readonly name: string;
  readonly url: string;
  readonly imageUrl: string;
}): Promise<"kakao" | "web" | "copy"> {
  initKakao();
  const title = `[톡티비티] 나 '${options.name}' 나왔어 ㅋㅋㅋ`;
  if (kakaoKey && window.Kakao?.isInitialized()) {
    const link = { mobileWebUrl: options.url, webUrl: options.url };
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title,
        description: "너는 나랑 카톡할 때 무슨 유형 나올 것 같아? 3초 만에 확인해봐!",
        imageUrl: options.imageUrl,
        link,
      },
      buttons: [{ title: "나도 무료로 팩폭 분석하기", link }],
    });
    return "kakao";
  }
  if (navigator.share) {
    await navigator.share({ title, url: options.url });
    return "web";
  }
  await navigator.clipboard.writeText(options.url);
  return "copy";
}
