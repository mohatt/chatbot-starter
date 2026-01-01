import { and, desc, eq, gte, lt } from 'drizzle-orm'
import { isTextUIPart, isFileUIPart, isDataUIPart, type UIMessage } from 'ai'
import { AppError } from '@/lib/errors'
import { DbModel, type PaginatedResult } from './base'
import { messages } from '../schema'

export type ChatMessageRecord = typeof messages.$inferSelect;
export type ChatMessageRecordInput = Omit<typeof messages.$inferInsert, 'createdAt'>;

export interface ChatMessageMetadata {
  createdAt: string
}

export type ChatUIMessageRecord = UIMessage<ChatMessageMetadata, Record<string, unknown>, {}>;

export class ChatMessageModel extends DbModel {
  readonly schema = messages;

  async insertMany(chatId: string, uiMessages: UIMessage[]): Promise<number | null> {
    try {
      const { rowCount } = await this.db.insert(messages).values(this.toDBMessages(chatId, uiMessages));
      return rowCount
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to save chat messages");
    }
  }

  async findMany(chatId: string, limit: number, cursor?: string): Promise<PaginatedResult<ChatUIMessageRecord>> {
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
        data: this.toUIMessages(data),
        nextCursor: data.length === limit ? data[0].id : null
      }
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to get chat messages by chat id");
    }
  }

  async deleteMany(chatId: string, afterId?: string): Promise<number | null> {
    try {
      const { rowCount } = await this.db.delete(messages).where(
        and(
          eq(messages.chatId, chatId),
          afterId ? gte(messages.id, afterId) : undefined
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

  private toUIMessages(dbMessages: ChatMessageRecord[]): ChatUIMessageRecord[] {
    return dbMessages.map(({ chatId, createdAt, ...message }) => ({ ...message, metadata: { createdAt: createdAt.toISOString() } }))
  }
}
