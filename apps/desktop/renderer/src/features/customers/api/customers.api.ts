import type { CustomerAccountDto, CustomerDto } from "@stocknegozia/api-contracts";
import type {
  CreateCustomerInput,
  CustomerPaymentInput,
  UpdateCustomerInput,
} from "@stocknegozia/validation";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";

export function fetchCustomers(): Promise<CustomerDto[]> {
  return apiGet<CustomerDto[]>("/customers");
}

export function createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
  return apiPost<CustomerDto>("/customers", input);
}

export function updateCustomer(id: number, input: UpdateCustomerInput): Promise<CustomerDto> {
  return apiPatch<CustomerDto>(`/customers/${id}`, input);
}

export function fetchCustomerAccount(id: number): Promise<CustomerAccountDto> {
  return apiGet<CustomerAccountDto>(`/customers/${id}/account`);
}

export function registerCustomerPayment(
  id: number,
  input: CustomerPaymentInput,
): Promise<CustomerAccountDto> {
  return apiPost<CustomerAccountDto>(`/customers/${id}/payments`, input);
}
