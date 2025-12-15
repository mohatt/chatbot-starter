import { and, desc, eq, inArray, lt, lte, sql } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { projects, chats, messages, ChatProjectRecordFile } from '../schema'
import type { ChatRecord, ChatsResult } from './chat'

export type ChatProjectRecord = typeof projects.$inferSelect;
export type ChatProjectRecordInput = Omit<typeof projects.$inferInsert, 'createdAt'>;

export type { ChatProjectRecordFile }

export interface ChatsByProjectRecord {
  project: ChatProjectRecord
  chats: ChatsResult
}

export interface ChatsByProjectResult {
  data: ChatsByProjectRecord[]
  nextCursor?: string | null
}

export class ChatProjectModel extends DbModel {
  readonly schema = projects;

  async findById(id: string): Promise<ChatProjectRecord | null> {
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

  async create(project: ChatProjectRecordInput): Promise<ChatProjectRecord> {
    try {
      const [insertedProject] = await this.db.insert(projects).values(project).returning()
      return insertedProject
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to create project')
    }
  }

  async updateById(id: string, project: Partial<Pick<ChatProjectRecordInput, 'name' | 'files' | 'prompt'>>): Promise<ChatProjectRecord> {
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

  async deleteById(id: string): Promise<ChatProjectRecord> {
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

  async findWithChats(userId: string, limit: number, chatsLimit: number, cursor?: string): Promise<ChatsByProjectResult> {
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

  async findWithChats2(
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
}
