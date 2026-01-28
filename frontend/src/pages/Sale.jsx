import { useState, useEffect } from "react";
import { api } from "../api";
import ProductGrid from "../components/product/ProductGrid";
import QuickViewModal from "../components/ui/QuickViewModal.jsx";

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
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-[32px] md:text-[26px] font-bold m-0 mb-3 text-red-500">
            Распродажа
          </h1>
          <p className="text-lg md:text-base m-0" style={{ color: 'var(--muted)' }}>
            Товары со скидкой — успейте купить по выгодной цене!
          </p>
        </div>

        <ProductGrid
          products={products}
          loading={loading}
          columns={4}
          onQuickView={setQuickViewSlug}
          showEmpty={false}
        />

        {!loading && products.length === 0 && (
          <div
            className="text-center py-15 px-5 rounded-2xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h3 className="m-0 mb-3 text-xl" style={{ color: 'var(--text)' }}>
              Сейчас нет товаров на распродаже
            </h3>
            <p className="m-0" style={{ color: 'var(--muted)' }}>
              Следите за обновлениями — скоро появятся новые предложения!
            </p>
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
