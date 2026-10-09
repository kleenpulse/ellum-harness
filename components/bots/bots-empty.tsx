import { ArrowRight } from "lucide-react";
import { AvatarStage } from "@/components/avatar-stage";
import { gazeSvg } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { PaneState } from "@/components/ui/pane-state";
import { getAvatarSeed } from "@/lib/avatar";

/** "No bots yet", fronted by a gaze avatar: the preferred one from Settings, else a new face each visit. */
export async function BotsEmpty({ cta = true }: { cta?: boolean }) {
  const seed = await getAvatarSeed();
  return (
    <PaneState
      media={<AvatarStage svg={gazeSvg(seed)} />}
      title="No bots yet"
      action={
        cta ? (
          <Button size="pill-sm" variant="surface">
            Create your first bot
            <ArrowRight data-icon="inline-end" />
          </Button>
        ) : undefined
      }
    >
      Give a bot a job and a name. It starts a sandbox the first time you use it.
    </PaneState>
  );
}
