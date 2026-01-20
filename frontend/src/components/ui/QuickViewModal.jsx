import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import { useCart } from "../../context/CartContext.jsx";
import { normalizeRichText } from "../../utils/normalizeRichText.js";
import "./QuickViewModal.css";

export default function QuickViewModal({ productSlug, onClose }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart, isInCart } = useCart();

  // Variant selection state
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

  // === Variations logic (same as Product.jsx) ===
  const displayAttributes = product?.available_attributes || [];
  const attrOrder = useMemo(() => displayAttributes.map((a) => a.id), [displayAttributes]);

  const hasVariants = useMemo(() => {
    return (product?.variants?.length ?? 0) > 0 && attrOrder.length > 0;
  }, [product, attrOrder]);

  // Variants in stock
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

  // Allowed values based on current selection
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

  // Remove invalid selections
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

  // Find selected variant
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

  // Check if any attribute is selected
  const hasAnySelection = Object.keys(selectedAttributes).length > 0;

  // Price calculation
  const currentPrice = useMemo(() => {
    if (selectedVariant?.price) return parseFloat(selectedVariant.price);
    return product ? parseFloat(product.price) : 0;
  }, [selectedVariant, product]);

  const currentOldPrice = useMemo(() => {
    if (selectedVariant?.old_price) return parseFloat(selectedVariant.old_price);
    return product?.old_price ? parseFloat(product.old_price) : null;
  }, [selectedVariant, product]);

  // Price range for display when no variant selected
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

  // Add to cart handler
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

  // Cart status
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
    <div className="quick-view-overlay" onClick={onClose}>
      <div className="quick-view-modal" onClick={(e) => e.stopPropagation()}>
        <button className="quick-view-close" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        {loading ? (
          <div className="quick-view-loading">
            <p>Загрузка...</p>
          </div>
        ) : !product ? (
          <div className="quick-view-loading">
            <p className="muted">Не удалось загрузить товар</p>
          </div>
        ) : (
          <div className="quick-view-content">
            {/* Image */}
            <div className="quick-view-image">
              {product.main_image_url ? (
                <img src={product.main_image_url} alt={product.name} />
              ) : (
                <div className="quick-view-no-image">Нет фото</div>
              )}
            </div>

            {/* Info */}
            <div className="quick-view-info">
              <h2 className="quick-view-title">{product.name}</h2>

              <div className="quick-view-meta">
                {product.category?.name} / {product.brand?.name || "Без бренда"}
              </div>

              {/* Price */}
              <div className="quick-view-price">
                {hasVariants && !selectedVariant && priceRange ? (
                  <span className="quick-view-price-range">
                    {priceRange.min.toLocaleString("ru-RU")} ₽ — {priceRange.max.toLocaleString("ru-RU")} ₽
                  </span>
                ) : (
                  <>
                    <span className="quick-view-current-price">
                      {currentPrice.toLocaleString("ru-RU")} ₽
                    </span>
                    {currentOldPrice && (
                      <span className="quick-view-old-price">
                        {currentOldPrice.toLocaleString("ru-RU")} ₽
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Short description */}
              {(product.short_description || product.description) && (
                <div
                  className="quick-view-description"
                  dangerouslySetInnerHTML={{
                    __html: normalizeRichText(product.short_description || product.description),
                  }}
                />
              )}

              {/* Variant selectors */}
              {hasVariants && (
                <div className="quick-view-variants">
                  <div className="quick-view-variants-header">
                    <span className="quick-view-variants-title">Параметры</span>
                    {hasAnySelection && (
                      <button
                        type="button"
                        className="quick-view-reset-btn"
                        onClick={handleResetVariants}
                      >
                        Сбросить
                      </button>
                    )}
                  </div>
                  {displayAttributes.map((attr) => {
                    const allowed = allowedValueIdsByAttr.get(attr.id) || new Set();
                    const value = selectedAttributes[attr.id] ? String(selectedAttributes[attr.id]) : "";

                    if (!allowed.size) return null;

                    return (
                      <div key={attr.id} className="quick-view-variant-group">
                        <label className="quick-view-variant-label">
                          {attr.name}
                        </label>
                        <select
                          className="quick-view-variant-select"
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
                      </div>
                    );
                  })}

                  {/* Availability status */}
                  <div className="quick-view-availability">
                    {selectedVariant ? (
                      <span className="quick-view-in-stock">В наличии</span>
                    ) : (
                      <span className="quick-view-select-variant">Выберите параметры</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="quick-view-actions">
                <button
                  className={`btn quick-view-cart-btn ${inCart ? "" : "primary"}`}
                  onClick={handleAddToCart}
                  disabled={inCart || !canAddToCart}
                  type="button"
                >
                  {inCart ? "В корзине" : hasVariants && !selectedVariant ? "Выберите параметры" : "В корзину"}
                </button>

                <Link
                  to={`/product/${product.slug}`}
                  className="btn quick-view-link"
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
