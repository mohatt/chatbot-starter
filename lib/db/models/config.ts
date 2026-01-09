import { and, eq } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'
import { configs } from '../schema'

export type ConfigRecord<V> = typeof configs.$inferSelect & { value: V | null };
export type ConfigRecordInput<V> = Omit<typeof configs.$inferInsert, 'updatedAt'> & { value: V | null };

export class ConfigModel extends DbModel {
  readonly schema = configs;

  async upsert<V>(input: ConfigRecordInput<V>) {
    try {
      const [row] = await this.db
        .insert(configs)
        .values(input)
        .onConflictDoUpdate({
          target: [configs.group, configs.key],
          set: {
            value: input.value,
            updatedAt: new Date(),
          },
        })
        .returning()
      return row as ConfigRecord<V>
    } catch (_error) {
      throw new AppError('bad_request:database', 'Failed to upsert config')
    }
  }

  async findByKey<V>(group: string, key: string) {
    try {
      const [selectedRow] = await this.db
        .select()
        .from(configs)
        .where(and(eq(configs.group, group), eq(configs.key, key)));
      return (selectedRow ?? null) as ConfigRecord<V> | null;
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch config by group/key");
    }
  }

  async findByGroup<V>(group: string) {
    try {
      const rows = await this.db
        .select()
        .from(configs)
        .where(eq(configs.group, group));
      return rows as ConfigRecord<V>[];
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to fetch configs by group");
    }
  }
}
