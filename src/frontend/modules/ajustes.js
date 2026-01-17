// src/frontend/modules/ajustes.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');

  // Cargar ajustes guardados
  const savedSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
  if (savedSettings.theme) {
    document.querySelector(`input[name="theme"][value="${savedSettings.theme}"]`).checked = true;
    setTheme(savedSettings.theme);
  }
  if (savedSettings.language) {
    document.querySelector('select[name="language"]').value = savedSettings.language;
  }
  if (savedSettings.notifications !== undefined) {
    document.querySelector('input[name="notifications"]').checked = savedSettings.notifications;
  }
  if (savedSettings.highContrast) {
    document.querySelector('input[name="highContrast"]').checked = true;
    document.body.classList.add('high-contrast');
  }
  if (savedSettings.fontSize) {
    document.querySelector('input[name="fontSize"]').checked = true;
    document.body.classList.add('large-font');
  }

  // Cambiar tema
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  });

  // Cambiar accesibilidad
  document.querySelector('input[name="highContrast"]').addEventListener('change', (e) => {
    document.body.classList.toggle('high-contrast', e.target.checked);
  });
  document.querySelector('input[name="fontSize"]').addEventListener('change', (e) => {
    document.body.classList.toggle('large-font', e.target.checked);
  });

  // Guardar ajustes
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const settings = {
      theme: form.theme.value,
      language: form.language.value,
      notifications: form.notifications.checked,
      highContrast: form.highContrast.checked,
      fontSize: form.fontSize.checked
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    alert('Ajustes guardados correctamente.');
  });

  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
});
