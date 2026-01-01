import { and, desc, eq, lt } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel, type PaginatedResult } from './base'
import { projects } from '../schema'
import type { ChatRecord } from './chat'

export type ChatProjectRecord = typeof projects.$inferSelect;
export type ChatProjectRecordInput = Omit<typeof projects.$inferInsert, 'createdAt'>;

export interface ChatsByProjectRecord {
  project: ChatProjectRecord
  chats: PaginatedResult<ChatRecord>
}

export class ChatProjectModel extends DbModel {
  readonly schema = projects;

  async findById(id: string): Promise<ChatProjectRecord | null> {
    try {
      const [selectedProject] = await this.db.select().from(projects).where(eq(projects.id, id));
      return selectedProject ?? null;
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

  async updateByIdForUser(id: string, userId: string, project: Partial<Pick<ChatProjectRecordInput, 'name' | 'prompt'>>): Promise<ChatProjectRecord | null> {
    try {
      const [updatedProject] = await this.db
        .update(projects)
        .set(project)
        .where(and(eq(projects.id, id), eq(projects.userId, userId)))
        .returning();
      return updatedProject ?? null
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update project");
    }
  }

  async deleteById(id: string): Promise<ChatProjectRecord> {
    try {
      const [deletedProject] = await this.db.delete(projects).where(eq(projects.id, id)).returning()
      return deletedProject
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to delete project by id')
    }
  }

  async deleteMany({ userId }: { userId: string }): Promise<string[]> {
    try {
      const deleted = await this.db
        .delete(projects)
        .where(eq(projects.userId, userId))
        .returning({ id: projects.id })
      return deleted.map((row) => row.id)
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to delete user projects')
    }
  }

  async findMany({ userId }: { userId: string }, limit: number, cursor?: string): Promise<PaginatedResult<ChatProjectRecord>> {
    try {
      const rows = await this.db
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

  async findManyWithChats({ userId }: { userId: string }, limit: number, chatsLimit: number, cursor?: string): Promise<PaginatedResult<ChatsByProjectRecord>> {
    try {
      const projectRows = await this.db.query.projects.findMany({
        where: (fields, $) =>
          and(
            $.eq(fields.userId, userId),
            cursor ? $.lt(fields.id, cursor) : undefined,
          ),
        orderBy: (fields, $) => [$.desc(fields.id)],
        limit: limit + 1,
        with: {
          chats: {
            where: (fields, $) => $.eq(fields.userId, userId),
            orderBy: (fields, $) => [$.desc(fields.id)],
            limit: chatsLimit + 1,
          },
        },
      })

      const hasMoreProjects = projectRows.length > limit
      const selectedProjects = hasMoreProjects ? projectRows.slice(0, limit) : projectRows

      const data = selectedProjects.map((projectWithChats) => {
        const chatsForProject = projectWithChats.chats ?? []
        const hasMoreChats = chatsForProject.length > chatsLimit
        const chatData = hasMoreChats ? chatsForProject.slice(0, chatsLimit) : chatsForProject
        const chatCursor =
          hasMoreChats && chatData.length ? chatData[chatData.length - 1].id : null

        const { chats: _unused, ...project } = projectWithChats

        return {
          project,
          chats: {
            data: chatData,
            nextCursor: chatCursor,
          },
        }
      })

      return {
        data,
        nextCursor: hasMoreProjects && data.length ? data[data.length - 1].project.id : null,
      }
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch project chats')
    }
  }
}
