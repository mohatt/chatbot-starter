import { and, desc, eq, lt, isNull } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { chats, messages } from '../schema'

export type ChatRecord = typeof chats.$inferSelect;
export type ChatRecordInput = Omit<typeof chats.$inferInsert, 'createdAt'>;

export interface ChatsResult {
  data: ChatRecord[]
  nextCursor?: string | null
}

export class ChatModel extends DbModel {
  readonly schema = chats;

  async findById(id: string): Promise<ChatRecord | null> {
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

  async updateByIdForUser(id: string, userId: string, chat: Partial<Pick<ChatRecordInput, 'title' | 'privacy'>>): Promise<ChatRecord> {
    try {
      const [updatedChat] = await this.db.update(chats).set(chat).where(
        and(eq(chats.id, id), eq(chats.userId, userId))
      ).returning();
      return updatedChat
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update chat metadata");
    }
  }

  async deleteById(id: string): Promise<ChatRecord> {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.delete(messages).where(eq(messages.chatId, id));
        const [deletedChat] = await tx
          .delete(chats)
          .where(eq(chats.id, id))
          .returning();
        return deletedChat;
      })
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to delete chat by id");
    }
  }

  async findByUser(userId: string, limit: number, cursor?: string): Promise<ChatsResult> {
    try {
      const rows = await this.db
        .select()
        .from(chats)
        .where(
          and(
            eq(chats.userId, userId),
            isNull(chats.projectId),
            cursor ? lt(chats.id, cursor) : undefined,
          ),
        )
        .orderBy(desc(chats.id))
        .limit(limit + 1)
      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows
      return {
        data,
        nextCursor: hasMore ? data[data.length - 1].id : null,
      }
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch chats')
    }
  }
}
