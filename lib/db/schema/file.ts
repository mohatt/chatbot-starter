import { relations } from 'drizzle-orm'
import { index, jsonb, pgTable, timestamp, uuid, varchar, integer, text } from 'drizzle-orm/pg-core'
import { messages, chats, projects } from './chat'
import { users } from './auth'

export interface FileRecordMetadata {
  retrieval?: {
    vectors: number;
    tokens: number;
  }
}

export const files = pgTable("files", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  size: integer("size").notNull(),
  metadata: jsonb("metadata").notNull().$type<FileRecordMetadata>(),
  bucket: varchar("bucket", { enum: ["images", "retrieval"] }).notNull(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "set null" }),
  projectId: uuid("projectId")
    .references(() => projects.id, { onDelete: "set null" }),
  chatId: uuid("chatId")
    .references(() => chats.id, { onDelete: "set null" }),
  messageId: uuid("messageId")
    .references(() => messages.id, { onDelete: "set null" }),
  storageKey: varchar("storageKey", { length: 256 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("createdAt", { mode: 'string' }).defaultNow().notNull(),
}, (self) => [
  index('files_user_id_idx').on(self.userId, self.id.desc()),
  index('files_chat_id_idx').on(self.chatId, self.id.desc()),
  index('files_message_id_idx').on(self.messageId, self.id.desc()),
  index('files_project_id_idx').on(self.projectId, self.id.desc()),
])

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  chat: one(chats, {
    fields: [files.chatId],
    references: [chats.id],
  }),
  message: one(messages, {
    fields: [files.messageId],
    references: [messages.id],
  }),
}));
