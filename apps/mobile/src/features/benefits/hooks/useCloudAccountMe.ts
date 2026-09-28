import { useQuery } from "@tanstack/react-query";
import { useCloudAccountStatus } from "@/devices/useCloudAccountStatus";
import { getMe } from "../api/cloudAccount.api";

/** Saldo/racha de la cuenta cloud logueada en el desktop emparejado — `undefined` mientras no hay sesión. */
export function useCloudAccountMe() {
  const { data: status } = useCloudAccountStatus();

  return useQuery({
    queryKey: ["cloud-account", "me"],
    queryFn: getMe,
    enabled: status?.linked === true,
  });
}
