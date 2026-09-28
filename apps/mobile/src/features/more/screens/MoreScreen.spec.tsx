import { render, screen } from "@testing-library/react-native";
import { MoreScreen } from "./MoreScreen";

jest.mock("@/devices/useCloudAccountStatus", () => ({
  useCloudAccountStatus: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import { useCloudAccountStatus } from "@/devices/useCloudAccountStatus";

const mockedUseCloudAccountStatus = jest.mocked(useCloudAccountStatus);

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

  it("mientras la consulta no resolvió todavía (sin data), tampoco aparece", async () => {
    mockedUseCloudAccountStatus.mockReturnValue({ data: undefined } as never);
    await render(<MoreScreen />);

    expect(screen.queryByText("Beneficios")).toBeNull();
  });
});
