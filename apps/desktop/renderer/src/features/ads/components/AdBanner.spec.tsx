import type { ActiveHouseAdDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdBanner } from "./AdBanner";

const { fetchActiveHouseAdMock, recordHouseAdImpressionMock } = vi.hoisted(() => ({
  fetchActiveHouseAdMock: vi.fn(),
  recordHouseAdImpressionMock: vi.fn(),
}));

vi.mock("../api/ads.api", () => ({
  fetchActiveHouseAd: fetchActiveHouseAdMock,
  recordHouseAdImpression: recordHouseAdImpressionMock,
}));

const houseAd: ActiveHouseAdDto = {
  id: "house-ad-1",
  title: "Probá StockNegozia gratis",
  body: "Guardá tus datos en la nube",
  imageUrl: null,
  ctaLabel: "Ver más",
  ctaUrl: "https://stocknegozia.com/promo",
};

function renderBanner() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdBanner />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  fetchActiveHouseAdMock.mockReset();
  recordHouseAdImpressionMock.mockReset();
  recordHouseAdImpressionMock.mockResolvedValue(undefined);
});

describe("AdBanner", () => {
  it("no renderiza nada mientras no hay ningún house ad activo", async () => {
    fetchActiveHouseAdMock.mockResolvedValue(null);
    const { container } = renderBanner();

    await vi.waitFor(() => expect(fetchActiveHouseAdMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    expect(recordHouseAdImpressionMock).not.toHaveBeenCalled();
  });

  it("no renderiza nada si falla la consulta (ej. cloud-backend caído) — nunca rompe la interfaz", async () => {
    fetchActiveHouseAdMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { container } = renderBanner();

    await vi.waitFor(() => expect(fetchActiveHouseAdMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el house ad activo y registra una sola impresión", async () => {
    fetchActiveHouseAdMock.mockResolvedValue(houseAd);
    renderBanner();

    expect(await screen.findByText("Probá StockNegozia gratis")).toBeInTheDocument();
    expect(screen.getByText("Guardá tus datos en la nube")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Ver más" });
    expect(cta).toHaveAttribute("href", "https://stocknegozia.com/promo");
    expect(cta).toHaveAttribute("target", "_blank");

    await vi.waitFor(() => expect(recordHouseAdImpressionMock).toHaveBeenCalledTimes(1));
    expect(recordHouseAdImpressionMock).toHaveBeenCalledWith("house-ad-1");
  });
});
