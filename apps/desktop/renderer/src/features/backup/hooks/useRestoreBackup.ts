import { useMutation, useQueryClient } from "@tanstack/react-query";
import { restoreBackup } from "../api/backup.api";

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreBackup,
    onSuccess: (outcome) => {
      // Un restore exitoso reemplaza el estado completo de la aplicación — no alcanza con
      // invalidar una lista puntual (ej. ["products"]), como hacen las demás mutaciones.
      if (outcome.success) {
        void queryClient.invalidateQueries();
      }
    },
  });
}
