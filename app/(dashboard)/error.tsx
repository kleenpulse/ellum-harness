"use client";

import { RouteError } from "@/components/route-error";

// Page failures: the rail and tab bar from the layout stay mounted around this.
export default function DashboardError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError {...props} />;
}
