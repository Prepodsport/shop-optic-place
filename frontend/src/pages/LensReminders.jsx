import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { api, getTokens, getErrorMessage } from "../api.js";

const LENS_TYPES = [
  { value: "daily", label: "Однодневные", days: 1 },
  { value: "weekly", label: "Недельные", days: 7 },
  { value: "biweekly", label: "Двухнедельные", days: 14 },
  { value: "monthly", label: "Месячные", days: 30 },
  { value: "quarterly", label: "Квартальные", days: 90 },
  { value: "custom", label: "Свой срок", days: null },
];

export default function LensReminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    lens_type: "monthly",
    custom_days: "",
    start_date: new Date().toISOString().split("T")[0],
    notify_days_before: 1,
    notes: "",
  });

  const isLoggedIn = Boolean(getTokens().access);

  const fetchReminders = useCallback(async () => {
    try {
      const resp = await api.get("/auth/lens-reminders/");
      setReminders(resp.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchReminders();
    }
  }, [isLoggedIn, fetchReminders]);

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      lens_type: "monthly",
      custom_days: "",
      start_date: new Date().toISOString().split("T")[0],
      notify_days_before: 1,
      notes: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (reminder) => {
    setFormData({
      name: reminder.name,
      lens_type: reminder.lens_type,
      custom_days: reminder.custom_days || "",
      start_date: reminder.start_date,
      notify_days_before: reminder.notify_days_before,
      notes: reminder.notes || "",
    });
    setEditingId(reminder.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const data = {
        ...formData,
        custom_days: formData.lens_type === "custom" ? parseInt(formData.custom_days, 10) : null,
        notify_days_before: parseInt(formData.notify_days_before, 10),
      };

      if (editingId) {
        await api.patch(`/auth/lens-reminders/${editingId}/`, data);
        toast.success("Напоминание обновлено");
      } else {
        await api.post("/auth/lens-reminders/", data);
        toast.success("Напоминание создано");
      }

      resetForm();
      fetchReminders();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить это напоминание?")) return;

    try {
      await api.delete(`/auth/lens-reminders/${id}/`);
      toast.success("Напоминание удалено");
      fetchReminders();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRenew = async (id) => {
    try {
      await api.post(`/auth/lens-reminders/${id}/renew/`);
      toast.success("Напоминание обновлено — новый период начался");
      fetchReminders();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const getStatusBadge = (status, daysLeft) => {
    const baseClasses = "inline-block py-1 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap";

    switch (status) {
      case "overdue":
        return (
          <span className={`${baseClasses} bg-red-500/10 text-red-600`}>
            Просрочено
          </span>
        );
      case "today":
        return (
          <span className={`${baseClasses} bg-amber-500/10 text-amber-600`}>
            Заменить сегодня
          </span>
        );
      case "soon":
        return (
          <span className={`${baseClasses} bg-amber-500/10 text-amber-600`}>
            {daysLeft === 1 ? "Завтра" : `Через ${daysLeft} дн.`}
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-green-500/10 text-green-600`}>
            {daysLeft} дн.
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getCardClasses = (status) => {
    const base = "rounded-xl p-5 border transition-colors";
    switch (status) {
      case "overdue":
        return `${base} border-red-600 bg-red-500/[0.03]`;
      case "today":
        return `${base} border-amber-500 bg-amber-500/[0.03]`;
      case "soon":
        return `${base} border-amber-500`;
      default:
        return base;
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="text-center py-15" style={{ color: 'var(--muted)' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4">
      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 py-4 text-sm" style={{ color: 'var(--muted)' }}>
        <Link to="/" className="hover:text-[var(--primary)] transition-colors">Главная</Link>
        <span>/</span>
        <Link to="/account" className="hover:text-[var(--primary)] transition-colors">Личный кабинет</Link>
        <span>/</span>
        <span style={{ color: 'var(--text)' }}>Напоминания о замене линз</span>
      </div>

      <div className="py-8">
        {/* Заголовок */}
          <div className="flex flex-col items-center text-center gap-5 mb-8">
            <div>
              <h1 className="text-[28px] font-bold m-0 mb-2" style={{ color: 'var(--text)' }}>
                Напоминания о замене линз
              </h1>
              <p className="text-[15px] m-0" style={{ color: 'var(--muted)' }}>
                Создайте напоминания, чтобы не забывать менять линзы вовремя
              </p>
            </div>
            {!showForm && (
              <button
                className="py-2.5 px-5 bg-[var(--primary)] border border-[var(--primary)] rounded-lg text-white text-[15px] font-semibold cursor-pointer transition-colors hover:bg-blue-700 hover:border-blue-700"
                onClick={() => setShowForm(true)}
              >
                Добавить напоминание
              </button>
            )}
          </div>

        {/* Форма */}
        {showForm && (
          <form
            className="rounded-xl p-6 border mb-8"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-semibold m-0 mb-5" style={{ color: 'var(--text)' }}>
              {editingId ? "Редактировать напоминание" : "Новое напоминание"}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mb-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Название *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Например: Acuvue Oasys"
                  required
                  className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="lens_type" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Тип линз *
                </label>
                <select
                  id="lens_type"
                  name="lens_type"
                  value={formData.lens_type}
                  onChange={handleChange}
                  required
                  className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {LENS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} {type.days ? `(${type.days} дн.)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {formData.lens_type === "custom" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="custom_days" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    Срок замены (дней) *
                  </label>
                  <input
                    type="number"
                    id="custom_days"
                    name="custom_days"
                    value={formData.custom_days}
                    onChange={handleChange}
                    min="1"
                    max="365"
                    required
                    className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-[var(--primary)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="start_date" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Дата начала ношения *
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="notify_days_before" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Напоминать за (дней)
                </label>
                <select
                  id="notify_days_before"
                  name="notify_days_before"
                  value={formData.notify_days_before}
                  onChange={handleChange}
                  className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-[var(--primary)]"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="0">В день замены</option>
                  <option value="1">За 1 день</option>
                  <option value="2">За 2 дня</option>
                  <option value="3">За 3 дня</option>
                  <option value="7">За неделю</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 col-span-full">
                <label htmlFor="notes" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Примечания
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Дополнительная информация"
                  className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors focus:outline-none focus:border-[var(--primary)] resize-y"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="py-2.5 px-5 bg-[var(--primary)] border border-[var(--primary)] rounded-lg text-white text-[15px] font-semibold cursor-pointer transition-colors hover:bg-blue-700 hover:border-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? "Сохранение..." : editingId ? "Сохранить" : "Создать"}
              </button>
              <button
                type="button"
                className="py-2.5 px-5 border rounded-lg text-[15px] font-semibold cursor-pointer transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
                onClick={resetForm}
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Список напоминаний */}
        {reminders.length === 0 ? (
          <div
            className="text-center py-15 px-5 rounded-xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--muted)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold m-0 mb-2" style={{ color: 'var(--text)' }}>
              Нет напоминаний
            </h3>
            <p className="m-0" style={{ color: 'var(--muted)' }}>
              Создайте напоминание, чтобы не забывать менять линзы вовремя
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] md:grid-cols-1 gap-5 mb-8">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={getCardClasses(reminder.status)}
                style={{
                  background: reminder.status === 'overdue' || reminder.status === 'today'
                    ? undefined
                    : 'var(--card)',
                  borderColor: reminder.status === 'overdue' || reminder.status === 'today' || reminder.status === 'soon'
                    ? undefined
                    : 'var(--border)',
                }}
              >
                <div className="flex justify-between items-start gap-3 mb-4">
                  <h3 className="text-lg font-semibold m-0" style={{ color: 'var(--text)' }}>
                    {reminder.name}
                  </h3>
                  {getStatusBadge(reminder.status, reminder.days_until_replacement)}
                </div>

                <div className="mb-4">
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Тип линз:</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {reminder.lens_type_display}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Начало ношения:</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {formatDate(reminder.start_date)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Дата замены:</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {formatDate(reminder.replacement_date)}
                    </span>
                  </div>
                  {reminder.notes && (
                    <div
                      className="mt-3 py-2.5 px-3 rounded-lg text-[13px]"
                      style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                    >
                      {reminder.notes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    className="py-1.5 px-3 bg-[var(--primary)] border border-[var(--primary)] rounded-lg text-white text-[13px] font-semibold cursor-pointer transition-colors hover:bg-blue-700 hover:border-blue-700"
                    onClick={() => handleRenew(reminder.id)}
                    title="Начать новый период ношения"
                  >
                    Обновить
                  </button>
                  <button
                    className="py-1.5 px-3 border rounded-lg text-[13px] font-semibold cursor-pointer transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text)' }}
                    onClick={() => handleEdit(reminder)}
                  >
                    Изменить
                  </button>
                  <button
                    className="py-1.5 px-3 bg-transparent border border-red-600 rounded-lg text-red-600 text-[13px] font-semibold cursor-pointer transition-colors hover:bg-red-500/5"
                    onClick={() => handleDelete(reminder.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Информация */}
        <div
          className="rounded-xl p-6 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-base font-semibold m-0 mb-3" style={{ color: 'var(--text)' }}>
            Почему важно менять линзы вовремя?
          </h3>
          <ul className="list-none p-0 m-0">
            {[
              "Просроченные линзы накапливают белковые отложения и бактерии",
              "Ношение линз дольше срока может привести к раздражению и инфекциям",
              "Соблюдение сроков замены сохраняет здоровье глаз",
              "Новые линзы обеспечивают лучшую остроту зрения и комфорт",
            ].map((item, idx) => (
              <li
                key={idx}
                className="relative pl-5 text-sm leading-relaxed mb-1.5 last:mb-0 before:content-[''] before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-[var(--primary)] before:rounded-full"
                style={{ color: 'var(--muted)' }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
