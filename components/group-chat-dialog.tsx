"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "@bprogress/next/app";
import { useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { createGroupChat, deleteGroupChat, updateGroupChat } from "@/actions/chat";
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

/** An existing group to edit. Without one, the dialog creates a new group. */
export type EditableGroupChat = { id: string; name: string; botIds: string[] };

const fromChat = (chat: EditableGroupChat): GroupChatInput => ({ name: chat.name, botIds: chat.botIds });

type GroupChatDialogProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** The trigger's content. The dialog grows out of the trigger. */
  children: ReactNode;
  chat?: EditableGroupChat;
  bots: GroupChatBot[];
};

/** A group trigger and the dialog it opens. Pass `chat` to edit one. */
export function GroupChatDialog({ children, chat, bots, ...trigger }: GroupChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);

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
      <GroupChatDialogPanel open={open} onOpenChange={setOpen} origin={origin} chat={chat} bots={bots} />
    </>
  );
}

/**
 * The group dialog alone: a name and which bots are in it, and for an
 * existing group a way to delete it. Keep it mounted: unmounting would skip
 * the shrink-back exit.
 */
export function GroupChatDialogPanel({
  open,
  onOpenChange: setOpen,
  origin,
  chat,
  bots,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The rect the panel grows out of and shrinks back into. */
  origin: DOMRect | null;
  chat?: EditableGroupChat;
  bots: GroupChatBot[];
}) {
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const busy = pending || deleting;
  const router = useRouter();

  const form = useForm<GroupChatInput>({
    resolver: zodResolver(groupChatSchema),
    defaultValues: chat ? fromChat(chat) : blank(),
  });

  function onOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) setConfirming(false);
  }

  function onSubmit(values: GroupChatInput) {
    startTransition(async () => {
      const result = chat ? await updateGroupChat(chat.id, values) : await createGroupChat(values);
      if (!result.ok) {
        for (const [key, messages] of Object.entries(result.fieldErrors ?? {})) {
          if (messages?.[0]) form.setError(key as keyof GroupChatInput, { message: messages[0] });
        }
        toast.add({
          title: chat ? "Couldn't save the group" : "Couldn't create the group",
          description: result.error,
          type: "error",
        });
        return;
      }
      toast.add({ title: chat ? `${result.name} is updated` : `${result.name} is ready`, type: "success" });
      setOpen(false);
      // Editing: the saved values become the new baseline for the next open.
      form.reset(chat ? values : blank());
      if (!chat) router.push(`/c/${result.id}`);
    });
  }

  function onDelete() {
    if (!chat) return;
    startDelete(async () => {
      const result = await deleteGroupChat(chat.id);
      if (!result.ok) {
        toast.add({ title: "Couldn't delete the group", description: result.error, type: "error" });
        return;
      }
      toast.add({ title: `${chat.name} is deleted`, type: "success" });
      router.replace("/");
      // The rail still lists the group until the layout re-renders.
      router.refresh();
    });
  }

  return (
    <GrowDialog
      open={open}
      onOpenChange={onOpenChange}
      originRect={origin}
      originMaxWidth={PANEL_WIDTH}
      radius={24}
      title={chat ? "Edit group chat" : "New group chat"}
      description={chat ? "Rename the group or change who's in it." : "Name the group and pick which bots are in it."}
      className="max-w-[440px]"
    >
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5">
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
                    disabled={busy}
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
                            disabled={busy}
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

          {chat && (
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium text-ink">
                  {confirming ? "Delete this group for good?" : "Delete group"}
                </span>
                <span className="text-[13px] text-ink-2">Its messages go with it. The bots stay.</span>
              </div>
              {confirming && (
                <Button
                  type="button"
                  size="pill-sm"
                  variant="surface"
                  disabled={busy}
                  onClick={() => setConfirming(false)}
                >
                  Keep it
                </Button>
              )}
              <Button
                type="button"
                size="pill-sm"
                variant="destructive"
                disabled={busy}
                onClick={() => (confirming ? onDelete() : setConfirming(true))}
              >
                {deleting && <Spinner data-icon="inline-start" />}
                Delete
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pt-1 pb-5">
          <Button type="button" size="pill-sm" variant="surface" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" size="pill-sm" disabled={busy}>
            {pending && <Spinner data-icon="inline-start" />}
            {chat ? "Save changes" : "Create group"}
          </Button>
        </div>
      </form>
    </GrowDialog>
  );
}
