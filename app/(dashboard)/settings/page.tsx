import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { gazeSvg } from "@/components/chat-avatar";
import { About } from "@/components/settings/about";
import { Account } from "@/components/settings/account";
import { Appearance } from "@/components/settings/appearance";
import { AvatarPicker } from "@/components/settings/avatar-picker";
import { DangerZone } from "@/components/settings/danger-zone";
import { Plan, PlanFallback } from "@/components/settings/plan";
import { PageFrame } from "@/components/shell/page-frame";
import { Bento, BentoTitle } from "@/components/ui/bento";
import { getPreferredSeed, randomSeed } from "@/lib/avatar";
import { BOTS_VIEW_COOKIE, parseView } from "@/lib/bots/view";
import { parseRail, RAIL_COOKIE } from "@/lib/shell/rail";
import { getBots } from "@/queries/bots";
import { getChats } from "@/queries/chats";

export const metadata: Metadata = { title: "Settings" };

/** Avatar tiles: two full rows of six (three of four on a phone), so the grid never ends on a gap. */
const CHOICES = 12;

function Intro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <BentoTitle>{title}</BentoTitle>
      <p className="text-[13px] text-ink-2">{children}</p>
    </div>
  );
}

export default async function SettingsPage() {
  const [jar, preferred, bots, chats] = await Promise.all([cookies(), getPreferredSeed(), getBots(), getChats()]);
  const fresh = await Promise.all(Array.from({ length: preferred ? CHOICES - 1 : CHOICES }, () => randomSeed()));
  const seeds = preferred ? [preferred, ...fresh] : fresh;

  return (
    <PageFrame title="Settings" subtitle="Appearance, account and your data">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4 @board:col-span-8">
          <Bento className="flex flex-col gap-5">
            <Intro title="Appearance">How Ellum looks and moves on this device.</Intro>
            <Appearance
              initialRail={parseRail(jar.get(RAIL_COOKIE)?.value)}
              initialBotsView={parseView(jar.get(BOTS_VIEW_COOKIE)?.value)}
            />
          </Bento>

          <Bento i={1} className="flex flex-col gap-5">
            <Intro title="Avatar">Keep a face you like, or let a new one greet you on every visit.</Intro>
            <AvatarPicker preferred={preferred} options={seeds.map((seed) => ({ seed, svg: gazeSvg(seed) }))} />
          </Bento>

          <Bento i={2} className="flex flex-col gap-5">
            <Intro title="Danger zone">Deleting here is permanent.</Intro>
            <DangerZone bots={bots.length} chats={chats.length} />
          </Bento>
        </div>

        <div className="col-span-12 grid content-start gap-4 @3xl:grid-cols-2 @board:col-span-4 @board:grid-cols-1">
          <Bento i={3} className="flex flex-col gap-5">
            <BentoTitle>Account</BentoTitle>
            <Account />
          </Bento>

          <Suspense fallback={<PlanFallback i={4} />}>
            <Plan i={4} />
          </Suspense>

          <Bento i={5} className="flex flex-col gap-5 @3xl:col-span-2 @board:col-span-1">
            <BentoTitle>About</BentoTitle>
            <About />
          </Bento>
        </div>
      </div>
    </PageFrame>
  );
}
