import { useState, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { api, getTokens, getErrorMessage } from "../api.js";
import "./LensReminders.css";

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
    switch (status) {
      case "overdue":
        return <span className="reminder-badge reminder-badge--overdue">Просрочено</span>;
      case "today":
        return <span className="reminder-badge reminder-badge--today">Заменить сегодня</span>;
      case "soon":
        return (
          <span className="reminder-badge reminder-badge--soon">
            {daysLeft === 1 ? "Завтра" : `Через ${daysLeft} дн.`}
          </span>
        );
      default:
        return <span className="reminder-badge reminder-badge--ok">{daysLeft} дн.</span>;
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container">
        <div className="reminders-loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>/</span>
        <Link to="/account">Личный кабинет</Link>
        <span>/</span>
        <span className="current">Напоминания о замене линз</span>
      </div>

      <div className="reminders-page">
        <div className="reminders-header">
          <div>
            <h1>Напоминания о замене линз</h1>
            <p className="reminders-subtitle">
              Создайте напоминания, чтобы не забывать менять линзы вовремя
            </p>
          </div>
          {!showForm && (
            <button
              className="btn primary"
              onClick={() => setShowForm(true)}
            >
              Добавить напоминание
            </button>
          )}
        </div>

        {/* Форма */}
        {showForm && (
          <form className="reminder-form" onSubmit={handleSubmit}>
            <h2>{editingId ? "Редактировать напоминание" : "Новое напоминание"}</h2>

            <div className="reminder-form__grid">
              <div className="reminder-form__field">
                <label htmlFor="name">Название *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Например: Acuvue Oasys"
                  required
                />
              </div>

              <div className="reminder-form__field">
                <label htmlFor="lens_type">Тип линз *</label>
                <select
                  id="lens_type"
                  name="lens_type"
                  value={formData.lens_type}
                  onChange={handleChange}
                  required
                >
                  {LENS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} {type.days ? `(${type.days} дн.)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {formData.lens_type === "custom" && (
                <div className="reminder-form__field">
                  <label htmlFor="custom_days">Срок замены (дней) *</label>
                  <input
                    type="number"
                    id="custom_days"
                    name="custom_days"
                    value={formData.custom_days}
                    onChange={handleChange}
                    min="1"
                    max="365"
                    required
                  />
                </div>
              )}

              <div className="reminder-form__field">
                <label htmlFor="start_date">Дата начала ношения *</label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="reminder-form__field">
                <label htmlFor="notify_days_before">Напоминать за (дней)</label>
                <select
                  id="notify_days_before"
                  name="notify_days_before"
                  value={formData.notify_days_before}
                  onChange={handleChange}
                >
                  <option value="0">В день замены</option>
                  <option value="1">За 1 день</option>
                  <option value="2">За 2 дня</option>
                  <option value="3">За 3 дня</option>
                  <option value="7">За неделю</option>
                </select>
              </div>

              <div className="reminder-form__field reminder-form__field--full">
                <label htmlFor="notes">Примечания</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Дополнительная информация"
                />
              </div>
            </div>

            <div className="reminder-form__actions">
              <button type="submit" className="btn primary" disabled={submitting}>
                {submitting ? "Сохранение..." : editingId ? "Сохранить" : "Создать"}
              </button>
              <button type="button" className="btn secondary" onClick={resetForm}>
                Отмена
              </button>
            </div>
          </form>
        )}

        {/* Список напоминаний */}
        {reminders.length === 0 ? (
          <div className="reminders-empty">
            <div className="reminders-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3>Нет напоминаний</h3>
            <p>Создайте напоминание, чтобы не забывать менять линзы вовремя</p>
          </div>
        ) : (
          <div className="reminders-list">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`reminder-card reminder-card--${reminder.status}`}
              >
                <div className="reminder-card__header">
                  <h3 className="reminder-card__name">{reminder.name}</h3>
                  {getStatusBadge(reminder.status, reminder.days_until_replacement)}
                </div>

                <div className="reminder-card__info">
                  <div className="reminder-card__row">
                    <span className="reminder-card__label">Тип линз:</span>
                    <span className="reminder-card__value">{reminder.lens_type_display}</span>
                  </div>
                  <div className="reminder-card__row">
                    <span className="reminder-card__label">Начало ношения:</span>
                    <span className="reminder-card__value">{formatDate(reminder.start_date)}</span>
                  </div>
                  <div className="reminder-card__row">
                    <span className="reminder-card__label">Дата замены:</span>
                    <span className="reminder-card__value">{formatDate(reminder.replacement_date)}</span>
                  </div>
                  {reminder.notes && (
                    <div className="reminder-card__notes">{reminder.notes}</div>
                  )}
                </div>

                <div className="reminder-card__actions">
                  <button
                    className="btn small primary"
                    onClick={() => handleRenew(reminder.id)}
                    title="Начать новый период ношения"
                  >
                    Обновить
                  </button>
                  <button
                    className="btn small secondary"
                    onClick={() => handleEdit(reminder)}
                  >
                    Изменить
                  </button>
                  <button
                    className="btn small danger"
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
        <div className="reminders-info">
          <h3>Почему важно менять линзы вовремя?</h3>
          <ul>
            <li>Просроченные линзы накапливают белковые отложения и бактерии</li>
            <li>Ношение линз дольше срока может привести к раздражению и инфекциям</li>
            <li>Соблюдение сроков замены сохраняет здоровье глаз</li>
            <li>Новые линзы обеспечивают лучшую остроту зрения и комфорт</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
