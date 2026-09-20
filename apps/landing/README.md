# @stocknegozia/landing

Landing page pública de StockNegozia — sitio de marketing estático (Astro + Tailwind), separado
del frontend real de la app (`apps/desktop`). No consume el backend ni ninguna API: es contenido
estático pensado para presentar el producto y ser indexado por buscadores.

## Stack

- **Astro** — genera HTML estático por página, sin JS de framework en el cliente (mejor
  rendimiento/Core Web Vitals, que es en sí mismo una señal de SEO).
- **Tailwind CSS** (misma versión que `apps/desktop`) para consistencia de estilos en el monorepo.
- **`@astrojs/sitemap`** — genera `sitemap-index.xml` automáticamente en cada build.

## Desarrollo

```bash
pnpm --filter @stocknegozia/landing dev       # http://localhost:4321
pnpm --filter @stocknegozia/landing build      # astro check + build a dist/
pnpm --filter @stocknegozia/landing preview    # sirve el build de dist/
```

## SEO / AEO (Google + buscadores/asistentes de IA)

- `src/layouts/BaseLayout.astro`: título, meta description, URL canónica, Open Graph/Twitter Card
  y JSON-LD (`SoftwareApplication` + `FAQPage`, generado desde `src/data/faq.ts` para que el
  marcado estructurado nunca quede desincronizado del texto visible).
- `public/robots.txt`: permite el rastreo explícito a crawlers de IA conocidos (GPTBot, ClaudeBot,
  PerplexityBot, Google-Extended, etc.) además de buscadores tradicionales.
- `public/llms.txt`: resumen del producto en Markdown plano, siguiendo la convención
  [llms.txt](https://llmstxt.org/) para que los asistentes de IA puedan leer el contexto del sitio
  sin tener que parsear el HTML/CSS de la landing.
- HTML semántico (un solo `<h1>`, jerarquía de headings, `<details>/<summary>` para el FAQ en vez
  de un acordeón con JS) para que el contenido sea legible tanto para crawlers clásicos como para
  los que no ejecutan JavaScript.

## Antes de publicar

- Reemplazar `SITE_URL` en [`astro.config.mjs`](./astro.config.mjs) (y el `Sitemap:` de
  `public/robots.txt`) por el dominio real — de eso dependen las URLs canónicas y el sitemap.
- Reemplazar los textos de ejemplo del mockup de Ventas en
  [`src/components/Hero.astro`](./src/components/Hero.astro) si se quiere usar una captura real de
  la app en su lugar.
