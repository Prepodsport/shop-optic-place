import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";

// Иконка по умолчанию для категорий без изображения
const DefaultIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);

/**
 * Секция категорий для главной страницы.
 */
export default function CategoryTabs({ title = "Категории товаров" }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/catalog/categories/")
      .then((res) => {
        // Фильтруем только корневые категории (без parent)
        const rootCategories = (res.data || []).filter((cat) => !cat.parent);
        setCategories(rootCategories);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки категорий:", err);
        setLoading(false);
      });
  }, []);

  // РОВНАЯ СЕТКА: одинаковые квадраты на всю ширину блока
  // Подстрой кол-во колонок под дизайн (например lg:grid-cols-6 / lg:grid-cols-5)
  const gridClass =
    "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 md:gap-3";

  if (loading) {
    return (
      <section className="max-w-[1280px] mx-auto px-4">
        <h2
          className="m-0 mb-8 md:mb-6 text-[28px] md:text-2xl sm:text-xl font-bold"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h2>

        <div className={gridClass}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl animate-shimmer"
              style={{
                background:
                  "linear-gradient(90deg, var(--card) 25%, var(--border) 50%, var(--card) 75%)",
                backgroundSize: "200% 100%",
                border: "1px solid var(--border)",
              }}
            />
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="max-w-[1280px] mx-auto px-4">
      <h2
        className="m-0 mb-8 md:mb-6 text-[28px] md:text-2xl sm:text-xl font-bold"
        style={{ color: "var(--text)" }}
      >
        {title}
      </h2>

      <div className={gridClass}>
        {categories.map((category) => {
          const hasImage = Boolean(category.image_url);

          return (
            <Link
              key={category.id}
              to={`/catalog?category=${category.slug}`}
              className={`group relative flex aspect-square w-full rounded-2xl overflow-hidden no-underline transition-all duration-200 hover:-translate-y-[3px] hover:border-[var(--primary)] hover:shadow-lg hover:no-underline ${
                hasImage
                  ? "flex-col justify-end text-white"
                  : "flex-col items-center justify-center gap-3 p-4"
              }`}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                color: hasImage ? "white" : "var(--text)",
              }}
            >
              {hasImage ? (
                <>
                  {/* Изображение на фоне */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={category.image_url}
                      alt={category.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Градиент для читаемости */}
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

                  {/* Название */}
{/* Название (truncate + marquee on hover если не влазит) */}
<span
  className="relative z-[2] mx-3 mb-3 md:mx-2.5 md:mb-2.5
             w-[calc(100%-24px)] md:w-[calc(100%-20px)]
             py-2.5 md:py-[9px] px-3 md:px-2.5 rounded-xl md:rounded-[10px]
             text-base md:text-sm font-bold leading-tight text-white bg-black/[0.28]
             overflow-hidden whitespace-nowrap"
>
  <span className="inline-block group-hover:animate-[marquee_6s_linear_infinite]">
    {category.name}
  </span>
</span>

                </>
              ) : (
                <>
                  {/* Иконка */}
                  <div
                    className="flex items-center justify-center w-16 md:w-[52px] h-16 md:h-[52px] rounded-2xl md:rounded-xl transition-all duration-200 text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white [&_svg]:w-12 md:[&_svg]:w-[26px] [&_svg]:h-12 md:[&_svg]:h-[26px]"
                    style={{ background: "var(--bg)" }}
                  >
                    <DefaultIcon />
                  </div>

                  {/* Название */}
                  <span
                    className="text-base md:text-sm font-bold text-center leading-tight"
                    style={{ color: "var(--text)" }}
                  >
                    {category.name}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
