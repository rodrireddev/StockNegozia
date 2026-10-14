#!/usr/bin/env node
/**
 * Arma el backend que viaja dentro del instalador de Desktop (`build-resources/backend`), que
 * electron-builder copia a `resources/apps/backend` (ver `extraResources` en electron-builder.yml).
 *
 * En la app empaquetada, `backend-manager.ts` lanza `resources/apps/backend/dist/main.js` con el
 * propio ejecutable de Electron (`ELECTRON_RUN_AS_NODE`) y ese directorio como `cwd` — el backend
 * lee sus migraciones de `src/database/migrations` relativo al `cwd` (ver `database.module.ts`).
 * Por eso el bundle lleva:
 *   - `dist/` (backend compilado) y `src/database/migrations/` (SQL + journal),
 *   - `node_modules/` sólo de producción, con los paquetes del workspace ya compilados,
 *   - `better-sqlite3` recompilado para el Node embebido de Electron (ABI distinta del Node del
 *     sistema: con el binario equivocado el backend no levanta).
 *
 * Uso: `node scripts/prepare-backend-bundle.mjs` (lo corre `pnpm dist:win`).
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(desktopDir, "..", "..");
const backendDir = join(repoRoot, "apps", "backend");
const outDir = join(desktopDir, "build-resources", "backend");
const isWindows = process.platform === "win32";
const require = createRequire(join(desktopDir, "package.json"));

function run(command, args, cwd = repoRoot) {
  console.log(`> ${command} ${args.join(" ")}`);
  // `pnpm`/`npm` son `.cmd` en Windows y necesitan shell; un ejecutable con ruta absoluta (como
  // `process.execPath`, que suele estar en "C:\Program Files\...") se lanza directo, sin shell,
  // para que los espacios de la ruta no la corten.
  const needsShell = isWindows && !/[\\/]/.test(command);
  execFileSync(command, args, { cwd, stdio: "inherit", shell: needsShell });
}

// 1. Compilar los paquetes compartidos y el backend — uno por uno y en orden de dependencias
//    (en paralelo, `shared` podía compilar antes de que existiera el `dist` de `api-contracts`).
for (const name of ["api-contracts", "validation", "shared", "backend"]) {
  run("pnpm", ["--filter", `@stocknegozia/${name}`, "run", "build"]);
}

// 2. package.json de producción: las dependencias externas del backend y de los paquetes del
//    workspace (que no se instalan desde ningún registry: se copian en el paso 5).
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const workspacePackages = {
  "@stocknegozia/api-contracts": "packages/api-contracts",
  "@stocknegozia/validation": "packages/validation",
  "@stocknegozia/shared": "packages/shared",
};
const readPackage = (dir) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
const backendPackage = readPackage(backendDir);
const externalDependencies = {};
for (const pkg of [
  backendPackage,
  ...Object.values(workspacePackages).map((path) => readPackage(join(repoRoot, path))),
]) {
  for (const [name, version] of Object.entries(pkg.dependencies ?? {})) {
    if (!name.startsWith("@stocknegozia/")) externalDependencies[name] ??= version;
  }
}
writeFileSync(
  join(outDir, "package.json"),
  JSON.stringify(
    {
      name: "stocknegozia-backend-bundle",
      private: true,
      version: backendPackage.version,
      main: "dist/main.js",
      dependencies: externalDependencies,
    },
    null,
    2,
  ),
);

// 3. Código compilado + migraciones.
cpSync(join(backendDir, "dist"), join(outDir, "dist"), { recursive: true });
cpSync(
  join(backendDir, "src", "database", "migrations"),
  join(outDir, "src", "database", "migrations"),
  { recursive: true },
);

// 4. Dependencias externas de producción.
run("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--no-package-lock"], outDir);

// 5. Paquetes del workspace: se copian tal cual (`package.json` + `dist`). No se usa `pnpm pack`
//    porque respeta el `.gitignore` de la raíz (que ignora `dist/`) y dejaba afuera casi todo el
//    código compilado.
for (const [name, path] of Object.entries(workspacePackages)) {
  const source = join(repoRoot, path);
  const target = join(outDir, "node_modules", ...name.split("/"));
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  cpSync(join(source, "package.json"), join(target, "package.json"));
  cpSync(join(source, "dist"), join(target, "dist"), { recursive: true });
}

// 6. better-sqlite3 para el Node embebido de Electron: se reemplaza el binario (compilado para el
//    Node del sistema por `npm install`) por el precompilado oficial para esta versión de Electron.
const electronVersion = require("electron/package.json").version;
run(
  process.execPath,
  [
    join(outDir, "node_modules", "prebuild-install", "bin.js"),
    "--runtime",
    "electron",
    "--target",
    electronVersion,
    "--arch",
    "x64",
    "--platform",
    "win32",
    "--force",
  ],
  join(outDir, "node_modules", "better-sqlite3"),
);

console.log(`\nBackend listo para empaquetar en ${outDir} (Electron ${electronVersion}).`);
