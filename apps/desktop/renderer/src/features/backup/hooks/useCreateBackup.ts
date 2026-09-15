import { useMutation } from "@tanstack/react-query";
import { createBackup } from "../api/backup.api";

export function useCreateBackup() {
  return useMutation({ mutationFn: createBackup });
}
