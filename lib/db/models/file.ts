import { and, or, asc, eq, inArray, isNull, lt, count } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel, type PaginatedResult } from './base'
import { files, type FileRecordMetadata } from '../schema'

export type FileRecord = typeof files.$inferSelect;
export type FileRecordInput = Omit<typeof files.$inferInsert, 'createdAt'> & { userId: string };

export class FileModel extends DbModel {
  readonly schema = files;

  async create(file: FileRecordInput): Promise<FileRecord> {
    try {
      const [insertedFile] = await this.db.insert(files).values(file).returning();
      return insertedFile
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to create new file");
    }
  }

  async findById(id: string): Promise<FileRecord | null> {
    try {
      const [selectedFile] = await this.db
        .select()
        .from(files)
        .where(eq(files.id, id));
      return selectedFile ?? null;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch file by id");
    }
  }

  async findMany(filters: { projectId: string } | { orphan: boolean }, limit = 50, cursor?: string | null): Promise<PaginatedResult<FileRecord>> {
    const where = 'projectId' in filters
      ? eq(files.projectId, filters.projectId)
      : or(isNull(files.userId), and(isNull(files.projectId), isNull(files.chatId)))

    try {
      const rows = await this.db
        .select()
        .from(files)
        .where(and(where, cursor != null ? lt(files.id, cursor) : undefined))
        .orderBy(asc(files.id))
        .limit(limit + 1)
      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows
      return {
        data,
        nextCursor: hasMore ? data[data.length - 1].id : null,
      }
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch files')
    }
  }

  async countMany(filters: { projectId: string } | { orphan: boolean }): Promise<number> {
    const where = 'projectId' in filters
      ? eq(files.projectId, filters.projectId)
      : or(isNull(files.userId), and(isNull(files.projectId), isNull(files.chatId)))
    try {
      const [result] = await this.db
        .select({ value: count() })
        .from(files)
        .where(where)
      return result.value
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to count files')
    }
  }

  async updateByIdsForUser(ids: string[], userId: string, values: Pick<FileRecordInput, 'chatId'>): Promise<FileRecord[]> {
    try {
      const updatedFiles = await this.db
        .update(files)
        .set(values)
        .where(and(inArray(files.id, ids), eq(files.userId, userId)))
        .returning();
      return updatedFiles;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to update ephemeral files for user");
    }
  }

  async deleteByIdForUser(id: string, userId: string): Promise<FileRecord | null> {
    try {
      const [deletedFile] = await this.db
        .delete(files)
        .where(and(eq(files.id, id), eq(files.userId, userId)))
        .returning();
      return deletedFile ?? null;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to delete user file by id");
    }
  }

  async deleteByIds(ids: string[]): Promise<string[]> {
    try {
      const deletedRows = await this.db
        .delete(files)
        .where(inArray(files.id, ids))
        .returning({ id: files.id })
      return deletedRows.map((row) => row.id)
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to batch delete files by ids");
    }
  }
}

export { FileRecordMetadata }
