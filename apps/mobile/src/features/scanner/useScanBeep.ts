import { useAudioPlayer } from "expo-audio";
import scanBeepSource from "../../../assets/sounds/scan-beep.wav";

/**
 * Beep corto (sintetizado, ~130ms) que confirma que un producto se agregó durante el escaneo
 * continuo de Ventas/Compras (ver `scanFeedback.ts`) — pensado para escanear varios códigos
 * seguidos sin mirar la pantalla cada vez. `useAudioPlayer` mantiene el archivo precargado durante
 * toda la vida del componente; `seekTo(0)` antes de cada `play()` es necesario para poder repetir
 * el sonido en escaneos consecutivos (si no, `play()` no hace nada porque el player ya terminó de
 * reproducir el clip).
 */
export function useScanBeep() {
  const player = useAudioPlayer(scanBeepSource);

  return function playScanBeep() {
    player.seekTo(0).then(
      () => player.play(),
      () => {
        // Si seekTo falla (ej. el player todavía no cargó el asset), no interrumpe el flujo de
        // escaneo — el toast visual sigue siendo la confirmación principal.
      },
    );
  };
}
