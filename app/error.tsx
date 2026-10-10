"use client";

import { RouteError } from "@/components/route-error";

// Catches what (dashboard)/error.tsx can't: a failure in (dashboard)/layout.tsx itself,
// such as the rail's chat query.
export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} />;
}
