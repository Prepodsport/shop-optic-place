import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import "./CategoryTabs.css";

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

  if (loading) {
    return (
      <section className="category-tabs">
        <div className="container">
          <h2 className="category-tabs__title">{title}</h2>
          <div className="category-tabs__grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="category-tabs__skeleton" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="category-tabs">
      <div className="container">
        <h2 className="category-tabs__title">{title}</h2>

        <div className="category-tabs__grid">
          {categories.map((category) => {
            const hasImage = Boolean(category.image_url);

            return (
              <Link
                key={category.id}
                to={`/catalog?category=${category.slug}`}
                className={`category-tabs__card ${hasImage ? "category-tabs__card--image" : "category-tabs__card--noimage"}`}
              >
                <div className="category-tabs__image" aria-hidden="true">
                  {hasImage ? (
                    <img src={category.image_url} alt={category.name} loading="lazy" />
                  ) : (
                    <div className="category-tabs__icon">
                      <DefaultIcon />
                    </div>
                  )}
                </div>

                <span className="category-tabs__name">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
