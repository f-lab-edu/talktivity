import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const pretendard = localFont({
  src: "../assets/Pretendard-Bold.otf",
  weight: "700",
  variable: "--font-pretendard",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "톡티비티 | 카톡 대화 팩폭 분석기",
  description: "3초 만에 보는 내 톡 성향. 카톡 대화로 나만의 캐릭터를 찾아보세요.",
  openGraph: {
    title: "카톡 대화 팩폭 분석기 | 톡티비티",
    description: "말투는 못 숨기지. 나의 톡 캐릭터를 만나 보세요.",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
};
// KakaoTalk's in-app browser closes when the user goes back to a chat to take screenshots,
// so hand the page to the system browser and close the in-app view.
const openOutsideKakao = `(function(){var ua=navigator.userAgent;if(!/KAKAOTALK/.test(ua))return;location.href='kakaotalk://web/openExternal?url='+encodeURIComponent(location.href);setTimeout(function(){location.href=/iPhone|iPad|iPod/.test(ua)?'kakaoweb://closeBrowser':'kakaotalk://inappbrowser/close'},1000)})()`;
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static redirect script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: openOutsideKakao }} />
      </head>
      <body className={pretendard.variable}>
        <Providers>
          <div className="app-shell max-w-[480px] mx-auto">
            <header className="site-header">
              <Link href="/" className="wordmark">
                talktivity<span>●</span>
              </Link>
              <span className="header-label">톡으로 보는 나</span>
            </header>
            <main id="main">{children}</main>
            <footer className="site-footer">
              <nav aria-label="정책">
                <Link href="/privacy">개인정보처리방침</Link>
                <Link href="/terms">이용약관</Link>
                <Link href="/refund">환불정책</Link>
                <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>
              </nav>
              © 2026 톡티비티 · AI 대화 말투 분석
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
