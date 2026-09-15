import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useThemeStore } from "@/stores/theme-store";
import { SettingsPage } from "./SettingsPage";

const { createBackupMock, selectAndValidateBackupMock, restoreBackupMock } = vi.hoisted(() => ({
  createBackupMock: vi.fn(),
  selectAndValidateBackupMock: vi.fn(),
  restoreBackupMock: vi.fn(),
}));

vi.mock("@/features/backup/api/backup.api", () => ({
  createBackup: createBackupMock,
  selectAndValidateBackup: selectAndValidateBackupMock,
  restoreBackup: restoreBackupMock,
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  createBackupMock.mockReset();
  selectAndValidateBackupMock.mockReset();
  restoreBackupMock.mockReset();
  useThemeStore.setState({ preference: "system", resolvedDark: false });
  window.theme = {
    get: vi.fn().mockResolvedValue({ preference: "system", resolvedDark: false }),
    set: vi.fn().mockResolvedValue({ preference: "dark", resolvedDark: true }),
    onUpdated: vi.fn().mockReturnValue(() => {}),
  };
});

describe("SettingsPage", () => {
  it("muestra las secciones de Backup y Restaurar", () => {
    renderPage();
    expect(screen.getByText("Backup")).toBeInTheDocument();
    expect(screen.getByText("Restaurar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear backup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /seleccionar backup/i })).toBeInTheDocument();
  });

  it("muestra la sección Apariencia con las tres opciones de tema", () => {
    renderPage();
    expect(screen.getByText("Apariencia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sistema" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oscuro" })).toBeInTheDocument();
  });

  it("elegir Oscuro llama a window.theme.set y actualiza el store sin reiniciar", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Oscuro" }));

    expect(window.theme.set).toHaveBeenCalledWith("dark");
    expect(useThemeStore.getState()).toEqual({ preference: "dark", resolvedDark: true });
  });

  it("crear un backup exitoso muestra el archivo, el tamaño y la fecha", async () => {
    createBackupMock.mockResolvedValue({
      cancelled: false,
      result: {
        fileName: "stocknegozia-backup-2026-09-14-18-42-00.db",
        filePath: "C:\\Users\\Test\\Documents\\stocknegozia-backup-2026-09-14-18-42-00.db",
        createdAt: "2026-09-14T18:42:00.000Z",
        sizeBytes: 2 * 1024 * 1024,
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /crear backup/i }));

    expect(
      await screen.findByText(/stocknegozia-backup-2026-09-14-18-42-00\.db/),
    ).toBeInTheDocument();
    expect(screen.getByText(/2\.0 MB/)).toBeInTheDocument();
  });

  it("cancelar el diálogo nativo de guardado no muestra ningún mensaje", async () => {
    createBackupMock.mockResolvedValue({ cancelled: true });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /crear backup/i }));

    await vi.waitFor(() => expect(createBackupMock).toHaveBeenCalled());
    expect(screen.queryByText(/backup creado/i)).not.toBeInTheDocument();
  });

  it("un backup fallido muestra un mensaje amigable", async () => {
    createBackupMock.mockResolvedValue({
      cancelled: false,
      error:
        "No se pudo crear el backup. Verificá que la ubicación seleccionada tenga permisos de escritura.",
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /crear backup/i }));

    expect(await screen.findByText(/no se pudo crear el backup/i)).toBeInTheDocument();
  });

  it("seleccionar un backup inválido muestra la información pero no ofrece restaurar", async () => {
    selectAndValidateBackupMock.mockResolvedValue({
      cancelled: false,
      validation: {
        status: "corrupt",
        message: "El backup está dañado y no puede restaurarse.",
        fileName: "backup-viejo.db",
        createdAt: "2026-01-01T00:00:00.000Z",
        migrationCount: null,
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /seleccionar backup/i }));

    expect(await screen.findByText(/el backup está dañado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^restaurar backup$/i })).not.toBeInTheDocument();
  });

  it("seleccionar un backup válido muestra la advertencia y permite confirmar", async () => {
    selectAndValidateBackupMock.mockResolvedValue({
      cancelled: false,
      validation: {
        status: "valid",
        message: "Backup válido y compatible con esta versión de StockNegozia.",
        fileName: "stocknegozia-backup-2026-09-14-18-42-00.db",
        createdAt: "2026-09-14T18:42:00.000Z",
        migrationCount: 9,
      },
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /seleccionar backup/i }));

    expect(await screen.findByText(/reemplazará los datos actuales/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^restaurar backup$/i })).toBeInTheDocument();
  });

  it("cancelar el diálogo de confirmación no dispara la restauración", async () => {
    selectAndValidateBackupMock.mockResolvedValue({
      cancelled: false,
      validation: {
        status: "valid",
        message: "Backup válido.",
        fileName: "backup.db",
        createdAt: "2026-09-14T18:42:00.000Z",
        migrationCount: 9,
      },
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /seleccionar backup/i }));
    await screen.findByRole("button", { name: /^restaurar backup$/i });

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByText(/reemplazará los datos actuales/i)).not.toBeInTheDocument();
    expect(restoreBackupMock).not.toHaveBeenCalled();
  });

  it("mientras se restaura, el botón queda deshabilitado y muestra el estado", async () => {
    selectAndValidateBackupMock.mockResolvedValue({
      cancelled: false,
      validation: {
        status: "valid",
        message: "Backup válido.",
        fileName: "backup.db",
        createdAt: "2026-09-14T18:42:00.000Z",
        migrationCount: 9,
      },
    });
    let resolveRestore: (value: unknown) => void = () => {};
    restoreBackupMock.mockReturnValue(new Promise((resolve) => (resolveRestore = resolve)));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /seleccionar backup/i }));
    await user.click(await screen.findByRole("button", { name: /^restaurar backup$/i }));

    expect(screen.getByRole("button", { name: /restaurando/i })).toBeDisabled();

    resolveRestore({
      success: true,
      preRestoreBackupFileName: "stocknegozia-pre-restore-2026-09-14.db",
    });
    await screen.findByText(/restauración completa/i);
  });

  it("una restauración fallida conserva el diálogo abierto y muestra el error", async () => {
    selectAndValidateBackupMock.mockResolvedValue({
      cancelled: false,
      validation: {
        status: "valid",
        message: "Backup válido.",
        fileName: "backup.db",
        createdAt: "2026-09-14T18:42:00.000Z",
        migrationCount: 9,
      },
    });
    restoreBackupMock.mockResolvedValue({
      success: false,
      error: "No se pudo completar la restauración. Los datos anteriores se conservaron.",
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /seleccionar backup/i }));
    await user.click(await screen.findByRole("button", { name: /^restaurar backup$/i }));

    expect(await screen.findByText(/los datos anteriores se conservaron/i)).toBeInTheDocument();
    // El diálogo sigue abierto — el usuario todavía puede ver la información del backup.
    expect(screen.getByText("backup.db")).toBeInTheDocument();
  });
});
