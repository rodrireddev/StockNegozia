# Dark Mode / Tema

## Opciones

`Sistema` (default) · `Claro` · `Oscuro` — seleccionables en **Configuración → Apariencia**.

## Dónde se guarda

`preferences.json` en `app.getPath('userData')` (ver
[`apps/desktop/electron/main/preferences-store.ts`](../../apps/desktop/electron/main/preferences-store.ts)),
sin cifrar (no es información sensible, a diferencia de la credential del dispositivo). Un archivo
ausente o corrupto cae al default (`system`) sin romper el arranque.

No se usa `localStorage` del Renderer ni una tabla en SQLite: Electron Main necesita conocer la
preferencia _antes_ de que exista cualquier ventana (para pintar el splash con el fondo correcto,
ver [SPLASH.md](./SPLASH.md)), así que el dueño de la preferencia tiene que ser Main, no el
Renderer.

## Cómo se resuelve "Sistema"

La fuente de verdad es la API nativa de Electron `nativeTheme` (sin dependencias nuevas):

- `nativeTheme.themeSource` se fija en `"system" | "light" | "dark"` según la preferencia guardada
  — Electron mismo resuelve `shouldUseDarkColors` contra el tema real del SO.
- Cuando el SO cambia de tema en caliente (con `theme = "system"`), `nativeTheme` emite
  `"updated"`; Electron Main reenvía ese cambio a todas las ventanas por IPC
  (`theme:updated`) para que el Renderer actualice sin reiniciar.
- El booleano final (`resolvedDark`) siempre pasa por `resolveDark(preference, shouldUseDarkColors)`
  (ver [`theme-colors.ts`](../../apps/desktop/electron/main/theme-colors.ts)), que solo consulta
  `nativeTheme.shouldUseDarkColors` cuando la preferencia es `"system"` — para `"light"`/`"dark"`
  explícitos la respuesta sale directo de la preferencia, sin intermediarios. Esto es lo que le da
  al splash un valor confiable incluso en el arranque en frío (ver
  [SPLASH.md](./SPLASH.md#evitar-el-flash-blancooscuro-y-el-splash-con-el-tema-equivocado)).

Esto evita duplicar la detección de `prefers-color-scheme` en el Renderer con `matchMedia`: el
Renderer nunca decide el tema por su cuenta, solo refleja lo que Main ya resolvió.

## Flujo IPC

```text
Renderer                         Electron Main
--------                         -------------
window.theme.get()      ------>  ipcMain.handle("theme:get")
                         <------  { preference, resolvedDark }

window.theme.set(pref)  ------>  ipcMain.handle("theme:set")
                                  - guarda en preferences.json
                                  - nativeTheme.themeSource = pref
                         <------  { preference, resolvedDark }

                         <======  "theme:updated" (push, cuando cambia el SO en modo "system")
window.theme.onUpdated(cb)
```

Ver [`apps/desktop/electron/preload/index.ts`](../../apps/desktop/electron/preload/index.ts)
(`themeApi`) y [`apps/desktop/electron/main/theme-controller.ts`](../../apps/desktop/electron/main/theme-controller.ts).

## Renderer

[`apps/desktop/renderer/src/stores/theme-store.ts`](../../apps/desktop/renderer/src/stores/theme-store.ts)
— un store de Zustand (ya usado en el proyecto para `ui-store.ts`, no se agregó como dependencia
nueva) que:

- Aplica/quita la clase `dark` en `document.documentElement` — Tailwind ya estaba configurado con
  `darkMode: ["class"]` y todos los tokens de `.dark` ya existían en
  `renderer/src/index.css`; nada de esto es nuevo, solo faltaba activarlo.
- `initializeTheme()` se llama una única vez en `main.tsx`, antes de montar React.
- `setThemePreference(pref)` es lo que llama `Configuración → Apariencia`.

## Colores hardcodeados

Se revisaron todos los usos de `bg-white`, `text-gray-*`, `bg-red-*`, `bg-emerald-*`, `bg-amber-*`,
etc. en `renderer/src`. Los componentes base de `components/ui/` (button, card, dialog, input,
select, table, textarea, separator) ya usaban los tokens (`bg-background`, `text-foreground`,
`border-border`, etc.) y no necesitaron cambios. Los mensajes de error/éxito/advertencia en las
distintas features (Productos, Ventas, Compras, Backup, etc.) y las variantes `success`/`warning`/
`destructive` de `Badge` usaban paletas fijas de Tailwind (`red-*`, `emerald-*`, `amber-*`) — se
les agregaron variantes `dark:` conservando la semántica (verde=éxito, ámbar=advertencia,
rojo=error) en vez de introducir un nuevo sistema de tokens para esto.

## Tests

- `preferences-store.spec.ts` — default, roundtrip de light/dark, JSON corrupto, valor inválido.
- `theme-store.spec.ts` — hidratación inicial, aplicación de la clase `dark`, cambio sin reiniciar,
  actualización en vivo cuando el SO cambia de tema en modo "Sistema".
- `SettingsPage.spec.tsx` — la tarjeta de Apariencia se muestra y clickear una opción llama a
  `window.theme.set`.
