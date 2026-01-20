import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Tabs from '../ui/Tabs';
import ProductGrid from '../product/ProductGrid';
import QuickViewModal from '../ui/QuickViewModal.jsx';
import './ProductTabs.css';

const TABS = [
  { key: 'popular', label: 'Популярное' },
  { key: 'bestseller', label: 'Хиты продаж' },
  { key: 'new', label: 'Новинки' },
];

/**
 * Секция товаров с табами для главной страницы.
 *
 * @param {string} title - Заголовок секции
 * @param {number} limit - Количество товаров (default: 8)
 */
export default function ProductTabs({ title = 'Наши товары', limit = 8 }) {
  const [activeTab, setActiveTab] = useState('popular');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  const fetchProducts = useCallback(async (tab) => {
    setLoading(true);
    try {
      const res = await api.get('/catalog/products/featured/', {
        params: { tab, limit },
      });
      setProducts(res.data);
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchProducts(activeTab);
  }, [activeTab, fetchProducts]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleQuickView = (slug) => {
    setQuickViewSlug(slug);
  };

  const closeQuickView = () => {
    setQuickViewSlug(null);
  };

  return (
    <section className="product-tabs">
      <div className="product-tabs__header">
        <h2 className="product-tabs__title">{title}</h2>
        <Tabs
          items={TABS}
          activeKey={activeTab}
          onChange={handleTabChange}
          variant="pills"
        />
      </div>

      <ProductGrid
        products={products}
        loading={loading}
        columns={4}
        onQuickView={handleQuickView}
      />

      <div className="product-tabs__footer">
        <Link to="/catalog" className="product-tabs__view-all">
          Смотреть все товары
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </div>

      {/* Модальное окно быстрого просмотра */}
      {quickViewSlug && (
        <QuickViewModal
          productSlug={quickViewSlug}
          onClose={closeQuickView}
        />
      )}
    </section>
  );
}
