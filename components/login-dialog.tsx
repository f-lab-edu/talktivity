"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { signIn } from "@/lib/auth-client";
import type { AuthUser } from "@/lib/core/auth";

export function LoginDialog({
  open,
  onOpenChange,
  returnPath,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly returnPath?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [instagram, setInstagram] = useState(false);
  useEffect(() => setInstagram(/Instagram/i.test(navigator.userAgent)), []);
  async function login(provider: AuthUser["provider"]) {
    setBusy(true);
    setNotice("");
    try {
      await signIn(provider, returnPath);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setNotice("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>로그인하고 이어가기</DialogTitle>
        <DialogDescription>
          카카오나 구글로 로그인하면 크레딧과 리포트를 이용할 수 있어요. 분석과 공유는 로그인 없이
          이용할 수 있어요.
        </DialogDescription>
        <div className="login-actions">
          <Button variant="kakao" disabled={busy} onClick={() => void login("kakao")}>
            카카오로 로그인
          </Button>
          <Button
            variant="outline"
            disabled={busy || instagram}
            aria-describedby={instagram ? "google-webview-note" : undefined}
            onClick={() => void login("google")}
          >
            구글로 로그인
          </Button>
        </div>
        {instagram && (
          <p id="google-webview-note">구글 로그인은 외부 브라우저에서 이 페이지를 열어 주세요.</p>
        )}
        <p role="status">{notice}</p>
      </DialogContent>
    </Dialog>
  );
}
