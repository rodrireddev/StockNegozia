const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const workspaceRoot = path.resolve(__dirname, "../..");

const config = getDefaultConfig(__dirname);

/**
 * Por defecto, `getDefaultConfig` detecta el workspace pnpm y agrega TODAS las apps del monorepo a
 * `watchFolders` (`apps/backend`, `apps/desktop`, `apps/landing`, `apps/web-client`, la otra app
 * mobile) — incluye cosas como `apps/desktop/release` (instaladores de Windows, cientos de MB) que
 * esta app nunca importa. En Windows, sin Watchman instalado, el watcher de Metro tiene un timeout
 * fijo de 4 minutos (`@expo/metro-file-map`, `Watcher.js` `MAX_WAIT_TIME`) que ese volumen de
 * archivos ajenos supera, y `expo start` termina fallando con "Failed to start watch mode.".
 * Acotamos `watchFolders` a lo que `apps/mobile` realmente resuelve: su propio código, el
 * `node_modules` raíz (dependencias hoisted de pnpm) y los paquetes del workspace de los que
 * depende (ver "dependencies" en package.json).
 */
config.watchFolders = [
  __dirname,
  path.resolve(workspaceRoot, "node_modules"),
  path.resolve(workspaceRoot, "packages/shared"),
  path.resolve(workspaceRoot, "packages/validation"),
  path.resolve(workspaceRoot, "packages/api-contracts"),
];

/**
 * Expo SDK 57 no detecta Watchman automáticamente (`config.resolver.useWatchman` es `false` por
 * defecto salvo que se active a mano — ver `@expo/cli` `createFileMap-fork.js`). Sin esto, Metro
 * usa su watcher nativo/Node de reserva, que en este monorepo no llega a levantar dentro del
 * timeout de 4 minutos ni con `watchFolders` acotado. Requiere tener Watchman instalado
 * (`winget install facebook.watchman` en Windows).
 */
config.resolver.useWatchman = true;

module.exports = config;
