import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// TODO: reemplazar por el dominio real una vez que StockNegozia tenga uno — de este valor
// dependen el sitemap.xml generado, las URLs canónicas y las etiquetas Open Graph/Twitter.
const SITE_URL = "https://stocknegozia.app";

export default defineConfig({
  site: SITE_URL,
  integrations: [tailwind(), sitemap()],
  compressHTML: true,
});
