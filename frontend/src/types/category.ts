export type CategoryStatus = "ACTIVE" | "INACTIVE";

export interface Category {
  id: string;
  serverId: string | null;
  name: string;
  description: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  deviceId: string;
}

export interface CategoryInput {
  name: string;
  description?: string;
  deviceId: string;
}

export interface CategoryUpdateInput {
  id: string;
  name: string;
  description?: string;
}