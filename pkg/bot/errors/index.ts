// Application error base class
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: Array<{field: string; message: string}>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

// 400 Validation Error
export class ValidationError extends AppError {
  constructor(message: string, details?: Array<{field: string; message: string}>) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}
