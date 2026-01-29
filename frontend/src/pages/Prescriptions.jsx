import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";

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
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center py-15 px-5" style={{ color: 'var(--muted)' }}>
            Загрузка...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex justify-between items-start gap-5 mb-8 md:flex-col md:items-stretch">
          <div>
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-[14px] no-underline mb-2 hover:underline"
              style={{ color: 'var(--primary)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Личный кабинет
            </Link>
            <h1
              className="text-[32px] text-center md:text-[26px] font-bold m-0 mb-2"
              style={{ color: 'var(--text)' }}
            >
              Мои рецепты
            </h1>
            <p className="text-[15px] text-center m-0" style={{ color: 'var(--muted)' }}>
              Сохраните ваши оптические рецепты для быстрого заказа линз и очков
            </p>
          </div>
        </div>

        {error && (
          <div
            className="py-4 px-4 mb-6 rounded-xl border text-[#dc2626]"
            style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.35)' }}
          >
            {error}
          </div>
        )}

        {prescriptions.length === 0 ? (
          <div
            className="text-center py-15 px-5 rounded-2xl border flex flex-col items-center"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <svg
              className="mb-4"
              style={{ color: 'var(--muted)' }}
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
            <h2
              className="text-[20px] font-semibold m-0 mb-2"
              style={{ color: 'var(--text)' }}
            >
              У вас ещё нет сохранённых рецептов
            </h2>
            <p className="text-[15px] m-0 mb-6" style={{ color: 'var(--muted)' }}>
              Добавьте ваш первый оптический рецепт для удобного заказа
            </p>
          <button
            className="py-3 px-6 bg-[var(--primary)] text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-colors duration-200 whitespace-nowrap hover:bg-blue-700 flex items-center gap-2"
            onClick={openAddForm}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Добавить рецепт
          </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {prescriptions.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl border overflow-hidden transition-colors duration-200 hover:border-[var(--primary)] ${
                  p.is_primary ? 'border-[var(--primary)] shadow-[0_0_0_1px_var(--primary)]' : ''
                } ${p.is_expired ? 'opacity-70' : ''}`}
                style={{ background: 'var(--card)', borderColor: p.is_primary ? 'var(--primary)' : 'var(--border)' }}
              >
                <div className="flex justify-between items-start p-5 pb-0">
                  <div>
                    <h3
                      className="text-[18px] font-semibold m-0 mb-1 flex items-center gap-2"
                      style={{ color: 'var(--text)' }}
                    >
                      {p.name || p.prescription_type_display}
                      {p.is_primary && (
                        <span className="inline-block py-0.5 px-2 bg-[var(--primary)] text-white text-[11px] font-semibold rounded-md uppercase">
                          Основной
                        </span>
                      )}
                      {p.is_expired && (
                        <span className="inline-block py-0.5 px-2 bg-amber-500 text-white text-[11px] font-semibold rounded-md uppercase">
                          Истёк
                        </span>
                      )}
                    </h3>
                    <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                      {p.prescription_type_display}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {!p.is_primary && (
                      <button
                        className="flex items-center justify-center w-9 h-9 border rounded-lg cursor-pointer transition-all duration-200 hover:text-[var(--primary)] hover:border-[var(--primary)]"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                        onClick={() => handleSetPrimary(p.id)}
                        title="Сделать основным"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </button>
                    )}
                    <button
                      className="flex items-center justify-center w-9 h-9 border rounded-lg cursor-pointer transition-all duration-200 hover:text-[var(--primary)] hover:border-[var(--primary)]"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                      onClick={() => openEditForm(p)}
                      title="Редактировать"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      className="flex items-center justify-center w-9 h-9 border rounded-lg cursor-pointer transition-all duration-200 hover:text-red-600 hover:border-red-600"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                      onClick={() => handleDelete(p.id)}
                      title="Удалить"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mb-4">
                    <div className="rounded-xl p-4" style={{ background: 'var(--bg)' }}>
                      <span
                        className="block text-[12px] font-semibold uppercase mb-2"
                        style={{ color: 'var(--muted)' }}
                      >
                        OD (правый)
                      </span>
                      <span
                        className="text-[15px] font-medium font-mono"
                        style={{ color: 'var(--text)' }}
                      >
                        {p.od_display}
                      </span>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'var(--bg)' }}>
                      <span
                        className="block text-[12px] font-semibold uppercase mb-2"
                        style={{ color: 'var(--muted)' }}
                      >
                        OS (левый)
                      </span>
                      <span
                        className="text-[15px] font-medium font-mono"
                        style={{ color: 'var(--text)' }}
                      >
                        {p.os_display}
                      </span>
                    </div>
                  </div>

                  {p.pd && (
                    <div
                      className="inline-block text-[14px] mb-4 py-3 px-4 rounded-lg"
                      style={{ background: 'var(--bg)', color: 'var(--text)' }}
                    >
                      <span>PD: {p.pd} мм</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-[13px]" style={{ color: 'var(--muted)' }}>
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
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-5"
            onClick={closeForm}
          >
            <div
              className="rounded-2xl w-full max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col md:max-h-full md:rounded-none"
              style={{ background: 'var(--card)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex justify-between items-center py-5 px-6 border-b"
                style={{ borderColor: 'var(--border)' }}
              >
                <h2 className="text-[20px] font-semibold m-0">
                  {editingId ? "Редактировать рецепт" : "Новый рецепт"}
                </h2>
                <button
                  className="w-9 h-9 border-none bg-transparent text-[28px] cursor-pointer leading-none"
                  style={{ color: 'var(--muted)' }}
                  onClick={closeForm}
                >
                  &times;
                </button>
              </div>

              <form className="overflow-y-auto p-6" onSubmit={handleSubmit}>
                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-4"
                    style={{ color: 'var(--muted)' }}
                  >
                    Основная информация
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Название</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Например: Основной рецепт"
                        className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Тип</label>
                      <select
                        name="prescription_type"
                        value={formData.prescription_type}
                        onChange={handleChange}
                        className="py-2.5 px-3.5 border rounded-lg text-[15px] transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="glasses">Очки</option>
                        <option value="contacts">Контактные линзы</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-4"
                    style={{ color: 'var(--muted)' }}
                  >
                    Правый глаз (OD)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>SPH</label>
                      <input type="number" step="0.25" name="od_sph" value={formData.od_sph} onChange={handleChange} placeholder="-2.50" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>CYL</label>
                      <input type="number" step="0.25" name="od_cyl" value={formData.od_cyl} onChange={handleChange} placeholder="-0.75" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>AXIS</label>
                      <input type="number" min="0" max="180" name="od_axis" value={formData.od_axis} onChange={handleChange} placeholder="90" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>ADD</label>
                      <input type="number" step="0.25" name="od_add" value={formData.od_add} onChange={handleChange} placeholder="+2.00" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                  </div>
                  {formData.prescription_type === "contacts" && (
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>BC (базовая кривизна)</label>
                        <input type="number" step="0.1" name="od_bc" value={formData.od_bc} onChange={handleChange} placeholder="8.6" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>DIA (диаметр)</label>
                        <input type="number" step="0.1" name="od_dia" value={formData.od_dia} onChange={handleChange} placeholder="14.2" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-4"
                    style={{ color: 'var(--muted)' }}
                  >
                    Левый глаз (OS)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>SPH</label>
                      <input type="number" step="0.25" name="os_sph" value={formData.os_sph} onChange={handleChange} placeholder="-2.25" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>CYL</label>
                      <input type="number" step="0.25" name="os_cyl" value={formData.os_cyl} onChange={handleChange} placeholder="-0.50" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>AXIS</label>
                      <input type="number" min="0" max="180" name="os_axis" value={formData.os_axis} onChange={handleChange} placeholder="180" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>ADD</label>
                      <input type="number" step="0.25" name="os_add" value={formData.os_add} onChange={handleChange} placeholder="+2.00" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                  </div>
                  {formData.prescription_type === "contacts" && (
                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mt-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>BC (базовая кривизна)</label>
                        <input type="number" step="0.1" name="os_bc" value={formData.os_bc} onChange={handleChange} placeholder="8.6" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>DIA (диаметр)</label>
                        <input type="number" step="0.1" name="os_dia" value={formData.os_dia} onChange={handleChange} placeholder="14.2" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-4"
                    style={{ color: 'var(--muted)' }}
                  >
                    Межзрачковое расстояние (PD)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>PD общий</label>
                      <input type="number" step="0.5" name="pd" value={formData.pd} onChange={handleChange} placeholder="63" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>PD правый</label>
                      <input type="number" step="0.5" name="pd_right" value={formData.pd_right} onChange={handleChange} placeholder="31.5" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>PD левый</label>
                      <input type="number" step="0.5" name="pd_left" value={formData.pd_left} onChange={handleChange} placeholder="31.5" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-4"
                    style={{ color: 'var(--muted)' }}
                  >
                    Информация о рецепте
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Врач</label>
                      <input type="text" name="doctor_name" value={formData.doctor_name} onChange={handleChange} placeholder="ФИО врача" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Клиника</label>
                      <input type="text" name="clinic_name" value={formData.clinic_name} onChange={handleChange} placeholder="Название клиники" className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mt-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Дата осмотра</label>
                      <input type="date" name="exam_date" value={formData.exam_date} onChange={handleChange} className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Действителен до</label>
                      <input type="date" name="expiry_date" value={formData.expiry_date} onChange={handleChange} className="py-2.5 px-3.5 border rounded-lg text-[15px] focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-4">
                    <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Примечания</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" placeholder="Дополнительные заметки..." className="py-2.5 px-3.5 border rounded-lg text-[15px] resize-y focus:outline-none focus:border-[var(--primary)]" style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" name="is_primary" checked={formData.is_primary} onChange={handleChange} className="w-4.5 h-4.5 accent-[var(--primary)]" />
                      <span className="text-[14px]" style={{ color: 'var(--text)' }}>Использовать как основной рецепт</span>
                    </label>
                  </div>
                </div>

                {error && (
                  <div
                    className="py-3 px-4 mb-4 rounded-lg border text-[14px] text-[#dc2626]"
                    style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.35)' }}
                  >
                    {error}
                  </div>
                )}

                <div
                  className="flex justify-end gap-3 pt-4 border-t md:flex-col"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <button
                    type="button"
                    className="py-3 px-6 bg-transparent border rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] md:w-full"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                    onClick={closeForm}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="py-3 px-6 bg-[var(--primary)] text-white border-none rounded-[10px] text-[15px] font-semibold cursor-pointer transition-colors duration-200 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed md:w-full"
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
