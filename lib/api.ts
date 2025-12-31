import type { NextRequest } from 'next/server';
import { loadEnv, type Env } from './env'
import { AI } from './ai'
import { Db } from './db'
import { VectorDb } from './db/vector'
import { Auth, type AuthSession } from './auth'
import { Authorizer } from './authz'
import { Storage } from './storage'
import { AppError } from './errors'

export class Api {
  private static instance?: Api
  readonly env: Env

  private constructor() {
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

  get auth(): Auth {
    return this.set('auth', new Auth(this.db, this.env))
  }

  get authz(): Authorizer {
    return this.set('authz', new Authorizer())
  }

  get storage(): Storage {
    return this.set('storage', new Storage(this.env))
  }

  private set<K extends keyof this, V extends this[K]>(key: K, value: V): V {
    Object.defineProperty(this, key, {
      get() {
        return value
      },
    })
    return value
  }

  static getInstance() {
    return this.instance ??= new Api()
  }
}

export interface ApiHandlerParams<T extends RouteContext<any>> {
  readonly api: Api
  readonly request: NextRequest
  readonly params: Awaited<T['params']>
  session(): Promise<AuthSession>
  session(mode: 'optional'): Promise<AuthSession | null>
}

export function createApiHandler<T extends RouteContext<any>>(fn: (params: ApiHandlerParams<T>) => Response| Promise<Response>) {
  return async (request: NextRequest, ctx: T): Promise<Response> => {
    try {
      const api = Api.getInstance();
      const params = await ctx.params
      return await fn({
        api,
        request,
        params,
        session: async (mode?: 'optional') => {
          const session = await api.auth.getSession(request)
          if (!session && mode !== 'optional') {
            throw new AppError('unauthorized:api')
          }
          return session as AuthSession
        }
      })
    } catch (error) {
      if (error instanceof AppError) {
        return error.toResponse();
      }
      return new AppError('internal:api', error as Error).toResponse()
    }
  }
}
