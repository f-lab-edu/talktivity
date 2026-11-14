"use client";

import { MotionConfig } from "motion/react";
import Script from "next/script";
import type { ReactNode } from "react";
import { initKakao, kakaoKey } from "@/lib/kakao";

export function Providers({ children }: { readonly children: ReactNode }) {
  return <MotionConfig reducedMotion="user">
    {children}
    {kakaoKey && <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.6/kakao.min.js" strategy="lazyOnload" onReady={initKakao} />}
  </MotionConfig>;
}
