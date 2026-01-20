import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { useFavorites } from "../../context/FavoritesContext.jsx";
import Badge, { calcDiscountPercent } from "../ui/Badge.jsx";
import "./ProductCard.css";

/**
 * Карточка товара.
 *
 * @param {Object} product - Данные товара
 * @param {function} onQuickView - Callback для быстрого просмотра
 */
export default function ProductCard({ product, onQuickView }) {
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, isInCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  // Товар с вариациями - нельзя добавлять в корзину без выбора
  const hasVariations = Boolean(product.has_variations);

  const inCart = hasVariations ? false : isInCart(product.id);
  const inFavorites = isFavorite(product.id);
  const discountPercent = calcDiscountPercent(product.price, product.old_price);

  const handleAddToCart = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Товары с вариациями открывают QuickView для выбора
      if (hasVariations) {
        if (onQuickView) {
          onQuickView(product.slug);
        }
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
      if (onQuickView) {
        onQuickView(product.slug);
      }
    },
    [onQuickView, product.slug]
  );

  return (
    <article
      className={`product-card ${isHovered ? "product-card--hovered" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product.slug}`} className="product-card__link">
        {/* Изображение */}
        <div className="product-card__image-wrap">
          {product.main_image_url ? (
            <img
              src={product.main_image_url}
              alt={product.name}
              className="product-card__image"
              loading="lazy"
            />
          ) : (
            <div className="product-card__no-image">Нет фото</div>
          )}

          {/* Бейджи */}
          <div className="product-card__badges">
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
          <div className="product-card__overlay">
            <button
              className="product-card__icon-btn"
              onClick={handleQuickView}
              title="Быстрый просмотр"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button
              className={`product-card__icon-btn ${inFavorites ? "product-card__icon-btn--active" : ""}`}
              onClick={handleToggleFavorite}
              title={inFavorites ? "Убрать из избранного" : "В избранное"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={inFavorites ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Информация */}
        <div className="product-card__info">
          {/* Категория и бренд */}
          <div className="product-card__meta">
            {product.category?.name}
            {product.brand && ` • ${product.brand.name}`}
          </div>

          {/* Название */}
          <h3 className="product-card__title">{product.name}</h3>

          {/* Цена */}
          <div className="product-card__price-wrap">
            <span className="product-card__price">
              {parseFloat(product.price).toLocaleString("ru-RU")} ₽
            </span>
            {product.old_price && (
              <span className="product-card__old-price">
                {parseFloat(product.old_price).toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Кнопка в корзину / выбрать параметры */}
      <div className="product-card__actions">
        <button
          className={`product-card__cart-btn ${inCart ? "product-card__cart-btn--in-cart" : ""} ${hasVariations ? "product-card__cart-btn--variants" : ""}`}
          onClick={handleAddToCart}
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
    </article>
  );
}
