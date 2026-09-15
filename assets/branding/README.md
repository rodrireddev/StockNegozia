# Branding — StockNegozia

## Logo fuente (MASTER)

**`/logo.png`** (raíz del monorepo) es el único archivo fuente del logo oficial de StockNegozia.
PNG con transparencia, 1254×1254px.

- **Nunca se modifica ni se sobrescribe.** Todo lo demás en este documento se genera a partir de
  él.
- El logo tiene un glow/degradé azul suave que se extiende levemente más allá del contorno duro de
  la marca — es intencional (se preserva igual en fondos claros y oscuros), no un defecto de
  recorte/transparencia. No se le aplicó ningún filtro ni corrección.
- Todas las transformaciones aplicadas son estrictamente técnicas: redimensionado, rasterización a
  distintos tamaños, empaquetado en `.ico`. Ninguna cambia el diseño, los colores, las proporciones
  ni agrega/quita elementos.

## Assets generados

Generados por [`apps/desktop/scripts/generate-branding-assets.mjs`](../../apps/desktop/scripts/generate-branding-assets.mjs)
con [sharp](https://sharp.pixelplumbing.com/) (resize) y [to-ico](https://www.npmjs.com/package/to-ico)
(empaquetado `.ico`).

```text
assets/branding/generated/
  windows/
    icon.ico        — 16, 24, 32, 48, 64, 128, 256px — ícono de la app/ventanas en Windows
  app/
    icon-256.png     — PNG de alta resolución, para packaging futuro (M13, electron-builder/forge)
    icon-512.png     — ídem, resolución mayor (macOS/Linux/instalador)
  splash/
    splash-logo.png  — 320px, el splash lo carga vía `file://` desde Electron Main (no pasa por
                       el bundle del renderer, ver docs/desktop/SPLASH.md)
  web/
    favicon.ico      — 16, 32, 48px — reservado para una futura versión web (no usado todavía)
    favicon-32.png   — ídem, PNG suelto

apps/desktop/renderer/public/branding/
  logo.png           — 256px, un único archivo servido por Vite en `/branding/logo.png` y usado
                       a distintos tamaños vía CSS en: sidebar (MainLayout), header (mismo
                       elemento — la app no tiene una barra de header separada del sidebar) y
                       Configuración (SettingsPage)
```

No se generó un ícono `.icns` de macOS ni variantes de packaging adicionales — este milestone no
incluye un instalador (ver docs/desktop/SPLASH.md y el M12.5 original: "dejar la estructura
preparada sin implementar un instalador completo").

## Cómo regenerar

Si el logo fuente (`/logo.png`) se reemplaza en el futuro, todo lo demás se regenera con:

```bash
pnpm --filter @stocknegozia/desktop branding:generate
```

El script:

1. Lee `/logo.png` (nunca lo escribe).
2. Genera todos los archivos listados arriba en `assets/branding/generated/` y en
   `apps/desktop/renderer/public/branding/`.

Ver `apps/desktop/scripts/generate-branding-assets.spec.ts` para las validaciones automáticas
(tamaños esperados, transparencia conservada, el source no se toca, estructura del `.ico`).
