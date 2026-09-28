import { StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function buildHtml(siteKey: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; display: flex; justify-content: center; }
    </style>
  </head>
  <body>
    <div
      class="cf-turnstile"
      data-sitekey="${siteKey}"
      data-callback="onTurnstileToken"
      data-error-callback="onTurnstileError"
      data-expired-callback="onTurnstileExpired"
    ></div>
    <script>
      function onTurnstileToken(token) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "token", token: token }));
      }
      function onTurnstileError() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "error" }));
      }
      function onTurnstileExpired() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "expired" }));
      }
    </script>
  </body>
</html>`;
}

/**
 * Widget web de Cloudflare Turnstile embebido vía WebView (no hay SDK nativo de RN). El backend
 * SIEMPRE re-verifica el token contra la API de Cloudflare — esto solo lo consigue, nunca decide
 * si es válido. `resetKey` fuerza un remount (challenge nuevo) después de cada intento de submit,
 * porque el token se consume en el `siteverify` del backend aunque el intento falle por otro motivo.
 */
export function TurnstileWidget({
  resetKey,
  onToken,
}: {
  resetKey: number;
  onToken: (token: string | null) => void;
}) {
  return (
    <View style={styles.container}>
      <WebView
        key={resetKey}
        originWhitelist={["*"]}
        source={{ html: buildHtml(SITE_KEY) }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { type: string; token?: string };
            onToken(data.type === "token" ? (data.token ?? null) : null);
          } catch {
            onToken(null);
          }
        }}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 70, overflow: "hidden" },
  webview: { backgroundColor: "transparent" },
});
