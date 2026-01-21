import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";
import "./Prescriptions.css";

export default function Prescriptions() {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name: "",
    prescription_type: "glasses",
    od_sph: "",
    od_cyl: "",
    od_axis: "",
    od_add: "",
    od_bc: "",
    od_dia: "",
    os_sph: "",
    os_cyl: "",
    os_axis: "",
    os_add: "",
    os_bc: "",
    os_dia: "",
    pd: "",
    pd_left: "",
    pd_right: "",
    doctor_name: "",
    clinic_name: "",
    exam_date: "",
    expiry_date: "",
    notes: "",
    is_primary: false,
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    try {
      const resp = await api.get("/auth/prescriptions/");
      setPrescriptions(resp.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/login");
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function openAddForm() {
    setFormData(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(prescription) {
    setFormData({
      name: prescription.name || "",
      prescription_type: prescription.prescription_type || "glasses",
      od_sph: prescription.od_sph ?? "",
      od_cyl: prescription.od_cyl ?? "",
      od_axis: prescription.od_axis ?? "",
      od_add: prescription.od_add ?? "",
      od_bc: prescription.od_bc ?? "",
      od_dia: prescription.od_dia ?? "",
      os_sph: prescription.os_sph ?? "",
      os_cyl: prescription.os_cyl ?? "",
      os_axis: prescription.os_axis ?? "",
      os_add: prescription.os_add ?? "",
      os_bc: prescription.os_bc ?? "",
      os_dia: prescription.os_dia ?? "",
      pd: prescription.pd ?? "",
      pd_left: prescription.pd_left ?? "",
      pd_right: prescription.pd_right ?? "",
      doctor_name: prescription.doctor_name || "",
      clinic_name: prescription.clinic_name || "",
      exam_date: prescription.exam_date || "",
      expiry_date: prescription.expiry_date || "",
      notes: prescription.notes || "",
      is_primary: prescription.is_primary || false,
    });
    setEditingId(prescription.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Подготавливаем данные - пустые строки преобразуем в null
    const data = {};
    for (const [key, value] of Object.entries(formData)) {
      if (value === "" || value === null) {
        data[key] = null;
      } else if (
        key.includes("sph") ||
        key.includes("cyl") ||
        key.includes("add") ||
        key.includes("bc") ||
        key.includes("dia") ||
        key === "pd" ||
        key === "pd_left" ||
        key === "pd_right"
      ) {
        data[key] = parseFloat(value) || null;
      } else if (key.includes("axis")) {
        data[key] = parseInt(value, 10) || null;
      } else {
        data[key] = value;
      }
    }

    try {
      if (editingId) {
        await api.put(`/auth/prescriptions/${editingId}/`, data);
      } else {
        await api.post("/auth/prescriptions/", data);
      }
      await fetchPrescriptions();
      closeForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Удалить этот рецепт?")) return;

    try {
      await api.delete(`/auth/prescriptions/${id}/`);
      setPrescriptions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleSetPrimary(id) {
    try {
      await api.post(`/auth/prescriptions/${id}/set-primary/`);
      await fetchPrescriptions();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) {
    return (
      <div className="prescriptions">
        <div className="prescriptions__container">
          <div className="prescriptions__loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="prescriptions">
      <div className="prescriptions__container">
        <div className="prescriptions__header">
          <div>
            <Link to="/account" className="prescriptions__back">
              &larr; Личный кабинет
            </Link>
            <h1 className="prescriptions__title">Мои рецепты</h1>
            <p className="prescriptions__subtitle">
              Сохраните ваши оптические рецепты для быстрого заказа линз и очков
            </p>
          </div>
          <button className="prescriptions__add-btn" onClick={openAddForm}>
            + Добавить рецепт
          </button>
        </div>

        {error && <div className="prescriptions__error">{error}</div>}

        {prescriptions.length === 0 ? (
          <div className="prescriptions__empty">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <h2>У вас ещё нет сохранённых рецептов</h2>
            <p>Добавьте ваш первый оптический рецепт для удобного заказа</p>
            <button className="prescriptions__add-btn" onClick={openAddForm}>
              Добавить рецепт
            </button>
          </div>
        ) : (
          <div className="prescriptions__list">
            {prescriptions.map((p) => (
              <div
                key={p.id}
                className={`prescriptions__card ${p.is_primary ? "prescriptions__card--primary" : ""} ${p.is_expired ? "prescriptions__card--expired" : ""}`}
              >
                <div className="prescriptions__card-header">
                  <div>
                    <h3 className="prescriptions__card-name">
                      {p.name || p.prescription_type_display}
                      {p.is_primary && (
                        <span className="prescriptions__badge">Основной</span>
                      )}
                      {p.is_expired && (
                        <span className="prescriptions__badge prescriptions__badge--warning">
                          Истёк
                        </span>
                      )}
                    </h3>
                    <span className="prescriptions__card-type">
                      {p.prescription_type_display}
                    </span>
                  </div>
                  <div className="prescriptions__card-actions">
                    {!p.is_primary && (
                      <button
                        className="prescriptions__action-btn"
                        onClick={() => handleSetPrimary(p.id)}
                        title="Сделать основным"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </button>
                    )}
                    <button
                      className="prescriptions__action-btn"
                      onClick={() => openEditForm(p)}
                      title="Редактировать"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="prescriptions__action-btn prescriptions__action-btn--danger"
                      onClick={() => handleDelete(p.id)}
                      title="Удалить"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="prescriptions__card-body">
                  <div className="prescriptions__eye-data">
                    <div className="prescriptions__eye">
                      <span className="prescriptions__eye-label">OD (правый)</span>
                      <span className="prescriptions__eye-value">{p.od_display}</span>
                    </div>
                    <div className="prescriptions__eye">
                      <span className="prescriptions__eye-label">OS (левый)</span>
                      <span className="prescriptions__eye-value">{p.os_display}</span>
                    </div>
                  </div>

                  {p.pd && (
                    <div className="prescriptions__pd">
                      <span>PD: {p.pd} мм</span>
                    </div>
                  )}

                  <div className="prescriptions__card-meta">
                    {p.exam_date && <span>Осмотр: {p.exam_date}</span>}
                    {p.expiry_date && <span>Действует до: {p.expiry_date}</span>}
                    {p.doctor_name && <span>Врач: {p.doctor_name}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Модальное окно формы */}
        {showForm && (
          <div className="prescriptions__modal-overlay" onClick={closeForm}>
            <div
              className="prescriptions__modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="prescriptions__modal-header">
                <h2>
                  {editingId ? "Редактировать рецепт" : "Новый рецепт"}
                </h2>
                <button
                  className="prescriptions__modal-close"
                  onClick={closeForm}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="prescriptions__form">
                <div className="prescriptions__form-section">
                  <h3>Основная информация</h3>
                  <div className="prescriptions__form-row">
                    <div className="prescriptions__form-field">
                      <label>Название</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Например: Основной рецепт"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>Тип</label>
                      <select
                        name="prescription_type"
                        value={formData.prescription_type}
                        onChange={handleChange}
                      >
                        <option value="glasses">Очки</option>
                        <option value="contacts">Контактные линзы</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="prescriptions__form-section">
                  <h3>Правый глаз (OD)</h3>
                  <div className="prescriptions__form-row prescriptions__form-row--4">
                    <div className="prescriptions__form-field">
                      <label>SPH</label>
                      <input
                        type="number"
                        step="0.25"
                        name="od_sph"
                        value={formData.od_sph}
                        onChange={handleChange}
                        placeholder="-2.50"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>CYL</label>
                      <input
                        type="number"
                        step="0.25"
                        name="od_cyl"
                        value={formData.od_cyl}
                        onChange={handleChange}
                        placeholder="-0.75"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>AXIS</label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        name="od_axis"
                        value={formData.od_axis}
                        onChange={handleChange}
                        placeholder="90"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>ADD</label>
                      <input
                        type="number"
                        step="0.25"
                        name="od_add"
                        value={formData.od_add}
                        onChange={handleChange}
                        placeholder="+2.00"
                      />
                    </div>
                  </div>
                  {formData.prescription_type === "contacts" && (
                    <div className="prescriptions__form-row">
                      <div className="prescriptions__form-field">
                        <label>BC (базовая кривизна)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="od_bc"
                          value={formData.od_bc}
                          onChange={handleChange}
                          placeholder="8.6"
                        />
                      </div>
                      <div className="prescriptions__form-field">
                        <label>DIA (диаметр)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="od_dia"
                          value={formData.od_dia}
                          onChange={handleChange}
                          placeholder="14.2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="prescriptions__form-section">
                  <h3>Левый глаз (OS)</h3>
                  <div className="prescriptions__form-row prescriptions__form-row--4">
                    <div className="prescriptions__form-field">
                      <label>SPH</label>
                      <input
                        type="number"
                        step="0.25"
                        name="os_sph"
                        value={formData.os_sph}
                        onChange={handleChange}
                        placeholder="-2.25"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>CYL</label>
                      <input
                        type="number"
                        step="0.25"
                        name="os_cyl"
                        value={formData.os_cyl}
                        onChange={handleChange}
                        placeholder="-0.50"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>AXIS</label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        name="os_axis"
                        value={formData.os_axis}
                        onChange={handleChange}
                        placeholder="180"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>ADD</label>
                      <input
                        type="number"
                        step="0.25"
                        name="os_add"
                        value={formData.os_add}
                        onChange={handleChange}
                        placeholder="+2.00"
                      />
                    </div>
                  </div>
                  {formData.prescription_type === "contacts" && (
                    <div className="prescriptions__form-row">
                      <div className="prescriptions__form-field">
                        <label>BC (базовая кривизна)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="os_bc"
                          value={formData.os_bc}
                          onChange={handleChange}
                          placeholder="8.6"
                        />
                      </div>
                      <div className="prescriptions__form-field">
                        <label>DIA (диаметр)</label>
                        <input
                          type="number"
                          step="0.1"
                          name="os_dia"
                          value={formData.os_dia}
                          onChange={handleChange}
                          placeholder="14.2"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="prescriptions__form-section">
                  <h3>Межзрачковое расстояние (PD)</h3>
                  <div className="prescriptions__form-row">
                    <div className="prescriptions__form-field">
                      <label>PD общий</label>
                      <input
                        type="number"
                        step="0.5"
                        name="pd"
                        value={formData.pd}
                        onChange={handleChange}
                        placeholder="63"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>PD правый</label>
                      <input
                        type="number"
                        step="0.5"
                        name="pd_right"
                        value={formData.pd_right}
                        onChange={handleChange}
                        placeholder="31.5"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>PD левый</label>
                      <input
                        type="number"
                        step="0.5"
                        name="pd_left"
                        value={formData.pd_left}
                        onChange={handleChange}
                        placeholder="31.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="prescriptions__form-section">
                  <h3>Информация о рецепте</h3>
                  <div className="prescriptions__form-row">
                    <div className="prescriptions__form-field">
                      <label>Врач</label>
                      <input
                        type="text"
                        name="doctor_name"
                        value={formData.doctor_name}
                        onChange={handleChange}
                        placeholder="ФИО врача"
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>Клиника</label>
                      <input
                        type="text"
                        name="clinic_name"
                        value={formData.clinic_name}
                        onChange={handleChange}
                        placeholder="Название клиники"
                      />
                    </div>
                  </div>
                  <div className="prescriptions__form-row">
                    <div className="prescriptions__form-field">
                      <label>Дата осмотра</label>
                      <input
                        type="date"
                        name="exam_date"
                        value={formData.exam_date}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="prescriptions__form-field">
                      <label>Действителен до</label>
                      <input
                        type="date"
                        name="expiry_date"
                        value={formData.expiry_date}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                  <div className="prescriptions__form-field">
                    <label>Примечания</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Дополнительные заметки..."
                    />
                  </div>
                  <div className="prescriptions__form-checkbox">
                    <label>
                      <input
                        type="checkbox"
                        name="is_primary"
                        checked={formData.is_primary}
                        onChange={handleChange}
                      />
                      <span>Использовать как основной рецепт</span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="prescriptions__form-error">{error}</div>
                )}

                <div className="prescriptions__form-actions">
                  <button
                    type="button"
                    className="prescriptions__btn prescriptions__btn--secondary"
                    onClick={closeForm}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="prescriptions__btn prescriptions__btn--primary"
                    disabled={saving}
                  >
                    {saving ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
