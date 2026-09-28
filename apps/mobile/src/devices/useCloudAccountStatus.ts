import { useQuery } from "@tanstack/react-query";
import type { CloudAccountStatusDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/api/client";

/**
 * `GET /cloud-account/status` — proxy de `apps/backend` hacia `apps/cloud-backend` (doc
 * ADS_CREDITS_GAMIFICATION.md §6). Decide si "Beneficios" existe en el menú: `linked: false`
 * mientras el desktop emparejado no tenga una sesión de cuenta cloud activa — este dispositivo
 * nunca ve el JWT ni la URL de cloud-backend, solo este booleano.
 */
export function useCloudAccountStatus() {
  return useQuery({
    queryKey: ["cloud-account", "status"],
    queryFn: () => apiGet<CloudAccountStatusDto>("/cloud-account/status"),
  });
}
