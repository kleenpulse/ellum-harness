import { Plus } from "lucide-react";
import { Bento } from "@/components/ui/bento";
import { Button } from "@/components/ui/button";
import { BotsEmpty } from "@/components/bots/bots-empty";
import { PageFrame } from "@/components/shell/page-frame";

export default function BotsPage() {
  return (
    <PageFrame
      title="Bots"
      subtitle="Each bot gets its own sandbox the first time it runs"
      actions={
        <Button size="pill">
          <Plus data-icon="inline-start" />
          New bot
        </Button>
      }
    >
      <Bento>
        <BotsEmpty cta={false} />
      </Bento>
    </PageFrame>
  );
}
