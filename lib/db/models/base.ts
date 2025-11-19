import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { TableConfig, PgTable } from 'drizzle-orm/pg-core'

export abstract class DbModel<S extends TableConfig = any> {
  abstract readonly schema: PgTable<S>;
  constructor(protected readonly db: NodePgDatabase) {}
}
