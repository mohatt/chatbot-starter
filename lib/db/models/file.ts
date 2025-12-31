import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { files, type FileRecordMetadata } from '../schema'

export type FileRecord = typeof files.$inferSelect;
export type FileRecordInput = Omit<typeof files.$inferInsert, 'createdAt'>;

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

  async findMany(filters: { projectId: string } | { ephemeral: boolean }, limit = 50): Promise<FileRecord[]> {
    const where = 'projectId' in filters
      ? eq(files.projectId, filters.projectId)
      : and(isNull(files.projectId), isNull(files.chatId))

    try {
      const selectedFiles = await this.db
        .select()
        .from(files)
        .where(where)
        .orderBy(desc(files.id))
        .limit(limit)
      return selectedFiles
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch files')
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
}

export { FileRecordMetadata }
