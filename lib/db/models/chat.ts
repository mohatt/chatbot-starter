import { TextUIPart, FileUIPart, DataUIPart, UIMessage, isTextUIPart, isFileUIPart, isDataUIPart } from 'ai'
import { json, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { and, desc, eq, gte, lt } from 'drizzle-orm'
import type { FileLoaderInput } from '@/lib/document'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { users } from './user'

export type ChatRecordContextFile = Omit<FileLoaderInput, 'blob'> & {
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
  context: jsonb("context").notNull().$type<ChatRecordContext>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatRecord = typeof chats.$inferSelect;
export type ChatRecordInput = Omit<typeof chats.$inferInsert, 'createdAt'>;

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chats.id),
  role: varchar("role").notNull().$type<'user' | 'assistant'>(),
  parts: json("parts").notNull().$type<Array<TextUIPart | FileUIPart | DataUIPart<any>>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessageRecord = typeof messages.$inferSelect;
export type ChatMessageRecordInput = Omit<typeof messages.$inferInsert, 'createdAt'>;
export interface ChatMessageMetadata {
  createdAt: string
}
export interface ChatMessagesResult {
  data: UIMessage<ChatMessageMetadata, Record<string, unknown>, {}>[]
  nextCursor?: string | null
}

export class ChatModel extends DbModel {
  schema = chats;

  async getById(id: string): Promise<ChatRecord | null> {
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

  async create(chat: ChatRecordInput): Promise<ChatRecord> {
    try {
      const [insertedChat] = await this.db.insert(chats).values(chat).returning();
      return insertedChat
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to create new chat");
    }
  }

  async update(id: string, chat: Partial<Pick<ChatRecordInput, 'context' | 'privacy'>>): Promise<ChatRecord> {
    try {
      const [updatedChat] = await this.db.update(chats).set(chat).where(eq(chats.id, id)).returning();
      return updatedChat
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update chat metadata");
    }
  }

  async delete(id: string): Promise<ChatRecord> {
    try {
      await this.db.delete(messages).where(eq(messages.chatId, id));
      const [deletedChat] = await this.db
        .delete(chats)
        .where(eq(chats.id, id))
        .returning();
      return deletedChat;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to delete chat by id");
    }
  }

  async insertMessages(chatId: string, uiMessages: UIMessage[]): Promise<number | null> {
    try {
      const { rowCount } = await this.db.insert(messages).values(this.toDBMessages(chatId, uiMessages));
      return rowCount
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to save chat messages");
    }
  }

  async getMessages(chatId: string, limit: number, cursor?: string): Promise<ChatMessagesResult> {
    try {
      const data = await this.db.select()
        .from(messages)
        .where(and(
          eq(messages.chatId, chatId),
          cursor ? lt(messages.id, cursor) : undefined
        ))
        .limit(limit)
        .orderBy(desc(messages.id));
      data.reverse();
      return {
        data: this.toUIMessages(data).reverse(),
        nextCursor: data.length === limit ? data[0].id : null
      }
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to get chat messages by chat id");
    }
  }

  async deleteMessagesAfter(chatId: string, afterId: string): Promise<number | null> {
    try {
      const { rowCount } = await this.db.delete(messages).where(
        and(
          eq(messages.chatId, chatId),
          gte(messages.id, afterId)
        )
      );
      return rowCount
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to delete messages by chat id after id");
    }
  }

  private toDBMessages(chatId: string, uiMessages: UIMessage[]): ChatMessageRecordInput[] {
    return uiMessages.map(({ id, role, parts }): ChatMessageRecordInput => {
      if (role !== 'user' && role !== 'assistant') return null!
      return {
        id,
        role,
        chatId,
        parts: parts.map((part) => {
          if (isDataUIPart(part)) {
            return part
          }
          if (isFileUIPart(part)) {
            const { providerMetadata, ...filePart } = part;
            return filePart
          }
          if (isTextUIPart(part)) {
            const { state, providerMetadata, ...textPart } = part;
            return textPart
          }
          return null!
        }).filter(Boolean)
      }
    }).filter(Boolean)
  }

  private toUIMessages(dbMessages: ChatMessageRecord[]): ChatMessagesResult['data'] {
    return dbMessages.map(({ chatId, createdAt, ...message }) => ({ ...message, metadata: { createdAt: createdAt.toISOString() } }))
  }
}
