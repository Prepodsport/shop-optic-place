import ProductCard from "./ProductCard.jsx";
import "./ProductGrid.css";

/**
 * Сетка товаров.
 *
 * products может быть:
 * - массивом ([])
 * - объектом пагинации DRF { results: [], count, next, previous }
 *
 * @param {Array|Object} products
 * @param {boolean} loading
 * @param {number} columns
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
  const gridStyle = columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : {};

  // NEW: нормализуем входные данные
  const list = Array.isArray(products) ? products : (products && Array.isArray(products.results) ? products.results : []);

  if (loading) {
    return (
      <div className="product-grid" style={gridStyle}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="product-grid__skeleton">
            <div className="product-grid__skeleton-image" />
            <div className="product-grid__skeleton-content">
              <div className="product-grid__skeleton-text product-grid__skeleton-text--short" />
              <div className="product-grid__skeleton-text" />
              <div className="product-grid__skeleton-text product-grid__skeleton-text--medium" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!list || list.length === 0) {
    if (!showEmpty) return null;

    return (
      <div className="product-grid__empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3>Товары не найдены</h3>
        <p>Попробуйте изменить параметры поиска</p>
      </div>
    );
  }

  return (
    <div className="product-grid" style={gridStyle}>
      {list.map((product) => (
        <ProductCard key={product.id} product={product} onQuickView={onQuickView} />
      ))}
    </div>
  );
}
