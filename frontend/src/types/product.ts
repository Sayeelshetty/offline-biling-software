export type ProductStatus = "ACTIVE" | "INACTIVE";

export type SyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED";

export interface Product {
  id: string;
  serverId: string | null;

  name: string;
  sku: string;
  barcode: string | null;

  categoryId: string | null;

  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;

  currentStock: number;
  minimumStock: number;

  unit: string;
  imagePath: string | null;

  status: ProductStatus;

  createdAt: string;
  updatedAt: string;

  syncStatus: SyncStatus;
  deviceId: string;
}

export interface ProductInput {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string | null;
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;
  currentStock: number;
  minimumStock: number;
  unit: string;
  imagePath?: string | null;
  status?: ProductStatus;
  deviceId: string;
}

export interface ProductUpdateInput {
  name: string;
  sku: string;
  barcode?: string;
  categoryId?: string | null;
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;
  minimumStock: number;
  unit: string;
  imagePath?: string | null;
  status?: ProductStatus;
}