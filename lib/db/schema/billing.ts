import { relations } from "drizzle-orm";
import { pgTable, uuid, numeric, timestamp, index, integer, varchar } from 'drizzle-orm/pg-core'
import { billings } from "./auth";

export const billingPeriods = pgTable("billingPeriods", {
    id: uuid("id").primaryKey(),
    billingId: uuid("billingId")
      .notNull()
      .references(() => billings.id, { onDelete: "cascade" }),
    tier: varchar("tier", { enum: ['user', 'anonymous'] }).notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    // Usage is stored as exact decimal currency-style units (USD) to avoid float drift
    // numeric(12,6) keeps up to 6 fractional digits (e.g. 0.566680) and enough headroom
    chatUsage: numeric("chatUsage", { precision: 12, scale: 6, mode: "number" })
      .default(0)
      .notNull(),
    maxChatUsage: numeric("maxChatUsage", { precision: 12, scale: 6, mode: "number" })
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("billingPeriods_billingId_idx").on(table.billingId),
    index("billingPeriods_year_month_idx").on(table.year, table.month),
  ],
);

export const billingPeriodsRelations = relations(billingPeriods, ({ one }) => ({
  billings: one(billings, {
    fields: [billingPeriods.billingId],
    references: [billings.id],
  }),
}));
