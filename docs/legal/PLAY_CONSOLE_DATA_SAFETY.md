# Data Safety de Play Console — respuestas para StockNegozia Mini

Referencia para completar la sección "Data safety" del listing de Play Console. No es un
documento público — es una guía interna de qué tildar, basada en una auditoría real del código
(`apps/mobile-mini` + `apps/cloud-backend`), no en suposiciones. Actualizar este archivo cada vez
que se agregue una fuente nueva de datos (ej. el día que se implemente el Cofounder Pack).

Taxonomía verificada contra la documentación oficial de Google
([Data safety form](https://support.google.com/googleplay/android-developer/answer/10787469)) al
24/09/2026.

## 1. "¿Tu app recolecta o comparte alguno de los tipos de datos requeridos?"

**Sí.**

## 2. Tipos de datos — uno por uno

### Personal info → Email address

- **¿Se recolecta?** Sí.
- **¿Se comparte con terceros?** No.
- **¿Es efímero (no se guarda)?** No, se persiste en `apps/cloud-backend` (tabla `users`) mientras
  la cuenta exista.
- **¿Es opcional o requerido?** Opcional — la cuenta entera es opcional (doc
  `ADS_CREDITS_GAMIFICATION.md` §3), la app funciona 100% sin ella.
- **Propósito(s):** Account management, App functionality (Fraud prevention/security también
  aplica: anti-abuso de referidos/créditos).

### Personal info → User IDs

- **¿Se recolecta?** Sí (id interno de cuenta, código de referido).
- **¿Se comparte?** No.
- **Opcional/requerido:** Opcional (mismo motivo que el email).
- **Propósito(s):** Account management, App functionality, Fraud prevention/security and compliance.

### Financial info → Purchase history

- **¿Se recolecta?** **No, todavía** — el Cofounder Pack (pago único vía Google Play Billing) está
  documentado pero no implementado (ver `ADS_CREDITS_GAMIFICATION.md` §1). Cuando se implemente:
  Google Play Billing procesa el pago directamente, StockNegozia solo recibe una confirmación de
  compra (nunca número de tarjeta) — en ese momento hay que volver a esta sección y marcar
  "Purchase history: sí, no compartido, requerido solo si el usuario elige comprar".

### App activity → App interactions

- **¿Se recolecta?** Sí — cada movimiento de `credit_ledger` (motivo: `rewarded_ad`,
  `daily_mission`, `streak_milestone`, `referral`, `welcome_bonus`, compra de entitlement) queda
  guardado con fecha, motivo y monto.
- **¿Se comparte?** No.
- **Opcional/requerido:** Opcional (depende de tener cuenta).
- **Propósito(s):** App functionality (hacer andar el sistema de créditos), Fraud prevention.

### Device or other IDs

- **¿Se recolecta?** Sí — el ID de publicidad (advertising ID) de Android, recolectado por el SDK
  de Google AdMob (`react-native-google-mobile-ads`) cuando el usuario elige ver un anuncio
  recompensado.
- **¿Se comparte?** **Sí, con Google** (AdMob) — para servir y medir el anuncio.
- **Opcional/requerido:** Opcional — ver un anuncio es siempre una elección del usuario, nunca
  automático.
- **Propósito(s):** Advertising or marketing.
- Nota: la app implementa el flujo de consentimiento UMP de Google
  (`AdsConsent.gatherConsent()` en `src/app/_layout.tsx`, más "Opciones de privacidad de anuncios"
  en Beneficios) antes de inicializar el SDK de ads — relevante si Play Console pregunta por el
  manejo de consentimiento para usuarios de EEA/UK.

### Photos and videos → Photos

- **¿Se recolecta?** **No**, según la definición de Google ("collection" = se transmite fuera del
  dispositivo). Las fotos de producto (`expo-camera`/`expo-image-picker`) se guardan como
  `dataUri` en el SQLite local (`products.image`) y nunca salen del dispositivo — no hay upload a
  ningún servidor nuestro. Marcar como no recolectado; opcionalmente aclarar en la sección de
  permisos por qué se pide la cámara.

### App info and performance (crash logs, diagnostics)

- **¿Se recolecta?** No — no hay ningún SDK de crash reporting ni analítica propia integrado
  (sin Sentry/Firebase Crashlytics/etc., verificado contra `package.json`). El SDK de AdMob puede
  recolectar sus propias señales de diagnóstico bajo la declaración de datos de Google, no algo
  que StockNegozia recolecte por su cuenta.

### El resto de las categorías (Location, Contacts, Messages, Health and fitness, Audio files,

Files and docs, Calendar, Web browsing)

- **¿Se recolecta?** No, ninguna. Confirmado contra `app.json`: los únicos permisos declarados son
  `CAMERA` y `MODIFY_AUDIO_SETTINGS` (este último para el beep del scanner, con
  `recordAudioAndroid: false` explícito en ambos plugins de cámara/audio — nunca se graba audio).
  Sin permiso de ubicación, contactos, ni storage más allá de lo que el propio `image-picker`
  necesita.

## 3. Prácticas de seguridad

- **¿Los datos viajan encriptados?** Sí — HTTPS (una vez que `apps/cloud-backend` esté deployado;
  ver punto de despliegue del doc de monetización).
- **¿El usuario puede pedir que se borren sus datos?** Sí — en la app (Beneficios → Eliminar mi
  cuenta) y por un link web (`/eliminar-cuenta` en la landing) — cumple la exigencia de Google de
  ofrecer ambos caminos.
- **¿La recolección de datos es requerida para usar la app?** No — todo el sistema de
  cuenta/créditos es opcional, la app funciona completa sin crear cuenta.

## 4. Contacto para la ficha de la app

Email de soporte/privacidad: **rdevtoledo@gmail.com** (mismo que en Política de Privacidad y
Términos de Servicio, `apps/landing/src/pages/privacidad.astro` / `terminos.astro`).

## Pendiente de actualizar cuando cambie el código

- Cofounder Pack (Google Play Billing) → agregar "Financial info: Purchase history".
- Si algún día se agrega analítica/crash reporting → agregar "App info and performance".
- Si `apps/mobile-mini` alguna vez sube fotos de producto a un servidor (hoy no lo hace) → agregar
  "Photos and videos".
