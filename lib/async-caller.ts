import PQueue, { type QueueAddOptions } from "p-queue";
import pRetry, { type RetryContext } from "p-retry";

const STATUS_NO_RETRY = [
  400, // Bad Request
  401, // Unauthorized
  402, // Payment Required
  403, // Forbidden
  404, // Not Found
  405, // Method Not Allowed
  406, // Not Acceptable
  407, // Proxy Authentication Required
  409, // Conflict
];

const defaultFailedAttemptHandler = ({ error }: RetryContext) => {
  if (
    error.message.startsWith("Cancel") ||
    error.message.startsWith("AbortError") ||
    error.name === "AbortError"
  ) {
    throw error;
  }
  if ((error as any)?.code === "ECONNABORTED") {
    throw error;
  }
  const status =
    (error as any)?.response?.status ?? (error as any)?.status;
  if (status && STATUS_NO_RETRY.includes(+status)) {
    throw error;
  }
  if ((error as any)?.error?.code === "insufficient_quota") {
    const err = new Error(error?.message);
    err.name = "InsufficientQuotaError";
    throw err;
  }
};

export interface AsyncCallerOptions {
  /**
   * The maximum number of concurrent calls that can be made.
   * Defaults to `Infinity`, which means no limit.
   */
  maxConcurrency?: number;
  /**
   * The maximum number of retries that can be made for a single call,
   * with an exponential backoff between each attempt. Defaults to 6.
   */
  maxRetries?: number;
  /**
   * Custom handler to handle failed attempts. Takes the originally thrown
   * error object as input, and should itself throw an error if the input
   * error is not retryable.
   */
  onFailedAttempt?: (ctx: RetryContext) => any | Promise<any>;
}

/**
 * A class that can be used to make async calls with concurrency and retry logic.
 *
 * This is useful for making calls to any kind of "expensive" external resource,
 * be it because it's rate-limited, subject to network issues, etc.
 *
 * Concurrent calls are limited by the `maxConcurrency` parameter, which defaults
 * to `Infinity`. This means that by default, all calls will be made in parallel.
 *
 * Retries are limited by the `maxRetries` parameter, which defaults to 6. This
 * means that by default, each call will be retried up to 6 times, with an
 * exponential backoff between each attempt.
 */
export class AsyncCaller {
  private readonly options: Required<AsyncCallerOptions>;
  private readonly queue: PQueue;

  constructor(options: AsyncCallerOptions = {}) {
    this.options = {
      maxConcurrency: Infinity,
      maxRetries: 3,
      onFailedAttempt: defaultFailedAttemptHandler,
      ...options,
    }
    this.queue = new PQueue({ concurrency: this.options.maxConcurrency });
  }

  async call<A extends any[], T extends (...args: A) => Promise<any>>(
    callable: T,
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> {
    return this.callWithOptions({}, callable, ...args);
  }

  callWithOptions<A extends any[], T extends (...args: A) => Promise<any>>(
    options: QueueAddOptions,
    callable: T,
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> {
    return this.queue.add(
      () =>
        pRetry(
          () =>
            callable(...args).catch((error) => {
              if (error instanceof Error) {
                throw error;
              } else {
                throw new Error(error);
              }
            }),
          {
            onFailedAttempt: this.options.onFailedAttempt,
            retries: this.options.maxRetries,
            randomize: true,
          }
        ),
      options
    );
  }

  fetch(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
    return this.call(() =>
      fetch(...args).then((res) => (res.ok ? res : Promise.reject(res)))
    );
  }
}
