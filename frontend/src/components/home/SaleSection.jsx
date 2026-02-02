import { useState, useEffect } from "react";
import api from "../../api";
import ProductCarousel from "./ProductCarousel";
import QuickViewModal from "../ui/QuickViewModal";

export default function SaleSection({ limit = 10 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/catalog/products/", {
          params: { is_sale: true, limit },
        });
        setProducts(response.data.results || response.data || []);
      } catch (error) {
        console.error("Ошибка загрузки товаров распродажи:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [limit]);

  if (!loading && !products.length) return null;

  return (
    <>
      <ProductCarousel
        title="Распродажа"
        products={products}
        loading={loading}
        viewAllLink="/sale"
        onQuickView={setQuickViewSlug}
      />
      <QuickViewModal
        slug={quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </>
  );
}
