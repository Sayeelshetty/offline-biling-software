import type {
  Customer,
  CustomerInput,
  CustomerUpdateInput,
} from "../types/customer";

type DesktopCustomerApi = {
  getById: (id: string) => Promise<Customer | null>;
  getByMobile: (mobile: string) => Promise<Customer | null>;

  create: (input: CustomerInput) => Promise<Customer>;
  update: (
    id: string,
    input: CustomerUpdateInput
  ) => Promise<Customer>;

  getAll: () => Promise<Customer[]>;
  search: (searchTerm: string) => Promise<Customer[]>;

  getOutstanding: () => Promise<Customer[]>;

  updateFinancials: (
    customerId: string,
    purchaseAmountDelta?: number,
    outstandingAmountDelta?: number
  ) => Promise<Customer>;
};

function getCustomerApi(): DesktopCustomerApi {
  const api = window.desktopAPI?.customers as
    | DesktopCustomerApi
    | undefined;

  if (!api) {
    throw new Error(
      "Customer API is not available."
    );
  }

  return api;
}

async function getCustomerById(
  id: string
): Promise<Customer | null> {
  if (!id.trim()) {
    throw new Error("Customer ID is required.");
  }

  return getCustomerApi().getById(id);
}

async function getCustomerByMobile(
  mobile: string
): Promise<Customer | null> {
  if (!mobile.trim()) {
    throw new Error(
      "Customer mobile number is required."
    );
  }

  return getCustomerApi().getByMobile(
    mobile.trim()
  );
}

async function createCustomer(
  input: CustomerInput
): Promise<Customer> {
  return getCustomerApi().create(input);
}

async function updateCustomer(
  id: string,
  input: CustomerUpdateInput
): Promise<Customer> {
  return getCustomerApi().update(id, input);
}

async function getAllCustomers(): Promise<Customer[]> {
  return getCustomerApi().getAll();
}

async function searchCustomers(
  searchTerm: string
): Promise<Customer[]> {
  return getCustomerApi().search(searchTerm);
}

async function getOutstandingCustomers(): Promise<
  Customer[]
> {
  return getCustomerApi().getOutstanding();
}

async function updateCustomerFinancials(
  customerId: string,
  purchaseAmountDelta = 0,
  outstandingAmountDelta = 0
): Promise<Customer> {
  return getCustomerApi().updateFinancials(
    customerId,
    purchaseAmountDelta,
    outstandingAmountDelta
  );
}

const customerService = {
  getCustomerById,
  getCustomerByMobile,
  createCustomer,
  updateCustomer,
  getAllCustomers,
  searchCustomers,
  getOutstandingCustomers,
  updateCustomerFinancials,
};

export default customerService;