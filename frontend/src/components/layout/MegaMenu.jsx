import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

export default function MegaMenu() {
  const [categories, setCategories] = useState([]);
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

  const menuCategories = useMemo(() => {
    const top = categories.filter((c) => !c.parent);
    return top.length ? top : categories;
  }, [categories]);

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

  const handleCategoryEnter = (slug) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveSlug(slug);
    loadMeta(slug);
  };

  const handleCategoryLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setActiveSlug(null);
    }, 200);
  };

  const handleDropdownEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleDropdownLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setActiveSlug(null);
    }, 200);
  };

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
      <div className="max-w-[1600px] mx-auto px-4">
        {/* Горизонтальный список категорий - по центру */}
        <div className="flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
          {menuCategories.map((cat) => (
            <div
              key={cat.id}
              className="relative shrink-0"
              onMouseEnter={() => handleCategoryEnter(cat.slug)}
              onMouseLeave={handleCategoryLeave}
            >
              <Link
                to={`/catalog?category=${cat.slug}`}
                className={`block py-3.5 px-4 text-[15px] font-semibold no-underline rounded-t-[10px] transition-colors duration-200 whitespace-nowrap
                  ${activeSlug === cat.slug
                    ? "bg-[var(--bg)] text-[var(--primary)]"
                    : "hover:bg-[var(--bg)] text-[var(--text)]"
                  }`}
              >
                {cat.name}
              </Link>
            </div>
          ))}

          {/* Распродажа */}
          <div className="shrink-0">
            <Link
              to="/sale"
              className="block py-3.5 px-4 text-[15px] font-extrabold text-red-500 no-underline rounded-[10px] transition-colors duration-200 whitespace-nowrap hover:text-red-600 hover:bg-red-500/10"
            >
              Распродажа
            </Link>
          </div>
        </div>
      </div>

      {/* Выпадающее меню */}
      {activeSlug && (
        <div
          className="absolute left-0 right-0 z-[200] animate-fade-in"
          style={{
            top: "100%",
            background: "var(--bg)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          }}
          onMouseEnter={handleDropdownEnter}
          onMouseLeave={handleDropdownLeave}
        >
          <div className="max-w-[1600px] mx-auto px-4 py-6">
            {isLoading ? (
              <div className="flex gap-8">
                <div className="w-1/3">
                  <div className="h-5 w-20 bg-[var(--border)] rounded animate-pulse mb-4" />
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-10 bg-[var(--border)] rounded-lg animate-pulse" />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-5 w-24 bg-[var(--border)] rounded animate-pulse mb-4" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-9 w-20 bg-[var(--border)] rounded-full animate-pulse" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Бренды - во всю ширину в 3 колонки */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs tracking-wider uppercase font-bold" style={{ color: "var(--muted)" }}>
                      Бренды
                    </div>
                    <Link
                      to={`/catalog?category=${activeSlug}`}
                      className="text-sm font-medium no-underline transition-colors hover:text-[var(--primary-hover)]"
                      style={{ color: "var(--primary)" }}
                      onClick={() => setActiveSlug(null)}
                    >
                      Все товары категории →
                    </Link>
                  </div>
                  {activeMeta?.brands?.length ? (
                    <div className="max-h-[200px] overflow-y-auto pr-2">
                      <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                        {activeMeta.brands.map((b) => (
                          <Link
                            key={b.id}
                            to={`/catalog?category=${activeSlug}&brand=${b.slug}`}
                            className="block py-2.5 px-3 rounded-lg text-sm font-medium no-underline transition-all duration-150 hover:bg-[var(--primary)] hover:text-white"
                            style={{ background: "var(--card)", color: "var(--text)" }}
                            onClick={() => setActiveSlug(null)}
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: "var(--muted)" }}>
                      Нет брендов в этой категории
                    </div>
                  )}
                </div>

                {/* Атрибуты/Фильтры - во всю ширину */}
                {activeMeta?.attributes?.length > 0 && (
                  <div>
                    <div className="text-xs tracking-wider uppercase font-bold mb-4" style={{ color: "var(--muted)" }}>
                      Быстрые фильтры
                    </div>
                    <div className="max-h-[180px] overflow-y-auto pr-2">
                      <div className="flex flex-col gap-4">
                        {activeMeta.attributes.map((a) => (
                          <div key={a.id}>
                            <div className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>
                              {a.name}
                            </div>
                            {a.values?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {a.values.map((v) => (
                                  <Link
                                    key={v.id}
                                    to={`/catalog?category=${activeSlug}&attr_${a.slug}=${v.slug}`}
                                    className="inline-flex items-center py-1.5 px-3 rounded-full text-[13px] font-medium no-underline transition-all duration-150 hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)]"
                                    style={{
                                      background: "var(--card)",
                                      color: "var(--text)",
                                      border: "1px solid var(--border)",
                                    }}
                                    onClick={() => setActiveSlug(null)}
                                  >
                                    {v.value}
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
