import { useMemo, useState } from "react";
import { api } from "../api.js";
import "./Booking.css";

function toIsoWithLocalTz(datetimeLocalValue) {
  // datetimeLocalValue: "2026-01-16T14:00"
  // Превращаем в Date в локальной TZ и отдаём ISO со смещением
  if (!datetimeLocalValue) return "";
  const d = new Date(datetimeLocalValue);
  if (Number.isNaN(d.getTime())) return "";

  // ISO всегда в UTC (Z). Если вашему бекенду нужно именно "+01:00",
  // то можно отправлять Z — обычно это правильно.
  return d.toISOString();
}

export default function Booking() {
  const [service_type, setType] = useState("optometrist");
  const [desired_dt_local, setDtLocal] = useState(""); // datetime-local
  const [full_name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");

  const [status, setStatus] = useState({ type: "", text: "" }); // type: success|error|info
  const [submitting, setSubmitting] = useState(false);

  const desired_datetime = useMemo(
    () => toIsoWithLocalTz(desired_dt_local),
    [desired_dt_local]
  );

  async function submit(e) {
    e.preventDefault();
    setStatus({ type: "", text: "" });

    if (!desired_dt_local) {
      setStatus({ type: "error", text: "Выберите дату и время записи." });
      return;
    }
    if (!full_name.trim()) {
      setStatus({ type: "error", text: "Введите ФИО." });
      return;
    }
    if (!phone.trim()) {
      setStatus({ type: "error", text: "Введите телефон." });
      return;
    }

    const payload = {
      service_type,
      desired_datetime, // ISO (UTC)
      full_name: full_name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      comment: comment.trim(),
    };

    try {
      setSubmitting(true);
      const resp = await api.post("/appointments/create/", payload);

      setStatus({
        type: "success",
        text: `Заявка создана: #${resp.data.id}, статус: ${resp.data.status}`,
      });

      // опционально: очищаем форму после успеха
      // setDtLocal("");
      // setName("");
      // setPhone("");
      // setEmail("");
      // setComment("");
    } catch (err) {
      // если бекенд отдаёт детали — покажем
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "";

      setStatus({
        type: "error",
        text:
          detail ||
          "Ошибка отправки. Проверьте поля и попробуйте снова.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="booking">
      <div className="booking__container">
        <div className="booking__header">
          <h1 className="booking__title">Онлайн-запись</h1>
        </div>

        <div className="booking__note">
          <div className="booking__note-title">Как это работает</div>
          <p className="booking__muted">
            Выберите специалиста, дату и время. Мы создадим заявку и передадим её в CRM.
            Формат даты отправляется автоматически — вводить ISO вручную не нужно.
          </p>
        </div>

        <form className="booking__form" onSubmit={submit}>
          <div className="booking__grid">
            <label className="booking__field">
              <span className="booking__label">Специалист</span>
              <select
                className="booking__input"
                value={service_type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="ophthalmologist">Офтальмолог</option>
                <option value="optometrist">Оптометрист</option>
              </select>
            </label>

            <label className="booking__field">
              <span className="booking__label">Дата и время</span>
              <input
                className="booking__input"
                type="datetime-local"
                value={desired_dt_local}
                onChange={(e) => setDtLocal(e.target.value)}
              />
            </label>

            <label className="booking__field booking__field--full">
              <span className="booking__label">ФИО</span>
              <input
                className="booking__input"
                placeholder="Иванов Иван Иванович"
                value={full_name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="booking__field">
              <span className="booking__label">Телефон</span>
              <input
                className="booking__input"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="booking__field">
              <span className="booking__label">Email</span>
              <input
                className="booking__input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="booking__field booking__field--full">
              <span className="booking__label">Комментарий</span>
              <textarea
                className="booking__input booking__textarea"
                placeholder="Например: есть рецепт/линзы, хочу проверить зрение"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
          </div>

          <div className="booking__actions">
            <button
              className="booking__btn booking__btn--primary"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Отправляем..." : "Отправить"}
            </button>

            {status.text ? (
              <div className={`booking__status booking__status--${status.type}`}>
                {status.text}
              </div>
            ) : null}
          </div>

          {/* полезно для отладки: что реально уходит на API */}
          {/* <div className="booking__muted">ISO: {desired_datetime}</div> */}
        </form>
      </div>
    </div>
  );
}
