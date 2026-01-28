import { useCallback } from "react";

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

  const getContainerClasses = () => {
    switch (variant) {
      case "underline":
        return "flex flex-wrap gap-0 border-b";
      case "pills":
        return "flex gap-1 shrink-0";
      case "bordered":
        return "flex flex-wrap gap-2";
      default:
        return "flex";
    }
  };

  const getItemClasses = (isActive) => {
    const base = "text-[15px] font-medium cursor-pointer transition-all duration-200 relative";

    switch (variant) {
      case "underline":
        return `${base} border-none bg-transparent py-3 px-6 rounded-none ${
          isActive ? "text-[var(--primary)]" : "text-[var(--muted)] hover:text-[var(--text)]"
        }`;
      case "pills":
        return `${base} py-2.5 px-5 rounded-[10px] ${
          isActive
            ? "bg-[var(--card)] text-[var(--text)] border border-[var(--border)]"
            : "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--text)]"
        }`;
      case "bordered":
        return `${base} py-2 px-4 rounded-lg border ${
          isActive
            ? "border-[var(--primary)] bg-[var(--primary)] text-white"
            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--text)]"
        }`;
      default:
        return base;
    }
  };

  return (
    <div
      className={`${getContainerClasses()} ${className}`}
      style={variant === "underline" ? { borderColor: 'var(--border)' } : {}}
    >
      {items.map((item) => {
        const isActive = activeKey === item.key;
        return (
          <button
            key={item.key}
            className={getItemClasses(isActive)}
            onClick={() => handleClick(item.key)}
            type="button"
          >
            {item.label}
            {/* Индикатор для underline варианта */}
            {variant === "underline" && (
              <span
                className={`absolute bottom-[-1px] left-0 right-0 h-0.5 transition-transform duration-200 origin-center ${
                  isActive ? "scale-x-100" : "scale-x-0"
                }`}
                style={{ background: 'var(--primary)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
