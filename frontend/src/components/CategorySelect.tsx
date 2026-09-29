import { useEffect, useState } from "react";
import type { Category } from "../types/category";
import { getAllCategories } from "../services/category.service";

interface CategorySelectProps {
  value: string;
  onChange: (categoryId: string) => void;
  disabled?: boolean;
  required?: boolean;
}

function CategorySelect({
  value,
  onChange,
  disabled = false,
  required = false,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        setIsLoading(true);
        setError("");

        const result = await getAllCategories(false);

        if (isMounted) {
          setCategories(result);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);

        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load categories"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="category-select-wrapper">
      <label htmlFor="product-category">
        Category
        {required && <span> *</span>}
      </label>

      <select
        id="product-category"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || isLoading}
        required={required}
      >
        <option value="">
          {isLoading
            ? "Loading categories..."
            : "Select category"}
        </option>

        {!isLoading &&
          categories.map((category) => (
            <option
              key={category.id}
              value={category.id}
            >
              {category.name}
            </option>
          ))}
      </select>

      {error && (
        <small className="category-select-error">
          {error}
        </small>
      )}
    </div>
  );
}

export default CategorySelect;