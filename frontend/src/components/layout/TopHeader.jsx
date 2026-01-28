import { useState, useEffect, useRef } from "react";
import { api } from "../../api.js";

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

  useEffect(() => {
    const visibleForLayout = Boolean(message) && !isHidden;

    const update = () => {
      const h = visibleForLayout && barRef.current ? barRef.current.offsetHeight : 0;
      onStateChange?.({ visible: visibleForLayout, offset: h });
    };

    requestAnimationFrame(update);

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
      setIsHidden(true);
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
        className="fixed top-0 right-4 text-white border-none rounded-b-lg px-3 py-1 cursor-pointer z-[1000] opacity-80 transition-opacity duration-200 flex items-center justify-center text-xs hover:opacity-100"
        style={{ background: 'var(--primary)' }}
        onClick={handleShow}
        title="Показать промо"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    );
  }

  return (
    <div
      ref={barRef}
      className={`fixed left-0 right-0 top-0 text-white py-2.5 px-4 flex items-center justify-center z-[999] ${
        isClosing ? 'animate-slide-up' : 'animate-slide-down'
      }`}
      style={{ background: 'linear-gradient(135deg, var(--primary), #1d4ed8)' }}
    >
      <div className="text-center text-sm font-medium">
        {message.link ? (
          <a
            href={message.link}
            className="text-white underline underline-offset-[3px] hover:no-underline"
          >
            {message.text}
          </a>
        ) : (
          <span className="text-white">{message.text}</span>
        )}
      </div>

      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-white cursor-pointer p-1 opacity-80 transition-opacity duration-200 flex items-center justify-center hover:opacity-100"
        onClick={handleClose}
        aria-label="Скрыть"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
