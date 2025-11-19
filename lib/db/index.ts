import { UserModel, ChatModel } from './models'
import { drizzle } from 'drizzle-orm/node-postgres'

export class Db {
  client = drizzle(process.env.POSTGRES_URL!);
  users = new UserModel(this.client)
  chats = new ChatModel(this.client)
}

export const db = new Db();

export type * from './models';
