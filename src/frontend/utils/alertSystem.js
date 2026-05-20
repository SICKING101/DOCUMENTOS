// src/frontend/utils/alertSystem.js
// Sistema centralizado de alertas / toasts
// Exporta: showAlert, showNotification (alias), showProgress, hideAllAlerts


const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;

const ICONS = {
  success: 'check-circle',
  error: 'exclamation-circle',
  warning: 'exclamation-triangle',
  info: 'info-circle'
};

let container = null;
let toasts = [];

/* ======================================================
   Utilidades internas
   ====================================================== */
const ensureContainer = () => {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'alert-toasts-container';
  document.body.appendChild(container);
  return container;
};

const removeToast = (toastEl, immediate = false) => {
  if (!toastEl) return;
  const id = toastEl.dataset.toastId;
  toasts = toasts.filter(t => t.el !== toastEl);
  toastEl.classList.add('alert-toast--hide');
  const removeAfter = immediate ? 0 : 220;
  setTimeout(() => {
    toastEl.remove();
  }, removeAfter);
};

const createToastElement = ({ id, title, message, type, duration }) => {
  const icon = ICONS[type] || ICONS.info;

  const el = document.createElement('div');
  el.className = `alert-toast alert-toast--${type}`;
  el.dataset.toastId = id;

  el.innerHTML = `
    <div class="alert-toast__icon"><i class="fas fa-${icon}"></i></div>
    <div class="alert-toast__body">
      ${title ? `<p class="alert-toast__title">${title}</p>` : ''}
      <p class="alert-toast__message">${message}</p>
    </div>
    <button class="alert-toast__close" aria-label="Cerrar"><i class="fas fa-times"></i></button>
    <div class="alert-toast__progress" aria-hidden="true"></div>
  `;

  const closeBtn = el.querySelector('.alert-toast__close');
  closeBtn.addEventListener('click', () => removeToast(el, false));

  // Progress bar animation (shrinks to 0 over duration)
  const progress = el.querySelector('.alert-toast__progress');
  if (progress) {
    progress.style.transition = `width ${duration}ms linear`;
    // start full
    progress.style.width = '100%';
    // trigger shrink
    setTimeout(() => {
      progress.style.width = '0%';
    }, 20);
  }

  return el;
};

/* ======================================================
   API pública
   ====================================================== */

/**
 * showAlert(message, type = 'info', options = {})
 * type: 'success'|'error'|'warning'|'info'
 * options: { duration: 4000, position: 'top-right', title: null }
 */
export const showAlert = (message, type = 'info', options = {}) => {
  const { duration = DEFAULT_DURATION, title = null } = options;
  ensureContainer();

  // Cap de toasts: eliminar más viejo si estamos en límite
  if (toasts.length >= MAX_TOASTS) {
    const oldest = toasts.shift();
    if (oldest && oldest.el) removeToast(oldest.el, true);
  }

  const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const el = createToastElement({ id, title, message, type, duration });
  container.appendChild(el);

  // Forzar reflow y añadir clase para animación de entrada
  requestAnimationFrame(() => el.classList.add('alert-toast--show'));

  const timeoutId = setTimeout(() => removeToast(el, false), duration);

  toasts.push({ id, el, timeoutId });

  return id;
};

// Alias para compatibilidad con HistorialManager: this.showNotification(...)
export const showNotification = (message, type = 'info') => showAlert(message, type, {});

// showProgress: muestra/actualiza un toast de progreso (no auto-dismiss hasta completar)
export const showProgress = (message, current = 0, total = 1) => {
  ensureContainer();
  const progressId = 'alert-progress-toast';
  let existing = toasts.find(t => t.id === progressId);

  const percent = Math.max(0, Math.min(100, Math.round((current / Math.max(1, total)) * 100)));

  if (existing && existing.el) {
    const bodyMsg = existing.el.querySelector('.alert-toast__message');
    if (bodyMsg) bodyMsg.textContent = `${message} ${current} / ${total}`;
    const progress = existing.el.querySelector('.alert-toast__progress');
    if (progress) {
      progress.style.transition = 'width 300ms linear';
      progress.style.width = `${percent}%`;
    }

    if (current >= total) {
      existing.el.classList.remove('alert-toast--info');
      existing.el.classList.add('alert-toast--success');
      clearTimeout(existing.timeoutId);
      existing.timeoutId = setTimeout(() => removeToast(existing.el), 1200);
    }
    return progressId;
  }

  const id = progressId;
  const el = document.createElement('div');
  el.className = `alert-toast alert-toast--info`;
  el.dataset.toastId = id;
  el.innerHTML = `
    <div class="alert-toast__icon"><i class="fas fa-${ICONS.info}"></i></div>
    <div class="alert-toast__body">
      <p class="alert-toast__title">${message}</p>
      <p class="alert-toast__message">${message} ${current} / ${total}</p>
    </div>
    <button class="alert-toast__close" aria-label="Cerrar"><i class="fas fa-times"></i></button>
    <div class="alert-toast__progress" aria-hidden="true"></div>
  `;

  const closeBtn = el.querySelector('.alert-toast__close');
  closeBtn.addEventListener('click', () => removeToast(el, false));

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('alert-toast--show'));

  const progress = el.querySelector('.alert-toast__progress');
  if (progress) progress.style.width = `${percent}%`;

  const timeoutId = null;
  toasts.push({ id, el, timeoutId });
  return id;
};

// hideAllAlerts: elimina todas las alertas visibles inmediatamente
export const hideAllAlerts = () => {
  const copy = [...toasts];
  copy.forEach(t => {
    if (t.timeoutId) clearTimeout(t.timeoutId);
    removeToast(t.el, true);
  });
  toasts = [];
};