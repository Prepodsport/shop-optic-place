import { useState, useEffect } from "react";
import { api, getTokens, getErrorMessage } from "../../api.js";
import "./ProductReviews.css";

export default function ProductReviews({ productId, productSlug }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    total_count: 0,
    average_rating: null,
    rating_distribution: {},
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // { [reviewId]: true|false|null } true=Да, false=Нет, null/undefined=не голосовал
  const [voteByReviewId, setVoteByReviewId] = useState({});
  // { [reviewId]: true|false|null } "committed" = что было реально отправлено на бэк (чтобы не накручивать повторно)
  const [committedVoteByReviewId, setCommittedVoteByReviewId] = useState({});
  // { [reviewId]: true } пока идет запрос
  const [pendingVote, setPendingVote] = useState({});

  const VOTES_LS_KEY = "review_votes_v1"; // { [reviewId]: { v: true|false, c: true|false } } (v=current, c=committed)

  const isLoggedIn = Boolean(getTokens().access);

  const [formData, setFormData] = useState({
    author_name: "",
    rating: 0,
    title: "",
    text: "",
    advantages: "",
    disadvantages: "",
  });

  function loadVotesFromStorage() {
    try {
      const raw = JSON.parse(localStorage.getItem(VOTES_LS_KEY) || "{}");
      const current = {};
      const committed = {};

      for (const [id, val] of Object.entries(raw)) {
        // backward compatibility: если вдруг лежал boolean
        if (val === true || val === false) {
          current[id] = val;
          committed[id] = val;
          continue;
        }

        if (val && typeof val === "object") {
          if (val.v === true || val.v === false) current[id] = val.v;
          if (val.c === true || val.c === false) committed[id] = val.c;
        }
      }

      return { current, committed };
    } catch {
      return { current: {}, committed: {} };
    }
  }

  function saveVoteToStorage(reviewId, currentVote, committedVote) {
    const id = String(reviewId);
    let raw = {};
    try {
      raw = JSON.parse(localStorage.getItem(VOTES_LS_KEY) || "{}") || {};
    } catch {
      raw = {};
    }

    const next = {
      v: currentVote === true || currentVote === false ? currentVote : null,
      c: committedVote === true || committedVote === false ? committedVote : null,
    };

    // если вообще ничего нет — удаляем ключ
    if (next.v === null && next.c === null) {
      delete raw[id];
    } else {
      raw[id] = next;
    }

    localStorage.setItem(VOTES_LS_KEY, JSON.stringify(raw));
  }

  function applyVoteOverlayToCounts(review, committedVote, currentVote) {
    // Если не было committed или нет текущего голоса — ничего не трогаем
    if (!(committedVote === true || committedVote === false)) return review;
    if (!(currentVote === true || currentVote === false)) return review;
    if (committedVote === currentVote) return review;

    let helpful = Number(review.helpful_count || 0);
    let notHelpful = Number(review.not_helpful_count || 0);

    // Убираем committed (потому что серверные счетчики уже его содержат)
    if (committedVote === true) helpful = Math.max(0, helpful - 1);
    if (committedVote === false) notHelpful = Math.max(0, notHelpful - 1);

    // Добавляем текущий (локальный) выбор
    if (currentVote === true) helpful += 1;
    if (currentVote === false) notHelpful += 1;

    return { ...review, helpful_count: helpful, not_helpful_count: notHelpful };
  }

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, productSlug]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const params = productId ? { product_id: productId } : { product_slug: productSlug };
      const resp = await api.get("/catalog/reviews/product_reviews/", { params });

      const list = resp.data.reviews || [];

      // 1) читаем localStorage
      const saved = loadVotesFromStorage();
      setVoteByReviewId(saved.current);
      setCommittedVoteByReviewId(saved.committed);

      // 2) накладываем локальный выбор (если он отличается от committed) на счетчики, чтобы после refresh было “как было”
      const adjusted = list.map((r) =>
        applyVoteOverlayToCounts(r, saved.committed[String(r.id)], saved.current[String(r.id)])
      );

      setReviews(adjusted);

      setStats({
        total_count: resp.data.total_count || 0,
        average_rating: resp.data.average_rating,
        rating_distribution: resp.data.rating_distribution || {},
      });
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (!productId) {
        setError("Не удалось определить товар (productId пустой).");
        return;
      }

      if (!formData.rating || formData.rating === 0) {
        setError("Пожалуйста, выберите оценку.");
        return;
      }

      const payload = {
        product: productId,
        rating: Number(formData.rating),
        title: formData.title,
        text: formData.text,
        advantages: formData.advantages,
        disadvantages: formData.disadvantages,
        ...(!isLoggedIn ? { author_name: formData.author_name } : {}),
      };

      await api.post("/catalog/reviews/", payload);

      setSuccess("Спасибо за отзыв! Он появится после модерации.");
      setFormData({
        author_name: "",
        rating: 0,
        title: "",
        text: "",
        advantages: "",
        disadvantages: "",
      });
      setShowForm(false);
    } catch (err) {
      console.error("Review create error:", err.response?.status, err.response?.data);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ✅ ЛОГИКА ГОЛОСОВАНИЯ:
  // - первый голос отправляем на бэк и фиксируем committed
  // - переключение после первого голоса делаем только локально (без бэка), чтобы не накручивать
  async function handleHelpful(reviewId, nextVote) {
    // nextVote: true => "Да", false => "Нет"
    if (pendingVote[reviewId]) return;

    const id = String(reviewId);
    const prevVote = voteByReviewId[id] ?? null;
    const committed = committedVoteByReviewId[id] ?? null;

    // повторный клик по тому же варианту — ничего
    if (prevVote === nextVote) return;

    setPendingVote((prev) => ({ ...prev, [reviewId]: true }));

    // оптимистично обновляем vote
    setVoteByReviewId((prev) => ({ ...prev, [id]: nextVote }));

    // оптимистично обновляем счетчики
    setReviews((prev) =>
      prev.map((r) => {
        if (String(r.id) !== id) return r;

        let helpful = Number(r.helpful_count || 0);
        let notHelpful = Number(r.not_helpful_count || 0);

        // снимаем прошлый голос (локальный)
        if (prevVote === true) helpful = Math.max(0, helpful - 1);
        if (prevVote === false) notHelpful = Math.max(0, notHelpful - 1);

        // ставим новый (локальный)
        if (nextVote === true) helpful += 1;
        if (nextVote === false) notHelpful += 1;

        return { ...r, helpful_count: helpful, not_helpful_count: notHelpful };
      })
    );

    try {
      // если committed уже есть — это переключение: НЕ шлем на бэк, иначе он накрутит
      if (committed === true || committed === false) {
        saveVoteToStorage(reviewId, nextVote, committed);
        return;
      }

      // первый голос: шлем на бэк и фиксируем committed
      const endpoint = nextVote
        ? `/catalog/reviews/${reviewId}/helpful/`
        : `/catalog/reviews/${reviewId}/not_helpful/`;

      await api.post(endpoint);

      setCommittedVoteByReviewId((prev) => ({ ...prev, [id]: nextVote }));
      saveVoteToStorage(reviewId, nextVote, nextVote);
    } catch (err) {
      console.error("Error marking review:", err);

      // откат vote
      setVoteByReviewId((prev) => ({ ...prev, [id]: prevVote }));

      // откат счетчиков
      setReviews((prev) =>
        prev.map((r) => {
          if (String(r.id) !== id) return r;

          let helpful = Number(r.helpful_count || 0);
          let notHelpful = Number(r.not_helpful_count || 0);

          // откатываем nextVote
          if (nextVote === true) helpful = Math.max(0, helpful - 1);
          if (nextVote === false) notHelpful = Math.max(0, notHelpful - 1);

          // возвращаем prevVote
          if (prevVote === true) helpful += 1;
          if (prevVote === false) notHelpful += 1;

          return { ...r, helpful_count: helpful, not_helpful_count: notHelpful };
        })
      );

      // storage не трогаем (первый голос не зафиксировался)
    } finally {
      setPendingVote((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
    }
  }

  function renderStars(rating, interactive = false, onChange = null) {
    return (
      <div className={`reviews__stars ${interactive ? "reviews__stars--interactive" : ""}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            className={`reviews__star ${star <= rating ? "reviews__star--filled" : ""}`}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
            disabled={!interactive}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
    );
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="reviews">
        <div className="reviews__loading">Загрузка отзывов...</div>
      </div>
    );
  }

  return (
    <div className="reviews">
      <div className="reviews__header">
        <h2 className="reviews__title">
          Отзывы
          {stats.total_count > 0 && <span className="reviews__count">({stats.total_count})</span>}
        </h2>
        <button className="reviews__add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Отмена" : "Написать отзыв"}
        </button>
      </div>

      {stats.total_count > 0 && (
        <div className="reviews__stats">
          <div className="reviews__average">
            <span className="reviews__average-value">{stats.average_rating?.toFixed(1) || "—"}</span>
            {renderStars(Math.round(stats.average_rating || 0))}
            <span className="reviews__average-text">
              на основе {stats.total_count}{" "}
              {stats.total_count === 1 ? "отзыва" : stats.total_count < 5 ? "отзывов" : "отзывов"}
            </span>
          </div>

          <div className="reviews__distribution">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution[String(rating)] || 0;
              const percent = stats.total_count > 0 ? (count / stats.total_count) * 100 : 0;
              return (
                <div key={rating} className="reviews__distribution-row">
                  <span className="reviews__distribution-label">{rating}</span>
                  <div className="reviews__distribution-bar">
                    <div className="reviews__distribution-fill" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="reviews__distribution-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <form className="reviews__form" onSubmit={handleSubmit}>
          <h3>Написать отзыв</h3>

          {!isLoggedIn && (
            <div className="reviews__form-field">
              <label>Ваше имя *</label>
              <input
                type="text"
                name="author_name"
                value={formData.author_name}
                onChange={handleChange}
                required
                placeholder="Как вас зовут?"
              />
            </div>
          )}

          <div className="reviews__form-field">
            <label>Оценка *</label>
            <div className="reviews__form-rating">
              {renderStars(formData.rating, true, (rating) => setFormData((prev) => ({ ...prev, rating })))}
            </div>
          </div>

          <div className="reviews__form-field">
            <label>Заголовок</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Кратко о вашем впечатлении"
            />
          </div>

          <div className="reviews__form-field">
            <label>Отзыв *</label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Расскажите о товаре подробнее (минимум 10 символов)"
              minLength={10}
            />
          </div>

          <div className="reviews__form-row">
            <div className="reviews__form-field">
              <label>Достоинства</label>
              <textarea
                name="advantages"
                value={formData.advantages}
                onChange={handleChange}
                rows="2"
                placeholder="Что понравилось?"
              />
            </div>
            <div className="reviews__form-field">
              <label>Недостатки</label>
              <textarea
                name="disadvantages"
                value={formData.disadvantages}
                onChange={handleChange}
                rows="2"
                placeholder="Что не понравилось?"
              />
            </div>
          </div>

          {error && <div className="reviews__form-error">{error}</div>}
          {success && <div className="reviews__form-success">{success}</div>}

          <button type="submit" className="reviews__form-submit" disabled={submitting}>
            {submitting ? "Отправка..." : "Отправить отзыв"}
          </button>
        </form>
      )}

      {success && !showForm && <div className="reviews__success-message">{success}</div>}

      {reviews.length === 0 ? (
        <div className="reviews__empty">
          <p>Отзывов пока нет. Будьте первым!</p>
        </div>
      ) : (
        <div className="reviews__list">
          {reviews.map((review) => {
            const id = String(review.id);
            const myVote = voteByReviewId[id] ?? null;
            const isPending = Boolean(pendingVote[review.id]);

            return (
              <div key={review.id} className="reviews__item">
                <div className="reviews__item-header">
                  <div className="reviews__item-author">
                    <span className="reviews__item-name">{review.author_name}</span>
                    {review.is_verified_purchase && <span className="reviews__verified">Покупка подтверждена</span>}
                  </div>
                  <div className="reviews__item-meta">
                    {renderStars(review.rating)}
                    <span className="reviews__item-date">{formatDate(review.created_at)}</span>
                  </div>
                </div>

                {review.title && <h4 className="reviews__item-title">{review.title}</h4>}

                <p className="reviews__item-text">{review.text}</p>

                {(review.advantages || review.disadvantages) && (
                  <div className="reviews__item-pros-cons">
                    {review.advantages && (
                      <div className="reviews__item-pros">
                        <strong>Достоинства:</strong> {review.advantages}
                      </div>
                    )}
                    {review.disadvantages && (
                      <div className="reviews__item-cons">
                        <strong>Недостатки:</strong> {review.disadvantages}
                      </div>
                    )}
                  </div>
                )}

                {review.admin_response && (
                  <div className="reviews__item-response">
                    <strong>Ответ магазина:</strong>
                    <p>{review.admin_response}</p>
                  </div>
                )}

                <div className="reviews__item-footer">
                  <span className="reviews__helpful-label">Отзыв полезен?</span>

                  <button
                    className={`reviews__helpful-btn ${myVote === true ? "is-selected" : ""}`}
                    onClick={() => handleHelpful(review.id, true)}
                    disabled={isPending}
                    type="button"
                  >
                    Да ({review.helpful_count})
                  </button>

                  <button
                    className={`reviews__helpful-btn ${myVote === false ? "is-selected" : ""}`}
                    onClick={() => handleHelpful(review.id, false)}
                    disabled={isPending}
                    type="button"
                  >
                    Нет ({review.not_helpful_count})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
