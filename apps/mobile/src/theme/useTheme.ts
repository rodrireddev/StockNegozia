import { useColorScheme } from "react-native";
import { darkColors, lightColors, type ThemeColors } from "./colors";

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
}

/** Sigue el esquema de color del sistema operativo — sin toggle manual (fuera de alcance de M15). */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return { colors: dark ? darkColors : lightColors, dark };
}
