/**
 * Mock manual de Jest para `expo-audio` — a diferencia de `expo-camera`, que `jest-expo` mockea
 * automáticamente vía `NativeModulesProxy`, la clase `AudioPlayer` de `expo-audio` extiende
 * `globalThis.expo.SharedObject` (API nativa nueva basada en JSI) y falla al importarse en el
 * entorno de Jest ("Cannot read properties of undefined (reading 'prototype')") sin este mock.
 * Solo se implementa lo que usa `useScanBeep.ts` (`seekTo`, `play`) — no hace falta más para los
 * tests actuales, que no ejercitan reproducción de audio real. Mismo mock que `apps/mobile`.
 */
export function useAudioPlayer() {
  return {
    seekTo: () => Promise.resolve(),
    play: () => undefined,
  };
}
