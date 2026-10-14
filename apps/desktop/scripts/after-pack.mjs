/**
 * Hook `afterPack` de electron-builder: copia el backend armado por
 * `scripts/prepare-backend-bundle.mjs` a `resources/apps/backend` de la app desempaquetada, antes
 * de que se genere el instalador NSIS.
 *
 * No se usa `extraResources` para esto porque electron-builder siempre excluye las carpetas
 * `node_modules` de ahí (aun con `filter`), y el backend las necesita: NestJS, better-sqlite3
 * compilado para Electron y los paquetes del workspace.
 */
import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));

export default async function afterPack(context) {
  const source = join(scriptsDir, "..", "build-resources", "backend");
  if (!existsSync(join(source, "node_modules"))) {
    throw new Error(
      "Falta build-resources/backend — correr `node scripts/prepare-backend-bundle.mjs` antes de empaquetar.",
    );
  }
  const target = join(context.appOutDir, "resources", "apps", "backend");
  cpSync(source, target, { recursive: true });
  console.log(`  • backend copiado a ${target}`);
}
