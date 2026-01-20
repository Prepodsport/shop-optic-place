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
  className = "",
  containerClass = "",
  titleClass = "",
  sectionClass = "",
  listClass = "",
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

  if (loading)
    return (
      <div className={className}>
        <div className={containerClass}>Загрузка...</div>
      </div>
    );

  if (error)
    return (
      <div className={className}>
        <div className={containerClass}>{error}</div>
      </div>
    );

  if (!page) return null;

  return (
    <div className={className}>
      <div className={containerClass}>
        <h1 className={titleClass}>{page.title}</h1>

        {(page.sections || []).map((s, idx) => {
          const paragraphs = splitParagraphs(s.body);
          const bullets = Array.isArray(s.bullets) ? s.bullets : [];

          return (
            <section className={sectionClass} key={`${s.order ?? idx}-${idx}`}>
              {s.heading ? <h2>{s.heading}</h2> : null}

              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              {bullets.length ? (
                <ul className={listClass}>
                  {bullets.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
