"use client";

import { shareDescription, shareTitle } from "@/lib/share-meta";

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
        readonly imageWidth: number;
        readonly imageHeight: number;
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
  readonly url: string;
  readonly imageUrl: string;
}): Promise<"kakao" | "web" | "copy"> {
  initKakao();
  if (kakaoKey && window.Kakao?.isInitialized()) {
    const link = { mobileWebUrl: options.url, webUrl: options.url };
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: shareTitle,
        description: shareDescription,
        imageUrl: options.imageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link,
      },
      buttons: [{ title: "맞히러 가기", link }],
    });
    return "kakao";
  }
  if (navigator.share) {
    await navigator.share({ title: shareTitle, url: options.url });
    return "web";
  }
  await navigator.clipboard.writeText(options.url);
  return "copy";
}
