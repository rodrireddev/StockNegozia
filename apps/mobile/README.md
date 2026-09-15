# @stocknegozia/mobile

Cliente móvil oficial de StockNegozia para Android (teléfonos y tablets) — React Native + Expo +
TypeScript. Ver [`docs/mobile/MOBILE_CLIENT.md`](../../docs/mobile/MOBILE_CLIENT.md) para la
documentación completa (arquitectura, pairing, credential storage, builds, EAS, Google Play).

## Desarrollo local

```bash
cp .env.example .env   # editar EXPO_PUBLIC_API_URL con la IP LAN de tu backend
pnpm --filter @stocknegozia/mobile start
```

Requiere que `pnpm --filter @stocknegozia/backend start:dev` esté corriendo en la misma LAN — ver
[`docs/lan/LAN_TESTING.md`](../../docs/lan/LAN_TESTING.md). Sin credential guardada, la app arranca
en la pantalla de Pairing (Dispositivos → Emparejar dispositivo desde el Desktop).

## Scripts

| Comando                                                 | Qué hace                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm start`                                            | Metro (Expo Go / dev client).                                    |
| `pnpm android`                                          | Build + instala un dev client localmente (requiere Android SDK). |
| `pnpm typecheck` / `pnpm lint` / `pnpm test`            | Igual que el resto del monorepo.                                 |
| `pnpm branding:generate`                                | Regenera los íconos/splash desde `logo.png` (raíz del repo).     |
| `pnpm build:dev` / `build:preview` / `build:production` | Builds de EAS — ver la documentación para los perfiles.          |

## Alcance de este milestone (M15)

Base móvil real (auth, pairing, Products de solo lectura, layout adaptativo phone/tablet) lista
para Google Play. El scanner de cámara **no** está implementado — la arquitectura ya lo contempla
(`src/features/scanner/`), ver la documentación.
