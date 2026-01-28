/**
 * Компонент бейджа для карточки товара.
 *
 * @param {string} type - Тип бейджа: "discount" | "new" | "bestseller" | "popular" | "sale"
 * @param {string} children - Текст бейджа
 * @param {string} className - Дополнительный CSS класс
 */
export default function Badge({ type = "default", children, className = "" }) {
  const baseClasses = "inline-block px-2.5 py-1 rounded text-xs font-semibold leading-tight uppercase tracking-wide";

  const typeClasses = {
    discount: "bg-gradient-to-br from-red-500 to-red-600 text-white",
    new: "bg-gradient-to-br from-green-500 to-green-600 text-white",
    bestseller: "bg-gradient-to-br from-orange-500 to-orange-600 text-white",
    popular: "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
    sale: "bg-gradient-to-br from-pink-500 to-pink-600 text-white",
    default: "border",
  };

  const defaultStyle = type === "default" ? {
    background: 'var(--card)',
    color: 'var(--text)',
    borderColor: 'var(--border)',
  } : {};

  return (
    <span
      className={`${baseClasses} ${typeClasses[type] || typeClasses.default} ${className}`}
      style={defaultStyle}
    >
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
