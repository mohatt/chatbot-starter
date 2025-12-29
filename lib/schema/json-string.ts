import { z } from 'zod'

export function jsonString<T extends z.core.$ZodType>(schema: T) {
  return z.codec(z.string(), schema, {
    decode: (val, ctx) => {
      try {
        return JSON.parse(val);
      } catch (err) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: val,
          message: (err as Error).message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  })
}
