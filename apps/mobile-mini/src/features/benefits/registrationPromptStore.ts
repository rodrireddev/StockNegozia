import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * No es un dato sensible — mismo criterio que `theme/themeStore.ts`/`onboarding/onboardingStore.ts`
 * (`AsyncStorage`). A diferencia del onboarding (que se marca una sola vez para siempre), esto se
 * puede volver a mostrar: doc §3, "en un hito alto... sube de intensidad" — descartarlo en el
 * umbral bajo no debería silenciarlo para siempre.
 */
const STORAGE_KEY_PREFIX = "stocknegozia.registrationPromptDismissed.";

export async function isRegistrationPromptDismissed(tier: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${tier}`)) === "true";
  } catch {
    return false;
  }
}

export async function dismissRegistrationPrompt(tier: string): Promise<void> {
  await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${tier}`, "true");
}
