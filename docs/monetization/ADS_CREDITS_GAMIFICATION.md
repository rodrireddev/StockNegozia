# Monetización con AdMob: créditos, gamification y financiamiento de features

Estado: **idea en diseño, nada implementado todavía**. Este doc es el resumen de la sesión de
diseño para retomarla en el futuro sin perder el razonamiento detrás de cada decisión.

**Alcance: esto suma un backend nuevo y un frontend nuevo al monorepo, además de los que ya
existen** (`apps/backend`, `apps/mobile`, `apps/mobile-mini`, `apps/desktop`, `apps/landing`) —
no reemplaza ni modifica ninguno de los actuales. El backend nuevo es multi-tenant (cuentas,
créditos, tablero de pedidos — ver sección 6, `apps/backend` actual es solo pairing LAN); el
frontend nuevo es el panel de administración (sección 7, React + Vite, separado de todo lo demás).

## Principio rector

`mobile-mini` es una herramienta de trabajo diaria (POS/inventario de un comercio chico), no un
juego. Ninguna mecánica de esta propuesta puede bloquear el flujo core (escanear, vender, cargar
stock) detrás de un anuncio o de una cuenta. Todo lo que sigue es "extra" opcional — la app tiene
que seguir siendo 100% usable, gratis y local sin registrarse, igual que hoy.

## 1. Modelo de créditos

Un monedero de créditos único (se descartó moneda doble — le agrega complejidad de entendimiento
al usuario sin necesidad; el mismo efecto se logra balanceando bien los números). Cada feature
premium nueva solo necesita un precio en créditos, no una integración de ads nueva.

### Fuentes (cuánto se gana)

| Fuente | Créditos | Regla |
|---|---|---|
| Bienvenida (una vez) | 20 | Al registrarse — arranca el monedero con algo real (efecto dotación) |
| Quests de setup (una vez c/u) | 5 c/u (~20 total) | Primer producto, primera venta, primer escaneo, perfil completo — acciones que el usuario iba a hacer igual |
| Hitos de racha (no trickle diario) | día3=2, día7=5, día14=10, día30=20 | El streak counter en sí ya es el refuerzo psicológico diario; dar créditos cada día por abrir la app infla demasiado el pasivo |
| Misiones diarias (repetibles) | 3 créditos, tope 1/día | "Registrá 3 ventas", "actualizá stock de 5 productos" — rotan cada día |
| Rewarded ad | 3 / 2 / 1 decreciente, tope 3/día (máx 6/día) | Cooldown entre anuncios (ej. 2h). Tope conservador a propósito — ver sección de revenue |
| Referido validado | 15, tope 10/mes con retorno completo | "Éxito" = actividad real del invitado en su 1ª semana, no la sola instalación |

**Total pasivo realista (sin mirar ningún ad), usuario consistente:** hitos de racha (~37/mes) +
misiones (~90/mes) ≈ **~127 créditos/mes**.

### Sinks (en qué se gastan — ninguno toca el flujo diario)

| Ítem | Costo | Por qué |
|---|---|---|
| Exportar reporte (PDF/Excel) | 10 | Necesidad frecuente (contador/AFIP), tiene que ser barato y rápido |
| **Backup automático en la nube — 30 días** | **160** | El motivador ancla: perder el celular sin backup = perder el negocio (miedo a perder datos > gamification). Es una suscripción en créditos, no un pago único — da un motivo recurrente de seguir juntando |
| Sacarse anuncios (si se agregan banners/interstitials) — 30 días | 150 | Mismo patrón recurrente que el backup |
| Crear pedido de feature nuevo (sección 4) | 20 | Fricción anti-spam |
| Votar/boostear un pedido existente | 5 c/u, tope 30 (6 votos) por ítem/usuario | Retorno de peso decreciente desde el 3er voto en el mismo ítem |

**Chequeo de balance — por qué esta combinación sí funciona:** sin mirar ningún anuncio, el pasivo
(~127/mes) queda **33 créditos corto** del backup (160) — una brecha chica y real, cerrable con
un puñado de anuncios repartidos en el mes, no con el tope todos los días. La primera versión de
este diseño tenía el error inverso: pasivo tan generoso que cubría el backup solo, sin necesidad
de mirar ni un ad — y la corrección siguiente se pasó para el otro lado, exigiendo casi el tope de
anuncios *todos los días del mes* para juntar el backup solo con ads. Este es el punto medio: con
uso moderado de ads (ni siquiera al tope) ya se cubre cómodo; con el tope todos los días sobra
margen para reportes y otros sinks.

Opcional: paquetes de créditos comprables por IAP para quien no quiere mirar anuncios (funnel
híbrido: ads para el usuario sensible al precio, IAP para el que paga por comodidad).

### Cofounder Pack — pago único, cupo de 100

Salida directa para quien no quiere mirar ads nunca, complementaria al sistema de créditos, no un
reemplazo. **Riesgo a blindar:** una "lifetime deal" sin límite compromete a mantener premium
gratis para siempre a ese usuario mientras la infraestructura (hoy $0 en free tier) eventualmente
escala con el crecimiento real — por eso el cupo es una condición del modelo, no un detalle de
marketing.

- **Cupo: 100 usuarios**, no reabre después. Es la versión self-service (vía landing, sin
  reclutamiento manual) del mismo espíritu que el programa de fundadores de la Etapa 1 — ese es
  a mano y gratis a cambio de feedback (20-50 personas), este es pago y abierto a cualquiera.
- **Precio: ~$20 USD** (o equivalente en ARS) — por encima del valor estimado de varios años de
  revenue de ads de un usuario comprometido (~$4-6 USD/año mirando ads al tope), para que sea un
  buen trade para el negocio, no una regalada.
- **Incluye, de por vida** (esto es lo que justifica pagar $20 de una vez frente a nunca pagar
  nada o ir juntando créditos):
  1. Sin publicidad, nunca — no necesita mirar un rewarded ad para nada de lo siguiente.
  2. Backup automático en la nube incluido — el beneficio ancla, resuelto para siempre sin gastar
     créditos cada mes.
  3. Nivel Pro desde el día uno (el multiplicador más alto de créditos, por si igual quiere
     acumular para otra cosa).
  4. Voto con peso reforzado en el tablero de pedidos — financió el roadmap por adelantado, tiene
     más influencia real en qué se construye después.
  5. Acceso anticipado a funcionalidades nuevas, antes que el resto de los usuarios.
  6. Badge visible de "Cofounder" en su perfil/app.
  7. Lugar en una lista pública de fundadores (si quiere aparecer) — cierra el loop con la prueba
     social que se usa para crecer en la Etapa 1.
- **Pendiente técnico:** en Android, un pago único por contenido digital dentro de la app suele
  tener que pasar por Google Play Billing, no un cobro directo — a definir en la implementación.

### Revenue real esperado (AdMob, Argentina)

Argentina/LatAm es tráfico tier-2/tier-3 para AdMob: eCPM de rewarded video ronda **$3-6 cada
1000 vistas** (vs. $15-40 en mercados tier-1 como US/UK), es decir **$0.003-0.006 por vista**.

- Usuario que mira el tope (3 ads/día) todos los días: ~90 vistas/mes → **$0.27-0.54 USD/mes**.
- Etapa 1 (50-100 comercios, ~mitad mirando ads con regularidad): **~$7-27 USD/mes** de revenue
  total. Chico a propósito — en esta etapa el sistema de créditos es una herramienta de retención
  y validación, no un modelo de ingresos; la plata real llega con escala (miles de usuarios), no
  subiendo el tope de ads con 50-100.
- El tope se mantiene en 3/día (no en 15-20/día como permiten benchmarks de juegos casuales)
  porque este es un comercio manejando su negocio, no alguien jugando — pedirle más presión de
  ads que eso rompe la confianza que sostiene todo el diseño, por unos centavos más de revenue.
- Como el hosting corre en free tier (sección 6), cualquier revenue de ads ya es ganancia neta
  desde el día uno — no hay costo de infraestructura que compensar todavía.

Todos los números de esta sección van en una tabla de config versionada (ver sección 7), no
hardcodeados — se ajustan con datos reales después de la Etapa 1, no a ojo.

### 1bis. Ads en `apps/desktop` (Electron) — pendiente de confirmar con el proveedor

`mobile-mini` usa AdMob (android/ios, confirmado, soporte nativo oficial). **Ni AdSense ni AdMob
sirven para `apps/desktop`** — investigado en detalle, no es una suposición:

- **AdSense**: política de programa de Google, textual: *"Google ads... may not be: Integrated
  into a software application... including toolbars"*. Las únicas excepciones de WebView que
  Google autoriza son para apps **móviles** registradas con el Google Mobile Ads SDK (o casos
  puntuales como Chrome Custom Tabs/Trusted Web Activities en Android, SFSafariViewController en
  iOS) — nada de eso cubre un Electron de escritorio. Forzarlo (cargar el script de AdSense en un
  WebView de Electron) viola la política igual, aunque técnicamente cargue: Google prohíbe el
  *contexto de distribución* ("software application"), no el motor de renderizado — el riesgo real
  es terminación de la cuenta de AdSense.
- **AdMob**: es explícitamente solo para apps móviles nativas (Android/iOS) y engines tipo
  Unity/Cocos. No tiene soporte para desktop/Electron en absoluto, ni siquiera con matices.
- **BlueStacks** (el caso que motivó esta investigación, Electron confirmado —
  `BlueStacksServices.exe` es litealmente un proceso Electron): a diferencia de lo que este doc
  decía antes, **sí carga dominios de ads de Google** (`pagead2.googlesyndication.com`,
  `adservice.google.com` — confirmado por gists públicos de gente bloqueándolos vía hosts file).
  Pero eso no prueba que sea seguro replicar: Google documenta que su script de detección de
  contexto WebView/in-app **puede identificar el entorno incluso con un User-Agent
  personalizado** — no hay garantía de que el anuncio renderice, y si renderiza, la política
  escrita se sigue violando igual. La explicación más probable es una relación/tolerancia directa
  con Google dado su escala (500M+ instalaciones), no un truco replicable sin riesgo por un equipo
  chico sin ese respaldo.
- **Microsoft Advertising SDK (HTML/JS)** — alternativa investigada y descartada para esta app:
  es específicamente para apps **UWP** (Universal Windows Platform), empaquetadas y distribuidas
  por la Microsoft Store vía Partner Center (Visual Studio + WinJS, ad unit pedido por mail a
  Microsoft). `apps/desktop` es Electron con instalador propio, no UWP — usarlo exigiría
  re-empaquetar y distribuir también por la Microsoft Store, un proyecto aparte, no agregar una
  librería.

**Candidatos evaluados para desktop:**

| Candidato | Formato | Soporta Electron/desktop empaquetado | Bloqueante conocido |
|---|---|---|---|
| [AppLixir](https://www.applixir.com/) | Rewarded video, SDK web (script tag + JS) | **Confirmado en su [Terms of Service](https://www.applixir.com/terms-of-service/) real** (no en la copy de marketing): habla genéricamente de "your websites or applications", sin cláusula tipo AdSense que prohíba apps de escritorio/software empaquetado. Las únicas prohibiciones explícitas son de contenido (pornografía, discurso de odio), no de plataforma | **Mínimo 5.000 DAU para integrar** (su FAQ, no el ToS — es un umbral de onboarding, no una cláusula legal) — muy por encima de los 20-100 comercios de Etapa 1. Este bloqueante no se resuelve leyendo el contrato, solo alcanzando ese tráfico o negociándolo directamente |
| [Playwire](https://www.playwire.com/desktop-app) | Rewarded video + display, header bidding | Tienen una línea de producto **específica para "desktop apps"** ("built from scratch" para ese entorno, no herramientas web forzadas) | No publican mínimo de tráfico ni eCPM — solo vía contacto de ventas. No mencionan Electron por nombre, hay que preguntar directamente |
| Meta Audience Network | Rewarded video, banner, interstitial | **Descartado** — confirmado en su propio repo oficial (`facebook/FBAudienceNetwork`): "monetize your iOS and Android apps". Es mobile-only, sin excepción, igual que AdMob | N/A, no aplica a desktop |
| Adsterra / PropellerAds | Popunder, push, social bar, algo de video | Aceptan "software" de forma más amplia que AdSense/AdMob, sin la restricción explícita de "no software applications" | No son rewarded-video-first (formatos más agresivos/intrusivos: popunders, push) — encajan mal con el principio rector del doc de no romper confianza del usuario por unos centavos de revenue; quedan como último recurso, no como primera opción |

**Orden de acción sugerido, cuando `apps/desktop` tenga tráfico real** (no antes — escribir sin
poder dar un número de usuarios real desperdicia el primer contacto):

1. **Playwire primero** — es el único que se posiciona explícitamente para "desktop apps", vale más
   la pena que resolver la duda de AppLixir. Sin contacto ni email público encontrado en su sitio;
   hay que usar su formulario de ventas en https://www.playwire.com/desktop-app.
   - Preguntar: ¿soportan específicamente apps Electron (Chromium empaquetado, sin dominio público
     real, distribuidas como instalador)? ¿Mínimo de tráfico/DAU? ¿eCPM esperado para
     Argentina/LatAm? ¿Tienen SSV (verificación server-side) para rewarded video, equivalente a la
     de AdMob?
2. **AppLixir como alternativa** — `info@applixir.com` (único email público, no hay sales/support
   separado) o +1 425-390-4167. La duda contractual ya está resuelta (ver tabla — su ToS no
   prohíbe apps empaquetadas), así que no hace falta escribirles solo para eso. Lo que sí sigue
   sin respuesta y solo se resuelve hablando con ellos: (a) si el mínimo de 5.000 DAU es
   negociable con tráfico menor pero consistente; (b) si depende de un "dominio" registrado, cómo
   se registra una app sin URL pública; (c) si ofrecen SSV; (d) eCPM real para Argentina/LatAm (el
   $4–15 publicado es global, mismo motivo por el que la sección 1 corrige el eCPM de AdMob con
   benchmark regional).
3. **Google Ad Manager (ex-DFP) como respaldo final** — tiene un camino de excepción fuera del
   molde estándar de AdSense, pero es enterprise: requiere aplicar y ser aprobado por Google, no es
   self-service, puede tardar semanas y suele pedir volumen mínimo también. No se investigó en
   profundidad porque no era la prioridad.

**Autoservicio sin mínimo de tráfico, encontrado y descartado como reemplazo del rewarded — pero
anotado como opción de banner pasivo**: [Adsterra](https://adsterra.com/) y
[PropellerAds](https://propellerads.com/) aceptan publishers sin mínimo de tráfico ni llamada de
ventas (registro directo, aceptan "apps" como fuente de tráfico válida, no solo sitios web) — el
perfil "autoservicio + proceso legal" más parecido a AdSense que se encontró. **Pero** están
armados para formatos agresivos (popunders, push, social bar, interstitials), no para un formato
"rewarded" opt-in — no encajan como fuente de créditos sin romper el principio rector (nunca
romper la confianza del usuario por unos centavos). Quedan anotados **solo como candidato para un
banner pasivo de desktop** (ver opción de diseño abajo), nunca como reemplazo del rewarded ad de
`mobile-mini`.

### Opción de diseño anotada (sin implementar todavía): banner lateral en desktop, puramente pasivo

Decisión tomada en conversación, pendiente de diseño visual y de elegir el network real (Adsterra/
PropellerAds u otro) cuando se retome. Se evaluó y se descartó premiar por tiempo con el banner
abierto (house ad o de terceros) — **decisión final: `apps/desktop` nunca es fuente de créditos,
solo sink.** Ganar créditos sigue siendo exclusivo de `mobile-mini` (rewarded ads + racha +
misiones + referidos, doc §1/§2); esto evita de raíz el problema de "tráfico incentivado" con
cualquier network de terceros (Adsterra/PropellerAds lo prohíben explícitamente) y no obliga a
recalibrar el balance pasivo de la sección 1.

- **`apps/desktop` tiene espacio de sobra en la interfaz** para un banner lateral — display simple,
  siempre visible, sin interacción del usuario, sin ningún crédito otorgado por verlo. Es revenue
  directo del negocio, no parte del sistema de recompensas.
- **"Sacarse los ads" ya es cross-platform sin cambios de schema**: `entitlements` (tipo
  `remove_ads`, ver `apps/cloud-backend/src/database/schema/entitlements.ts`) está atado a
  `userId`, no a una plataforma — comprar/ganar ese entitlement con créditos ganados en
  `mobile-mini` quita el banner de desktop *y* lo que corresponda ahí, con la misma cuenta. No hace
  falta un entitlement por plataforma.
- [x] **Banner implementado** (sidebar derecho, `AdBanner`) — muestra el house ad activo
  (`GET /ads/house-ad/active`, siempre público) con imagen/título/texto/botón, registra una sola
  impresión por house ad mostrado (`useRef` para no duplicar en re-renders), y no renderiza nada
  si no hay ninguno activo o el cloud-backend no responde — nunca un espacio roto en la pantalla
  principal de venta. Nuevo cliente HTTP propio (`cloud-api-client.ts`) separado del que ya usa
  `apps/desktop` contra el backend local (SQLite/LAN pairing) — son dos backends distintos.
  - **Alcance de esta etapa, a propósito acotado**: `apps/desktop` no tiene ningún sistema de
    cuenta cloud todavía (no hay login, JWT, ni forma de identificar qué comercio es) — así que
    aunque `entitlements` (`remove_ads`) ya está atado a `userId` y no a plataforma (ver abajo), el
    banner de desktop *todavía no puede consultar si el comercio ya lo pagó* con créditos ganados
    en `mobile-mini`. Agregar login de cuenta cloud a `apps/desktop` es un feature aparte, más
    grande, no hecho en esta pasada.
  - **Todavía sin la red de Adsterra real** — no hay cuenta creada (alta humana, no automatizable)
    y el schema ya está listo para el día que la haya: mismo patrón que `mobile-mini`, pedir
    `GET /ads/placements/:key?platform=desktop` en vez de (o adicional a) el house ad. Ese
    endpoint hoy exige cuenta (`AccountJwtGuard`) para android/ios — para desktop va a necesitar
    quedar público o con un gate distinto, ya que desktop no tiene cuenta (ver punto anterior).
  - Test de componente nuevo (`AdBanner.spec.tsx`): no renderiza nada sin house ad activo, no
    renderiza nada si falla la consulta, muestra el house ad y registra la impresión una sola vez.
    typecheck, lint, build de producción y los 149 tests (146 + 3 nuevos) en verde. No se pudo
    verificar visualmente en la app Electron nativa desde este entorno (usa APIs de
    `contextBridge` que no existen fuera de Electron) — mismo límite que el resto de piezas
    Electron-específicas de esta sesión.
- Falta: decidir si el precio en créditos de "sacarse ads" (doc §1: 150/30 días) sigue siendo el
  mismo ahora que cubre dos superficies en vez de una, o si conviene ajustarlo desde el panel
  admin una vez que haya datos — y todo lo de arriba (cuenta cloud en desktop, red real de
  Adsterra).

**Decisión: Adsterra sobre PropellerAds, para cuando se implemente el banner.** Comparado
directo contra fuentes primarias (no marketing de terceros) al momento de decidir:

| | Adsterra | PropellerAds |
|---|---|---|
| Formato banner pasivo | **Sí, de primera clase** — "Banners" aparece explícitamente en su [página de publishers](https://adsterra.com/publishers/) junto a Popunder/Social Bar/Native/Smartlink | Existe ("Native Banners", según blog posts), pero su [homepage actual](https://propellerads.com/) ya ni lo menciona — hoy se presentan ante todo como Push/Popunder/Interactive/Telegram Mini Apps, el perfil más agresivo/intrusivo de los dos |
| Mínimo de tráfico | Ninguno, aprobación ~10 min (su propia página) | Ninguno, aprobación automática (fuentes secundarias coinciden) |
| Cobrar desde Argentina | PayPal, Paxum, wire, cripto — mínimo **$5 vía Paxum** | PayPal, Payoneer, Skrill, wire, cripto — mínimo **$5** en la mayoría de los métodos |

Ninguno publica términos específicos para Argentina (ambos dicen "depende del país en el
dashboard"), así que en la práctica cobrar no es más fácil con uno que con otro — los dos
resuelven la fricción típica de PayPal-en-Argentina con cripto/Paxum a igual mínimo. **El
desempate real es el formato**: Adsterra lo ofrece como producto de primera línea, PropellerAds
hoy se vende ante todo con formatos agresivos que el principio rector de este doc ya descartó
para StockNegozia. Con esto, cuando se retome el banner, arrancar directo por Adsterra en vez de
evaluar los dos de nuevo — PropellerAds queda anotado como alternativa si Adsterra no convence en
la práctica (fill/eCPM real para Argentina, que solo se sabe registrándose y probando).

**Mientras tanto**: `apps/desktop` no integra ningún network de ads de terceros todavía. El schema
del backend (`ad_placements`, ver sección 6) ya modela el campo de red como texto libre (no un enum
cerrado a admob/adsense) específicamente para no tener que migrar el schema cuando esto se
resuelva — ver `apps/cloud-backend/src/database/schema/ad-placements.ts`.

## 2. Gamification (capa de retención)

Research: apps con gamification ven +47% retención a 90 días (Deloitte 2024); usuarios que miran
aunque sea 1 rewarded ad tienen 53-68% retención a 30 días (ironSource).

- **Racha de uso diario** (no de mirar ads): abrir la app y hacer algo real (venta o movimiento de
  stock) mantiene la racha. Hitos (día 3, 7, 14, 30) dan créditos gratis.
- **Misiones diarias atadas a acciones de negocio reales**: "registrá 3 ventas", "actualizá stock
  de 5 productos". No requieren ads, multiplican sesiones/día.
- **Niveles (Bronce/Plata/Oro/Pro)** según uso acumulado (ventas, días de racha — no plata
  gastada). Niveles altos dan más créditos gratis por día y mejor conversión ad→crédito. Es lo que
  hace el sistema escalable: agregar un nivel es config, no código nuevo. El nivel más alto es el
  gancho natural para ofrecer una suscripción "Pro sin ads".
- Sin leaderboards ni features sociales — es un comerciante solo gestionando su negocio, no tiene
  sentido competir con otros usuarios.

**Motivo día 1 vs. motivo día 30+:** un usuario nuevo no sintió todavía el dolor de perder datos
ni necesitó un reporte — el backup/reportes no lo enganchan el primer día. El día 1 se engancha con
gratificación inmediata (créditos de bienvenida + créditos por completar el setup que iba a hacer
igual + un primer canje barato y visible ya). Los motivadores "fuertes" (backup, reportes) entran a
jugar recién desde la semana 2, cuando ya hay algo real en juego.

## 3. Cuenta opcional (login)

La app funciona completo sin cuenta. La cuenta solo desbloquea: ledger de créditos persistente
server-side (anti-abuso real — local se puede resetear reinstalando), sync entre dispositivos,
backup en la nube, nivel más alto, y el tablero de pedidos (sección 4).

**Decisión (implementada): racha y créditos son 100% cloud, detrás de cuenta — no existen
localmente sin login.** Esto simplifica el "caso migración" del diseño original: no hay racha ni
ledger de créditos locales que subir al registrarse (nunca se acumularon sin cuenta), así que no
hace falta un endpoint de migración de esos datos. `products`/`sales`/`stock` siguen siendo 100%
locales siempre, con o sin cuenta — esos nunca se suben al backend nuevo (ver sección 6, el
backend nuevo solo es fuente de verdad de lo account-gated).

**Disparador del CTA de registro — implementado** (OR de señales, ajustado a lo que sí se trackea
sin cuenta): ≥15-20 productos cargados, o ≥20 ventas — ambos ya existen en el SQLite local de
`mobile-mini` independientemente de este sistema. Se sacan del disparador original "≥5 días de
racha" y "≥30 créditos acumulados": esos conceptos ya no existen antes de tener cuenta.
`useRegistrationPrompt` (dos escalones: 15/20 y 100/100 productos/ventas, cada uno con su propio
"descartado" persistido — descartar el umbral bajo no silencia el alto) + `RegistrationPromptBanner`
en `MoreScreen` (solo en dev, igual que "Beneficios"). Banner liviano y descartable, nunca bloquea
nada, en ningún nivel. Typecheck/lint verdes; no probado en dispositivo.

Para LatAm, evaluar a futuro registro por teléfono/OTP (WhatsApp/SMS) en vez de email — muchos
comerciantes chicos no revisan mail seguido. No implementado todavía (email+password alcanza para
v1, ver `apps/cloud-backend/src/accounts`).

**Confirmación de email + recuperación de contraseña — implementado y probado end-to-end contra
Postgres real.** Ambos comparten `account_tokens` (token de un solo uso, hasheado SHA-256 igual
que `credentialHash` en apps/backend, nunca en texto plano; pedir uno nuevo invalida cualquier
anterior sin usar del mismo propósito). **Proveedor real: SendGrid — pasó por Resend, el SMTP real
de Gmail y la API REST de Gmail antes de volver acá.** Resend exige un dominio propio verificado
para mandar a cualquier destinatario (sin dominio, solo deja mandar a la casilla dueña de la
cuenta, descubierto al probar el registro con un email real). Se migró a SendGrid ("Single Sender
Verification", sin dominio) y el envío funcionó, pero llegaba a spam: sin dominio propio no hay
forma de alinear SPF/DKIM para un remitente `@gmail.com` mandado desde los servidores de un
tercero, y Gmail lo trata como spoofing. Se migró a `smtp.gmail.com` con una cuenta de Gmail de
verdad (`nodemailer`) — evitaba el spam, pero Render bloquea el tráfico saliente a los puertos SMTP
(25/465/587) en el plan free desde sep-2025 (ver su changelog), así que la conexión daba timeout
siempre. Se migró a la API REST de Gmail (`gmail.googleapis.com`, HTTPS/443, nunca bloqueado) para
evitar el bloqueo de puertos — pero requiere un proyecto de Google Cloud con facturación (tarjeta)
para las credenciales OAuth2, y esa alta no se pudo completar (tarjeta rechazada). **Vuelta final a
SendGrid**: es la única opción que funciona sin dominio propio ni tarjeta — la limitación conocida
y sin fix por ahora es que cae a la carpeta de spam del destinatario, hasta que haya presupuesto
para un dominio propio verificado en SendGrid (soluciona el spam sin cambiar nada más de código).
`EmailService` (`apps/cloud-backend/src/common/email.service.ts`) manda de verdad si
`SENDGRID_API_KEY`/`SENDGRID_FROM_EMAIL` están seteadas, y sigue logueando en vez de mandar si no
(mismo comportamiento de siempre en dev/test). Fuera de producción, el token también se devuelve en
la respuesta (`devToken`) para poder probar el flujo completo sin leer logs del servidor.

- `POST /accounts/verify-email/resend` (autenticado) + `POST /accounts/verify-email/confirm`
  (público — el token es la autenticación). Se manda automáticamente al registrarse, sin bloquear
  el registro si falla. `emailVerifiedAt` en `AccountMeDto`, `null` hasta confirmar — nunca
  bloquea nada (doc "nunca bloquea nada, en ningún nivel").
- `POST /accounts/password-reset/request` (siempre responde igual exista o no el email —
  anti-enumeración, mismo criterio que `ApiAccessGuard` de apps/backend) + `POST
  /accounts/password-reset/confirm` (deja logueado con la contraseña nueva, sin pedir login de
  nuevo).
- Probado de punta a punta: registro → `emailVerifiedAt: null` → confirmar con el token → pasa a
  tener fecha. Pedir reset → confirmar con contraseña nueva → login con la vieja falla (401) →
  login con la nueva funciona → reusar el mismo token de reset falla (400, ya consumido).
- `mobile-mini`: `ForgotPasswordForm` (dos pasos: pedir código, pegarlo + contraseña nueva —
  sin deep link todavía, el código se pega a mano) enlazado desde `LoginForm`;
  `EmailVerificationReminder` (reenviar + confirmar) dentro de "Beneficios" cuando
  `emailVerifiedAt` es `null`. Typecheck/lint verdes, no probado en dispositivo.

**Cloudflare Turnstile (captcha) en register / password-reset / login — implementado.** Registro y
`password-reset/request` piden Turnstile en cada intento; login solo lo exige a partir del 5°
intento fallido consecutivo desde la misma IP en los últimos 15 minutos (rate-limiting por abuso,
no en cada login normal) — se limpia apenas esa IP loguea bien una vez. El token del cliente nunca
alcanza por sí solo: `TurnstileService` (`apps/cloud-backend/src/accounts/turnstile.service.ts`)
siempre lo re-verifica contra `https://challenges.cloudflare.com/turnstile/v0/siteverify` del lado
del servidor antes de ejecutar cualquier lógica del endpoint. El contador de fallos vive en
Postgres (`login_failed_attempts`, `LoginAttemptsRepository`) y no en memoria — el proceso de
Render puede reiniciarse (free tier) y perdería el contador justo cuando más importa.

- `TURNSTILE_SECRET_KEY` opcional (mismo criterio que `SENDGRID_API_KEY`): sin ella, la
  verificación se omite fuera de producción (con un warning) para no obligar a nadie a dar de alta
  una cuenta de Cloudflare para correr el backend local; en producción, sin la key, el endpoint
  falla en vez de aceptar cualquier token.
- `main.ts` ahora hace `app.set("trust proxy", 1)` — sin esto, `req.ip` devolvía la IP interna del
  proxy de Render en vez de la del cliente real, tanto para el rate-limit por IP como para el
  `remoteip` que se manda a Cloudflare.
- `mobile-mini`: `TurnstileWidget` (`react-native-webview`, nueva dependencia) embebe el challenge
  web de Turnstile — no existe SDK nativo de RN. `RegisterForm`/`ForgotPasswordForm` lo muestran
  siempre; `LoginForm` arranca sin mostrarlo y recién lo renderiza si el backend responde
  `CAPTCHA_REQUIRED` (nuevo `ApiError.code` en `apps/mobile-mini/src/accounts/api/errors.ts`).
- Probado contra Postgres real: registro sin `turnstileToken` rechazado por Zod (400), registro con
  token válido (verificación omitida en dev) completa el flujo de punta a punta. **No probado**: el
  WebView en un dispositivo/emulador real (necesita rebuild nativo tras agregar
  `react-native-webview`), ni el rate-limit de login contra la tabla nueva — la migración
  (`0001_glossy_sunset_bain.sql`) se generó pero no se aplicó todavía (pendiente `db:migrate`).

### Logros — implementado y probado end-to-end, sin schema nuevo

Agrega lo que ya estaba diseñado (setup quests + hitos de racha + referido + Cofounder) en un solo
lugar para mostrarlo en "Beneficios" — no un catálogo nuevo, una vista sobre tablas que ya
existían. El monto de cada setup quest sale de `credit_config_items` ("source.setup_quest"),
balanceable desde el panel admin igual que todo lo demás — no queda ningún número hardcodeado.

- `POST /gamification/setup-quests/:questKey/claim` — el cliente lo llama cada vez que pasa la
  acción (ej. cada venta, no solo la primera); el backend decide si es la primera vez
  (idempotente por la constraint `unique(userId, questKey)` que ya existía). **`first_scan` y
  `profile_complete` ahora conectados también** — `first_scan` se dispara desde los tres
  consumidores del scanner compartido (`ProductsScreen`/`SalesScreen`/`PurchasesScreen`, en el
  handler `onDetected` de cada uno, no dentro de `ProductScanner` — ese componente sigue sin
  conocer nada de negocio ni de cuentas, mismo criterio de diseño ya documentado) apenas se lee un
  código, sin importar si matchea un producto o no — el logro es "usaste el scanner", no "el
  escaneo encontró algo". `profile_complete` se dispara al guardar el nombre del negocio en
  Ajustes (`SettingsScreen`, `BusinessNameCard`) — el único dato de perfil que existe hoy en
  `mobile-mini` — solo al ponerlo, nunca al borrarlo.
- `GET /accounts/me/achievements` — junta setup quests + hitos de racha + primer referido
  validado + Cofounder, en orden. Etiquetas en código (no en DB): agregar un logro nuevo es una
  entrada nueva en el mapa, nunca una migración. Sin niveles (Bronce/Plata/Oro): esos todavía no
  tienen lógica de cálculo real (Etapa 2, doc §5) — listarlos confundiría más de lo que suma.
- **Gap que quedó corregido de paso**: `POST /gamification/activity` (racha) nunca estaba conectado
  desde `mobile-mini` — sin esto, ningún hito de racha se iba a disparar nunca en uso real. Ahora
  se llama desde `useCreateSale` y `useAdjustStock` (venta y movimiento de stock, doc §2), siempre
  fire-and-forget (nunca bloquea la venta/ajuste, cualquier error se descarta silenciosamente).
- Probado de punta a punta contra Postgres real: reclamar `first_product` dos veces (segunda vez
  `alreadyClaimed: true`, no duplica créditos), quest key inválida rechazada (400), racha hasta
  día 3 con el hito apareciendo en el listado agregado junto al quest. `mobile-mini`: typecheck,
  lint y los 28 tests existentes en verde (sin regresiones en `useCreateProduct`/`useCreateSale`/
  `useAdjustStock`, que ya tenían tests).

## 4. Créditos → financiar desarrollo de features

Modelo validado por SaaS reales (Canny, ProductLift): los créditos **no compran la feature
directamente**, compran voto/prioridad en un tablero público de pedidos. Un crédito ganado con un
anuncio vale fracciones de centavo — si "comprar" significara compromiso garantizado de desarrollo,
cualquiera reclama horas de trabajo real mirando anuncios gratis.

- Crear un pedido nuevo cuesta créditos (ej. 5) — filtra spam.
- Votar/boostear un pedido existente cuesta créditos, con tope por usuario por pedido y retorno
  decreciente (mismo patrón anti-farming que los anuncios).
- Umbral de demanda, no contrato: al juntar suficientes créditos, el pedido pasa a "en evaluación"
  — la etiqueta deja explícito que es señal de prioridad, no una promesa, para evitar reclamos.
- Cuando se implementa, quienes votaron esa feature reciben un bonus de créditos o badge
  "colaborador" — cierra el loop y refuerza el engagement.
- Requiere cuenta (sección 3) y el tablero necesita contenido real antes de abrirse — ver criterio
  de salida de Etapa 1 en la sección 5.

## 5. Etapa 1 — crecer de cero, sin comunidad todavía

**Orden de ejecución** (no todo arranca el día 1):

1. Reclutar 20-50 "fundadores" a mano (DM personal, no posts en grupos): acceso gratis de por vida
   a lo premium a cambio de uso real + feedback. Objetivo: validar producto y sistema de créditos,
   no crecer todavía.
2. Recién con 10-20 fundadores activos, activar el **referido** (doble cara: invitador e invitado
   ganan créditos; "éxito" = actividad real del invitado en la primera semana, no la sola
   descarga; tope mensual con retorno decreciente). Pedirles 1-2 líneas de testimonio real.
3. Entrar a grupos de WhatsApp/Facebook de nicho (kiosqueros, almaceneros, distribuidores) con el
   testimonio de un comerciante real pegado — nunca en frío.
4. Landing (`apps/landing`) como punto de aterrizaje, mensaje de fricción mínima ("gratis, sin
   tarjeta, sin cuenta obligatoria"), midiendo qué canal convierte antes de gastar en ads pagados.

**Qué NO construir en esta etapa** (dev time limitado): tablero de pedidos con voto ponderado y
niveles Bronce/Plata/Oro no tienen sentido con 20-50 usuarios — quedan para Etapa 2. Lo mínimo
indispensable ahora: login/cuenta, ledger simple de créditos, racha, link de referido.

**Criterio de salida de Etapa 1:** ~50-100 comercios activos semanales con uso real, y que ya
pidan funcionalidades espontáneamente en el feedback — recién ahí el tablero de pedidos tiene
contenido real para no arrancar vacío.

Sin ads pagados en esta etapa — quema presupuesto antes de tener el funnel/retention validado.

## 6. Infraestructura

**`apps/backend` NO sirve para esto.** Es NestJS + Drizzle + SQLite, pero diseñado para
emparejamiento de dispositivos en LAN (`devices`, `pairing-sessions`, `API_ACCESS_MODE`,
`pairingHost` en `apps/backend/src/config`) — el desktop actúa de servidor local para que el
mobile se sincronice en la misma red. No es un backend multi-tenant para cuentas de usuario por
internet. Créditos/cuentas/tablero de pedidos necesitan un **backend nuevo, separado**:
`apps/cloud-backend` (scaffold y entidades ya creados — ver "Próximos pasos").

**Backend nuevo — recomendado:**
- Mismo stack que ya conocen (NestJS + Drizzle), pero con **Postgres** en vez de SQLite (SQLite no
  banca bien escrituras concurrentes multi-tenant), diseñado multi-tenant desde el arranque.
- Reusar `@stocknegozia/api-contracts`, `@stocknegozia/validation`, `@stocknegozia/shared`.
- Host: **Render** (free tier, sin tarjeta) para el servicio — Fly.io quedó descartado, en 2026
  dejó de tener free tier real (ahora pide tarjeta, solo da un trial de 7 días o 2h de VM).
  **Neon** para Postgres gratis, sin tarjeta (a diferencia de Supabase, que pausa el proyecto
  entero tras 1 semana de inactividad y requiere restaurarlo a mano desde el dashboard).
- Costo esperado para la Etapa 1 (50-100 comercios, tráfico bajo): **$0**. Trade-off a aceptar en
  esta etapa: tanto Render como Neon se "duermen" en inactividad — Render tarda 30-60s en
  responder la primera request tras 15 min sin tráfico; Neon se despierta solo con la próxima
  consulta, en segundos, sin intervención manual (a diferencia del pause manual de Supabase).
- **Mitigación del cold-start de Render, gratis:** un "pinger" externo (UptimeRobot o
  cron-job.org, gratis) le pega a un endpoint `/health` del backend cada ~10 minutos. Como Render
  recién duerme a los 15 min sin tráfico, si nunca pasan 15 min sin request el servicio no llega a
  dormirse — cold start eliminado a costo $0, sin sumar infraestructura propia. Ningún hosting
  gratis sin tarjeta evita el cold-start "de fábrica" (es lo que les permite ser gratis); este es
  el workaround estándar. Si en algún momento genera desconfianza depender de un truco así, la
  alternativa es Oracle Cloud "Always Free" (VM real, sin scale-to-zero, pide tarjeta solo para
  verificar identidad) o directamente pagar un plan sin scale-to-zero.
- Mantiene la lógica de créditos (el negocio real) bajo control propio, sin depender de un
  tercero que puede pausar el servicio o cambiar reglas de precio (pasó con Firebase Storage, ver
  abajo).

**Storage de backups — Cloudflare R2** (no Firebase Storage/Blaze): 10GB gratis, sin tarjeta,
egress siempre gratis (relevante porque el patrón de uso es "escribe seguido, lee poco" — se sube
el backup seguido, se restaura poco). Compatible con S3, se integra directo desde el backend nuevo
sin acoplarse a un proveedor. Backblaze B2 es alternativa equivalente (10GB gratis, egress gratis
hasta 3x lo almacenado).

**Por qué no Firebase para todo:**
- Desde feb-2026, Cloud Storage de Firebase requiere plan Blaze (con tarjeta) incluso en volumen
  mínimo — ya no hay Storage gratis sin card on file. Blaze con tarjeta sigue siendo $0 mientras
  el uso esté bajo cuota (solo cobra lo que excede el free tier de Google Cloud), pero sin
  budget alerts / App Check / reglas de seguridad bien cerradas hay riesgo real de factura
  sorpresa por un bug o abuso — pasó a devs chicos.
- Meter Firebase Auth+Firestore para todo duplicaría trabajo ya hecho (auth/users/backup ya
  existen en `apps/backend`, aunque para otro propósito) y generaría dos fuentes de verdad.
- **Sí usar** las piezas de Firebase gratis-para-siempre que no compiten con nada propio: **FCM**
  (avisar "tu feature pedida ya está lista", recordatorios de backup) y **Crashlytics**.

## 7. Panel de administración (para balancear el sistema con datos)

Sin esto, ajustar los números de la sección 1 significa tocar código y redeployar cada vez —
contradice la idea de config versionada. Es un panel interno (para el equipo, no para los
comerciantes), consume la API del backend nuevo (sección 6), protegido con su propio auth de
admin (no el mismo login que usan los comercios).

**Stack: React + TypeScript + Vite, frontend separado del backend** (se descartó Next.js — su
despliegue fuera de Vercel es más engorroso que lo que vale la pena para un panel interno sin
necesidad real de SSR). Estado: **Zustand** para estado de cliente (mismo patrón centralizado que
Redux, sin el boilerplate de actions/reducers/slices) + **TanStack Query** para estado de
servidor (llamadas a la API, cache, refetch) — ya se usa en `apps/mobile` y `apps/mobile-mini`,
mantiene consistencia con el resto del monorepo en vez de sumar un patrón nuevo. Reusa directo
`@stocknegozia/api-contracts` y `@stocknegozia/validation` para los tipos de la API.

**Deploy: Render Static Site, no Vercel.** El plan Hobby (gratis) de Vercel es explícitamente
solo para uso no comercial — su propia política cuenta como "uso comercial" cualquier deploy que
beneficie económicamente a alguien involucrado en el proyecto, así que un panel interno de un
negocio comercial no califica para Hobby gratis (necesitaría plan Pro, pago). Al ser Vite un
build estático (sin SSR), se despliega como **Static Site** en Render — mismo proveedor que ya
se eligió para el backend (sección 6), sin sumar un proveedor nuevo, y sin siquiera el
cold-start que sí aplica a los Web Services de Render: un static site son archivos servidos,
nunca se "duerme".

**Qué necesita, sin sobre-construir para la Etapa 1** (tabla editable + números planos alcanza,
nada de gráficos elaborados todavía — mismo criterio que ya se aplicó al tablero de pedidos y los
niveles):

1. **Editor de la tabla de config**: créditos por ads/misión/racha/referido, precios de cada sink,
   topes diarios y cooldowns — editable sin tocar código, versionado (ver qué cambió, cuándo, y
   poder revertir si un ajuste sale mal).
2. **Métricas para decidir con datos, no a ojo**:
   - De dónde vienen los créditos ganados (% ads / misiones / racha / referidos).
   - En qué se gastan (% backup / reportes / votos / sacarse ads) — si nadie compra un sink, el
     precio está mal, no hace falta adivinar.
   - % de usuarios que cubren cada sink solo con pasivo vs. necesitando ads.
   - Revenue real de AdMob vs. lo proyectado (sección 1) — para corregir el eCPM estimado con
     datos reales de Argentina en vez de benchmarks genéricos.

## Próximos pasos (cuando se retome)

- [x] Definir entidades del backend nuevo — `apps/cloud-backend` (NestJS + Drizzle + Postgres),
  schema en `apps/cloud-backend/src/database/schema/`: `users`, `credit_ledger`,
  `streak_milestone_claims`, `setup_quest_completions`, `daily_mission_completions`,
  `rewarded_ad_views`, `referrals`, `entitlements` (backup/sin-ads), `feature_requests`,
  `feature_votes`, `admin_users`, `credit_config_items` + `credit_config_item_revisions`.
  Migración inicial generada (`0000_mushy_shriek.sql`); typecheck/build/lint verdes.
  `feature_requests`/`feature_votes` tienen schema ya pero su módulo (controller/service, voto
  ponderado) queda para Etapa 2 — ver sección 5.
- [x] Diferenciar admin del comercio: `admin_users` es una tabla separada de `users` (los
  comercios), con su propio login — el admin es quien entra al panel a balancear el costo en
  créditos de cada feature. Cada feature/costo balanceable es una fila propia en
  `credit_config_items` (no un JSON con todos los números juntos), con historial de cambios por
  ítem en `credit_config_item_revisions` (valor anterior, nuevo, qué admin lo cambió, cuándo, nota
  opcional) — el panel admin (sección 7) lista esto como una tabla editable feature por feature,
  no un editor de "toda la config" en bloque.
- [x] Arquitectura de sync local↔cloud para v1 (implícito en el schema de arriba, no requirió una
  tabla nueva): local sigue siendo dueño de productos/ventas/stock (como hoy); el backend nuevo es
  fuente de verdad solo para lo account-gated (ledger de créditos, racha, referidos, tablero). El
  merge de cuentas entre múltiples dispositivos sigue pendiente (doc §3), no bloquea v1.
- [x] Módulo NestJS de auth de admin + balanceo de config (doc §7), primero de los módulos sobre
  las entidades: `POST /admin/auth/login` (email+password, hash scrypt, JWT de 12h — sin modo
  "development" que deje pasar todo, a diferencia de apps/backend) y `GET/PATCH
  /admin/credit-config[/:key]` + `GET /admin/credit-config/:key/revisions`, todo detrás de
  `AdminJwtGuard`. `pnpm run db:seed` en `apps/cloud-backend` crea el primer admin (desde
  `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`) y precarga los 21 ítems de `credit_config_items` con
  los números de la sección 1. typecheck/build/lint verdes.
- [x] Prototipo de integración AdMob rewarded en `mobile-mini`, con el ad unit de prueba oficial
  de Google (`TestIds.REWARDED` de `react-native-google-mobile-ads`) hasta tener cuenta de AdMob
  propia — ver `src/features/ads/hooks/useRewardedAd.ts`. Requiere dev client (no funciona en
  Expo Go); no se pudo probar en un emulador/dispositivo real desde acá, solo typecheck/lint.
- [x] Auth de cuenta en `mobile-mini` contra `apps/cloud-backend` (`src/accounts/`, mismo patrón
  de `SecureSessionStore`/`AccountContext` que `apps/mobile` usa para pairing LAN, pero
  completamente separado — este es email+password contra el backend nuevo, no pairing). Vive
  detrás de una pantalla nueva, "Beneficios" (`/benefits`, solo visible en dev por ahora): sin
  cuenta muestra login/registro, con cuenta muestra saldo + el test de rewarded ad. Pendiente
  antes de sacar el gate de dev: deployar `apps/cloud-backend` a algún lado alcanzable desde un
  celular real, y decidir SSV antes de que el reward de un ad otorgue créditos de verdad (hoy el
  test screen no acredita nada, solo prueba que el SDK carga/muestra).
- [x] Onboarding del sistema de créditos/anuncios en `mobile-mini` — 3 pantallas, en lenguaje
  simple (sin "ledger"/"gamification"/"SSV"), pensado para alguien sin vocabulario técnico (doc
  §5, público real: kiosqueros, almaceneros): (1) lo gratis de siempre no cambia, (2) cómo se
  ganan y para qué sirven los créditos (ads opcionales + uso normal de la app), (3) por qué el
  modelo es anuncios opcionales y no una cuota mensual fija. Se muestra una sola vez, en la
  primera instalación (`src/features/onboarding/onboardingStore.ts`, `AsyncStorage`, no vuelve a
  aparecer solo) — accesible de nuevo a pedido con "¿Cómo funciona esto?" en Beneficios
  (`OnboardingRecapButton`).
- Guion de reclutamiento de los primeros fundadores.
- Diseño de UI del panel de administración (sección 7) — ya tiene API para consumir
  (`/admin/auth/login`, `/admin/credit-config`).
- [x] Módulos de cuentas + créditos + racha + referidos — el "mínimo indispensable" de Etapa 1
  (doc §5). `POST /accounts/register` (con `referralCode` opcional) + `login` + `GET
  /accounts/me`; `GET /credits/me/balance` + `/ledger`; `POST /gamification/activity` (racha,
  hitos día 3/7/14/30, dispara validación de referido). Todos los montos salen de
  `credit_config_items` (nada hardcodeado), balanceables desde el panel admin ya construido.
  Probado end-to-end contra Postgres real: registro con bienvenida, racha hasta día 3 con hito +
  validación de referido (invitador e invitado acreditados correctamente), idempotencia
  confirmada (llamar `activity` dos veces el mismo día no duplica créditos).
- [x] "Migración" de un comercio que ya venía usando `mobile-mini` sin cuenta (doc §3, caso
  "usuario existente se registra") — **resuelto, y resultó ser más chico de lo que parecía**: no
  hay racha ni ledger de créditos locales que migrar (decisión ya tomada en la sección 3, ambos
  son 100% cloud desde el día uno). Lo que sí faltaba: `first_product`/`first_sale` (setup quests)
  se reclaman en el momento de crear/vender (`useCreateProduct`/`useCreateSale`) — alguien que ya
  tenía productos/ventas *antes* de registrarse nunca disparó ese claim, y si no vuelve a crear
  nada después de tener cuenta, perdía esos créditos para siempre (no por nada que hizo mal, solo
  por el orden en que pasaron las cosas). `backfillSetupQuestsFromLocalData()`
  (`gamificationTriggers.ts`) revisa el SQLite local (¿hay algún producto? ¿alguna venta?) y
  reclama lo que ya corresponda; se llama una vez desde `AccountContext.applySession` (después de
  cualquier login/registro exitoso), fire-and-forget, idempotente en el backend. **Actualizado**:
  ahora también repara `profile_complete` (¿ya hay nombre de negocio guardado?) — `first_scan`
  sigue afuera a propósito, un escaneo no deja registro persistente que se pueda mirar
  retroactivamente. typecheck/lint/28 tests en verde; no probado en dispositivo real.
- [x] Misiones diarias, entitlements (comprar backup/sacarse-ads con créditos) y rewarded ad
  claim — los tres huecos reales que quedaban ("de todo el sistema, hoy el único camino que
  otorga créditos sería bienvenida+racha+quests+referidos" ya no aplica, están los tres):
  - `GET /gamification/daily-mission/today` + `POST /gamification/daily-mission/claim` —
    rotación determinística por fecha (mismo día calendario = misma misión para todos), el
    progreso (3 ventas, 5 stock actualizado) se cuenta 100% local en `mobile-mini` (esos datos
    nunca llegan al backend), el servidor solo confía y aplica el tope de 1/día.
  - `GET /credits/me/entitlements` + `POST /credits/me/entitlements/:type/purchase`
    (`cloud_backup`/`remove_ads`) — chequea saldo, descuenta, extiende `expiresAt` en vez de
    resetearlo (comprar antes de vencer suma, no desperdicia). No está atado a plataforma: cubre
    desktop y mobile-mini con la misma cuenta.
  - `POST /gamification/rewarded-ad/claim` — créditos decrecientes (3/2/1), tope diario y
    cooldown, todo leído de `credit_config_items`. **⚠️ Interino y confía en el cliente, sin SSV
    todavía** (`RewardedAdsService`, comentario explícito en el código) — aceptable solo mientras
    se use el ad unit de prueba de AdMob; hay que reemplazarlo antes de conectar credenciales
    reales, o cualquiera con un cliente modificado se autootorga créditos.
  - Probado end-to-end contra Postgres real: misión reclamada dos veces (segunda `alreadyClaimed`,
    no duplica), rewarded ad con la secuencia 3→2→1 y el 4to rechazado por tope diario (bajando el
    cooldown a 0 desde el panel admin para la prueba, después restaurado), compra de entitlement
    con saldo insuficiente rechazada (400) y exitosa con extensión correcta del vencimiento (dos
    compras seguidas suman 60 días, no resetean a 30). typecheck/build/lint verdes, sin cambios de
    schema (las tres tablas ya existían).
- [x] Los tres de arriba, conectados en `mobile-mini` (antes solo existían en el backend):
  - `useRewardedAd` ahora llama a `claimRewardedAd()` al terminar de ver el anuncio y muestra el
    resultado real (créditos acreditados, o por qué no — tope diario/cooldown) en vez del reward
    crudo que reporta el SDK de AdMob (que en el ad unit de prueba es un número fijo sin relación
    con nuestra economía).
  - `DailyMissionCard` en "Beneficios" — el progreso (`useDailyMissionProgress`) se cuenta 100%
    local (ventas de hoy vía `salesRepository`, o productos con `stock_movements` tipo
    `ADJUSTMENT` de hoy vía `stockMovementsRepository`, según cuál sea la misión del día) y avisa
    solo al backend cuando se cumple — mismo patrón de confianza que ya usan los setup quests.
    "Hoy" es el día calendario del dispositivo, no UTC (lo que un comerciante entiende como hoy).
  - typecheck, lint y los 28 tests existentes en verde. No se pudo probar en dispositivo real (ni
    el SDK de AdMob ni el conteo local de ventas/stock son simulables por curl) — solo lo del lado
    backend quedó verificado end-to-end en el punto anterior.
- [x] Schema de ads definido (sin módulo NestJS todavía — solo entidades): `ad_placements` +
  `ad_placement_revisions` (qué ad unit/network usa cada placement por plataforma, con
  kill-switch y auditoría), `ad_reward_callbacks` (idempotencia de SSV de AdMob),
  `house_ads` + `house_ad_impressions` (fallback propio cuando AdMob no tiene fill). Ver
  `apps/cloud-backend/src/database/schema/`. **Pausado para desktop** — ver sección 1bis:
  ningún network de terceros confirmado todavía para Electron, no escribir código de integración
  hasta resolver esa consulta.
- [x] Módulo `AdsModule` sobre ese schema: admin CRUD (`AdPlacementsController`/
  `HouseAdsController`, detrás de `AdminJwtGuard`, con historial de revisiones para placements) +
  consumo de cliente (`AdsClientController`: `GET /ads/placements/:key?platform=`, detrás de
  `AccountJwtGuard`; `GET /ads/house-ad/active` y `POST /ads/house-ad/:id/impression`, públicos).
  Probado end-to-end contra Postgres real: kill-switch de un placement, historial de revisiones,
  creación de house ad + consumo del activo por prioridad + conteo de impresión.
  - **Bug de DI encontrado y arreglado**: `AdsModule` es el único módulo que importa
    `AccountAuthModule` y `AdminAuthModule` a la vez. Ambos re-exportaban el `JwtModule` crudo de
    `@nestjs/jwt`, y como Nest reconstruye `AccountJwtGuard`/`AdminJwtGuard` dentro de cada módulo
    consumidor (por venir referenciados por clase en `@UseGuards`), la resolución de `JwtService`
    quedaba ambigua ahí y terminaba usando el secreto de admin para verificar tokens de cuenta —
    401 "Token de cuenta inválido o expirado" con un JWT de cuenta perfectamente válido (mismo
    token que sí funcionaba en `/accounts/me`). Fix permanente: cada auth module ahora expone un
    token de inyección propio (`ACCOUNT_JWT_SERVICE` / `ADMIN_JWT_SERVICE`, ver
    `account-auth.constants.ts`/`admin-auth.constants.ts`) en vez de re-exportar `JwtService` bajo
    el token compartido de la clase — así no puede volver a chocar si otro módulo futuro también
    necesita ambos guards. `AccountJwtGuard` además ahora loguea (`Logger.warn`, no genérico) el
    motivo real de cualquier rechazo, útil para diagnosticar esto sin volver a instrumentar código.
- [x] `mobile-mini` conectado a `GET /ads/placements/rewarded_credits?platform=` (`ads.api.ts`
  nuevo): `useRewardedAd` pide el ad unit real al backend apenas hay cuenta y lo usa para
  `RewardedAd.createForAdRequest`; si la request falla (sin red, sesión vencida) o el placement
  está deshabilitado (kill switch), se queda con `TestIds.REWARDED` como fallback — nunca deja al
  usuario sin poder ver un anuncio solo porque el backend esté caído. Reemplazar el ad unit de
  prueba sembrado en `ad_placements` por uno real de una cuenta de AdMob propia pasa a ser una
  edición desde el panel admin, no un cambio de código. typecheck/lint/28 tests en verde; no se
  pudo probar en dispositivo real (mismo motivo que el resto de la integración AdMob).
- [x] **SSV (Server-Side Verification) real de AdMob, implementado** — `AdsModule` nuevo:
  `GET /ads/reward-callback` (público, sin `AccountJwtGuard`: lo llama el servidor de AdMob, no un
  cliente nuestro). Verificado contra la documentación oficial de Google
  ([Android](https://developers.google.com/admob/android/ssv)), no asumido — la firma real de
  Google es ECDSA+SHA256+DER (confirmado además por el tipo de clave pública real que devuelve
  `verifier-keys.json`: es EC, no RSA, a pesar de que algún ejemplo de terceros encontrado dice
  RSA). `AdRewardCallbackService` (`apps/cloud-backend/src/ads/`):
  1. Reconstruye el contenido firmado desde el query string *crudo* (nunca reserializado — un
     re-encode podría no coincidir byte a byte con lo que Google firmó).
  2. Trae las claves públicas de `https://www.gstatic.com/admob/reward/verifier-keys.json`
     (cacheadas 6hs — Google: "no más de 24hs").
  3. Verifica la firma ECDSA; si no matchea, 401 y se descarta.
  4. `transaction_id` es la clave de idempotencia (Google reintenta hasta 5 veces si la respuesta
     se pierde) — `ad_reward_callbacks.transactionId` (unique) evita acreditar dos veces.
  5. Llama a `RewardedAdsService.claim(userId)` — el mismo método que ya usaba el claim interino
     del cliente, para no duplicar la lógica de tope/cooldown/monto decreciente (3/2/1). Ahora
     devuelve también `ledgerEntryId` (interno, nunca al cliente) para poder auditar el callback
     contra la fila de `credit_ledger` que acreditó.
  - `mobile-mini`: `useRewardedAd` ya pasa `serverSideVerificationOptions: { userId: me.id }` al
    pedir el anuncio (`RewardedAd.createForAdRequest`) — así el callback, cuando llegue, va a traer
    el `user_id` correcto. **Sin efecto todavía**: el ad unit de prueba de Google no tiene SSV
    configurado en ningún lado, Google nunca va a llamar a este endpoint hasta que haya una cuenta
    de AdMob real con un ad unit propio con su "Callback URL" (AdMob dashboard) apuntando acá.
  - Probado: la verificación de firma (ECDSA/DER) contra un par de claves EC generado localmente
    (firma válida verifica OK, contenido alterado y clave equivocada se rechazan correctamente);
    los dos caminos de error del endpoint real (query mal formada → 400, `key_id` desconocida →
    401, esto último confirma que el fetch real a `verifier-keys.json` de Google funciona).
    **No se pudo probar el camino feliz completo end-to-end** porque no existe (ni puede existir
    fuera de Google) la clave privada real — eso solo se puede probar con una cuenta de AdMob real
    y tráfico real.
  - **Pendiente, a propósito no hecho todavía**: el claim interino del cliente
    (`POST /gamification/rewarded-ad/claim`, llamado directo por `mobile-mini` sin esperar SSV)
    sigue activo — apagarlo ahora rompería el único camino que hoy otorga créditos (el de prueba).
    El día que haya credenciales reales de AdMob con SSV configurado, ese claim directo tiene que
    dejar de acreditar (dejarlo solo como feedback visual, o gatillar la acreditación real solo
    desde el callback) — de lo contrario un cliente modificado se autootorga créditos igual que
    hoy. typecheck/lint verdes en ambos lados (cloud-backend no tiene tests unitarios todavía,
    mismo criterio que el resto del backend: verificado con curl/scripts contra Postgres real).
- [x] **UI de `apps/admin-panel` para `ad_placements`/`house_ads`** — hasta ahora ambos solo se
  habían probado por curl/PowerShell, sin pantalla real. Mismo patrón que ya existía para
  `credit-config` (React Query + Zustand + shadcn, `features/<dominio>/{api,hooks,components,pages}`):
  - **Ad placements** (`AdPlacementsPage`): tabla con key/plataforma/red/ad unit ID/estado, editar
    (red, ad unit ID, kill switch, nota) y ver historial de revisiones (diff previo→nuevo por campo).
  - **House ads** (`HouseAdsPage`): tabla con prioridad/estado/impresiones, crear y editar (mismo
    diálogo para ambos casos, sin endpoint de borrado — no hacía falta para el alcance de v1).
  - Como ahora hay tres páginas (antes solo credit-config), se agregó `AdminLayout` con nav
    compartida (Créditos / Ad placements / House ads) + botón de salir único — antes vivía inline en
    `CreditConfigPage`.
  - **Dos bugs reales encontrados y arreglados probando en el navegador de verdad, no solo con
    curl** (ninguno relacionado con lo nuevo del panel, ambos preexistentes):
    1. `apiPost` del cliente del panel (`lib/api-client.ts`) nunca mandaba el header de
       autenticación — no se había notado porque el único uso hasta ahora era el login (sin sesión
       todavía). Rompía crear un house ad nuevo.
    2. `HouseAdsService.create()`/`update()` (`apps/cloud-backend`) devolvían `void` en vez del DTO
       creado/actualizado — el controller mandaba `201`/`200` con body vacío, y el cliente
       reventaba al intentar parsearlo como JSON ("Unexpected end of JSON input"). Ahora ambos
       reconsultan la fila (con el join de `updatedByAdminEmail`/`impressionCount`) y devuelven el
       `HouseAdDto` completo, mismo patrón que ya usaba `AdPlacementsService.update()`.
  - Probado de punta a punta en el navegador real (no solo curl): login, nav entre las tres
    páginas, apagar/prender un placement (kill switch) y ver el cambio reflejado al instante,
    historial de revisiones con el diff correcto, crear un house ad nuevo y editarlo. typecheck +
    build de producción (`tsc && vite build`) + lint en verde.
- [x] **Requisitos reales de Google Play para publicar `mobile-mini`** — investigados contra la
  documentación oficial (no supuestos), no solo "escribir las políticas" como se pidió al
  principio: encontrar y resolver esto fue parte del trabajo, no un anexo.
  - **Borrado de cuenta** (política de Google Play — obligatoria, no opcional, para cualquier app
    con cuentas): `DELETE /accounts/me` nuevo (`apps/cloud-backend`), pide la contraseña de nuevo
    (irreversible), borra en una transacción todo lo que pertenece al usuario en
    `credit_ledger`/`streak_milestone_claims`/`setup_quest_completions`/
    `daily_mission_completions`/`rewarded_ad_views`/`entitlements`/`account_tokens`/
    `ad_reward_callbacks`/`house_ad_impressions`/`referrals`/`feature_votes`/`feature_requests`, y
    al usuario mismo — si otro usuario fue invitado por el que se borra, su `referredByUserId`
    pasa a `null` en vez de romper la referencia. Conectado en `mobile-mini` (Beneficios →
    "Eliminar mi cuenta", modal que pide contraseña) y con un link web
    (`apps/landing/src/pages/eliminar-cuenta.astro`) para quien ya desinstaló la app — Google exige
    los dos caminos, no alcanza con uno solo. Probado end-to-end contra Postgres real: password
    incorrecta rechazada (401, cuenta intacta), borrado exitoso (204), cuenta y todas sus filas
    desaparecen, y el caso de referido (A invita a B, se borra A) deja a B intacto sin romper la FK.
  - **Consentimiento de anuncios (UMP)** — exigido por Google/AdMob (EEA/UK y cada vez más
    aplicado en general), no estaba implementado. `AdsConsent.gatherConsent()` corre antes de
    `mobileAds().initialize()` en `src/app/_layout.tsx` (el SDK de la propia librería expone la API
    de UMP de Google) — pide/muestra el formulario de consentimiento si corresponde antes de
    inicializar ads. Se agregó también "Opciones de privacidad de anuncios" en Beneficios
    (`useAdsPrivacyOptions`, `AdsConsent.showPrivacyOptionsForm()`), visible solo para los usuarios
    donde Google exige poder revisarlo después.
  - **Política de Privacidad** y **Términos de Servicio** publicados en `apps/landing`
    (`/privacidad`, `/terminos`) — redactados después de auditar el código real (qué tabla guarda
    qué, qué permisos pide `app.json`, qué SDKs de terceros hay), no con texto genérico de
    plantilla. Explican la diferencia entre `apps/desktop` (100% local, sin cuenta) y
    `mobile-mini` (cuenta opcional, con AdMob). Contacto: rdevtoledo@gmail.com — sin razón
    social/entidad legal formal todavía.
  - **Data Safety de Play Console**: respuestas de referencia en
    `docs/legal/PLAY_CONSOLE_DATA_SAFETY.md`, mapeadas contra la taxonomía oficial de Google (no
    inventada) — email/user IDs recolectados y no compartidos, advertising ID recolectado Y
    compartido con Google (AdMob), fotos de producto NO cuentan como "recolectadas" porque nunca
    salen del dispositivo (definición de Google), nada de ubicación/contactos/analítica propia.
  - **Nota sobre el dominio**: `apps/landing` todavía apunta a `stocknegozia.app` como placeholder
    (`astro.config.mjs`, con un TODO ya existente) — las URLs de Privacidad/Términos/Eliminar
    cuenta no van a estar realmente accesibles para Google hasta que el dominio sea real y
    `apps/landing` esté deployado (mismo punto pendiente que el resto del deploy).
  - typecheck/lint/build/28 tests en verde en `mobile-mini`; `astro check` + build en verde en
    `apps/landing`. No se pudo probar el consentimiento UMP en un dispositivo real (mismo límite de
    siempre con AdMob).
- [x] **Deploy prep de `apps/cloud-backend`/`apps/admin-panel`/`apps/landing` — configuración
  lista, todavía sin deployar** (a propósito, ver instrucción explícita de no deployar todavía):
  - **Bug real encontrado**: el backend ignoraba por completo el `PORT` que Render (y la mayoría
    de los PaaS) inyectan solos, escuchando siempre en `CLOUD_BACKEND_PORT` — en Render esto rompe
    el deploy directo (el healthcheck le pega al puerto que Render espera, no al que el proceso
    realmente usa). Arreglado: `PORT` gana si está seteada
    (`cloudBackendEnvSchema`/`configuration.ts`), sin tocar el comportamiento local. Probado en
    caliente: sin `PORT` sigue en 38200 como siempre; con `PORT=5555` escucha ahí.
  - **SSL para Neon**: `database.module.ts` ahora pasa `ssl: { rejectUnauthorized: false }` al
    `Pool` de `pg` cuando `NODE_ENV=production` (Neon lo exige; el Postgres local de Docker no lo
    soporta) — gatillado por `NODE_ENV`, no por parsear la connection string. Sin cambio de
    comportamiento en dev/test.
  - **`render.yaml`** (Blueprint, raíz del repo) con los tres servicios: `cloud-backend` (web
    service, healthcheck en `/health`, plan free), `admin-panel` y `landing` (static sites, con
    rewrite a `/index.html` en admin-panel por ser SPA de react-router). Todos los `buildCommand`
    usan `pnpm turbo run build --filter=...` (no `pnpm --filter` suelto) para que Turbo compile
    primero `validation`/`api-contracts`/`shared` — verificado ejecutando los tres comandos
    exactos del Blueprint en este entorno, no solo leyéndolos. Variables sensibles como
    `sync: false` (las completa quien haga el alta en el dashboard de Render) o
    `generateValue: true` (Render genera `ADMIN_JWT_SECRET`/`ACCOUNT_JWT_SECRET` solo). Documentado
    en el propio archivo el problema de huevo-gallina del primer deploy (la URL de cada servicio
    recién se conoce después de crearlo) y el orden sugerido para resolverlo.
  - typecheck + lint de los 12-14 paquetes del monorepo en verde (`pnpm turbo run
    typecheck`/`lint`, sin scope a un paquete) — confirma que estos cambios no rompieron nada más.
  - **Sigue sin deployar** — falta que el usuario cree las cuentas de Render/Neon y el dominio
    real; esto solo deja la configuración lista para que ese paso sea mecánico.
- [x] **Pantalla de compra de entitlements en `mobile-mini`** — el backend (backup en la nube /
  sacarse ads) ya estaba probado por curl desde antes, pero no existía ninguna pantalla real para
  que el comercio gastara sus créditos ahí.
  - **Endpoint nuevo**: `GET /credits/me/entitlements/catalog` (`apps/cloud-backend`) — junta el
    costo actual de cada tipo (siempre leído de `credit_config_items`, nunca hardcodeado) con el
    estado real de ese entitlement para el usuario (`expiresAt: null` = no comprado). Se agregaron
    `EntitlementCatalogItemDto`/`PurchaseEntitlementResult` a `api-contracts` (antes el tipo de
    retorno de `purchase()` era un inline sin nombre).
  - **`EntitlementsScreen`** nueva en `mobile-mini` (ruta `/benefits/entitlements`, botón "Canjear
    beneficios" desde la tarjeta de saldo en Beneficios): lista los dos beneficios con
    nombre/descripción/costo, muestra "Activo hasta el [fecha]" si ya está comprado (con opción de
    extender 30 días más, sin resetear lo que quedaba), o "Te faltan N créditos" si no alcanza el
    saldo — nunca bloquea el botón, el intento igual muestra el error real del backend si
    corresponde.
  - Probado end-to-end contra Postgres real: catálogo recién registrado (ambos sin comprar, costos
    160/150 correctos), compra exitosa (bajando temporalmente el costo a 5 créditos para la
    prueba, restaurado después) y el catálogo reflejando el `expiresAt` nuevo inmediatamente
    después de comprar.
  - typecheck + lint de los 14 paquetes del monorepo en verde, 28 tests de `mobile-mini` sin
    regresiones. No se pudo probar en dispositivo real (mismo límite de siempre).
- [x] **Proveedor de email real: Resend → SendGrid → SMTP de Gmail → API REST de Gmail → SendGrid
  (definitivo por ahora).** Primer intento con Resend (`resend.emails.send`, remitente
  `onboarding@resend.dev`) funcionó en el deploy real, pero probar el registro con un email de
  verdad reveló la restricción real: sin dominio propio verificado en Resend, solo deja mandar a la
  casilla dueña de la cuenta, a cualquier otro destinatario lo rechaza. Se migró a SendGrid ("Single
  Sender Verification", sin dominio) — mandó bien, pero cayó a spam en Gmail: sin dominio propio no
  hay forma de alinear SPF/DKIM para un remitente `@gmail.com` mandado desde los servidores de
  SendGrid, Gmail lo trata como spoofing. Se migró al SMTP real de Gmail (`nodemailer` +
  `createTransport({service: "gmail"})`, contraseña de aplicación) — evitaba el spam, pero dio
  "Connection timeout" en producción: Render bloquea los puertos SMTP salientes (25/465/587) en el
  plan free desde sep-2025, confirmado con su changelog oficial; se probó también el puerto 587
  (STARTTLS en vez de TLS implícito) por si el bloqueo era específico del 465, mismo resultado — el
  plan free bloquea SMTP entero, no un puerto puntual. Se migró a la API REST de Gmail
  (`gmail.googleapis.com/gmail/v1/users/me/messages/send`, OAuth2) para evitar el bloqueo de
  puertos (HTTPS/443, nunca bloqueado) — pero conseguir las credenciales OAuth2 exige un proyecto
  de Google Cloud con facturación activa, y esa alta no se pudo completar (tarjeta rechazada al dar
  de alta la facturación). **Vuelta final a SendGrid**: es la única opción de las probadas que
  funciona sin dominio propio ni tarjeta de crédito — queda la limitación conocida y sin fix por
  ahora de que cae a spam sin un dominio propio verificado en SendGrid, algo a resolver el día que
  haya presupuesto para comprar uno (no exige cambiar código, solo agregar el dominio en SendGrid y
  cambiar `SENDGRID_FROM_EMAIL`). `EmailService` manda de verdad cuando `SENDGRID_API_KEY`/
  `SENDGRID_FROM_EMAIL` están seteadas; sin esas variables sigue logueando exactamente como
  siempre, cero cambio de comportamiento en dev/test. Los errores del envío nunca relanzan — mismo
  criterio ya usado en `AccountsService` ("nunca bloquea nada"), y el propio envío del email quedó
  fire-and-forget (sin `await` en el flujo de request/response, un cambio que sobrevivió a todas las
  migraciones de proveedor) para que un envío lento nunca cuelgue la respuesta HTTP al cliente —
  antes de ese cambio, un timeout de red silencioso dejaba el registro/reenvío colgado sin ningún
  error visible. Agregado a `render.yaml` como variables opcionales (`sync: false`). typecheck +
  lint + build en verde.
- [x] **`first_scan`/`profile_complete` conectados** — el último hueco de gamification que
  quedaba sin disparador real en `mobile-mini`, ver detalle en la sección de Logros más arriba.
  `first_scan` en los tres consumidores del scanner (`ProductsScreen`/`SalesScreen`/
  `PurchasesScreen`), `profile_complete` al guardar el nombre del negocio en Ajustes — ambos
  también sumados a `backfillSetupQuestsFromLocalData()` donde tiene sentido (`profile_complete`
  sí se puede reparar retroactivamente mirando `AsyncStorage`; `first_scan` no, un escaneo no deja
  rastro persistente). typecheck/lint/28 tests en verde.
