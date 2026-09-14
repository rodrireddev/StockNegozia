// NestJS resuelve la inyección de dependencias por tipo (constructor(private readonly x: Foo))
// leyendo metadata de diseño que emite `reflect-metadata`. `main.ts` la importa como primera
// línea; los tests que usan `@nestjs/testing` (Test.createTestingModule) necesitan lo mismo, o la
// inyección por tipo falla silenciosamente (el provider queda `undefined`).
import "reflect-metadata";
