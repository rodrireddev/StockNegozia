# Product Scanner — identificación de productos por QR/barcode (M16)

## Propósito

Permitir identificar un producto con la cámara del teléfono (QR o código de barras comercial) en
los flujos donde hoy hay que buscarlo/tipearlo a mano: búsqueda de productos, alta de producto,
ventas y compras. Regla dura de este milestone: el scanner es una **fuente de entrada** para los
flujos existentes, nunca un flujo paralelo — un código que no pertenece a ningún producto abre el
mismo formulario de alta de siempre, con el código precargado, nunca un formulario especial.

## Modelo de identificación

No se agregó ninguna columna nueva. `products.barcode` (`apps/backend/src/database/schema/products.ts`)
ya existía como texto libre opcional y se reutiliza como el único identificador físico:

- **Barcode** (EAN-13, EAN-8, UPC-A, UPC-E, Code128, Code39, Codabar, ITF-14): el valor crudo
  decodificado por la cámara se guarda/compara tal cual, sin validación de formato ni checksum.
- **QR**: no se asume que todo QR es un barcode comercial. El contenido crudo del QR se trata como
  texto libre igual que un barcode — se resuelve contra `sku` exacto y luego `barcode` exacto (ver
  §Lookup). Se reserva el prefijo `STOCKNEGOZIA:PRODUCT:<sku>` para QR que la app genere en el
  futuro (**no implementado en este milestone** — StockNegozia no genera QR propios todavía); si
  un código escaneado llega con ese prefijo, el backend lo desenvuelve y usa el resto como
  identificador, así un QR futuro funciona sin cambios adicionales.

`barcode` ahora tiene un índice único (`products_barcode_unique`, migración
`0013_windy_zeigeist.sql`) que, igual que en SQLite ya ocurre con `sku`, permite múltiples `NULL`
sin conflicto — un producto sin código de barras sigue siendo válido.

## Lookup exacto — `GET /products/lookup?code=<valor>`

Endpoint nuevo, distinto de `GET /products?search=` (que hace `LIKE` parcial sobre
`name`/`sku`/`barcode` y puede devolver varios resultados). El lookup del scanner necesita lo
contrario: una coincidencia exacta o nada.

- `ProductsRepository.findByCode(code)` — `WHERE sku = :code OR barcode = :code`, sin `LIKE`.
- `ProductsService.findByCode(code)` — desenvuelve el prefijo `STOCKNEGOZIA:PRODUCT:` si está
  presente, y lanza `404 Producto no encontrado` (mismo mensaje/patrón que `GET /products/:id`) si
  no hay match.
- La ruta `@Get("lookup")` está declarada **antes** de `@Get(":id")` en el controller — si no,
  NestJS matchea `"lookup"` contra `:id` y `ParseIntPipe` lo rechaza con 400 antes de llegar acá.

## Unicidad de `barcode`

`ProductsService.assertBarcodeAvailable(barcode, excludeId)` — mismo patrón que
`assertSkuAvailable`, se ejecuta antes de tocar la base en `create()` y en `update()` (solo si el
input trae `barcode`). Devuelve `409 Conflict`:

```
El código de barras ya está en uso por el producto "<nombre del producto existente>"
```

## Scanner en Mobile

`apps/mobile/src/features/scanner/ProductScanner.tsx` — componente de cámara reutilizable,
modelado sobre `features/pairing/components/steps/ScanStep.tsx` (mismo manejo de permisos vía
`useCameraPermissions`, mismo `lockedRef` anti-doble-lectura). No conoce productos, ventas ni
compras: solo emite `ScanResult { code, format }` (`features/scanner/types.ts`) a quien lo invoque.

```
<ProductScanner visible={...} onDetected={(r) => ...} onCancel={() => ...} />
```

Incluye entrada manual (texto + botón) dentro del mismo modal — la cámara no es la única forma de
ingresar un código; un lector Bluetooth HID sigue funcionando igual que antes (ver §Lectores HID).

Tipos de código soportados (`expo-camera` nativo, sin dependencias nuevas):
`qr, ean13, ean8, upc_a, upc_e, code128, code39, codabar, itf14`.

### Escaneo continuo (Ventas y Compras)

`ProductScanner` nunca cierra la cámara entre lecturas — el lock anti-doble-lectura se libera solo
con un cooldown (`RESCAN_COOLDOWN_MS`, 1200ms) en vez de depender de que el consumidor cierre y
reabra el modal. Esto corrige un bug real: cerrar/reabrir forzaba a `CameraView` a desmontar y
reinicializar la sesión nativa de cámara (varios cientos de ms); si se escaneaba un segundo código
antes de que esa reinicialización terminara, se perdía — el síntoma reportado era "si escaneo
rápido dos veces seguidas, la segunda no anda; si espero un momento, sí".

En Ventas y Compras (`SalesScreen`/`PurchasesScreen`) el scanner se deja abierto entre lecturas a
propósito: cada código detectado agrega/incrementa el producto en el carrito y avisa con un beep +
un banner animado ("✓ Producto agregado: <nombre>" o el error correspondiente) sin cerrar el modal,
para poder escanear varios productos seguidos. En Búsqueda y Alta de producto el scanner sigue
cerrándose tras cada lectura (un único código por interacción, no aplica el modo continuo).

- **Banner de aviso** (`ScanFeedback` — tipo y animación viven en `ProductScanner.tsx`, las fábricas
  de texto en `features/scanner/scanFeedback.ts`): **no usa ninguna librería de toast.** Se probó
  primero con `react-native-toast-message`, pero esa librería solo re-anima su entrada cuando pasa
  de oculto a visible — si ya había un toast visible y se llamaba `Toast.show()` de nuevo, solo
  actualizaba el texto sin ninguna animación, lo que en escaneo rápido y seguido se sentía como "el
  aviso pasa muy rápido o ni se nota". Un workaround con `Toast.hide()` + `setTimeout` tampoco
  resultó confiable (corría el riesgo de pisarse entre escaneos consecutivos, cada uno con su
  propia latencia de red). Se reemplazó por un banner propio (`Animated.View` dentro del mismo
  `ProductScanner`, sin dependencia externa): cada llamada a `setScanFeedback(...)` en
  `SalesScreen`/`PurchasesScreen` crea un objeto `ScanFeedback` nuevo, y un `useEffect` en
  `ProductScanner` reacciona a **esa referencia** (no al texto) deteniendo cualquier animación en
  curso (`.stop()`) y arrancando una nueva desde cero — entrada (180ms) → se mantiene visible
  (2200ms) → sale (180ms). Así el tiempo visible es siempre el mismo, escaneo tras escaneo, sin
  importar qué tan rápido lleguen. `react-native-toast-message` se desinstaló por completo (no
  queda ninguna dependencia de toast en el proyecto).
- **Beep** (`features/scanner/useScanBeep.ts`): un tono corto sintetizado (`assets/sounds/scan-beep.wav`,
  ~130ms) que suena en cada producto agregado — pensado para escanear sin mirar la pantalla cada
  vez. Se reproduce vía `expo-audio` (ver §Dependencias nuevas), reseteando la posición del clip
  (`seekTo(0)`) antes de cada `play()` para poder repetirlo en escaneos consecutivos.

### Integración por flujo

| Flujo        | Pantalla                                         | Al detectar un código                                                                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Búsqueda     | `features/products/screens/ProductsScreen.tsx`   | `GET /products/lookup` → encontrado: abre el detalle; no encontrado: ofrece "Crear producto con este código" → navega a `/products/new?barcode=<code>`                                                                                                                                    |
| Alta/edición | `features/products/components/ProductForm.tsx`   | Solo llena el campo "Código de barras" del formulario existente (sin llamar a la API) — el usuario completa el resto y guarda por el flujo normal                                                                                                                                         |
| Ventas       | `features/sales/screens/SalesScreen.tsx`         | `GET /products/lookup` → encontrado: se agrega al carrito (mismo `cartReducer` de siempre, que ya incrementa la cantidad si el producto se repite), suena un beep y aparece el banner; no encontrado: banner de error. El scanner **no se cierra** — modo continuo, ver §Escaneo continuo |
| Compras      | `features/purchases/screens/PurchasesScreen.tsx` | Igual que Ventas, con el carrito de compras                                                                                                                                                                                                                                               |

No se agregó creación de producto durante una venta/compra: ese flujo no existe hoy en ningún
lugar del código (ni Mobile ni Desktop), y la regla de este milestone prohíbe inventarlo sin
justificarlo — si se necesita en el futuro, es una decisión de producto aparte.

### Lectores HID (Bluetooth "tipo teclado")

Sin cambios: `packages/shared/src/products/resolve-scan-match.ts` sigue resolviendo el flujo
"tipear/leer + Enter" en los buscadores de Ventas y Compras (Desktop y Mobile), igual que antes de
este milestone. El lookup exacto del scanner de cámara es un mecanismo nuevo y más estricto
(coincidencia exacta contra el backend, nunca "único resultado parcial"), pero no reemplaza a
`resolveScanMatch` — conviven.

## Desktop

Sin cambios de código. `ProductDto` no cambió de forma (`barcode` sigue siendo `string | null`);
Desktop no tiene cámara en este milestone y sigue funcionando igual con productos que tengan
`barcode`. El único efecto visible es que ahora un `barcode` duplicado devuelve `409` al guardar
un producto (antes se guardaba sin validar) — el `ProductForm` de Desktop ya muestra ese tipo de
error genéricamente, igual que hace hoy con un `sku` duplicado.

## Errores

| Caso                       | Mensaje / comportamiento                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Código no encontrado       | `404` → "Producto no encontrado" (lookup); en Búsqueda se ofrece crear el producto                         |
| Código duplicado           | `409` → "El código de barras ya está en uso por el producto "...""                                         |
| Permiso de cámara denegado | Mensaje explicativo + botón "Permitir cámara"/"Abrir configuración", con fallback a "Ingresar manualmente" |
| Lecturas repetidas         | `lockedRef` + cooldown de 1200ms evita procesar el mismo frame dos veces sin bloquear el siguiente escaneo |
| Cancelación                | Botón "Cerrar" en el modal del scanner, sin efectos secundarios                                            |

## Dependencias nuevas

- **`expo-audio` (~57.0.5)** — beep de confirmación en cada escaneo exitoso (ver §Escaneo
  continuo). Único módulo nativo nuevo del milestone; requiere plugin en `app.json`
  (`["expo-audio", { "recordAudioAndroid": false, "enableBackgroundPlayback": false }]`, mismo
  criterio restrictivo que ya usa `expo-camera` — sin esas dos opciones en `false`, el plugin por
  defecto pide `RECORD_AUDIO` y registra un servicio de reproducción en segundo plano, ninguno de
  los dos necesario acá). Necesita un mock manual de Jest (`apps/mobile/__mocks__/expo-audio.ts`)
  porque su `AudioPlayer` usa la API nativa nueva basada en JSI (`SharedObject`), que `jest-expo`
  todavía no mockea automáticamente como sí hace con `expo-camera`.
- Sin cambios respecto a `expo-camera` — sigue siendo la única dependencia de cámara, reutilizada
  también para la foto de producto (ver §Foto de producto).

## Foto de producto (alta/edición en Mobile)

`apps/mobile/src/features/products/components/ProductPhotoCapture.tsx` — reutiliza el mismo
`expo-camera` del scanner (sin dependencia nueva ni permiso adicional: ya comparten `CAMERA`), pero
sin `barcodeScannerSettings` — acá se toma una foto (`CameraView.takePictureAsync()`), no se
decodifica un código. Flujo: cámara → foto → preview con "Usar esta foto"/"Volver a tomar" → si
pesa más de 2MB (estimado sobre el string base64) pide reintentar, si no, entrega un data URI
(`data:image/jpeg;base64,...`) a `ProductForm`.

No se tocó el backend ni el modelo de datos: `products.image` ya era un string libre de texto sin
validación de formato ni límite de tamaño en el servidor, y Desktop ya guarda ahí exactamente el
mismo tipo de valor (`FileReader.readAsDataURL()` sobre el archivo elegido, mismo límite cliente de
2MB, `MAX_IMAGE_BYTES` en su `ProductForm.tsx`) — Mobile ahora produce ese mismo formato desde la
cámara en lugar de un selector de archivo. El campo de texto libre "Imagen (URL)" que tenía el
formulario de Mobile se reemplazó por esta captura + preview + "Quitar foto", mismo criterio que ya
usa Desktop (sin URL manual).

## Cómo probarlo físicamente

1. Backend corriendo en la red local, Mobile emparejado (ver §Pairing en `MOBILE_CLIENT.md`).
2. Imprimir o mostrar en otra pantalla un código de barras (EAN-13 real de cualquier producto de
   góndola) y un QR con texto arbitrario.
3. Búsqueda → "📷 Escanear" → apuntar al código → debe abrir el producto si existe, u ofrecer
   crearlo si no.
4. Alta de producto → "📷 Escanear" junto a "Código de barras" → el campo se completa con el valor
   leído, editable antes de guardar.
5. Ventas/Compras → "📷 Escanear" → el producto se agrega al carrito, suena un beep y aparece el
   banner animado arriba; sin cerrar el modal, escanear otro código distinto (y luego repetir uno
   ya escaneado) — debe agregar/incrementar cada vez, con beep y banner en cada escaneo (siempre el
   mismo tiempo visible, sin importar qué tan rápido se escanee), incluso escaneando rápido y
   seguido (con el dispositivo sin silenciar/en modo vibración, confirmar que el beep suena — no
   depende del volumen de notificaciones, sí del volumen multimedia).
6. Intentar guardar dos productos distintos con el mismo `barcode` → debe rechazar el segundo con
   409 y mostrar el mensaje con el nombre del producto existente.
7. Alta de producto → "📷 Tomar foto" → sacar la foto → "Usar esta foto" → debe verse la miniatura
   en el formulario y guardar el producto correctamente con esa imagen.

## Limitaciones / pendientes

- **No se probó en Android real ni se generó un build** desde este entorno de desarrollo — la
  cámara, los permisos y el escaneo de códigos reales quedan pendientes de validación manual (ver
  `docs/mobile/MOBILE_CLIENT.md` §Builds).
- StockNegozia no genera QR propios todavía — el prefijo `STOCKNEGOZIA:PRODUCT:` está reservado y
  soportado por el lookup, pero no hay ninguna pantalla que genere/imprima esos QR en este
  milestone.
- No hay soporte específico de hardware Bluetooth más allá de lo que ya funcionaba (HID vía
  teclado) — no hacía falta agregarlo para este milestone.
