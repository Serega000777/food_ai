import { randomUUID } from "node:crypto";

import {
  HttpException,
  HttpStatus,
  Catch,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";

const DEFAULT_CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMITED",
};

interface StructuredExceptionBody {
  code: string;
  message?: string;
  details?: Record<string, unknown>;
}

function isStructuredBody(body: unknown): body is StructuredExceptionBody {
  return typeof body === "object" && body !== null && "code" in body;
}

/**
 * Turns every thrown error into the API's single error envelope (docs/api/README.md,
 * `@food-ai/contracts` `errorEnvelopeSchema`) — Nest's default filter shape
 * (`{statusCode, message, error}`) is never what a client actually receives.
 * Never forwards an unexpected (non-HttpException) error's message to the client
 * (master prompt §36: "Never show raw stack traces/provider errors to user").
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("AllExceptionsFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers["x-request-id"] as string | undefined) ?? randomUUID();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let code: string;
    let message: string;
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (isStructuredBody(body)) {
        code = body.code;
        message = body.message ?? exception.message;
        details = body.details;
      } else {
        code = DEFAULT_CODE_BY_STATUS[status] ?? "ERROR";
        message = exception.message;
      }
    } else {
      code = "INTERNAL_ERROR";
      message = "Something went wrong";
      // Unlike an HttpException (an expected, deliberately-thrown rejection), this is a
      // bug or an unhandled infra failure — the client never sees it, but it must not
      // vanish silently. Nest's default error output disappears once a custom filter
      // is registered, so this filter has to log it itself.
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`[${requestId}] ${request.method} ${request.url}`, stack);
    }

    response.status(status).json({ code, message, details, requestId });
  }
}
