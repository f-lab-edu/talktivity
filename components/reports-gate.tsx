"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { LoginDialog } from "@/components/login-dialog";
import { Button } from "@/components/ui/button";
import { authEnabled, useAuth } from "@/lib/auth-client";

// Renders its children only for a signed-in user; they fetch their own data on mount.
export function ReportsGate({
  returnPath,
  children,
}: {
  readonly returnPath: string;
  readonly children: ReactNode;
}) {
  const { session, ready } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  if (!authEnabled) return <p className="muted">로그인 서비스를 준비 중이에요.</p>;
  if (!ready) return <p className="muted">불러오는 중...</p>;
  if (!session)
    return (
      <div className="reports-empty">
        <p>로그인하면 내가 받은 리포트를 볼 수 있어요.</p>
        <Button onClick={() => setLoginOpen(true)}>로그인하기</Button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} returnPath={returnPath} />
      </div>
    );
  return children;
}
