export {};

declare global {
  interface Window {
    desktopAPI: {
      getAppInfo: () => Promise<{
        name: string;
        version: string;
        platform: string;
      }>;

      database: {
        getStatus: () => Promise<{
          success: boolean;
          path?: string;
          tableCount?: number;
          tables?: string[];
          error?: string;
        }>;
      };

      products: {
        create: (productData: {
          name: string;
          sku: string;
          barcode?: string | null;
          categoryId?: string | null;
          sellingPrice?: number;
          purchasePrice?: number;
          gstRate?: number;
          currentStock?: number;
          minimumStock?: number;
          unit?: string;
          imagePath?: string | null;
          status?: "ACTIVE" | "INACTIVE";
          deviceId: string;
        }) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        getById: (id: string) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        getBySku: (sku: string) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        getByBarcode: (barcode: string) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        search: (
          searchTerm?: string,
          includeInactive?: boolean
        ) => Promise<{
          success: boolean;
          products?: unknown[];
          error?: string;
        }>;

        getAll: (options?: {
          includeInactive?: boolean;
          categoryId?: string | null;
        }) => Promise<{
          success: boolean;
          products?: unknown[];
          error?: string;
        }>;

        update: (
          id: string,
          data: {
            name: string;
            sku: string;
            barcode?: string | null;
            categoryId?: string | null;
            sellingPrice?: number;
            purchasePrice?: number;
            gstRate?: number;
            minimumStock?: number;
            unit?: string;
            imagePath?: string | null;
            status?: "ACTIVE" | "INACTIVE";
          }
        ) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        deactivate: (id: string) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        activate: (id: string) => Promise<{
          success: boolean;
          product?: unknown;
          error?: string;
        }>;

        getLowStock: () => Promise<{
          success: boolean;
          products?: unknown[];
          error?: string;
        }>;
      };
    };
  }
}