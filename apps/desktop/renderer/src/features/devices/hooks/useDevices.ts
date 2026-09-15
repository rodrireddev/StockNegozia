import { useQuery } from "@tanstack/react-query";
import { fetchDevices } from "../api/devices.api";

export function useDevices() {
  return useQuery({ queryKey: ["devices"], queryFn: fetchDevices });
}
