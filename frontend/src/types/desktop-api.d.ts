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
}

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}

export {};