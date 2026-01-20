/**
 * Нормализует rich-text контент для безопасного отображения через dangerouslySetInnerHTML.
 * Обрабатывает как HTML, так и plain text с markdown-подобной разметкой списков.
 *
 * @param {string} input - Исходный текст (может быть HTML или plain text)
 * @returns {string} - HTML строка для отображения
 */
export function normalizeRichText(input) {
  if (!input) return "";

  const s1 = String(input)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\u00A0/g, " ");

  const s2 = s1.trim();
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(s2);

  if (hasHtml) {
    return s2.replace(/\n{2,}/g, "\n").replace(/\n/g, "");
  }

  const blocks = s2.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const isListLine = (line) => /^(\-|\*|•)\s+/.test(line);

  let html = "";
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    const listLines = lines.filter(isListLine);
    const nonListLines = lines.filter((l) => !isListLine(l));

    if (listLines.length && listLines.length === lines.length) {
      html += `<ul>${listLines
        .map((l) => `<li>${l.replace(/^(\-|\*|•)\s+/, "")}</li>`)
        .join("")}</ul>`;
      continue;
    }

    html += `<p>${nonListLines.join("<br/>")}</p>`;

    if (listLines.length) {
      html += `<ul>${listLines
        .map((l) => `<li>${l.replace(/^(\-|\*|•)\s+/, "")}</li>`)
        .join("")}</ul>`;
    }
  }

  return html;
}
