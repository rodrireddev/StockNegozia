import { cleanup, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdaptiveShell } from "./AdaptiveShell";

async function renderShell() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AdaptiveShell />
    </SafeAreaProvider>,
  );
}

jest.mock("@/devices/useIsCashier", () => ({
  ...jest.requireActual("@/devices/useIsCashier"),
  useIsCashier: () => false,
}));
jest.mock("@/hooks/useDeviceSize", () => ({
  useDeviceSize: jest.fn(),
}));
jest.mock("expo-router", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    usePathname: () => "/products",
    Slot: () => <Text>contenido</Text>,
    Link: ({ children }: { children: React.ReactNode }) => children,
  };
});

import { useDeviceSize } from "@/hooks/useDeviceSize";

const mockedUseDeviceSize = jest.mocked(useDeviceSize);

describe("AdaptiveShell", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("en teléfono muestra la barra inferior compacta: Productos, Ventas y Más", async () => {
    mockedUseDeviceSize.mockReturnValue({
      width: 390,
      height: 844,
      isTablet: false,
      isLandscape: false,
    });
    await renderShell();

    expect(screen.getByText("Productos")).toBeTruthy();
    expect(screen.getByText("Ventas")).toBeTruthy();
    expect(screen.getByText("Más")).toBeTruthy();
    expect(screen.queryByText("Compras")).toBeNull();
  });

  it("en tablet muestra el riel lateral con todas las secciones operativas", async () => {
    mockedUseDeviceSize.mockReturnValue({
      width: 900,
      height: 1200,
      isTablet: true,
      isLandscape: false,
    });
    await renderShell();

    expect(screen.getByText("Productos")).toBeTruthy();
    expect(screen.getByText("Ventas")).toBeTruthy();
    expect(screen.getByText("Compras")).toBeTruthy();
    expect(screen.getByText("Inventario")).toBeTruthy();
    expect(screen.getByText("Proveedores")).toBeTruthy();
    expect(screen.getByText("Ajustes")).toBeTruthy();
  });

  it("nunca expone una sección de administración de dispositivos (Dispositivos)", async () => {
    mockedUseDeviceSize.mockReturnValue({
      width: 900,
      height: 1200,
      isTablet: true,
      isLandscape: false,
    });
    await renderShell();

    expect(screen.queryByText("Dispositivos")).toBeNull();
    expect(screen.queryByText("Dispositivo")).toBeNull();
  });
});
