import BannerSlider from '../components/home/BannerSlider';
import CategoryTabs from '../components/home/CategoryTabs';
import ProductTabs from '../components/home/ProductTabs';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      {/* Баннер-слайдер */}
      <section className="home__section home__section--banner">
        <BannerSlider />
      </section>

      {/* Категории товаров */}
      <section className="home__section">
        <CategoryTabs title="Категории товаров" />
      </section>

      {/* Товары с табами */}
      <section className="home__section">
        <ProductTabs title="Наши товары" limit={8} />
      </section>
    </div>
  );
}
