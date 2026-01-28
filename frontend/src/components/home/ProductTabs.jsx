import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import Tabs from '../ui/Tabs';
import ProductGrid from '../product/ProductGrid';
import QuickViewModal from '../ui/QuickViewModal.jsx';

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
    <section className="max-w-[1280px] mx-auto px-4">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h2 className="m-0 text-[28px] md:text-2xl sm:text-xl font-bold shrink-0" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        <div className="overflow-x-auto no-scrollbar">
          <Tabs
            items={TABS}
            activeKey={activeTab}
            onChange={handleTabChange}
            variant="pills"
          />
        </div>
      </div>

      <ProductGrid
        products={products}
        loading={loading}
        columns={4}
        onQuickView={handleQuickView}
      />

      <div className="mt-8 md:mt-6 text-center">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 py-3.5 md:py-3 px-7 md:px-6 rounded-xl font-semibold text-[15px] no-underline transition-all duration-200 hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white hover:-translate-y-0.5 hover:no-underline md:w-full md:justify-center group"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          Смотреть все товары
          <svg
            className="transition-transform duration-200 group-hover:translate-x-1"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
