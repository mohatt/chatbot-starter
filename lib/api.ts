import type { NextRequest } from 'next/server';
import { loadEnv, type Env } from './env'
import { AI } from './ai'
import { Db, type ChatRecord, ChatProjectRecord } from './db'
import { VectorDb } from './db/vector'
import { Auth } from './auth'
import { AppError } from './errors'

export type ApiAccessType = 'read' | 'write' | 'delete'

export class Api {
  readonly env: Env
  readonly auth = {
    user: {
      id: 'e35df7ca-8c99-4821-b025-b8e1f9bf5539',
      type: 'guest'
    }
  }

  constructor(readonly request?: NextRequest) {
    this.env = loadEnv()
  }

  get ai(): AI {
    return this.set('ai', new AI(this.env))
  }

  get db(): Db {
    return this.set('db', new Db(this.env))
  }

  get vectorDb(): VectorDb {
    return this.set('vectorDb', new VectorDb(this.env))
  }

  get betterAuth(): Auth {
    return this.set('betterAuth', new Auth(this.env, this.db))
  }

  canAccessProject<T extends Pick<ChatProjectRecord, 'userId'>>(project: T | null): project is T {
    return project != null && project.userId === this.auth.user.id;
  }

  canAccessChat<T extends Pick<ChatRecord, 'userId' | 'privacy'>>(reason: ApiAccessType, chat: T | null): chat is T {
    if (chat == null) {
      return false
    }
    if (chat.userId !== this.auth.user.id) {
      return reason === 'read' && chat.privacy === 'public';
    }
    return true
  }

  private set<K extends keyof this, V extends this[K]>(key: K, value: V): V {
    Object.defineProperty(this, key, {
      get() {
        return value
      },
    })
    return value
  }
}

export interface ApiHandlerParams<T extends RouteContext<any>> {
  readonly api: Api
  readonly request: NextRequest
  readonly params: Awaited<T['params']>
}

export function createApi<T extends RouteContext<any>>(fn: (params: ApiHandlerParams<T>) => Response| Promise<Response>) {
  return async (request: NextRequest, ctx: T): Promise<Response> => {
    try {
      const api = new Api(request);
      const params = await ctx.params
      return await fn({ api, request, params })
    } catch (error) {
      if (error instanceof AppError) {
        return error.toResponse();
      }
      return new AppError('internal:api', error as Error).toResponse()
    }
  }
}
