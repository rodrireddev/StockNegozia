import { registerAs } from "@nestjs/config";
import { cloudBackendEnvSchema } from "@stocknegozia/validation";

function loadConfig() {
  const env = cloudBackendEnvSchema.parse(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    // `PORT` (Render/Heroku-style) gana sobre `CLOUD_BACKEND_PORT` si está seteada — ver el
    // comentario en `cloudBackendEnvSchema`.
    port: env.PORT ?? env.CLOUD_BACKEND_PORT,
    databaseUrl: env.DATABASE_URL,
    adminJwtSecret: env.ADMIN_JWT_SECRET,
    accountJwtSecret: env.ACCOUNT_JWT_SECRET,
    logLevel: env.LOG_LEVEL,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS
      ? env.CORS_ALLOWED_ORIGINS.split(",")
          .map((origin) => origin.trim())
          .filter((origin) => origin.length > 0)
      : [],
    gmailUser: env.GMAIL_USER,
    gmailClientId: env.GMAIL_CLIENT_ID,
    gmailClientSecret: env.GMAIL_CLIENT_SECRET,
    gmailRefreshToken: env.GMAIL_REFRESH_TOKEN,
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

export const appConfig = registerAs("app", loadConfig);
