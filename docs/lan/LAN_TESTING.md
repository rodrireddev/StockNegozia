# LAN Development — M13: prueba de conectividad

> **M13 = prueba de concepto de conectividad LAN**, sin autenticación de dispositivos. **M14 ya
> implementó** esa autenticación/autorización (pairing real desde el Web Client, UI de Desktop,
> CORS restringido) — ver [`docs/lan/DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md). Este
> documento se mantiene tal cual para la parte que sigue vigente sin cambios: cómo levantar el
> backend y el Web Client en la LAN, `VITE_API_URL`, firewall. La sección "Seguridad" de acá abajo
> describe el estado de M13 — ya superado por M14 en cuanto a autenticación.

## Qué demuestra este milestone

```text
Cliente Web (apps/web-client)
        │
        │ HTTP (fetch)
        ▼
Backend LAN (apps/backend, NestJS)
        │
        ▼
ProductsService → ProductsRepository
        │
        ▼
SQLite (better-sqlite3 + Drizzle)
        │
        ▼
JSON de vuelta al Cliente Web
```

Sin datos falsos: `Load Products` pega a `GET /products`, el mismo endpoint que usa el Desktop.

## Qué NO incluía (resuelto por M14)

Al momento de M13: ningún registro/autenticación/autorización de dispositivos, tokens permanentes
para el cliente LAN, lista/revocación de dispositivos. **M14 resolvió todo esto** — ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md). Sigue sin haber WebSockets, sync offline, ni
cliente mobile (mobile es M15).

## Arquitectura: qué se tocó y qué no

- **Host/puerto del backend**: no se cambió nada. `app.listen(config.port)` (NestJS,
  `apps/backend/src/main.ts`) ya escuchaba en todas las interfaces sin un segundo argumento de
  host — se verificó con `curl` desde `localhost`, `127.0.0.1` y la IP LAN de esta máquina, las
  tres respondieron. **No asumas que esto es igual en tu red** — probalo vos también (ver
  "Prueba manual" abajo) y revisá el firewall si no responde.
- **CORS**: no se cambió nada (`app.enableCors()`, sin `origin` explícito, ya refleja `*`). Ver
  la sección CORS más abajo para el análisis de por qué esto es aceptable ahora.
- **Logging**: se agregó `clientIp` a los eventos `http.request.started/completed/failed` en
  `RequestContextMiddleware` (`apps/backend/src/common/logger/request-context.middleware.ts`) —
  mismo logger de siempre, sin sistema paralelo.
- **IP LAN**: se reutilizó `resolveLanHost()` (`apps/backend/src/auth/pairing/lan-address.ts`,
  ya existía para el QR de pairing) para imprimirla al arrancar el backend. No se creó ninguna
  utilidad nueva de red.
- **Cliente web**: paquete nuevo `apps/web-client` (Vite + TypeScript plano, sin framework) —
  deliberadamente separado del Desktop, no reemplaza ni extiende su renderer.

## Cómo iniciar el backend

```bash
pnpm --filter @stocknegozia/backend start:dev
```

El puerto es `STOCKNEGOZIA_PORT` (`apps/backend/.env.example`, default `38123`). Al arrancar,
la consola imprime ambas URLs:

```text
[backend] StockNegozia backend listening on http://localhost:38123
[backend] LAN:                                http://192.168.1.30:38123
```

Esa segunda línea es la que necesitás para el segundo dispositivo. Si tu máquina tiene varias
interfaces de red (VPN, adaptador virtual, etc.) y la IP detectada no es la correcta, fijala a
mano con `PAIRING_HOST` en `apps/backend/.env` (el mismo override que ya usa el pairing QR — no
es una variable nueva):

```bash
PAIRING_HOST=192.168.1.30
```

## Cómo iniciar el cliente web

```bash
pnpm --filter @stocknegozia/web-client dev
```

Levanta en `http://localhost:5544` (puerto fijo, elegido para no chocar con el `5173` del
renderer de Electron). El dev server escucha en todas las interfaces (`host: true` en
`apps/web-client/vite.config.ts`), así que también es accesible como
`http://<tu-IP-LAN>:5544` desde otro dispositivo — Vite imprime esa URL al arrancar
(`➜ Network: ...`).

## Cómo configurar `VITE_API_URL`

**Nunca hardcodees una IP** — cambia según la red. Copiá el ejemplo y editalo:

```bash
cp apps/web-client/.env.example apps/web-client/.env
```

```bash
# apps/web-client/.env
VITE_API_URL=http://192.168.1.30:38123   # la IP LAN que imprimió el backend, no "localhost"
```

Sin esta variable, el cliente asume `http://localhost:38123` — solo sirve si el cliente corre en
la misma máquina que el backend. Reiniciá `pnpm --filter @stocknegozia/web-client dev` después de
editar `.env` (Vite lee las variables al arrancar).

## Prueba manual: dos dispositivos

**Máquina A** (corre StockNegozia):

1. `pnpm --filter @stocknegozia/backend start:dev` — anotá la IP LAN que imprime.
2. Configurá `apps/web-client/.env` con esa IP + puerto (`VITE_API_URL=http://<IP-A>:38123`).
3. `pnpm --filter @stocknegozia/web-client dev`.

**Máquina B** (otro dispositivo, misma red — no necesita correr nada de este repo):

1. Abrí un navegador en `http://<IP-A>:5544`.
2. Debería verse el estado de conexión (`● Connected` si el `/health` automático al cargar la
   página funcionó).
3. Click en **Check Backend** → `Backend: OK (db: connected)`.
4. Click en **Load Products** → lista de productos reales de la base de Máquina A.

Si algo falla, seguí el diagnóstico de la sección siguiente.

## Si Máquina B no puede conectar: Windows Firewall

Windows puede bloquear conexiones entrantes al puerto del backend (`38123`) y/o del cliente web
(`5544`) la primera vez que un proceso escucha para la red. **No modificamos reglas de firewall
automáticamente** (ver `docs/security/` — cualquier cambio de este tipo requiere que lo hagas vos,
con los permisos de administrador que corresponda). Si aparece el diálogo "El Firewall de Windows
Defender bloqueó algunas características de esta app", elegí **Redes privadas** y **Permitir el
acceso**. Si no aparece ningún diálogo pero igual no conecta, agregá la regla manualmente:

- **GUI**: Panel de Control → Firewall de Windows Defender → Configuración avanzada → Reglas de
  entrada → Nueva regla → Puerto → TCP → puertos específicos `38123,5544` → Permitir la conexión →
  marcar solo **Privada** (no Pública, salvo que sepas lo que hacés) → nombre "StockNegozia LAN".
- **PowerShell** (ejecutar vos mismo, como administrador — no lo corre esta herramienta):
  ```powershell
  New-NetFirewallRule -DisplayName "StockNegozia LAN" -Direction Inbound -Protocol TCP `
    -LocalPort 38123,5544 -Action Allow -Profile Private
  ```

Verificá primero desde la propia Máquina A pegándole a su IP LAN (`curl http://<IP-A>:38123/health`)
— si eso también falla, el problema es el bind del backend, no el firewall.

## CORS

**Actualizado por M14** — ya no refleja `*`. Ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md) §CORS para la allowlist actual
(`apps/backend/src/config/cors-origin.ts`) y `CORS_ALLOWED_ORIGINS`. El razonamiento de fondo
sigue siendo el mismo que documentaba M13: la frontera de seguridad real es
`ApiAccessGuard`/`API_ACCESS_MODE`, no el `Origin` del request — CORS es una capa adicional, no un
reemplazo.

## Logging

Mismo `AppLogger`/`RequestContextMiddleware` de siempre (`docs/logging/LOGGING.md`) — no se creó
un logger paralelo. Cada request ahora incluye `clientIp`:

```json
{
  "timestamp": "2026-09-15T12:45:40.503Z",
  "level": "INFO",
  "requestId": "222e10f5-accd-4dac-a102-3689aa7c52f0",
  "context": "HTTP",
  "operation": "GET /products",
  "event": "http.request.completed",
  "message": "Request completed",
  "metadata": {
    "method": "GET",
    "path": "/products",
    "statusCode": 200,
    "durationMs": 6,
    "clientIp": "::1"
  }
}
```

- `clientIp` viene de `req.ip` (Express) — la IP real del socket, no un header (`X-Forwarded-For`)
  que el cliente podría falsificar. Sin proxy delante de este backend, no hace falta más que eso.
- Un request desde `localhost` aparece como `::1` (loopback IPv6) o `127.0.0.1`; desde otro
  dispositivo de la LAN vas a ver su IP real (ej. `192.168.1.50`).
- `requestId` sigue correlacionando `http.request.started` con `.completed`/`.failed` — usalo para
  reconstruir un request específico con `LogReader` (`apps/backend/src/common/logger/log-reader.ts`),
  igual que antes.
- Log en `apps/backend/data/logs/app.log` (o `LOG_DIR` si lo configuraste).

## Errores

El cliente muestra mensajes genéricos ("No se pudo conectar con StockNegozia backend.") — nunca
un stack trace ni detalle interno, porque el backend nunca los expone
(`GlobalExceptionFilter`, sin cambios). Un error de red real (backend apagado, puerto equivocado,
firewall bloqueando) llega al cliente como una falla de `fetch` (`TypeError: Failed to fetch`),
distinta de un error HTTP de negocio (4xx/5xx con `{ message }`) — el cliente distingue ambos casos
en `apps/web-client/src/main.ts`.

## Seguridad — estado al momento de M13 (ver M14 para lo actual)

- **Sin autenticación de dispositivos LAN.** Cualquier dispositivo en la misma red podía pegarle a
  este backend mientras `API_ACCESS_MODE=development` (el default). Esto era intencional para
  esta prueba puntual — **M14 agregó la autenticación correspondiente**, ver
  [`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md). `API_ACCESS_MODE=development` sigue siendo el
  default (no cambiado por M14) — para exigir autenticación real, configurar
  `API_ACCESS_MODE=production`.
- El cliente de prueba usa `GET /products` (endpoint real, ya protegido por el mismo guard que
  todo lo demás) para poder demostrar `Load Products` con datos reales — no crea una vía de acceso
  nueva. Desde M14, además, lo hace autenticado (ver `DEVICE_MANAGEMENT.md`).

## Limitaciones actuales

- La detección de IP LAN (`resolveLanHost`) es "mejor esfuerzo": toma la primera interfaz IPv4 no
  interna. Con varias NICs activas (VPN, adaptadores virtuales) puede elegir la incorrecta — usar
  `PAIRING_HOST` para forzarla.
- No hay descubrimiento de red (mDNS/Bonjour) — hay que conocer la IP y escribirla a mano.
- El cliente web no persiste nada (ni la URL configurada más allá de la build, ni el estado entre
  recargas) — es deliberadamente efímero, para probar conectividad, no para uso diario.

## M14 (resuelto)

Registro/autenticación de dispositivos LAN, lista/revocación de esos dispositivos, y CORS
restringido a orígenes conocidos — todo esto ya está implementado, ver
[`DEVICE_MANAGEMENT.md`](./DEVICE_MANAGEMENT.md). Pendiente real: solo Mobile (M15).
