import { TextUIPart, FileUIPart, DataUIPart, UIMessage, isTextUIPart, isFileUIPart, isDataUIPart } from 'ai'
import { index, json, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { and, desc, eq, gte, inArray, lt, lte, isNull, sql } from 'drizzle-orm'
import type { FileLoaderInput } from '@/lib/document'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { users } from './auth'

export type ChatProjectRecordFile = Omit<FileLoaderInput, 'blob'> & {
  vectors: number;
  tokens: number;
}

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id),
  files: jsonb("files").array().notNull().$type<ChatProjectRecordFile[]>(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (self) => [
  // Listing projects for a user (sidebar)
  index('projects_user_id_idx').on(self.userId, self.id.desc()),
])

export type ChatProjectRecord = typeof projects.$inferSelect;
export type ChatProjectRecordInput = Omit<typeof projects.$inferInsert, 'createdAt'>;

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id),
  projectId: uuid("projectId")
    .references(() => projects.id),
  privacy: varchar("privacy", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
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

export type ChatRecord = typeof chats.$inferSelect;
export type ChatRecordInput = Omit<typeof chats.$inferInsert, 'createdAt'>;

export interface ChatsResult {
  data: ChatRecord[]
  nextCursor?: string | null
}

export interface ChatsByProjectRecord {
  project: ChatProjectRecord
  chats: ChatsResult
}

export interface ChatsByProjectResult {
  data: ChatsByProjectRecord[]
  nextCursor?: string | null
}

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chats.id),
  role: varchar("role").notNull().$type<'user' | 'assistant'>(),
  parts: json("parts").notNull().$type<Array<TextUIPart | FileUIPart | DataUIPart<any>>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (self) => [
  index('messages_chat_id_idx').on(self.chatId, self.id.desc()),
]);

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

  async update(id: string, userId: string, chat: Partial<Pick<ChatRecordInput, 'title' | 'privacy'>>): Promise<ChatRecord> {
    try {
      const [updatedChat] = await this.db.update(chats).set(chat).where(
        and(eq(chats.id, id), eq(chats.userId, userId))
      ).returning();
      return updatedChat
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update chat metadata");
    }
  }

  async delete(id: string): Promise<ChatRecord> {
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

  async getChats(userId: string, limit: number, cursor?: string): Promise<ChatsResult> {
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

  async getProjectById(id: string): Promise<ChatProjectRecord | null> {
    try {
      const [selectedProject] = await this.db.select().from(projects).where(eq(projects.id, id));
      if (!selectedProject) {
        return null;
      }
      return selectedProject;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch project by id");
    }
  }

  async createProject(project: ChatProjectRecordInput): Promise<ChatProjectRecord> {
    try {
      const [insertedProject] = await this.db.insert(projects).values(project).returning()
      return insertedProject
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to create project')
    }
  }

  async updateProject(id: string, project: Partial<Pick<ChatProjectRecordInput, 'name' | 'files' | 'prompt'>>): Promise<ChatProjectRecord> {
    try {
      const [updatedProject] = await this.db
        .update(projects)
        .set(project)
        .where(eq(projects.id, id))
        .returning()
      return updatedProject
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to update project')
    }
  }

  async deleteProject(id: string): Promise<ChatProjectRecord> {
    try {
      return await this.db.transaction(async (tx) => {
        const chatsForProject = await tx
          .select({ id: chats.id })
          .from(chats)
          .where(eq(chats.projectId, id))

        if (chatsForProject.length) {
          const chatIds = chatsForProject.map(({ id }) => id)
          await tx.delete(messages).where(inArray(messages.chatId, chatIds))
          await tx.delete(chats).where(inArray(chats.id, chatIds))
        }

        const [deletedProject] = await tx.delete(projects).where(eq(projects.id, id)).returning()
        return deletedProject
      })
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to delete project by id')
    }
  }

  async getProjectsWithChats(userId: string, limit: number, chatsLimit: number, cursor?: string): Promise<ChatsByProjectResult> {
    try {
      const projectRows = await this.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.userId, userId),
            cursor ? lt(projects.id, cursor) : undefined,
          ),
        )
        .orderBy(desc(projects.id))
        .limit(limit + 1)

      const hasMoreProjects = projectRows.length > limit
      const selectedProjects = hasMoreProjects ? projectRows.slice(0, limit) : projectRows

      if (!selectedProjects.length) {
        return {
          data: [],
          nextCursor: null,
        }
      }

      const projectIds = selectedProjects.map(({ id }) => id)

      const rankedChats = this.db.$with('ranked_chats').as(
        this.db
          .select({
            id: chats.id,
            title: chats.title,
            userId: chats.userId,
            projectId: chats.projectId,
            privacy: chats.privacy,
            createdAt: chats.createdAt,
            rowNumber: sql<number>`row_number() over (partition by ${chats.projectId} order by ${chats.id} desc)`,
          })
          .from(chats)
          .where(
            and(
              eq(chats.userId, userId),
              inArray(chats.projectId, projectIds),
            ),
          ),
      )

      const projectChatsRows = await this.db
        .with(rankedChats)
        .select()
        .from(rankedChats)
        .where(lte(rankedChats.rowNumber, chatsLimit + 1))
        .orderBy(desc(rankedChats.id))

      const groupedChats = new Map<string, { data: ChatRecord[]; hasMore: boolean }>()

      for (const row of projectChatsRows) {
        if (!row.projectId) continue
        const { rowNumber, ...chatRecord } = row
        const entry = groupedChats.get(row.projectId) ?? { data: [], hasMore: false }
        if (entry.data.length < chatsLimit) {
          entry.data.push(chatRecord)
        }
        if (rowNumber > chatsLimit) {
          entry.hasMore = true
        }
        groupedChats.set(row.projectId, entry)
      }

      return {
        data: selectedProjects.map((project) => {
          const chatsForProject = groupedChats.get(project.id) ?? { data: [], hasMore: false }
          const chatData = chatsForProject.data
          return {
            project,
            chats: {
              data: chatData,
              nextCursor: chatsForProject.hasMore
                ? chatData.length ? chatData[chatData.length - 1].id : null
                : null,
            },
          }
        }),
        nextCursor: hasMoreProjects ? selectedProjects[selectedProjects.length - 1].id : null,
      }
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch project chats')
    }
  }

  async getProjectsWithChats2(
    userId: string,
    limit: number,
    chatsLimit: number,
    cursor?: string,
  ): Promise<ChatsByProjectResult> {
    try {
      // 1) Page projects first in a subquery (IMPORTANT: prevents join row-multiplication from breaking paging)
      const p = this.db
        .select()
        .from(projects)
        .where(and(eq(projects.userId, userId), cursor ? lt(projects.id, cursor) : undefined))
        .orderBy(desc(projects.id))
        .limit(limit + 1)
        .as('p')

      // 2) Per-project chats, limited to (N+1) so we can compute nextCursor
      //    Since this is LATERAL, it can reference p.id
      const c = this.db
        .select()
        .from(chats)
        .where(and(eq(chats.userId, userId), eq(chats.projectId, p.id)))
        .orderBy(desc(chats.id))
        .limit(chatsLimit + 1)
        .as('c')

      // 3) One round-trip
      const rows = await this.db
        .select()
        .from(p)
        .leftJoinLateral(c, sql`true`)
        .orderBy(desc(p.id), desc(c.id))

      // 4) Group + compute cursors
      const byProject = new Map<string, ChatsByProjectRecord>()
      const projectOrder: string[] = []
      let hasMoreProjects = false

      for (const row of rows) {
        const project = row.p // full ChatProjectRecord
        const chat = row.c // full ChatRecord | null

        let group = byProject.get(project.id)

        if (!group) {
          if (projectOrder.length >= limit) {
            hasMoreProjects = true
            continue
          }

          projectOrder.push(project.id)

          group = {
            project,
            chats: {
              data: [],
              nextCursor: null,
            },
          }
          byProject.set(project.id, group)
        }

        if (!chat) continue

        const page = group.chats

        // We fetched N+1 chats; keep first N and use the extra row to set nextCursor.
        if (page.data.length < chatsLimit) {
          page.data.push(chat)
        } else if (!page.nextCursor) {
          page.nextCursor = page.data[page.data.length - 1]?.id ?? null
        }
      }

      const data = projectOrder.map((id) => byProject.get(id)!).filter(Boolean)

      return {
        data,
        nextCursor: hasMoreProjects && data.length ? data[data.length - 1].project.id : null,
      }
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch project chats')
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
        data: this.toUIMessages(data),
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
