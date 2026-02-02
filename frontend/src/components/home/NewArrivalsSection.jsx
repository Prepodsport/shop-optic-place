import { useState, useEffect } from "react";
import api from "../../api";
import ProductCarousel from "./ProductCarousel";
import QuickViewModal from "../ui/QuickViewModal";

export default function NewArrivalsSection({ limit = 10 }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/catalog/products/featured/", {
          params: { tab: "new", limit },
        });
        setProducts(response.data.results || response.data || []);
      } catch (error) {
        console.error("Ошибка загрузки новинок:", error);
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
        title="Новинки"
        products={products}
        loading={loading}
        viewAllLink="/catalog?new=true"
        onQuickView={setQuickViewSlug}
      />
      <QuickViewModal
        slug={quickViewSlug}
        onClose={() => setQuickViewSlug(null)}
      />
    </>
  );
}
