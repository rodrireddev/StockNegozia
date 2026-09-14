# Core

Este directorio representa las funcionalidades fundamentales de StockNegozia: Products, Inventory,
Sales, Purchases, Customers, Users y Permissions.

**Estado actual:**

- `products/`, `categories/` (esta última no está en `CoreModule` — la importa `products/` porque
  es quien la necesita) y `sales/` (importa `products/` para descontar/restaurar stock) tienen
  implementación real: entidades en SQLite, repositorio, servicio y controller. Ver el propio
  módulo de Ventas para el detalle de cómo se integra con el stock de Productos.
- `inventory/`, `purchases/`, `customers/`, `users/` y `permissions/` siguen siendo
  **placeholders estructurales**: cada uno es una clase `@Module({})` vacía, registrada en
  `CoreModule` únicamente para reservar su punto de extensión en el árbol de la aplicación. Ninguno
  contiene todavía lógica de negocio, entidades, repositorios ni endpoints.

**Dirección futura.** La intención es que la lógica de estos módulos pueda eventualmente vivir en
un núcleo agnóstico de framework (independiente de NestJS), y que esta carpeta pase a ser solo la
capa de _wiring_ que conecta ese núcleo con NestJS (controllers, DI, HTTP). Esa separación no se
implementa aún — no existe ningún `packages/core` — para no adelantar una abstracción sin una
necesidad real todavía. Cuando llegue el momento de construir la primera funcionalidad real, ese es
el punto donde decidir si se extrae o no.
