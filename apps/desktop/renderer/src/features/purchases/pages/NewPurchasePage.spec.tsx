import type { ProductDto, SupplierDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NewPurchasePage } from "./NewPurchasePage";

const { fetchProductsMock, createPurchaseMock, fetchSuppliersMock } = vi.hoisted(() => ({
  fetchProductsMock: vi.fn(),
  createPurchaseMock: vi.fn(),
  fetchSuppliersMock: vi.fn(),
}));

vi.mock("@/features/products/api/products.api", () => ({
  fetchProducts: fetchProductsMock,
}));
vi.mock("@/features/purchases/api/purchases.api", () => ({
  createPurchase: createPurchaseMock,
}));
vi.mock("@/features/suppliers/api/suppliers.api", () => ({
  fetchSuppliers: fetchSuppliersMock,
}));

function makeProduct(overrides: Partial<ProductDto> & { id: number }): ProductDto {
  return {
    name: "Producto",
    sku: `SKU-${overrides.id}`,
    barcode: null,
    description: null,
    categoryId: null,
    categoryName: null,
    purchasePrice: 900,
    salePrice: 1500,
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

const cocaCola = makeProduct({ id: 1, name: "Coca-Cola 2L", sku: "0012" });
const distribuidoraSur: SupplierDto = {
  id: 5,
  name: "Distribuidora Sur",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewPurchasePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function cartPanel() {
  const heading = screen.getByText("Compra actual");
  return heading.closest("div")!.parentElement as HTMLElement;
}

beforeEach(() => {
  fetchProductsMock.mockReset();
  createPurchaseMock.mockReset();
  fetchSuppliersMock.mockReset();
  fetchProductsMock.mockResolvedValue([cocaCola]);
  fetchSuppliersMock.mockResolvedValue([distribuidoraSur]);
});

describe("NewPurchasePage", () => {
  it("el botón de confirmar está deshabilitado con el carrito vacío", async () => {
    renderPage();
    await screen.findByText("Coca-Cola 2L");

    expect(screen.getByRole("button", { name: /confirmar compra/i })).toBeDisabled();
  });

  it("agregar el mismo producto dos veces incrementa la cantidad en vez de duplicar la línea", async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByText("Coca-Cola 2L");

    await user.click(row);
    await user.click(row);

    const panel = cartPanel();
    expect(within(panel).getAllByText("Coca-Cola 2L")).toHaveLength(1);
    expect(within(panel).getByLabelText("Cantidad")).toHaveValue(2);
  });

  it("impide confirmar sin proveedor, con un mensaje amigable, sin llamar al backend", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByText("Coca-Cola 2L"));

    await user.click(screen.getByRole("button", { name: /confirmar compra/i }));

    expect(
      await screen.findByText(/seleccioná un proveedor antes de confirmar la compra/i),
    ).toBeInTheDocument();
    expect(createPurchaseMock).not.toHaveBeenCalled();
  });

  it("confirma la compra con proveedor + producto: éxito limpia carrito y proveedor, y avisa", async () => {
    const user = userEvent.setup();
    createPurchaseMock.mockResolvedValue({
      id: 1,
      supplierId: distribuidoraSur.id,
      supplierName: distribuidoraSur.name,
      total: 900,
      createdAt: "2026-01-01T00:00:00.000Z",
      items: [{ id: 1, productId: cocaCola.id, quantity: 1, unitCost: 900, subtotal: 900 }],
    });

    renderPage();
    await screen.findByText("Coca-Cola 2L");

    await user.selectOptions(screen.getByLabelText(/proveedor/i), String(distribuidoraSur.id));
    await user.click(screen.getByText("Coca-Cola 2L"));
    await user.click(screen.getByRole("button", { name: /confirmar compra/i }));

    expect(await screen.findByText(/compra registrada correctamente/i)).toBeInTheDocument();
    expect(createPurchaseMock).toHaveBeenCalledWith({
      supplierId: distribuidoraSur.id,
      items: [{ productId: cocaCola.id, quantity: 1, unitCost: 900 }],
    });
    expect(screen.getByText(/busc.*producto para empezar/i)).toBeInTheDocument(); // carrito vacío
    expect(screen.getByLabelText(/proveedor/i)).toHaveValue(""); // proveedor también se resetea
  });

  it("si el backend rechaza la compra, conserva proveedor y carrito, y muestra el mensaje del error", async () => {
    const user = userEvent.setup();
    createPurchaseMock.mockRejectedValue(new Error("Proveedor no encontrado"));

    renderPage();
    await screen.findByText("Coca-Cola 2L");
    await user.selectOptions(screen.getByLabelText(/proveedor/i), String(distribuidoraSur.id));
    await user.click(screen.getByText("Coca-Cola 2L"));
    await user.click(screen.getByRole("button", { name: /confirmar compra/i }));

    expect(await screen.findByText(/proveedor no encontrado/i)).toBeInTheDocument();

    const panel = cartPanel();
    expect(within(panel).getByText("Coca-Cola 2L")).toBeInTheDocument();
    expect(screen.getByLabelText(/proveedor/i)).toHaveValue(String(distribuidoraSur.id));
  });

  it("evita el doble submit: el botón se deshabilita mientras se procesa la compra", async () => {
    const user = userEvent.setup();
    let resolvePurchase: (value: unknown) => void = () => {};
    createPurchaseMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePurchase = resolve;
      }),
    );

    renderPage();
    await screen.findByText("Coca-Cola 2L");
    await user.selectOptions(screen.getByLabelText(/proveedor/i), String(distribuidoraSur.id));
    await user.click(screen.getByText("Coca-Cola 2L"));

    const confirmButton = screen.getByRole("button", { name: /confirmar compra/i });
    await user.click(confirmButton);

    expect(screen.getByRole("button", { name: /registrando compra/i })).toBeDisabled();
    expect(createPurchaseMock).toHaveBeenCalledTimes(1);

    resolvePurchase({
      id: 1,
      supplierId: distribuidoraSur.id,
      supplierName: distribuidoraSur.name,
      total: 900,
      createdAt: "2026-01-01T00:00:00.000Z",
      items: [],
    });
    await screen.findByText(/compra registrada correctamente/i);
  });
});
