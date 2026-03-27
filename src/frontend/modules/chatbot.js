// ============================================================
// chatbot.js — ARIA: Asistente Virtual CBTIS051
// Frontend completo con navegación, modales y voz
// ============================================================

import { api } from '../services/api.js';
import { showAlert } from '../utils.js';

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER
// ──────────────────────────────────────────────────────────────
const log = {
    info: (...a) => console.log('%c[ARIA]', 'color:#6366f1;font-weight:bold', ...a),
    warn: (...a) => console.warn('%c[ARIA]', 'color:#f59e0b;font-weight:bold', ...a),
    error: (...a) => console.error('%c[ARIA]', 'color:#ef4444;font-weight:bold', ...a),
};

// ──────────────────────────────────────────────────────────────
// MAPA DE NAVEGACIÓN
// ──────────────────────────────────────────────────────────────
const NAV_MAP = {
    dashboard: { hash: '#/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt', elementId: 'dashboard' },
    documentos: { hash: '#/documentos', label: 'Documentos', icon: 'fa-file-alt', elementId: 'documentos' },
    personas: { hash: '#/personas', label: 'Personas', icon: 'fa-users', elementId: 'personas' },
    tareas: { hash: '#/tareas', label: 'Tareas', icon: 'fa-check-square', elementId: 'tareas' },
    reportes: { hash: '#/reportes', label: 'Reportes', icon: 'fa-chart-bar', elementId: 'reportes' },
    papelera: { hash: '#/papelera', label: 'Papelera', icon: 'fa-trash-alt', elementId: 'papelera' },
    notificaciones: { hash: '#/notificaciones', label: 'Notificaciones', icon: 'fa-bell', elementId: 'notificaciones' },
    ajustes: { hash: '#/ajustes', label: 'Ajustes', icon: 'fa-cog', elementId: 'ajustes' },
    soporte: { hash: '#/soporte', label: 'Soporte', icon: 'fa-life-ring', elementId: 'soporte' },
};

// ──────────────────────────────────────────────────────────────
// CLASE PRINCIPAL
// ──────────────────────────────────────────────────────────────
class ChatbotAssistant {
    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.messages = [];
        this.userContext = null;
        this.systemStats = null;

        this.recognition = null;
        this.isListening = false;

        this.toggleBtn = null;
        this.window = null;
        this.messagesEl = null;
        this.inputEl = null;
        this.sendBtn = null;
        this.badge = null;
        this.statusEl = null;
        this.typingEl = null;

        this.quickSuggestions = [
            '¿Cuáles son mis tareas pendientes?',
            '¿Qué documentos vencen pronto?',
            'Muéstrame el resumen del sistema',
            '¿Cómo subo un documento?',
            'Ir a Documentos',
            '¿Qué puedes hacer?',
        ];

        this._init();
    }

    // ──────────────────────────────────────────────────────────
    // INICIALIZACIÓN
    // ──────────────────────────────────────────────────────────
    async _init() {
        log.info('Inicializando ARIA...');
        this._createUI();
        this._bindEvents();
        this._initVoice();
        this._loadUserContext();

        try {
            const res = await api.call('/chatbot/stats', { method: 'GET' });
            if (res?.success) {
                this.systemStats = res.data;
                log.info('Estadísticas cargadas:', this.systemStats);
            }
        } catch (e) {
            log.warn('No se pudieron cargar estadísticas:', e.message);
        }

        await this._loadHistory();
        setTimeout(() => this._showWelcomeBadge(), 3000);
        log.info('ARIA lista ✅');
    }

    _loadUserContext() {
        try {
            const userData = localStorage.getItem('user');
            const user = userData ? JSON.parse(userData) : {};
            this.userContext = {
                id: user._id || user.id,
                nombre: user.usuario || user.name || 'Usuario',
                rol: user.rol || user.role || 'usuario',
            };
        } catch (e) {
            log.warn('Error cargando contexto:', e.message);
            this.userContext = { nombre: 'Usuario', rol: 'usuario' };
        }
    }

    // ──────────────────────────────────────────────────────────
    // UI
    // ──────────────────────────────────────────────────────────
    _createUI() {
        if (document.getElementById('ariaContainer')) return;

        const el = document.createElement('div');
        el.id = 'ariaContainer';
        el.className = 'aria-container';
        el.innerHTML = this._getTemplate();
        document.body.appendChild(el);

        this.toggleBtn = document.getElementById('ariaToggle');
        this.window = document.getElementById('ariaWindow');
        this.messagesEl = document.getElementById('ariaMessages');
        this.inputEl = document.getElementById('ariaInput');
        this.sendBtn = document.getElementById('ariaSend');
        this.badge = document.getElementById('ariaBadge');
        this.statusEl = document.getElementById('ariaStatus');
        this.typingEl = document.getElementById('ariaTyping');

        log.info('UI construida');
    }

    _getTemplate() {
        return `
        <button class="aria-toggle" id="ariaToggle" aria-label="Abrir ARIA">
            <span class="aria-toggle__icon"><i class="fas fa-robot"></i></span>
            <span class="aria-toggle__pulse"></span>
            <span class="aria-badge" id="ariaBadge" style="display:none">1</span>
        </button>

        <div class="aria-window aria-window--closed" id="ariaWindow">
            <div class="aria-header">
                <div class="aria-header__identity">
                    <div class="aria-avatar"><i class="fas fa-robot"></i><span class="aria-avatar__dot"></span></div>
                    <div class="aria-header__info">
                        <span class="aria-header__name">ARIA</span>
                        <span class="aria-header__sub" id="ariaStatus">Asistente del sistema</span>
                    </div>
                </div>
                <div class="aria-header__actions">
                    <button class="aria-btn-icon" id="ariaHistoryBtn" title="Historial"><i class="fas fa-history"></i></button>
                    <button class="aria-btn-icon" id="ariaClearBtn" title="Nueva conversación"><i class="fas fa-broom"></i></button>
                    <button class="aria-btn-icon" id="ariaExportBtn" title="Exportar"><i class="fas fa-download"></i></button>
                    <button class="aria-btn-icon aria-btn-close" id="ariaClose" title="Cerrar"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div class="aria-messages" id="ariaMessages"></div>

            <div class="aria-typing" id="ariaTyping" style="display:none">
                <div class="aria-typing__avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-typing__dots"><span></span><span></span><span></span></div>
            </div>

            <div class="aria-suggestions" id="ariaSuggestionsBar">
                <div class="aria-suggestions__inner" id="ariaSuggestions"></div>
            </div>

            <div class="aria-input-area">
                <div class="aria-input-row">
                    <textarea id="ariaInput" class="aria-input" rows="1" placeholder="Pregúntame lo que quieras..." maxlength="1000"></textarea>
                    <button class="aria-voice-btn" id="ariaVoice" title="Entrada de voz"><i class="fas fa-microphone"></i></button>
                    <button class="aria-send-btn" id="ariaSend" title="Enviar (Ctrl+Enter)" disabled><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="aria-input-meta">
                    <span class="aria-char-count" id="ariaCharCount">0 / 1000</span>
                    <span class="aria-hint">Ctrl+Enter para enviar</span>
                </div>
            </div>
        </div>
        `;
    }

    // ──────────────────────────────────────────────────────────
    // EVENTOS
    // ──────────────────────────────────────────────────────────
    _bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggle());
        document.getElementById('ariaClose').addEventListener('click', () => this.close());
        document.getElementById('ariaSend').addEventListener('click', () => this._sendMessage());

        this.inputEl.addEventListener('input', () => {
            this._autoResize();
            this._updateSendBtn();
            this._updateCharCount();
        });

        this.inputEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this._sendMessage();
            }
        });

        document.getElementById('ariaClearBtn').addEventListener('click', () => this._clearChat());
        document.getElementById('ariaExportBtn').addEventListener('click', () => this._exportChat());
        document.getElementById('ariaHistoryBtn').addEventListener('click', () => this._loadFromServer());
        document.getElementById('ariaVoice').addEventListener('click', () => this._toggleVoice());

        document.getElementById('ariaSuggestions').addEventListener('click', (e) => {
            const btn = e.target.closest('.aria-chip');
            if (btn) {
                this.inputEl.value = btn.dataset.query;
                this._autoResize();
                this._updateSendBtn();
                this._sendMessage();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });

        this.messagesEl.addEventListener('click', (e) => {
            const navBtn = e.target.closest('[data-nav]');
            if (navBtn) {
                this._navigate(navBtn.dataset.nav);
            }
            const copyBtn = e.target.closest('[data-copy]');
            if (copyBtn) {
                navigator.clipboard.writeText(copyBtn.dataset.copy).then(() =>
                    showAlert('Copiado al portapapeles', 'success')
                );
            }
        });
    }

    // ──────────────────────────────────────────────────────────
    // VOZ
    // ──────────────────────────────────────────────────────────
    _initVoice() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            log.warn('Reconocimiento de voz no soportado');
            const voiceBtn = document.getElementById('ariaVoice');
            if (voiceBtn) voiceBtn.style.display = 'none';
            return;
        }

        this.recognition = new SpeechRec();
        this.recognition.lang = 'es-MX';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.continuous = false;

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            log.info('Voz reconocida:', transcript);
            this.inputEl.value = transcript;
            this._autoResize();
            this._updateSendBtn();
            this._sendMessage();
            this._setVoiceState(false);
        };

        this.recognition.onerror = (event) => {
            log.error('Error de voz:', event.error);
            this._setVoiceState(false);
            const msgs = {
                'not-allowed': 'Permite el acceso al micrófono.',
                'no-speech': 'No detecté voz.',
                'network': 'Error de red.',
            };
            showAlert(msgs[event.error] || 'Error en reconocimiento.', 'warning');
        };

        this.recognition.onend = () => this._setVoiceState(false);
    }

    _toggleVoice() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
                this._setVoiceState(true);
            } catch (e) {
                log.error('No se pudo iniciar voz:', e.message);
            }
        }
    }

    _setVoiceState(listening) {
        this.isListening = listening;
        const btn = document.getElementById('ariaVoice');
        if (!btn) return;
        btn.classList.toggle('aria-voice-btn--listening', listening);
        btn.querySelector('i').className = listening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        btn.title = listening ? 'Detener grabación' : 'Entrada de voz';
    }

    // ──────────────────────────────────────────────────────────
    // ABRIR / CERRAR
    // ──────────────────────────────────────────────────────────
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        this.isOpen = true;
        this.window.classList.remove('aria-window--closed');
        this.toggleBtn.classList.add('aria-toggle--open');
        this.badge.style.display = 'none';
        this.inputEl.focus();
        log.info('Chatbot abierto');
    }

    close() {
        this.isOpen = false;
        this.window.classList.add('aria-window--closed');
        this.toggleBtn.classList.remove('aria-toggle--open');
        log.info('Chatbot cerrado');
    }

    // ──────────────────────────────────────────────────────────
    // HISTORIAL Y BIENVENIDA
    // ──────────────────────────────────────────────────────────
    async _loadHistory() {
        try {
            const res = await api.call('/chatbot/history?limit=15', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user', content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse, timestamp: h.timestamp },
                ]);
                this._renderAll();
                log.info('Historial cargado del servidor');
                return;
            }
        } catch (e) {
            log.warn('No se pudo cargar historial del servidor');
        }

        try {
            const saved = localStorage.getItem('aria_history_v2');
            if (saved) {
                this.messages = JSON.parse(saved).slice(-30);
                if (this.messages.length > 0) {
                    this._renderAll();
                    log.info('Historial cargado de localStorage');
                    return;
                }
            }
        } catch (e) {
            log.warn('Error con localStorage');
        }

        this._showWelcome();
    }

    async _loadFromServer() {
        this._setStatus('Cargando historial...');
        try {
            const res = await api.call('/chatbot/history?limit=20', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user', content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse, timestamp: h.timestamp },
                ]);
                this._renderAll();
                this._setStatus('Historial cargado');
                showAlert(`${res.data.length} conversaciones cargadas`, 'success');
            } else {
                this._setStatus('Sin historial previo');
                showAlert('No hay historial guardado', 'info');
            }
        } catch (e) {
            log.error('Error cargando historial:', e.message);
            this._setStatus('Error al cargar historial');
            showAlert('No se pudo cargar el historial', 'error');
        }
        setTimeout(() => this._setStatus('En línea'), 2000);
    }

    _showWelcome() {
        const stats = this.systemStats || {};
        const nombre = this.userContext?.nombre || 'usuario';
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

        const alertas = [];
        if (stats.docsPorVencer7 > 0) alertas.push(`⚠️ **${stats.docsPorVencer7}** documento(s) vencen en 7 días`);
        if (stats.docsVencidos > 0) alertas.push(`🔴 **${stats.docsVencidos}** documento(s) ya vencidos`);
        if (stats.tareas?.vencidas > 0) alertas.push(`🚨 **${stats.tareas.vencidas}** tarea(s) vencidas`);

        const contenido = `${saludo}, **${nombre}**. Soy **ARIA**, tu asistente virtual del sistema CBTIS051.

📊 **Estado actual del sistema:**
• ${stats.totalDocs ?? 0} documentos activos
• ${stats.totalPersonas ?? 0} personas registradas
• ${stats.tareas?.pendientes ?? 0} tareas pendientes
• ${stats.totalCategorias ?? 0} categorías${alertas.length > 0 ? `

🔔 **Alertas que requieren atención:**
${alertas.join('\n')}` : ''}

¿En qué te puedo ayudar hoy?`;

        const msg = {
            role: 'assistant',
            content: contenido,
            timestamp: new Date().toISOString(),
            suggestions: this.quickSuggestions.slice(0, 4),
            isWelcome: true,
        };
        this.messages = [msg];
        this._renderAll();
        this._saveLocal();
    }

    _showWelcomeBadge() {
        if (!this.isOpen && !localStorage.getItem('aria_welcomed')) {
            this.badge.style.display = 'flex';
            this.badge.textContent = '👋';
            localStorage.setItem('aria_welcomed', '1');
            setTimeout(() => {
                if (!this.isOpen) this.badge.style.display = 'none';
            }, 6000);
        }
    }

    // ──────────────────────────────────────────────────────────
    // ENVIAR MENSAJE Y EJECUTAR ACCIONES
    // ──────────────────────────────────────────────────────────
    async _sendMessage() {
        const text = this.inputEl.value.trim();
        if (!text || this.isLoading) return;

        log.info('Enviando mensaje:', text.substring(0, 60));

        this.inputEl.value = '';
        this._autoResize();
        this._updateSendBtn();
        this._updateCharCount();

        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        this.messages.push(userMsg);
        this._appendMessage(userMsg);
        this._saveLocal();

        this.isLoading = true;
        this._showTyping(true);
        this._setStatus('ARIA está pensando...');

        try {
            const res = await api.call('/chatbot/message', {
                method: 'POST',
                body: { message: text },
            });

            this._showTyping(false);

            if (res?.success && res.data) {
                // LIMPIAR EL TEXTO DE ACCIONES ANTES DE MOSTRAR
                let cleanMessage = res.data.message;
                const actions = res.data.actions || [];
                
                // Eliminar bloques JSON del mensaje visible
                cleanMessage = cleanMessage.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim();
                
                const botMsg = {
                    role: 'assistant',
                    content: cleanMessage,
                    timestamp: new Date().toISOString(),
                    actions: actions,
                    suggestions: res.data.suggestions || [],
                    latency: res.data.latency,
                };
                this.messages.push(botMsg);
                this._appendMessage(botMsg);
                this._saveLocal();

                // EJECUTAR ACCIONES
                if (actions && actions.length > 0) {
                    for (const action of actions) {
                        log.info('Ejecutando acción:', action);
                        await this._executeAction(action);
                    }
                }

                if (res.data.suggestions?.length > 0) {
                    this._renderSuggestions(res.data.suggestions);
                }

                this._setStatus('En línea');
                log.info(`Respuesta en ${res.data.latency}ms, acciones: ${actions.length}`);
            } else {
                throw new Error('Respuesta inesperada');
            }
        } catch (err) {
            log.error('Error:', err.message);
            this._showTyping(false);

            const errMsg = {
                role: 'assistant',
                content: '⚠️ Tuve un problema procesando tu mensaje. Verifica tu conexión e intenta de nuevo.',
                timestamp: new Date().toISOString(),
                isError: true,
            };
            this.messages.push(errMsg);
            this._appendMessage(errMsg);
            this._setStatus('Error de conexión');
            setTimeout(() => this._setStatus('En línea'), 3000);
        } finally {
            this.isLoading = false;
        }
    }

    // ──────────────────────────────────────────────────────────
    // EJECUTAR ACCIONES (navegación, modales, búsqueda)
    // ──────────────────────────────────────────────────────────
    async _executeAction(action) {
        log.info('Ejecutando acción:', action);

        // ACCIÓN DE NAVEGACIÓN
        if (action.action === 'navigate' && action.target) {
            const nav = NAV_MAP[action.target.toLowerCase()];
            if (nav) {
                log.info(`Navegando a: ${nav.label} (${nav.hash})`);
                this._setStatus(`📍 Navegando a ${nav.label}...`);
                
                // Cerrar el chat antes de navegar
                this.close();
                
                // Pequeña pausa para que cierre el chat
                await new Promise(r => setTimeout(r, 300));
                
                // Cambiar la URL hash para navegar
                window.location.hash = nav.hash;
                
                // Forzar la navegación manual si es necesario
                if (typeof window.switchTab === 'function') {
                    window.switchTab(action.target.toLowerCase());
                }
                
                setTimeout(() => this._setStatus('En línea'), 1500);
                return true;
            } else {
                log.warn('Sección no encontrada:', action.target);
                this._setStatus(`⚠️ Sección "${action.target}" no encontrada`);
                return false;
            }
        }

        // ACCIÓN DE ABRIR MODAL
        if (action.action === 'openModal') {
            log.info(`Abriendo modal: ${action.target}`);
            this._setStatus(`📂 Abriendo ${action.target}...`);
            
            // Cerrar el chat
            this.close();
            
            await new Promise(r => setTimeout(r, 200));
            
            switch (action.target) {
                case 'upload':
                    if (typeof window.openDocumentModal === 'function') {
                        window.openDocumentModal();
                    } else {
                        log.warn('openDocumentModal no disponible');
                        showAlert('No se pudo abrir el modal de subida', 'warning');
                    }
                    break;
                case 'addPerson':
                    if (typeof window.openPersonModal === 'function') {
                        window.openPersonModal();
                    } else {
                        log.warn('openPersonModal no disponible');
                        showAlert('No se pudo abrir el modal de persona', 'warning');
                    }
                    break;
                case 'addTask':
                    if (typeof window.openTaskModal === 'function') {
                        window.openTaskModal();
                    } else {
                        log.warn('openTaskModal no disponible');
                        showAlert('No se pudo abrir el modal de tarea', 'warning');
                    }
                    break;
                case 'addCategory':
                    if (typeof window.openCategoryModal === 'function') {
                        window.openCategoryModal();
                    } else {
                        log.warn('openCategoryModal no disponible');
                    }
                    break;
                case 'addDepartment':
                    if (typeof window.openDepartmentModal === 'function') {
                        window.openDepartmentModal();
                    } else {
                        log.warn('openDepartmentModal no disponible');
                    }
                    break;
                case 'search':
                    if (typeof window.showAdvancedSearch === 'function') {
                        window.showAdvancedSearch();
                    } else {
                        log.warn('showAdvancedSearch no disponible');
                    }
                    break;
                default:
                    log.warn('Modal no reconocido:', action.target);
            }
            
            setTimeout(() => this._setStatus('En línea'), 1500);
            return true;
        }

        // ACCIÓN DE BÚSQUEDA
        if (action.action === 'search') {
            log.info(`Buscando: ${action.query}`);
            if (action.query && action.section === 'documentos') {
                this._setStatus(`🔍 Buscando "${action.query}"...`);
                this.close();
                await new Promise(r => setTimeout(r, 300));
                
                const nav = NAV_MAP['documentos'];
                if (nav) {
                    window.location.hash = nav.hash;
                    setTimeout(() => {
                        if (typeof window.handleDocumentSearch === 'function') {
                            const searchInput = document.getElementById('searchInput');
                            if (searchInput) {
                                searchInput.value = action.query;
                                window.handleDocumentSearch();
                            }
                        }
                    }, 500);
                }
            }
            return true;
        }

        return false;
    }

    // ──────────────────────────────────────────────────────────
    // NAVEGACIÓN MANUAL
    // ──────────────────────────────────────────────────────────
    _navigate(target) {
        const nav = NAV_MAP[target?.toLowerCase()];
        if (nav) {
            this.close();
            setTimeout(() => {
                window.location.hash = nav.hash;
                if (typeof window.switchTab === 'function') {
                    window.switchTab(target.toLowerCase());
                }
            }, 200);
        }
    }

    // ──────────────────────────────────────────────────────────
    // RENDERIZADO
    // ──────────────────────────────────────────────────────────
    _renderAll() {
        this.messagesEl.innerHTML = '';
        for (const msg of this.messages) {
            this._appendMessage(msg, false);
        }
        this._scrollBottom();

        const lastBot = [...this.messages].reverse().find(m => m.role === 'assistant');
        if (lastBot?.suggestions?.length) {
            this._renderSuggestions(lastBot.suggestions);
        } else {
            this._renderSuggestions(this.quickSuggestions.slice(0, 4));
        }
    }

    _appendMessage(msg, scroll = true) {
        const el = document.createElement('div');
        el.className = `aria-msg aria-msg--${msg.role === 'user' ? 'user' : 'bot'}${msg.isError ? ' aria-msg--error' : ''}${msg.isWelcome ? ' aria-msg--welcome' : ''}`;

        const contentHtml = this._parseMarkdown(msg.content);
        const timeStr = this._formatTime(msg.timestamp);

        let actionBtns = '';
        if (msg.actions?.length > 0) {
            actionBtns = `<div class="aria-msg__actions">
                ${msg.actions.map(a => {
                    if (a.action === 'navigate' && NAV_MAP[a.target]) {
                        const nav = NAV_MAP[a.target];
                        return `<button class="aria-nav-btn" data-nav="${a.target}">
                            <i class="fas ${nav.icon}"></i> Ir a ${nav.label}
                        </button>`;
                    }
                    if (a.action === 'openModal') {
                        const modalNames = {
                            upload: 'Subir Documento',
                            addPerson: 'Agregar Persona',
                            addTask: 'Nueva Tarea',
                            addCategory: 'Nueva Categoría',
                            addDepartment: 'Nuevo Departamento',
                            search: 'Búsqueda Avanzada'
                        };
                        const label = modalNames[a.target] || a.target;
                        return `<button class="aria-nav-btn" data-action="${a.action}" data-target="${a.target}">
                            <i class="fas fa-plus-circle"></i> ${label}
                        </button>`;
                    }
                    return '';
                }).join('')}
            </div>`;
        }

        const latencyHtml = (msg.latency && window.location.hostname === 'localhost')
            ? `<span class="aria-msg__latency">${msg.latency}ms</span>` : '';

        el.innerHTML = `
            <div class="aria-msg__avatar">
                <i class="fas ${msg.role === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="aria-msg__body">
                <div class="aria-msg__bubble">
                    <div class="aria-msg__text">${contentHtml}</div>
                    ${actionBtns}
                </div>
                <div class="aria-msg__meta">
                    <span class="aria-msg__time">${timeStr}</span>
                    ${latencyHtml}
                    ${msg.role === 'assistant' && !msg.isError ? `
                    <button class="aria-copy-btn" data-copy="${this._escapeAttr(msg.content)}" title="Copiar respuesta">
                        <i class="fas fa-copy"></i>
                    </button>` : ''}
                </div>
            </div>
        `;

        this.messagesEl.appendChild(el);
        if (scroll) this._scrollBottom();
    }

    _renderSuggestions(suggestions) {
        const el = document.getElementById('ariaSuggestions');
        if (!el || !suggestions?.length) return;
        el.innerHTML = suggestions.slice(0, 5).map(s =>
            `<button class="aria-chip" data-query="${this._escapeAttr(s)}" title="${this._escapeAttr(s)}">
                ${this._escapeHtml(s.length > 38 ? s.substring(0, 38) + '…' : s)}
            </button>`
        ).join('');
    }

    _parseMarkdown(text) {
        if (!text) return '';
        let html = this._escapeHtml(text);
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`([^`]+)`/g, '<code class="aria-code">$1</code>');
        html = html.replace(/^•\s(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul class="aria-list">$1</ul>');
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/^(📊|📄|✅|⚠️|🔔|📁|🏢|👥|📌|🚨)\s(.+)/gm,
            '<p class="aria-section-header">$1 $2</p>');
        return html;
    }

    // ──────────────────────────────────────────────────────────
    // LIMPIAR / EXPORTAR
    // ──────────────────────────────────────────────────────────
    async _clearChat() {
        if (!confirm('¿Borrar toda la conversación? También se elimina del servidor.')) return;

        try {
            await api.call('/chatbot/history', { method: 'DELETE' });
            log.info('Historial borrado en servidor');
        } catch (e) {
            log.warn('No se pudo borrar en servidor:', e.message);
        }

        this.messages = [];
        localStorage.removeItem('aria_history_v2');
        this._showWelcome();
        showAlert('Conversación borrada', 'success');
    }

    _exportChat() {
        if (this.messages.length === 0) {
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
        const a = document.createElement('a');
        a.href = url;
        a.download = `aria_chat_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showAlert('Conversación exportada', 'success');
    }

    // ──────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────
    _showTyping(show) {
        if (this.typingEl) {
            this.typingEl.style.display = show ? 'flex' : 'none';
            if (show) this._scrollBottom();
        }
    }

    _setStatus(text) {
        if (this.statusEl) this.statusEl.textContent = text;
    }

    _scrollBottom() {
        requestAnimationFrame(() => {
            if (this.messagesEl) {
                this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
            }
        });
    }

    _autoResize() {
        if (!this.inputEl) return;
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 120) + 'px';
    }

    _updateSendBtn() {
        if (this.sendBtn) {
            this.sendBtn.disabled = this.inputEl.value.trim().length === 0 || this.isLoading;
        }
    }

    _updateCharCount() {
        const el = document.getElementById('ariaCharCount');
        if (el) {
            const len = this.inputEl.value.length;
            el.textContent = `${len} / 1000`;
            el.classList.toggle('aria-char-count--warn', len > 800);
        }
    }

    _saveLocal() {
        try {
            localStorage.setItem('aria_history_v2', JSON.stringify(this.messages.slice(-30)));
        } catch (e) {
            log.warn('Error guardando en localStorage:', e.message);
        }
    }

    _formatTime(ts) {
        if (!ts) return '';
        return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }

    _escapeHtml(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
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
    if (!_instance) {
        _instance = new ChatbotAssistant();
        window.__aria = _instance;
        log.info('ARIA lista ✅ - usa window.__aria para debugging');
    }
    return _instance;
}

export default ChatbotAssistant;