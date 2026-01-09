import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const cronJobs = pgTable("cronJobs", {
  id: varchar("id", { length: 128 }).primaryKey().notNull(),
  status: varchar("status", { enum: ["pending", "success", "error"] }).notNull(),
  lockId: uuid("lockId"),
  lockedAt: timestamp("lockedAt"),
  completedAt: timestamp("completedAt"),
  error: text("error"),
}, (self) => [
  index('cronJobs_status_idx').on(self.status),
])
