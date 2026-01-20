import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import './BannerSlider.css';

export default function BannerSlider() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    api.get('/content/banners/')
      .then(res => {
        setBanners(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Ошибка загрузки баннеров:', err);
        setLoading(false);
      });
  }, []);

  const goToNext = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrev = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Автопереключение слайдов
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, goToNext]);

  if (loading) {
    return (
      <div className="banner-slider">
        <div className="banner-slider__skeleton" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div
      className="banner-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="banner-slider__track">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`banner-slider__slide ${index === currentIndex ? 'active' : ''}`}
          >
            <picture>
              <source
                media="(max-width: 768px)"
                srcSet={banner.image_mobile_url || banner.image_url}
              />
              <img
                src={banner.image_url}
                alt={banner.title}
                className="banner-slider__image"
              />
            </picture>

            <div className="banner-slider__content">
              <h2 className="banner-slider__title">{banner.title}</h2>
              {banner.subtitle && (
                <p className="banner-slider__subtitle">{banner.subtitle}</p>
              )}
              {banner.link && (
                <Link to={banner.link} className="banner-slider__btn">
                  {banner.button_text || 'Подробнее'}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Навигационные стрелки */}
      {banners.length > 1 && (
        <>
          <button
            className="banner-slider__arrow banner-slider__arrow--prev"
            onClick={goToPrev}
            aria-label="Предыдущий слайд"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="banner-slider__arrow banner-slider__arrow--next"
            onClick={goToNext}
            aria-label="Следующий слайд"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Индикаторы */}
      {banners.length > 1 && (
        <div className="banner-slider__dots">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`banner-slider__dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
