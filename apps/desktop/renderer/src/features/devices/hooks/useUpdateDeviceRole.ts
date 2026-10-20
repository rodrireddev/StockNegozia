import type { DeviceRole } from "@stocknegozia/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateDeviceRole } from "../api/devices.api";

export function useUpdateDeviceRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (role: DeviceRole) => updateDeviceRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
