import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render(
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ): string;
      remove(widgetId: string): void;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptLoadPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar Cloudflare Turnstile"));
      document.head.appendChild(script);
    });
  }
  return scriptLoadPromise;
}

/**
 * Widget de Cloudflare Turnstile (registro / password-reset siempre, login recién si el backend
 * responde `CAPTCHA_REQUIRED`) — a diferencia de `apps/mobile-mini` (React Native, sin DOM propio,
 * lo embebe vía WebView), el renderer de Electron ya es Chromium: se carga el script oficial
 * directo. El backend siempre re-verifica el token contra la API de Cloudflare
 * (`TurnstileService`) — este widget solo lo consigue, nunca decide si es válido.
 */
export function TurnstileWidget({
  resetKey,
  onToken,
}: {
  resetKey: number;
  onToken: (token: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Ref en vez de dependencia directa del effect: `resetKey` es lo único que debe forzar un
  // challenge nuevo (montar de nuevo el widget) — un `onToken` recreado en cada render del padre
  // no tiene por qué tirar abajo y volver a levantar el widget de Cloudflare.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          "error-callback": () => onTokenRef.current(null),
          "expired-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [resetKey]);

  return <div ref={containerRef} />;
}
