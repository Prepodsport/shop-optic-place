import { useMemo, useState } from "react";
import { api } from "../api.js";

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
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <h1
            className="text-[32px] md:text-[26px] font-bold m-0"
            style={{ color: 'var(--text)' }}
          >
            Онлайн-запись
          </h1>
        </div>

        <div
          className="rounded-2xl p-5 md:p-6 border mb-5"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div
            className="text-[16px] font-bold mb-2"
            style={{ color: 'var(--text)' }}
          >
            Как это работает
          </div>
          <p
            className="text-[15px] leading-[1.7] m-0"
            style={{ color: 'var(--muted)' }}
          >
            Выберите специалиста, дату и время. Мы создадим заявку и передадим её в CRM.
            Формат даты отправляется автоматически — вводить ISO вручную не нужно.
          </p>
        </div>

        <form
          className="rounded-2xl p-6 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          onSubmit={submit}
        >
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--muted)' }}
              >
                Специалист
              </span>
              <select
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                value={service_type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="ophthalmologist">Офтальмолог</option>
                <option value="optometrist">Оптометрист</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--muted)' }}
              >
                Дата и время
              </span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                type="datetime-local"
                value={desired_dt_local}
                onChange={(e) => setDtLocal(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 col-span-full">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--muted)' }}
              >
                ФИО
              </span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Иванов Иван Иванович"
                value={full_name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--muted)' }}
              >
                Телефон
              </span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--muted)' }}
              >
                Email
              </span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-2 col-span-full">
              <span
                className="text-[13px] font-semibold"
                style={{ color: 'var(--muted)' }}
              >
                Комментарий
              </span>
              <textarea
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 resize-y min-h-[110px] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Например: есть рецепт/линзы, хочу проверить зрение"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 mt-4.5">
            <button
              className="py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Отправляем..." : "Отправить"}
            </button>

            {status.text && (
              <div
                className="py-3 px-3.5 rounded-xl border text-[14px] leading-relaxed"
                style={{
                  background: 'var(--bg)',
                  borderColor: status.type === 'success'
                    ? 'rgba(34, 197, 94, 0.35)'
                    : status.type === 'error'
                    ? 'rgba(239, 68, 68, 0.35)'
                    : 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                {status.text}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
