import { relations } from 'drizzle-orm'
import { index, jsonb, pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core'
import { chats, projects } from './chat'
import { users } from './auth'
import type { FileUpload } from '@/lib/schema'

export type FileRecordMetadata = Pick<FileUpload, 'name' | 'type' | 'mimeType' | 'size'> & {
  retrieval?: {
    vectors: number;
    tokens: number;
  }
}

export const files = pgTable("files", {
  id: uuid("id").primaryKey().notNull(),
  type: varchar("type", { enum: ["image", "retrieval", "avatar"] }).notNull(),
  metadata: jsonb("metadata").notNull().$type<FileRecordMetadata>(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("projectId") // project specific files
    .references(() => projects.id, { onDelete: "cascade" }),
  chatId: uuid("chatId") // Chat specific files
    .references(() => chats.id, { onDelete: "cascade" }),
  storageKey: varchar("storageKey", { length: 256 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (self) => [
  index('files_user_id_idx').on(self.userId, self.id.desc()),
  index('files_chat_id_idx').on(self.chatId, self.id.desc()),
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
}));
