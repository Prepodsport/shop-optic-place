import BannerSlider from '../components/home/BannerSlider';
import CategoryTabs from '../components/home/CategoryTabs';
import ProductTabs from '../components/home/ProductTabs';

export default function Home() {
  return (
    <div className="pb-15 md:pb-10">
      {/* Баннер-слайдер */}
      <section className="mt-6 md:mt-4 px-4 md:px-3 sm:px-2">
        <BannerSlider />
      </section>

      {/* Категории товаров */}
      <section className="mt-15 md:mt-10 sm:mt-8">
        <CategoryTabs title="Категории товаров" />
      </section>

      {/* Товары с табами */}
      <section className="mt-15 md:mt-10 sm:mt-8">
        <ProductTabs title="Наши товары" limit={8} />
      </section>
    </div>
  );
}
