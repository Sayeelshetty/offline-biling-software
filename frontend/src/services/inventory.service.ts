import type {
  CurrentStock,
  StockAdjustmentInput,
  StockMovement,
  StockMovementResult,
  StockOperationInput,
  StockSummary,
} from "../types/inventory";

/*
|--------------------------------------------------------------------------
| Stock In
|--------------------------------------------------------------------------
*/

export async function stockIn(
  inventoryData: StockOperationInput
): Promise<StockMovementResult> {
  const response =
    await window.desktopAPI.inventory.stockIn(
      inventoryData
    );

  if (
    !response.success ||
    !response.result
  ) {
    throw new Error(
      response.error ||
        "Failed to add stock"
    );
  }

  return response.result;
}

/*
|--------------------------------------------------------------------------
| Stock Out
|--------------------------------------------------------------------------
*/

export async function stockOut(
  inventoryData: StockOperationInput
): Promise<StockMovementResult> {
  const response =
    await window.desktopAPI.inventory.stockOut(
      inventoryData
    );

  if (
    !response.success ||
    !response.result
  ) {
    throw new Error(
      response.error ||
        "Failed to remove stock"
    );
  }

  return response.result;
}

/*
|--------------------------------------------------------------------------
| Stock Adjustment
|--------------------------------------------------------------------------
*/

export async function adjustStock(
  inventoryData: StockAdjustmentInput
): Promise<StockMovementResult> {
  const response =
    await window.desktopAPI.inventory.adjust(
      inventoryData
    );

  if (
    !response.success ||
    !response.result
  ) {
    throw new Error(
      response.error ||
        "Failed to adjust stock"
    );
  }

  return response.result;
}

/*
|--------------------------------------------------------------------------
| Current Stock
|--------------------------------------------------------------------------
*/

export async function getCurrentStock(
  productId: string
): Promise<CurrentStock> {
  const response =
    await window.desktopAPI.inventory.getCurrentStock(
      productId
    );

  if (
    !response.success ||
    !response.result
  ) {
    throw new Error(
      response.error ||
        "Failed to get current stock"
    );
  }

  return response.result;
}

/*
|--------------------------------------------------------------------------
| Product Stock History
|--------------------------------------------------------------------------
*/

export async function getStockMovements(
  productId: string,
  limit = 100
): Promise<StockMovement[]> {
  const response =
    await window.desktopAPI.inventory.getMovements(
      productId,
      limit
    );

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to get stock movements"
    );
  }

  return response.movements ?? [];
}

/*
|--------------------------------------------------------------------------
| All Stock Movements
|--------------------------------------------------------------------------
*/

export async function getAllStockMovements(
  limit = 200
): Promise<StockMovement[]> {
  const response =
    await window.desktopAPI.inventory.getAllMovements(
      limit
    );

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to get stock movements"
    );
  }

  return response.movements ?? [];
}

/*
|--------------------------------------------------------------------------
| Inventory Summary
|--------------------------------------------------------------------------
*/

export async function getStockSummary(): Promise<
  StockSummary[]
> {
  const response =
    await window.desktopAPI.inventory.getSummary();

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to get inventory summary"
    );
  }

  return response.products ?? [];
}

/*
|--------------------------------------------------------------------------
| Default Inventory Service
|--------------------------------------------------------------------------
*/

const inventoryService = {
  stockIn,
  stockOut,
  adjustStock,
  getCurrentStock,
  getStockMovements,
  getAllStockMovements,
  getStockSummary,
};

export default inventoryService;