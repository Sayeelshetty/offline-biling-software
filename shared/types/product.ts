export type ProductStatus = "ACTIVE" | "INACTIVE";

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

  syncStatus: "PENDING" | "SYNCED" | "FAILED";

  deviceId: string;
}