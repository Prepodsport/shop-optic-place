import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import "./MegaMenu.css";

export default function MegaMenu() {
  const [categories, setCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const [activeSlug, setActiveSlug] = useState(null);
  const [metaBySlug, setMetaBySlug] = useState({});
  const [loadingSlug, setLoadingSlug] = useState(null);

  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const fetchCategories = async () => {
    try {
      const resp = await api.get("/catalog/categories/");
      setCategories(resp.data || []);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
  };

  // Если у тебя реально нет parent/child — показываем просто список категорий.
  // Если вдруг parent есть, то можно оставить только верхний уровень:
  const menuCategories = useMemo(() => {
    const top = categories.filter((c) => !c.parent);
    return top.length ? top : categories;
  }, [categories]);

  // выставляем дефолтную активную категорию
  useEffect(() => {
    if (!menuCategories.length) return;
    const exists = menuCategories.some((c) => c.slug === activeSlug);
    if (!activeSlug || !exists) setActiveSlug(menuCategories[0].slug);
  }, [menuCategories, activeSlug]);

  const loadMeta = useCallback(
    async (slug) => {
      if (!slug) return;
      if (metaBySlug[slug]) return; // кэш

      try {
        setLoadingSlug(slug);
        const resp = await api.get(`/catalog/categories/${slug}/menu-meta/`);
        setMetaBySlug((prev) => ({ ...prev, [slug]: resp.data }));
      } catch (e) {
        console.error("Ошибка загрузки meta меню:", e);
        setMetaBySlug((prev) => ({ ...prev, [slug]: { category: { slug }, brands: [], attributes: [] } }));
      } finally {
        setLoadingSlug(null);
      }
    },
    [metaBySlug]
  );

  // подгружаем meta для активной категории
  useEffect(() => {
    if (activeSlug) loadMeta(activeSlug);
  }, [activeSlug, loadMeta]);

  const activeMeta = activeSlug ? metaBySlug[activeSlug] : null;
  const isLoading = loadingSlug === activeSlug && !activeMeta;

  return (
    <nav className="mega-menu" ref={menuRef}>
      <div className="mega-menu__container">
        {/* Кнопка каталога */}
        <div className="mega-menu__catalog" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <button
            type="button"
            className={`mega-menu__catalog-btn ${isOpen ? "is-open" : ""}`}
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>Каталог</span>
            <svg
              className={`mega-menu__arrow ${isOpen ? "mega-menu__arrow--open" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isOpen && (
            <div className="mega-menu__dropdown" role="menu">
              <div className="mega-menu__panel">
                {/* Сайдбар: категории */}
                <div className="mega-menu__sidebar">
                  <div className="mega-menu__sidebar-title">Категории</div>

                  <ul className="mega-menu__parents">
                    {menuCategories.map((cat) => {
                      const isActive = cat.slug === activeSlug;
                      return (
                        <li key={cat.id} className="mega-menu__parent-item">
                          <Link
                            to={`/catalog?category=${cat.slug}`}
                            className={`mega-menu__parent-link ${isActive ? "is-active" : ""}`}
                            onMouseEnter={() => {
                              setActiveSlug(cat.slug);
                              loadMeta(cat.slug);
                            }}
                            onFocus={() => {
                              setActiveSlug(cat.slug);
                              loadMeta(cat.slug);
                            }}
                            onClick={() => setIsOpen(false)}
                          >
                            <span className="mega-menu__parent-name">{cat.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Контент: бренды + 3 атрибута */}
                <div className="mega-menu__content">
                  <div className="mega-menu__content-head">
                    <Link
                      to={activeSlug ? `/catalog?category=${activeSlug}` : "/catalog"}
                      className="mega-menu__content-parent"
                      onClick={() => setIsOpen(false)}
                    >
                      {activeMeta?.category?.name || "Каталог"}
                    </Link>
                  </div>

                  {isLoading ? (
                    <div className="mega-menu__loading">
                      <div className="mega-menu__skeleton" />
                      <div className="mega-menu__skeleton" />
                      <div className="mega-menu__skeleton" />
                    </div>
                  ) : (
                    <>
                      <div className="mega-menu__section">
                        <div className="mega-menu__section-title">Бренды</div>

                        {activeMeta?.brands?.length ? (
                          <div className="mega-menu__brands-grid">
                            {activeMeta.brands.map((b) => (
                              <Link
                                key={b.id}
                                to={`/catalog?category=${activeSlug}&brand=${b.slug}`}
                                className="mega-menu__brand-tile"
                                onClick={() => setIsOpen(false)}
                              >
                                {b.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="mega-menu__empty">В этой категории пока нет брендов.</div>
                        )}
                      </div>

                        <div className="mega-menu__section">
                          <div className="mega-menu__section-title">Фильтры</div>

                          {activeMeta?.attributes?.length ? (
                            <div className="mega-menu__attr-groups">
                              {activeMeta.attributes.map((a) => (
                                <div key={a.id} className="mega-menu__attr-group">
                                  <div className="mega-menu__attr-name">{a.name}</div>

                                  {a.values?.length ? (
                                    <div className="mega-menu__attrs">
                                      {a.values.map((v) => (
                                        <Link
                                          key={v.id}
                                          to={`/catalog?category=${activeSlug}&attr_${a.slug}=${v.slug}`}
                                          className="mega-menu__attr-chip"
                                          onClick={() => setIsOpen(false)}
                                          title={`${a.name}: ${v.value}`}
                                        >
                                          {v.value}
                                        </Link>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="mega-menu__empty">Нет значений для фильтра.</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mega-menu__empty">Нет доступных атрибутов для фильтрации.</div>
                          )}
                        </div>
                    </>
                  )}

                  <div className="mega-menu__cta">
                    <Link to="/catalog" className="mega-menu__cta-btn" onClick={() => setIsOpen(false)}>
                      Смотреть все товары <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Остальные пункты меню */}
        <div className="mega-menu__links">
          <Link to="/catalog" className="mega-menu__link">
            Все товары
          </Link>
          <Link to="/sale" className="mega-menu__link mega-menu__link--sale">
            Распродажа
          </Link>
          <Link to="/booking" className="mega-menu__link">
            Запись к врачу
          </Link>
          <Link to="/about" className="mega-menu__link">
            О нас
          </Link>
          <Link to="/contacts" className="mega-menu__link">
            Контакты
          </Link>
          <Link to="/delivery" className="mega-menu__link">
            Доставка
          </Link>
        </div>
      </div>
    </nav>
  );
}
