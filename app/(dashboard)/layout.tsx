import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { MobileTabBar, MobileTabBarFallback } from "@/components/shell/mobile-tab-bar";
import { NavRail, NavRailFallback } from "@/components/shell/nav-rail";
import { parseRail, RAIL_COOKIE } from "@/lib/shell/rail";
import { getBots } from "@/queries/bots";
import { getChats } from "@/queries/chats";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh">
      {/* cacheComponents: the cookie is request-time; the static shell paints the collapsed rail */}
      <Suspense fallback={<NavRailFallback initialExpanded={false} chats={[]} bots={[]} className="hidden md:flex" />}>
        <Rail />
      </Suspense>
      <main className="min-w-0 flex-1">
        {/* cacheComponents: session read is request-time, so it must sit under Suspense */}
        <Suspense>
          <Protected>{children}</Protected>
        </Suspense>
      </main>
      {/* cacheComponents: dynamic routes (/c/[chatId]) only know the pathname at request time */}
      <Suspense fallback={<MobileTabBarFallback />}>
        <MobileTabBar />
      </Suspense>
    </div>
  );
}

async function Rail() {
  const [jar, chats, bots] = await Promise.all([cookies(), getChats(), getBots()]);
  const expanded = parseRail(jar.get(RAIL_COOKIE)?.value);
  return <NavRail initialExpanded={expanded} chats={chats} bots={bots} className="hidden md:flex" />;
}

async function Protected({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return children;
}
