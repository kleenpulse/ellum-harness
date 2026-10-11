"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@bprogress/next/app";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { createGroupChat } from "@/actions/chat";
import { ChatAvatar } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import GrowDialog from "@/components/ui/grow-dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { GROUP_BOTS_MIN, groupChatSchema, type GroupChatInput } from "@/lib/db/validation";

const PANEL_WIDTH = 440;

const blank = (): GroupChatInput => ({ name: "", botIds: [] });

export type GroupChatBot = { id: string; name: string; avatar: string };

/**
 * The new-group dialog: a name and which bots are in it. Keep it mounted:
 * unmounting would skip the shrink-back exit.
 */
export function GroupChatDialogPanel({
  open,
  onOpenChange: setOpen,
  origin,
  bots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The rect the panel grows out of and shrinks back into. */
  origin: DOMRect | null;
  bots: GroupChatBot[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<GroupChatInput>({
    resolver: zodResolver(groupChatSchema),
    defaultValues: blank(),
  });

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
  }

  function onSubmit(values: GroupChatInput) {
    startTransition(async () => {
      const result = await createGroupChat(values);
      if (!result.ok) {
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(key as keyof GroupChatInput, { message: messages[0] });
        }
        toast.add({ title: "Couldn't create the group", description: result.error, type: "error" });
        return;
      }
      toast.add({ title: `${result.name} is ready`, type: "success" });
      setOpen(false);
      form.reset(blank());
      router.push(`/c/${result.id}`);
    });
  }

  return (
    <GrowDialog
      open={open}
      onOpenChange={onOpenChange}
      originRect={origin}
      originMaxWidth={PANEL_WIDTH}
      radius={24}
      title="New group chat"
      description="Name the group and pick which bots are in it."
      className="max-w-[440px]"
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5">
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="group-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="group-name"
                    placeholder="Weekend plans"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    disabled={pending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="botIds"
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet data-invalid={fieldState.invalid}>
                  <FieldLegend variant="label">Bots</FieldLegend>
                  {bots.length < GROUP_BOTS_MIN && (
                    <FieldDescription>You need at least {GROUP_BOTS_MIN} bots to start a group.</FieldDescription>
                  )}
                  <FieldGroup data-slot="checkbox-group" className="gap-3">
                    {bots.map((bot) => {
                      const id = `group-bot-${bot.id}`;
                      return (
                        <Field key={bot.id} orientation="horizontal">
                          <Checkbox
                            id={id}
                            name={field.name}
                            checked={field.value.includes(bot.id)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked ? [...field.value, bot.id] : field.value.filter((v) => v !== bot.id),
                              )
                            }
                            aria-invalid={fieldState.invalid}
                            disabled={pending}
                          />
                          <FieldLabel htmlFor={id} className="gap-2.5 font-normal">
                            <ChatAvatar seed={bot.avatar} className="size-6" />
                            {bot.name}
                          </FieldLabel>
                        </Field>
                      );
                    })}
                  </FieldGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </FieldSet>
              )}
            />
          </FieldGroup>
        </div>

        <div className="flex justify-end gap-2 px-5 pt-1 pb-5">
          <Button type="button" size="pill-sm" variant="surface" disabled={pending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="pill-sm" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            Create group
          </Button>
        </div>
      </form>
    </GrowDialog>
  );
}
