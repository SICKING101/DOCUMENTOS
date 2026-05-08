// ============================================================
// chatbot-slide.js — Manejador del Panel Deslizante de ARIA
// CBTIS051 — Lógica de apertura/cierre con flecha animada
// ============================================================

const ARIA_SLIDE_DEBUG = true;

const logSlide = {
    info:  (...a) => ARIA_SLIDE_DEBUG && console.log('%c[ARIA-SLIDE]', 'color:#818cf8;font-weight:bold', ...a),
    error: (...a) => console.error('%c[ARIA-SLIDE-ERROR]', 'color:#ef4444;font-weight:bold', ...a),
};

class AriaSlidePanel {
    constructor(ariaInstance) {
        this.aria = ariaInstance;
        this.container = null;
        this.handle = null;
        this.panel = null;
        this.isOpen = false;
        this._init();
    }

    _init() {
        if (document.getElementById('ariaSlideContainer')) {
            logSlide.info('Contenedor slide ya existe, reutilizando...');
            this.container = document.getElementById('ariaSlideContainer');
            this.handle = document.getElementById('ariaSlideHandle');
            this.panel = document.getElementById('ariaSlidePanel');
            this._bindHandleEvent();
            return;
        }

        logSlide.info('Creando panel deslizante de ARIA...');
        this._buildUI();
        this._bindHandleEvent();
    }

    _buildUI() {
        // ── 1. Crear la estructura del slide ──────────────────
        this.container = document.createElement('div');
        this.container.id = 'ariaSlideContainer';
        this.container.innerHTML = `
            <div class="aria-slide-handle" id="ariaSlideHandle">
                <i class="fas fa-chevron-left aria-slide-arrow"></i>
            </div>
            <div class="aria-slide-panel" id="ariaSlidePanel"></div>
        `;
        document.body.appendChild(this.container);

        this.handle = document.getElementById('ariaSlideHandle');
        this.panel  = document.getElementById('ariaSlidePanel');

        // ── 2. Mover la ventana ORIGINAL dentro del panel ─────
        const originalWindow = document.getElementById('ariaWindow');
        if (originalWindow) {
            // Remover la clase closed si la tiene, para que sea visible
            originalWindow.classList.remove('aria-window--closed');
            // Mover el elemento (no clonar) preserva todos los event listeners
            this.panel.appendChild(originalWindow);
            logSlide.info('Ventana ARIA movida al panel deslizante.');
        } else {
            logSlide.error('No se encontró #ariaWindow. Asegúrate de que ARIA se haya inicializado.');
            return;
        }

        // ── 3. Ocultar el toggle original ─────────────────────
        const originalToggle = document.getElementById('ariaToggle');
        if (originalToggle) {
            originalToggle.style.display = 'none';
        }
    }

    _bindHandleEvent() {
        if (!this.handle) {
            logSlide.error('No se encontró el tirador #ariaSlideHandle.');
            return;
        }
        // Remover listener previo para evitar duplicados
        this.handle.removeEventListener('click', this._onHandleClick);
        this._onHandleClick = () => this.toggle();
        this.handle.addEventListener('click', this._onHandleClick);
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (!this.container) return;
        this.container.classList.add('open');
        this.isOpen = true;
        logSlide.info('Panel abierto');

        // Sincronizar con la instancia de ARIA
        if (this.aria) {
            this.aria.isOpen = true;
            this._updateAriaWindowVisibility(true);
        }

        window.dispatchEvent(new CustomEvent('aria:slidePanelOpened'));
    }

    close() {
        if (!this.container) return;
        this.container.classList.remove('open');
        this.isOpen = false;
        logSlide.info('Panel cerrado');

        // Sincronizar con la instancia de ARIA
        if (this.aria) {
            this.aria.isOpen = false;
        }

        window.dispatchEvent(new CustomEvent('aria:slidePanelClosed'));
    }

    /**
     * Actualiza la visibilidad de la ventana interna de ARIA
     * sin interferir con su lógica de clases.
     */
    _updateAriaWindowVisibility(visible) {
        const win = document.getElementById('ariaWindow');
        if (!win) return;
        if (visible) {
            win.classList.remove('aria-window--closed');
        }
        // Nota: No volvemos a agregar 'aria-window--closed' al cerrar
        // porque el contenedor padre se encarga de ocultarlo con translateX
    }
}

// ──────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────────────────────

let slidePanelInstance = null;

function initSlidePanel() {
    // Esperar a que ARIA esté listo
    if (!window.__aria) {
        logSlide.info('Esperando a que ARIA se inicialice...');
        setTimeout(initSlidePanel, 80);
        return;
    }

    if (slidePanelInstance) {
        logSlide.info('Panel deslizante ya inicializado.');
        return slidePanelInstance;
    }

    slidePanelInstance = new AriaSlidePanel(window.__aria);

    // ── Exponer función global ───────────────────────────────
    window.toggleAriaSlidePanel = () => {
        if (slidePanelInstance) slidePanelInstance.toggle();
    };

    // ── Sobrescribir métodos de ARIA para que usen el slide ──
    const aria = window.__aria;

    // Guardar originales (por si se necesitan)
    aria._originalToggle = aria.toggle;
    aria._originalOpen   = aria.open;
    aria._originalClose  = aria.close;

    aria.toggle = () => window.toggleAriaSlidePanel();
    aria.open   = () => {
        if (slidePanelInstance && !slidePanelInstance.isOpen) {
            slidePanelInstance.open();
        }
    };
    aria.close  = () => {
        if (slidePanelInstance && slidePanelInstance.isOpen) {
            slidePanelInstance.close();
        }
    };

    logSlide.info('Métodos de ARIA sobrescritos para usar el panel deslizante.');
    return slidePanelInstance;
}

// ── Arranque ──────────────────────────────────────────────────
if (document.readyState === 'complete') {
    initSlidePanel();
} else {
    window.addEventListener('load', initSlidePanel);
}