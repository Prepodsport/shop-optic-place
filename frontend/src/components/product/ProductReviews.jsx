import { useState, useEffect } from "react";
import { api, getTokens, getErrorMessage } from "../../api.js";

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

  const [voteByReviewId, setVoteByReviewId] = useState({});
  const [committedVoteByReviewId, setCommittedVoteByReviewId] = useState({});
  const [pendingVote, setPendingVote] = useState({});

  const VOTES_LS_KEY = "review_votes_v1";

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

    if (next.v === null && next.c === null) {
      delete raw[id];
    } else {
      raw[id] = next;
    }

    localStorage.setItem(VOTES_LS_KEY, JSON.stringify(raw));
  }

  function applyVoteOverlayToCounts(review, committedVote, currentVote) {
    if (!(committedVote === true || committedVote === false)) return review;
    if (!(currentVote === true || currentVote === false)) return review;
    if (committedVote === currentVote) return review;

    let helpful = Number(review.helpful_count || 0);
    let notHelpful = Number(review.not_helpful_count || 0);

    if (committedVote === true) helpful = Math.max(0, helpful - 1);
    if (committedVote === false) notHelpful = Math.max(0, notHelpful - 1);

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

      const saved = loadVotesFromStorage();
      setVoteByReviewId(saved.current);
      setCommittedVoteByReviewId(saved.committed);

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

  async function handleHelpful(reviewId, nextVote) {
    if (pendingVote[reviewId]) return;

    const id = String(reviewId);
    const prevVote = voteByReviewId[id] ?? null;
    const committed = committedVoteByReviewId[id] ?? null;

    if (prevVote === nextVote) return;

    setPendingVote((prev) => ({ ...prev, [reviewId]: true }));

    setVoteByReviewId((prev) => ({ ...prev, [id]: nextVote }));

    setReviews((prev) =>
      prev.map((r) => {
        if (String(r.id) !== id) return r;

        let helpful = Number(r.helpful_count || 0);
        let notHelpful = Number(r.not_helpful_count || 0);

        if (prevVote === true) helpful = Math.max(0, helpful - 1);
        if (prevVote === false) notHelpful = Math.max(0, notHelpful - 1);

        if (nextVote === true) helpful += 1;
        if (nextVote === false) notHelpful += 1;

        return { ...r, helpful_count: helpful, not_helpful_count: notHelpful };
      })
    );

    try {
      if (committed === true || committed === false) {
        saveVoteToStorage(reviewId, nextVote, committed);
        return;
      }

      const endpoint = nextVote
        ? `/catalog/reviews/${reviewId}/helpful/`
        : `/catalog/reviews/${reviewId}/not_helpful/`;

      await api.post(endpoint);

      setCommittedVoteByReviewId((prev) => ({ ...prev, [id]: nextVote }));
      saveVoteToStorage(reviewId, nextVote, nextVote);
    } catch (err) {
      console.error("Error marking review:", err);

      setVoteByReviewId((prev) => ({ ...prev, [id]: prevVote }));

      setReviews((prev) =>
        prev.map((r) => {
          if (String(r.id) !== id) return r;

          let helpful = Number(r.helpful_count || 0);
          let notHelpful = Number(r.not_helpful_count || 0);

          if (nextVote === true) helpful = Math.max(0, helpful - 1);
          if (nextVote === false) notHelpful = Math.max(0, notHelpful - 1);

          if (prevVote === true) helpful += 1;
          if (prevVote === false) notHelpful += 1;

          return { ...r, helpful_count: helpful, not_helpful_count: notHelpful };
        })
      );
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
      <div className={`flex gap-0.5 ${interactive ? "[&_button]:cursor-pointer [&_button:hover]:scale-[1.2]" : ""}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            className={`w-5 h-5 p-0 border-none bg-transparent transition-transform duration-150 ${
              star <= rating ? "text-amber-400" : "text-gray-300"
            } ${interactive ? "" : "cursor-default"}`}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
            disabled={!interactive}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
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
      <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="text-center py-10" style={{ color: 'var(--muted)' }}>
          Загрузка отзывов...
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold m-0" style={{ color: 'var(--text)' }}>
          Отзывы
          {stats.total_count > 0 && (
            <span className="font-normal ml-2" style={{ color: 'var(--muted)' }}>
              ({stats.total_count})
            </span>
          )}
        </h2>
        <button
          className="py-2.5 px-5 bg-[var(--primary)] text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-colors duration-200 hover:bg-blue-700"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Отмена" : "Написать отзыв"}
        </button>
      </div>

      {stats.total_count > 0 && (
        <div
          className="flex md:flex-col gap-10 md:gap-6 p-6 rounded-xl mb-8"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-col md:flex-row md:justify-center items-center gap-2 md:gap-4 min-w-[140px]">
            <span className="text-5xl font-bold leading-none" style={{ color: 'var(--text)' }}>
              {stats.average_rating?.toFixed(1) || "—"}
            </span>
            {renderStars(Math.round(stats.average_rating || 0))}
            <span className="text-[13px] text-center" style={{ color: 'var(--muted)' }}>
              на основе {stats.total_count}{" "}
              {stats.total_count === 1 ? "отзыва" : stats.total_count < 5 ? "отзывов" : "отзывов"}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution[String(rating)] || 0;
              const percent = stats.total_count > 0 ? (count / stats.total_count) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
                    {rating}
                  </span>
                  <div
                    className="flex-1 h-2 rounded overflow-hidden"
                    style={{ background: 'var(--bg)' }}
                  >
                    <div
                      className="h-full bg-amber-400 rounded transition-[width] duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-[30px] text-[13px] text-right" style={{ color: 'var(--muted)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <form
          className="p-6 rounded-xl mb-8"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          onSubmit={handleSubmit}
        >
          <h3 className="text-lg font-semibold m-0 mb-5">Написать отзыв</h3>

          {!isLoggedIn && (
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
                Ваше имя *
              </label>
              <input
                type="text"
                name="author_name"
                value={formData.author_name}
                onChange={handleChange}
                required
                placeholder="Как вас зовут?"
                className="w-full py-2.5 px-3.5 rounded-lg text-[15px] transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
              Оценка *
            </label>
            <div className="py-2 [&_.flex]:gap-1 [&_button]:w-8 [&_button]:h-8">
              {renderStars(formData.rating, true, (rating) => setFormData((prev) => ({ ...prev, rating })))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
              Заголовок
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Кратко о вашем впечатлении"
              className="w-full py-2.5 px-3.5 rounded-lg text-[15px] transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
              Отзыв *
            </label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleChange}
              required
              rows="4"
              placeholder="Расскажите о товаре подробнее (минимум 10 символов)"
              minLength={10}
              className="w-full py-2.5 px-3.5 rounded-lg text-[15px] resize-y transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
                Достоинства
              </label>
              <textarea
                name="advantages"
                value={formData.advantages}
                onChange={handleChange}
                rows="2"
                placeholder="Что понравилось?"
                className="w-full py-2.5 px-3.5 rounded-lg text-[15px] resize-y transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>
                Недостатки
              </label>
              <textarea
                name="disadvantages"
                value={formData.disadvantages}
                onChange={handleChange}
                rows="2"
                placeholder="Что не понравилось?"
                className="w-full py-2.5 px-3.5 rounded-lg text-[15px] resize-y transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg text-sm mb-4 bg-red-500/10 border border-red-500/35 text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg text-sm mb-4 bg-green-500/10 border border-green-500/35 text-green-600">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="py-3 px-6 bg-[var(--primary)] text-white border-none rounded-lg text-[15px] font-semibold cursor-pointer transition-colors duration-200 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={submitting}
          >
            {submitting ? "Отправка..." : "Отправить отзыв"}
          </button>
        </form>
      )}

      {success && !showForm && (
        <div className="p-4 bg-green-500/10 border border-green-500/35 rounded-lg text-green-600 mb-6">
          {success}
        </div>
      )}

      {reviews.length === 0 ? (
        <div
          className="text-center py-10 px-5 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <p>Отзывов пока нет. Будьте первым!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {reviews.map((review) => {
            const id = String(review.id);
            const myVote = voteByReviewId[id] ?? null;
            const isPending = Boolean(pendingVote[review.id]);

            return (
              <div
                key={review.id}
                className="p-5 rounded-xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2 md:flex-col">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold" style={{ color: 'var(--text)' }}>
                      {review.author_name}
                    </span>
                    {review.is_verified_purchase && (
                      <span className="inline-block py-0.5 px-2 bg-green-500/10 text-green-600 text-[11px] font-semibold rounded">
                        Покупка подтверждена
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {renderStars(review.rating)}
                    <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                </div>

                {review.title && (
                  <h4 className="text-base font-semibold m-0 mb-2" style={{ color: 'var(--text)' }}>
                    {review.title}
                  </h4>
                )}

                <p className="leading-relaxed m-0 mb-3" style={{ color: 'var(--text)' }}>
                  {review.text}
                </p>

                {(review.advantages || review.disadvantages) && (
                  <div
                    className="flex flex-col gap-2 mb-3 p-3 rounded-lg text-sm"
                    style={{ background: 'var(--bg)' }}
                  >
                    {review.advantages && (
                      <div className="text-green-600">
                        <strong>Достоинства:</strong> {review.advantages}
                      </div>
                    )}
                    {review.disadvantages && (
                      <div className="text-red-600">
                        <strong>Недостатки:</strong> {review.disadvantages}
                      </div>
                    )}
                  </div>
                )}

                {review.admin_response && (
                  <div
                    className="p-3 rounded-r-lg mb-3 border-l-[3px] border-l-[var(--primary)]"
                    style={{ background: 'rgba(37, 99, 235, 0.05)' }}
                  >
                    <strong className="block text-[var(--primary)] mb-1 text-[13px]">
                      Ответ магазина:
                    </strong>
                    <p className="m-0 text-sm" style={{ color: 'var(--text)' }}>
                      {review.admin_response}
                    </p>
                  </div>
                )}

                <div
                  className="flex items-center gap-3 pt-3 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                    Отзыв полезен?
                  </span>

                  <button
                    className={`py-1 px-3 rounded-md text-[13px] cursor-pointer transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed ${
                      myVote === true ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10" : ""
                    }`}
                    style={{
                      background: myVote === true ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg)',
                      border: `1px solid ${myVote === true ? 'var(--primary)' : 'var(--border)'}`,
                      color: myVote === true ? 'var(--primary)' : 'var(--muted)',
                    }}
                    onClick={() => handleHelpful(review.id, true)}
                    disabled={isPending}
                    type="button"
                  >
                    Да ({review.helpful_count})
                  </button>

                  <button
                    className={`py-1 px-3 rounded-md text-[13px] cursor-pointer transition-all duration-200 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed ${
                      myVote === false ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10" : ""
                    }`}
                    style={{
                      background: myVote === false ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--bg)',
                      border: `1px solid ${myVote === false ? 'var(--primary)' : 'var(--border)'}`,
                      color: myVote === false ? 'var(--primary)' : 'var(--muted)',
                    }}
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
