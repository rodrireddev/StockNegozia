import { render, screen } from "@testing-library/react-native";
import { MoreScreen } from "./MoreScreen";

jest.mock("@/devices/useCloudAccountStatus", () => ({
  useCloudAccountStatus: jest.fn(),
}));
jest.mock("@/devices/useIsCashier", () => ({
  ...jest.requireActual("@/devices/useIsCashier"),
  useIsCashier: jest.fn(() => false),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import { useCloudAccountStatus } from "@/devices/useCloudAccountStatus";
import { useIsCashier } from "@/devices/useIsCashier";

const mockedUseCloudAccountStatus = jest.mocked(useCloudAccountStatus);
const mockedUseIsCashier = jest.mocked(useIsCashier);

describe("MoreScreen", () => {
  it('sin cuenta cloud logueada en el desktop emparejado, "Beneficios" no aparece en el menú', async () => {
    mockedUseCloudAccountStatus.mockReturnValue({ data: { linked: false } } as never);
    await render(<MoreScreen />);

    expect(screen.queryByText("Beneficios")).toBeNull();
  });

  it('con el desktop logueado, "Beneficios" aparece en el menú', async () => {
    mockedUseCloudAccountStatus.mockReturnValue({ data: { linked: true } } as never);
    await render(<MoreScreen />);

    expect(screen.getByText("Beneficios")).toBeTruthy();
  });

  it("un dispositivo Cajero no ve Compras, Ganancias ni Ajustes de caja", async () => {
    mockedUseCloudAccountStatus.mockReturnValue({ data: { linked: false } } as never);
    mockedUseIsCashier.mockReturnValueOnce(true);
    await render(<MoreScreen />);

    expect(screen.queryByText("Compras")).toBeNull();
    expect(screen.queryByText("Ganancias")).toBeNull();
    expect(screen.queryByText("Ajustes de caja")).toBeNull();
    expect(screen.getByText("Inventario")).toBeTruthy();
  });

  it("mientras la consulta no resolvió todavía (sin data), tampoco aparece", async () => {
    mockedUseCloudAccountStatus.mockReturnValue({ data: undefined } as never);
    await render(<MoreScreen />);

    expect(screen.queryByText("Beneficios")).toBeNull();
  });
});
