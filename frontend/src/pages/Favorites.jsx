import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useFavorites } from "../context/FavoritesContext";
import ProductGrid from "../components/product/ProductGrid";
import QuickViewModal from "../components/ui/QuickViewModal.jsx";

export default function Favorites() {
  const { items: favoriteIdsRaw, clearFavorites } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  const favoriteIds = useMemo(() => {
    const ids = (favoriteIdsRaw || [])
      .map((x) => (typeof x === "string" ? Number(x) : x))
      .filter((x) => Number.isFinite(x));
    // unique, preserve order
    return Array.from(new Set(ids));
  }, [favoriteIdsRaw]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const fetchFavoriteProducts = useCallback(async () => {
    if (!favoriteIds.length) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const byId = new Map();

      // === 1) Попытка bulk ids=1,2,3 (если API поддерживает) ===
      try {
        const idsParam = favoriteIds.join(",");
        const res = await api.get(`/catalog/products/?ids=${idsParam}&page_size=${Math.max(50, favoriteIds.length)}`);
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        for (const p of list) {
          const pid = Number(p?.id);
          if (favoriteIdSet.has(pid)) byId.set(pid, p);
        }
      } catch {
        // игнор — пойдём в fallback
      }

      // === 2) Fallback: запрос по одному id через ?id=123 ===
      const missing = favoriteIds.filter((id) => !byId.has(id));
      if (missing.length) {
        const results = await Promise.allSettled(
          missing.map((id) => api.get(`/catalog/products/?id=${id}&page_size=1`))
        );

        for (const r of results) {
          if (r.status !== "fulfilled") continue;
          const data = r.value?.data;
          const list = Array.isArray(data) ? data : data?.results || [];
          const p = list?.[0];
          const pid = Number(p?.id);
          if (favoriteIdSet.has(pid)) byId.set(pid, p);
        }
      }

      // === 3) Последний fallback: пролистать каталог страницами ===
      // Если API вообще не фильтрует, но пагинация есть — дособираем.
      let stillMissing = favoriteIds.filter((id) => !byId.has(id));
      if (stillMissing.length) {
        let page = 1;
        let hasNext = true;

        // ограничим, чтобы не бесконечно
        while (hasNext && stillMissing.length && page <= 15) {
          const res = await api.get(`/catalog/products/?page=${page}&page_size=100`);
          const data = res.data;
          const list = Array.isArray(data) ? data : data?.results || [];

          for (const p of list) {
            const pid = Number(p?.id);
            if (favoriteIdSet.has(pid)) byId.set(pid, p);
          }

          stillMissing = favoriteIds.filter((id) => !byId.has(id));

          // DRF pagination: next=null когда страниц больше нет
          if (data && typeof data === "object" && "next" in data) {
            hasNext = Boolean(data.next);
          } else {
            // если это не DRF пагинация — прекращаем
            hasNext = false;
          }

          page += 1;
        }
      }

      // === собрать в исходном порядке ===
      const ordered = favoriteIds.map((id) => byId.get(id)).filter(Boolean);
      setProducts(ordered);
    } catch (err) {
      console.error("Ошибка загрузки избранного:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [favoriteIds, favoriteIdSet]);

  useEffect(() => {
    fetchFavoriteProducts();
  }, [fetchFavoriteProducts]);

  return (
    <div className="pt-10 md:pt-8 px-4 pb-16 md:pb-10">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-[32px] md:text-[26px] font-bold m-0" style={{ color: "var(--text)" }}>
            Избранное
          </h1>

          {products.length > 0 && (
            <button
              className="py-2.5 px-5 bg-transparent border border-[var(--border)] rounded-[10px] text-sm cursor-pointer transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
              style={{ color: "var(--muted)" }}
              onClick={clearFavorites}
              type="button"
            >
              Очистить всё
            </button>
          )}
        </div>

        {loading ? (
          <ProductGrid products={[]} loading={true} columns={4} />
        ) : products.length > 0 ? (
          <ProductGrid products={products} loading={false} columns={4} onQuickView={setQuickViewSlug} />
        ) : (
          <div
            className="text-center py-20 px-5 rounded-2xl border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <svg
              className="mb-5 mx-auto"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: "var(--muted)" }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>

            <h3 className="m-0 mb-3 text-[22px]" style={{ color: "var(--text)" }}>
              В избранном пока пусто
            </h3>

            <p className="m-0 mb-6 text-base" style={{ color: "var(--muted)" }}>
              Добавляйте понравившиеся товары, нажимая на сердечко
            </p>

            <Link
              to="/catalog"
              className="inline-block py-3.5 px-7 bg-[var(--primary)] text-white no-underline rounded-[10px] font-medium transition-colors duration-200 hover:bg-blue-700 hover:no-underline"
            >
              Перейти в каталог
            </Link>
          </div>
        )}
      </div>

      {quickViewSlug && <QuickViewModal productSlug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />}
    </div>
  );
}
