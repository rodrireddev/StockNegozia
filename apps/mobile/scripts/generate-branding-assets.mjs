// @ts-check
/**
 * Genera los assets de branding de Android a partir del logo fuente (`logo.png` en la raíz del
 * monorepo) — mismo principio que `apps/desktop/scripts/generate-branding-assets.mjs`: el source
 * nunca se modifica, todo lo que hay en `assets/images/` acá es reproducible corriendo este
 * script de nuevo (`pnpm --filter @stocknegozia/mobile branding:generate`).
 *
 * Tamaños según la documentación de Expo (`icon`, `android.adaptiveIcon.*`, `splash-icon`,
 * `favicon` para el preview web) — ver docs/mobile/MOBILE_CLIENT.md §Branding.
 */
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");

export const SOURCE_LOGO_PATH = path.join(repoRoot, "logo.png");

const ICON_SIZE = 1024;
const ADAPTIVE_FOREGROUND_SIZE = 1024;
// El foreground de un adaptive icon se recorta por el sistema a un círculo/squircle central —
// dejamos margen (safe zone ~66% del lienzo) para que el logo no quede cortado en ningún launcher.
const ADAPTIVE_LOGO_SCALE = 0.66;
const SPLASH_ICON_SIZE = 400;
const FAVICON_SIZE = 48;

async function main() {
  const sourceBuffer = await readFile(SOURCE_LOGO_PATH);
  const imagesDir = path.join(__dirname, "..", "assets", "images");
  await mkdir(imagesDir, { recursive: true });

  const generated = [];

  async function write(name, buffer) {
    const filePath = path.join(imagesDir, name);
    await writeFile(filePath, buffer);
    generated.push(filePath);
  }

  // --- icon.png: ícono principal (1024x1024, sin transparencia forzada — Android/iOS lo recortan) ---
  await write(
    "icon.png",
    await sharp(sourceBuffer)
      .resize(ICON_SIZE, ICON_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer(),
  );

  // --- Android adaptive icon: foreground (logo centrado con safe zone), background (color sólido) ---
  const logoScaled = Math.round(ADAPTIVE_FOREGROUND_SIZE * ADAPTIVE_LOGO_SCALE);
  const logoResized = await sharp(sourceBuffer)
    .resize(logoScaled, logoScaled, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const foreground = await sharp({
    create: {
      width: ADAPTIVE_FOREGROUND_SIZE,
      height: ADAPTIVE_FOREGROUND_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logoResized, gravity: "center" }])
    .png()
    .toBuffer();
  await write("android-icon-foreground.png", foreground);
  await write(
    "android-icon-background.png",
    await sharp({
      create: {
        width: ADAPTIVE_FOREGROUND_SIZE,
        height: ADAPTIVE_FOREGROUND_SIZE,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer(),
  );
  // Monochrome (Android 13+, íconos temáticos/Material You): el launcher re-tiñe este layer con
  // el color del tema del usuario usando su canal alfa como máscara — el color/detalle interno de
  // la imagen no importa, solo la silueta. Reutilizamos el mismo foreground compuesto: cumple el
  // contrato (`android.adaptiveIcon.monochromeImage`) sin una segunda pipeline de imagen.
  await write("android-icon-monochrome.png", await sharp(foreground).png().toBuffer());

  // --- splash-icon.png: mostrado centrado sobre el `backgroundColor` de expo-splash-screen ---
  await write(
    "splash-icon.png",
    await sharp(sourceBuffer)
      .resize(SPLASH_ICON_SIZE, SPLASH_ICON_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  );

  // --- favicon.png: solo relevante para `expo start --web` (preview de desarrollo, no un target de M15) ---
  await write(
    "favicon.png",
    await sharp(sourceBuffer)
      .resize(FAVICON_SIZE, FAVICON_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer(),
  );

  for (const file of generated) {
    console.log(`[branding] generado: ${path.relative(path.join(__dirname, ".."), file)}`);
  }
}

main().catch((error) => {
  console.error("[branding] falló la generación de assets:", error);
  process.exitCode = 1;
});
