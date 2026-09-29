export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ProductInput {
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
  status?: ProductStatus;
  deviceId: string;
}

export interface ProductUpdateInput {
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
  status?: ProductStatus;
}

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

interface ProductResponse {
  success: boolean;
  product?: Product | null;
  error?: string;
}

interface ProductsResponse {
  success: boolean;
  products?: Product[];
  error?: string;
}

/**
 * Creates a new product in the local SQLite database.
 */
async function createProduct(
  productData: ProductInput
): Promise<Product> {
  const response =
    await window.desktopAPI.products.create(productData);

  if (!response.success || !response.product) {
    throw new Error(
      response.error ?? "Failed to create product."
    );
  }

  return response.product as Product;
}

/**
 * Returns all products from the local database.
 */
async function getAllProducts(options?: {
  includeInactive?: boolean;
  categoryId?: string | null;
}): Promise<Product[]> {
  const response: ProductsResponse =
    await window.desktopAPI.products.getAll(
      options
    );

  if (!response.success) {
    throw new Error(
      response.error ?? "Failed to load products."
    );
  }

  return response.products ?? [];
}

/**
 * Searches products by name, SKU or barcode.
 */
async function searchProducts(
  searchTerm: string,
  includeInactive = false
): Promise<Product[]> {
  const response: ProductsResponse =
    await window.desktopAPI.products.search(
      searchTerm,
      includeInactive
    );

  if (!response.success) {
    throw new Error(
      response.error ?? "Failed to search products."
    );
  }

  return response.products ?? [];
}

/**
 * Finds a product by local ID.
 */
async function getProductById(
  id: string
): Promise<Product | null> {
  const response: ProductResponse =
    await window.desktopAPI.products.getById(id);

  if (!response.success) {
    throw new Error(
      response.error ?? "Failed to load product."
    );
  }

  return response.product ?? null;
}

/**
 * Finds a product by SKU.
 */
async function getProductBySku(
  sku: string
): Promise<Product | null> {
  const response: ProductResponse =
    await window.desktopAPI.products.getBySku(sku);

  if (!response.success) {
    throw new Error(
      response.error ?? "Failed to find product by SKU."
    );
  }

  return response.product ?? null;
}

/**
 * Finds a product by barcode.
 */
async function getProductByBarcode(
  barcode: string
): Promise<Product | null> {
  const response: ProductResponse =
    await window.desktopAPI.products.getByBarcode(
      barcode
    );

  if (!response.success) {
    throw new Error(
      response.error ??
        "Failed to find product by barcode."
    );
  }

  return response.product ?? null;
}

/**
 * Updates an existing product.
 */
async function updateProduct(
  id: string,
  productData: ProductUpdateInput
): Promise<Product> {
  const response: ProductResponse =
    await window.desktopAPI.products.update(
      id,
      productData
    );

  if (!response.success || !response.product) {
    throw new Error(
      response.error ?? "Failed to update product."
    );
  }

  return response.product as Product;
}

/**
 * Deactivates a product.
 */
async function deactivateProduct(
  id: string
): Promise<Product> {
  const response: ProductResponse =
    await window.desktopAPI.products.deactivate(id);

  if (!response.success || !response.product) {
    throw new Error(
      response.error ??
        "Failed to deactivate product."
    );
  }

  return response.product as Product;
}

/**
 * Activates a product.
 */
async function activateProduct(
  id: string
): Promise<Product> {
  const response: ProductResponse =
    await window.desktopAPI.products.activate(id);

  if (!response.success || !response.product) {
    throw new Error(
      response.error ??
        "Failed to activate product."
    );
  }

  return response.product as Product;
}

/**
 * Returns products that have reached their minimum stock.
 */
async function getLowStockProducts(): Promise<Product[]> {
  const response: ProductsResponse =
    await window.desktopAPI.products.getLowStock();

  if (!response.success) {
    throw new Error(
      response.error ??
        "Failed to load low-stock products."
    );
  }

  return response.products ?? [];
}

const productService = {
  createProduct,
  getAllProducts,
  searchProducts,
  getProductById,
  getProductBySku,
  getProductByBarcode,
  updateProduct,
  deactivateProduct,
  activateProduct,
  getLowStockProducts,
};

export default productService;