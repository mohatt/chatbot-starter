import { and, desc, eq, inArray, lt, lte, sql } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { projects, chats, ChatProjectRecordFile } from '../schema'
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

  async findManyWithChats({ userId }: { userId: string }, limit: number, chatsLimit: number, cursor?: string): Promise<ChatsByProjectResult> {
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
