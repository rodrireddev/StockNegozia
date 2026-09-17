import { useMutation } from "@tanstack/react-query";
import { downloadSaleReceipt } from "../api/receipt.api";

export function useDownloadReceipt() {
  return useMutation({ mutationFn: downloadSaleReceipt });
}
