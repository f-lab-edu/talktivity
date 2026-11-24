"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { TypeCode } from "@/lib/core/classification";

export function TypesCta({ code }: { readonly code: TypeCode }) {
  return (
    <Button asChild className="full-width">
      <Link href="/?from=types&step=input" onClick={() => track("types_cta_click", { code })}>
        내 유형 알아보기 <ArrowRight size={18} />
      </Link>
    </Button>
  );
}
