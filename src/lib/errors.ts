/** Base application error with optional HTTP semantics. */
export class AppError extends Error {
  public code?: string;
  public details?: unknown;
  constructor(message: string, opts?: { code?: string; details?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.code = opts?.code;
    this.details = opts?.details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** HTTP-friendly error that your controllers can throw. */
export class HttpError extends AppError {
  public status: number;
  constructor(status: number, message: string, opts?: { code?: string; details?: unknown }) {
    super(message, opts);
    this.status = status;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', opts?: { code?: string; details?: unknown }) {
    super(400, message, opts);
  }
}
export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', opts?: { code?: string; details?: unknown }) {
    super(401, message, opts);
  }
}
export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', opts?: { code?: string; details?: unknown }) {
    super(403, message, opts);
  }
}
export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', opts?: { code?: string; details?: unknown }) {
    super(404, message, opts);
  }
}
export class ConflictError extends HttpError {
  constructor(message = 'Conflict', opts?: { code?: string; details?: unknown }) {
    super(409, message, opts);
  }
}
export class InternalServerError extends HttpError {
  constructor(message = 'Internal Server Error', opts?: { code?: string; details?: unknown }) {
    super(500, message, opts);
  }
}
