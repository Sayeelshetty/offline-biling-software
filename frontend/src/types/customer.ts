export type CustomerSyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED";

export type Customer = {
  id: string;

  name: string;
  mobile: string;

  email: string | null;
  address: string | null;

  totalPurchases: number;
  outstandingAmount: number;

  serverId: string | null;
  createdAt: string;
  updatedAt: string;

  syncStatus: CustomerSyncStatus;
  deviceId: string;
};

export type CustomerInput = {
  name: string;
  mobile: string;

  email?: string | null;
  address?: string | null;

  deviceId: string;
};

export type CustomerUpdateInput = {
  name: string;
  mobile: string;

  email?: string | null;
  address?: string | null;
};

export type CustomerSearchOptions = {
  includeInactive?: boolean;
};

export type CustomerPurchaseSummary = {
  customerId: string;
  totalPurchases: number;
  outstandingAmount: number;
};