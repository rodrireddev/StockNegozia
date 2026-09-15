import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PairingDialog } from "./PairingDialog";

const { createPairingMock, getPairingStatusMock, cancelPairingMock } = vi.hoisted(() => ({
  createPairingMock: vi.fn(),
  getPairingStatusMock: vi.fn(),
  cancelPairingMock: vi.fn(),
}));

vi.mock("@/features/devices/api/pairing.api", () => ({
  createPairing: createPairingMock,
  getPairingStatus: getPairingStatusMock,
  cancelPairing: cancelPairingMock,
}));

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fake") },
}));

const pairingResult = {
  pairingId: "pairing-1",
  verificationCode: "123456",
  status: "pending" as const,
  expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  qr: {
    version: 1 as const,
    type: "stocknegozia-pairing" as const,
    host: "192.168.1.50",
    port: 38123,
    protocol: "http" as const,
    pairingId: "pairing-1",
    token: "sn_token",
    expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
  },
};

function renderDialog(open = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <PairingDialog open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange, ...utils };
}

beforeEach(() => {
  createPairingMock.mockReset();
  getPairingStatusMock.mockReset();
  cancelPairingMock.mockReset();
  createPairingMock.mockResolvedValue(pairingResult);
  getPairingStatusMock.mockResolvedValue({
    pairingId: pairingResult.pairingId,
    status: "pending",
    expiresAt: pairingResult.expiresAt,
  });
  cancelPairingMock.mockResolvedValue({ ok: true });
});

describe("PairingDialog", () => {
  it("al abrir, genera un pairing y muestra el código de verificación", async () => {
    renderDialog();

    expect(await screen.findByText("123456")).toBeInTheDocument();
    expect(createPairingMock).toHaveBeenCalled();
  });

  it("nunca muestra el token del QR como texto plano en la UI", async () => {
    renderDialog();
    await screen.findByText("123456");

    expect(screen.queryByText(pairingResult.qr.token)).not.toBeInTheDocument();
  });

  it("cuando el estado pasa a confirmed, muestra el mensaje de éxito", async () => {
    getPairingStatusMock.mockResolvedValue({
      pairingId: pairingResult.pairingId,
      status: "confirmed",
      expiresAt: pairingResult.expiresAt,
    });
    renderDialog();

    expect(await screen.findByText(/emparejado correctamente/i)).toBeInTheDocument();
  });

  it("cuando el estado pasa a expired, ofrece generar un pairing nuevo", async () => {
    getPairingStatusMock.mockResolvedValue({
      pairingId: pairingResult.pairingId,
      status: "expired",
      expiresAt: pairingResult.expiresAt,
    });
    renderDialog();

    expect(await screen.findByText(/expiró antes de confirmarse/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generar uno nuevo/i })).toBeInTheDocument();
  });

  it("cancelar pairing llama a cancelPairing y cierra el diálogo", async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();
    await screen.findByText("123456");

    await user.click(screen.getByRole("button", { name: /cancelar pairing/i }));

    // La versión instalada de TanStack Query agrega un segundo argumento de contexto a
    // `mutationFn` — se verifica solo la variable que le pasamos nosotros.
    expect(cancelPairingMock.mock.calls[0]?.[0]).toBe(pairingResult.pairingId);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
