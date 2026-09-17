import type { ProductDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SalesPage } from "./SalesPage";

const {
  fetchProductsMock,
  createSaleMock,
  fetchMeMock,
  updateSellerNameMock,
  downloadSaleReceiptMock,
} = vi.hoisted(() => ({
  fetchProductsMock: vi.fn(),
  createSaleMock: vi.fn(),
  fetchMeMock: vi.fn(),
  updateSellerNameMock: vi.fn(),
  downloadSaleReceiptMock: vi.fn(),
}));

vi.mock("@/features/products/api/products.api", () => ({
  fetchProducts: fetchProductsMock,
}));

vi.mock("@/features/sales/api/sales.api", () => ({
  createSale: createSaleMock,
}));

vi.mock("@/features/sales/api/receipt.api", () => ({
  downloadSaleReceipt: downloadSaleReceiptMock,
}));

vi.mock("@/features/devices/api/devices.api", () => ({
  fetchMe: fetchMeMock,
  updateSellerName: updateSellerNameMock,
}));

function makeProduct(overrides: Partial<ProductDto> & { id: number }): ProductDto {
  return {
    name: "Producto",
    sku: `SKU-${overrides.id}`,
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 800,
    salePrice: 1200,
    stock: 10,
    minimumStock: 2,
    stockStatus: "normal",
    image: null,
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const cocaCola = makeProduct({ id: 1, name: "Coca-Cola 2L", sku: "0012", salePrice: 1200 });
const jabon = makeProduct({
  id: 2,
  name: "Jabón en polvo",
  sku: "0045",
  salePrice: 1800,
  stock: 3,
  stockStatus: "low",
});

const deviceWithSeller = {
  id: "device-1",
  name: "Electron Desktop",
  type: "desktop" as const,
  active: true,
  isAdmin: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: null,
  sellerName: "Rodrigo",
};

function renderSalesPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SalesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchProductsMock.mockReset();
  createSaleMock.mockReset();
  fetchMeMock.mockReset();
  updateSellerNameMock.mockReset();
  downloadSaleReceiptMock.mockReset();
  fetchProductsMock.mockResolvedValue([cocaCola, jabon]);
  // Vendedor actual ya configurado por defecto — así las ventas se registran sin fricción en
  // todos los tests que no ejercitan específicamente el bloqueo (ver describe más abajo).
  fetchMeMock.mockResolvedValue(deviceWithSeller);
});

describe("SalesPage", () => {
  it("el buscador recibe foco automáticamente al entrar a la pantalla", async () => {
    renderSalesPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar por nombre/i)).toHaveFocus();
    });
  });

  it("muestra un estado de carga mientras se buscan productos", () => {
    fetchProductsMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
    renderSalesPage();

    expect(screen.getByText(/buscando productos/i)).toBeInTheDocument();
  });

  it("muestra un mensaje amigable, no técnico, si falla la carga de productos", async () => {
    fetchProductsMock.mockRejectedValue(new TypeError("Failed to fetch"));
    renderSalesPage();

    const message = await screen.findByText(/no pudimos cargar los productos/i);
    expect(message.textContent).not.toMatch(/failed to fetch/i);
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay productos", async () => {
    fetchProductsMock.mockResolvedValue([]);
    renderSalesPage();

    expect(await screen.findByText(/no tenés productos cargados todavía/i)).toBeInTheDocument();
  });

  it("el botón de confirmar venta está deshabilitado con el carrito vacío", async () => {
    renderSalesPage();
    await screen.findByText("Coca-Cola 2L");

    expect(screen.getByRole("button", { name: /confirmar venta/i })).toBeDisabled();
  });

  it("agregar un producto lo suma al carrito y agregarlo de nuevo incrementa la cantidad (sin duplicar la línea)", async () => {
    const user = userEvent.setup();
    renderSalesPage();

    const row = await screen.findByText("Coca-Cola 2L");
    // Clickear la misma fila dos veces: el producto sigue apareciendo en la lista de resultados
    // después de agregarse al carrito, así que la fila original sigue siendo un target válido.
    await user.click(row);
    await user.click(row);

    const cartHeading = screen.getByText("Venta actual");
    const cartPanel = cartHeading.closest("div")!.parentElement as HTMLElement;

    expect(within(cartPanel).getAllByText("Coca-Cola 2L")).toHaveLength(1);
    expect(within(cartPanel).getByLabelText("Cantidad")).toHaveValue(2);
    expect(screen.getByRole("button", { name: /confirmar venta/i })).toBeEnabled();
  });

  it("escanear un código exacto (Enter) agrega el producto y limpia el buscador", async () => {
    const user = userEvent.setup();
    renderSalesPage();

    await screen.findByText("Coca-Cola 2L");
    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);

    await user.type(searchInput, "0045{enter}");

    const cartHeading = screen.getByText("Venta actual");
    const cartPanel = cartHeading.closest("div")!.parentElement as HTMLElement;
    expect(within(cartPanel).getByText("Jabón en polvo")).toBeInTheDocument();
    expect(searchInput).toHaveValue("");
  });

  it("confirmar la venta: en éxito limpia el carrito, avisa y devuelve el foco al buscador", async () => {
    const user = userEvent.setup();
    createSaleMock.mockResolvedValue({
      id: 10,
      status: "completed",
      total: 1200,
      createdAt: "2026-01-01T00:00:00.000Z",
      cancelledAt: null,
      items: [{ id: 1, productId: cocaCola.id, quantity: 1, unitPrice: 1200, subtotal: 1200 }],
    });

    renderSalesPage();
    await user.click(await screen.findByText("Coca-Cola 2L"));
    await user.click(screen.getByRole("button", { name: /confirmar venta/i }));

    expect(await screen.findByText(/venta registrada correctamente/i)).toBeInTheDocument();
    expect(screen.getByText(/busc.*producto para empezar/i)).toBeInTheDocument(); // carrito vacío
    expect(createSaleMock).toHaveBeenCalledWith({
      items: [{ productId: cocaCola.id, quantity: 1 }],
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/buscar por nombre/i)).toHaveFocus();
    });
  });

  it("confirmar la venta: si el backend rechaza, conserva el carrito y muestra el mensaje del error", async () => {
    const user = userEvent.setup();
    createSaleMock.mockRejectedValue(new Error('Stock insuficiente para el producto "Coca-Cola 2L"'));

    renderSalesPage();
    await user.click(await screen.findByText("Coca-Cola 2L"));
    await user.click(screen.getByRole("button", { name: /confirmar venta/i }));

    expect(await screen.findByText(/stock insuficiente/i)).toBeInTheDocument();

    const cartHeading = screen.getByText("Venta actual");
    const cartPanel = cartHeading.closest("div")!.parentElement as HTMLElement;
    expect(within(cartPanel).getByText("Coca-Cola 2L")).toBeInTheDocument();
  });

  it("evita el doble submit: el botón se deshabilita mientras se procesa la venta", async () => {
    const user = userEvent.setup();
    let resolveSale: (value: unknown) => void = () => {};
    createSaleMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSale = resolve;
      }),
    );

    renderSalesPage();
    await user.click(await screen.findByText("Coca-Cola 2L"));

    const confirmButton = screen.getByRole("button", { name: /confirmar venta/i });
    await user.click(confirmButton);

    expect(screen.getByRole("button", { name: /registrando venta/i })).toBeDisabled();
    expect(createSaleMock).toHaveBeenCalledTimes(1);

    resolveSale({
      id: 1,
      status: "completed",
      total: 1200,
      createdAt: "2026-01-01T00:00:00.000Z",
      cancelledAt: null,
      items: [],
    });
    await screen.findByText(/venta registrada correctamente/i);
  });

  describe("recibo PDF", () => {
    beforeEach(() => {
      createSaleMock.mockResolvedValue({
        id: 10,
        status: "completed",
        total: 1200,
        createdAt: "2026-01-01T00:00:00.000Z",
        cancelledAt: null,
        items: [{ id: 1, productId: cocaCola.id, quantity: 1, unitPrice: 1200, subtotal: 1200 }],
      });
    });

    it("con el checkbox destildado (default), confirmar la venta no descarga ningún recibo", async () => {
      const user = userEvent.setup();
      renderSalesPage();
      await user.click(await screen.findByText("Coca-Cola 2L"));
      await user.click(screen.getByRole("button", { name: /confirmar venta/i }));

      await screen.findByText(/venta registrada correctamente/i);
      expect(downloadSaleReceiptMock).not.toHaveBeenCalled();
    });

    it("con el checkbox tildado, confirmar la venta descarga el recibo y avisa dónde se guardó", async () => {
      const user = userEvent.setup();
      downloadSaleReceiptMock.mockResolvedValue({
        cancelled: false,
        filePath: "C:\\Users\\Rodri\\Documents\\recibo-venta-10.pdf",
      });

      renderSalesPage();
      await user.click(await screen.findByText("Coca-Cola 2L"));
      await user.click(screen.getByRole("checkbox", { name: /generar recibo pdf/i }));
      await user.click(screen.getByRole("button", { name: /confirmar venta/i }));

      expect(await screen.findByText(/recibo guardado en/i)).toBeInTheDocument();
      expect(downloadSaleReceiptMock).toHaveBeenCalledWith(10, expect.anything());
    });

    it("si falla la descarga del recibo, la venta sigue mostrando éxito y el error se avisa aparte", async () => {
      const user = userEvent.setup();
      downloadSaleReceiptMock.mockResolvedValue({ cancelled: false, error: "Backend no disponible" });

      renderSalesPage();
      await user.click(await screen.findByText("Coca-Cola 2L"));
      await user.click(screen.getByRole("checkbox", { name: /generar recibo pdf/i }));
      await user.click(screen.getByRole("button", { name: /confirmar venta/i }));

      expect(await screen.findByText(/venta registrada correctamente/i)).toBeInTheDocument();
      expect(await screen.findByText(/no se pudo guardar el recibo/i)).toBeInTheDocument();
    });
  });

  describe("vendedor actual", () => {
    beforeEach(() => {
      fetchMeMock.mockResolvedValue({ ...deviceWithSeller, sellerName: null });
    });

    it("sin vendedor actual configurado, confirmar la venta abre el modal en vez de llamar a la API", async () => {
      const user = userEvent.setup();
      renderSalesPage();
      await user.click(await screen.findByText("Coca-Cola 2L"));

      await user.click(screen.getByRole("button", { name: /confirmar venta/i }));

      expect(
        await screen.findByRole("heading", { name: /falta indicar el vendedor actual/i }),
      ).toBeInTheDocument();
      expect(createSaleMock).not.toHaveBeenCalled();
    });

    it("guardar el nombre desde el modal lo persiste y cierra el modal, sin reintentar la venta sola", async () => {
      const user = userEvent.setup();
      updateSellerNameMock.mockResolvedValue({ ...deviceWithSeller, sellerName: "Rodrigo" });
      renderSalesPage();
      await user.click(await screen.findByText("Coca-Cola 2L"));
      await user.click(screen.getByRole("button", { name: /confirmar venta/i }));
      await screen.findByRole("heading", { name: /falta indicar el vendedor actual/i });

      await user.type(
        screen.getByLabelText(/coloque el nombre del vendedor actual/i),
        "Rodrigo",
      );
      await user.click(screen.getByRole("button", { name: /^guardar$/i }));

      expect(updateSellerNameMock).toHaveBeenCalledWith({ sellerName: "Rodrigo" });
      await waitFor(() =>
        expect(
          screen.queryByRole("heading", { name: /falta indicar el vendedor actual/i }),
        ).not.toBeInTheDocument(),
      );
      // No reintenta la venta automáticamente — la persona confirma de nuevo por su cuenta.
      expect(createSaleMock).not.toHaveBeenCalled();
    });
  });
});
