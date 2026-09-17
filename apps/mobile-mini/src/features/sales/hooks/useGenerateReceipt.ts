import { useMutation } from "@tanstack/react-query";
import { generateAndShareReceipt, type ReceiptLine, type ReceiptSale } from "../data/receipt";

export function useGenerateReceipt() {
  return useMutation({
    mutationFn: ({ sale, lines }: { sale: ReceiptSale; lines: ReceiptLine[] }) =>
      generateAndShareReceipt(sale, lines),
  });
}
