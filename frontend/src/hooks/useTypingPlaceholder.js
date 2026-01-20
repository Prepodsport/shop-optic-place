import { useState, useEffect } from "react";

/**
 * Хук для создания эффекта печатающегося placeholder
 * @param {string[]} phrases - Массив фраз для отображения
 * @param {number} typingSpeed - Скорость печати (мс на символ)
 * @param {number} deletingSpeed - Скорость удаления (мс на символ)
 * @param {number} pauseTime - Пауза между фразами (мс)
 * @returns {string} Текущий текст placeholder
 */
export function useTypingPlaceholder(
  phrases,
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseTime = 2000
) {
  const [currentText, setCurrentText] = useState("");
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!phrases || phrases.length === 0) return;

    const currentPhrase = phrases[currentPhraseIndex];

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          // Печатаем
          if (currentText.length < currentPhrase.length) {
            setCurrentText(currentPhrase.slice(0, currentText.length + 1));
          } else {
            // Фраза напечатана полностью, ждем перед удалением
            setTimeout(() => setIsDeleting(true), pauseTime);
          }
        } else {
          // Удаляем
          if (currentText.length > 0) {
            setCurrentText(currentText.slice(0, -1));
          } else {
            // Фраза полностью удалена, переходим к следующей
            setIsDeleting(false);
            setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
          }
        }
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [currentText, currentPhraseIndex, isDeleting, phrases, typingSpeed, deletingSpeed, pauseTime]);

  // Эффект для мигания курсора
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500); // Мигание каждые 500ms

    return () => clearInterval(cursorInterval);
  }, []);

  // Добавляем мигающий курсор
  return currentText + (showCursor ? "|" : " ");
}
