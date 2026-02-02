import BannerSlider from '../components/home/BannerSlider';
import BestsellersSection from '../components/home/BestsellersSection';
import SaleSection from '../components/home/SaleSection';
import CategoryTabs from '../components/home/CategoryTabs';
import ServicesSection from '../components/home/ServicesSection';
import NewArrivalsSection from '../components/home/NewArrivalsSection';
import TopBrandsSection from '../components/home/TopBrandsSection';

export default function Home() {
  return (
    <div className="pb-15 md:pb-10">
      {/* 1. Баннер-слайдер */}
      <section className="mt-6 md:mt-4 px-4 md:px-3 sm:px-2">
        <BannerSlider />
      </section>

      {/* 4. Категории товаров */}
      <section className="mt-12 md:mt-8">
        <CategoryTabs title="Категории товаров" />
      </section>

      {/* 2. Хиты продаж */}
      <section className="mt-12 md:mt-8">
        <BestsellersSection />
      </section>

      {/* 3. Распродажа */}
      <section className="mt-12 md:mt-8">
        <SaleSection />
      </section>

      {/* 5. Услуги */}
      <section className="mt-12 md:mt-8">
        <ServicesSection />
      </section>

      {/* 6. Новинки */}
      <section className="mt-12 md:mt-8">
        <NewArrivalsSection />
      </section>

      {/* 7. Топ-бренды */}
      <section className="mt-12 md:mt-8">
        <TopBrandsSection />
      </section>
    </div>
  );
}
