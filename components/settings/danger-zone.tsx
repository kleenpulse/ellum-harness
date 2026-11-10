"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { deleteAllData } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import GrowDialog from "@/components/ui/grow-dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { DELETE_CONFIRM, deleteAllSchema, type DeleteAllInput } from "@/lib/db/validation";
import { SettingList, SettingRow } from "./setting-row";

const PANEL_WIDTH = 460;
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

/** Deletes everything the user made, behind a typed confirmation. */
export function DangerZone({ bots, chats }: { bots: number; chats: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = bots === 0 && chats === 0;

  const form = useForm<DeleteAllInput>({
    resolver: zodResolver(deleteAllSchema),
    defaultValues: { confirm: "" },
  });

  function onOpenChange(next: boolean) {
    if (pending) return;
    setOpen(next);
    // A destructive confirmation never keeps a half-typed draft.
    if (!next) form.reset();
  }

  function onSubmit(values: DeleteAllInput) {
    startTransition(async () => {
      const result = await deleteAllData(values).catch((error: unknown) => {
        console.error("Delete all failed", error);
        return { ok: false as const, error: "Something went wrong. Nothing may have been deleted; check and try again." };
      });
      if (!result.ok) {
        const message = "fieldErrors" in result ? result.fieldErrors?.confirm?.[0] : undefined;
        if (message) form.setError("confirm", { message });
        toast.add({ type: "error", title: "Couldn't delete your data", description: result.error });
        return;
      }
      toast.add({
        type: "success",
        title: "Everything is deleted",
        description:
          result.strandedSandboxes === 0
            ? `${plural(result.bots, "bot")} and ${plural(result.chats, "chat")} are gone.`
            : "Your bots and chats are gone, but some of their computers couldn't be removed just now.",
      });
      setOpen(false);
      form.reset();
      router.push("/");
    });
  }

  return (
    <>
      <SettingList>
        <SettingRow
          title="Delete all bots and chats"
          help={
            empty
              ? "You have no bots or chats, so there is nothing to delete."
              : `Removes ${plural(bots, "bot")}, ${plural(chats, "chat")} and the bots' computers, with everything saved on them. This can't be undone.`
          }
        >
          <Button
            size="pill-sm"
            variant="destructive"
            disabled={empty}
            onClick={(event) => {
              setOrigin(event.currentTarget.getBoundingClientRect());
              setOpen(true);
            }}
          >
            <Trash2 data-icon="inline-start" />
            Delete everything
          </Button>
        </SettingRow>
      </SettingList>

      <GrowDialog
        open={open}
        onOpenChange={onOpenChange}
        originRect={origin}
        originMaxWidth={PANEL_WIDTH}
        radius={24}
        role="alertdialog"
        title="Delete all bots and chats?"
        description="This can't be undone."
        className="max-w-[460px]"
      >
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13px] leading-relaxed text-ink-2">
              <li>
                Deletes {plural(bots, "bot")}, {plural(chats, "chat")}, each bot&apos;s computer and memory, and your
                run history.
              </li>
              <li>Keeps your plan and this period&apos;s usage: deleting doesn&apos;t give any allowance back.</li>
              <li>Keeps your account. To close it, use Manage account.</li>
            </ul>
            <FieldGroup>
              <Controller
                name="confirm"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="delete-confirm">
                      Type <span className="font-mono text-ink">{DELETE_CONFIRM}</span> to confirm
                    </FieldLabel>
                    <Input
                      {...field}
                      id="delete-confirm"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-invalid={fieldState.invalid}
                      disabled={pending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </div>
          <div className="flex justify-end gap-2 px-5 pt-1 pb-5">
            <Button type="button" size="pill-sm" variant="surface" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="pill-sm" variant="destructive" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              Delete everything
            </Button>
          </div>
        </form>
      </GrowDialog>
    </>
  );
}
