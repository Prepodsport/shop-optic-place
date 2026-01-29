import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

export default function LensCalculator() {
  const [prescription, setPrescription] = useState({
    od: { sph: "", cyl: "", axis: "" },
    os: { sph: "", cyl: "", axis: "" },
  });

  const [lensType, setLensType] = useState("daily"); // daily, weekly, monthly
  const [lifestyle, setLifestyle] = useState("office"); // office, active, mixed

  const handleChange = (eye, field, value) => {
    setPrescription((prev) => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: value },
    }));
  };

  // Генерируем значения для селектов
  const sphValues = useMemo(() => {
    const values = [];
    for (let i = -12; i <= 8; i += 0.25) {
      values.push(i.toFixed(2));
    }
    return values;
  }, []);

  const cylValues = useMemo(() => {
    const values = [""];
    for (let i = -6; i <= 0; i += 0.25) {
      if (i !== 0) values.push(i.toFixed(2));
    }
    return values;
  }, []);

  const axisValues = useMemo(() => {
    const values = [""];
    for (let i = 1; i <= 180; i++) {
      values.push(String(i));
    }
    return values;
  }, []);

  // Анализ рецепта
  const analysis = useMemo(() => {
    const result = {
      hasAstigmatism: false,
      astigmatismLevel: null,
      visionType: null,
      recommendation: null,
      warnings: [],
    };

    const odSph = parseFloat(prescription.od.sph) || 0;
    const osSph = parseFloat(prescription.os.sph) || 0;
    const odCyl = parseFloat(prescription.od.cyl) || 0;
    const osCyl = parseFloat(prescription.os.cyl) || 0;

    // Проверка на астигматизм
    if (odCyl !== 0 || osCyl !== 0) {
      result.hasAstigmatism = true;
      const maxCyl = Math.max(Math.abs(odCyl), Math.abs(osCyl));
      if (maxCyl <= 0.75) {
        result.astigmatismLevel = "легкий";
      } else if (maxCyl <= 2) {
        result.astigmatismLevel = "умеренный";
      } else {
        result.astigmatismLevel = "выраженный";
      }
    }

    // Определение типа зрения
    if (odSph === 0 && osSph === 0 && !result.hasAstigmatism) {
      result.visionType = "normal";
    } else if (odSph < 0 || osSph < 0) {
      result.visionType = "myopia"; // близорукость
      const maxSph = Math.max(Math.abs(odSph), Math.abs(osSph));
      if (maxSph <= 3) {
        result.myopiaLevel = "слабая";
      } else if (maxSph <= 6) {
        result.myopiaLevel = "средняя";
      } else {
        result.myopiaLevel = "высокая";
      }
    } else if (odSph > 0 || osSph > 0) {
      result.visionType = "hyperopia"; // дальнозоркость
      const maxSph = Math.max(odSph, osSph);
      if (maxSph <= 2) {
        result.hyperopiaLevel = "слабая";
      } else if (maxSph <= 4) {
        result.hyperopiaLevel = "средняя";
      } else {
        result.hyperopiaLevel = "высокая";
      }
    }

    // Предупреждения
    if (Math.abs(odSph - osSph) > 2) {
      result.warnings.push(
        "Значительная разница в диоптриях между глазами. Рекомендуется консультация офтальмолога."
      );
    }

    if (result.hasAstigmatism && result.astigmatismLevel === "выраженный") {
      result.warnings.push(
        "При выраженном астигматизме необходимы торические линзы. Обязательна консультация специалиста."
      );
    }

    // Рекомендации
    const recommendations = [];

    if (result.hasAstigmatism) {
      recommendations.push("Торические контактные линзы для коррекции астигматизма");
    } else {
      recommendations.push("Сферические контактные линзы");
    }

    if (lensType === "daily") {
      recommendations.push("Однодневные линзы — максимальный комфорт и гигиена");
    } else if (lensType === "weekly") {
      recommendations.push("Двухнедельные линзы — баланс цены и комфорта");
    } else {
      recommendations.push("Месячные линзы — экономичный вариант при правильном уходе");
    }

    if (lifestyle === "office") {
      recommendations.push("Линзы с защитой от синего света для работы за компьютером");
      recommendations.push("Увлажняющие капли для комфорта в офисе");
    } else if (lifestyle === "active") {
      recommendations.push("Линзы с высокой кислородопроницаемостью для активного образа жизни");
      recommendations.push("Стабильная посадка для занятий спортом");
    } else {
      recommendations.push("Универсальные линзы для любых условий");
    }

    result.recommendation = recommendations;

    return result;
  }, [prescription, lensType, lifestyle]);

  const hasInput =
    prescription.od.sph !== "" ||
    prescription.os.sph !== "" ||
    prescription.od.cyl !== "" ||
    prescription.os.cyl !== "";

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-[14px] mb-6" style={{ color: 'var(--muted)' }}>
        <Link to="/" className="no-underline hover:underline" style={{ color: 'var(--muted)' }}>Главная</Link>
        <span>/</span>
        <span style={{ color: 'var(--text)' }}>Калькулятор подбора линз</span>
      </div>

      <div className="py-8">
        <div className="text-center mb-10">
          <h1
            className="text-[32px] sm:text-[24px] font-bold m-0 mb-3"
            style={{ color: 'var(--text)' }}
          >
            Калькулятор подбора линз
          </h1>
          <p
            className="text-[16px] max-w-[600px] mx-auto m-0"
            style={{ color: 'var(--muted)' }}
          >
            Введите данные вашего рецепта для получения рекомендаций по выбору контактных линз
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-10 items-start">
          <div className="flex flex-col gap-8">
            {/* Рецепт */}
            <div
              className="rounded-xl p-6 sm:p-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2
                className="text-[18px] font-semibold m-0 mb-2"
                style={{ color: 'var(--text)' }}
              >
                Данные рецепта
              </h2>
              <p
                className="text-[14px] m-0 mb-5"
                style={{ color: 'var(--muted)' }}
              >
                Введите значения из вашего рецепта на очки или контактные линзы
              </p>

              {/* Селекты для обоих глаз в две колонки */}
              <div className="grid grid-cols-2 gap-6 md:grid-cols-2">
                {/* OD - правый глаз */}
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--bg)' }}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="inline-flex items-center justify-center w-9 h-9 bg-[var(--primary)] text-white font-bold text-[14px] rounded-lg">
                      OD
                    </span>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>Правый глаз</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                        SPH (сфера)
                      </label>
                      <div className="relative">
                        <select
                          value={prescription.od.sph}
                          onChange={(e) => handleChange("od", "sph", e.target.value)}
                          className="w-full py-2.5 px-3 pr-9 border rounded-lg text-[15px] cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="">—</option>
                          {sphValues.map((v) => (
                            <option key={v} value={v}>{parseFloat(v) > 0 ? `+${v}` : v}</option>
                          ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                        CYL (цилиндр)
                      </label>
                      <div className="relative">
                        <select
                          value={prescription.od.cyl}
                          onChange={(e) => handleChange("od", "cyl", e.target.value)}
                          className="w-full py-2.5 px-3 pr-9 border rounded-lg text-[15px] cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="">—</option>
                          {cylValues.map((v) => v ? <option key={v} value={v}>{v}</option> : null)}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                        AXIS (ось)
                      </label>
                      <div className="relative">
                        <select
                          value={prescription.od.axis}
                          onChange={(e) => handleChange("od", "axis", e.target.value)}
                          disabled={!prescription.od.cyl}
                          className="w-full py-2.5 px-3 pr-9 border rounded-lg text-[15px] cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="">—</option>
                          {axisValues.map((v) => v ? <option key={v} value={v}>{v}°</option> : null)}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* OS - левый глаз */}
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--bg)' }}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <span className="inline-flex items-center justify-center w-9 h-9 bg-[var(--primary)] text-white font-bold text-[14px] rounded-lg">
                      OS
                    </span>
                    <span className="text-[14px] font-medium" style={{ color: 'var(--text)' }}>Левый глаз</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                        SPH (сфера)
                      </label>
                      <div className="relative">
                        <select
                          value={prescription.os.sph}
                          onChange={(e) => handleChange("os", "sph", e.target.value)}
                          className="w-full py-2.5 px-3 pr-9 border rounded-lg text-[15px] cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="">—</option>
                          {sphValues.map((v) => (
                            <option key={v} value={v}>{parseFloat(v) > 0 ? `+${v}` : v}</option>
                          ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                        CYL (цилиндр)
                      </label>
                      <div className="relative">
                        <select
                          value={prescription.os.cyl}
                          onChange={(e) => handleChange("os", "cyl", e.target.value)}
                          className="w-full py-2.5 px-3 pr-9 border rounded-lg text-[15px] cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="">—</option>
                          {cylValues.map((v) => v ? <option key={v} value={v}>{v}</option> : null)}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold uppercase mb-1.5" style={{ color: 'var(--muted)' }}>
                        AXIS (ось)
                      </label>
                      <div className="relative">
                        <select
                          value={prescription.os.axis}
                          onChange={(e) => handleChange("os", "axis", e.target.value)}
                          disabled={!prescription.os.cyl}
                          className="w-full py-2.5 px-3 pr-9 border rounded-lg text-[15px] cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        >
                          <option value="">—</option>
                          {axisValues.map((v) => v ? <option key={v} value={v}>{v}°</option> : null)}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Тип линз */}
            <div
              className="rounded-xl p-6 sm:p-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2
                className="text-[18px] font-semibold m-0 mb-2"
                style={{ color: 'var(--text)' }}
              >
                Предпочитаемый режим ношения
              </h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: "daily", label: "Однодневные", desc: "Новая пара каждый день" },
                  { value: "weekly", label: "Двухнедельные", desc: "Замена каждые 14 дней" },
                  { value: "monthly", label: "Месячные", desc: "Замена каждый месяц" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center py-3.5 px-4 rounded-[10px] cursor-pointer transition-all duration-200 border-2 ${
                      lensType === opt.value
                        ? 'border-[var(--primary)] bg-blue-500/5'
                        : 'border-transparent hover:bg-[var(--border)]'
                    }`}
                    style={{ background: lensType === opt.value ? undefined : 'var(--bg)' }}
                  >
                    <input
                      type="radio"
                      name="lensType"
                      value={opt.value}
                      checked={lensType === opt.value}
                      onChange={(e) => setLensType(e.target.value)}
                      className="hidden"
                    />
                    <span className="flex flex-col gap-0.5">
                      <strong className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                        {opt.label}
                      </strong>
                      <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                        {opt.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Образ жизни */}
            <div
              className="rounded-xl p-6 sm:p-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2
                className="text-[18px] font-semibold m-0 mb-2"
                style={{ color: 'var(--text)' }}
              >
                Ваш образ жизни
              </h2>
              <div className="flex flex-col gap-2.5">
                {[
                  { value: "office", label: "Офисная работа", desc: "Много времени за компьютером" },
                  { value: "active", label: "Активный", desc: "Спорт, движение" },
                  { value: "mixed", label: "Смешанный", desc: "Разные виды активности" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center py-3.5 px-4 rounded-[10px] cursor-pointer transition-all duration-200 border-2 ${
                      lifestyle === opt.value
                        ? 'border-[var(--primary)] bg-blue-500/5'
                        : 'border-transparent hover:bg-[var(--border)]'
                    }`}
                    style={{ background: lifestyle === opt.value ? undefined : 'var(--bg)' }}
                  >
                    <input
                      type="radio"
                      name="lifestyle"
                      value={opt.value}
                      checked={lifestyle === opt.value}
                      onChange={(e) => setLifestyle(e.target.value)}
                      className="hidden"
                    />
                    <span className="flex flex-col gap-0.5">
                      <strong className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                        {opt.label}
                      </strong>
                      <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
                        {opt.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Результаты */}
          <div
            className="rounded-xl p-6 sm:p-4 border sticky top-[100px] lg:static"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h2
              className="text-[18px] font-semibold m-0 mb-5 pb-4 border-b"
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
            >
              Результаты анализа
            </h2>

            {!hasInput ? (
              <div className="text-center py-10 px-5" style={{ color: 'var(--muted)' }}>
                <p>Введите данные рецепта для получения рекомендаций</p>
              </div>
            ) : (
              <>
                {/* Диагноз */}
                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-3"
                    style={{ color: 'var(--muted)' }}
                  >
                    Ваше зрение
                  </h3>
                  {analysis.visionType === "normal" && (
                    <p
                      className="text-[15px] leading-relaxed m-0 mb-3 p-3 rounded-lg last:mb-0"
                      style={{ color: 'var(--text)', background: 'var(--bg)' }}
                    >
                      Зрение в норме. Коррекция не требуется.
                    </p>
                  )}
                  {analysis.visionType === "myopia" && (
                    <p
                      className="text-[15px] leading-relaxed m-0 mb-3 p-3 rounded-lg"
                      style={{ color: 'var(--text)', background: 'var(--bg)' }}
                    >
                      <strong>Близорукость (миопия)</strong> — {analysis.myopiaLevel} степень.
                      <br />
                      Вы хорошо видите вблизи, но плохо вдаль.
                    </p>
                  )}
                  {analysis.visionType === "hyperopia" && (
                    <p
                      className="text-[15px] leading-relaxed m-0 mb-3 p-3 rounded-lg"
                      style={{ color: 'var(--text)', background: 'var(--bg)' }}
                    >
                      <strong>Дальнозоркость (гиперметропия)</strong> — {analysis.hyperopiaLevel} степень.
                      <br />
                      Вы хорошо видите вдаль, но плохо вблизи.
                    </p>
                  )}

                  {analysis.hasAstigmatism && (
                    <p
                      className="text-[15px] leading-relaxed m-0 p-3 rounded-lg border-l-[3px] border-l-amber-500"
                      style={{ color: 'var(--text)', background: 'var(--bg)' }}
                    >
                      <strong>Астигматизм</strong> — {analysis.astigmatismLevel}.
                      <br />
                      Роговица имеет неправильную форму, что вызывает искажение изображения.
                    </p>
                  )}
                </div>

                {/* Предупреждения */}
                {analysis.warnings.length > 0 && (
                  <div className="mb-6">
                    {analysis.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg border mb-2.5 last:mb-0"
                        style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span className="text-[14px] leading-relaxed text-red-600">
                          {warning}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Рекомендации */}
                <div className="mb-6">
                  <h3
                    className="text-[14px] font-semibold uppercase m-0 mb-3"
                    style={{ color: 'var(--muted)' }}
                  >
                    Рекомендации
                  </h3>
                  <ul className="list-none p-0 m-0">
                    {analysis.recommendation?.map((rec, idx) => (
                      <li
                        key={idx}
                        className="relative pl-5 text-[14px] leading-relaxed mb-2 last:mb-0 before:content-[''] before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:bg-[var(--primary)] before:rounded-full"
                        style={{ color: 'var(--text)' }}
                      >
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ссылки */}
                <div className="flex flex-col gap-2.5 mb-6">
                  <Link
                    to={`/catalog?category=kontaktnye-linzy${analysis.hasAstigmatism ? "&attr_tip-linz=astigmaticheskie-linzy" : ""}`}
                    className="text-center no-underline py-3 px-5 rounded-lg text-[14px] font-semibold transition-all duration-200 bg-[var(--primary)] text-white border-none hover:bg-blue-700"
                  >
                    Подобрать линзы в каталоге
                  </Link>
                  <Link
                    to="/booking"
                    className="text-center no-underline py-3 px-5 rounded-lg text-[14px] font-semibold transition-all duration-200 border hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    Записаться на проверку зрения
                  </Link>
                </div>
              </>
            )}

            {/* Информация */}
            <div
              className="pt-5 border-t"
              style={{ borderColor: 'var(--border)' }}
            >
              <h3
                className="text-[14px] font-semibold m-0 mb-3"
                style={{ color: 'var(--muted)' }}
              >
                Важно знать
              </h3>
              <ul className="list-none p-0 m-0">
                {[
                  "Данный калькулятор носит информационный характер",
                  "Окончательный подбор линз должен производить специалист",
                  "Рецепт на очки и контактные линзы может отличаться",
                  "Для первичного подбора линз необходима консультация офтальмолога",
                ].map((item, idx) => (
                  <li
                    key={idx}
                    className="text-[13px] leading-relaxed mb-1.5 pl-4 relative before:content-['•'] before:absolute before:left-0"
                    style={{ color: 'var(--muted)' }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
