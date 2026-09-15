import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useToggleActive } from "./useToggleActive";

jest.mock("@/api/endpoints/products", () => ({
  updateProductActive: jest.fn(),
}));

import { updateProductActive } from "@/api/endpoints/products";

const mockedUpdateProductActive = jest.mocked(updateProductActive);

describe("useToggleActive", () => {
  it("llama a PATCH /products/:id/active e invalida la lista de productos", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    mockedUpdateProductActive.mockResolvedValue({} as never);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(() => useToggleActive(), { wrapper });

    result.current.mutate({ id: 7, active: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedUpdateProductActive).toHaveBeenCalledWith(7, { active: false });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["products"] });
  });
});
