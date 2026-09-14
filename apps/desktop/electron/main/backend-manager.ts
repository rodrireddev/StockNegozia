import { spawn, type ChildProcess } from "node:child_process";
import { platform } from "node:os";
import { DEFAULT_BACKEND_PORT } from "@stocknegozia/shared";
import type { HealthStatus } from "@stocknegozia/api-contracts";

export interface BackendManagerOptions {
  /** Raíz del monorepo (o carpeta de recursos empaquetada en producción). */
  repoRoot: string;
  /** Directorio de datos del usuario (Electron `app.getPath('userData')`). */
  dataDir: string;
  /** Si la app está empaquetada (`app.isPackaged`). */
  isPackaged: boolean;
  port?: number;
}

/**
 * Administra el ciclo de vida del backend NestJS como proceso hijo:
 * inicio, parada, supervisión y espera de disponibilidad.
 */
export class BackendManager {
  private child: ChildProcess | null = null;
  private stopping = false;
  readonly port: number;

  constructor(private readonly options: BackendManagerOptions) {
    this.port = options.port ?? DEFAULT_BACKEND_PORT;
  }

  get baseUrl(): string {
    return `http://localhost:${this.port}`;
  }

  start(): void {
    if (this.child) return;

    const env = {
      ...process.env,
      NODE_ENV: this.options.isPackaged ? "production" : "development",
      STOCKNEGOZIA_PORT: String(this.port),
      STOCKNEGOZIA_DATA_DIR: this.options.dataDir,
    };

    if (this.options.isPackaged) {
      const backendEntry = `${this.options.repoRoot}/apps/backend/dist/main.js`;
      this.child = spawn(process.execPath, [backendEntry], {
        env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
        stdio: "inherit",
        // El proceso Electron main no tiene una consola propia (es un binario GUI): sin
        // `windowsHide`, Windows le abre una consola nueva y visible al hijo (cmd.exe cuando
        // `shell: true`, o el propio ejecutable en modo empaquetado) — `stdio: "inherit"` igual
        // sigue heredando los handles correctamente, así que los logs del backend no se pierden.
        windowsHide: true,
      });
    } else {
      this.child = spawn("pnpm", ["--filter", "@stocknegozia/backend", "start:dev"], {
        cwd: this.options.repoRoot,
        env,
        stdio: "inherit",
        shell: platform() === "win32",
        windowsHide: true,
      });
    }

    this.child.on("exit", (code, signal) => {
      this.child = null;
      if (!this.stopping) {
        console.error(
          `[backend-manager] backend exited unexpectedly (code=${code} signal=${signal})`,
        );
      }
    });
  }

  stop(): void {
    if (!this.child || this.stopping) return;
    this.stopping = true;

    const pid = this.child.pid;
    if (pid && platform() === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { windowsHide: true });
    } else {
      this.child.kill("SIGTERM");
    }
  }

  async waitUntilHealthy(timeoutMs = 30_000, intervalMs = 300): Promise<void> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${this.baseUrl}/health`);
        if (response.ok) {
          const health = (await response.json()) as HealthStatus;
          if (health.status === "ok") return;
        }
      } catch {
        // el backend todavía no está escuchando — se reintenta
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`El backend no respondió saludable en ${timeoutMs}ms`);
  }
}
