import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { PairingScreen } from "./PairingScreen";

jest.mock("@/config/termsStore", () => ({
  hasAcceptedTerms: jest.fn(),
  acceptTerms: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/auth/AuthContext", () => ({
  useAuth: jest.fn(),
}));
jest.mock("@/features/pairing/hooks/usePairDevice", () => ({
  usePairDevice: jest.fn(),
}));
jest.mock("@/features/pairing/components/steps/InstructionsStep", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    InstructionsStep: ({ onNext }: { onNext: () => void }) => (
      <Pressable onPress={onNext} testID="mock-instructions-next">
        <Text>mock-instructions</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/features/pairing/components/steps/TermsStep", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    TermsStep: ({ onNext }: { onNext: () => void }) => (
      <Pressable onPress={onNext} testID="mock-terms-next">
        <Text>mock-terms</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/features/pairing/components/steps/ScanStep", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    ScanStep: ({ onScanned }: { onScanned: (payload: unknown) => void }) => (
      <Pressable
        onPress={() =>
          onScanned({
            pairingId: "pairing-1",
            token: "token-1",
            backendUrl: "http://192.168.1.30:38123",
          })
        }
        testID="mock-scan"
      >
        <Text>mock-scan</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/features/pairing/components/steps/VerifyStep", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    VerifyStep: ({ onNext }: { onNext: (code: string) => void }) => (
      <Pressable onPress={() => onNext("123456")} testID="mock-verify-next">
        <Text>mock-verify</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/features/pairing/components/steps/NameStep", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    NameStep: ({ onSubmit }: { onSubmit: (name: string) => void }) => (
      <Pressable onPress={() => onSubmit("Mi teléfono")} testID="mock-name-submit">
        <Text>mock-name</Text>
      </Pressable>
    ),
  };
});

import { hasAcceptedTerms } from "@/config/termsStore";
import { useAuth } from "@/auth/AuthContext";
import { usePairDevice } from "@/features/pairing/hooks/usePairDevice";

const mockedHasAcceptedTerms = jest.mocked(hasAcceptedTerms);
const mockedUseAuth = jest.mocked(useAuth);
const mockedUsePairDevice = jest.mocked(usePairDevice);

describe("PairingScreen (wizard)", () => {
  const configureBackendUrl = jest.fn().mockResolvedValue(undefined);
  const mutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    configureBackendUrl.mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      status: "unauthenticated",
      backendUrl: null,
      configureBackendUrl,
      pair: jest.fn(),
      signOut: jest.fn(),
    });
    mockedUsePairDevice.mockReturnValue({ mutate, isPending: false } as never);
  });

  it("cuando los términos NO fueron aceptados, pasa por instrucciones → términos → escaneo", async () => {
    mockedHasAcceptedTerms.mockResolvedValue(false);
    const user = userEvent.setup();
    await render(<PairingScreen />);

    await waitFor(() => expect(screen.getByTestId("mock-instructions-next")).toBeTruthy());
    await user.press(screen.getByTestId("mock-instructions-next"));

    expect(await screen.findByTestId("mock-terms-next")).toBeTruthy();
    await user.press(screen.getByTestId("mock-terms-next"));

    expect(await screen.findByTestId("mock-scan")).toBeTruthy();
  });

  it("si ya se aceptaron los términos antes, instrucciones va directo a escaneo", async () => {
    mockedHasAcceptedTerms.mockResolvedValue(true);
    const user = userEvent.setup();
    await render(<PairingScreen />);

    await waitFor(() => expect(screen.getByTestId("mock-instructions-next")).toBeTruthy());
    await user.press(screen.getByTestId("mock-instructions-next"));

    expect(await screen.findByTestId("mock-scan")).toBeTruthy();
    expect(screen.queryByTestId("mock-terms-next")).toBeNull();
  });

  it("configura la URL del backend automáticamente desde el QR antes de confirmar el pairing — nunca se le pide a la persona", async () => {
    mockedHasAcceptedTerms.mockResolvedValue(true);
    const user = userEvent.setup();
    await render(<PairingScreen />);

    await user.press(await screen.findByTestId("mock-instructions-next"));
    await user.press(await screen.findByTestId("mock-scan"));
    await user.press(await screen.findByTestId("mock-verify-next"));
    await user.press(await screen.findByTestId("mock-name-submit"));

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(configureBackendUrl).toHaveBeenCalledWith("http://192.168.1.30:38123");
    // configureBackendUrl se llama y se espera ANTES de disparar la mutación de pairing.
    const configureOrder = configureBackendUrl.mock.invocationCallOrder[0];
    const mutateOrder = mutate.mock.invocationCallOrder[0];
    expect(configureOrder).toBeDefined();
    expect(mutateOrder).toBeDefined();
    expect(configureOrder as number).toBeLessThan(mutateOrder as number);
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({
      pairingId: "pairing-1",
      token: "token-1",
      verificationCode: "123456",
      deviceName: "Mi teléfono",
    });
  });
});
