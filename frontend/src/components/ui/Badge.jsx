import "./Badge.css";

/**
 * Компонент бейджа для карточки товара.
 *
 * @param {string} type - Тип бейджа: "discount" | "new" | "bestseller" | "popular"
 * @param {string} children - Текст бейджа
 * @param {string} className - Дополнительный CSS класс
 */
export default function Badge({ type = "default", children, className = "" }) {
  return (
    <span className={`badge badge--${type} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Вычисляет процент скидки.
 * @param {number} price - Текущая цена
 * @param {number} oldPrice - Старая цена
 * @returns {number} Процент скидки
 */
export function calcDiscountPercent(price, oldPrice) {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round((1 - price / oldPrice) * 100);
}
