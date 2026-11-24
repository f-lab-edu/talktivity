"use client";

import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { TypesEntryLink } from "@/components/types-entry-link";

export function HeaderNav() {
  const active = usePathname().startsWith("/types");
  return (
    <TypesEntryLink
      source="header"
      href="/types"
      className="header-link"
      aria-current={active ? "page" : undefined}
    >
      <BookOpen size={16} aria-hidden="true" />
      유형 도감
    </TypesEntryLink>
  );
}
