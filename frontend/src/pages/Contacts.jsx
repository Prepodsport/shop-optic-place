import { useEffect, useState } from "react";
import { api } from "../api.js";
import "./Contacts.css";

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
    <div className="contacts">
      <div className="contacts__container">
        <h1 className="contacts__title">{page?.title || "Контакты"}</h1>

        {loading ? (
          <div className="contacts__loading">Загрузка...</div>
        ) : error ? (
          <div className="contacts__error">{error}</div>
        ) : !page ? null : (
          <div className="contacts__grid">
            {/* Левая колонка — CMS */}
            <div className="contacts__info">
              {(page.sections || []).map((s, idx) => {
                const paragraphs = splitParagraphs(s.body);
                const bullets = Array.isArray(s.bullets) ? s.bullets : [];

                return (
                  <section className="contacts__section" key={`${s.order ?? idx}-${idx}`}>
                    {s.heading ? <h2>{s.heading}</h2> : null}

                    {paragraphs.map((p, i) => {
                      const parsed = parseSpecialLine(p);

                      if (parsed.type === "note") {
                        return (
                          <p key={i} className="contacts__note">
                            {parsed.text}
                          </p>
                        );
                      }

                      if (parsed.type === "link") {
                        return (
                          <a key={i} href={parsed.href} className="contacts__link">
                            {parsed.label}
                          </a>
                        );
                      }

                      return (
                        <p key={i} className="contacts__text">
                          {parsed.text || p}
                        </p>
                      );
                    })}

                    {bullets.length ? (
                      <ul className="contacts__list">
                        {bullets.map((b, i) => {
                          const parsed = parseSpecialLine(b);

                          if (parsed.type === "note") {
                            return (
                              <li key={i} className="contacts__note">
                                {parsed.text}
                              </li>
                            );
                          }

                          if (parsed.type === "link") {
                            return (
                              <li key={i}>
                                <a href={parsed.href} className="contacts__link">
                                  {parsed.label}
                                </a>
                              </li>
                            );
                          }

                          return <li key={i}>{parsed.text || b}</li>;
                        })}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>

            {/* Правая колонка — форма */}
            <div className="contacts__form-wrap">
              <h2>Напишите нам</h2>

              <form className="contacts__form" onSubmit={onSubmit}>
                <div className="contacts__field">
                  <label>Ваше имя</label>
                  <input
                    type="text"
                    placeholder="Иван Иванов"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="contacts__field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="ivan@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="contacts__field">
                  <label>Сообщение</label>
                  <textarea
                    rows="4"
                    placeholder="Ваш вопрос или сообщение..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="contacts__submit">
                  Отправить
                </button>

                {formStatus ? <div className="contacts__form-status">{formStatus}</div> : null}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
