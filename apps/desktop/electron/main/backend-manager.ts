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

  /**
   * Devuelve una Promise que resuelve cuando el proceso hijo terminó de verdad (`true`), o cuando
   * se cumplió `timeoutMs` sin confirmación de salida (`false`) — necesario para Restore (ver
   * docs/backup/BACKUP_RESTORE.md §Arquitectura de Restore): no se puede reemplazar el archivo de
   * SQLite mientras el backend todavía podría tenerlo abierto, así que ese llamador debe poder
   * abortar si no hay certeza de que el proceso salió. Los llamadores que no necesitan esperar
   * (ej. `before-quit`) pueden seguir llamando `stop()` sin `await`, igual que antes — no cambia
   * ningún comportamiento existente.
   */
  stop(timeoutMs = 10_000): Promise<boolean> {
    if (!this.child || this.stopping) return Promise.resolve(true);
    this.stopping = true;
    const child = this.child;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), timeoutMs);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve(true);
      });

      const pid = child.pid;
      if (pid && platform() === "win32") {
        spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { windowsHide: true });
      } else {
        child.kill("SIGTERM");
      }
    });
  }

  /**
   * Sin `timeoutMs`, espera indefinidamente — usado en el arranque normal de la app: el backend
   * es un proceso hijo local (nunca una red externa que pueda quedar inalcanzable de verdad), así
   * que tarde lo que tarde (máquina lenta, primer arranque con instalación de dependencias, etc.)
   * siempre termina respondiendo. No tiene sentido rendirse y cerrar la app con un error genérico
   * cuando lo único que hace falta es esperar un poco más — el splash ya cubre exactamente ese
   * tiempo (ver `index.ts` §Orden del arranque).
   *
   * Con `timeoutMs` explícito, mantiene el comportamiento acotado — usado por `BackupManager`
   * durante un Restore, donde un backend que no vuelve a levantar tras restaurar un archivo SÍ es
   * una señal real de que algo salió mal (base restaurada incompatible/corrupta) y debe disparar
   * el rollback automático, no quedar esperando para siempre.
   */
  async waitUntilHealthy(timeoutMs?: number, intervalMs = 300): Promise<void> {
    const deadline = timeoutMs !== undefined ? Date.now() + timeoutMs : Infinity;

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
