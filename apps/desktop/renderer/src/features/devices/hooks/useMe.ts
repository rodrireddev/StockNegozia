import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "../api/devices.api";

export function useMe() {
  return useQuery({ queryKey: ["devices", "me"], queryFn: fetchMe });
}
