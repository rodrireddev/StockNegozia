import { useWindowDimensions } from "react-native";
import { tabletBreakpoint } from "@/theme/tokens";

export interface DeviceSize {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
}

/** Lógica pura, separada del hook de RN para poder testearla sin mockear `react-native`. */
export function computeDeviceSize(width: number, height: number): DeviceSize {
  return {
    width,
    height,
    isTablet: width >= tabletBreakpoint,
    isLandscape: width > height,
  };
}

/**
 * Fuente única de la decisión "phone vs. tablet" — basada en `useWindowDimensions` (se actualiza
 * en rotación/multi-window), no solo en el ancho estático del dispositivo. Ver
 * docs/mobile/MOBILE_CLIENT.md §Phone + Tablet: el breakpoint es sobre el espacio disponible, no
 * sobre el modelo de dispositivo.
 */
export function useDeviceSize(): DeviceSize {
  const { width, height } = useWindowDimensions();
  return computeDeviceSize(width, height);
}
