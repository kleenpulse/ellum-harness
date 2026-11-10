import type { Metadata } from "next";
import { NotFoundState } from "@/components/not-found-state";

export const metadata: Metadata = {
  title: "Not found · EllumHarness",
};

// Handles every unmatched URL; renders outside the dashboard shell.
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-1 flex-col bg-background">
      <NotFoundState />
    </main>
  );
}
