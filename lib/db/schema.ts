import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

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
