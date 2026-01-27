import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "./LensCalculator.css";

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
    <div className="container">
      <div className="breadcrumbs">
        <Link to="/">Главная</Link>
        <span>/</span>
        <span className="current">Калькулятор подбора линз</span>
      </div>

      <div className="lens-calculator">
        <div className="lens-calculator__header">
          <h1>Калькулятор подбора линз</h1>
          <p className="lens-calculator__subtitle">
            Введите данные вашего рецепта для получения рекомендаций по выбору контактных линз
          </p>
        </div>

        <div className="lens-calculator__content">
          <div className="lens-calculator__form">
            {/* Рецепт */}
            <div className="lens-calculator__section">
              <h2>Данные рецепта</h2>
              <p className="lens-calculator__hint">
                Введите значения из вашего рецепта на очки или контактные линзы
              </p>

              {/* OD - правый глаз */}
              <div className="lens-calculator__eye">
                <div className="lens-calculator__eye-label">
                  <span className="lens-calculator__eye-code">OD</span>
                  <span className="lens-calculator__eye-name">Правый глаз</span>
                </div>
                <div className="lens-calculator__eye-fields">
                  <div className="lens-calculator__field">
                    <label>SPH (сфера)</label>
                    <select
                      value={prescription.od.sph}
                      onChange={(e) => handleChange("od", "sph", e.target.value)}
                    >
                      <option value="">—</option>
                      {sphValues.map((v) => (
                        <option key={v} value={v}>
                          {parseFloat(v) > 0 ? `+${v}` : v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lens-calculator__field">
                    <label>CYL (цилиндр)</label>
                    <select
                      value={prescription.od.cyl}
                      onChange={(e) => handleChange("od", "cyl", e.target.value)}
                    >
                      <option value="">—</option>
                      {cylValues.map((v) =>
                        v ? (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                  <div className="lens-calculator__field">
                    <label>AXIS (ось)</label>
                    <select
                      value={prescription.od.axis}
                      onChange={(e) => handleChange("od", "axis", e.target.value)}
                      disabled={!prescription.od.cyl}
                    >
                      <option value="">—</option>
                      {axisValues.map((v) =>
                        v ? (
                          <option key={v} value={v}>
                            {v}°
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* OS - левый глаз */}
              <div className="lens-calculator__eye">
                <div className="lens-calculator__eye-label">
                  <span className="lens-calculator__eye-code">OS</span>
                  <span className="lens-calculator__eye-name">Левый глаз</span>
                </div>
                <div className="lens-calculator__eye-fields">
                  <div className="lens-calculator__field">
                    <label>SPH (сфера)</label>
                    <select
                      value={prescription.os.sph}
                      onChange={(e) => handleChange("os", "sph", e.target.value)}
                    >
                      <option value="">—</option>
                      {sphValues.map((v) => (
                        <option key={v} value={v}>
                          {parseFloat(v) > 0 ? `+${v}` : v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="lens-calculator__field">
                    <label>CYL (цилиндр)</label>
                    <select
                      value={prescription.os.cyl}
                      onChange={(e) => handleChange("os", "cyl", e.target.value)}
                    >
                      <option value="">—</option>
                      {cylValues.map((v) =>
                        v ? (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                  <div className="lens-calculator__field">
                    <label>AXIS (ось)</label>
                    <select
                      value={prescription.os.axis}
                      onChange={(e) => handleChange("os", "axis", e.target.value)}
                      disabled={!prescription.os.cyl}
                    >
                      <option value="">—</option>
                      {axisValues.map((v) =>
                        v ? (
                          <option key={v} value={v}>
                            {v}°
                          </option>
                        ) : null
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Тип линз */}
            <div className="lens-calculator__section">
              <h2>Предпочитаемый режим ношения</h2>
              <div className="lens-calculator__options">
                <label className={`lens-calculator__option ${lensType === "daily" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="lensType"
                    value="daily"
                    checked={lensType === "daily"}
                    onChange={(e) => setLensType(e.target.value)}
                  />
                  <span className="lens-calculator__option-content">
                    <strong>Однодневные</strong>
                    <span>Новая пара каждый день</span>
                  </span>
                </label>
                <label className={`lens-calculator__option ${lensType === "weekly" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="lensType"
                    value="weekly"
                    checked={lensType === "weekly"}
                    onChange={(e) => setLensType(e.target.value)}
                  />
                  <span className="lens-calculator__option-content">
                    <strong>Двухнедельные</strong>
                    <span>Замена каждые 14 дней</span>
                  </span>
                </label>
                <label className={`lens-calculator__option ${lensType === "monthly" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="lensType"
                    value="monthly"
                    checked={lensType === "monthly"}
                    onChange={(e) => setLensType(e.target.value)}
                  />
                  <span className="lens-calculator__option-content">
                    <strong>Месячные</strong>
                    <span>Замена каждый месяц</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Образ жизни */}
            <div className="lens-calculator__section">
              <h2>Ваш образ жизни</h2>
              <div className="lens-calculator__options">
                <label className={`lens-calculator__option ${lifestyle === "office" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="lifestyle"
                    value="office"
                    checked={lifestyle === "office"}
                    onChange={(e) => setLifestyle(e.target.value)}
                  />
                  <span className="lens-calculator__option-content">
                    <strong>Офисная работа</strong>
                    <span>Много времени за компьютером</span>
                  </span>
                </label>
                <label className={`lens-calculator__option ${lifestyle === "active" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="lifestyle"
                    value="active"
                    checked={lifestyle === "active"}
                    onChange={(e) => setLifestyle(e.target.value)}
                  />
                  <span className="lens-calculator__option-content">
                    <strong>Активный</strong>
                    <span>Спорт, движение</span>
                  </span>
                </label>
                <label className={`lens-calculator__option ${lifestyle === "mixed" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="lifestyle"
                    value="mixed"
                    checked={lifestyle === "mixed"}
                    onChange={(e) => setLifestyle(e.target.value)}
                  />
                  <span className="lens-calculator__option-content">
                    <strong>Смешанный</strong>
                    <span>Разные виды активности</span>
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Результаты */}
          <div className="lens-calculator__results">
            <h2>Результаты анализа</h2>

            {!hasInput ? (
              <div className="lens-calculator__empty">
                <p>Введите данные рецепта для получения рекомендаций</p>
              </div>
            ) : (
              <>
                {/* Диагноз */}
                <div className="lens-calculator__diagnosis">
                  <h3>Ваше зрение</h3>
                  {analysis.visionType === "normal" && (
                    <p className="lens-calculator__diagnosis-text">
                      Зрение в норме. Коррекция не требуется.
                    </p>
                  )}
                  {analysis.visionType === "myopia" && (
                    <p className="lens-calculator__diagnosis-text">
                      <strong>Близорукость (миопия)</strong> — {analysis.myopiaLevel} степень.
                      <br />
                      Вы хорошо видите вблизи, но плохо вдаль.
                    </p>
                  )}
                  {analysis.visionType === "hyperopia" && (
                    <p className="lens-calculator__diagnosis-text">
                      <strong>Дальнозоркость (гиперметропия)</strong> — {analysis.hyperopiaLevel} степень.
                      <br />
                      Вы хорошо видите вдаль, но плохо вблизи.
                    </p>
                  )}

                  {analysis.hasAstigmatism && (
                    <p className="lens-calculator__diagnosis-text lens-calculator__diagnosis-astigmatism">
                      <strong>Астигматизм</strong> — {analysis.astigmatismLevel}.
                      <br />
                      Роговица имеет неправильную форму, что вызывает искажение изображения.
                    </p>
                  )}
                </div>

                {/* Предупреждения */}
                {analysis.warnings.length > 0 && (
                  <div className="lens-calculator__warnings">
                    {analysis.warnings.map((warning, idx) => (
                      <div key={idx} className="lens-calculator__warning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Рекомендации */}
                <div className="lens-calculator__recommendations">
                  <h3>Рекомендации</h3>
                  <ul>
                    {analysis.recommendation?.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>

                {/* Ссылки */}
                <div className="lens-calculator__actions">
                  <Link
                    to={`/catalog?category=kontaktnye-linzy${analysis.hasAstigmatism ? "&attr_tip-linz=astigmaticheskie-linzy" : ""}`}
                    className="btn primary"
                  >
                    Подобрать линзы в каталоге
                  </Link>
                  <Link to="/booking" className="btn secondary">
                    Записаться на проверку зрения
                  </Link>
                </div>
              </>
            )}

            {/* Информация */}
            <div className="lens-calculator__info">
              <h3>Важно знать</h3>
              <ul>
                <li>Данный калькулятор носит информационный характер</li>
                <li>Окончательный подбор линз должен производить специалист</li>
                <li>Рецепт на очки и контактные линзы может отличаться</li>
                <li>Для первичного подбора линз необходима консультация офтальмолога</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
