import { useEffect, useState } from "react";
import { api } from "../api.js";

function splitParagraphs(text) {
  const raw = (text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseSpecialLine(line) {
  const t = (line || "").trim();
  if (!t) return { type: "empty" };

  // note: ...
  if (/^note\s*:/i.test(t)) {
    return { type: "note", text: t.replace(/^note\s*:\s*/i, "") };
  }

  // tel/mailto/http with optional label after |
  const parts = t.split("|").map((x) => x.trim());
  const href = parts[0];
  const label = parts[1] || "";

  if (/^(tel:|mailto:|https?:\/\/)/i.test(href)) {
    return { type: "link", href, label: label || href.replace(/^(tel:|mailto:)/i, "") };
  }

  return { type: "text", text: t };
}

export default function Contacts() {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Форма справа (пока просто UI)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [formStatus, setFormStatus] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    api
      .get("/pages/contacts/")
      .then((res) => {
        if (!alive) return;
        setPage(res.data);
      })
      .catch(() => {
        if (!alive) return;
        setError("Не удалось загрузить контакты");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    // позже подключим к API, сейчас просто подтверждение
    setFormStatus("Сообщение отправлено (демо). Позже подключим обработчик на бекенде.");
    setTimeout(() => setFormStatus(""), 4000);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1280px] mx-auto">
        <h1
          className="text-[32px] md:text-[26px] font-bold m-0 mb-10"
          style={{ color: 'var(--text)' }}
        >
          {page?.title || "Контакты"}
        </h1>

        {loading ? (
          <div className="text-[15px]" style={{ color: 'var(--muted)' }}>Загрузка...</div>
        ) : error ? (
          <div className="text-[15px]" style={{ color: 'var(--muted)' }}>{error}</div>
        ) : !page ? null : (
          <div className="grid grid-cols-2 md:grid-cols-2 gap-12 md:gap-8 items-start">
            {/* Левая колонка — CMS */}
            <div className="flex flex-col gap-6">
              {(page.sections || []).map((s, idx) => {
                const paragraphs = splitParagraphs(s.body);
                const bullets = Array.isArray(s.bullets) ? s.bullets : [];

                return (
                  <section
                    key={`${s.order ?? idx}-${idx}`}
                    className="rounded-2xl p-5 md:p-5.5 border"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                  >
                    {s.heading && (
                      <h2
                        className="text-[18px] font-bold m-0 mb-3"
                        style={{ color: 'var(--text)' }}
                      >
                        {s.heading}
                      </h2>
                    )}

                    {paragraphs.map((p, i) => {
                      const parsed = parseSpecialLine(p);

                      if (parsed.type === "note") {
                        return (
                          <p
                            key={i}
                            className="text-[14px] m-0 mb-2"
                            style={{ color: 'var(--muted)' }}
                          >
                            {parsed.text}
                          </p>
                        );
                      }

                      if (parsed.type === "link") {
                        return (
                          <a
                            key={i}
                            href={parsed.href}
                            className="inline-block text-[18px] font-semibold no-underline m-0 mb-2 hover:underline"
                            style={{ color: 'var(--primary)' }}
                          >
                            {parsed.label}
                          </a>
                        );
                      }

                      return (
                        <p
                          key={i}
                          className="text-[16px] leading-relaxed m-0 mb-2"
                          style={{ color: 'var(--text)' }}
                        >
                          {parsed.text || p}
                        </p>
                      );
                    })}

                    {bullets.length > 0 && (
                      <ul className="mt-2 mb-0 pl-4.5">
                        {bullets.map((b, i) => {
                          const parsed = parseSpecialLine(b);

                          if (parsed.type === "note") {
                            return (
                              <li
                                key={i}
                                className="text-[14px] mb-2"
                                style={{ color: 'var(--muted)' }}
                              >
                                {parsed.text}
                              </li>
                            );
                          }

                          if (parsed.type === "link") {
                            return (
                              <li key={i} className="mb-2">
                                <a
                                  href={parsed.href}
                                  className="font-semibold no-underline hover:underline"
                                  style={{ color: 'var(--primary)' }}
                                >
                                  {parsed.label}
                                </a>
                              </li>
                            );
                          }

                          return (
                            <li
                              key={i}
                              className="text-[16px] mb-2"
                              style={{ color: 'var(--text)' }}
                            >
                              {parsed.text || b}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>

            {/* Правая колонка — форма */}
            <div
              className="rounded-2xl p-8 md:p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2
                className="text-[20px] font-bold m-0 mb-6"
                style={{ color: 'var(--text)' }}
              >
                Напишите нам
              </h2>

              <form className="flex flex-col gap-5" onSubmit={onSubmit}>
                <div className="flex flex-col gap-2">
                  <label
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    placeholder="Иван Иванов"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="py-3 px-4 rounded-xl border text-[15px] transition-all duration-200 resize-y focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="ivan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="py-3 px-4 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-[14px] font-semibold"
                    style={{ color: 'var(--text)' }}
                  >
                    Сообщение
                  </label>
                  <textarea
                    rows="4"
                    placeholder="Ваш вопрос или сообщение..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="py-3 px-4 rounded-xl border text-[15px] transition-all duration-200 resize-y font-[inherit] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                <button
                  type="submit"
                  className="py-3.5 px-6 bg-[var(--primary)] text-white rounded-xl text-[16px] font-bold cursor-pointer border-none transition-colors duration-200 hover:bg-blue-700"
                >
                  Отправить
                </button>

                {formStatus && (
                  <div
                    className="mt-0.5 text-[14px] leading-relaxed"
                    style={{ color: 'var(--muted)' }}
                  >
                    {formStatus}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
