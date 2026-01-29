import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api.js";
import ProductGrid from "../components/product/ProductGrid.jsx";
import QuickViewModal from "../components/ui/QuickViewModal.jsx";

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

// Дефолтные настройки фильтров (вынесены для переиспользования)
const DEFAULT_FILTER_SETTINGS = {
  filters_enabled: true,
  show_attribute_count: false,
  show_category_count: false,
  show_brand_count: false,
  max_attribute_values: 5,
  max_categories: 5,
  max_brands: 5,
};

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
    settings: { ...DEFAULT_FILTER_SETTINGS },
  });

  const [expandedAttrs, setExpandedAttrs] = useState({});
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [quickViewSlug, setQuickViewSlug] = useState(null);

  const [collapsedGroups, setCollapsedGroups] = useState({});
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

  const attributeFilters = useMemo(() => {
    const attrFilters = {};
    for (const [key, value] of new URLSearchParams(spKey).entries()) {
      if (key.startsWith("attr_")) attrFilters[key] = value;
    }
    return attrFilters;
  }, [spKey]);

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
  }, [search, selectedCategory, selectedBrand, minPrice, maxPrice, sortBy, attributeFilters, page, pageSize]);

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

      // Мержим настройки с дефолтными значениями для защиты от undefined
      const responseData = {
        categories: resp.data?.categories || [],
        brands: resp.data?.brands || [],
        attributes: resp.data?.attributes || [],
        price_range: resp.data?.price_range || { min: "0", max: "100000" },
        settings: {
          ...DEFAULT_FILTER_SETTINGS,
          ...(resp.data?.settings || {}),
        },
      };

      setFilters(responseData);

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

  // Filter group component
  const FilterGroup = ({ id, title, icon, children }) => {
    const isCollapsed = !!collapsedGroups[id];

    return (
      <div
        className={`mb-2 rounded-[14px] overflow-hidden transition-all duration-300 hover:border-blue-500/30 ${
          isCollapsed ? "" : ""
        }`}
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        <button
          type="button"
          className="flex justify-between items-center w-full py-3.5 px-4 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-[var(--bg-secondary)]"
          onClick={() => toggleGroupCollapse(id)}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[var(--primary)] opacity-85 flex-shrink-0">{icon}</span>
            <h4 className="m-0 text-sm font-semibold text-start" style={{ color: 'var(--text)' }}>
              {title}
            </h4>
          </div>
          <svg
            className={`flex-shrink-0 transition-transform duration-300 ${isCollapsed ? "-rotate-90" : ""}`}
            style={{ color: 'var(--muted)' }}
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
        <div
          className={`grid transition-[grid-template-rows] duration-300 ${
            isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
          }`}
        >
          <div className={`overflow-hidden px-4 pb-4 transition-all duration-300 ${isCollapsed ? "!p-0" : ""}`}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Получаем настройки фильтров (с защитой от undefined)
  const filterSettings = filters?.settings || {};
  const maxBrands = Number(filterSettings.max_brands) || 5;
  const maxAttrValues = Number(filterSettings.max_attribute_values) || 5;
  const showBrandCount = Boolean(filterSettings.show_brand_count);
  const showAttrCount = Boolean(filterSettings.show_attribute_count);
  const showCategoryCount = Boolean(filterSettings.show_category_count);

  // Checkbox item component
  const FilterCheckbox = ({ type = "radio", name, checked, onChange, label, count }) => (
    <label className="flex items-center gap-3 cursor-pointer text-sm py-2 px-2.5 rounded-[10px] transition-all duration-200 hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--text)' }}>
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
      />
      <span
        className={`w-[18px] h-[18px] min-w-[18px] min-h-[18px] flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          type === "checkbox" ? "rounded" : "rounded-full"
        } ${checked ? "bg-[var(--primary)] border-[var(--primary)]" : "border-2"}`}
        style={!checked ? { borderColor: 'var(--border)', background: 'var(--bg)' } : { borderWidth: '2px', borderColor: 'var(--primary)' }}
      >
        {checked && type === "radio" && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
        {checked && type === "checkbox" && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        )}
      </span>
      <span className={`flex-1 leading-snug select-none transition-colors duration-200 ${checked ? "text-[var(--primary)] font-medium" : ""}`}>
        {label}
        {count !== undefined && count !== null && (
          <span className="ml-1.5 text-xs opacity-60">({count})</span>
        )}
      </span>
    </label>
  );

  return (
    <div className="py-5 pb-16">
      <div className="max-w-[1600px] mx-auto px-5">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 py-2.5 pb-5 text-sm flex-wrap" style={{ color: 'var(--muted)' }}>
          <Link to="/" className="text-[var(--primary)] no-underline transition-colors duration-200 hover:underline">
            Главная
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text)' }}>{currentCategory ? currentCategory.name : "Каталог"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[340px_1fr] gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="self-start md:sticky md:top-5">
            <div
              className="rounded-[20px] md:rounded-2xl p-5 md:p-4 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              {/* Filters Header */}
              <div className="flex justify-between items-center gap-3 mb-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="m-0 text-xl font-bold tracking-tight">Фильтры</h3>
                {hasActiveFilters && (
                  <button
                    className="border-none bg-gradient-to-br from-red-100 to-red-200 text-red-600 text-[13px] font-medium cursor-pointer py-2 px-3.5 rounded-[10px] transition-all duration-200 hover:from-red-200 hover:to-red-300 hover:-translate-y-px"
                    onClick={clearFilters}
                    type="button"
                  >
                    Сбросить
                  </button>
                )}
              </div>

              {/* Categories */}
              <FilterGroup
                id="category"
                title="Категория"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                }
              >
                <div className="flex flex-col gap-1">
                  <FilterCheckbox
                    name="category"
                    checked={!selectedCategory}
                    onChange={() => handleCategoryChange("")}
                    label="Все категории"
                  />
                  {filters.categories.map((cat) => (
                    <FilterCheckbox
                      key={cat.id}
                      name="category"
                      checked={selectedCategory === cat.slug}
                      onChange={() => handleCategoryChange(cat.slug)}
                      label={cat.name}
                      count={showCategoryCount ? cat.count : undefined}
                    />
                  ))}
                </div>
              </FilterGroup>

              {/* Brands */}
              {filters.brands.length > 0 && (
                <FilterGroup
                  id="brand"
                  title="Бренд"
                  icon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                  }
                >
                  <div className={`flex flex-col gap-1 ${brandsExpanded ? "max-h-[280px] overflow-y-auto pr-1 -mr-1" : ""}`}>
                    <FilterCheckbox
                      name="brand"
                      checked={!selectedBrand || !brandInList}
                      onChange={() => updateFilters("brand", "")}
                      label="Все бренды"
                    />
                    {(brandsExpanded ? filters.brands : filters.brands.slice(0, maxBrands)).map((brand) => (
                      <FilterCheckbox
                        key={brand.id}
                        name="brand"
                        checked={selectedBrand === brand.slug}
                        onChange={() => updateFilters("brand", brand.slug)}
                        label={brand.name}
                        count={showBrandCount ? brand.count : undefined}
                      />
                    ))}
                  </div>

                  {filters.brands.length > maxBrands && (
                    <button
                      type="button"
                      className={`mt-2 w-full border-none text-[var(--primary)] text-[13px] font-medium cursor-pointer py-2.5 px-3.5 rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 hover:-translate-y-px ${
                        brandsExpanded ? "bg-blue-500/10" : ""
                      }`}
                      style={{ background: brandsExpanded ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)' }}
                      onClick={() => setBrandsExpanded((v) => !v)}
                    >
                      {brandsExpanded ? "Свернуть" : `Показать все (${filters.brands.length})`}
                      <span
                        className={`w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-current transition-transform duration-300 ${
                          brandsExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  )}
                </FilterGroup>
              )}

              {/* Price */}
              <FilterGroup
                id="price"
                title="Цена"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <span
                      className="absolute -top-1.5 left-3 text-[11px] font-medium px-1 z-[1]"
                      style={{ color: 'var(--muted)', background: 'var(--bg)' }}
                    >
                      от
                    </span>
                    <input
                      type="number"
                      placeholder={filters.price_range.min}
                      value={minPrice}
                      onChange={(e) => updateFilters("min_price", e.target.value)}
                      className="w-full py-3 px-3.5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] hover:border-blue-500/40"
                      style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--border)' }}
                    />
                  </div>
                  <span className="font-medium" style={{ color: 'var(--muted)' }}>—</span>
                  <div className="flex-1 relative">
                    <span
                      className="absolute -top-1.5 left-3 text-[11px] font-medium px-1 z-[1]"
                      style={{ color: 'var(--muted)', background: 'var(--bg)' }}
                    >
                      до
                    </span>
                    <input
                      type="number"
                      placeholder={filters.price_range.max}
                      value={maxPrice}
                      onChange={(e) => updateFilters("max_price", e.target.value)}
                      className="w-full py-3 px-3.5 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] hover:border-blue-500/40"
                      style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px solid var(--border)' }}
                    />
                  </div>
                </div>
              </FilterGroup>

              {/* Attributes */}
              {filters.attributes.map((attr) => {
                const isExpanded = !!expandedAttrs[attr.slug];
                const displayValues = isExpanded ? attr.values : attr.values.slice(0, maxAttrValues);

                return (
                  <FilterGroup
                    key={attr.id}
                    id={`attr_${attr.slug}`}
                    title={attr.name}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    }
                  >
                    <div className={`flex flex-col gap-1 ${isExpanded ? "max-h-[280px] overflow-y-auto pr-1 -mr-1" : ""}`}>
                      {displayValues.map((val) => (
                        <FilterCheckbox
                          key={val.id}
                          type="checkbox"
                          checked={isAttributeSelected(attr.slug, val.slug)}
                          onChange={() => updateAttributeFilter(attr.slug, val.slug)}
                          label={val.value}
                          count={showAttrCount ? val.count : undefined}
                        />
                      ))}
                    </div>

                    {attr.values.length > maxAttrValues && (
                      <button
                        type="button"
                        className={`mt-2 w-full border-none text-[var(--primary)] text-[13px] font-medium cursor-pointer py-2.5 px-3.5 rounded-[10px] transition-all duration-200 flex items-center justify-center gap-1.5 hover:-translate-y-px ${
                          isExpanded ? "bg-blue-500/10" : ""
                        }`}
                        style={{ background: isExpanded ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)' }}
                        onClick={() => setExpandedAttrs((p) => ({ ...p, [attr.slug]: !p[attr.slug] }))}
                      >
                        {isExpanded ? "Свернуть" : `Показать все (${attr.values.length})`}
                        <span
                          className={`w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-current transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </FilterGroup>
                );
              })}
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
              <h1 className="m-0 text-[28px] md:text-2xl font-bold">{currentCategory ? currentCategory.name : "Все товары"}</h1>

              <div className="flex items-center gap-4 w-full justify-between sm:w-auto sm:justify-end">
                <span
                  className="text-sm py-2 px-3.5 rounded-[20px]"
                  style={{ color: 'var(--muted)', background: 'var(--bg-secondary)' }}
                >
                  {totalCount} товаров
                </span>

                <div className="relative">
                  <select
                    className="py-2.5 px-3.5 pr-10 rounded-xl text-sm cursor-pointer transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)] hover:border-blue-500/40"
                    style={{
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      border: '2px solid var(--border)',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                    }}
                    value={sortBy}
                    onChange={(e) => updateFilters("ordering", e.target.value)}
                  >
                    <option value="">По умолчанию</option>
                    <option value="price">Сначала дешевле</option>
                    <option value="-price">Сначала дороже</option>
                    <option value="-created_at">Сначала новые</option>
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--muted)' }}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 mb-5 animate-fadeIn">
                {selectedCategory && (
                  <span
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-br from-[var(--primary)] to-blue-700 text-white rounded-[20px] text-[13px] font-medium cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] active:translate-y-0 active:scale-[0.98]"
                    onClick={() => handleCategoryChange("")}
                  >
                    <span className="opacity-75 font-normal mr-0.5">Категория:</span>
                    {currentCategory?.name || selectedCategory} ×
                  </span>
                )}

                {selectedBrand && (
                  <span
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-br from-[var(--primary)] to-blue-700 text-white rounded-[20px] text-[13px] font-medium cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] active:translate-y-0 active:scale-[0.98]"
                    onClick={() => updateFilters("brand", "")}
                  >
                    <span className="opacity-75 font-normal mr-0.5">Бренд:</span>
                    {filters.brands.find((b) => b.slug === selectedBrand)?.name || selectedBrand} ×
                  </span>
                )}

                {minPrice && (
                  <span
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-br from-[var(--primary)] to-blue-700 text-white rounded-[20px] text-[13px] font-medium cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] active:translate-y-0 active:scale-[0.98]"
                    onClick={() => updateFilters("min_price", "")}
                  >
                    <span className="opacity-75 font-normal mr-0.5">Цена:</span>
                    от {minPrice} ₽ ×
                  </span>
                )}

                {maxPrice && (
                  <span
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-br from-[var(--primary)] to-blue-700 text-white rounded-[20px] text-[13px] font-medium cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] active:translate-y-0 active:scale-[0.98]"
                    onClick={() => updateFilters("max_price", "")}
                  >
                    <span className="opacity-75 font-normal mr-0.5">Цена:</span>
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
                        className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-gradient-to-br from-[var(--primary)] to-blue-700 text-white rounded-[20px] text-[13px] font-medium cursor-pointer transition-all duration-200 shadow-[0_2px_8px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(59,130,246,0.4)] active:translate-y-0 active:scale-[0.98]"
                        onClick={() => updateAttributeFilter(attrSlug, valSlug)}
                      >
                        <span className="opacity-75 font-normal mr-0.5">{attrName}:</span>
                        {valName} ×
                      </span>
                    );
                  });
                })}
              </div>
            )}

            <ProductGrid
              products={products}
              loading={loading}
              columns={3}
              onQuickView={setQuickViewSlug}
              showEmpty={false}
            />

            {!loading && products.length === 0 && (
              <div
                className="text-center py-20 px-5 rounded-[20px] animate-fadeIn"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <h3 className="m-0 mb-3 text-[22px]">Товары не найдены</h3>
                <p className="m-0 mb-6" style={{ color: 'var(--muted)' }}>
                  Попробуйте изменить параметры фильтров
                </p>
                <button
                  className="py-3 px-6 bg-[var(--primary)] text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:-translate-y-0.5"
                  onClick={clearFilters}
                  type="button"
                >
                  Сбросить фильтры
                </button>
              </div>
            )}

            {totalCount > 0 && totalPages > 1 && (
              <div
                className="flex items-center justify-center gap-3.5 mt-8 p-5 rounded-2xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <button
                  className="py-2.5 px-5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  disabled={page <= 1}
                  onClick={() => gotoPage(page - 1)}
                  type="button"
                >
                  Назад
                </button>

                <span className="text-sm px-4" style={{ color: 'var(--muted)' }}>
                  Страница {page} из {totalPages}
                </span>

                <button
                  className="py-2.5 px-5 rounded-xl text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  disabled={page >= totalPages}
                  onClick={() => gotoPage(page + 1)}
                  type="button"
                >
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
