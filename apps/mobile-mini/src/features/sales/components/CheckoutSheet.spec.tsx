import { cleanup, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  changePaymentLineMethod,
  createPaymentDraft,
  summarizePaymentDraft,
  type PaymentDraft,
} from "@stocknegozia/shared";
import { CheckoutSheet } from "./CheckoutSheet";

const customers = [{ id: 7, name: "Ana" }];

async function renderSheet(draft: PaymentDraft, customerId: number | null) {
  const onDraftChange = jest.fn();
  const onCustomerChange = jest.fn();
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <CheckoutSheet
        visible
        onClose={jest.fn()}
        total={1000}
        itemCount={1}
        draft={draft}
        onDraftChange={onDraftChange}
        summary={summarizePaymentDraft(draft, 1000)}
        generateReceipt={false}
        onGenerateReceiptChange={jest.fn()}
        onConfirm={jest.fn()}
        isSubmitting={false}
        error={null}
        customers={customers}
        customerId={customerId}
        onCustomerChange={onCustomerChange}
      />
    </SafeAreaProvider>,
  );
  return { onDraftChange, onCustomerChange };
}

describe("CheckoutSheet · cliente y cuenta corriente", () => {
  afterEach(async () => {
    await cleanup();
  });

  it("sin cliente no ofrece cuenta corriente; con cliente sí", async () => {
    await renderSheet(createPaymentDraft(), null);
    expect(screen.queryByText("Cta. cte.")).toBeNull();
    await cleanup();

    await renderSheet(createPaymentDraft(), 7);
    expect(screen.getByText("Cta. cte.")).toBeTruthy();
  });

  it("al sacar el cliente con cuenta corriente elegida, vuelve al medio por defecto", async () => {
    const base = createPaymentDraft();
    const draft = { ...base, lines: base.lines.map((l) => changePaymentLineMethod(l, "account")) };
    const { onDraftChange, onCustomerChange } = await renderSheet(draft, 7);

    await fireEvent.press(screen.getByTestId("checkout-customer"));
    await fireEvent.press(screen.getByText("Sin cliente (mostrador)"));

    expect(onCustomerChange).toHaveBeenCalledWith(null);
    expect(onDraftChange.mock.calls[0]?.[0].lines[0].method).not.toBe("account");
  });
});
