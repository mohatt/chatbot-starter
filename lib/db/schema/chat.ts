import { relations, sql } from 'drizzle-orm'
import { index, json, jsonb, pgTable, text, timestamp, boolean, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { files } from './file'
import type { ChatMessage, ChatMessageMetadata } from '@/lib/ai'

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (self) => [
  // Listing projects for a user (sidebar)
  index('projects_user_id_idx').on(self.userId, self.id.desc()),
])

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("projectId")
    .references(() => projects.id, { onDelete: "cascade" }),
  privacy: varchar("privacy", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  isTitlePending: boolean("isTitlePending").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (self) => [
  // Project chat listing (user + project, ordered by recency)
  index('chats_user_project_id_idx').on(
    self.userId,
    self.projectId,
    self.id.desc(),
  ),
  // Ungrouped sidebar listing (projectId is null)
  index('chats_user_ungrouped_id_idx')
    .on(self.userId, self.id.desc())
    .where(sql`${self.projectId} is null`),
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: varchar("role", { enum: ['user', 'assistant'] }).notNull(),
  parts: json("parts").notNull().$type<ChatMessage['parts']>(),
  metadata: jsonb("metadata").notNull().$type<ChatMessageMetadata>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (self) => [
  index('messages_chat_id_idx').on(self.chatId, self.id.desc()),
]);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  chats: many(chats),
  files: many(files),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [chats.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
  files: many(files),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));
