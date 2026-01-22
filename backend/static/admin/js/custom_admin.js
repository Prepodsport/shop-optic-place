// Кастомные скрипты для django-unfold админки

document.addEventListener('DOMContentLoaded', function() {
    // Показываем кнопку Run когда выбрано действие
    const actionSelect = document.querySelector('#changelist-actions select[name="action"]');
    const runButton = document.querySelector('#changelist-actions button[type="submit"]');

    if (actionSelect && runButton) {
        actionSelect.addEventListener('change', function() {
            if (this.value && this.value !== '') {
                runButton.style.display = 'block';
            } else {
                runButton.style.display = 'none';
            }
        });
    }
});
