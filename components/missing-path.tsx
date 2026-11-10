"use client";

import { usePathname } from "next/navigation";

/** The URL that didn't match, for the not-found state. */
export function MissingPath() {
  return <>{usePathname()}</>;
}
