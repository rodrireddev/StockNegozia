import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsInput } from "@stocknegozia/validation";
import { updateSettings } from "../api/settings.api";

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
