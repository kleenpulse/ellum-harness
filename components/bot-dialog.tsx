"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Shuffle } from "lucide-react";
import { nanoid } from "nanoid";
import { useMemo, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { createBot, updateBot } from "@/actions/bot";
import { usePlanGate } from "@/components/billing/use-plan-gate";
import { gazeSvg } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import GrowDialog from "@/components/ui/grow-dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CountedTextarea } from "@/components/ui/counted-textarea";
import { toast } from "@/components/ui/toast";
import { BOT_FEATURES } from "@/lib/billing";
import { botSchema, INSTRUCTIONS_MAX, type BotInput } from "@/lib/db/validation";

const TEMPLATES = [
  {
    name: "Ada",
    job: "Research assistant",
    instructions: "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    name: "Linus",
    job: "Code reviewer",
    instructions: "Look for bugs before style. Suggest fixes as patches, and never push without asking.",
  },
  {
    name: "Max",
    job: "Writing editor",
    instructions: "Tighten the prose without changing the author's voice. Explain each larger edit in a line.",
  },
  {
    name: "Sofia",
    job: "Tutor",
    instructions: "Teach with questions before answers, and end with a short exercise to check understanding.",
  },
] as const;

const PANEL_WIDTH = 520;

const blank = (): BotInput => ({ name: "", avatar: nanoid(10), job: "", instructions: "" });

/** An existing bot to edit. Without one, the dialog creates a new bot. */
export type EditableBot = {
  id: string;
  name: string;
  avatar: string;
  job: string;
  instructions: string | null;
};

const fromBot = (bot: EditableBot): BotInput => ({
  name: bot.name,
  avatar: bot.avatar,
  job: bot.job,
  instructions: bot.instructions ?? "",
});

type BotDialogProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** The trigger's content. The dialog grows out of the trigger. */
  children: ReactNode;
  bot?: EditableBot;
};

/**
 * A bot trigger and the dialog it opens: a shuffled face, name, job and
 * instructions. New bots also get templates; pass `bot` to edit one instead.
 */
export function BotDialog({ children, bot, ...trigger }: BotDialogProps) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const plan = usePlanGate();

  return (
    <>
      <Button
        {...trigger}
        onClick={(e) => {
          // New bots only: editing or deleting one stays open after a plan lapses.
          if (!bot && !plan.allows(BOT_FEATURES)) return;
          setOrigin(e.currentTarget.getBoundingClientRect());
          setOpen(true);
        }}
      >
        {children}
      </Button>
      <BotDialogPanel open={open} onOpenChange={setOpen} origin={origin} bot={bot} />
    </>
  );
}

/**
 * The dialog alone, for triggers that aren't a Button (a menu item). Keep it
 * mounted: unmounting would skip the shrink-back exit.
 */
export function BotDialogPanel({
  open,
  onOpenChange: setOpen,
  origin,
  bot,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The rect the panel grows out of and shrinks back into. */
  origin: DOMRect | null;
  bot?: EditableBot;
}) {
  const [pending, startTransition] = useTransition();
  const plan = usePlanGate();

  const form = useForm<BotInput>({
    resolver: zodResolver(botSchema),
    defaultValues: bot ? fromBot(bot) : blank(),
  });

  const seed = useWatch({ control: form.control, name: "avatar" }) ?? "";
  const face = useMemo(() => (seed ? gazeSvg(seed) : ""), [seed]);

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
  }

  function onSubmit(values: BotInput) {
    startTransition(async () => {
      const result = bot ? await updateBot(bot.id, values) : await createBot(values);
      if (!result.ok) {
        if (result.upgrade) {
          plan.prompt(result.error);
          return;
        }
        if (result.limit) {
          plan.limit(result.error);
          return;
        }
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(key as keyof BotInput, { message: messages[0] });
        }
        toast.add({ title: bot ? "Couldn't save the bot" : "Couldn't create the bot", description: result.error, type: "error" });
        return;
      }
      if (bot) {
        toast.add({ title: `${result.name} is updated`, type: "success" });
      } else {
        toast.add({ title: `${result.name} is ready`, description: "Its sandbox starts the first time you use it.", type: "success" });
      }
      setOpen(false);
      // Editing: the saved values become the new baseline for the next open.
      form.reset(bot ? values : blank());
    });
  }

  return (
    <GrowDialog
      open={open}
      onOpenChange={onOpenChange}
      originRect={origin}
      originMaxWidth={PANEL_WIDTH}
      radius={24}
      title={bot ? "Edit bot" : "New bot"}
      description={bot ? "Change its face, name, job or instructions." : "Give it a face, a name, and a job to do."}
      className="max-w-[520px]"
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
          {!bot && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Start from a template">
              {TEMPLATES.map((t) => (
                <Button
                  key={t.job}
                  type="button"
                  size="pill-sm"
                  variant="surface"
                  disabled={pending}
                  onClick={() =>
                    form.reset({ ...t, avatar: form.getValues("avatar") }, { keepDefaultValues: true })
                  }
                >
                  {t.job}
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center [&_svg]:size-full"
              // Generated locally by DiceBear from a seed: trusted markup.
              dangerouslySetInnerHTML={{ __html: face }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium text-ink">Face</span>
              <span className="text-[13px] text-ink-2">Shuffle until you find one you like.</span>
            </div>
            <Button
              type="button"
              size="pill-sm"
              variant="surface"
              disabled={pending}
              onClick={() => form.setValue("avatar", nanoid(10), { shouldDirty: true })}
            >
              <Shuffle data-icon="inline-start" />
              Shuffle
            </Button>
          </div>

          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="bot-name"
                    placeholder="Ada"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    disabled={pending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="job"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-job">Job</FieldLabel>
                  <Input
                    {...field}
                    id="bot-job"
                    placeholder="Research assistant"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    disabled={pending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="instructions"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-instructions">How it should work</FieldLabel>
                  <CountedTextarea
                    max={INSTRUCTIONS_MAX}
                    {...field}
                    value={field.value ?? ""}
                    id="bot-instructions"
                    placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                    aria-invalid={fieldState.invalid}
                    disabled={pending}
                    className="min-h-24"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </div>

        <div className="flex justify-end gap-2 px-5 pt-1 pb-5">
          <Button
            type="button"
            size="pill-sm"
            variant="surface"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="pill-sm" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {bot ? "Save changes" : "Create bot"}
          </Button>
        </div>
      </form>
    </GrowDialog>
  );
}
