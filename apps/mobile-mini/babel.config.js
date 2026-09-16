module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Necesario para que las migraciones de Drizzle (`src/database/migrations/migrations.js`)
    // puedan `import` un `.sql` como el string crudo de su contenido — ver
    // https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite. `apps/mobile` no lo necesita: no
    // tiene base de datos local propia.
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};
