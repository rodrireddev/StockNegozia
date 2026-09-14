import { z } from "zod";

/**
 * `z.coerce.boolean()` haría `Boolean("false") === true` (cualquier string no vacío es truthy),
 * así que las variables booleanas se parsean explícitamente contra "true"/"false".
 */
const booleanEnvFlag = (defaultValue: boolean) =>
  z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? defaultValue : value === "true"));

export const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  STOCKNEGOZIA_PORT: z.coerce.number().int().positive().default(38123),
  STOCKNEGOZIA_DATA_DIR: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_DIR: z.string().optional(),
  LOG_PERSISTENCE: booleanEnvFlag(true),
  LOG_CONSOLE: booleanEnvFlag(true),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;
