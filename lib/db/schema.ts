import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
// Relative: drizzle-kit loads this file without the app's path aliases.
import { METRICS } from "../usage-limits";

export const bots = pgTable(
  "bots",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    // Clerk user id.
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    // Seed for the bot's generated face.
    avatar: text("avatar").notNull().$defaultFn(() => nanoid()),
    // What the bot is for, in a phrase.
    job: text("job").notNull(),
    // How it should go about the job.
    instructions: text("instructions"),
    // Daytona sandbox, created and deleted with the bot.
    sandboxId: text("sandbox_id"),
    // End of the sandbox time already charged to the ledger. Spans that overlap
    // (a turn running while the desktop is open) are only charged once.
    sandboxMeteredUntil: timestamp("sandbox_metered_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("bots_user_id_idx").on(t.userId)],
);

export const chatKind = pgEnum("chat_kind", ["direct", "group"]);

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    // Clerk user id.
    userId: text("user_id").notNull(),
    kind: chatKind("kind").default("direct").notNull(),
    // Null for direct chats, which show the bot's name.
    name: text("name"),
    lastMessagePreview: text("last_message_preview"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("chats_user_id_idx").on(t.userId)],
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("bot_id")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.botId] }), index("chat_members_bot_id_idx").on(t.botId)],
);

export const usageMetric = pgEnum("usage_metric", METRICS);

// Append-only usage ledger. A billing period's usage is the sum of its rows
// since the period started; limits live in lib/usage.ts. Bot and chat ids
// are references only, so deleting a bot doesn't refund what it used.
export const usageEvents = pgTable(
  "usage_events",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    // Clerk user id.
    userId: text("user_id").notNull(),
    metric: usageMetric("metric").notNull(),
    amount: integer("amount").notNull(),
    botId: text("bot_id"),
    chatId: text("chat_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("usage_events_user_metric_created_idx").on(t.userId, t.metric, t.createdAt)],
);

export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  bot: one(bots, { fields: [chatMembers.botId], references: [bots.id] }),
}));
