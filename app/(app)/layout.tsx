import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { MobileTabBar } from "@/components/shell/mobile-tab-bar";
import { NavRail } from "@/components/shell/nav-rail";
import { parseRail, RAIL_COOKIE } from "@/lib/shell/rail";
import { getChats } from "@/queries/bots";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      {/* cacheComponents: the cookie is request-time; the static shell paints the collapsed rail */}
      <Suspense fallback={<NavRail initialExpanded={false} chats={[]} className="hidden md:flex" />}>
        <Rail />
      </Suspense>
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

async function Rail() {
  const [jar, chats] = await Promise.all([cookies(), getChats()]);
  const expanded = parseRail(jar.get(RAIL_COOKIE)?.value);
  return <NavRail initialExpanded={expanded} chats={chats} className="hidden md:flex" />;
}

async function Protected({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return children;
}
