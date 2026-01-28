import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useCart } from "../../context/CartContext.jsx";
import { normalizeRichText } from "../../utils/normalizeRichText.js";

export default function QuickViewModal({ productSlug, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, isInCart } = useCart();

  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/catalog/products/${productSlug}/`);
      setProduct(resp.data);
      setSelectedAttributes({});
      setSelectedVariant(null);
    } catch (error) {
      console.error("Ошибка загрузки товара:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productSlug]);

  useEffect(() => {
    if (productSlug) fetchProduct();
  }, [productSlug, fetchProduct]);

  const displayAttributes = product?.available_attributes || [];
  const attrOrder = useMemo(() => displayAttributes.map((a) => a.id), [displayAttributes]);

  const hasVariants = useMemo(() => {
    return (product?.variants?.length ?? 0) > 0 && attrOrder.length > 0;
  }, [product, attrOrder]);

  const inStockVariantMaps = useMemo(() => {
    if (!hasVariants) return [];
    const list = [];

    for (const v of product?.variants || []) {
      if ((v.stock ?? 0) <= 0) continue;

      const m = new Map();
      for (const av of v.attribute_values || []) {
        m.set(av.attribute_id, av.id);
      }

      list.push({ variant: v, map: m });
    }

    return list;
  }, [hasVariants, product]);

  const allowedValueIdsByAttr = useMemo(() => {
    const res = new Map();
    for (const attrId of attrOrder) res.set(attrId, new Set());

    if (!hasVariants) return res;

    for (const { map } of inStockVariantMaps) {
      for (const attrId of attrOrder) {
        let ok = true;
        for (const otherId of attrOrder) {
          if (otherId === attrId) continue;
          const sel = selectedAttributes[otherId];
          if (sel && map.get(otherId) !== sel) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const valId = map.get(attrId);
        if (valId) res.get(attrId).add(valId);
      }
    }

    return res;
  }, [hasVariants, inStockVariantMaps, attrOrder, selectedAttributes]);

  useEffect(() => {
    if (!hasVariants) return;

    setSelectedAttributes((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const attrId of attrOrder) {
        const sel = next[attrId];
        if (!sel) continue;

        const allowed = allowedValueIdsByAttr.get(attrId);
        if (allowed && !allowed.has(sel)) {
          delete next[attrId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [hasVariants, allowedValueIdsByAttr, attrOrder]);

  const isSelectionComplete = useMemo(() => {
    if (!hasVariants) return true;
    return attrOrder.every((attrId) => Boolean(selectedAttributes[attrId]));
  }, [hasVariants, attrOrder, selectedAttributes]);

  useEffect(() => {
    if (!hasVariants) {
      setSelectedVariant(null);
      return;
    }

    if (!isSelectionComplete) {
      setSelectedVariant(null);
      return;
    }

    const found = inStockVariantMaps.find(({ map }) => {
      for (const attrId of attrOrder) {
        if (map.get(attrId) !== selectedAttributes[attrId]) return false;
      }
      return true;
    });

    setSelectedVariant(found ? found.variant : null);
  }, [hasVariants, isSelectionComplete, inStockVariantMaps, attrOrder, selectedAttributes]);

  const handleAttributeSelect = (attrId, rawValueId) => {
    const valueId = rawValueId ? Number(rawValueId) : null;

    setSelectedAttributes((prev) => {
      const next = { ...prev };

      if (!valueId || Number.isNaN(valueId)) {
        delete next[attrId];
      } else {
        next[attrId] = valueId;
      }

      return next;
    });
  };

  const handleResetVariants = () => {
    setSelectedAttributes({});
    setSelectedVariant(null);
  };

  const hasAnySelection = Object.keys(selectedAttributes).length > 0;

  const currentPrice = useMemo(() => {
    if (selectedVariant?.price) return parseFloat(selectedVariant.price);
    return product ? parseFloat(product.price) : 0;
  }, [selectedVariant, product]);

  const currentOldPrice = useMemo(() => {
    if (selectedVariant?.old_price) return parseFloat(selectedVariant.old_price);
    return product?.old_price ? parseFloat(product.old_price) : null;
  }, [selectedVariant, product]);

  const priceRange = useMemo(() => {
    if (!hasVariants || !product?.variants?.length) return null;

    let min = null;
    let max = null;

    for (const v of product.variants || []) {
      if ((v.stock ?? 0) <= 0) continue;
      const p = parseFloat(v.price ?? product.price);
      if (Number.isFinite(p)) {
        if (min === null || p < min) min = p;
        if (max === null || p > max) max = p;
      }
    }

    if (min !== null && max !== null && min !== max) {
      return { min, max };
    }
    return null;
  }, [hasVariants, product]);

  const handleAddToCart = () => {
    if (!product) return;

    if (hasVariants && !selectedVariant) return;

    const variantLabel = selectedVariant?.attribute_values?.length
      ? selectedVariant.attribute_values
          .map((av) => `${av.attribute_name}: ${av.value}`)
          .join(", ")
      : null;

    const cartItem = {
      ...product,
      variantId: selectedVariant?.id || null,
      variantLabel,
      selectedAttributes,
      price: currentPrice,
      old_price: currentOldPrice,
      image: product.main_image_url || null,
    };

    addToCart(cartItem);
    onClose();
  };

  const productId = product?.id || null;

  const inCart = !productId
    ? false
    : hasVariants
      ? (selectedVariant ? isInCart(productId, selectedVariant.id) : false)
      : isInCart(productId);

  const canAddToCart = !hasVariants
    ? true
    : Boolean(selectedVariant) && (selectedVariant.stock ?? 0) > 0;

  if (!productSlug) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
      onClick={onClose}
    >
      <div
        className="rounded-2xl max-w-[900px] w-full max-h-[90vh] overflow-auto relative"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 bg-transparent border-none text-[28px] cursor-pointer z-10 leading-none w-9 h-9 flex items-center justify-center rounded-lg transition-colors duration-200 hover:bg-[var(--bg-secondary)]"
          style={{ color: "var(--text)" }}
          onClick={onClose}
          aria-label="Закрыть"
        >
          ×
        </button>

        {loading ? (
          <div className="py-16 px-5 text-center">
            <p>Загрузка...</p>
          </div>
        ) : !product ? (
          <div className="py-16 px-5 text-center">
            <p style={{ color: "var(--muted)" }}>Не удалось загрузить товар</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-6">
            {/* Image */}
            <div
              className="rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden flex items-center justify-center p-6 md:p-8"
              style={{ background: "var(--bg-secondary)" }}
            >
              {product.main_image_url ? (
                <img
                  src={product.main_image_url}
                  alt={product.name}
                  className="w-full max-h-[280px] md:max-h-[400px] object-contain"
                />
              ) : (
                <div className="h-[200px] md:h-[300px] flex items-center justify-center text-base" style={{ color: "var(--muted)" }}>
                  Нет фото
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col p-5 md:p-6 md:pl-0">
              <h2 className="m-0 mb-2.5 text-[22px] font-bold leading-tight" style={{ color: "var(--text)" }}>
                {product.name}
              </h2>

              <div className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                {product.category?.name} • {product.brand?.name || "Без бренда"}
              </div>

              {/* Price */}
              <div className="mb-4">
                {hasVariants && !selectedVariant && priceRange ? (
                  <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                    {priceRange.min.toLocaleString("ru-RU")} ₽ — {priceRange.max.toLocaleString("ru-RU")} ₽
                  </span>
                ) : (
                  <>
                    <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                      {currentPrice.toLocaleString("ru-RU")} ₽
                    </span>
                    {currentOldPrice && (
                      <span className="text-base line-through ml-3" style={{ color: "var(--muted)" }}>
                        {currentOldPrice.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              {(product.short_description || product.description) && (
                <div
                  className="text-sm leading-relaxed mb-5 max-h-[120px] overflow-hidden [&_p]:m-0 [&_p]:mb-2.5 [&_ul]:m-0 [&_ul]:pl-5"
                  style={{ color: "var(--text)" }}
                  dangerouslySetInnerHTML={{
                    __html: normalizeRichText(product.short_description || product.description),
                  }}
                />
              )}

              {/* Variants */}
              {hasVariants && (
                <div className="flex flex-col gap-3 mb-4 p-4 rounded-xl" style={{ background: "var(--bg-secondary)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                      Параметры
                    </span>
                    {hasAnySelection && (
                      <button
                        type="button"
                        className="py-1.5 px-3 text-[13px] bg-transparent rounded-md cursor-pointer transition-colors duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                        style={{ color: "var(--muted)", border: "1px solid var(--border)" }}
                        onClick={handleResetVariants}
                      >
                        Сбросить
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayAttributes.map((attr) => {
                      const allowed = allowedValueIdsByAttr.get(attr.id) || new Set();
                      const value = selectedAttributes[attr.id] ? String(selectedAttributes[attr.id]) : "";

                      if (!allowed.size) return null;

                      return (
                        <div key={attr.id} className="flex flex-col gap-1.5">
                          <label className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                            {attr.name}
                          </label>
                          <div className="relative">
                            <select
                              className="w-full py-2.5 px-3 pr-9 rounded-lg text-sm cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                              style={{
                                background: "var(--bg)",
                                color: "var(--text)",
                                border: "2px solid var(--border)",
                                WebkitAppearance: "none",
                                MozAppearance: "none",
                                appearance: "none",
                              }}
                              value={value}
                              onChange={(e) => handleAttributeSelect(attr.id, e.target.value)}
                            >
                              <option value="">Выберите…</option>
                              {attr.values
                                .filter((v) => allowed.has(v.id))
                                .map((v) => (
                                  <option key={v.id} value={String(v.id)}>
                                    {v.value}
                                  </option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-sm mt-1">
                    {selectedVariant ? (
                      <span className="text-green-500 font-medium before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-green-500 before:rounded-full before:mr-2">
                        В наличии
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>Выберите параметры</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-auto flex-wrap">
                <button
                  className={`flex-1 min-w-[160px] py-3.5 px-5 text-[15px] font-semibold rounded-[10px] cursor-pointer transition-colors duration-200 ${
                    inCart ? "border" : "bg-[var(--primary)] text-white border-transparent hover:bg-[var(--primary-hover)]"
                  }`}
                  style={
                    inCart
                      ? { background: "var(--card)", color: "var(--text)", border: "1px solid var(--border)" }
                      : {}
                  }
                  onClick={handleAddToCart}
                  disabled={inCart || !canAddToCart}
                  type="button"
                >
                  {inCart ? "В корзине" : hasVariants && !selectedVariant ? "Выберите параметры" : "В корзину"}
                </button>

                <Link
                  to={`/product/${product.slug}`}
                  className="py-3.5 px-5 no-underline text-[15px] rounded-lg transition-colors duration-200 hover:border-[var(--primary)] hover:no-underline"
                  style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  onClick={onClose}
                >
                  Подробнее
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
