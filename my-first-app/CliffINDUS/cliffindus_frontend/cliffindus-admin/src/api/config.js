// --------------------------------------------------------
// ✅ Centralized API Config
// --------------------------------------------------------
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export async function fetchProducts() {
  const res = await fetch(`${API_BASE_URL}/products/products/`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}
