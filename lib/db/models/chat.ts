import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { users } from './user'

export interface ChatRecordContextFile {
  id: string;
  name: string;
  type: string;
  size: number;
  vectors: number;
  tokens: number;
}

export interface ChatRecordContext {
  size: number;
  vectors: number;
  tokens: number;
  files: ChatRecordContextFile[];
}

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id),
  privacy: varchar("privacy", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
  context: jsonb("context").$type<ChatRecordContext | null>(),
  createdAt: timestamp("createdAt").notNull(),
});

export type ChatRecord = typeof chats.$inferSelect;
export type ChatRecordInput = typeof chats.$inferInsert;

export class ChatModel extends DbModel {
  schema = chats;

  async getById(id: string) {
    try {
      const [selectedChat] = await this.db.select().from(chats).where(eq(chats.id, id));
      if (!selectedChat) {
        return null;
      }
      return selectedChat;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch chat by id");
    }
  }

  async create(chat: Omit<ChatRecordInput, 'id' | 'createdAt'>) {
    try {
      const [insertedChat] = await this.db.insert(chats).values({
        ...chat,
        createdAt: new Date(),
      }).returning();
      return insertedChat
    } catch (_error) {
      console.log(_error)
      throw new AppError("bad_request:database", "Failed to create new chat");
    }
  }

  async update(id: string, chat: Partial<Pick<ChatRecord, 'context' | 'privacy'>>) {
    try {
      const [updatedChat] = await this.db.update(chats).set(chat).where(eq(chats.id, id)).returning();
      return updatedChat
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update chat metadata");
    }
  }
}
