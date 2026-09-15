// @ts-check
/**
 * Genera los assets de branding derivados a partir del logo fuente (`logo.png` en la raíz del
 * monorepo). Ver assets/branding/README.md para el contrato completo: el source nunca se
 * modifica, todo lo demás en `assets/branding/generated/` y `renderer/public/branding/` es
 * reproducible corriendo este script de nuevo.
 *
 * Uso: `pnpm --filter @stocknegozia/desktop branding:generate`
 */
import sharp from "sharp";
import toIco from "to-ico";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");

export const SOURCE_LOGO_PATH = path.join(repoRoot, "logo.png");

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const APP_ICON_SIZES = [256, 512];
const FAVICON_SIZES = [16, 32, 48];
const SPLASH_SIZE = 320;
const RENDERER_LOGO_SIZE = 256;

/**
 * @param {string} sourcePath ruta al logo fuente (nunca se escribe)
 * @param {string} outputRoot raíz donde se genera `assets/branding/generated/`
 * @param {string} rendererPublicDir raíz donde se genera `branding/` para el renderer (Vite `public`)
 */
export async function generateBrandingAssets(sourcePath, outputRoot, rendererPublicDir) {
  const sourceBuffer = await readFile(sourcePath);
  const sourceMeta = await sharp(sourceBuffer).metadata();

  const windowsDir = path.join(outputRoot, "windows");
  const appDir = path.join(outputRoot, "app");
  const splashDir = path.join(outputRoot, "splash");
  const webDir = path.join(outputRoot, "web");
  await Promise.all(
    [windowsDir, appDir, splashDir, webDir, rendererPublicDir].map((dir) =>
      mkdir(dir, { recursive: true }),
    ),
  );

  const generatedFiles = [];

  async function resizedPngBuffer(size) {
    return sharp(sourceBuffer)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }

  // --- Windows: icon.ico multi-resolución ---
  const icoPngBuffers = await Promise.all(ICO_SIZES.map((size) => resizedPngBuffer(size)));
  const icoBuffer = await toIco(icoPngBuffers);
  const icoPath = path.join(windowsDir, "icon.ico");
  await writeFile(icoPath, icoBuffer);
  generatedFiles.push(icoPath);

  // --- App: PNGs de alta resolución (packaging futuro / iconos no-Windows) ---
  for (const size of APP_ICON_SIZES) {
    const buffer = await resizedPngBuffer(size);
    const filePath = path.join(appDir, `icon-${size}.png`);
    await writeFile(filePath, buffer);
    generatedFiles.push(filePath);
  }

  // --- Splash: logo servido por Electron Main vía file:// (no pasa por el bundle del renderer) ---
  const splashBuffer = await resizedPngBuffer(SPLASH_SIZE);
  const splashPath = path.join(splashDir, "splash-logo.png");
  await writeFile(splashPath, splashBuffer);
  generatedFiles.push(splashPath);

  // --- Web: favicon multi-resolución para uso web futuro ---
  const faviconPngBuffers = await Promise.all(FAVICON_SIZES.map((size) => resizedPngBuffer(size)));
  const faviconIco = await toIco(faviconPngBuffers);
  const faviconIcoPath = path.join(webDir, "favicon.ico");
  await writeFile(faviconIcoPath, faviconIco);
  generatedFiles.push(faviconIcoPath);
  const favicon32Path = path.join(webDir, "favicon-32.png");
  await writeFile(favicon32Path, await resizedPngBuffer(32));
  generatedFiles.push(favicon32Path);

  // --- Renderer: un único PNG para sidebar/header/settings (distintos tamaños vía CSS) ---
  const rendererLogoPath = path.join(rendererPublicDir, "logo.png");
  await writeFile(rendererLogoPath, await resizedPngBuffer(RENDERER_LOGO_SIZE));
  generatedFiles.push(rendererLogoPath);

  return { generatedFiles, sourceMeta };
}

async function main() {
  const outputRoot = path.join(repoRoot, "assets", "branding", "generated");
  const rendererPublicDir = path.join(__dirname, "..", "renderer", "public", "branding");
  const { generatedFiles, sourceMeta } = await generateBrandingAssets(
    SOURCE_LOGO_PATH,
    outputRoot,
    rendererPublicDir,
  );
  console.log(`Logo fuente: ${SOURCE_LOGO_PATH} (${sourceMeta.width}x${sourceMeta.height}, alpha=${sourceMeta.hasAlpha})`);
  console.log("Assets generados:");
  for (const file of generatedFiles) {
    console.log(`  - ${path.relative(repoRoot, file)}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
