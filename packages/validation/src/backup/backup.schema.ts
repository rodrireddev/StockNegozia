import { z } from "zod";

/**
 * Ambos endpoints reciben una ruta absoluta de archivo — nunca elegida por el Renderer: siempre
 * la resuelve un diálogo nativo de Electron Main (`showSaveDialog`/`showOpenDialog`), ver
 * docs/backup/BACKUP_RESTORE.md §Seguridad.
 */
export const createBackupSchema = z.object({
  destinationPath: z
    .string({ required_error: "La ruta de destino es obligatoria" })
    .trim()
    .min(1, "La ruta de destino es obligatoria"),
});

export const validateBackupSchema = z.object({
  filePath: z
    .string({ required_error: "La ruta del archivo es obligatoria" })
    .trim()
    .min(1, "La ruta del archivo es obligatoria"),
});

export type CreateBackupInput = z.infer<typeof createBackupSchema>;
export type ValidateBackupInput = z.infer<typeof validateBackupSchema>;
