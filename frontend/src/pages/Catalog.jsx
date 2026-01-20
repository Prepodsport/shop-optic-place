import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api.js";
import ProductGrid from "../components/product/ProductGrid.jsx";
import QuickViewModal from "../components/ui/QuickViewModal.jsx";
import "./Catalog.css";

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    categories: [],
    brands: [],
    attributes: [],
    price_range: { min: "0", max: "100000" },
  });

  const [expandedAttrs, setExpandedAttrs] = useState({});
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  // Collapsible filter groups state
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Cache for attribute/value names (so we can show them even when filtered out)
  const [attrNamesCache, setAttrNamesCache] = useState({});

  // URL params
  const search = searchParams.get("search") || "";
  const selectedCategory = searchParams.get("category") || "";
  const selectedBrand = searchParams.get("brand") || "";
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const sortBy = searchParams.get("ordering") || "";

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get("page_size") || "24", 10) || 24);

  const spKey = searchParams.toString();

  // attr_* filters (stable)
  const attributeFilters = useMemo(() => {
    const attrFilters = {};
    for (const [key, value] of new URLSearchParams(spKey).entries()) {
      if (key.startsWith("attr_")) attrFilters[key] = value;
    }
    return attrFilters;
  }, [spKey]);

  /**
   * Смена категории должна сбрасывать все остальные фильтры.
   * Сохраняем: search, page_size
   * Сбрасываем: brand, min/max, ordering, page, attr_*
   */
  const handleCategoryChange = (nextCategorySlug) => {
    const p = new URLSearchParams();

    if (search) p.set("search", search);
    if (pageSize && pageSize !== 24) p.set("page_size", String(pageSize));

    if (nextCategorySlug) p.set("category", nextCategorySlug);

    setSearchParams(p);
  };

  const updateFilters = (key, value) => {
    const newParams = new URLSearchParams(searchParams);

    if (value) newParams.set(key, value);
    else newParams.delete(key);

    // любая смена фильтров сбрасывает страницу
    newParams.delete("page");

    setSearchParams(newParams);
  };

  const updateAttributeFilter = (attrSlug, valueSlug) => {
    const key = `attr_${attrSlug}`;
    const currentValue = searchParams.get(key) || "";
    const values = currentValue ? currentValue.split(",").filter(Boolean) : [];

    const newParams = new URLSearchParams(searchParams);

    if (values.includes(valueSlug)) {
      const newValues = values.filter((v) => v !== valueSlug);
      if (newValues.length > 0) newParams.set(key, newValues.join(","));
      else newParams.delete(key);
    } else {
      values.push(valueSlug);
      newParams.set(key, values.join(","));
    }

    newParams.delete("page");
    setSearchParams(newParams);
  };

  const isAttributeSelected = (attrSlug, valueSlug) => {
    const key = `attr_${attrSlug}`;
    const currentValue = searchParams.get(key) || "";
    return currentValue.split(",").includes(valueSlug);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedBrand) params.append("brand", selectedBrand);
      if (minPrice) params.append("min_price", minPrice);
      if (maxPrice) params.append("max_price", maxPrice);
      if (sortBy) params.append("ordering", sortBy);

      params.append("page", String(page));
      params.append("page_size", String(pageSize));

      for (const [key, value] of Object.entries(attributeFilters)) {
        params.append(key, value);
      }

      const resp = await api.get(`/catalog/products/?${params.toString()}`);
      const data = resp.data;

      if (Array.isArray(data)) {
        setProducts(data);
        setTotalCount(data.length);
      } else {
        setProducts(data?.results || []);
        setTotalCount(data?.count || 0);
      }
    } catch (error) {
      console.error("Ошибка загрузки товаров:", error);
      setProducts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    search,
    selectedCategory,
    selectedBrand,
    minPrice,
    maxPrice,
    sortBy,
    attributeFilters,
    page,
    pageSize,
  ]);

  // Debounced filter key for performance
  const filterKey = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedBrand) params.append("brand", selectedBrand);
    if (minPrice) params.append("min_price", minPrice);
    if (maxPrice) params.append("max_price", maxPrice);
    for (const [key, value] of Object.entries(attributeFilters)) {
      params.append(key, value);
    }
    return params.toString();
  }, [search, selectedCategory, selectedBrand, minPrice, maxPrice, attributeFilters]);

  const debouncedFilterKey = useDebounce(filterKey, 300);

  const fetchFilters = useCallback(async () => {
    try {
      const url = debouncedFilterKey
        ? `/catalog/products/filters/?${debouncedFilterKey}`
        : `/catalog/products/filters/`;

      const resp = await api.get(url);
      setFilters(resp.data);

      // Update cache with attribute/value names
      if (resp.data.attributes) {
        setAttrNamesCache((prev) => {
          const next = { ...prev };
          for (const attr of resp.data.attributes) {
            if (!next[attr.slug]) {
              next[attr.slug] = { name: attr.name, values: {} };
            }
            next[attr.slug].name = attr.name;
            for (const val of attr.values || []) {
              next[attr.slug].values[val.slug] = val.value;
            }
          }
          return next;
        });
      }

      // при смене набора брендов — логично сворачивать "показать ещё"
      setBrandsExpanded(false);
    } catch (error) {
      console.error("Ошибка загрузки фильтров:", error);
    }
  }, [debouncedFilterKey]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const clearFilters = () => {
    // полный сброс (включая search)
    setSearchParams({});
  };

  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const currentCategory = filters.categories.find((c) => c.slug === selectedCategory);

  const brandInList = useMemo(() => {
    if (!selectedBrand) return true;
    return (filters.brands || []).some((b) => b.slug === selectedBrand);
  }, [filters.brands, selectedBrand]);

  const hasActiveFilters =
    selectedCategory ||
    selectedBrand ||
    minPrice ||
    maxPrice ||
    search ||
    Object.keys(attributeFilters).length > 0;

  const totalPages = useMemo(() => {
    if (!totalCount) return 1;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }, [totalCount, pageSize]);

  const gotoPage = (nextPage) => {
    const p = new URLSearchParams(searchParams);
    if (nextPage <= 1) p.delete("page");
    else p.set("page", String(nextPage));
    setSearchParams(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };


  return (
    <div className="catalog">
      <div className="catalog__container">
        <div className="breadcrumbs">
          <Link to="/">Главная</Link>
          <span>/</span>
          <span className="current">{currentCategory ? currentCategory.name : "Каталог"}</span>
        </div>

        <div className="catalog__layout">
          <aside className="catalog__sidebar">
            <div className="filters">
              <div className="filters__header">
                <h3>Фильтры</h3>
                {hasActiveFilters && (
                  <button className="filters__clear" onClick={clearFilters} type="button">
                    Сбросить
                  </button>
                )}
              </div>

              {/* Категории */}
              <div className={`filter-group ${collapsedGroups.category ? "filter-group--collapsed" : ""}`}>
                <button
                  type="button"
                  className="filter-group__header"
                  onClick={() => toggleGroupCollapse("category")}
                >
                  <div className="filter-group__header-content">
                    <svg className="filter-group__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <h4 className="filter-group__title">Категория</h4>
                  </div>
                  <svg className="filter-group__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div className="filter-group__content">
                  <div className="filter-group__inner">
                    <div className="filter-group__list">
                      <label className="filter-checkbox">
                        <input
                          type="radio"
                          name="category"
                          checked={!selectedCategory}
                          onChange={() => handleCategoryChange("")}
                        />
                        <span className="filter-checkbox__custom"></span>
                        <span className="filter-checkbox__label">Все категории</span>
                      </label>

                      {filters.categories.map((cat) => (
                        <label key={cat.id} className="filter-checkbox">
                          <input
                            type="radio"
                            name="category"
                            checked={selectedCategory === cat.slug}
                            onChange={() => handleCategoryChange(cat.slug)}
                          />
                          <span className="filter-checkbox__custom"></span>
                          <span className="filter-checkbox__label">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Бренды */}
              {filters.brands.length > 0 && (
                <div className={`filter-group ${collapsedGroups.brand ? "filter-group--collapsed" : ""}`}>
                  <button
                    type="button"
                    className="filter-group__header"
                    onClick={() => toggleGroupCollapse("brand")}
                  >
                    <div className="filter-group__header-content">
                      <svg className="filter-group__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                      </svg>
                      <h4 className="filter-group__title">Бренд</h4>
                    </div>
                    <svg className="filter-group__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  <div className="filter-group__content">
                    <div className="filter-group__inner">
                      <div className={`filter-group__list ${brandsExpanded ? "filter-group__list--scrollable" : ""}`}>
                        <label className="filter-checkbox">
                          <input
                            type="radio"
                            name="brand"
                            checked={!selectedBrand || !brandInList}
                            onChange={() => updateFilters("brand", "")}
                          />
                          <span className="filter-checkbox__custom"></span>
                          <span className="filter-checkbox__label">Все бренды</span>
                        </label>

                        {(brandsExpanded ? filters.brands : filters.brands.slice(0, 5)).map((brand) => (
                          <label key={brand.id} className="filter-checkbox">
                            <input
                              type="radio"
                              name="brand"
                              checked={selectedBrand === brand.slug}
                              onChange={() => updateFilters("brand", brand.slug)}
                            />
                            <span className="filter-checkbox__custom"></span>
                            <span className="filter-checkbox__label">{brand.name}</span>
                          </label>
                        ))}
                      </div>

                      {filters.brands.length > 5 && (
                        <button
                          type="button"
                          className={`filter-group__more ${brandsExpanded ? "filter-group__more--expanded" : ""}`}
                          onClick={() => setBrandsExpanded((v) => !v)}
                        >
                          {brandsExpanded ? "Свернуть" : `Показать все (${filters.brands.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Цена */}
              <div className={`filter-group ${collapsedGroups.price ? "filter-group--collapsed" : ""}`}>
                <button
                  type="button"
                  className="filter-group__header"
                  onClick={() => toggleGroupCollapse("price")}
                >
                  <div className="filter-group__header-content">
                    <svg className="filter-group__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <h4 className="filter-group__title">Цена</h4>
                  </div>
                  <svg className="filter-group__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div className="filter-group__content">
                  <div className="filter-group__inner">
                    <div className="filter-price">
                      <div className="filter-price__input-wrap">
                        <span className="filter-price__label">от</span>
                        <input
                          type="number"
                          placeholder={filters.price_range.min}
                          value={minPrice}
                          onChange={(e) => updateFilters("min_price", e.target.value)}
                        />
                      </div>
                      <span className="filter-price__divider">—</span>
                      <div className="filter-price__input-wrap">
                        <span className="filter-price__label">до</span>
                        <input
                          type="number"
                          placeholder={filters.price_range.max}
                          value={maxPrice}
                          onChange={(e) => updateFilters("max_price", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Атрибуты */}
              {filters.attributes.map((attr) => {
                const isExpanded = !!expandedAttrs[attr.slug];
                const isCollapsed = !!collapsedGroups[`attr_${attr.slug}`];
                const displayValues = isExpanded ? attr.values : attr.values.slice(0, 5);

                return (
                  <div key={attr.id} className={`filter-group ${isCollapsed ? "filter-group--collapsed" : ""}`}>
                    <button
                      type="button"
                      className="filter-group__header"
                      onClick={() => toggleGroupCollapse(`attr_${attr.slug}`)}
                    >
                      <div className="filter-group__header-content">
                        <svg className="filter-group__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="4" y1="21" x2="4" y2="14"></line>
                          <line x1="4" y1="10" x2="4" y2="3"></line>
                          <line x1="12" y1="21" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12" y2="3"></line>
                          <line x1="20" y1="21" x2="20" y2="16"></line>
                          <line x1="20" y1="12" x2="20" y2="3"></line>
                          <line x1="1" y1="14" x2="7" y2="14"></line>
                          <line x1="9" y1="8" x2="15" y2="8"></line>
                          <line x1="17" y1="16" x2="23" y2="16"></line>
                        </svg>
                        <h4 className="filter-group__title">{attr.name}</h4>
                      </div>
                      <svg className="filter-group__chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>

                    <div className="filter-group__content">
                      <div className="filter-group__inner">
                        <div className={`filter-group__list ${isExpanded ? "filter-group__list--scrollable" : ""}`}>
                          {displayValues.map((val) => (
                            <label key={val.id} className="filter-checkbox">
                              <input
                                type="checkbox"
                                checked={isAttributeSelected(attr.slug, val.slug)}
                                onChange={() => updateAttributeFilter(attr.slug, val.slug)}
                              />
                              <span className="filter-checkbox__custom filter-checkbox__custom--checkbox"></span>
                              <span className="filter-checkbox__label">{val.value}</span>
                            </label>
                          ))}
                        </div>

                        {attr.values.length > 5 && (
                          <button
                            type="button"
                            className={`filter-group__more ${isExpanded ? "filter-group__more--expanded" : ""}`}
                            onClick={() => setExpandedAttrs((p) => ({ ...p, [attr.slug]: !p[attr.slug] }))}
                          >
                            {isExpanded ? "Свернуть" : `Показать все (${attr.values.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <main className="catalog__main">
            <div className="catalog__header">
              <h1 className="catalog__title">{currentCategory ? currentCategory.name : "Все товары"}</h1>

              <div className="catalog__controls">
                <span className="catalog__count">{totalCount} товаров</span>

                <select
                  className="catalog__sort"
                  value={sortBy}
                  onChange={(e) => updateFilters("ordering", e.target.value)}
                >
                  <option value="">По умолчанию</option>
                  <option value="price">Сначала дешевле</option>
                  <option value="-price">Сначала дороже</option>
                  <option value="-created_at">Сначала новые</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="active-filters">
                {selectedCategory && (
                  <span className="active-filter" onClick={() => handleCategoryChange("")}>
                    <span className="active-filter__group">Категория:</span>
                    {currentCategory?.name || selectedCategory} ×
                  </span>
                )}

                {selectedBrand && (
                  <span className="active-filter" onClick={() => updateFilters("brand", "")}>
                    <span className="active-filter__group">Бренд:</span>
                    {filters.brands.find((b) => b.slug === selectedBrand)?.name || selectedBrand} ×
                  </span>
                )}

                {minPrice && (
                  <span className="active-filter" onClick={() => updateFilters("min_price", "")}>
                    <span className="active-filter__group">Цена:</span>
                    от {minPrice} ₽ ×
                  </span>
                )}

                {maxPrice && (
                  <span className="active-filter" onClick={() => updateFilters("max_price", "")}>
                    <span className="active-filter__group">Цена:</span>
                    до {maxPrice} ₽ ×
                  </span>
                )}

                {Object.entries(attributeFilters).map(([key, value]) => {
                  const attrSlug = key.replace("attr_", "");
                  const attr = filters.attributes.find((a) => a.slug === attrSlug);
                  const cachedAttr = attrNamesCache[attrSlug];

                  return value.split(",").filter(Boolean).map((valSlug) => {
                    const val = attr?.values?.find((v) => v.slug === valSlug);
                    const attrName = attr?.name || cachedAttr?.name || attrSlug;
                    const valName = val?.value || cachedAttr?.values?.[valSlug] || valSlug;

                    return (
                      <span
                        key={`${key}-${valSlug}`}
                        className="active-filter"
                        onClick={() => updateAttributeFilter(attrSlug, valSlug)}
                      >
                        <span className="active-filter__group">{attrName}:</span>
                        {valName} ×
                      </span>
                    );
                  });
                })}
              </div>
            )}

            {/* IMPORTANT: showEmpty={false} чтобы не было двойного "Товары не найдены" */}
            <ProductGrid
              products={products}
              loading={loading}
              columns={3}
              onQuickView={setQuickViewSlug}
              showEmpty={false}
            />

            {!loading && products.length === 0 && (
              <div className="catalog__empty">
                <h3>Товары не найдены</h3>
                <p>Попробуйте изменить параметры фильтров</p>
                <button className="btn primary" onClick={clearFilters} type="button">
                  Сбросить фильтры
                </button>
              </div>
            )}

            {totalCount > 0 && totalPages > 1 && (
              <div className="catalog-pagination">
                <button className="btn" disabled={page <= 1} onClick={() => gotoPage(page - 1)} type="button">
                  Назад
                </button>

                <span className="catalog-pagination__info">
                  Страница {page} из {totalPages}
                </span>

                <button className="btn" disabled={page >= totalPages} onClick={() => gotoPage(page + 1)} type="button">
                  Вперёд
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {quickViewSlug && (
        <QuickViewModal productSlug={quickViewSlug} onClose={() => setQuickViewSlug(null)} />
      )}
    </div>
  );
}
