"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics";

type Source = "header" | "result" | "landing";

export function TypesEntryLink({
  source,
  ...props
}: Omit<ComponentProps<typeof Link>, "onClick"> & { readonly source: Source }) {
  return <Link {...props} onClick={() => track("types_entry_click", { source })} />;
}
