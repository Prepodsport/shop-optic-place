import { useMemo } from "react";
import ProductCard from "./ProductCard.jsx";

/**
 * Сетка товаров.
 *
 * products может быть:
 * - массивом ([])
 * - объектом пагинации DRF { results: [], count, next, previous }
 *
 * @param {Array|Object} products
 * @param {boolean} loading
 * @param {number} columns 1..4 (желательная максимальная колонка на десктопе)
 * @param {function} onQuickView
 * @param {boolean} showEmpty
 */
export default function ProductGrid({
  products,
  loading = false,
  columns,
  onQuickView,
  showEmpty = true,
}) {
  // Нормализуем входные данные
  const list = Array.isArray(products)
    ? products
    : products && Array.isArray(products.results)
      ? products.results
      : [];

  const gridClass = useMemo(() => {
    const base = "grid gap-4 sm:gap-5 lg:gap-6";

    // если columns не задан — дефолтная адаптивная 1/2/3/4
    if (!columns) return `${base} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;

    // если задан — “максимум колонок” на десктопе
    if (columns <= 1) return `${base} grid-cols-1`;
    if (columns === 2) return `${base} grid-cols-1 sm:grid-cols-2`;
    if (columns === 3) return `${base} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
    return `${base} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
  }, [columns]);

  const skeletonCount = useMemo(() => {
    // чуть больше, чтобы заполнить экран
    if (columns === 1) return 6;
    if (columns === 2) return 8;
    if (columns === 3) return 9;
    return 8;
  }, [columns]);

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* image placeholder */}
              <div className="relative sm:w-[170px] md:w-[190px] shrink-0">
                <div
                  className="aspect-square animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>

              {/* content placeholder */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div
                  className="h-3 w-2/5 rounded animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                    backgroundSize: "200% 100%",
                  }}
                />
                <div
                  className="h-4 rounded animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                    backgroundSize: "200% 100%",
                  }}
                />
                <div
                  className="h-4 w-4/5 rounded animate-shimmer"
                  style={{
                    background:
                      "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                    backgroundSize: "200% 100%",
                  }}
                />
                <div className="mt-auto flex gap-2">
                  <div
                    className="h-11 flex-1 rounded-xl animate-shimmer"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                  <div
                    className="h-11 w-11 rounded-xl animate-shimmer"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                  <div
                    className="h-11 w-11 rounded-xl animate-shimmer"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--bg) 25%, var(--card) 50%, var(--bg) 75%)",
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!list || list.length === 0) {
    if (!showEmpty) return null;

    return (
      <div
        className="text-center py-16 px-5 rounded-2xl border"
        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--muted)" }}
      >
        <svg
          className="mb-4 opacity-60 mx-auto"
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <h3 className="text-xl font-semibold m-0 mb-2" style={{ color: "var(--text)" }}>
          Товары не найдены
        </h3>
        <p className="m-0 text-[15px]">Попробуйте изменить параметры поиска</p>
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {list.map((product) => (
        <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
      ))}
    </div>
  );
}
