import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { TableConfig, PgTable } from 'drizzle-orm/pg-core'
import type * as Schema from '../schema'

export type DbClient = NodePgDatabase<typeof Schema>

export abstract class DbModel<S extends TableConfig = any> {
  abstract readonly schema: PgTable<S>
  constructor(protected readonly db: DbClient) {}

  // Useful for transactions and unit testing
  withDb<T extends this>(this: T, db: DbClient): T {
    const Ctor = this.constructor as new (db: DbClient) => T
    return new Ctor(db)
  }
}

export interface PaginatedResult<T> {
  readonly data: T[]
  readonly nextCursor: string | null
}
