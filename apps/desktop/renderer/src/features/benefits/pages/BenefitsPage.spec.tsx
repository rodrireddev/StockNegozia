import type { AccountMeDto } from "@stocknegozia/api-contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BenefitsPage } from "./BenefitsPage";

const { useAccountMock } = vi.hoisted(() => ({ useAccountMock: vi.fn() }));

vi.mock("../AccountContext", () => ({ useAccount: useAccountMock }));
vi.mock("../hooks/useActiveGoals", () => ({
  useActiveGoals: () => ({ goals: [], isLoading: false }),
}));
vi.mock("../hooks/useAchievements", () => ({
  useAchievements: () => ({ achievements: [], isLoading: false }),
}));

const me: AccountMeDto = {
  id: "user-1",
  email: "comercio@test.com",
  level: "bronze",
  currentStreak: 3,
  longestStreak: 5,
  referralCode: "ABC123",
  isCofounder: false,
  creditBalance: 42,
  emailVerifiedAt: null,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BenefitsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAccountMock.mockReset();
});

describe("BenefitsPage", () => {
  it("sin sesión, muestra el formulario de login (nunca el saldo)", () => {
    useAccountMock.mockReturnValue({ status: "unauthenticated", me: null });
    renderPage();

    expect(screen.getByText("Beneficios")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ créditos$/)).not.toBeInTheDocument();
  });

  it("autenticado, muestra el saldo y NUNCA un botón de ver anuncio", () => {
    useAccountMock.mockReturnValue({ status: "authenticated", me, signOut: vi.fn() });
    renderPage();

    expect(screen.getByText("42 créditos")).toBeInTheDocument();
    expect(screen.getByText("Código de referido: ABC123")).toBeInTheDocument();
    expect(screen.getByText(/no se pueden ver anuncios para sumar créditos/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ver anuncio/i })).not.toBeInTheDocument();
  });
});
