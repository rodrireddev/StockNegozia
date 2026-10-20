import { useDeviceInfo } from "./useDeviceInfo";

/** Secciones que el backend le rechaza (403) a un dispositivo con rol Cajero — ver
 *  `ManagerDeviceGuard` en apps/backend. Se ocultan del menú en vez de mostrar un error. */
export const CASHIER_HIDDEN_HREFS: readonly string[] = [
  "/purchases",
  "/profits",
  "/cash-adjustments",
];

/** `false` mientras `/auth/devices/me` no respondió: nunca se oculta nada "por las dudas". */
export function useIsCashier(): boolean {
  return useDeviceInfo().data?.role === "cashier";
}
