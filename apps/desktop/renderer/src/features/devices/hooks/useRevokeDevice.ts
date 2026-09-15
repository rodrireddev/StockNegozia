import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revokeDevice } from "../api/devices.api";

export function useRevokeDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeDevice(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
