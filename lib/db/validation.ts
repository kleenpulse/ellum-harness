import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { bots, chats } from "./schema";

export const INSTRUCTIONS_MAX = 2000;

/** Every insertable bot column, with the limits the form enforces. */
export const insertBotSchema = createInsertSchema(bots, {
  name: (s) => s.trim().min(1, "Give it a name.").max(40, "Keep the name under 40 characters."),
  avatar: (s) => s.min(1).max(64),
  job: (s) => s.trim().min(1, "Say what it's for.").max(80, "Keep the job under 80 characters."),
  instructions: (s) => s.trim().max(INSTRUCTIONS_MAX, `Keep instructions under ${INSTRUCTIONS_MAX.toLocaleString("en-US")} characters.`),
});

/** What a user fills in, creating or editing. Ownership, ids and timestamps are set on the server. */
export const botSchema = insertBotSchema.pick({
  name: true,
  avatar: true,
  job: true,
  instructions: true,
});

export type BotInput = z.input<typeof botSchema>;

export const GROUP_BOTS_MIN = 2;

const chatName = (s: z.ZodString) =>
  s.trim().min(1, "Give the group a name.").max(40, "Keep the name under 40 characters.");

/** Every insertable chat column, with the limits the group form enforces. */
export const insertChatSchema = createInsertSchema(chats, { name: chatName });

/** A new group: its name and members. Kind, owner and ids are set on the server. */
export const groupChatSchema = insertChatSchema
  .pick({ name: true })
  .extend({
    // The column is nullable for direct chats; a group always has a name.
    name: chatName(z.string()),
    botIds: z.array(z.string()).min(GROUP_BOTS_MIN, `Pick at least ${GROUP_BOTS_MIN} bots.`),
  });

export type GroupChatInput = z.input<typeof groupChatSchema>;

/** What the user types to confirm deleting everything they made. */
export const DELETE_CONFIRM = "DELETE";

/** No table behind this one: it only guards the "delete all my data" action. */
export const deleteAllSchema = z.object({
  confirm: z
    .string()
    .trim()
    .refine((value) => value === DELETE_CONFIRM, `Type ${DELETE_CONFIRM} to confirm.`),
});

export type DeleteAllInput = z.input<typeof deleteAllSchema>;
