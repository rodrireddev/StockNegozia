import { useMutation } from "@tanstack/react-query";
import { downloadSaleReceipt } from "@/api/endpoints/receipt";

export function useDownloadReceipt() {
  return useMutation({ mutationFn: downloadSaleReceipt });
}
