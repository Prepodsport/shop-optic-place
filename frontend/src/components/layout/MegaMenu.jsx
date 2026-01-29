import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

export default function MegaMenu() {
  const [categories, setCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState(null);
  const [metaBySlug, setMetaBySlug] = useState({});
  const [loadingSlug, setLoadingSlug] = useState(null);

  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  const fetchCategories = useCallback(async () => {
    try {
      const resp = await api.get("/catalog/categories/");
      setCategories(resp.data || []);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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

  const menuCategories = useMemo(() => {
    const top = categories.filter((c) => !c.parent);
    return top.length ? top : categories;
  }, [categories]);

  useEffect(() => {
    if (!menuCategories.length) return;
    const exists = menuCategories.some((c) => c.slug === activeSlug);
    if (!activeSlug || !exists) setActiveSlug(menuCategories[0].slug);
  }, [menuCategories, activeSlug]);

  const loadMeta = useCallback(
    async (slug) => {
      if (!slug) return;
      if (metaBySlug[slug]) return;

      try {
        setLoadingSlug(slug);
        const resp = await api.get(`/catalog/categories/${slug}/menu-meta/`);
        setMetaBySlug((prev) => ({ ...prev, [slug]: resp.data }));
      } catch (e) {
        console.error("Ошибка загрузки meta меню:", e);
        setMetaBySlug((prev) => ({
          ...prev,
          [slug]: { category: { slug }, brands: [], attributes: [] },
        }));
      } finally {
        setLoadingSlug(null);
      }
    },
    [metaBySlug]
  );

  useEffect(() => {
    if (activeSlug) loadMeta(activeSlug);
  }, [activeSlug, loadMeta]);

  const activeMeta = activeSlug ? metaBySlug[activeSlug] : null;
  const isLoading = loadingSlug === activeSlug && !activeMeta;

  return (
    <nav
      ref={menuRef}
      className="sticky z-[90] border-b transition-[top] duration-300"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        top: "calc(var(--top-offset, 0px) + var(--header-height, 0px))",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-4 flex items-center justify-between">
        {/* Кнопка каталога */}
        <div
          className="relative shrink-0"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            className={`inline-flex items-center gap-2.5 py-3 px-5 text-white border-none rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-150 shadow-lg hover:bg-[#1d4ed8] hover:-translate-y-px sm:py-2.5 sm:px-4 sm:text-[13px] sm:gap-2 ${
              isOpen ? "bg-[#1d4ed8]" : ""
            }`}
            style={{ background: "var(--primary)" }}
            onClick={() => setIsOpen((v) => !v)}
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>Каталог</span>
            <svg
              className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isOpen && (
            <div
              className="absolute top-[calc(100%+10px)] left-[-16px] w-[calc(100vw-32px)] md:left-0 md:w-[min(980px,92vw)] rounded-[18px] overflow-hidden z-[200] animate-fade-in shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-[10px]"
              style={{
                background: "color-mix(in srgb, var(--card) 92%, transparent)",
                border: "1px solid var(--border)",
              }}
              role="menu"
            >
              <div className="flex flex-col md:flex-row md:min-h-[420px]">
                {/* Сайдбар */}
                <div
                  className="w-full md:w-[280px] p-4 md:p-4 flex flex-col gap-3 border-b md:border-b-0 md:border-r"
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                >
                  <div className="text-xs tracking-wider uppercase font-bold" style={{ color: "var(--muted)" }}>
                    Категории
                  </div>

                  <ul className="list-none m-0 p-0 overflow-auto max-h-[180px] md:max-h-[360px]">
                    {menuCategories.map((cat) => {
                      const isActive = cat.slug === activeSlug;

                      return (
                        <li key={cat.id} className="mt-1.5 first:mt-0">
                          <Link
                            to={`/catalog?category=${cat.slug}`}
                            className={`flex items-center justify-between gap-2.5 py-2 px-2.5 rounded-xl no-underline text-sm font-semibold transition-all duration-150 border ${
                              isActive
                                ? "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]"
                                : "border-transparent hover:bg-[color-mix(in_srgb,var(--card)_70%,transparent)] hover:border-[var(--border)]"
                            }`}
                            style={{ color: isActive ? "var(--primary)" : "var(--text)" }}
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
                            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                              {cat.name}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Контент */}
                <div className="flex-1 p-4 md:p-5 flex flex-col gap-4 min-w-0">
                  <div
                    className="flex items-baseline justify-between gap-3 pb-3 border-b"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <Link
                      to={activeSlug ? `/catalog?category=${activeSlug}` : "/catalog"}
                      className="text-base font-extrabold no-underline min-w-0 overflow-hidden text-ellipsis whitespace-nowrap hover:text-[var(--primary)]"
                      style={{ color: "var(--text)" }}
                      onClick={() => setIsOpen(false)}
                    >
                      {activeMeta?.category?.name || "Каталог"}
                    </Link>
                  </div>

                  {isLoading ? (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-11 rounded-xl animate-pulse"
                          style={{ background: "var(--border)" }}
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Бренды */}
                      <div className="flex flex-col gap-2.5">
                        <div
                          className="text-xs tracking-wider uppercase font-extrabold"
                          style={{ color: "var(--muted)" }}
                        >
                          Бренды
                        </div>

                        {activeMeta?.brands?.length ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[40vh] md:max-h-[220px] overflow-auto pr-1">
                            {activeMeta.brands.map((b) => (
                              <Link
                                key={b.id}
                                to={`/catalog?category=${activeSlug}&brand=${b.slug}`}
                                className="block py-2.5 px-3 rounded-xl text-sm font-bold no-underline transition-all duration-150 hover:-translate-y-px hover:text-[var(--primary)]"
                                style={{
                                  background: "var(--bg)",
                                  color: "var(--text)",
                                  border: "1px solid var(--border)",
                                }}
                                onClick={() => setIsOpen(false)}
                              >
                                {b.name}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm py-1.5" style={{ color: "var(--muted)" }}>
                            В этой категории пока нет брендов.
                          </div>
                        )}
                      </div>

                      {/* Фильтры */}
                      <div className="flex flex-col gap-2.5">
                        <div
                          className="text-xs tracking-wider uppercase font-extrabold"
                          style={{ color: "var(--muted)" }}
                        >
                          Фильтры
                        </div>

                        {activeMeta?.attributes?.length ? (
                          <div className="flex flex-col gap-4">
                            {activeMeta.attributes.map((a) => (
                              <div key={a.id} className="flex flex-col gap-2">
                                <div className="text-[13px] font-extrabold" style={{ color: "var(--text)" }}>
                                  {a.name}
                                </div>

                                {a.values?.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {a.values.map((v) => (
                                      <Link
                                        key={v.id}
                                        to={`/catalog?category=${activeSlug}&attr_${a.slug}=${v.slug}`}
                                        className="inline-flex items-center py-2 px-3 rounded-full text-[13px] font-extrabold no-underline transition-all duration-150 hover:-translate-y-px hover:text-[var(--primary)]"
                                        style={{
                                          background: "var(--bg)",
                                          color: "var(--text)",
                                          border: "1px solid var(--border)",
                                        }}
                                        onClick={() => setIsOpen(false)}
                                        title={`${a.name}: ${v.value}`}
                                      >
                                        {v.value}
                                      </Link>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm py-1.5" style={{ color: "var(--muted)" }}>
                                    Нет значений для фильтра.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm py-1.5" style={{ color: "var(--muted)" }}>
                            Нет доступных атрибутов для фильтрации.
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="mt-auto pt-4 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
                    <Link
                      to="/catalog"
                      className="inline-flex items-center gap-2 py-2.5 px-3.5 rounded-xl text-sm font-extrabold no-underline transition-all duration-150 hover:translate-x-0.5"
                      style={{
                        background: "color-mix(in srgb, var(--primary) 10%, transparent)",
                        color: "var(--primary)",
                        border: "1px solid color-mix(in srgb, var(--primary) 28%, var(--border))",
                      }}
                      onClick={() => setIsOpen(false)}
                    >
                      Смотреть все товары <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Остальные ссылки (десктоп) */}
        <div className="hidden md:flex items-center gap-1 flex-1 justify-end">
          <Link
            to="/catalog"
            className="py-3.5 px-4 text-[15px] font-semibold no-underline rounded-[10px] transition-colors duration-200 hover:bg-[var(--bg)]"
            style={{ color: "var(--text)" }}
          >
            Все товары
          </Link>

          <Link
            to="/sale"
            className="py-3.5 px-4 text-[15px] font-extrabold text-red-500 no-underline rounded-[10px] transition-colors duration-200 hover:text-red-600 hover:bg-red-500/10"
          >
            Распродажа
          </Link>

          <Link
            to="/booking"
            className="py-3.5 px-4 text-[15px] font-semibold no-underline rounded-[10px] transition-colors duration-200 hover:bg-[var(--bg)]"
            style={{ color: "var(--text)" }}
          >
            Запись к врачу
          </Link>

          <Link
            to="/about"
            className="py-3.5 px-4 text-[15px] font-semibold no-underline rounded-[10px] transition-colors duration-200 hover:bg-[var(--bg)]"
            style={{ color: "var(--text)" }}
          >
            О нас
          </Link>

          <Link
            to="/contacts"
            className="py-3.5 px-4 text-[15px] font-semibold no-underline rounded-[10px] transition-colors duration-200 hover:bg-[var(--bg)]"
            style={{ color: "var(--text)" }}
          >
            Контакты
          </Link>

          <Link
            to="/delivery"
            className="py-3.5 px-4 text-[15px] font-semibold no-underline rounded-[10px] transition-colors duration-200 hover:bg-[var(--bg)]"
            style={{ color: "var(--text)" }}
          >
            Доставка
          </Link>
        </div>
      </div>
    </nav>
  );
}
