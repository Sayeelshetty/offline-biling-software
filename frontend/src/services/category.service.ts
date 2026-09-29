import type {
  Category,
  CategoryInput,
  CategoryUpdateInput,
} from "../types/category.ts";

export async function createCategory(
  categoryData: CategoryInput
): Promise<Category> {
  const response = await window.desktopAPI.categories.create(
    categoryData
  );

  if (!response.success || !response.category) {
    throw new Error(
      response.error || "Failed to create category"
    );
  }

  return response.category;
}

export async function getCategoryById(
  id: string
): Promise<Category | null> {
  const response = await window.desktopAPI.categories.getById(id);

  if (!response.success) {
    throw new Error(
      response.error || "Failed to get category"
    );
  }

  return response.category ?? null;
}

export async function getCategoryByName(
  name: string
): Promise<Category | null> {
  const response =
    await window.desktopAPI.categories.getByName(name);

  if (!response.success) {
    throw new Error(
      response.error || "Failed to get category"
    );
  }

  return response.category ?? null;
}

export async function getAllCategories(
  includeInactive = false
): Promise<Category[]> {
  const response =
    await window.desktopAPI.categories.getAll({
      includeInactive,
    });

  if (!response.success) {
    throw new Error(
      response.error || "Failed to load categories"
    );
  }

  return response.categories ?? [];
}

export async function searchCategories(
  searchText: string,
  includeInactive = false
): Promise<Category[]> {
  const response =
    await window.desktopAPI.categories.search(
      searchText,
      {
        includeInactive,
      }
    );

  if (!response.success) {
    throw new Error(
      response.error || "Failed to search categories"
    );
  }

  return response.categories ?? [];
}

export async function updateCategory(
  categoryData: CategoryUpdateInput
): Promise<Category> {
  const response =
    await window.desktopAPI.categories.update(
      categoryData
    );

  if (!response.success || !response.category) {
    throw new Error(
      response.error || "Failed to update category"
    );
  }

  return response.category;
}

export async function deactivateCategory(
  id: string
): Promise<Category> {
  const response =
    await window.desktopAPI.categories.deactivate(id);

  if (!response.success || !response.category) {
    throw new Error(
      response.error || "Failed to deactivate category"
    );
  }

  return response.category;
}

export async function activateCategory(
  id: string
): Promise<Category> {
  const response =
    await window.desktopAPI.categories.activate(id);

  if (!response.success || !response.category) {
    throw new Error(
      response.error || "Failed to activate category"
    );
  }

  return response.category;
}