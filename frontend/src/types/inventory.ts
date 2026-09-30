export type StockMovementType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "ADJUSTMENT";

export type InventorySyncStatus =
  | "PENDING"
  | "SYNCED"
  | "FAILED";

export interface StockMovement {
  id: string;
  serverId: string | null;
  transactionId: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: InventorySyncStatus;
  deviceId: string;
}

export interface StockMovementResult {
  movement: StockMovement;
  currentStock: number;
}

export interface StockOperationInput {
  productId: string;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  deviceId: string;
}

export interface StockAdjustmentInput {
  productId: string;
  adjustmentQuantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  deviceId: string;
}

export interface CurrentStock {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface StockSummary {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  purchasePrice: number;
  sellingPrice: number;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
  netMovement: number;
  stockValue: number;
}