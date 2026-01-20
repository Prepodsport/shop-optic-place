import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useFavorites } from '../context/FavoritesContext';
import ProductGrid from '../components/product/ProductGrid';
import QuickViewModal from '../components/ui/QuickViewModal.jsx';
import './Favorites.css';

export default function Favorites() {
  const { items: favoriteIds, clearFavorites } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  useEffect(() => {
    fetchFavoriteProducts();
  }, [favoriteIds]);

  const fetchFavoriteProducts = async () => {
    if (favoriteIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Загружаем товары по ID
      const res = await api.get('/catalog/products/');
      const filtered = res.data.filter((p) => favoriteIds.includes(p.id));
      setProducts(filtered);
    } catch (err) {
      console.error('Ошибка загрузки избранного:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="favorites">
      <div className="favorites__container">
        <div className="favorites__header">
          <h1 className="favorites__title">Избранное</h1>
          {products.length > 0 && (
            <button className="favorites__clear" onClick={clearFavorites}>
              Очистить всё
            </button>
          )}
        </div>

        {loading ? (
          <ProductGrid products={[]} loading={true} columns={4} />
        ) : products.length > 0 ? (
          <ProductGrid
            products={products}
            loading={false}
            columns={4}
            onQuickView={setQuickViewSlug}
          />
        ) : (
          <div className="favorites__empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <h3>В избранном пока пусто</h3>
            <p>Добавляйте понравившиеся товары, нажимая на сердечко</p>
            <Link to="/catalog" className="favorites__link">
              Перейти в каталог
            </Link>
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
