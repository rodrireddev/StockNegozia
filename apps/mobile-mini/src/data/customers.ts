import type { CustomerAccountDto, CustomerDto } from "@stocknegozia/api-contracts";
import type {
  CreateCustomerInput,
  CustomerPaymentInput,
  UpdateCustomerInput,
} from "@stocknegozia/validation";
import { customersService } from "@/features/customers/data/service";

export async function fetchCustomers(): Promise<CustomerDto[]> {
  return customersService.findAll();
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
  return customersService.create(input);
}

export async function updateCustomer(id: number, input: UpdateCustomerInput): Promise<CustomerDto> {
  return customersService.update(id, input);
}

export async function fetchCustomerAccount(id: number): Promise<CustomerAccountDto> {
  return customersService.getAccount(id);
}

export async function registerCustomerPayment(
  id: number,
  input: CustomerPaymentInput,
): Promise<CustomerAccountDto> {
  return customersService.registerPayment(id, input);
}
