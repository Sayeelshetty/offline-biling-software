import { FormEvent, useEffect, useState } from "react";
import type {
  Product,
  ProductInput,
  ProductUpdateInput,
} from "../../services/product.service";
import "./ProductForm.css";

type ProductFormProps = {
  product?: Product | null;
  onSubmit: (
    data: ProductInput | ProductUpdateInput
  ) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
};

type FormState = {
  name: string;
  sku: string;
  barcode: string;
  sellingPrice: string;
  purchasePrice: string;
  gstRate: string;
  currentStock: string;
  minimumStock: string;
  unit: string;
  status: "ACTIVE" | "INACTIVE";
};

const DEFAULT_FORM: FormState = {
  name: "",
  sku: "",
  barcode: "",
  sellingPrice: "",
  purchasePrice: "",
  gstRate: "0",
  currentStock: "0",
  minimumStock: "0",
  unit: "PCS",
  status: "ACTIVE",
};

function ProductForm({
  product = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const [form, setForm] = useState<FormState>(
    DEFAULT_FORM
  );

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!product) {
      setForm(DEFAULT_FORM);
      setErrors({});

      return;
    }

    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      sellingPrice: String(product.sellingPrice),
      purchasePrice: String(product.purchasePrice),
      gstRate: String(product.gstRate),
      currentStock: String(product.currentStock),
      minimumStock: String(product.minimumStock),
      unit: product.unit,
      status: product.status,
    });

    setErrors({});
  }, [product]);

  function handleChange(
    field: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      nextErrors.name = "Product name is required.";
    }

    if (!form.sku.trim()) {
      nextErrors.sku = "SKU is required.";
    }

    const sellingPrice = Number(form.sellingPrice);

    if (
      form.sellingPrice === "" ||
      Number.isNaN(sellingPrice) ||
      sellingPrice < 0
    ) {
      nextErrors.sellingPrice =
        "Enter a valid selling price.";
    }

    const purchasePrice = Number(form.purchasePrice);

    if (
      form.purchasePrice === "" ||
      Number.isNaN(purchasePrice) ||
      purchasePrice < 0
    ) {
      nextErrors.purchasePrice =
        "Enter a valid purchase price.";
    }

    const gstRate = Number(form.gstRate);

    if (
      Number.isNaN(gstRate) ||
      gstRate < 0 ||
      gstRate > 100
    ) {
      nextErrors.gstRate =
        "GST must be between 0 and 100.";
    }

    const minimumStock = Number(
      form.minimumStock
    );

    if (
      Number.isNaN(minimumStock) ||
      minimumStock < 0
    ) {
      nextErrors.minimumStock =
        "Enter a valid minimum stock.";
    }

    if (!product) {
      const currentStock = Number(
        form.currentStock
      );

      if (
        Number.isNaN(currentStock) ||
        currentStock < 0
      ) {
        nextErrors.currentStock =
          "Enter a valid opening stock.";
      }
    }

    if (!form.unit.trim()) {
      nextErrors.unit = "Unit is required.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const baseData = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: null,
      sellingPrice: Number(form.sellingPrice),
      purchasePrice: Number(form.purchasePrice),
      gstRate: Number(form.gstRate),
      minimumStock: Number(form.minimumStock),
      unit: form.unit.trim(),
      imagePath: null,
      status: form.status,
    };

    if (product) {
      await onSubmit(baseData);
    } else {
      const createData: ProductInput = {
        ...baseData,
        currentStock: Number(
          form.currentStock
        ),
        deviceId: "DEV-LOCAL-001",
      };

      await onSubmit(createData);
    }
  }

  const isEditMode = Boolean(product);

  return (
    <form
      className="product-form"
      onSubmit={handleSubmit}
    >
      <div className="form-header">
        <div>
          <p className="eyebrow">
            {isEditMode
              ? "EDIT PRODUCT"
              : "NEW PRODUCT"}
          </p>

          <h2>
            {isEditMode
              ? "Edit Product"
              : "Add Product"}
          </h2>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-field form-field-wide">
          <label htmlFor="product-name">
            Product Name *
          </label>

          <input
            id="product-name"
            type="text"
            value={form.name}
            onChange={(event) =>
              handleChange(
                "name",
                event.target.value
              )
            }
            placeholder="Enter product name"
            disabled={isSubmitting}
          />

          {errors.name && (
            <span className="field-error">
              {errors.name}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="product-sku">
            SKU *
          </label>

          <input
            id="product-sku"
            type="text"
            value={form.sku}
            onChange={(event) =>
              handleChange(
                "sku",
                event.target.value
              )
            }
            placeholder="e.g. RICE-001"
            disabled={isSubmitting}
          />

          {errors.sku && (
            <span className="field-error">
              {errors.sku}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="product-barcode">
            Barcode
          </label>

          <input
            id="product-barcode"
            type="text"
            value={form.barcode}
            onChange={(event) =>
              handleChange(
                "barcode",
                event.target.value
              )
            }
            placeholder="Enter barcode"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-field">
          <label htmlFor="purchase-price">
            Purchase Price *
          </label>

          <input
            id="purchase-price"
            type="number"
            min="0"
            step="0.01"
            value={form.purchasePrice}
            onChange={(event) =>
              handleChange(
                "purchasePrice",
                event.target.value
              )
            }
            placeholder="0.00"
            disabled={isSubmitting}
          />

          {errors.purchasePrice && (
            <span className="field-error">
              {errors.purchasePrice}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="selling-price">
            Selling Price *
          </label>

          <input
            id="selling-price"
            type="number"
            min="0"
            step="0.01"
            value={form.sellingPrice}
            onChange={(event) =>
              handleChange(
                "sellingPrice",
                event.target.value
              )
            }
            placeholder="0.00"
            disabled={isSubmitting}
          />

          {errors.sellingPrice && (
            <span className="field-error">
              {errors.sellingPrice}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="gst-rate">
            GST / Tax (%)
          </label>

          <input
            id="gst-rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.gstRate}
            onChange={(event) =>
              handleChange(
                "gstRate",
                event.target.value
              )
            }
            placeholder="0"
            disabled={isSubmitting}
          />

          {errors.gstRate && (
            <span className="field-error">
              {errors.gstRate}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="minimum-stock">
            Minimum Stock
          </label>

          <input
            id="minimum-stock"
            type="number"
            min="0"
            step="1"
            value={form.minimumStock}
            onChange={(event) =>
              handleChange(
                "minimumStock",
                event.target.value
              )
            }
            placeholder="0"
            disabled={isSubmitting}
          />

          {errors.minimumStock && (
            <span className="field-error">
              {errors.minimumStock}
            </span>
          )}
        </div>

        {!isEditMode && (
          <div className="form-field">
            <label htmlFor="current-stock">
              Opening Stock
            </label>

            <input
              id="current-stock"
              type="number"
              min="0"
              step="1"
              value={form.currentStock}
              onChange={(event) =>
                handleChange(
                  "currentStock",
                  event.target.value
                )
              }
              placeholder="0"
              disabled={isSubmitting}
            />

            {errors.currentStock && (
              <span className="field-error">
                {errors.currentStock}
              </span>
            )}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="product-unit">
            Unit *
          </label>

          <select
            id="product-unit"
            value={form.unit}
            onChange={(event) =>
              handleChange(
                "unit",
                event.target.value
              )
            }
            disabled={isSubmitting}
          >
            <option value="PCS">PCS</option>
            <option value="KG">KG</option>
            <option value="GM">GM</option>
            <option value="LTR">LTR</option>
            <option value="ML">ML</option>
            <option value="BOX">BOX</option>
            <option value="PACK">PACK</option>
            <option value="SET">SET</option>
          </select>

          {errors.unit && (
            <span className="field-error">
              {errors.unit}
            </span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="product-status">
            Status
          </label>

          <select
            id="product-status"
            value={form.status}
            onChange={(event) =>
              handleChange(
                "status",
                event.target.value as
                  | "ACTIVE"
                  | "INACTIVE"
              )
            }
            disabled={isSubmitting}
          >
            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>
          </select>
        </div>
      </div>

      <div className="form-footer">
        <button
          type="button"
          className="secondary-button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving..."
            : isEditMode
              ? "Update Product"
              : "Create Product"}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;