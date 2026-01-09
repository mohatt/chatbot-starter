import { jsonb, pgTable, timestamp, varchar, index, primaryKey } from 'drizzle-orm/pg-core'

export const configs = pgTable("configs", {
  key: varchar("key", { length: 128 }).notNull(),
  group: varchar("group", { length: 128 }).notNull(),
  value: jsonb("value").$type<unknown>(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (self) => [
  primaryKey({ columns: [self.group, self.key] }),
  index('configs_group_idx').on(self.group)
])
