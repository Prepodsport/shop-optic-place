import { useState, useEffect, useRef } from "react";
import { api } from "../../api.js";
import "./TopHeader.css";

const STORAGE_HIDDEN_ID = "optic_top_header_hidden_id";
const CLOSE_ANIM_MS = 300;

export default function TopHeader({ onStateChange }) {
  const [message, setMessage] = useState(null);
  const [isHidden, setIsHidden] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const barRef = useRef(null);

  useEffect(() => {
    fetchTopHeader();
  }, []);

  // Сообщаем Layout: offset = фактическая высота TopHeader
  // Ключевое: во время isClosing offset НЕ сбрасываем, чтобы не было скачка.
  useEffect(() => {
    const visibleForLayout = Boolean(message) && !isHidden; // ignore isClosing

    const update = () => {
      const h = visibleForLayout && barRef.current ? barRef.current.offsetHeight : 0;
      onStateChange?.({ visible: visibleForLayout, offset: h });
    };

    // после рендера измеряем корректно
    requestAnimationFrame(update);

    // и на ресайз обновляем
    const onResize = () => requestAnimationFrame(update);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [message, isHidden, onStateChange]);

  const fetchTopHeader = async () => {
    try {
      const resp = await api.get("/content/top-header/current/");
      const msg = resp.data;

      if (!msg) {
        setMessage(null);
        setIsHidden(false);
        setIsClosing(false);
        return;
      }

      setMessage(msg);

      const hiddenId = localStorage.getItem(STORAGE_HIDDEN_ID);
      if (hiddenId && String(hiddenId) === String(msg.id)) {
        setIsHidden(true);
        setIsClosing(false);
      } else {
        setIsHidden(false);
        setIsClosing(false);
        localStorage.removeItem(STORAGE_HIDDEN_ID);
      }
    } catch (error) {
      console.error("Ошибка загрузки топ-хедера:", error);
      setMessage(null);
      setIsHidden(false);
      setIsClosing(false);
    }
  };

  const handleClose = () => {
    if (!message) return;

    setIsClosing(true);

    setTimeout(() => {
      setIsHidden(true);       // только здесь offset станет 0
      setIsClosing(false);
      localStorage.setItem(STORAGE_HIDDEN_ID, String(message.id));
    }, CLOSE_ANIM_MS);
  };

  const handleShow = () => {
    setIsHidden(false);
    setIsClosing(false);
    localStorage.removeItem(STORAGE_HIDDEN_ID);
  };

  if (!message) return null;

  if (isHidden) {
    return (
      <button
        className="top-header__toggle"
        onClick={handleShow}
        title="Показать промо"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={barRef}
      className={`top-header ${isClosing ? "top-header--closing" : ""}`}
    >
      <div className="top-header__content">
        {message.link ? (
          <a href={message.link} className="top-header__link">
            {message.text}
          </a>
        ) : (
          <span className="top-header__text">{message.text}</span>
        )}
      </div>

      <button
        className="top-header__close"
        onClick={handleClose}
        aria-label="Скрыть"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}
