import { and, desc, eq, gte, lt } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel, type PaginatedResult } from './base'
import { messages } from '../schema'
import type { ChatMessage } from '@/lib/ai'

export type ChatMessageRecord = typeof messages.$inferSelect;
export type ChatMessageRecordInput = Omit<typeof messages.$inferInsert, 'createdAt'>;

export class ChatMessageModel extends DbModel {
  readonly schema = messages;

  async insertMany(chatId: string, uiMessages: ChatMessage[]): Promise<number | null> {
    try {
      const { rowCount } = await this.db
        .insert(messages)
        .values(this.toDBMessages(chatId, uiMessages));
      return rowCount
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to save chat messages");
    }
  }

  async findMany(chatId: string, limit: number, cursor?: string): Promise<PaginatedResult<ChatMessage>> {
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

  private toDBMessages(chatId: string, uiMessages: ChatMessage[]) {
    return uiMessages.map(({ id, role, parts, metadata = {} }): ChatMessageRecordInput => {
      if (role !== 'user' && role !== 'assistant') return null!
      return {
        id,
        role,
        chatId,
        parts,
        metadata,
      }
    }).filter(Boolean)
  }

  private toUIMessages(dbMessages: ChatMessageRecord[]): ChatMessage[] {
    return dbMessages.map(({ id, role, parts, metadata }): ChatMessage => {
      return {
        id,
        role,
        parts,
        metadata,
      }
    })
  }
}
