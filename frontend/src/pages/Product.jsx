import { useEffect, useMemo, useState } from "react";
import { toast } from 'react-hot-toast'
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { normalizeRichText } from "../utils/normalizeRichText.js";
import ProductReviews from "../components/product/ProductReviews.jsx";
import "./Product.css";

export default function Product() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(null);

  // selection
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/catalog/products/${slug}/`);
        if (!mounted) return;

        setProduct(resp.data);
        setSelectedImage(resp.data.main_image_url || null);

        // не автоселектим атрибуты — пользователь выбирает сам
        setSelectedAttributes({});
        setSelectedVariant(null);
      } catch (error) {
        const message = error.response?.data?.detail || 'Ошибка загрузки товара'
        toast.error(message)
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  // gallery
  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [];
    if (product.main_image_url) imgs.push({ id: "main", url: product.main_image_url });
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => imgs.push({ id: img.id, url: img.image_url }));
    }
    return imgs;
  }, [product]);

  // === Variations ============================================================
  const displayAttributes = product?.available_attributes || [];
  const attrOrder = useMemo(() => displayAttributes.map((a) => a.id), [displayAttributes]);

  // Важно: вариативным считаем только если:
  // 1) есть variants
  // 2) есть available_attributes (атрибуты выбора)
  const hasVariants = useMemo(() => {
    return (product?.variants?.length ?? 0) > 0 && attrOrder.length > 0;
  }, [product, attrOrder]);

  // Варианты "в наличии" (stock > 0) + карты значений по атрибутам
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

  /**
   * allowedValueIdsByAttr: Map(attrId -> Set(valueId))
   * Содержит только те значения, которые МОЖНО выбрать с учётом текущих выборов,
   * и которые приводят к вариации В НАЛИЧИИ.
   */
  const allowedValueIdsByAttr = useMemo(() => {
    const res = new Map();
    for (const attrId of attrOrder) res.set(attrId, new Set());

    if (!hasVariants) return res;

    for (const { map } of inStockVariantMaps) {
      for (const attrId of attrOrder) {
        // Проверяем соответствие текущим выборами по ДРУГИМ атрибутам
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

  const hasSelection = useMemo(
    () => Object.keys(selectedAttributes).length > 0,
    [selectedAttributes]
  );

  const clearVariations = () => {
    setSelectedAttributes({});
    setSelectedVariant(null);
  };

  // Если пользователь выбрал значение, которое стало невозможным — удаляем его
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

  // Ищем выбранную вариацию ТОЛЬКО среди "в наличии"
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

  // price
  const currentPrice = useMemo(() => {
    if (selectedVariant?.price) return parseFloat(selectedVariant.price);
    return product ? parseFloat(product.price) : 0;
  }, [selectedVariant, product]);

  const currentOldPrice = useMemo(() => {
    if (selectedVariant?.old_price) return parseFloat(selectedVariant.old_price);
    return product?.old_price ? parseFloat(product.old_price) : null;
  }, [selectedVariant, product]);

  const handleAddToCart = () => {
    if (!product) return;

    // для вариативного товара — запрещаем добавлять без выбранной вариации
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
  };

  // Cart status depends on variant
  const productId = product?.id || null;

  const inCart = !productId
    ? false
    : hasVariants
      ? (selectedVariant ? isInCart(productId, selectedVariant.id) : false)
      : isInCart(productId);

  const canAddToCart = !hasVariants
    ? true
    : Boolean(selectedVariant) && (selectedVariant.stock ?? 0) > 0;

  if (loading) {
    return (
      <div className="container">
        <div className="product-loading">
          <div className="spinner"></div>
          <p>Загрузка товара...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container">
        <div className="product-not-found">
          <h2>Товар не найден</h2>
          <Link to="/catalog" className="btn primary">
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>/</span>
        <Link to="/catalog">Каталог</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link to={`/catalog?category=${product.category.slug}`}>{product.category.name}</Link>
            <span>/</span>
          </>
        )}
        <span className="current">{product.name}</span>
      </div>

      <div className="product-page">
        {/* left: images */}
        <div className="product-gallery">
          <div className="main-image">
            {selectedImage ? (
              <img src={selectedImage} alt={product.name} />
            ) : (
              <div className="no-image">Нет изображения</div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="thumbnail-list">
              {allImages.map((img) => (
                <button
                  key={img.id}
                  className={`thumbnail ${selectedImage === img.url ? "active" : ""}`}
                  onClick={() => setSelectedImage(img.url)}
                  type="button"
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* right: info */}
        <div className="product-info">
          <div className="product-header">
            <h1>{product.name}</h1>
            <div className="product-meta">
              {product.category && (
                <Link to={`/catalog?category=${product.category.slug}`} className="category-link">
                  {product.category.name}
                </Link>
              )}
              {product.brand && (
                <Link to={`/catalog?brand=${product.brand.slug}`} className="brand-link">
                  {product.brand.name}
                </Link>
              )}
            </div>
          </div>

          {/* short description */}
          {product.short_description ? (
            <div
              className="short-description"
              dangerouslySetInnerHTML={{ __html: normalizeRichText(product.short_description) }}
            />
          ) : null}

          {/* price */}
          <div className="product-price-block">
            <div className="current-price">{currentPrice.toLocaleString("ru-RU")} ₽</div>
            {currentOldPrice ? (
              <div className="old-price">{currentOldPrice.toLocaleString("ru-RU")} ₽</div>
            ) : null}
          </div>

          {/* variations - dropdowns, только если реально вариативный товар */}
          {hasVariants ? (
            <div className="variant-selector">
              <div className="variant-toolbar">
                <button
                  className="btn variant-clear"
                  type="button"
                  onClick={clearVariations}
                  disabled={!hasSelection}
                  title="Сбросить выбранные параметры"
                >
                  Очистить
                </button>
              </div>

              {displayAttributes.map((attr) => {
                const allowed = allowedValueIdsByAttr.get(attr.id) || new Set();
                const value = selectedAttributes[attr.id] ? String(selectedAttributes[attr.id]) : "";

                // Если для атрибута нет доступных значений "в наличии" — не показываем селект
                if (!allowed.size) return null;

                return (
                  <div key={attr.id} className="attribute-group">
                    <label className="attribute-label" htmlFor={`attr-${attr.id}`}>
                      {attr.name}
                    </label>

                    <select
                      id={`attr-${attr.id}`}
                      className="attribute-select"
                      value={value}
                      onChange={(e) => handleAttributeSelect(attr.id, e.target.value)}
                    >
                      <option value="">Выберите…</option>

                      {attr.values
                        .filter((v) => allowed.has(v.id)) // НЕ выводим отсутствующие/нет в наличии
                        .map((v) => (
                          <option key={v.id} value={String(v.id)}>
                            {v.value}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* availability */}
          <div className="availability">
            {hasVariants ? (
              selectedVariant ? (
                <span className="in-stock">В наличии</span>
              ) : (
                <span className="select-variant">Выберите параметры</span>
              )
            ) : (
              <span className="in-stock">В наличии</span>
            )}
          </div>

          {/* add to cart */}
          <div className="product-actions">
            <button
              className={`btn add-to-cart ${inCart ? "in-cart" : "primary"}`}
              onClick={handleAddToCart}
              disabled={inCart || !canAddToCart}
              type="button"
            >
              {inCart ? "В корзине" : "Добавить в корзину"}
            </button>
          </div>

          {/* SKU */}
          {(selectedVariant?.sku || product.sku) && (
            <div className="product-sku">
              Артикул: <span>{selectedVariant?.sku || product.sku}</span>
            </div>
          )}
        </div>
      </div>

      {/* description */}
      {product.description ? (
        <div className="product-description">
          <h2>Описание</h2>
          <div
            className="description-content"
            dangerouslySetInnerHTML={{ __html: normalizeRichText(product.description) }}
          />
        </div>
      ) : null}

      {/* attributes table */}
      {Array.isArray(product.attributes) && product.attributes.length > 0 ? (
        <div className="product-attributes">
          <h2>Характеристики</h2>
          <div className="attributes-table">
            {product.attributes.map((attr, idx) => (
              <div key={idx} className="attribute-row">
                <div className="attr-name">{attr.attribute_name}</div>
                <div className="attr-value">{attr.value}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Reviews */}
      <ProductReviews productId={product.id} productSlug={product.slug} />
    </div>
  );
}
