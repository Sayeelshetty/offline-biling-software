import type {
  Product,
  ProductInput,
  ProductUpdateInput,
} from "../../../shared/types/product";

import type {
  Category,
  CategoryInput,
  CategoryUpdateInput,
} from "../../../shared/types/category";


import type {
  CreateInvoiceInput,
  CreateInvoiceResult,
  Invoice,
} from "../../../shared/types/invoice";

import type {
  StockMovementResult,
  StockOperationInput,
  StockAdjustmentInput,
  CurrentStock,
  StockMovement,
  StockSummary,
} from "../../../shared/types/inventory";

interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

interface DatabaseStatus {
  success: boolean;
  path?: string;
  tableCount?: number;
  tables?: string[];
  error?: string;
}

interface ProductResponse {
  success: boolean;
  product?: Product | null;
  error?: string;
}

interface ProductListResponse {
  success: boolean;
  products?: Product[];
  error?: string;
}

interface ProductExportResponse {
  success: boolean;
  canceled?: boolean;
  path?: string;
  count?: number;
  error?: string;
}

interface ImportedProductData {
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
  status: "ACTIVE" | "INACTIVE";
}

interface ProductImportResponse {
  success: boolean;
  canceled?: boolean;
  path?: string;
  count?: number;
  products?: ImportedProductData[];
  errors?: string[];
  error?: string;
}

interface CategoryResponse {
  success: boolean;
  category?: Category | null;
  error?: string;
}

interface CategoryListResponse {
  success: boolean;
  categories?: Category[];
  error?: string;
}

interface InventoryMovementResponse {
  success: boolean;
  result?: StockMovementResult;
  error?: string;
}

interface InventoryCurrentStockResponse {
  success: boolean;
  result?: CurrentStock;
  error?: string;
}

interface InventoryMovementsResponse {
  success: boolean;
  movements?: StockMovement[];
  error?: string;
}

interface InventorySummaryResponse {
  success: boolean;
  products?: StockSummary[];
  error?: string;
}

interface ProductGetAllOptions {
  includeInactive?: boolean;
  categoryId?: string;
}

interface CategoryOptions {
  includeInactive?: boolean;
}

interface DesktopAPI {
  // =========================
  // Application
  // =========================

  getAppInfo: () => Promise<AppInfo>;

  // =========================
  // Database
  // =========================

  database: {
    getStatus: () => Promise<DatabaseStatus>;
  };

  // =========================
  // Products
  // =========================

  products: {
    create: (
      productData: ProductInput
    ) => Promise<ProductResponse>;

    getById: (
      id: string
    ) => Promise<ProductResponse>;

    getBySku: (
      sku: string
    ) => Promise<ProductResponse>;

    getByBarcode: (
      barcode: string
    ) => Promise<ProductResponse>;

    search: (
      searchTerm: string,
      includeInactive?: boolean
    ) => Promise<ProductListResponse>;

    getAll: (
      options?: ProductGetAllOptions
    ) => Promise<ProductListResponse>;

    update: (
      id: string,
      data: ProductUpdateInput
    ) => Promise<ProductResponse>;

    deactivate: (
      id: string
    ) => Promise<ProductResponse>;

    activate: (
      id: string
    ) => Promise<ProductResponse>;

    getLowStock: () => Promise<ProductListResponse>;

    exportCsv: (
      includeInactive?: boolean,
      categoryId?: string | null
    ) => Promise<ProductExportResponse>;

    importCsv: () => Promise<ProductImportResponse>;
  };

  // =========================
  // Categories
  // =========================

  categories: {
    create: (
      categoryData: CategoryInput
    ) => Promise<CategoryResponse>;

    getById: (
      id: string
    ) => Promise<CategoryResponse>;

    getByName: (
      name: string
    ) => Promise<CategoryResponse>;

    getAll: (
      options?: CategoryOptions
    ) => Promise<CategoryListResponse>;

    search: (
      searchText: string,
      options?: CategoryOptions
    ) => Promise<CategoryListResponse>;

    update: (
      categoryData: CategoryUpdateInput
    ) => Promise<CategoryResponse>;

    deactivate: (
      id: string
    ) => Promise<CategoryResponse>;

    activate: (
      id: string
    ) => Promise<CategoryResponse>;
  };

  // =========================
  // Inventory
  // =========================

  inventory: {
    stockIn: (
      inventoryData: StockOperationInput
    ) => Promise<InventoryMovementResponse>;

    stockOut: (
      inventoryData: StockOperationInput
    ) => Promise<InventoryMovementResponse>;

    adjust: (
      inventoryData: StockAdjustmentInput
    ) => Promise<InventoryMovementResponse>;

    getCurrentStock: (
      productId: string
    ) => Promise<InventoryCurrentStockResponse>;

    getMovements: (
      productId: string,
      limit?: number
    ) => Promise<InventoryMovementsResponse>;

    getAllMovements: (
      limit?: number
    ) => Promise<InventoryMovementsResponse>;

    getSummary: () =>
      Promise<InventorySummaryResponse>;
  };


  customers: {
  getById: (
    id: string
  ) => Promise<import("../../../shared/types/customer").Customer | null>;

  getByMobile: (
    mobile: string
  ) => Promise<import("../../../shared/types/customer").Customer | null>;

  create: (
    input: import("../../../shared/types/customer").CustomerInput
  ) => Promise<import("../../../shared/types/customer").Customer>;

  update: (
    id: string,
    input: import("../../../shared/types/customer").CustomerUpdateInput
  ) => Promise<import("../../../shared/types/customer").Customer>;

  getAll: () => Promise<
    import("../../../shared/types/customer").Customer[]
  >;

  search: (
    searchTerm: string
  ) => Promise<
    import("../../../shared/types/customer").Customer[]
  >;

  getOutstanding: () => Promise<
    import("../../../shared/types/customer").Customer[]
  >;

  updateFinancials: (
    customerId: string,
    purchaseAmountDelta?: number,
    outstandingAmountDelta?: number
  ) => Promise<
    import("../../../shared/types/customer").Customer
  >;
};

invoices: {
  create: (
    input: CreateInvoiceInput
  ) => Promise<CreateInvoiceResult>;

  getById: (
    invoiceId: string
  ) => Promise<Invoice | null>;

  getByTransactionId: (
    transactionId: string
  ) => Promise<Invoice | null>;

  getByNumber: (
    invoiceNumber: string
  ) => Promise<Invoice | null>;

  getRecent: (
    limit?: number
  ) => Promise<Invoice[]>;
};



}

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}

export {};