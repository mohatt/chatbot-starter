import type { ChatRecord, ChatProjectRecord, FileRecord } from './db'
import type { AuthUser } from './auth'

type AuthzResourceMap = {
  chat: Pick<ChatRecord, 'userId' | 'privacy'>
  project: Pick<ChatProjectRecord, 'userId'>
  file: Pick<FileRecord, 'userId'>
}

type AuthzType = 'read' | 'write' | 'delete'
type AuthzResourceType = keyof AuthzResourceMap
type AuthzUser = Pick<AuthUser, 'id'>

type AuthzPolicy<T> = (args: {
  user: AuthzUser | null
  action: AuthzType
  resource: T | null
}) => boolean
type AuthzPolicyMap = {
  [K in AuthzResourceType]: AuthzPolicy<AuthzResourceMap[K]>
}

export class Authorizer {
  readonly policies: AuthzPolicyMap

  constructor() {
    this.policies = {
      chat: ({ user, action, resource }) => {
        if (resource == null || user == null) {
          return false
        }
        if (user.id !== resource.userId) {
          return action === 'read' && resource.privacy === 'public'
        }
        return true
      },
      project: ({ user, resource }) => {
        return user != null && resource != null && user.id === resource.userId
      },
      file: ({ user, resource }) => {
        return user != null && resource != null && user.id === resource.userId
      },
    }
  }

  can<T extends AuthzType, R extends AuthzResourceType, E extends AuthzResourceMap[R]>(
    user: AuthzUser | null,
    operation: `${T}:${R}`,
    resource: E | null,
  ): resource is E {
    const [action, resourceType] = operation.split(':') as [T, R]
    return this.policies[resourceType]({ user, action, resource })
  }
}
