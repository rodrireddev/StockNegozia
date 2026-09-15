// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateBrandingAssets, SOURCE_LOGO_PATH } from "./generate-branding-assets.mjs";

describe("generateBrandingAssets", () => {
  let outputRoot: string;
  let rendererPublicDir: string;

  beforeEach(() => {
    outputRoot = mkdtempSync(path.join(tmpdir(), "stocknegozia-branding-out-"));
    rendererPublicDir = mkdtempSync(path.join(tmpdir(), "stocknegozia-branding-renderer-"));
  });

  afterEach(() => {
    rmSync(outputRoot, { recursive: true, force: true });
    rmSync(rendererPublicDir, { recursive: true, force: true });
  });

  it("no modifica el logo fuente", async () => {
    const before = readFileSync(SOURCE_LOGO_PATH);
    await generateBrandingAssets(SOURCE_LOGO_PATH, outputRoot, rendererPublicDir);
    const after = readFileSync(SOURCE_LOGO_PATH);
    expect(after.equals(before)).toBe(true);
  });

  it("genera icon.ico multi-resolución para Windows", async () => {
    await generateBrandingAssets(SOURCE_LOGO_PATH, outputRoot, rendererPublicDir);
    const icoPath = path.join(outputRoot, "windows", "icon.ico");
    const buffer = readFileSync(icoPath);

    // Header ICO: reserved(2)=0, type(2)=1, count(2)=N — ver https://en.wikipedia.org/wiki/ICO_(file_format)
    expect(buffer.readUInt16LE(0)).toBe(0);
    expect(buffer.readUInt16LE(2)).toBe(1);
    expect(buffer.readUInt16LE(4)).toBe(7); // 16,24,32,48,64,128,256
  });

  it("genera los PNG de app en alta resolución conservando transparencia", async () => {
    await generateBrandingAssets(SOURCE_LOGO_PATH, outputRoot, rendererPublicDir);
    for (const size of [256, 512]) {
      const filePath = path.join(outputRoot, "app", `icon-${size}.png`);
      const metadata = await sharp(filePath).metadata();
      expect(metadata.width).toBe(size);
      expect(metadata.height).toBe(size);
      expect(metadata.hasAlpha).toBe(true);
    }
  });

  it("genera el logo del splash", async () => {
    await generateBrandingAssets(SOURCE_LOGO_PATH, outputRoot, rendererPublicDir);
    const splashPath = path.join(outputRoot, "splash", "splash-logo.png");
    const metadata = await sharp(splashPath).metadata();
    expect(metadata.width).toBe(320);
    expect(metadata.height).toBe(320);
    expect(metadata.hasAlpha).toBe(true);
  });

  it("genera favicon.ico y favicon-32.png para uso web futuro", async () => {
    await generateBrandingAssets(SOURCE_LOGO_PATH, outputRoot, rendererPublicDir);
    const favicon = readFileSync(path.join(outputRoot, "web", "favicon.ico"));
    expect(favicon.readUInt16LE(4)).toBe(3); // 16,32,48

    const favicon32 = await sharp(path.join(outputRoot, "web", "favicon-32.png")).metadata();
    expect(favicon32.width).toBe(32);
  });

  it("genera un único logo para el renderer (sidebar/header/settings)", async () => {
    await generateBrandingAssets(SOURCE_LOGO_PATH, outputRoot, rendererPublicDir);
    const rendererLogoPath = path.join(rendererPublicDir, "logo.png");
    const metadata = await sharp(rendererLogoPath).metadata();
    expect(metadata.width).toBe(256);
    expect(metadata.hasAlpha).toBe(true);
    expect(statSync(rendererLogoPath).size).toBeGreaterThan(0);
  });
});
