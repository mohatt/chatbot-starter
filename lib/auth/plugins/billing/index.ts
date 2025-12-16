import { getIp } from 'better-auth/api'
import { v5 as uuidv5 } from 'uuid'
import { APIError, BetterAuthPlugin, GenericEndpointContext, User } from 'better-auth'
import type { UserWithAnonymous } from 'better-auth/client/plugins'
import type { Db, BillingRecordInput } from '@/lib/db'

/**
 * Minimal Better Auth plugin that stamps every user with a deterministic
 * billing profile ID while delegating usage tracking to the application DB.
 */
export function billing(db: Db) {
  return {
    id: 'billing',
    init(auth) {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                before: async (user, ctx) => {
                  try {
                    const identity = resolveBillingIdentity(user, ctx);
                    await db.billing.ensure(identity);
                    return {
                      data: {
                        ...user,
                        billingId: identity.id,
                      },
                    };
                  } catch (error) {
                    auth.logger.error('[billing] Failed to create billing profile', error);
                    throw new APIError("BAD_REQUEST", {
                      message: "Failed to create billing profile.",
                      cause: error,
                    });
                  }
                },
              },
            },
          },
        },
      };
    },
    schema: {
      user: {
        fields: {
          billingId: {
            type: 'string',
            required: true,
            input: false,
            references: {
              model: 'billing',
              field: 'id',
              onDelete: 'no action',
            },
          },
        },
      },
      billing: {
        modelName: 'billing',
        disableMigration: true,
        fields: {
          type: {
            type: ['anonymous', 'user'],
            required: true,
          },
          createdAt: {
            type: 'date',
            required: true,
            defaultValue: () => new Date(),
          },
        },
      },
    },
  } satisfies BetterAuthPlugin
}

const EMAIL_NAMESPACE = '0a844f17-0da0-4ca0-b9a7-e5d78fdc9009'
const IP_NAMESPACE = '5c327e7d-67cb-482a-9a34-1cb5fb274861'

/**
 * Extract client IP from hook context using Better Auth helpers. Anonymous
 * signups rely on IP to derive a stable billing profile.
 */
function resolveIpAddress(ctx: GenericEndpointContext | null) {
  if (!ctx) return null;
  const requestOrHeaders = ctx.request ?? ctx.headers;
  const options = ctx.context?.options;
  if (!requestOrHeaders || !options) return null;
  try {
    return getIp(requestOrHeaders, options) || null;
  } catch {
    return null;
  }
}

/**
 * Derive a deterministic billing identity for the new user:
 *  - anonymous users hash IP (with email fallback)
 *  - registered users hash email
 * Using UUIDv5 avoids collisions and keeps IDs stable across devices.
 */
function resolveBillingIdentity(user: User | UserWithAnonymous, ctx: GenericEndpointContext | null): BillingRecordInput {
  const email = user.email.toLowerCase()
  const isAnonymous = 'isAnonymous' in user ? user.isAnonymous : false;
  const ipAddress = resolveIpAddress(ctx);

  if (isAnonymous) {
    const fingerprint = ipAddress ?? email;
    return {
      id: uuidv5(fingerprint, IP_NAMESPACE),
      type: 'anonymous',
    };
  }

  return {
    id: uuidv5(email, EMAIL_NAMESPACE),
    type: 'user',
  };
}
