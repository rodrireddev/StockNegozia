const { getDefaultConfig } = require("expo/metro-config");

// Necesario para que Metro pueda importar los `.sql` de las migraciones de Drizzle como texto
// crudo (`src/database/migrations/migrations.js`, generado por `drizzle-kit generate` — ver
// https://orm.drizzle.team/quick-sqlite/expo). `apps/mobile` no lo necesita: no tiene base de
// datos local propia.
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("sql");

module.exports = config;
