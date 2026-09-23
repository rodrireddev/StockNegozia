# Monetización con AdMob: créditos, gamification y financiamiento de features

Estado: **idea en diseño, nada implementado todavía**. Este doc es el resumen de la sesión de
diseño para retomarla en el futuro sin perder el razonamiento detrás de cada decisión.

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

**Caso: usuario que ya venía usando la app local (con productos/ventas/racha) y se registra.**
Es el mejor momento para pedirle que se registre, no el peor — ya invirtió tiempo y tiene algo real
que no quiere perder (mismo principio de pérdida que el backup). Migración: al confirmar la cuenta,
el cliente sube productos/ventas/stock/ledger de créditos/racha locales al backend en una sola
pasada, etiquetados con el `user_id` nuevo. Nunca se borra lo local hasta confirmar que la subida
terminó — si se corta la conexión, reintenta.

**Disparador del CTA de registro** (OR de señales, no un solo número): ≥15-20 productos cargados,
o ≥5 días de racha, o ≥20 ventas, o ≥30 créditos acumulados. Banner liviano y descartable la
primera vez; en un hito alto (30 días de racha, 100 productos) sube de intensidad. Nunca bloquea
nada, en ningún nivel.

**Pendiente de decidir:** después de migrar, ¿el SQLite local pasa a ser caché del backend (sync
offline-first) o el backend pasa a ser la única fuente de verdad? Decisión de arquitectura más
grande, afecta también a `apps/mobile`. Para v1 alcanza con el caso simple (usuario registrándose
por primera vez); mergear datos locales con una cuenta que ya existía en otro dispositivo queda
para más adelante. Para LatAm, evaluar registro por teléfono/OTP (WhatsApp/SMS) en vez de email —
muchos comerciantes chicos no revisan mail seguido.

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
internet. Créditos/cuentas/tablero de pedidos necesitan un **backend nuevo, separado**.

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
comerciantes), colgado del backend nuevo (sección 6) como una sección admin protegida con su
propio auth — no una app aparte.

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

- Definir entidades del backend nuevo: usuarios, ledger de créditos, racha, pedidos de feature,
  votos, referidos, tabla de config del panel admin.
- Decidir arquitectura de sync local↔cloud (caché vs. fuente de verdad única).
- Prototipo de integración AdMob rewarded en `mobile-mini`.
- Guion de reclutamiento de los primeros fundadores.
- Diseño de UI del panel de administración (sección 7).
