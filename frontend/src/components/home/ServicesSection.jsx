import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function ServicesSection() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get("/content/services/");
        setServices(response.data.results || response.data || []);
      } catch (error) {
        console.error("Ошибка загрузки услуг:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Skeleton при загрузке
  if (loading) {
    return (
      <div className="px-4 md:px-3 sm:px-2">
        <div className="max-w-[1600px] mx-auto">
          <div className="h-8 w-32 bg-[var(--bg-secondary)] rounded-lg animate-shimmer mb-6" />
          <div className="grid grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-5 md:gap-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5"
              >
                <div className="w-12 h-12 bg-[var(--bg-secondary)] rounded-xl animate-shimmer mb-4" />
                <div className="h-5 w-3/4 bg-[var(--bg-secondary)] rounded animate-shimmer mb-2" />
                <div className="h-4 w-full bg-[var(--bg-secondary)] rounded animate-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!services.length) return null;

  return (
    <div className="px-4 md:px-3 sm:px-2">
      <div className="max-w-[1600px] mx-auto">
        <h2 className="text-2xl md:text-xl font-bold text-[var(--text)] mb-6">
          Услуги
        </h2>
        <div className="grid grid-cols-5 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-5 md:gap-4">
          {services.map((service) => {
            const CardWrapper = service.link ? Link : "div";
            const cardProps = service.link
              ? { to: service.link }
              : {};

            return (
              <CardWrapper
                key={service.id}
                {...cardProps}
                className="group bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5
                  transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--primary)]"
              >
                {/* Иконка или изображение */}
                {service.image_url ? (
                  <div className="w-12 h-12 mb-4 overflow-hidden rounded-xl">
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : service.icon ? (
                  <div
                    className="w-12 h-12 mb-4 flex items-center justify-center bg-[var(--bg-secondary)]
                      rounded-xl text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors"
                    dangerouslySetInnerHTML={{ __html: service.icon }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 mb-4 flex items-center justify-center bg-[var(--bg-secondary)]
                      rounded-xl text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-white transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                )}

                {/* Название */}
                <h3 className="font-semibold text-[var(--text)] mb-1 line-clamp-2">
                  {service.title}
                </h3>

                {/* Описание */}
                {service.description && (
                  <p className="text-sm text-[var(--muted)] line-clamp-2">
                    {service.description}
                  </p>
                )}
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </div>
  );
}
