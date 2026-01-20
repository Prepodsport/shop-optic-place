import { useState, useEffect } from "react";
import { api } from "../api";
import ProductGrid from "../components/product/ProductGrid";
import QuickViewModal from "../components/ui/QuickViewModal.jsx";
import "./Sale.css";

export default function Sale() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  useEffect(() => {
    fetchSaleProducts();
  }, []);

  const fetchSaleProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/catalog/products/", {
        params: { is_sale: true },
      });

      const data = res.data;

      // DRF pagination-safe
      const list = Array.isArray(data) ? data : (data?.results || []);
      setProducts(list);
    } catch (err) {
      console.error("Ошибка загрузки товаров:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sale">
      <div className="sale__container">
        <div className="sale__header">
          <h1 className="sale__title">Распродажа</h1>
          <p className="sale__subtitle">Товары со скидкой — успейте купить по выгодной цене!</p>
        </div>

        <ProductGrid
          products={products}
          loading={loading}
          columns={4}
          onQuickView={setQuickViewSlug}
          showEmpty={false}
        />

        {!loading && products.length === 0 && (
          <div className="sale__empty">
            <h3>Сейчас нет товаров на распродаже</h3>
            <p>Следите за обновлениями — скоро появятся новые предложения!</p>
          </div>
        )}
      </div>

      {quickViewSlug && (
        <QuickViewModal
          productSlug={quickViewSlug}
          onClose={() => setQuickViewSlug(null)}
        />
      )}
    </div>
  );
}
