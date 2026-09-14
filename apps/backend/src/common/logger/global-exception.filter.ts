import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import { AppLogger } from "./app-logger.service";
import { RequestContext } from "./request-context";

/**
 * Manejo global de excepciones: normaliza la respuesta HTTP (siempre incluye `statusCode` y
 * `requestId`, preservando el resto del body de la excepción — ej. `errors` de
 * ZodValidationPipe) y nunca devuelve un stack trace al cliente.
 *
 * Solo registra el error completo (con stack) cuando NO es una HttpException conocida: los
 * errores de negocio (404/409/400) ya quedan logueados por el service que los lanza
 * (`sale.create.failed`, `stock.insufficient`, etc.) — repetirlos acá duplicaría el mismo stack
 * trace en dos capas sin agregar información nueva.
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que
  // `tsc`/`emitDecoratorMetadata` emite pero esbuild (usado por Vitest para transformar TS) no —
  // sin esto, `logger` queda `undefined` cuando esta clase se resuelve vía Test.createTestingModule.
  constructor(@Inject(AppLogger) private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{
      status: (code: number) => { json: (body: unknown) => void };
    }>();
    const request = ctx.getRequest<{ method: string; path: string }>();
    const requestId = RequestContext.getRequestId();

    const isKnown = exception instanceof HttpException;
    const statusCode = isKnown ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isKnown) {
      this.logger.error({
        context: "ExceptionFilter",
        operation: `${request.method} ${request.path}`,
        event: "http.unhandled_exception",
        message: "Unhandled exception",
        error: exception,
      });
    }

    const exceptionBody = isKnown ? exception.getResponse() : null;
    const body =
      typeof exceptionBody === "object" && exceptionBody !== null
        ? { ...exceptionBody, statusCode, requestId }
        : { statusCode, message: isKnown ? exceptionBody : "Internal server error", requestId };

    response.status(statusCode).json(body);
  }
}
