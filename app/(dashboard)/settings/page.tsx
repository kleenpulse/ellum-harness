import { gazeSvg } from "@/components/chat-avatar";
import { AvatarPicker } from "@/components/settings/avatar-picker";
import { Bento, BentoTitle } from "@/components/ui/bento";
import { PageFrame } from "@/components/shell/page-frame";
import { getPreferredSeed, randomSeed } from "@/lib/avatar";

const CHOICES = 11;

export default async function SettingsPage() {
  const preferred = await getPreferredSeed();
  const fresh = await Promise.all(Array.from({ length: CHOICES }, () => randomSeed()));
  const seeds = preferred ? [preferred, ...fresh] : fresh;

  return (
    <PageFrame title="Settings" subtitle="Appearance">
      <Bento className="flex max-w-3xl flex-col gap-5">
        <div className="flex flex-col gap-1">
          <BentoTitle>Avatar</BentoTitle>
          <p className="text-[13px] text-ink-2">
            Keep a face you like, or let a new one greet you on every visit.
          </p>
        </div>
        <AvatarPicker
          preferred={preferred}
          options={seeds.map((seed) => ({ seed, svg: gazeSvg(seed) }))}
        />
      </Bento>
    </PageFrame>
  );
}
