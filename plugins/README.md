# Plugins (futuro)

Este directorio alojará los plugins oficiales y de terceros de StockNegozia (por ejemplo,
WhatsApp Web, persistencia en Google Drive/OneDrive/Dropbox/S3, automatizaciones, herramientas de
IA).

**Nada de esto existe todavía.** Esta carpeta documenta la dirección arquitectónica para que el
Core no necesite condicionales por plugin (`if (plugin === "whatsapp")`) sino un mecanismo genérico:

- **Plugin Manifest**: metadata declarativa por plugin (id, versión, capabilities requeridas).
- **Plugin SDK**: API estable que un plugin usa para registrarse (páginas, endpoints, comandos,
  eventos, jobs, permisos, entidades, migraciones).
- **Plugin Runtime**: el proceso del Core que descubre, carga y aísla plugins en tiempo de
  ejecución.
- **Capabilities**: permisos declarados que un plugin solicita (`messaging`, `contacts`, `media`,
  `automation`, `ai`, `ui`, `events`, etc.).
- **Event Bus**: los plugins se suscriben a eventos de dominio (`sale.created`, `stock.low`, etc.)
  emitidos por el Core, sin que el Core conozca la existencia de plugins concretos.

El Core debe poder funcionar completamente sin que exista ningún plugin instalado.
