import { useEffect, useState } from "react";
import { api, getTokens, logout as apiLogout, getErrorMessage } from "../api.js";
import { Link, useNavigate } from "react-router-dom";

export default function Account() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Состояния для пагинации и поиска
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const ordersPerPage = 5;

  const loggedIn = Boolean(getTokens().access);

  useEffect(() => {
    if (!loggedIn) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [meResp, ordersResp] = await Promise.all([
          api.get("/auth/me/"),
          api.get("/orders/my/"),
        ]);
        setMe(meResp.data);
        setFormData({
          first_name: meResp.data.first_name || "",
          last_name: meResp.data.last_name || "",
          phone: meResp.data.phone || "",
        });
        setOrders(ordersResp.data);
      } catch (err) {
        console.error("Error fetching account data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loggedIn]);

  const handleLogout = async () => {
    await apiLogout();
    navigate("/login");
  };

  const handleEdit = () => {
    setEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      first_name: me?.first_name || "",
      last_name: me?.last_name || "",
      phone: me?.phone || "",
    });
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const resp = await api.patch("/auth/me/", formData);
      setMe(resp.data);
      setEditing(false);
      setSuccess("Профиль успешно обновлён");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
  };

  const getStatusColor = (status) => {
    const colors = {
      placed: "#f59e0b",
      confirmed: "#3b82f6",
      paid: "#10b981",
      processing: "#8b5cf6",
      shipped: "#06b6d4",
      delivered: "#22c55e",
      cancelled: "#ef4444",
      refunded: "#6b7280",
    };
    return colors[status] || "#6b7280";
  };

  // Фильтрация заказов по поисковому запросу
  const filteredOrders = orders.filter(order => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(searchTerm) ||
      (order.status_display && order.status_display.toLowerCase().includes(searchLower)) ||
      order.grand_total.toString().includes(searchTerm) ||
      order.items_count.toString().includes(searchTerm)
    );
  });

  // Пагинация
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Обработчик изменения страницы
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({
      top: document.querySelector('.rounded-2xl.p-6.border').offsetTop - 20,
      behavior: 'smooth'
    });
  };

  // Компонент пагинации
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
        {/* Кнопка "Назад" */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-10 h-10 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-[var(--bg)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          aria-label="Предыдущая страница"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* Первая страница */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-200 hover:bg-[var(--bg)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              1
            </button>
            {startPage > 2 && <span className="px-2" style={{ color: 'var(--muted)' }}>...</span>}
          </>
        )}

        {/* Номера страниц */}
        {pageNumbers.map(number => (
          <button
            key={number}
            onClick={() => handlePageChange(number)}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
              currentPage === number 
                ? 'bg-[var(--primary)] text-white' 
                : 'border hover:bg-[var(--bg)]'
            }`}
            style={currentPage !== number ? { borderColor: 'var(--border)', color: 'var(--text)' } : {}}
          >
            {number}
          </button>
        ))}

        {/* Последняя страница */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2" style={{ color: 'var(--muted)' }}>...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="flex items-center justify-center w-10 h-10 rounded-lg border transition-all duration-200 hover:bg-[var(--bg)]"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Кнопка "Вперед" */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-10 h-10 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-[var(--bg)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          aria-label="Следующая страница"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        {/* Информация о странице */}
        <div className="text-sm ml-4" style={{ color: 'var(--muted)' }}>
          Страница {currentPage} из {totalPages}
        </div>
      </div>
    );
  };

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-[32px] md:text-[26px] font-bold m-0" style={{ color: 'var(--text)' }}>
            Личный кабинет
          </h1>
          {loggedIn && (
        <button
          className="flex items-center gap-2 py-2.5 px-4 bg-transparent border border-[var(--border)] rounded-[10px] text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 dark:hover:bg-red-500/20 dark:hover:border-red-500/30 dark:hover:text-red-400"
          style={{ color: 'var(--text)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Выйти
        </button>
          )}
        </div>

        {!loggedIn ? (
          <div
            className="text-center py-20 px-5 rounded-2xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <svg
              className="mb-5"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: 'var(--muted)' }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>

            <h3 className="m-0 mb-3 text-[22px]" style={{ color: 'var(--text)' }}>
              Вы не авторизованы
            </h3>
            <p className="m-0 mb-6 text-base" style={{ color: 'var(--muted)' }}>
              Войдите в аккаунт, чтобы видеть заказы и управлять профилем
            </p>

            <div className="flex gap-3 flex-wrap mt-4.5 justify-center">
              <Link
                className="inline-flex items-center justify-center py-3 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-sm font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline"
                to="/login"
              >
                Войти
              </Link>
              <Link
                className="inline-flex items-center justify-center py-3 px-4.5 bg-transparent border border-[var(--border)] rounded-[10px] text-sm font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] hover:no-underline"
                style={{ color: 'var(--text)' }}
                to="/register"
              >
                Регистрация
              </Link>
            </div>
          </div>
        ) : loading || !me ? (
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-6">
            <div
              className="h-55 rounded-2xl border relative overflow-hidden animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, var(--card) 25%, var(--border) 50%, var(--card) 75%)',
                backgroundSize: '200% 100%',
                borderColor: 'var(--border)',
              }}
            />
            <div
              className="h-55 rounded-2xl border relative overflow-hidden animate-shimmer"
              style={{
                background: 'linear-gradient(90deg, var(--card) 25%, var(--border) 50%, var(--card) 75%)',
                backgroundSize: '200% 100%',
                borderColor: 'var(--border)',
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-6 items-start">
            {/* Профиль */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-bold m-0" style={{ color: 'var(--text)' }}>
                  Профиль
                </div>
                {!editing && (
                  <button
                    className="py-2 px-3.5 bg-transparent border border-[var(--border)] rounded-lg text-[13px] font-medium cursor-pointer transition-all duration-200 text-[var(--primary)] hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white"
                    onClick={handleEdit}
                  >
                    Редактировать
                  </button>
                )}
              </div>

              {error && (
                <div className="py-3 px-4 mb-4 bg-red-50 border border-red-200 rounded-[10px] text-red-600 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="py-3 px-4 mb-4 bg-green-50 border border-green-200 rounded-[10px] text-green-600 text-sm">
                  {success}
                </div>
              )}

              {editing ? (
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                      Имя
                    </label>
                    <input
                      type="text"
                      className="py-3 px-3.5 rounded-[10px] border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                      Фамилия
                    </label>
                    <input
                      type="text"
                      className="py-3 px-3.5 rounded-[10px] border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                      Телефон
                    </label>
                    <input
                      type="tel"
                      className="py-3 px-3.5 rounded-[10px] border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center py-3 px-4.5 bg-transparent border border-[var(--border)] rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ color: 'var(--text)' }}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center py-3 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={saving}
                    >
                      {saving ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div
                    className="grid grid-cols-[140px_1fr] md:grid-cols-2 gap-3 md:gap-1.5 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Email</div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                      {me.email || "—"}
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-[140px_1fr] md:grid-cols-2 gap-3 md:gap-1.5 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Имя</div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                      {[me.first_name, me.last_name].filter(Boolean).join(" ") || "—"}
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-[140px_1fr] md:grid-cols-2 gap-3 md:gap-1.5 py-3 border-b"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Телефон</div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                      {me.phone || "—"}
                    </div>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] md:grid-cols-2 gap-3 md:gap-1.5 py-3">
                    <div className="text-[13px]" style={{ color: 'var(--muted)' }}>Дата регистрации</div>
                    <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                      {formatDate(me.date_joined)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Заказы */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="text-lg font-bold m-0" style={{ color: 'var(--text)' }}>
                  История заказов {filteredOrders.length !== orders.length ?
                    `(${filteredOrders.length} из ${orders.length})` :
                    `(${orders.length})`}
                </div>

                {orders.length > 0 && (
                  <input
                    type="text"
                    placeholder="Поиск по номеру или статусу..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Сброс на первую страницу при поиске
                    }}
                    className="p-2.5 rounded-lg border text-sm w-full md:w-64"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)'
                    }}
                  />
                )}
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <svg
                    className="mb-4"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  <p className="m-0 mb-5 text-[15px]" style={{ color: 'var(--muted)' }}>
                    У вас пока нет заказов
                  </p>
                  <Link
                    to="/catalog"
                    className="inline-flex items-center justify-center py-3 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-sm font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline"
                  >
                    Перейти в каталог
                  </Link>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <svg
                    className="mb-4"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    style={{ color: 'var(--muted)' }}
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                  <p className="m-0 mb-5 text-[15px]" style={{ color: 'var(--muted)' }}>
                    По вашему запросу заказов не найдено
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center justify-center py-3 px-4.5 bg-transparent border border-[var(--border)] rounded-[10px] text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-[var(--bg)]"
                    style={{ color: 'var(--text)' }}
                  >
                    Сбросить поиск
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    {currentOrders.map((order) => (
                      <Link
                        key={order.id}
                        to={`/orders/${order.id}`}
                        className="block p-4 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:shadow-sm hover:no-underline"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                            Заказ #{order.id}
                          </span>
                          <span
                            className="py-1 px-2.5 rounded-[20px] text-xs font-semibold text-white"
                            style={{ backgroundColor: getStatusColor(order.status) }}
                          >
                            {order.status_display}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                            {formatDate(order.created_at)}
                          </span>
                          <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
                            {formatPrice(order.grand_total)}
                          </span>
                        </div>
                        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                          {order.items_count} {order.items_count === 1 ? "товар" : order.items_count < 5 ? "товара" : "товаров"}
                        </div>
                      </Link>
                    ))}
                  </div>

                  <Pagination />

                  {filteredOrders.length > 0 && (
                    <div className="text-sm mt-4 pt-4 border-t text-center" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                      Показано {Math.min(indexOfLastOrder, filteredOrders.length)} из {filteredOrders.length} заказов
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Быстрые действия */}
            <div
              className="col-span-full rounded-2xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="text-lg font-bold m-0 mb-4" style={{ color: 'var(--text)' }}>
                Быстрые действия
              </div>
              <div className="grid grid-cols-4 lg:grid-cols-2 sm:grid-cols-2 gap-4">
                <Link
                  to="/cart"
                  className="flex flex-col items-center gap-2.5 py-5 sm:py-4 px-4 sm:px-3 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:bg-blue-500/5 hover:no-underline"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Корзина</span>
                </Link>
                <Link
                  to="/favorites"
                  className="flex flex-col items-center gap-2.5 py-5 sm:py-4 px-4 sm:px-3 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:bg-blue-500/5 hover:no-underline"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Избранное</span>
                </Link>
                <Link
                  to="/prescriptions"
                  className="flex flex-col items-center gap-2.5 py-5 sm:py-4 px-4 sm:px-3 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:bg-blue-500/5 hover:no-underline"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Мои рецепты</span>
                </Link>
                <Link
                  to="/lens-reminders"
                  className="flex flex-col items-center gap-2.5 py-5 sm:py-4 px-4 sm:px-3 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:bg-blue-500/5 hover:no-underline"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Напоминания</span>
                </Link>
                <Link
                  to="/booking"
                  className="flex flex-col items-center gap-2.5 py-5 sm:py-4 px-4 sm:px-3 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:bg-blue-500/5 hover:no-underline"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Запись на приём</span>
                </Link>
                <Link
                  to="/catalog"
                  className="flex flex-col items-center gap-2.5 py-5 sm:py-4 px-4 sm:px-3 rounded-xl border no-underline transition-all duration-200 hover:border-[var(--primary)] hover:bg-blue-500/5 hover:no-underline"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)]">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Каталог</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}