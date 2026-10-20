import { Inject, Injectable } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { appConfig } from "../config/configuration";

export type CloudProxyResult<T> =
  { ok: true; body: T } | { ok: false; status: "not_linked" | "upstream_error" };

/**
 * Mantiene en memoria el JWT de cuenta cloud que Electron main empuja (`PUT /cloud-account/session`)
 * y reenvía requests a `apps/cloud-backend` con ese token — ver
 * docs/monetization/ADS_CREDITS_GAMIFICATION.md §6. `apps/mobile` nunca ve el token ni conoce la
 * URL de cloud-backend, solo le pega a los endpoints de este proxy como a cualquier otro de este
 * backend. Vive solo en memoria: este proceso es nuevo en cada arranque de Desktop (ver
 * `backend-manager.ts`), así que empieza "sin sesión" hasta que Electron main la vuelve a empujar.
 */
@Injectable()
export class CloudSessionService {
  private accessToken: string | null = null;

  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  setToken(token: string | null): void {
    this.accessToken = token;
  }

  isLinked(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Reenvía una request a cloud-backend con el token actual. Sin sesión, o si cloud-backend
   * rechaza el token (401 — vencido o inválido), devuelve `not_linked` en vez de propagar un 401
   * genérico: el llamador trata esto exactamente igual que "el desktop emparejado no tiene cuenta
   * cloud logueada", sin un segundo estado de error que manejar (doc, requisito 4).
   */
  async forward<T>(path: string, init?: RequestInit): Promise<CloudProxyResult<T>> {
    if (!this.accessToken) return { ok: false, status: "not_linked" };

    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    if (init?.body) headers.set("Content-Type", "application/json");

    let response: Response;
    try {
      response = await fetch(`${config.cloudBackendUrl}${path}`, { ...init, headers });
    } catch {
      return { ok: false, status: "upstream_error" };
    }

    if (response.status === 401) return { ok: false, status: "not_linked" };
    if (!response.ok) return { ok: false, status: "upstream_error" };

    const body = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
    return { ok: true, body };
  }
}
