import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/api/endpoints/auth";

/** `GET /auth/devices/me` — pensado para mobile, no depende de conocer el propio `deviceId`. */
export function useDeviceInfo() {
  return useQuery({
    queryKey: ["auth", "devices", "me"],
    queryFn: getMe,
  });
}
