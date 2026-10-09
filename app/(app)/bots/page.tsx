import { Plus } from "lucide-react";
import { BotDialog } from "@/components/bot-dialog";
import { Bento } from "@/components/ui/bento";
import { BotsEmpty } from "@/components/bots/bots-empty";
import { PageFrame } from "@/components/shell/page-frame";

export default function BotsPage() {
  return (
    <PageFrame
      title="Bots"
      subtitle="Each bot gets its own sandbox the first time it runs"
      actions={
        <BotDialog size="pill">
          <Plus data-icon="inline-start" />
          New bot
        </BotDialog>
      }
    >
      <Bento>
        <BotsEmpty cta={false} />
      </Bento>
    </PageFrame>
  );
}
