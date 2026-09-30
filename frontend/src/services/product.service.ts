import type {
  Product,
  ProductInput,
  ProductUpdateInput,
} from "../../../shared/types/product";

export async function createProduct(
  productData: ProductInput
): Promise<Product> {
  const response =
    await window.desktopAPI.products.create(productData);

  if (!response.success || !response.product) {
    throw new Error(
      response.error || "Failed to create product"
    );
  }

  return response.product;
}

export async function getProductById(
  id: string
): Promise<Product | null> {
  const response =
    await window.desktopAPI.products.getById(id);

  if (!response.success) {
    throw new Error(
      response.error || "Failed to get product"
    );
  }

  return response.product ?? null;
}

export async function getProductBySku(
  sku: string
): Promise<Product | null> {
  const response =
    await window.desktopAPI.products.getBySku(sku);

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to get product by SKU"
    );
  }

  return response.product ?? null;
}

export async function getProductByBarcode(
  barcode: string
): Promise<Product | null> {
  const response =
    await window.desktopAPI.products.getByBarcode(
      barcode
    );

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to get product by barcode"
    );
  }

  return response.product ?? null;
}

export async function searchProducts(
  searchTerm: string,
  includeInactive = false
): Promise<Product[]> {
  const response =
    await window.desktopAPI.products.search(
      searchTerm,
      includeInactive
    );

  if (!response.success) {
    throw new Error(
      response.error || "Failed to search products"
    );
  }

  return response.products ?? [];
}

export async function getAllProducts(
  options: {
    includeInactive?: boolean;
    categoryId?: string;
  } = {}
): Promise<Product[]> {
  const response =
    await window.desktopAPI.products.getAll(options);

  if (!response.success) {
    throw new Error(
      response.error || "Failed to load products"
    );
  }

  return response.products ?? [];
}

export async function updateProduct(
  id: string,
  data: ProductUpdateInput
): Promise<Product> {
  const response =
    await window.desktopAPI.products.update(
      id,
      data
    );

  if (!response.success || !response.product) {
    throw new Error(
      response.error || "Failed to update product"
    );
  }

  return response.product;
}

export async function deactivateProduct(
  id: string
): Promise<Product> {
  const response =
    await window.desktopAPI.products.deactivate(id);

  if (!response.success || !response.product) {
    throw new Error(
      response.error ||
        "Failed to deactivate product"
    );
  }

  return response.product;
}

export async function activateProduct(
  id: string
): Promise<Product> {
  const response =
    await window.desktopAPI.products.activate(id);

  if (!response.success || !response.product) {
    throw new Error(
      response.error ||
        "Failed to activate product"
    );
  }

  return response.product;
}

export async function getLowStockProducts(): Promise<
  Product[]
> {
  const response =
    await window.desktopAPI.products.getLowStock();

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to load low-stock products"
    );
  }

  return response.products ?? [];
}

/*
|--------------------------------------------------------------------------
| Export Products
|--------------------------------------------------------------------------
*/

export interface ExportProductsResult {
  success: boolean;
  canceled?: boolean;
  path?: string;
  count?: number;
  error?: string;
}

export async function exportProductsCsv(
  includeInactive = false,
  categoryId: string | null = null
): Promise<ExportProductsResult> {
  const response =
    await window.desktopAPI.products.exportCsv(
      includeInactive,
      categoryId
    );

  if (!response.success) {
    throw new Error(
      response.error ||
        "Failed to export products"
    );
  }

  return response;
}

/*
|--------------------------------------------------------------------------
| Default Product Service
|--------------------------------------------------------------------------
*/

const productService = {
  createProduct,
  getProductById,
  getProductBySku,
  getProductByBarcode,
  searchProducts,
  getAllProducts,
  updateProduct,
  deactivateProduct,
  activateProduct,
  getLowStockProducts,
  exportProductsCsv,
};

export default productService;