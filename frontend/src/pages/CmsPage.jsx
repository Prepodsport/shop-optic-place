import { useEffect, useState } from "react";
import { api } from "../api";

function splitParagraphs(text) {
  const raw = (text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function CmsPage({
  slug,
  variant = "default", // default | compact
}) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    api
      .get(`/pages/${slug}/`)
      .then((res) => {
        if (!alive) return;
        setPage(res.data);
      })
      .catch(() => {
        if (!alive) return;
        setError("Не удалось загрузить страницу");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [slug]);

  const isCompact = variant === "compact";
  const containerMaxWidth = isCompact ? "max-w-[800px]" : "max-w-[1280px]";

  if (loading)
    return (
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className={`${containerMaxWidth} mx-auto`} style={{ color: 'var(--muted)' }}>
          Загрузка...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className={`${containerMaxWidth} mx-auto`} style={{ color: 'var(--muted)' }}>
          {error}
        </div>
      </div>
    );

  if (!page) return null;

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className={`${containerMaxWidth} mx-auto`}>
        <h1
          className="text-[32px] md:text-[26px] font-bold m-0 mb-8 md:mb-10"
          style={{ color: 'var(--text)' }}
        >
          {page.title}
        </h1>

        {(page.sections || []).map((s, idx) => {
          const paragraphs = splitParagraphs(s.body);
          const bullets = Array.isArray(s.bullets) ? s.bullets : [];

          return (
            <section
              key={`${s.order ?? idx}-${idx}`}
              className={
                isCompact
                  ? "mb-8"
                  : "rounded-2xl p-5.5 md:p-4.5 mb-4 border"
              }
              style={
                isCompact
                  ? {}
                  : { background: 'var(--card)', borderColor: 'var(--border)' }
              }
            >
              {s.heading && (
                <h2
                  className={
                    isCompact
                      ? "text-[22px] md:text-[20px] font-semibold m-0 mb-4"
                      : "text-[18px] font-bold m-0 mb-3"
                  }
                  style={{ color: 'var(--text)' }}
                >
                  {s.heading}
                </h2>
              )}

              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="text-[16px] leading-[1.7] m-0 mb-2.5 last:mb-0"
                  style={{ color: 'var(--muted)' }}
                >
                  {p}
                </p>
              ))}

              {bullets.length > 0 && (
                <ul className="mt-2 mb-0 pl-4.5 md:pl-6">
                  {bullets.map((item, i) => (
                    <li
                      key={i}
                      className="text-[16px] leading-[1.7] mb-2 last:mb-0"
                      style={{ color: 'var(--muted)' }}
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
