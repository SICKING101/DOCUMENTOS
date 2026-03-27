// ============================================================
// chatbot.js — ARIA v3.2 Frontend
// CBTIS051 — Navegación sin errores, acciones reales,
// creación de tareas, generación de reportes (Excel/CSV)
// ============================================================

import { api } from '../services/api.js';
import { showAlert } from '../utils.js';

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER
// ──────────────────────────────────────────────────────────────
const ARIA_DEBUG = true;

const log = {
    info:   (...a) => ARIA_DEBUG && console.log  ('%c[ARIA]',        'color:#818cf8;font-weight:bold', ...a),
    warn:   (...a) => ARIA_DEBUG && console.warn ('%c[ARIA-WARN]',   'color:#f59e0b;font-weight:bold', ...a),
    error:  (...a) =>               console.error('%c[ARIA-ERROR]',  'color:#ef4444;font-weight:bold', ...a),
    action: (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-ACTION]', 'color:#34d399;font-weight:bold', ...a),
    nav:    (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-NAV]',    'color:#60a5fa;font-weight:bold', ...a),
    voice:  (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-VOICE]',  'color:#f59e0b;font-weight:bold', ...a),
    report: (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-REPORT]', 'color:#10b981;font-weight:bold', ...a),
};

// ──────────────────────────────────────────────────────────────
// CONSTANTES DE NAVEGACIÓN
// ──────────────────────────────────────────────────────────────
const NAV_MAP = {
    dashboard:       { hash: '#/dashboard',       label: 'Dashboard',       icon: 'fa-tachometer-alt',  tabId: 'dashboard'       },
    documentos:      { hash: '#/documentos',      label: 'Documentos',      icon: 'fa-file-alt',        tabId: 'documentos'      },
    personas:        { hash: '#/personas',        label: 'Personas',        icon: 'fa-users',           tabId: 'personas'        },
    tareas:          { hash: '#/tareas',          label: 'Tareas',          icon: 'fa-check-square',    tabId: 'tareas'          },
    reportes:        { hash: '#/reportes',        label: 'Reportes',        icon: 'fa-chart-bar',       tabId: 'reportes'        },
    papelera:        { hash: '#/papelera',        label: 'Papelera',        icon: 'fa-trash-alt',       tabId: 'papelera'        },
    notificaciones:  { hash: '#/notificaciones',  label: 'Notificaciones',  icon: 'fa-bell',            tabId: 'notificaciones'  },
    ajustes:         { hash: '#/ajustes',         label: 'Ajustes',         icon: 'fa-cog',             tabId: 'ajustes'         },
    soporte:         { hash: '#/soporte',         label: 'Soporte',         icon: 'fa-life-ring',       tabId: 'soporte'         },
    categorias:      { hash: '#/categorias',      label: 'Categorías',      icon: 'fa-folder',          tabId: 'categorias'      },
    departamentos:   { hash: '#/departamentos',   label: 'Departamentos',   icon: 'fa-building',        tabId: 'departamentos'   },
};

const MODAL_LABELS = {
    upload:        'Subir Documento',
    addPerson:     'Agregar Persona',
    addTask:       'Nueva Tarea',
    addCategory:   'Nueva Categoría',
    addDepartment: 'Nuevo Departamento',
    search:        'Búsqueda Avanzada',
};

// ──────────────────────────────────────────────────────────────
// CLASE PRINCIPAL CHATBOT
// ──────────────────────────────────────────────────────────────
class ChatbotAssistant {

    constructor() {
        this.isOpen      = false;
        this.isLoading   = false;
        this.messages    = [];
        this.systemStats = null;
        this.userContext = null;

        // Voice
        this.recognition = null;
        this.isListening = false;
        this.voiceRetryCount = 0;
        this.voiceMaxRetries = 2;

        // Report progress
        this._reportProgressInterval = null;
        this._currentFormat = 'excel';

        // DOM refs
        this._els = {};

        // Quick suggestions por defecto
        this.quickSuggestions = [
            'Resumen del sistema',
            'Mis tareas pendientes',
            '¿Qué documentos vencen pronto?',
            'Genera reporte general en Excel',
            'Crear tarea: Revisar documentos',
            '¿Qué puedes hacer?',
        ];

        this._init();
    }

    // ──────────────────────────────────────────────────────────
    // INICIALIZACIÓN
    // ──────────────────────────────────────────────────────────
    async _init() {
        log.info('Inicializando ARIA v3.2...');
        this._loadUserContext();
        this._createUI();
        this._bindEvents();
        this._initVoice();

        const [, history] = await Promise.allSettled([
            this._loadStats(),
            this._loadHistory(),
        ]);

        setTimeout(() => this._showWelcomeBadge(), 3500);
        log.info('ARIA v3.2 lista ✅');
    }

    _loadUserContext() {
        try {
            const raw  = localStorage.getItem('user') || sessionStorage.getItem('user');
            const user = raw ? JSON.parse(raw) : {};
            this.userContext = {
                id:     user._id || user.id,
                nombre: user.usuario || user.name || user.nombre || 'Usuario',
                rol:    user.rol || user.role || 'usuario',
            };
            log.info('Contexto usuario:', this.userContext);
        } catch (e) {
            log.warn('Error cargando contexto usuario:', e.message);
            this.userContext = { nombre: 'Usuario', rol: 'usuario' };
        }
    }

    async _loadStats() {
        try {
            const res = await api.call('/chatbot/stats', { method: 'GET' });
            if (res?.success) {
                this.systemStats = res.data;
                log.info('Estadísticas cargadas');
            }
        } catch (e) {
            log.warn('No se pudieron cargar estadísticas:', e.message);
        }
    }

    // ──────────────────────────────────────────────────────────
    // CREAR UI
    // ──────────────────────────────────────────────────────────
    _createUI() {
        if (document.getElementById('ariaContainer')) {
            log.warn('UI ya existe, saltando creación');
            this._cacheEls();
            return;
        }

        const container = document.createElement('div');
        container.id        = 'ariaContainer';
        container.className = 'aria-container';
        container.innerHTML = this._getTemplate();
        document.body.appendChild(container);

        this._cacheEls();
        log.info('UI creada');
    }

    _cacheEls() {
        this._els = {
            toggle:      document.getElementById('ariaToggle'),
            window:      document.getElementById('ariaWindow'),
            messages:    document.getElementById('ariaMessages'),
            input:       document.getElementById('ariaInput'),
            send:        document.getElementById('ariaSend'),
            badge:       document.getElementById('ariaBadge'),
            status:      document.getElementById('ariaStatus'),
            typing:      document.getElementById('ariaTyping'),
            suggestions: document.getElementById('ariaSuggestions'),
            charCount:   document.getElementById('ariaCharCount'),
            voiceBtn:    document.getElementById('ariaVoice'),
        };
    }

    _getTemplate() {
        return /* html */`
        <button class="aria-toggle" id="ariaToggle" aria-label="Abrir ARIA">
            <span class="aria-toggle__icon"><i class="fas fa-robot"></i></span>
            <span class="aria-toggle__pulse"></span>
            <span class="aria-badge" id="ariaBadge" style="display:none">1</span>
        </button>

        <div class="aria-window aria-window--closed" id="ariaWindow" role="dialog" aria-label="Asistente ARIA">

            <!-- Header -->
            <div class="aria-header">
                <div class="aria-header__identity">
                    <div class="aria-avatar">
                        <i class="fas fa-robot"></i>
                        <span class="aria-avatar__dot" id="ariaOnlineDot"></span>
                    </div>
                    <div class="aria-header__info">
                        <span class="aria-header__name">ARIA</span>
                        <span class="aria-header__sub" id="ariaStatus">Cargando...</span>
                    </div>
                </div>
                <div class="aria-header__actions">
                    <button class="aria-btn-icon" id="ariaHistoryBtn"  title="Cargar historial del servidor"><i class="fas fa-history"></i></button>
                    <button class="aria-btn-icon" id="ariaClearBtn"    title="Nueva conversación"><i class="fas fa-broom"></i></button>
                    <button class="aria-btn-icon" id="ariaExportBtn"   title="Exportar conversación"><i class="fas fa-download"></i></button>
                    <button class="aria-btn-icon aria-btn-close" id="ariaClose" title="Cerrar (Esc)"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- Mensajes -->
            <div class="aria-messages" id="ariaMessages" role="log" aria-live="polite"></div>

            <!-- Indicador de escritura -->
            <div class="aria-typing" id="ariaTyping" style="display:none" aria-hidden="true">
                <div class="aria-typing__avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-typing__dots"><span></span><span></span><span></span></div>
            </div>

            <!-- Sugerencias -->
            <div class="aria-suggestions-bar" id="ariaSuggestionsBar">
                <div class="aria-suggestions__inner" id="ariaSuggestions"></div>
            </div>

            <!-- Input -->
            <div class="aria-input-area">
                <div class="aria-input-row">
                    <textarea
                        id="ariaInput"
                        class="aria-input"
                        rows="1"
                        placeholder="Pregúntame lo que quieras..."
                        maxlength="1500"
                        aria-label="Mensaje para ARIA"
                    ></textarea>
                    <button class="aria-voice-btn" id="ariaVoice" title="Voz (micrófono)" aria-label="Entrada de voz">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="aria-send-btn" id="ariaSend" title="Enviar (Ctrl+Enter)" disabled aria-label="Enviar mensaje">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="aria-input-meta">
                    <span class="aria-char-count" id="ariaCharCount">0 / 1500</span>
                    <span class="aria-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> para enviar</span>
                </div>
            </div>

        </div>`;
    }

    // ──────────────────────────────────────────────────────────
    // EVENTOS
    // ──────────────────────────────────────────────────────────
    _bindEvents() {
        const e = this._els;

        e.toggle.addEventListener('click',  () => this.toggle());
        document.getElementById('ariaClose').addEventListener('click', () => this.close());
        e.send.addEventListener('click',    () => this._sendMessage());

        e.input.addEventListener('input', () => {
            this._autoResize();
            this._updateSendBtn();
            this._updateCharCount();
        });

        e.input.addEventListener('keydown', ev => {
            if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
                ev.preventDefault();
                this._sendMessage();
            }
        });

        document.getElementById('ariaClearBtn').addEventListener('click',   () => this._clearChat());
        document.getElementById('ariaExportBtn').addEventListener('click',  () => this._exportChat());
        document.getElementById('ariaHistoryBtn').addEventListener('click', () => this._loadFromServer());
        document.getElementById('ariaVoice').addEventListener('click',      () => this._toggleVoice());

        // Sugerencias (event delegation)
        e.suggestions.addEventListener('click', ev => {
            const btn = ev.target.closest('[data-query]');
            if (btn) {
                e.input.value = btn.dataset.query;
                this._autoResize();
                this._updateSendBtn();
                this._sendMessage();
            }
        });

        // Clicks en mensajes (navegación + botones de acción)
        document.getElementById('ariaMessages').addEventListener('click', ev => {
            const navBtn = ev.target.closest('[data-nav]');
            if (navBtn) {
                log.nav('Clic nav-btn:', navBtn.dataset.nav);
                this._doNavigate(navBtn.dataset.nav);
                return;
            }

            const modalBtn = ev.target.closest('[data-modal]');
            if (modalBtn) {
                log.action('Clic modal-btn:', modalBtn.dataset.modal);
                this._doOpenModal(modalBtn.dataset.modal);
                return;
            }

            const copyBtn = ev.target.closest('[data-copy]');
            if (copyBtn) {
                navigator.clipboard?.writeText(copyBtn.dataset.copy)
                    .then(() => showAlert('Copiado', 'success'))
                    .catch(() => log.warn('No se pudo copiar'));
                return;
            }

            const fbBtn = ev.target.closest('[data-feedback]');
            if (fbBtn) {
                this._sendFeedback(fbBtn.dataset.convId, fbBtn.dataset.feedback === 'true');
                fbBtn.classList.add('aria-feedback-btn--active');
            }
        });

        document.addEventListener('keydown', ev => {
            if (ev.key === 'Escape' && this.isOpen) this.close();
        });
    }

    // ──────────────────────────────────────────────────────────
    // RECONOCIMIENTO DE VOZ - MEJORADO
    // ──────────────────────────────────────────────────────────
    _initVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SR) {
            log.warn('Reconocimiento de voz no disponible en este navegador');
            if (this._els.voiceBtn) {
                this._els.voiceBtn.style.display = 'none';
            }
            return;
        }

        try {
            this.recognition = new SR();
            this.recognition.lang = 'es-MX';
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;
            this.recognition.continuous = false;

            this.recognition.onstart = () => {
                log.voice('Reconocimiento de voz iniciado');
                this.isListening = true;
                this._updateVoiceUI(true);
            };

            this.recognition.onresult = (ev) => {
                const text = ev.results[0][0].transcript;
                log.voice('Texto reconocido:', text);
                this._els.input.value = text;
                this._autoResize();
                this._updateSendBtn();
                
                setTimeout(() => {
                    if (this._els.input.value.trim()) {
                        this._sendMessage();
                    }
                }, 500);
                
                this._stopVoice();
            };

            this.recognition.onerror = (ev) => {
                log.error('Error de voz:', ev.error);
                
                switch(ev.error) {
                    case 'not-allowed':
                        showAlert('Permite el acceso al micrófono para usar voz.', 'warning');
                        break;
                    case 'no-speech':
                        log.voice('No se detectó voz');
                        showAlert('No detecté tu voz. Intenta de nuevo.', 'info', 2000);
                        break;
                    case 'aborted':
                        log.voice('Reconocimiento abortado (normal)');
                        break;
                    case 'network':
                        showAlert('Error de red. Revisa tu conexión.', 'error');
                        break;
                    default:
                        if (this.voiceRetryCount < this.voiceMaxRetries) {
                            this.voiceRetryCount++;
                            log.voice(`Reintentando (${this.voiceRetryCount}/${this.voiceMaxRetries})...`);
                            setTimeout(() => {
                                if (this.isListening) {
                                    this._startVoice();
                                }
                            }, 1000);
                        } else {
                            showAlert(`Error de voz: ${ev.error}. Intenta manualmente.`, 'warning');
                            this.voiceRetryCount = 0;
                        }
                }
                
                this._stopVoice();
            };

            this.recognition.onend = () => {
                log.voice('Reconocimiento finalizado');
                this._stopVoice();
            };

            log.info('Reconocimiento de voz inicializado correctamente');
        } catch (e) {
            log.error('Error al inicializar reconocimiento de voz:', e);
            if (this._els.voiceBtn) {
                this._els.voiceBtn.style.display = 'none';
            }
        }
    }

    _startVoice() {
        if (!this.recognition || this.isListening) return;
        
        try {
            this.recognition.start();
            this.isListening = true;
            this._updateVoiceUI(true);
            this.voiceRetryCount = 0;
        } catch (e) {
            log.error('Error al iniciar reconocimiento:', e);
            this._stopVoice();
            showAlert('No se pudo iniciar el reconocimiento de voz', 'error');
        }
    }

    _stopVoice() {
        if (!this.recognition) return;
        
        try {
            if (this.isListening && this.recognition) {
                this.recognition.stop();
            }
        } catch (e) {
            log.error('Error al detener reconocimiento:', e);
        }
        
        this.isListening = false;
        this._updateVoiceUI(false);
    }

    _updateVoiceUI(isListening) {
        if (!this._els.voiceBtn) return;
        
        const icon = this._els.voiceBtn.querySelector('i');
        if (isListening) {
            this._els.voiceBtn.classList.add('aria-voice-btn--listening');
            icon.className = 'fas fa-microphone-slash';
            this._els.voiceBtn.title = 'Detener grabación';
        } else {
            this._els.voiceBtn.classList.remove('aria-voice-btn--listening');
            icon.className = 'fas fa-microphone';
            this._els.voiceBtn.title = 'Entrada de voz';
        }
    }

    _toggleVoice() {
        if (!this.recognition) {
            showAlert('Reconocimiento de voz no disponible en este navegador', 'warning');
            return;
        }
        
        if (this.isListening) {
            this._stopVoice();
        } else {
            this._startVoice();
        }
    }

    // ──────────────────────────────────────────────────────────
    // ABRIR / CERRAR
    // ──────────────────────────────────────────────────────────
    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
        this.isOpen = true;
        this._els.window.classList.remove('aria-window--closed');
        this._els.toggle.classList.add('aria-toggle--open');
        this._els.badge.style.display = 'none';
        this._setStatus('En línea');
        setTimeout(() => this._els.input?.focus(), 100);
        log.info('Chatbot abierto');
    }

    close() {
        this.isOpen = false;
        this._els.window.classList.add('aria-window--closed');
        this._els.toggle.classList.remove('aria-toggle--open');
        if (this.isListening) { this._stopVoice(); }
        log.info('Chatbot cerrado');
    }

    // ──────────────────────────────────────────────────────────
    // HISTORIAL Y BIENVENIDA
    // ──────────────────────────────────────────────────────────
    async _loadHistory() {
        try {
            const res = await api.call('/chatbot/history?limit=12', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user',      content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse, timestamp: h.timestamp },
                ]);
                this._renderAll();
                log.info(`Historial del servidor cargado: ${res.data.length} conversaciones`);
                return;
            }
        } catch (e) {
            log.warn('No se pudo cargar historial del servidor:', e.message);
        }

        try {
            const saved = localStorage.getItem('aria_history_v3');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.length > 0) {
                    this.messages = parsed.slice(-30);
                    this._renderAll();
                    log.info('Historial de localStorage cargado');
                    return;
                }
            }
        } catch (e) {
            log.warn('Error leyendo localStorage:', e.message);
        }

        this._showWelcome();
    }

    async _loadFromServer() {
        this._setStatus('Cargando historial...');
        try {
            const res = await api.call('/chatbot/history?limit=20', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user',      content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse, timestamp: h.timestamp },
                ]);
                this._renderAll();
                showAlert(`${res.data.length} conversaciones cargadas`, 'success');
            } else {
                showAlert('No hay historial guardado en el servidor', 'info');
            }
        } catch (e) {
            log.error('Error cargando historial:', e.message);
            showAlert('No se pudo cargar el historial', 'error');
        }
        this._setStatus('En línea');
    }

    _showWelcome() {
        const stats  = this.systemStats || {};
        const nombre = this.userContext?.nombre || 'usuario';
        const hora   = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

        const alertas = [];
        if (stats.docsPorVencer7 > 0) alertas.push(`⚠️ **${stats.docsPorVencer7}** doc(s) vencen en 7 días`);
        if (stats.docsVencidos   > 0) alertas.push(`🔴 **${stats.docsVencidos}** doc(s) vencidos`);
        if (stats.tareas?.vencidas > 0) alertas.push(`🚨 **${stats.tareas.vencidas}** tarea(s) vencidas`);

        const content = [
            `${saludo}, **${nombre}** 👋 Soy **ARIA**, tu asistente del sistema CBTIS051.`,
            '',
            `📊 **Estado del sistema:**`,
            `• ${stats.totalDocs       ?? 0} documentos activos`,
            `• ${stats.totalPersonas   ?? 0} personas registradas`,
            `• ${stats.tareas?.pendientes ?? 0} tareas pendientes`,
            `• ${stats.totalCategorias ?? 0} categorías`,
            ...(alertas.length > 0 ? ['', '🔔 **Alertas activas:**', ...alertas] : []),
            '',
            `✨ **Lo que puedo hacer:**`,
            `• **Crear tareas:** "Crea una tarea llamada Revisar documentos"`,
            `• **Generar reportes:** "Genera reporte general en Excel" o "Reporte de documentos vencidos en CSV"`,
            `• **Navegar:** "Ir a documentos" o "Ir a tareas"`,
            `• **Consultas:** "Mis tareas pendientes" o "Documentos por vencer"`,
            '',
            `¿En qué te ayudo hoy?`,
        ].join('\n');

        this.messages = [{
            role:        'assistant',
            content,
            timestamp:   new Date().toISOString(),
            suggestions: this.quickSuggestions.slice(0, 6),
            isWelcome:   true,
        }];
        this._renderAll();
        this._saveLocal();
    }

    _showWelcomeBadge() {
        const key = 'aria_welcomed_v3';
        if (!this.isOpen && !localStorage.getItem(key)) {
            this._els.badge.style.display = 'flex';
            this._els.badge.textContent   = '!';
            localStorage.setItem(key, '1');
            setTimeout(() => {
                if (!this.isOpen) this._els.badge.style.display = 'none';
            }, 8000);
        }
    }

    // ──────────────────────────────────────────────────────────
    // DETECCIÓN DE COMANDOS DE TAREA
    // ──────────────────────────────────────────────────────────
    _detectTaskCreation(message) {
        const lowerMsg = message.toLowerCase().trim();
        
        const patterns = [
            /^(crea|crear|nueva|nuevo|agregar)\s+(una\s+)?(tarea|tarea:)\s+(.+)$/i,
            /^(crea|crear|nueva|nuevo|agregar)\s+(tarea)\s+(llamada|llamado|con nombre|con título)\s+(.+)$/i,
            /^(tarea:)\s+(.+)$/i,
            /^(crear tarea:)\s+(.+)$/i,
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                let title = match[match.length - 1].trim();
                title = title.replace(/^["']|["']$/g, '').trim();
                
                if (title && title.length >= 3 && title.length <= 200) {
                    return { detected: true, title };
                }
            }
        }
        
        const naturalPatterns = [
            /(?:crea|crear)\s+(?:una\s+)?tarea\s+(?:para\s+)?(.+?)(?:\s+por\s+favor)?$/i,
            /(?:necesito|quiero)\s+(?:crear|hacer)\s+(?:una\s+)?tarea\s+(?:llamada\s+)?(.+?)$/i,
        ];
        
        for (const pattern of naturalPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                let title = match[1].trim();
                title = title.replace(/^["']|["']$/g, '').trim();
                if (title && title.length >= 3 && title.length <= 200) {
                    return { detected: true, title };
                }
            }
        }
        
        return { detected: false };
    }

    // ──────────────────────────────────────────────────────────
    // CREACIÓN DIRECTA DE TAREA CON VALIDACIONES
    // ──────────────────────────────────────────────────────────
    async _createTaskDirectly(title) {
        log.action('Creando tarea directamente:', title);
        
        if (!title || title.trim().length < 3) {
            return {
                success: false,
                message: 'El título de la tarea debe tener al menos 3 caracteres.'
            };
        }
        
        if (title.length > 200) {
            return {
                success: false,
                message: 'El título de la tarea no puede exceder los 200 caracteres.'
            };
        }
        
        const invalidChars = /[<>%$@#*&^%$]/g;
        if (invalidChars.test(title)) {
            return {
                success: false,
                message: 'El título contiene caracteres no permitidos.'
            };
        }
        
        try {
            this._setStatus('Creando tarea...');
            
            const taskData = {
                titulo: title.trim(),
                descripcion: `Tarea creada por ARIA: "${title}"`,
                prioridad: 'media',
                estado: 'pendiente',
                asignadoA: this.userContext?.id || null,
                creador: this.userContext?.id || null,
                fechaLimite: this._getDefaultDueDate()
            };
            
            const response = await api.call('/tasks', {
                method: 'POST',
                body: taskData
            });
            
            if (response && (response.success || response._id)) {
                const task = response.data || response;
                log.action('Tarea creada exitosamente:', task);
                
                if (typeof window.loadTasks === 'function') {
                    setTimeout(() => window.loadTasks(), 500);
                } else if (typeof window.refreshTasks === 'function') {
                    setTimeout(() => window.refreshTasks(), 500);
                }
                
                return {
                    success: true,
                    message: `✅ **Tarea creada exitosamente:**\n\n**"${title}"**\n\n📅 Fecha límite: ${this._formatDate(taskData.fechaLimite)}\n🎯 Prioridad: Media\n\nPuedes verla en la sección de **Tareas**.`,
                    task
                };
            }
            
            throw new Error(response?.message || 'Error al crear la tarea');
            
        } catch (error) {
            log.error('Error creando tarea:', error);
            return {
                success: false,
                message: `❌ **No pude crear la tarea**\n\n${error.message || 'Error de conexión. Intenta de nuevo o créala manualmente en la sección de Tareas.'}`
            };
        } finally {
            this._setStatus('En línea');
        }
    }
    
    _getDefaultDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 3);
        date.setHours(23, 59, 59, 999);
        return date;
    }
    
    _formatDate(date) {
        if (!date) return 'Sin fecha';
        const d = new Date(date);
        return d.toLocaleDateString('es-MX', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // ──────────────────────────────────────────────────────────
    // DETECCIÓN DE COMANDOS DE REPORTES
    // ──────────────────────────────────────────────────────────
    _detectReportCommand(message) {
        const lowerMsg = message.toLowerCase().trim();
        
        const reportTypes = [
            { pattern: /\b(general|completo|todos)\b/, type: 'general', label: 'General' },
            { pattern: /\b(por categor[ií]a|por categoria|categor[ií]as)\b/, type: 'byCategory', label: 'por categoría' },
            { pattern: /\b(por persona|por usuario|personas)\b/, type: 'byPerson', label: 'por persona' },
            { pattern: /\b(por vencer|pr[oó]ximos a vencer|vencen pronto)\b/, type: 'expiring', label: 'por vencer' },
            { pattern: /\b(vencidos|vencido|expirados)\b/, type: 'expired', label: 'vencidos' }
        ];
        
        const formats = [
            { pattern: /\b(excel|xlsx|xls)\b/, format: 'excel', label: 'Excel' },
            { pattern: /\b(csv)\b/, format: 'csv', label: 'CSV' }
        ];
        
        const reportKeywords = /\b(reporte|reportes|generar|exportar|crear reporte|dame reporte|hazme reporte)\b/i;
        
        if (!reportKeywords.test(lowerMsg)) {
            return { detected: false };
        }
        
        let reportType = 'general';
        let typeLabel = 'General';
        
        for (const rt of reportTypes) {
            if (rt.pattern.test(lowerMsg)) {
                reportType = rt.type;
                typeLabel = rt.label;
                break;
            }
        }
        
        let format = 'excel';
        let formatLabel = 'Excel';
        
        for (const fmt of formats) {
            if (fmt.pattern.test(lowerMsg)) {
                format = fmt.format;
                formatLabel = fmt.label;
                break;
            }
        }
        
        let filter = null;
        
        if (reportType === 'byCategory') {
            const categoryMatch = lowerMsg.match(/(?:categor[ií]a|cat)\s*(?:de|llamada)?\s*["']?([a-záéíóúñ\s]+)["']?/i);
            if (categoryMatch && categoryMatch[1]) {
                filter = categoryMatch[1].trim();
            }
        }
        
        if (reportType === 'byPerson') {
            const personMatch = lowerMsg.match(/(?:persona|usuario)\s*(?:de|llamad[ao])?\s*["']?([a-záéíóúñ\s]+)["']?/i);
            if (personMatch && personMatch[1]) {
                filter = personMatch[1].trim();
            }
        }
        
        let days = 30;
        if (reportType === 'expiring') {
            const daysMatch = lowerMsg.match(/(\d+)\s*(?:d[ií]as|días)/i);
            if (daysMatch && daysMatch[1]) {
                days = parseInt(daysMatch[1]);
                if (days < 1) days = 1;
                if (days > 365) days = 365;
            }
        }
        
        return {
            detected: true,
            reportType,
            typeLabel,
            format,
            formatLabel,
            filter,
            days
        };
    }

    // ──────────────────────────────────────────────────────────
    // GENERAR REPORTE DIRECTAMENTE
    // ──────────────────────────────────────────────────────────
    async _generateReportDirectly(reportCommand) {
        const { reportType, format, filter, days, typeLabel, formatLabel } = reportCommand;
        
        log.report('Generando reporte:', { reportType, format, filter, days });
        this._currentFormat = format;
        
        if (typeof window.canAction === 'function' && !window.canAction('reportes')) {
            return {
                success: false,
                message: '⛔ No tienes permisos para generar reportes. Contacta al administrador.'
            };
        }
        
        if (!window.appState?.documents || window.appState.documents.length === 0) {
            return {
                success: false,
                message: '📭 No hay documentos en el sistema para generar el reporte.'
            };
        }
        
        try {
            this._setStatus(`Generando reporte ${typeLabel} en ${formatLabel}...`);
            
            const reportData = {
                reportType: reportType,
                category: '',
                person: '',
                days: days || 30,
                token: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString()
            };
            
            if (reportType === 'byCategory' && filter) {
                reportData.category = filter;
                log.report('Filtrando por categoría:', filter);
            }
            
            if (reportType === 'byPerson' && filter) {
                const person = window.appState.persons?.find(p => 
                    p.nombre?.toLowerCase().includes(filter.toLowerCase())
                );
                if (person) {
                    reportData.person = person._id;
                    log.report('Filtrando por persona:', person.nombre);
                } else {
                    return {
                        success: false,
                        message: `👤 No encontré a la persona "${filter}" en el sistema. Verifica el nombre o genera reporte sin filtro.`
                    };
                }
            }
            
            const endpoint = format === 'excel' ? '/reports/excel' : '/reports/csv';
            const fullUrl = `${window.CONFIG?.API_BASE_URL || '/api'}${endpoint}`;
            
            log.report('Llamando a:', fullUrl);
            
            this._showReportProgress(true);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Report-Token': reportData.token
                },
                body: JSON.stringify(reportData),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            this._showReportProgress(false);
            
            if (!response.ok) {
                let errorMsg = `Error ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch(e) {}
                throw new Error(errorMsg);
            }
            
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('El reporte está vacío. No hay datos para mostrar.');
            }
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            const extension = format === 'excel' ? 'xlsx' : 'csv';
            const fileName = `reporte_${reportType}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
            a.download = fileName;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            const sizeFormatted = this._formatBytes(blob.size);
            
            return {
                success: true,
                message: `✅ **Reporte ${typeLabel} generado exitosamente**\n\n` +
                         `📄 **Formato:** ${formatLabel.toUpperCase()}\n` +
                         `📊 **Tamaño:** ${sizeFormatted}\n` +
                         `📅 **Generado:** ${new Date().toLocaleString('es-MX')}\n\n` +
                         `El archivo se ha descargado automáticamente.`,
                reportData
            };
            
        } catch (error) {
            log.error('Error generando reporte:', error);
            this._showReportProgress(false);
            
            let errorMessage = `❌ **No pude generar el reporte**\n\n`;
            
            if (error.name === 'AbortError') {
                errorMessage += `La generación tomó demasiado tiempo. Intenta con un período más corto o menos datos.`;
            } else if (error.message.includes('No hay documentos')) {
                errorMessage += `No hay documentos que coincidan con los criterios seleccionados.\n\n` +
                               `• Tipo: ${typeLabel}\n` +
                               (filter ? `• Filtro: ${filter}\n` : '') +
                               `\nIntenta con otro tipo de reporte o sin filtros.`;
            } else {
                errorMessage += `${error.message || 'Error de conexión. Verifica tu conexión a internet.'}`;
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    // ──────────────────────────────────────────────────────────
    // MOSTRAR PROGRESO DE REPORTE
    // ──────────────────────────────────────────────────────────
    _showReportProgress(show) {
        if (!show) {
            if (this._reportProgressInterval) {
                clearInterval(this._reportProgressInterval);
                this._reportProgressInterval = null;
            }
            const preloader = document.getElementById('ariaReportPreloader');
            if (preloader) preloader.remove();
            return;
        }
        
        const existing = document.getElementById('ariaReportPreloader');
        if (existing) existing.remove();
        
        const fileIcon = this._currentFormat === 'excel' ? 'file-excel' : 'file-csv';
        
        const preloader = document.createElement('div');
        preloader.id = 'ariaReportPreloader';
        preloader.className = 'aria-report-preloader';
        preloader.innerHTML = `
            <div class="aria-report-preloader__overlay"></div>
            <div class="aria-report-preloader__content">
                <div class="aria-report-preloader__spinner"></div>
                <div class="aria-report-preloader__text">
                    <h4>Generando Reporte</h4>
                    <p>Procesando datos, por favor espera...</p>
                    <div class="aria-report-preloader__steps">
                        <div class="aria-report-preloader__step" id="step1">
                            <i class="fas fa-database"></i>
                            <span>Consultando datos</span>
                        </div>
                        <div class="aria-report-preloader__step" id="step2">
                            <i class="fas fa-chart-line"></i>
                            <span>Procesando información</span>
                        </div>
                        <div class="aria-report-preloader__step" id="step3">
                            <i class="fas fa-${fileIcon}"></i>
                            <span>Generando archivo</span>
                        </div>
                        <div class="aria-report-preloader__step" id="step4">
                            <i class="fas fa-download"></i>
                            <span>Descargando</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(preloader);
        
        let step = 1;
        this._reportProgressInterval = setInterval(() => {
            const currentStep = document.getElementById(`step${step}`);
            if (currentStep) {
                currentStep.classList.add('aria-report-preloader__step--active');
                step++;
            }
            if (step > 4) {
                clearInterval(this._reportProgressInterval);
                this._reportProgressInterval = null;
            }
        }, 800);
    }

    // ──────────────────────────────────────────────────────────
    // FORMATO DE BYTES
    // ──────────────────────────────────────────────────────────
    _formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // ──────────────────────────────────────────────────────────
    // ENVIAR MENSAJE - MODIFICADO PARA SOPORTAR CREACIÓN DE TAREAS Y REPORTES
    // ──────────────────────────────────────────────────────────
    async _sendMessage() {
        const text = this._els.input.value.trim();
        if (!text || this.isLoading) return;

        log.info('Enviando:', text.substring(0, 80));

        this._els.input.value = '';
        this._autoResize();
        this._updateSendBtn();
        this._updateCharCount();

        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        this.messages.push(userMsg);
        this._appendMessage(userMsg);
        this._saveLocal();

        // DETECTAR CREACIÓN DE TAREA
        const taskDetection = this._detectTaskCreation(text);
        
        if (taskDetection.detected) {
            log.info('Comando de creación de tarea detectado:', taskDetection.title);
            
            this.isLoading = true;
            this._showTyping(true);
            this._setStatus('Creando tarea...');
            
            const result = await this._createTaskDirectly(taskDetection.title);
            
            this._showTyping(false);
            
            const botMsg = {
                role: 'assistant',
                content: result.message,
                timestamp: new Date().toISOString(),
                isTaskResult: true,
                taskCreated: result.success,
                suggestions: result.success 
                    ? ['Ver mis tareas', 'Crear otra tarea', 'Ir a Tareas']
                    : ['Intentar de nuevo', 'Ir a Tareas', 'Ayuda con tareas']
            };
            
            this.messages.push(botMsg);
            this._appendMessage(botMsg);
            this._saveLocal();
            
            if (result.success) {
                this._renderSuggestions(botMsg.suggestions);
                showAlert('Tarea creada exitosamente', 'success', 3000);
            } else {
                this._renderSuggestions(botMsg.suggestions);
            }
            
            this.isLoading = false;
            this._updateSendBtn();
            this._setStatus('En línea');
            return;
        }

        // DETECTAR CREACIÓN DE REPORTE
        const reportDetection = this._detectReportCommand(text);
        
        if (reportDetection.detected) {
            log.info('Comando de reporte detectado:', reportDetection);
            
            this.isLoading = true;
            this._showTyping(true);
            this._setStatus('Generando reporte...');
            
            const result = await this._generateReportDirectly(reportDetection);
            
            this._showTyping(false);
            
            const botMsg = {
                role: 'assistant',
                content: result.message,
                timestamp: new Date().toISOString(),
                isReportResult: true,
                reportGenerated: result.success,
                suggestions: result.success 
                    ? ['Generar otro reporte', 'Ver documentos', 'Ir a Reportes']
                    : ['Intentar de nuevo', 'Ayuda con reportes', 'Ir a Reportes']
            };
            
            this.messages.push(botMsg);
            this._appendMessage(botMsg);
            this._saveLocal();
            
            if (result.success) {
                this._renderSuggestions(botMsg.suggestions);
                showAlert('Reporte generado exitosamente', 'success', 3000);
            } else {
                this._renderSuggestions(botMsg.suggestions);
            }
            
            this.isLoading = false;
            this._updateSendBtn();
            this._setStatus('En línea');
            return;
        }

        // Si no es creación de tarea ni reporte, procesar normalmente con la API
        this.isLoading = true;
        this._showTyping(true);
        this._setStatus('ARIA está pensando...');
        this._els.send.disabled = true;

        try {
            const res = await api.call('/chatbot/message', {
                method: 'POST',
                body: { message: text },
            });

            this._showTyping(false);

            if (!res?.success || !res.data) {
                throw new Error(res?.message || 'Respuesta inválida del servidor');
            }

            const { message: rawMsg, actions = [], suggestions = [], latency, conversationId, debug: dbg } = res.data;

            const cleanMsg = this._cleanJSON(rawMsg);

            log.info(`Respuesta recibida en ${latency}ms | acciones: ${JSON.stringify(actions)}`);
            if (dbg) log.info('Debug info:', dbg);

            const botMsg = {
                role:           'assistant',
                content:        cleanMsg,
                timestamp:      new Date().toISOString(),
                actions,
                suggestions,
                latency,
                conversationId: String(conversationId || ''),
            };

            this.messages.push(botMsg);
            this._appendMessage(botMsg);
            this._saveLocal();

            if (suggestions?.length > 0) {
                this._renderSuggestions(suggestions);
            }

            if (actions?.length > 0) {
                const delay = text.length > 30 ? 800 : 400;
                setTimeout(async () => {
                    for (const action of actions) {
                        const ok = await this._executeAction(action);
                        log.action(`Acción "${action.action}" ejecutada: ${ok ? 'OK' : 'FALLIDA'}`);
                    }
                }, delay);
            }

            this._setStatus('En línea');

        } catch (err) {
            log.error('Error en _sendMessage:', err);
            this._showTyping(false);

            const errMsg = {
                role:    'assistant',
                content: `⚠️ **Error de conexión.** No pude procesar tu mensaje.\n\nVerifica tu conexión a internet e intenta de nuevo.\n\n_Detalle: ${err.message}_`,
                isError: true,
                timestamp: new Date().toISOString(),
            };
            this.messages.push(errMsg);
            this._appendMessage(errMsg);
            this._setStatus('Error — reintentando...');
            setTimeout(() => this._setStatus('En línea'), 4000);

        } finally {
            this.isLoading = false;
            this._updateSendBtn();
        }
    }

    // ──────────────────────────────────────────────────────────
    // EJECUTAR ACCIONES
    // ──────────────────────────────────────────────────────────
    async _executeAction(action) {
        if (!action?.action) {
            log.warn('Acción inválida:', action);
            return false;
        }

        log.action('Ejecutando:', JSON.stringify(action));

        switch (action.action) {
            case 'navigate':
                return await this._doNavigate(action.target);
            case 'openModal':
                return await this._doOpenModal(action.target);
            case 'search':
                return await this._doSearch(action.query, action.section);
            default:
                log.warn('Tipo de acción desconocido:', action.action);
                return false;
        }
    }

    async _doNavigate(target) {
        if (!target) return false;

        const nav = NAV_MAP[target.toLowerCase()];
        if (!nav) {
            log.warn(`Sección de navegación "${target}" no encontrada`);
            this._appendSystemNote(`⚠️ Sección "${target}" no disponible.`);
            return false;
        }

        log.nav(`Navegando a: "${nav.label}"`);
        this._setStatus(`📍 Yendo a ${nav.label}...`);
        this.close();

        await new Promise(r => setTimeout(r, 250));

        if (typeof window.switchTab === 'function') {
            log.nav('Usando window.switchTab');
            try {
                await window.switchTab(nav.tabId);
                this._setStatus('En línea');
                return true;
            } catch (e) {
                log.warn('switchTab falló:', e.message);
            }
        }

        const navLink = document.querySelector(`[data-tab="${nav.tabId}"]`);
        if (navLink && navLink.offsetParent !== null) {
            log.nav('Usando clic en nav-link');
            navLink.click();
            this._setStatus('En línea');
            return true;
        }

        log.nav('Usando window.location.hash');
        window.location.hash = nav.hash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        this._setStatus('En línea');
        return true;
    }

    async _doOpenModal(target) {
        if (!target) return false;

        log.action(`Abriendo modal: "${target}"`);
        this._setStatus(`Abriendo ${MODAL_LABELS[target] || target}...`);
        this.close();

        await new Promise(r => setTimeout(r, 200));

        const modalToSection = {
            upload:        'documentos',
            addPerson:     'personas',
            addTask:       'tareas',
            addCategory:   'categorias',
            addDepartment: 'departamentos',
        };

        const section = modalToSection[target];
        if (section && typeof window.switchTab === 'function') {
            try {
                await window.switchTab(section);
                await new Promise(r => setTimeout(r, 300));
            } catch (e) {
                log.warn(`No se pudo navegar a "${section}":`, e.message);
            }
        }

        const MODAL_FN_MAP = {
            upload:        ['openDocumentModal', 'openUploadModal', 'showUploadModal'],
            addPerson:     ['openPersonModal', 'showPersonModal', 'addPersonModal'],
            addTask:       ['openTaskModal', 'showTaskModal', 'addTaskModal', 'openNewTaskModal'],
            addCategory:   ['openCategoryModal', 'showCategoryModal', 'addCategoryModal'],
            addDepartment: ['openDepartmentModal', 'showDeptModal', 'addDeptModal'],
            search:        ['showAdvancedSearch', 'openSearchModal', 'openSearch'],
        };

        const candidates = MODAL_FN_MAP[target] || [];
        for (const fnName of candidates) {
            if (typeof window[fnName] === 'function') {
                log.action(`Llamando window.${fnName}()`);
                try {
                    window[fnName]();
                    this._setStatus('En línea');
                    return true;
                } catch (e) {
                    log.warn(`window.${fnName}() falló:`, e.message);
                }
            }
        }

        const BUTTON_SELECTORS = {
            upload:        ['#uploadDocumentBtn', '#btnSubirDoc', '#addDocumentBtn', '[data-action="upload"]'],
            addPerson:     ['#addPersonBtn', '#btnAgregarPersona', '[data-action="addPerson"]'],
            addTask:       ['#addTaskBtn', '#btnCrearTarea', '#newTaskBtn', '[data-action="addTask"]'],
            addCategory:   ['#addCategoryBtn', '#btnNuevaCategoria', '[data-action="addCategory"]'],
            addDepartment: ['#addDepartmentBtn', '#btnNuevoDepto', '[data-action="addDepartment"]'],
            search:        ['#searchBtn', '#btnBuscar', '[data-action="search"]'],
        };

        const selectors = BUTTON_SELECTORS[target] || [];
        for (const sel of selectors) {
            const btn = document.querySelector(sel);
            if (btn) {
                log.action(`Haciendo clic en "${sel}"`);
                btn.click();
                this._setStatus('En línea');
                return true;
            }
        }

        log.warn(`No se encontró función/botón para el modal "${target}"`);
        this._appendSystemNote(
            `⚠️ No pude abrir el formulario de **${MODAL_LABELS[target] || target}** automáticamente. ` +
            `Búscalo manualmente en la sección correspondiente.`
        );
        showAlert(`Ve a la sección ${section || 'correspondiente'} y usa el botón de agregar`, 'info');
        this._setStatus('En línea');
        return false;
    }

    async _doSearch(query, section = 'documentos') {
        if (!query) return false;

        log.action(`Buscando "${query}" en "${section}"`);
        this._setStatus(`🔍 Buscando "${query}"...`);
        this.close();

        await new Promise(r => setTimeout(r, 300));

        if (NAV_MAP[section]) {
            await this._doNavigate(section);
            await new Promise(r => setTimeout(r, 500));
        }

        const searchInputSelectors = [
            '#searchInput', '#docSearch', '#documentSearch',
            'input[type="search"]', 'input[placeholder*="buscar" i]',
            'input[placeholder*="search" i]', '.search-input',
        ];

        for (const sel of searchInputSelectors) {
            const input = document.querySelector(sel);
            if (input && input.offsetParent !== null) {
                input.value = query;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.focus();

                const searchFns = ['handleDocumentSearch', 'searchDocuments', 'filterDocuments'];
                for (const fn of searchFns) {
                    if (typeof window[fn] === 'function') {
                        log.action(`Llamando window.${fn}()`);
                        window[fn]();
                        break;
                    }
                }

                log.action(`Búsqueda "${query}" ejecutada`);
                this._setStatus('En línea');
                return true;
            }
        }

        log.warn('No se encontró caja de búsqueda');
        this._setStatus('En línea');
        return false;
    }

    _appendSystemNote(text) {
        const note = {
            role:      'assistant',
            content:   text,
            isSystem:  true,
            timestamp: new Date().toISOString(),
        };
        this.messages.push(note);
        this._appendMessage(note);
        this._saveLocal();
    }

    // ──────────────────────────────────────────────────────────
    // RENDERIZADO DE MENSAJES
    // ──────────────────────────────────────────────────────────
    _renderAll() {
        this._els.messages.innerHTML = '';
        for (const msg of this.messages) {
            this._appendMessage(msg, false);
        }
        this._scrollBottom();

        const lastBot = [...this.messages].reverse().find(m => m.role === 'assistant');
        if (lastBot?.suggestions?.length) {
            this._renderSuggestions(lastBot.suggestions);
        } else {
            this._renderSuggestions(this.quickSuggestions.slice(0, 5));
        }

        this._setStatus('En línea');
    }

    _appendMessage(msg, scroll = true) {
        const isUser = msg.role === 'user';
        const el = document.createElement('div');

        el.className = [
            'aria-msg',
            isUser ? 'aria-msg--user' : 'aria-msg--bot',
            msg.isError   ? 'aria-msg--error'   : '',
            msg.isWelcome ? 'aria-msg--welcome' : '',
            msg.isSystem  ? 'aria-msg--system'  : '',
            msg.taskCreated ? 'aria-msg--success' : '',
            msg.reportGenerated ? 'aria-msg--success' : '',
        ].filter(Boolean).join(' ');

        const contentHtml = this._parseMarkdown(msg.content);
        const timeStr = this._formatTime(msg.timestamp);

        let actionHtml = '';
        if (msg.actions?.length > 0) {
            const btns = msg.actions.map(a => {
                if (a.action === 'navigate' && NAV_MAP[a.target]) {
                    const nav = NAV_MAP[a.target];
                    return `<button class="aria-action-btn" data-nav="${a.target}">
                        <i class="fas ${nav.icon}"></i> Ir a ${nav.label}
                    </button>`;
                }
                if (a.action === 'openModal') {
                    const label = MODAL_LABELS[a.target] || a.target;
                    return `<button class="aria-action-btn aria-action-btn--modal" data-modal="${a.target}">
                        <i class="fas fa-plus-circle"></i> ${label}
                    </button>`;
                }
                return '';
            }).filter(Boolean).join('');

            if (btns) {
                actionHtml = `<div class="aria-msg__actions">${btns}</div>`;
            }
        }

        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const latencyHtml = (msg.latency && isLocalhost)
            ? `<span class="aria-msg__latency" title="Tiempo de respuesta">${msg.latency}ms</span>` : '';

        const feedbackHtml = (msg.conversationId && !isUser && !msg.isError && !msg.isSystem && !msg.taskCreated && !msg.reportGenerated)
            ? `<button class="aria-feedback-btn" data-conv-id="${msg.conversationId}" data-feedback="true" title="Útil">👍</button>
               <button class="aria-feedback-btn" data-conv-id="${msg.conversationId}" data-feedback="false" title="No útil">👎</button>`
            : '';

        const copyHtml = (!isUser && !msg.isSystem)
            ? `<button class="aria-copy-btn" data-copy="${this._escapeAttr(msg.content)}" title="Copiar respuesta">
                <i class="fas fa-copy"></i>
               </button>` : '';

        el.innerHTML = `
            <div class="aria-msg__avatar" aria-hidden="true">
                <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="aria-msg__body">
                <div class="aria-msg__bubble">
                    <div class="aria-msg__text">${contentHtml}</div>
                    ${actionHtml}
                </div>
                <div class="aria-msg__meta">
                    <span class="aria-msg__time">${timeStr}</span>
                    ${latencyHtml}
                    ${feedbackHtml}
                    ${copyHtml}
                </div>
            </div>`;

        this._els.messages.appendChild(el);
        if (scroll) this._scrollBottom();
    }

    _renderSuggestions(suggestions) {
        if (!this._els.suggestions || !suggestions?.length) return;
        this._els.suggestions.innerHTML = suggestions.slice(0, 6).map(s => {
            const short = s.length > 45 ? s.substring(0, 45) + '…' : s;
            return `<button class="aria-chip" data-query="${this._escapeAttr(s)}" title="${this._escapeAttr(s)}">
                ${this._escapeHtml(short)}
            </button>`;
        }).join('');
    }

    _parseMarkdown(text) {
        if (!text) return '';
        let html = this._escapeHtml(text);

        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/`([^`]+)`/g, '<code class="aria-inline-code">$1</code>');

        html = html.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*?<\/li>\n?)+/gs, match =>
            `<ul class="aria-list">${match}</ul>`
        );

        html = html.replace(/\n/g, '<br>');

        return html;
    }

    async _clearChat() {
        if (!confirm('¿Borrar toda la conversación? También se eliminará del servidor.')) return;

        try {
            await api.call('/chatbot/history', { method: 'DELETE' });
            log.info('Historial borrado en servidor');
        } catch (e) {
            log.warn('No se pudo borrar en servidor:', e.message);
        }

        this.messages = [];
        localStorage.removeItem('aria_history_v3');
        this._showWelcome();
        showAlert('Conversación borrada', 'success');
    }

    _exportChat() {
        if (!this.messages.length) {
            showAlert('No hay conversación para exportar', 'warning');
            return;
        }

        const data = {
            exportado: new Date().toLocaleString('es-MX'),
            usuario: this.userContext?.nombre,
            total_mensajes: this.messages.length,
            conversacion: this.messages.map(m => ({
                rol: m.role === 'user' ? 'Usuario' : 'ARIA',
                mensaje: m.content,
                hora: m.timestamp ? new Date(m.timestamp).toLocaleString('es-MX') : '',
            })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `aria_chat_${new Date().toISOString().slice(0, 10)}.json`,
        });
        a.click();
        URL.revokeObjectURL(url);
        showAlert('Conversación exportada', 'success');
    }

    async _sendFeedback(conversationId, util) {
        if (!conversationId) return;
        try {
            await api.call('/chatbot/feedback', {
                method: 'PATCH',
                body: { conversationId, util },
            });
            log.info('Feedback enviado:', util);
        } catch (e) {
            log.warn('Error enviando feedback:', e.message);
        }
    }

    _showTyping(show) {
        if (!this._els.typing) return;
        this._els.typing.style.display = show ? 'flex' : 'none';
        if (show) this._scrollBottom();
    }

    _setStatus(text) {
        if (this._els.status) this._els.status.textContent = text;
    }

    _scrollBottom() {
        requestAnimationFrame(() => {
            if (this._els.messages) {
                this._els.messages.scrollTo({ top: this._els.messages.scrollHeight, behavior: 'smooth' });
            }
        });
    }

    _autoResize() {
        const el = this._els.input;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    _updateSendBtn() {
        if (this._els.send) {
            this._els.send.disabled = !this._els.input?.value.trim() || this.isLoading;
        }
    }

    _updateCharCount() {
        if (!this._els.charCount) return;
        const len = this._els.input?.value.length ?? 0;
        this._els.charCount.textContent = `${len} / 1500`;
        this._els.charCount.classList.toggle('aria-char-count--warn', len > 1200);
    }

    _saveLocal() {
        try {
            localStorage.setItem('aria_history_v3', JSON.stringify(this.messages.slice(-30)));
        } catch (e) {
            log.warn('Error guardando en localStorage:', e.message);
        }
    }

    _cleanJSON(text) {
        if (!text) return '';
        return text
            .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
            .replace(/\{[^{}]*"action"\s*:\s*"[^"]+[^{}]*\}/g, '')
            .trim()
            .replace(/\n{3,}/g, '\n\n');
    }

    _formatTime(ts) {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        } catch (_) { return ''; }
    }

    _escapeHtml(str) {
        if (!str) return '';
        const el = document.createElement('div');
        el.textContent = str;
        return el.innerHTML;
    }

    _escapeAttr(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}

// ──────────────────────────────────────────────────────────────
// SINGLETON + EXPORT
// ──────────────────────────────────────────────────────────────
let _instance = null;

export function initChatbot() {
    if (_instance) return _instance;
    _instance = new ChatbotAssistant();

    window.__aria = _instance;

    if (ARIA_DEBUG) {
        window.__ariaDebug = () => {
            console.group('%c[ARIA] Debug Info', 'color:#818cf8;font-weight:bold');
            console.log('Abierto:', _instance.isOpen);
            console.log('Cargando:', _instance.isLoading);
            console.log('Mensajes:', _instance.messages.length);
            console.log('Stats:', _instance.systemStats);
            console.log('Usuario:', _instance.userContext);
            console.log('Voice disponible:', !!_instance.recognition);
            console.log('NAV_MAP keys:', Object.keys(NAV_MAP));
            console.groupEnd();
        };
        console.log('%c[ARIA] Usa window.__ariaDebug() para inspeccionar el estado', 'color:#818cf8');
        console.log('%c[ARIA] Comandos disponibles:', 'color:#34d399');
        console.log('  • Crear tarea: "Crea una tarea llamada [nombre]"');
        console.log('  • Generar reporte: "Genera reporte general en Excel"');
        console.log('  • Reporte por categoría: "Reporte por categoría"');
        console.log('  • Reporte de vencidos: "Reporte de documentos vencidos en CSV"');
    }

    return _instance;
}

export default ChatbotAssistant;