import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { NavRail } from "@/components/shell/nav-rail";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      <NavRail className="hidden md:flex" />
      <main className="min-w-0 flex-1">
        {/* cacheComponents: session read is request-time, so it must sit under Suspense */}
        <Suspense>
          <Protected>{children}</Protected>
        </Suspense>
      </main>
      <MobileTabBar />
    </div>
  );
}

async function Protected({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return children;
}
