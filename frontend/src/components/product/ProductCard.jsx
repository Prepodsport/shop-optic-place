import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { useFavorites } from "../../context/FavoritesContext.jsx";
import Badge, { calcDiscountPercent } from "../ui/Badge.jsx";
import StarRating from "../ui/StarRating.jsx";

export default function ProductCard({ product, onQuickView }) {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, isInCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const hasVariations = Boolean(product.has_variations);

  const inCart = hasVariations ? false : isInCart(product.id);
  const inFavorites = isFavorite(product.id);
  const discountPercent = calcDiscountPercent(product.price, product.old_price);

  const productUrl = `/product/${product.slug}`;

  const handleAddToCart = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (hasVariations) {
        if (onQuickView) onQuickView(product.slug);
        return;
      }

      addToCart(product);
    },
    [addToCart, product, hasVariations, onQuickView]
  );

  const handleToggleFavorite = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFavorite(product.id);
    },
    [toggleFavorite, product.id]
  );

  const handleQuickView = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (onQuickView) onQuickView(product.slug);
    },
    [onQuickView, product.slug]
  );

  return (
    <article
      className={`relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 ${
        isHovered ? "-translate-y-2 shadow-[0_16px_40px_rgba(0,0,0,0.12)]" : ""
      }`}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Изображение */}
      <div className="relative pt-[100%] overflow-hidden" style={{ background: 'var(--bg)' }}>
        {product.main_image_url ? (
          <img
            src={product.main_image_url}
            alt={product.name}
            className={`absolute top-0 left-0 w-full h-full object-contain p-4 transition-transform duration-400 ${
              isHovered ? "scale-[1.08]" : ""
            }`}
            loading="lazy"
          />
        ) : (
          <div
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-sm"
            style={{ color: 'var(--muted)' }}
          >
            Нет фото
          </div>
        )}

        {/* Бейджи */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
          {discountPercent > 0 && (
            <Badge type="discount">Скидка -{discountPercent}%</Badge>
          )}
          {product.is_sale && <Badge type="sale">Распродажа</Badge>}
          {product.is_new && <Badge type="new">Новинка</Badge>}
          {product.is_bestseller && <Badge type="bestseller">Хит</Badge>}
          {product.is_popular && !product.is_bestseller && (
            <Badge type="popular">Популярное</Badge>
          )}
        </div>

        {/* Оверлей с кнопками при наведении */}
        <div
          className={`absolute top-3 right-3 flex flex-col gap-2 z-20 transition-all duration-300 ${
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2.5 sm:opacity-100 sm:translate-x-0"
          }`}
        >
          <button
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-all duration-200 hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onClick={handleQuickView}
            title="Быстрый просмотр"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>

          <button
            className={`w-10 h-10 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-all duration-200 ${
              inFavorites
                ? "text-red-500 hover:bg-red-500 hover:border-red-500 hover:text-white"
                : "hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white"
            }`}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: inFavorites ? '#ef4444' : 'var(--text)',
            }}
            onClick={handleToggleFavorite}
            title={inFavorites ? "Убрать из избранного" : "В избранное"}
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={inFavorites ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Информация */}
      <div className="p-4 flex-1 flex flex-col relative z-20">
        {/* Категория и бренд */}
        <div className="text-xs uppercase tracking-wide mb-2 relative z-20" style={{ color: 'var(--muted)' }}>
          {product.category && (
            <Link
              to={`/catalog?category=${product.category.slug}`}
              className="relative z-20 text-blue-600 no-underline font-medium py-0.5 px-1 rounded transition-all duration-200 hover:text-white hover:bg-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              {product.category.name}
            </Link>
          )}

          {product.brand && (
            <>
              <span> • </span>
              <Link
                to={`/catalog?brand=${product.brand.slug}`}
                className="relative z-20 text-amber-500 no-underline font-medium py-0.5 px-1.5 rounded transition-all duration-200 hover:text-white hover:bg-amber-500"
                onClick={(e) => e.stopPropagation()}
              >
                {product.brand.name}
              </Link>
            </>
          )}
        </div>

        {/* Название */}
        <h3
          className="text-[15px] sm:text-sm font-medium leading-snug m-0 mb-2 flex-1 line-clamp-2"
          style={{ color: 'var(--text)' }}
        >
          {product.name}
        </h3>

        {/* Рейтинг */}
        {product.average_rating > 0 && (
          <div className="mb-2">
            <StarRating
              rating={product.average_rating}
              count={product.reviews_count}
              size="small"
              showCount={true}
            />
          </div>
        )}

        {/* Цена */}
        <div className="flex items-baseline gap-2.5 mt-auto">
          <span className="text-xl sm:text-lg font-bold" style={{ color: 'var(--text)' }}>
            {parseFloat(product.price).toLocaleString("ru-RU")} ₽
          </span>
          {product.old_price && (
            <span className="text-sm line-through" style={{ color: 'var(--muted)' }}>
              {parseFloat(product.old_price).toLocaleString("ru-RU")} ₽
            </span>
          )}
        </div>
      </div>

      {/* Кнопка в корзину / выбрать параметры */}
      <div className="px-4 pb-4 relative z-20">
        <button
          className={`w-full py-3 px-4 rounded-[10px] text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 active:scale-[0.98] ${
            inCart
              ? "bg-green-500 text-white hover:bg-green-600"
              : hasVariations
                ? "hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)]"
                : "bg-[var(--primary)] text-white border-transparent hover:bg-blue-700"
          }`}
          style={hasVariations && !inCart ? {
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          } : {
            border: 'none',
          }}
          onClick={handleAddToCart}
          type="button"
        >
          {inCart ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              В корзине
            </>
          ) : hasVariations ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              Выбрать параметры
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              В корзину
            </>
          )}
        </button>
      </div>

      {/* Cover-link: делает кликабельной всю карточку */}
      <Link
        to={productUrl}
        className="absolute inset-0 z-10 block no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
        aria-label={`Открыть товар: ${product.name}`}
      />
    </article>
  );
}
