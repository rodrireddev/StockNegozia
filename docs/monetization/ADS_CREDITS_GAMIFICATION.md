# Monetización con AdMob: créditos, gamification y financiamiento de features

Estado: **idea en diseño, nada implementado todavía**. Este doc es el resumen de la sesión de
diseño para retomarla en el futuro sin perder el razonamiento detrás de cada decisión.

## Principio rector

`mobile-mini` es una herramienta de trabajo diaria (POS/inventario de un comercio chico), no un
juego. Ninguna mecánica de esta propuesta puede bloquear el flujo core (escanear, vender, cargar
stock) detrás de un anuncio o de una cuenta. Todo lo que sigue es "extra" opcional — la app tiene
que seguir siendo 100% usable, gratis y local sin registrarse, igual que hoy.

## 1. Modelo de créditos

Un monedero de créditos único, no anuncios pegados a una función puntual. Ventaja: cada feature
premium nueva solo necesita un precio en créditos, no una integración de ads nueva.

**Cómo se ganan créditos:**
- Rewarded video (AdMob): con retorno decreciente por sesión (1er anuncio = 3 créditos, 2do = 2,
  3ro = 1) y tope diario (3-5 anuncios/día) + cooldown. Evita farming y que AdMob penalice la
  cuenta por abuso.
- Acciones de setup que el usuario iba a hacer igual (cargar su primer producto, primera venta,
  primer escaneo) — créditos de bienvenida al registrarse.
- Racha de uso diario y misiones diarias atadas a acciones reales del negocio (ver sección 2).
- Referidos (ver sección 5).
- Opcional: paquetes de créditos comprables por IAP para quien no quiere mirar anuncios (funnel
  híbrido: ads para el usuario sensible al precio, IAP para el que paga por comodidad).

**En qué se gastan (candidatos, ninguno toca el flujo diario):**
1. **Backup en la nube** — hoy `mobile-mini` es 100% local (SQLite), perder el celular = perder
   todo el negocio. Es el motivador más fuerte que tenemos (miedo a perder datos > gamification).
2. **Exportar reportes** (PDF/Excel para el contador) — necesidad real con fecha límite.
3. Sacarse anuncios de encima (si en algún momento se agregan banners/interstitials).
4. Slots extra de proveedores/categorías/productos más allá del límite free.
5. Sincronizar entre dispositivos (mostrador + depósito).
6. Votar/boostear pedidos de funcionalidad (sección 4) — motivador débil, solo para power users.

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
- Host gratis sin pausa por inactividad: Fly.io o Render (free tier) para el servicio, Neon para
  Postgres gratis (a diferencia de Supabase, no pausa el proyecto tras 1 semana sin actividad).
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

## Próximos pasos (cuando se retome)

- Definir entidades del backend nuevo: usuarios, ledger de créditos, racha, pedidos de feature,
  votos, referidos.
- Decidir arquitectura de sync local↔cloud (caché vs. fuente de verdad única).
- Prototipo de integración AdMob rewarded en `mobile-mini`.
- Guion de reclutamiento de los primeros fundadores.
