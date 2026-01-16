import { and, desc, eq, gte, lt } from 'drizzle-orm'
import { isTextUIPart, isFileUIPart, isDataUIPart, isStaticToolUIPart, type UIMessage } from 'ai'
import { AppError } from '@/lib/errors'
import { DbModel, type PaginatedResult } from './base'
import { messages } from '../schema'

export type ChatMessageRecord = typeof messages.$inferSelect;
export type ChatMessageRecordInput = Omit<typeof messages.$inferInsert, 'createdAt'>;

export interface ChatMessageMetadata {
  modelId?: string
  createdAt: string
}

export type ChatUIMessageRecord = UIMessage<ChatMessageMetadata, Record<string, unknown>>;

export class ChatMessageModel extends DbModel {
  readonly schema = messages;

  async insertMany(chatId: string, uiMessages: UIMessage[], modelId?: string): Promise<number | null> {
    try {
      const { rowCount } = await this.db
        .insert(messages)
        .values(this.toDBMessages(chatId, modelId ?? 'assistant', uiMessages));
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

  private toDBMessages(chatId: string, modelId: string, uiMessages: UIMessage[]): ChatMessageRecordInput[] {
    return uiMessages.map(({ id, role, parts }): ChatMessageRecordInput => {
      if (role !== 'user' && role !== 'assistant') return null!
      return {
        id,
        from: role === 'user' ? 'user' : modelId,
        chatId,
        parts: parts.map((part) => {
          if (isTextUIPart(part) || isFileUIPart(part) || isDataUIPart(part) || isStaticToolUIPart(part)) {
            return part
          }
          return null!
        }).filter(Boolean)
      }
    }).filter(Boolean)
  }

  private toUIMessages(dbMessages: ChatMessageRecord[]): ChatUIMessageRecord[] {
    return dbMessages.map(({ chatId, from, createdAt, ...message }) => {
      const [role, modelId] = from === 'user' ? ['user', undefined] as const : ['assistant', from] as const
      return {
        ...message,
        role,
        metadata: {
          modelId,
          createdAt: createdAt.toISOString(),
        },
      }
    })
  }
}
