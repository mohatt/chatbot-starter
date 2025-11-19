import { randomBytes, pbkdf2Sync } from "crypto";
import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { eq } from 'drizzle-orm'
import { AppError } from '@/lib/errors'
import { DbModel } from './base'

export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull().unique(),
  password: varchar("password", { length: 64 }),
  isAnonymous: boolean("isAnonymous").notNull(),
  createdAt: timestamp("createdAt").notNull(),
  signedAt: timestamp("signedAt").notNull(),
});

export type UserRecord = typeof users.$inferSelect;
export type UserRecordInput = typeof users.$inferInsert;

export class UserModel extends DbModel {
  schema = users;

  async create(user: Pick<UserRecord, 'email' | 'password'>) {
    const hashedPassword = this.hashPassword(user.password);

    try {
      return await this.db.insert(users).values({
        email: user.email,
        password: hashedPassword,
        isAnonymous: false,
        createdAt: new Date(),
        signedAt: new Date(),
      });
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to create user");
    }
  }

  async createGuest() {
    try {
      return await this.db.insert(users).values({
        email: `${Date.now()}@guest`,
        isAnonymous: true,
        createdAt: new Date(),
        signedAt: new Date(),
      });
    } catch (_error) {
      throw new AppError("bad_request:database", "Failed to create user");
    }
  }

  async getByEmail(email: string): Promise<UserRecord[]> {
    try {
      return await this.db.select().from(users).where(eq(users.email, email));
    } catch (_error) {
      throw new AppError(
        "bad_request:database",
        "Failed to get user by email"
      );
    }
  }

  verifyPassword(password: string, stored: string) {
    const [salt, originalHash] = stored.split(":");
    const hash = pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
    return hash === originalHash;
  }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
    return `${salt}:${hash}`;
  }
}
