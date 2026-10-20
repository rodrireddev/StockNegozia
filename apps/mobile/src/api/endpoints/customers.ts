import type { CustomerDto } from "@stocknegozia/api-contracts";
import { apiGet } from "@/api/client";

/** Los clientes se cargan desde Desktop; acá solo se eligen en la venta. */
export function fetchCustomers(): Promise<CustomerDto[]> {
  return apiGet<CustomerDto[]>("/customers");
}
