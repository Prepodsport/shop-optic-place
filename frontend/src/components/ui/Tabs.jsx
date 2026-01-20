import { useCallback } from "react";
import "./Tabs.css";

/**
 * Универсальный компонент табов.
 *
 * @param {Object[]} items - Массив табов { key: string, label: string }
 * @param {string} activeKey - Активный таб
 * @param {function} onChange - Callback при смене таба
 * @param {string} variant - Вариант стиля: "underline" | "pills" | "bordered"
 * @param {string} className - Дополнительный CSS класс
 */
export default function Tabs({
  items,
  activeKey,
  onChange,
  variant = "underline",
  className = "",
}) {
  const handleClick = useCallback(
    (key) => {
      if (key !== activeKey) {
        onChange(key);
      }
    },
    [activeKey, onChange]
  );

  return (
    <div className={`tabs tabs--${variant} ${className}`}>
      {items.map((item) => (
        <button
          key={item.key}
          className={`tabs__item ${activeKey === item.key ? "tabs__item--active" : ""}`}
          onClick={() => handleClick(item.key)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
