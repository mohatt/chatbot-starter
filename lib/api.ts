import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { loadEnv, type Env } from './env'
import { AI } from './ai'
import { Db } from './db'
import { VectorDb } from './db/vector'
import { Auth, type AuthSession } from './auth'
import { Authorizer } from './authz'
import { Billing } from './billing'
import { Storage } from './storage'
import { Mailer } from './mailer'
import { AppError, type RouteNamespace } from './errors'

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
    return this.set('auth', new Auth(this.env, this.db, this.mailer))
  }

  get authz(): Authorizer {
    return this.set('authz', new Authorizer())
  }

  get billing(): Billing {
    return this.set('billing', new Billing(this.db))
  }

  get storage(): Storage {
    return this.set('storage', new Storage(this.env))
  }

  get mailer(): Mailer {
    return this.set('mailer', new Mailer(this.env))
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
    return (this.instance ??= new Api())
  }
}

export interface ApiHandlerParams<T extends RouteContext<any>> {
  readonly api: Api
  readonly request: NextRequest
  readonly params: Awaited<T['params']>
  session(): Promise<AuthSession>
  session(mode: 'optional'): Promise<AuthSession | null>
}

export interface ApiHandlerOptions {
  namespace?: RouteNamespace
}

export function createApiHandler<T extends RouteContext<any>>(
  fn: (params: ApiHandlerParams<T>) => Response | Promise<Response>,
  options?: ApiHandlerOptions,
) {
  const ns = options?.namespace ?? 'api'
  return async (request: NextRequest, ctx: T): Promise<Response> => {
    try {
      const api = Api.getInstance()
      const params = await ctx.params
      return await fn({
        api,
        request,
        params,
        session: async (mode?: 'optional') => {
          const session = await api.auth.getSession(request)
          if (!session && mode !== 'optional') {
            throw new AppError(`unauthorized:${ns}`)
          }
          return session as AuthSession
        },
      })
    } catch (error) {
      if (error instanceof AppError) {
        return error.toResponse()
      }
      if (error instanceof z.ZodError) {
        const firstIssue = error.issues[0]
        return new AppError(`bad_request:${ns}`, firstIssue.message).toResponse()
      }
      return new AppError(`internal:${ns}`, error as Error).toResponse()
    }
  }
}
