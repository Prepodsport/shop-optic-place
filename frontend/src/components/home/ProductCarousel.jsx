import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../product/ProductCard";

export default function ProductCarousel({
  title,
  products = [],
  loading = false,
  viewAllLink,
  viewAllText = "Смотреть все",
  onQuickView,
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, products]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".carousel-card")?.offsetWidth || 300;
    const gap = 24;
    const scrollAmount = (cardWidth + gap) * 2;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Skeleton при загрузке
  if (loading) {
    return (
      <div className="px-4 md:px-3 sm:px-2">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded-lg animate-shimmer" />
            <div className="h-6 w-32 bg-[var(--bg-secondary)] rounded-lg animate-shimmer" />
          </div>
          <div className="flex gap-6 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[85%] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)]"
              >
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-4">
                  <div className="aspect-square bg-[var(--bg-secondary)] rounded-xl animate-shimmer mb-4" />
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-[var(--bg-secondary)] rounded animate-shimmer" />
                    <div className="h-5 w-full bg-[var(--bg-secondary)] rounded animate-shimmer" />
                    <div className="h-5 w-3/4 bg-[var(--bg-secondary)] rounded animate-shimmer" />
                    <div className="h-6 w-24 bg-[var(--bg-secondary)] rounded animate-shimmer mt-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="px-4 md:px-3 sm:px-2">
      <div className="max-w-[1600px] mx-auto">
        {/* Заголовок и навигация */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl md:text-xl font-bold text-[var(--text)]">
            {title}
          </h2>
          <div className="flex items-center gap-3">
            {viewAllLink && (
              <Link
                to={viewAllLink}
                className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium text-sm flex items-center gap-1 group"
              >
                {viewAllText}
                <svg
                  className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
            {/* Стрелки навигации - только на desktop */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={`w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center transition-all
                  ${
                    canScrollLeft
                      ? "bg-[var(--card)] hover:bg-[var(--bg-secondary)] hover:border-[var(--primary)] text-[var(--text)]"
                      : "bg-[var(--bg-secondary)] text-[var(--muted)] cursor-not-allowed"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={`w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center transition-all
                  ${
                    canScrollRight
                      ? "bg-[var(--card)] hover:bg-[var(--bg-secondary)] hover:border-[var(--primary)] text-[var(--text)]"
                      : "bg-[var(--bg-secondary)] text-[var(--muted)] cursor-not-allowed"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Карусель */}
        <div className="relative">
          {/* Стрелки по бокам - только на большом десктопе */}
          <button
            onClick={() => scroll("left")}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-12 h-12 rounded-full
              bg-white dark:bg-gray-800 shadow-lg border border-[var(--border)]
              flex items-center justify-center transition-all hover:scale-110
              xl:hidden
              ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg className="w-6 h-6 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-12 h-12 rounded-full
              bg-white dark:bg-gray-800 shadow-lg border border-[var(--border)]
              flex items-center justify-center transition-all hover:scale-110
              xl:hidden
              ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <svg className="w-6 h-6 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Scroll container */}
          <div
            ref={scrollRef}
            className="flex gap-6 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 -mb-2"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="carousel-card flex-shrink-0 w-[85%] sm:w-[calc(50%-12px)] md:w-[calc(33.333%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)]"
                style={{ scrollSnapAlign: "start" }}
              >
                <ProductCard product={product} onQuickView={onQuickView} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
