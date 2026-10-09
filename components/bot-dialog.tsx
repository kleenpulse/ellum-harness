"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Shuffle } from "lucide-react";
import { nanoid } from "nanoid";
import { useMemo, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { createBot } from "@/actions/bot";
import { gazeSvg } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import GrowDialog from "@/components/ui/grow-dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CountedTextarea } from "@/components/ui/counted-textarea";
import { toast } from "@/components/ui/toast";
import { createBotSchema, INSTRUCTIONS_MAX, type CreateBotInput } from "@/lib/db/validation";

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

const blank = (): CreateBotInput => ({ name: "", avatar: nanoid(10), job: "", instructions: "" });

type BotDialogProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** The trigger's label. The dialog grows out of the trigger. */
  children: ReactNode;
};

/** A "new bot" trigger and the dialog it opens: templates, a shuffled face, name, job and instructions. */
export function BotDialog({ children, ...trigger }: BotDialogProps) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateBotInput>({
    resolver: zodResolver(createBotSchema),
    defaultValues: blank(),
  });

  const seed = useWatch({ control: form.control, name: "avatar" }) ?? "";
  const face = useMemo(() => (seed ? gazeSvg(seed) : ""), [seed]);

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
  }

  function onSubmit(values: CreateBotInput) {
    startTransition(async () => {
      const result = await createBot(values);
      if (!result.ok) {
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(key as keyof CreateBotInput, { message: messages[0] });
        }
        toast.add({ title: "Couldn't create the bot", description: result.error, type: "error" });
        return;
      }
      toast.add({ title: `${result.name} is ready`, description: "Its sandbox starts the first time you use it.", type: "success" });
      setOpen(false);
      form.reset(blank());
    });
  }

  return (
    <>
      <Button
        {...trigger}
        onClick={(e) => {
          setOrigin(e.currentTarget.getBoundingClientRect());
          setOpen(true);
        }}
      >
        {children}
      </Button>

      {/* Always mounted: unmounting would skip the shrink-back exit. */}
      <GrowDialog
        open={open}
        onOpenChange={onOpenChange}
        originRect={origin}
        originMaxWidth={PANEL_WIDTH}
        radius={24}
        title="New bot"
        description="Give it a face, a name, and a job to do."
        className="max-w-[520px]"
      >
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
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
              Create bot
            </Button>
          </div>
        </form>
      </GrowDialog>
    </>
  );
}
