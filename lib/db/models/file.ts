import { and, desc, eq } from 'drizzle-orm'
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
      const [selectedFile] = await this.db.select().from(files).where(eq(files.id, id));
      if (!selectedFile) {
        return null;
      }
      return selectedFile;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch file by id");
    }
  }

  async findByProject({ projectId }: { projectId: string }): Promise<FileRecord[]> {
    try {
      const rows = await this.db
        .select()
        .from(files)
        .where(and(eq(files.projectId, projectId)))
        .orderBy(desc(files.id))
        .limit(50)
      return rows
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to fetch project files')
    }
  }

  async deleteByIdForUser(id: string, userId: string): Promise<FileRecord | undefined> {
    try {
      const [deletedFile] = await this.db
        .delete(files)
        .where(and(eq(files.id, id), eq(files.userId, userId)))
        .returning();
      return deletedFile;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to delete user file by id");
    }
  }
}

export { FileRecordMetadata }
