import type { BetterAuthPlugin } from 'better-auth'

const BILLING_TYPES = ['anonymous', 'user'] as const

export type BillingRecordType = typeof BILLING_TYPES[number]

export function billing() {
  return {
    id: 'billing',
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
            }
          }
        }
      },
      billing: {
        modelName: 'billing',
        disableMigration: true,
        fields: {
          type: {
            type: [...BILLING_TYPES],
            required: true,
          },
          period: {
            type: 'string',
            required: true,
            index: true,
          },
          inputUsage: {
            type: 'number',
            required: true,
            bigint: true,
            defaultValue: 0,
          },
          outputUsage: {
            type: 'number',
            required: true,
            bigint: true,
            defaultValue: 0,
          },
          updatedAt: {
            type: 'date',
            required: true,
            defaultValue: () => new Date(),
            onUpdate: () => new Date(),
          },
        },
      },
    },
  } satisfies BetterAuthPlugin
}
