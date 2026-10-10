import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod";
import { bots } from "./schema";

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
