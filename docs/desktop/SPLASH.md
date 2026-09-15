# Splash Screen

## Objetivo

Cubrir el tiempo real de arranque (backend + ventana principal) con una pantalla de carga que
muestra el logo oficial — nunca una ventana blanca, nunca un `setTimeout` fijo como mecanismo
principal.

## Integración con el lifecycle de Electron

El splash no reemplaza ni duplica `BackendManager` ni `createMainWindow` — se inserta en el mismo
`bootstrap()` de [`apps/desktop/electron/main/index.ts`](../../apps/desktop/electron/main/index.ts):

```text
app.whenReady()
    │
    ▼
themeController.applyStoredPreference()   ← fija nativeTheme.themeSource y devuelve `resolvedDark`
    │                                         ya resuelto (ver "Evitar el flash..." abajo),
    │                                         ANTES de crear cualquier ventana
    ▼
createSplashWindow({ dark: resolvedDark }) ← se muestra de inmediato (no depende de nada más)
    │
    ▼
backendManager.start()
backendManager.waitUntilHealthy()         ← el splash cubre exactamente este tiempo, sea el que sea
    │
    ▼
ensureDeviceCredential()
    │
    ▼
createMainWindow()  (show: false)
    │
    ▼
mainWindow "ready-to-show"
    │
    ▼
ensureMinimumVisible(splashShownAt, MIN_SPLASH_VISIBLE_MS = 1000ms)  ← ver "Duración mínima" abajo
    │
    ▼
splash.close() + mainWindow.show()        ← en el mismo paso, sin frame intermedio sin ventanas
```

Si `waitUntilHealthy()` falla, el splash se cierra antes de mostrar el diálogo de error nativo
(comportamiento ya existente, sin cambios).

## Por qué no es un `setTimeout` fijo

La condición real de cierre es **backend saludable + `ready-to-show` de la ventana principal**.
[`splash-timing.ts`](../../apps/desktop/electron/main/splash-timing.ts) (`ensureMinimumVisible`,
piso `MIN_SPLASH_VISIBLE_MS = 1000`) solo evita que un arranque excepcionalmente rápido (<1000ms)
haga parpadear el splash: si ya pasó 1000ms desde que se mostró, no espera nada extra; si no,
espera únicamente el resto que falta. Nunca agrega demora a un arranque lento — el piso de 1000ms
es la única constante de tiempo en todo el mecanismo, y se cuenta desde `splashShownAt` (el momento
real en que se crea la ventana del splash), no desde el arranque de Electron.

Ejemplos:

| Backend tarda | Splash dura                                   |
| ------------- | --------------------------------------------- |
| 300ms         | ~1000ms (el piso)                             |
| 700ms         | ~1000ms (el piso)                             |
| 1500ms        | ~1500ms (nunca se corta antes de estar listo) |

## Evitar el flash blanco→oscuro (y el splash con el tema equivocado)

1. `ThemeController.applyStoredPreference()` fija `nativeTheme.themeSource` **y** devuelve el
   booleano `resolvedDark` ya resuelto, en el mismo paso, antes de crear la ventana del splash.
   Ese booleano viaja **explícito** como parte de `SplashOptions` — el splash nunca vuelve a leer
   `nativeTheme` por su cuenta.
2. La resolución de `resolvedDark` (ver
   [`theme-colors.ts`](../../apps/desktop/electron/main/theme-colors.ts) → `resolveDark`) ni
   siquiera consulta `nativeTheme` cuando la preferencia es `"light"` o `"dark"` explícitos — ahí
   la respuesta ya está en la preferencia guardada. Solo `"system"` depende de
   `nativeTheme.shouldUseDarkColors`. Esto existe porque, en el arranque en frío, leer
   `nativeTheme.shouldUseDarkColors` inmediatamente después de asignar `themeSource` podía no
   reflejar todavía el valor recién puesto — el splash nacía con el tema equivocado a pesar de que
   el cambio de tema en caliente (con la app ya abierta) siempre funcionó bien. Bypasear
   `nativeTheme` para los casos explícitos elimina esa ventana de raíz.
3. Con `resolvedDark` ya resuelto, `backgroundColor` (nativo, en el constructor de
   `BrowserWindow`) y el HTML inline (`buildSplashHtml`) usan el mismo valor — no hay dos fuentes
   que puedan desincronizarse.
4. `sandbox: false` en el `webPreferences` del splash (igual que `createMainWindow` en
   `window.ts`). Con el sandbox de Chromium activo (el default de Electron cuando no se
   especifica), la navegación al `data:` URL fallaba **de forma consistente** con `ERR_FAILED` en
   máquinas con GPU deshabilitada/virtualizada — se confirmó que no era un problema del contenido
   (un `<h1>hola</h1>` sin JS fallaba igual, con o sin imagen, con `data:` o con `file://`) ni de
   una ventana en particular (una ventana completamente nueva fallaba igual) — era el sandbox del
   renderer el que no podía completar la navegación en ese tipo de entorno. Sin JS de terceros ni
   contenido remoto en este documento, desactivar el sandbox acá no abre ninguna superficie de
   ataque nueva. Con `sandbox: false`, la carga es instantánea (confirmado: <500ms) y consistente.
5. El splash se muestra de inmediato (`show: true`), a diferencia de la ventana principal que
   espera `ready-to-show`. Esto es una segunda capa de robustez, independiente del punto 4: incluso
   si en algún entorno la carga del HTML _igual_ fallara, `backgroundColor` ya garantiza el color
   correcto desde el primer frame nativo — el splash no depende de que el compositor termine de
   pintar el `<img>`/texto para mostrarse.
6. El HTML del splash es un `data:` URL autocontenido generado en
   [`splash.ts`](../../apps/desktop/electron/main/splash.ts) — no depende de Vite ni de ningún
   build del renderer, así que puede existir incluso si el bundle del renderer tarda en estar
   listo. Su carga tiene un `.catch()` silencioso: si falla igual (ver punto 5), la ventana ya está
   visible con el fondo correcto y no hay nada más que hacer — no se reintenta ni se loguea como
   error.

## Logo

Se lee [`assets/branding/generated/splash/splash-logo.png`](../../assets/branding/README.md) del
disco (resuelto con el mismo `repoRoot` que ya usa `BackendManager` para funcionar igual en dev y
empaquetado) y se embebe como `data:image/png;base64,...` directamente en el `<img src>` del HTML
— **no** como `<img src="file://...">`. Es el mismo logo oficial que en el resto de la app, sin
ninguna transformación de imagen — solo se lee y se codifica a base64 para poder incluirlo inline.

Esto no es una preferencia estética: un documento `data:` tiene un origen opaco, y Chromium
bloquea silenciosamente que cargue subrecursos `file://` (sin ningún error en consola — el `<img>`
simplemente no carga, se ve como un ícono de imagen rota). Embeber el logo en el mismo documento
evita ese problema de raíz.

## Qué se testeó (y qué no)

Sin depender de una ventana Electron real:

- `splash-timing.spec.ts` — `ensureMinimumVisible` con fake timers: resuelve inmediato si ya pasó
  el mínimo, espera el resto si no, y los tres casos de ejemplo (backend a 300/700/1500ms).
- `theme-colors.spec.ts` — mapeo tema→color hex, y `resolveDark` (light/dark explícitos vs
  "system").

No se escribió un test que abra una `BrowserWindow` real (frágil y no aporta valor sobre lo ya
cubierto) — la validación de que el splash se ve y se cierra bien es manual (ver checklist en la
descripción del milestone).
