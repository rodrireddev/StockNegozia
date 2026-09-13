import { z } from "zod";

export const backendEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  STOCKNEGOZIA_PORT: z.coerce.number().int().positive().default(38123),
  STOCKNEGOZIA_DATA_DIR: z.string().optional(),
});

export type BackendEnv = z.infer<typeof backendEnvSchema>;
