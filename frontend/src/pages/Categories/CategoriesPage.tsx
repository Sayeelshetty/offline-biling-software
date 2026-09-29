import { useEffect, useMemo, useState } from "react";
import type { Category } from "../../types/category"
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  getAllCategories,
  searchCategories,
  updateCategory,
} from "../../services/category.service";
import "./CategoriesPage.css";

type StatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

interface CategoryFormData {
  name: string;
  description: string;
}

const getDeviceId = (): string => {
  const existingDeviceId = localStorage.getItem(
    "offline-billing-device-id"
  );

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId = crypto.randomUUID();

  localStorage.setItem(
    "offline-billing-device-id",
    newDeviceId
  );

  return newDeviceId;
};

const emptyForm: CategoryFormData = {
  name: "",
  description: "",
};

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("ACTIVE");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [formData, setFormData] =
    useState<CategoryFormData>(emptyForm);

  const [errorMessage, setErrorMessage] =
    useState("");

  const deviceId = useMemo(() => getDeviceId(), []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (searchTerm.trim()) {
        const results = await searchCategories(
          searchTerm,
          statusFilter === "ALL"
        );

        const filteredResults =
          statusFilter === "ALL"
            ? results
            : results.filter(
                (category) =>
                  category.status === statusFilter
              );

        setCategories(filteredResults);
      } else {
        const results = await getAllCategories(
          statusFilter === "ALL"
        );

        const filteredResults =
          statusFilter === "ALL"
            ? results
            : results.filter(
                (category) =>
                  category.status === statusFilter
              );

        setCategories(filteredResults);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load categories"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCategories();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm, statusFilter]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData(emptyForm);
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);

    setFormData({
      name: category.name,
      description: category.description || "",
    });

    setErrorMessage("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData(emptyForm);
    setErrorMessage("");
  };

  const handleInputChange = (
    field: keyof CategoryFormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const name = formData.name.trim();
    const description =
      formData.description.trim();

    if (!name) {
      setErrorMessage("Category name is required.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          name,
          description,
        });
      } else {
        await createCategory({
          name,
          description,
          deviceId,
        });
      }

      closeModal();
      await loadCategories();
    } catch (error) {
      console.error("Failed to save category:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save category"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (
    category: Category
  ) => {
    const confirmed = window.confirm(
      `Deactivate "${category.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage("");

      await deactivateCategory(category.id);

      await loadCategories();
    } catch (error) {
      console.error(
        "Failed to deactivate category:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to deactivate category"
      );
    }
  };

  const handleActivate = async (
    category: Category
  ) => {
    try {
      setErrorMessage("");

      await activateCategory(category.id);

      await loadCategories();
    } catch (error) {
      console.error(
        "Failed to activate category:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to activate category"
      );
    }
  };

  return (
    <div className="categories-page">
      <div className="categories-page-header">
        <div>
          <h1>Categories</h1>
          <p>
            Manage product categories for your store.
          </p>
        </div>

        <button
          type="button"
          className="categories-add-button"
          onClick={openCreateModal}
        >
          + Add Category
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="categories-error">
          {errorMessage}
        </div>
      )}

      <div className="categories-toolbar">
        <div className="categories-search-wrapper">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            placeholder="Search categories..."
            className="categories-search-input"
          />
        </div>

        <div className="categories-filter">
          <label htmlFor="category-status-filter">
            Status
          </label>

          <select
            id="category-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter
              )
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">
              Inactive
            </option>
            <option value="ALL">All</option>
          </select>
        </div>
      </div>

      <div className="categories-card">
        <div className="categories-card-header">
          <div>
            <h2>Category List</h2>
            <span>
              {categories.length}{" "}
              {categories.length === 1
                ? "category"
                : "categories"}
            </span>
          </div>
        </div>

        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Sync</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="categories-empty"
                  >
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="categories-empty"
                  >
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <div className="category-name">
                        {category.name}
                      </div>
                    </td>

                    <td>
                      <div className="category-description">
                        {category.description ||
                          "—"}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`category-status-badge ${
                          category.status ===
                          "ACTIVE"
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {category.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`category-sync-badge ${category.syncStatus.toLowerCase()}`}
                      >
                        {category.syncStatus}
                      </span>
                    </td>

                    <td>
                      <div className="category-actions">
                        <button
                          type="button"
                          className="category-edit-button"
                          onClick={() =>
                            openEditModal(category)
                          }
                        >
                          Edit
                        </button>

                        {category.status ===
                        "ACTIVE" ? (
                          <button
                            type="button"
                            className="category-deactivate-button"
                            onClick={() =>
                              handleDeactivate(
                                category
                              )
                            }
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="category-activate-button"
                            onClick={() =>
                              handleActivate(
                                category
                              )
                            }
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="categories-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="categories-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="categories-modal-header">
              <div>
                <h2 id="category-modal-title">
                  {editingCategory
                    ? "Edit Category"
                    : "Add Category"}
                </h2>

                <p>
                  {editingCategory
                    ? "Update category details."
                    : "Create a new product category."}
                </p>
              </div>

              <button
                type="button"
                className="categories-modal-close"
                onClick={closeModal}
                disabled={isSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              className="categories-form"
              onSubmit={handleSubmit}
            >
              {errorMessage && (
                <div className="categories-form-error">
                  {errorMessage}
                </div>
              )}

              <div className="categories-form-group">
                <label htmlFor="category-name">
                  Category Name
                </label>

                <input
                  id="category-name"
                  type="text"
                  value={formData.name}
                  onChange={(event) =>
                    handleInputChange(
                      "name",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Grocery"
                  autoFocus
                  disabled={isSaving}
                />
              </div>

              <div className="categories-form-group">
                <label htmlFor="category-description">
                  Description
                </label>

                <textarea
                  id="category-description"
                  value={formData.description}
                  onChange={(event) =>
                    handleInputChange(
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="Optional category description"
                  rows={4}
                  disabled={isSaving}
                />
              </div>

              <div className="categories-form-actions">
                <button
                  type="button"
                  className="categories-cancel-button"
                  onClick={closeModal}
                  disabled={isSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="categories-save-button"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesPage;