import { Plus } from "lucide-react";
import { BotDialog } from "@/components/bot-dialog";
import { Bento } from "@/components/ui/bento";
import { BotList } from "@/components/bots/bot-list";
import { BotsEmpty } from "@/components/bots/bots-empty";
import { PageFrame } from "@/components/shell/page-frame";
import { getBots } from "@/queries/bots";

export default async function BotsPage() {
  const bots = await getBots();

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
      {bots.length ? (
        <BotList bots={bots} />
      ) : (
        <Bento>
          <BotsEmpty cta={false} />
        </Bento>
      )}
    </PageFrame>
  );
}
