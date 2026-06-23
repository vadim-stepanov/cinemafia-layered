import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, error, message } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(`${request.method} ${request.url}`, this.stack(exception));
    }

    const body: ErrorBody = {
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): Pick<ErrorBody, "statusCode" | "error" | "message"> {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === "string") {
        return { statusCode, error: exception.name, message: payload };
      }
      const record = payload as Record<string, unknown>;
      return {
        statusCode,
        error: (record.error as string) ?? exception.name,
        message: (record.message as string | string[]) ?? exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "InternalServerError",
      message: "Internal server error",
    };
  }

  private stack(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : String(exception);
  }
}
