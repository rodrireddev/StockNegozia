import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AppLogger } from "./app-logger.service";
import { RequestContext } from "./request-context";

const REQUEST_ID_HEADER = "x-request-id";
// Alfanumérico + "._-", hasta 100 caracteres. Rechaza espacios, saltos de línea y valores
// excesivamente largos — nunca se confía ciegamente en un header provisto por el cliente.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

interface MinimalRequest {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  originalUrl?: string;
}

interface MinimalResponse {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  on: (event: "finish", listener: () => void) => void;
}

function resolveRequestId(headerValue: string | string[] | undefined): string {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (raw && REQUEST_ID_PATTERN.test(raw)) return raw;
  return randomUUID();
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  // @Inject explícito por la misma razón que en GlobalExceptionFilter — ver ese comentario.
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  use(req: MinimalRequest, res: MinimalResponse, next: () => void): void {
    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    res.setHeader("X-Request-Id", requestId);

    RequestContext.run({ requestId }, () => {
      const path = req.originalUrl ?? req.path;
      const operation = `${req.method} ${path}`;
      const startedAt = Date.now();

      this.logger.info({
        context: "HTTP",
        operation,
        event: "http.request.started",
        message: "Request started",
        metadata: { method: req.method, path },
      });

      res.on("finish", () => {
        const durationMs = Date.now() - startedAt;
        const failed = res.statusCode >= 400;
        const fields = {
          context: "HTTP",
          operation,
          event: failed ? "http.request.failed" : "http.request.completed",
          message: failed ? "Request failed" : "Request completed",
          metadata: { method: req.method, path, statusCode: res.statusCode, durationMs },
        };
        if (res.statusCode >= 500) this.logger.error(fields);
        else if (failed) this.logger.warn(fields);
        else this.logger.info(fields);
      });

      next();
    });
  }
}
