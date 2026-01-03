export type ErrorType =
  | "internal"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "offline";

export type ErrorNamespace =
  | "project"
  | "chat"
  | "file"
  | "api"
  | "database";

export type ErrorCode = `${ErrorType}:${ErrorNamespace}`;

export type ErrorVisibility = "response" | "log" | "none";

export const visibilityByNamespace: Record<ErrorNamespace, ErrorVisibility> = {
  database: "log",
  project: "response",
  chat: "response",
  file: "response",
  api: "response",
};

export class AppError extends Error {
  type: ErrorType;
  cause?: Error | string;
  namespace: ErrorNamespace;
  statusCode: number;

  constructor(errorCode: ErrorCode, cause?: Error | string) {
    super();

    const [type, namespace] = errorCode.split(":");

    this.type = type as ErrorType;
    this.cause = cause;
    this.namespace = namespace as ErrorNamespace;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  toResponse() {
    const code: ErrorCode = `${this.type}:${this.namespace}`;
    const visibility = visibilityByNamespace[this.namespace];

    const { message, cause, statusCode } = this;

    if (this.type === "internal" || visibility === "log") {
      console.error({ code, message, cause });

      return Response.json(
        { code, message: "Something went wrong. Please try again later." },
        { status: statusCode }
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  if (errorCode.includes("database")) {
    return "An error occurred while executing a database query.";
  }

  switch (errorCode) {
    case "bad_request:api":
      return "The request couldn't be processed. Please check your input and try again.";

    case "rate_limit:chat":
      return "You have exceeded your maximum number of messages for the day. Please try again later.";
    case "not_found:chat":
      return "The requested chat was not found. Please check the chat ID and try again.";
    case "forbidden:chat":
      return "This chat belongs to another user. Please check the chat ID and try again.";
    case "unauthorized:chat":
      return "You need to sign in to view this chat. Please sign in and try again.";
    case "offline:chat":
      return "We're having trouble sending your message. Please check your internet connection and try again.";
    case "bad_request:chat":
      return "The request to update the chat was invalid. Please check your input and try again.";

    case "not_found:project":
      return "The requested project was not found. Please check the project ID and try again.";
    case "bad_request:project":
      return "The request to update the project was invalid. Please check your input and try again.";

    case "not_found:api":
      return "The requested api resource was not found.";

    default:
      return "Something went wrong. Please try again later.";
  }
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case "internal":
      return 500;
    case "bad_request":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "rate_limit":
      return 429;
    case "offline":
      return 503;
    default:
      return 500;
  }
}
