// ============================================================
// chatbot.js — ARIA v4.0 Frontend
// CBTIS051 — Dashboard inline, NLP avanzado, animaciones mejoradas
// ============================================================

import { api } from '../services/api.js';
import { showAlert } from '../utils.js';

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER
// ──────────────────────────────────────────────────────────────
const ARIA_DEBUG = true;

const log = {
    info: (...a) => ARIA_DEBUG && console.log('%c[ARIA v4]', 'color:#818cf8;font-weight:bold', ...a),
    warn: (...a) => ARIA_DEBUG && console.warn('%c[ARIA-WARN]', 'color:#f59e0b;font-weight:bold', ...a),
    error: (...a) => console.error('%c[ARIA-ERROR]', 'color:#ef4444;font-weight:bold', ...a),
    action: (...a) => ARIA_DEBUG && console.log('%c[ARIA-ACTION]', 'color:#34d399;font-weight:bold', ...a),
    nav: (...a) => ARIA_DEBUG && console.log('%c[ARIA-NAV]', 'color:#60a5fa;font-weight:bold', ...a),
    voice: (...a) => ARIA_DEBUG && console.log('%c[ARIA-VOICE]', 'color:#f59e0b;font-weight:bold', ...a),
    report: (...a) => ARIA_DEBUG && console.log('%c[ARIA-REPORT]', 'color:#10b981;font-weight:bold', ...a),
    nlp: (...a) => ARIA_DEBUG && console.log('%c[ARIA-NLP]', 'color:#c084fc;font-weight:bold', ...a),
    task: (...a) => ARIA_DEBUG && console.log('%c[ARIA-TASK]', 'color:#fb923c;font-weight:bold', ...a),
    perf: (...a) => ARIA_DEBUG && console.log('%c[ARIA-PERF]', 'color:#2dd4bf;font-weight:bold', ...a),
};

// ──────────────────────────────────────────────────────────────
// CONSTANTES
// ──────────────────────────────────────────────────────────────
const NAV_MAP = {
    dashboard: { hash: '#/dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt', tabId: 'dashboard' },
    documentos: { hash: '#/documentos', label: 'Documentos', icon: 'fa-file-alt', tabId: 'documentos' },
    personas: { hash: '#/personas', label: 'Personas', icon: 'fa-users', tabId: 'personas' },
    tareas: { hash: '#/tareas', label: 'Tareas', icon: 'fa-check-square', tabId: 'tareas' },
    reportes: { hash: '#/reportes', label: 'Reportes', icon: 'fa-chart-bar', tabId: 'reportes' },
    papelera: { hash: '#/papelera', label: 'Papelera', icon: 'fa-trash-alt', tabId: 'papelera' },
    notificaciones: { hash: '#/notificaciones', label: 'Notificaciones', icon: 'fa-bell', tabId: 'notificaciones' },
    ajustes: { hash: '#/ajustes', label: 'Ajustes', icon: 'fa-cog', tabId: 'ajustes' },
    soporte: { hash: '#/soporte', label: 'Soporte', icon: 'fa-life-ring', tabId: 'soporte' },
    categorias: { hash: '#/categorias', label: 'Categorías', icon: 'fa-folder', tabId: 'categorias' },
    departamentos: { hash: '#/departamentos', label: 'Departamentos', icon: 'fa-building', tabId: 'departamentos' },
    chatbot: { hash: '#/chatbot', label: 'ARIA', icon: 'fa-robot', tabId: 'chatbot' },
};

const MODAL_LABELS = {
    upload: 'Subir Documento',
    addPerson: 'Agregar Persona',
    addTask: 'Nueva Tarea',
    addCategory: 'Nueva Categoría',
    addDepartment: 'Nuevo Departamento',
    search: 'Búsqueda Avanzada',
};

// ──────────────────────────────────────────────────────────────
// PARSEO DE FECHAS AVANZADO
// ──────────────────────────────────────────────────────────────
const MESES = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
    'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
    'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
};

function parseDateFromText(text) {
    const lowerText = text.toLowerCase();
    const patterns = [
        { regex: /(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de?\s*(\d{4}))?/i, handler: 'dayMonth' },
        { regex: /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/, handler: 'numeric' },
        { regex: /\bpasado\s+mañana\b/i, handler: 'pasadoMañana' },
        { regex: /\bmañana\b/i, handler: 'mañana' },
        { regex: /en\s+(\d+)\s+d[ií]as?/i, handler: 'days' },
        { regex: /\b(pr[oó]xima?\s+semana|próximos?\s+7\s+d[ií]as?)\b/i, handler: 'nextWeek' },
        { regex: /\b(pr[oó]ximo?\s+mes|mes\s+que\s+viene)\b/i, handler: 'nextMonth' },
        { regex: /fin\s+de\s+(esta\s+)?semana/i, handler: 'weekend' },
    ];

    for (const { regex, handler } of patterns) {
        const match = text.match(regex);
        if (!match) continue;
        const now = new Date();

        switch (handler) {
            case 'dayMonth': {
                const day = parseInt(match[1]);
                const month = MESES[match[2].toLowerCase()];
                if (month === undefined) break;
                const year = match[3] ? parseInt(match[3]) : now.getFullYear();
                const d = new Date(year, month, day, 23, 59, 59, 999);
                if (d < now && year === now.getFullYear()) d.setFullYear(year + 1);
                return d;
            }
            case 'numeric': {
                const [_, dm, mm, yy] = match;
                const year = yy ? parseInt(yy) : now.getFullYear();
                const d = new Date(year, parseInt(mm) - 1, parseInt(dm), 23, 59, 59, 999);
                if (d < now && !yy) d.setFullYear(year + 1);
                return d;
            }
            case 'mañana': {
                const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23, 59, 59, 999); return d;
            }
            case 'pasadoMañana': {
                const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(23, 59, 59, 999); return d;
            }
            case 'days': {
                const d = new Date(); d.setDate(d.getDate() + parseInt(match[1])); d.setHours(23, 59, 59, 999); return d;
            }
            case 'nextWeek': {
                const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 59, 999); return d;
            }
            case 'nextMonth': {
                const d = new Date(); d.setMonth(d.getMonth() + 1); d.setHours(23, 59, 59, 999); return d;
            }
            case 'weekend': {
                const d = new Date();
                const daysUntilFri = (5 - d.getDay() + 7) % 7;
                d.setDate(d.getDate() + (daysUntilFri || 7));
                d.setHours(23, 59, 59, 999); return d;
            }
        }
    }
    return null;
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN NLP DE COMANDOS
// ──────────────────────────────────────────────────────────────
function detectTaskCreation(message) {
    const patterns = [
        /(?:crea(?:r)?|nueva?|agrega(?:r)?|a[ñn]ade?|registra(?:r)?)\s+(?:una?\s+)?tarea\s*:?\s+(.+?)(?:\s+(?:para|que|con fecha|antes del?|antes de|vence)\s+.+)?$/i,
        /tarea\s*:\s+(.+?)(?:\s+(?:para|que|con fecha)\s+.+)?$/i,
        /(?:necesito|quiero)\s+(?:una?\s+)?tarea\s+(?:llamada?\s+)?["']?(.+?)["']?(?:\s+(?:para|que).+)?$/i,
        /(?:pon|añade?|registra)\s+(?:en\s+tareas?\s+)?["']?(.+?)["']?\s+(?:como\s+tarea|en\s+mis\s+tareas)/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match?.[1]) {
            let title = match[1].trim().replace(/^["']|["']$/g, '');
            title = title
                .replace(/\s+(para el|para|que venza|antes del?|antes de|con fecha|el día|vence el?).*$/i, '')
                .replace(/\s+(\d{1,2}\/\d{1,2}|mañana|pasado mañana|esta semana).*$/i, '')
                .trim();

            if (title.length >= 3 && title.length <= 200) {
                const dueDate = parseDateFromText(message);
                log.nlp('Tarea detectada:', { title, dueDate: dueDate?.toLocaleDateString('es-MX') });
                return { detected: true, title, dueDate };
            }
        }
    }
    return { detected: false };
}

function detectReportCommand(message) {
    const q = message.toLowerCase().trim();
    if (!/\b(reporte|reportes?|generar|exportar|descargar)\b/i.test(q)) return { detected: false };

    const typeMap = [
        { pattern: /\b(general|completo|todos?)\b/, type: 'general', label: 'General' },
        { pattern: /\b(por\s+categor[ií]a|por\s+categorías?|categorías?)\b/, type: 'byCategory', label: 'por Categoría' },
        { pattern: /\b(por\s+persona|por\s+usuario|personas?)\b/, type: 'byPerson', label: 'por Persona' },
        { pattern: /\b(por\s+vencer|próximos?\s+a\s+vencer|vencen\s+pronto)\b/, type: 'expiring', label: 'Por Vencer' },
        { pattern: /\b(vencidos?|expirados?)\b/, type: 'expired', label: 'Vencidos' },
    ];

    const fmtMap = [
        { pattern: /\b(excel|xlsx)\b/, format: 'excel', label: 'Excel' },
        { pattern: /\b(csv)\b/, format: 'csv', label: 'CSV' },
        { pattern: /\b(pdf)\b/, format: 'pdf', label: 'PDF' },
    ];

    let reportType = 'general', typeLabel = 'General';
    for (const { pattern, type, label } of typeMap) {
        if (pattern.test(q)) { reportType = type; typeLabel = label; break; }
    }

    let format = 'excel', formatLabel = 'Excel';
    for (const { pattern, format: fmt, label } of fmtMap) {
        if (pattern.test(q)) { format = fmt; formatLabel = label; break; }
    }

    const daysMatch = q.match(/(\d+)\s*d[ií]as?/i);
    const days = daysMatch ? Math.min(parseInt(daysMatch[1]), 365) : 30;

    return { detected: true, reportType, typeLabel, format, formatLabel, days };
}

// ──────────────────────────────────────────────────────────────
// CLASE PRINCIPAL — ARIA v4.0
// ──────────────────────────────────────────────────────────────
class ChatbotAssistant {

    constructor() {
        this.isOpen = false;
        this.isLoading = false;
        this.messages = [];
        this.systemStats = null;
        this.userContext = null;
        this._els = {};
        this._currentFormat = 'excel';
        this._reportProgressInterval = null;
        this._typingTimeout = null;
        this._lastStatsLoad = 0;
        this._fullscreenMode = false;
        this._fullscreenContainer = null;
        this._originalWindow = null;
        this._originalToggle = null;

        // Voice
        this.recognition = null;
        this.isListening = false;
        this.voiceRetryCount = 0;

        this.quickSuggestions = [
            'Resumen del sistema',
            'Mis tareas pendientes',
            '¿Cuál es mi tarea más urgente?',
            'Documentos que vencen pronto',
            'Análisis de productividad',
            'Generar reporte en Excel',
            'Crear tarea: Revisar documentos para el 15 de abril',
            '¿Qué puedes hacer?',
        ];

        this._init();
    }

    // ─── INICIALIZACIÓN ───────────────────────────────────────
    async _init() {
        log.info('Inicializando ARIA v4.0...');
        this._loadUserContext();
        this._createUI();
        this._bindEvents();
        this._initVoice();

        await Promise.allSettled([
            this._loadStats(),
            this._loadHistory(),
        ]);

        setTimeout(() => this._showWelcomeBadge(), 4000);
        log.info('ARIA v4.0 lista ✅');

        setInterval(() => {
            if (this.isOpen && Date.now() - this._lastStatsLoad > 300000) {
                this._loadStats(true);
            }
        }, 60000);

        setTimeout(() => {
            const currentTab = window.getCurrentTab?.() || 'dashboard';
            if (currentTab !== 'chatbot' && this._els.toggle) {
                this._els.toggle.style.display = 'flex';
                log.info('_init: toggle visible');
            } else if (currentTab === 'chatbot' && this._els.toggle) {
                this._els.toggle.style.display = 'none';
                log.info('_init: toggle oculto');
            }
        }, 200);
    }

    _loadUserContext() {
        try {
            const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
            const user = raw ? JSON.parse(raw) : {};
            this.userContext = {
                id: user._id || user.id,
                nombre: user.usuario || user.name || user.nombre || 'Usuario',
                rol: user.rol || user.role || 'usuario',
            };
            log.info('Contexto:', this.userContext);
        } catch (e) {
            log.warn('Error cargando contexto:', e.message);
            this.userContext = { nombre: 'Usuario', rol: 'usuario' };
        }
    }

    async _loadStats(silent = false) {
        try {
            const res = await api.call('/chatbot/stats', { method: 'GET' });
            if (res?.success) {
                this.systemStats = res.data;
                this._lastStatsLoad = Date.now();
                if (!silent) log.info('Stats cargadas');
                this._dispatchStatsUpdate();
            }
        } catch (e) {
            log.warn('Error cargando stats:', e.message);
        }
    }

    _dispatchStatsUpdate() {
        window.dispatchEvent(new CustomEvent('aria:statsUpdated', {
            detail: { stats: this.systemStats }
        }));
        if (window.dashboardManager?.refresh) window.dashboardManager.refresh();
    }

    _getDefaultDueDate() {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    async _createTaskDirectly(title, dueDate = null) {
        log.task('Creando tarea:', { title });

        if (!title?.trim() || title.trim().length < 3) {
            return { success: false, message: '❌ El título debe tener al menos 3 caracteres.' };
        }
        if (title.length > 200) {
            return { success: false, message: '❌ El título no puede exceder los 200 caracteres.' };
        }

        try {
            this._setStatus('Creando tarea...');

            let fechaLimite = dueDate || this._getDefaultDueDate();
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            if (fechaLimite < hoy) {
                fechaLimite = this._getDefaultDueDate();
            }

            const taskData = {
                titulo: title.trim(),
                descripcion: `Tarea creada por ARIA: "${title.trim()}"`,
                prioridad: 'media',
                estado: 'pendiente',
                tipo: 'personal',
                asignado_a: this.userContext?.id ? [this.userContext.id] : [],
                creado_por: this.userContext?.id || null,
                creado_por_nombre: this.userContext?.nombre || 'ARIA',
                fecha_limite: fechaLimite,
                recordatorio: false,
                activo: true,
            };

            const response = await api.call('/tasks', { method: 'POST', body: taskData });

            if (response && (response.success || response._id)) {
                const task = response.data || response;
                await this._syncAfterTaskCreate(task);

                const fechaStr = fechaLimite.toLocaleDateString('es-MX', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });

                return {
                    success: true,
                    message: `✅ **Tarea creada exitosamente**\n\n📌 **"${title.trim()}"**\n\n📅 **Fecha límite:** ${fechaStr}\n🎯 **Prioridad:** Media\n📋 **Estado:** Pendiente`,
                    task,
                };
            }

            throw new Error(response?.message || 'Respuesta inválida del servidor');

        } catch (error) {
            log.error('Error creando tarea:', error.message);
            return {
                success: false,
                message: `❌ **No pude crear la tarea**\n\n${error.message}`,
            };
        } finally {
            this._setStatus('En línea');
        }
    }

    async _syncAfterTaskCreate(task) {
        if (window.appState?.tasks) {
            window.appState.tasks.unshift(task);
            window.appState.updateTasksStats?.();
        }
        if (window.taskManager?.loadTasks) {
            try { await window.taskManager.loadTasks(); } catch (e) { }
        }
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: { task } }));
        window.dispatchEvent(new CustomEvent('tasks:updated', { detail: { task } }));
        window.dispatchEvent(new CustomEvent('tasks:reload'));
        await this._loadStats(true);
    }

    async _generateReportDirectly(cmd) {
        const { reportType, format, days, typeLabel, formatLabel } = cmd;
        log.report('Generando:', { reportType, format, days });
        this._currentFormat = format;

        try {
            this._setStatus(`Generando reporte ${typeLabel}...`);
            this._showReportProgress(true);

            const body = { reportType, days, timestamp: new Date().toISOString() };
            const endpoint = format === 'csv' ? '/reports/csv' : '/reports/excel';
            const fullUrl = `${window.CONFIG?.API_BASE_URL || '/api'}${endpoint}`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const token = localStorage.getItem('token') || '';
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            this._showReportProgress(false);

            if (!response.ok) {
                let errMsg = `Error ${response.status}`;
                try { const j = await response.json(); errMsg = j.message || errMsg; } catch (_) { }
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            if (blob.size === 0) throw new Error('El reporte está vacío.');

            const url = URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), {
                href: url,
                download: `reporte_${reportType}_${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'xlsx'}`,
            });
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return {
                success: true,
                message: `✅ **Reporte ${typeLabel} generado**\n\n📄 Formato: **${formatLabel}**\n📊 Tamaño: **${this._formatBytes(blob.size)}**`,
            };

        } catch (error) {
            this._showReportProgress(false);
            log.error('Error reporte:', error.message);
            const msg = error.name === 'AbortError'
                ? 'La generación tomó demasiado tiempo.'
                : error.message;
            return { success: false, message: `❌ **Error generando reporte**\n\n${msg}` };
        } finally {
            this._setStatus('En línea');
        }
    }

    _formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    async _sendMessage() {
        const text = this._els.input?.value.trim();
        if (!text || this.isLoading) return;

        log.info('Enviando:', text.substring(0, 100));

        this._els.input.value = '';
        this._autoResize();
        this._updateSendBtn();
        this._updateCharCount();

        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        this.messages.push(userMsg);
        this._appendMessage(userMsg);
        this._saveLocal();
        this.isLoading = true;
        this._updateSendBtn();

        const taskCmd = detectTaskCreation(text);
        if (taskCmd.detected) {
            this._showTyping(true);
            this._setStatus('Creando tarea...');
            const result = await this._createTaskDirectly(taskCmd.title, taskCmd.dueDate);
            this._showTyping(false);
            this._appendBotMessage(result.message, {
                suggestions: result.success
                    ? ['Ver mis tareas', 'Crear otra tarea', 'Ir a Tareas']
                    : ['Intentar de nuevo', 'Ir a Tareas'],
                isTaskResult: true,
                taskCreated: result.success,
            });
            if (result.success) showAlert('✅ Tarea creada', 'success', 3000);
            this._finishLoading();
            return;
        }

        const reportCmd = detectReportCommand(text);
        if (reportCmd.detected) {
            this._showTyping(true);
            this._setStatus('Generando reporte...');
            const result = await this._generateReportDirectly(reportCmd);
            this._showTyping(false);
            this._appendBotMessage(result.message, {
                suggestions: result.success
                    ? ['Generar otro reporte', 'Ir a Reportes']
                    : ['Intentar de nuevo', 'Ir a Reportes'],
                isReportResult: true,
            });
            if (result.success) showAlert('📊 Reporte generado', 'success', 3000);
            this._finishLoading();
            return;
        }

        this._showTyping(true);
        this._setStatus('ARIA está pensando...');

        try {
            const res = await api.call('/chatbot/message', {
                method: 'POST',
                body: { message: text },
            });

            this._showTyping(false);

            if (!res?.success || !res.data) {
                throw new Error(res?.message || 'Respuesta inválida');
            }

            const { message: rawMsg, actions = [], suggestions = [], latency } = res.data;
            const cleanMsg = this._cleanJSON(rawMsg);

            log.info(`Respuesta en ${latency}ms | acciones: ${actions.length}`);

            this._appendBotMessage(cleanMsg, { actions, suggestions, latency });

            if (suggestions?.length > 0) this._renderSuggestions(suggestions);

            if (actions?.length > 0) {
                setTimeout(async () => {
                    for (const action of actions) {
                        await this._executeAction(action);
                    }
                }, text.length > 40 ? 900 : 500);
            }

            this._setStatus('En línea');

        } catch (err) {
            log.error('Error en sendMessage:', err);
            this._showTyping(false);
            this._appendBotMessage(
                `⚠️ **Error de conexión**\n\nNo pude procesar tu mensaje.\n\n_${err.message}_`,
                { isError: true }
            );
            this._setStatus('Error — reintentando...');
            setTimeout(() => this._setStatus('En línea'), 4000);

        } finally {
            this._finishLoading();
        }
    }

    _appendBotMessage(content, opts = {}) {
        const msg = {
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
            actions: opts.actions || [],
            suggestions: opts.suggestions || [],
            latency: opts.latency || null,
            isError: opts.isError || false,
            isTaskResult: opts.isTaskResult || false,
            isReportResult: opts.isReportResult || false,
            taskCreated: opts.taskCreated || false,
        };
        this.messages.push(msg);
        this._appendMessage(msg);
        this._saveLocal();
        if (msg.suggestions?.length) this._renderSuggestions(msg.suggestions);
    }

    _finishLoading() {
        this.isLoading = false;
        this._updateSendBtn();
    }

    async _executeAction(action) {
        if (!action?.action) return false;
        log.action('Ejecutando:', JSON.stringify(action));
        switch (action.action) {
            case 'navigate': return this._doNavigate(action.target);
            case 'openModal': return this._doOpenModal(action.target);
            case 'search': return this._doSearch(action.query, action.section);
            default: log.warn('Acción desconocida:', action.action); return false;
        }
    }

    async _doNavigate(target) {
        if (!target) return false;
        const nav = NAV_MAP[target.toLowerCase()];
        if (!nav) {
            log.warn(`Sección "${target}" no encontrada`);
            return false;
        }
        log.nav(`Navegando a: ${nav.label}`);
        this._setStatus(`📍 Yendo a ${nav.label}...`);
        this.close();
        await new Promise(r => setTimeout(r, 250));

        if (typeof window.switchTab === 'function') {
            try { await window.switchTab(nav.tabId); this._setStatus('En línea'); return true; } catch (e) { }
        }
        const link = document.querySelector(`[data-tab="${nav.tabId}"]`);
        if (link?.offsetParent) { link.click(); this._setStatus('En línea'); return true; }
        window.location.hash = nav.hash;
        this._setStatus('En línea');
        return true;
    }

    async _doOpenModal(target) {
        if (!target) return false;
        log.action(`Abriendo modal: ${target}`);
        this._setStatus(`Abriendo ${MODAL_LABELS[target] || target}...`);
        this.close();
        await new Promise(r => setTimeout(r, 200));

        const fnMap = {
            upload: ['openDocumentModal', 'openUploadModal'],
            addPerson: ['openPersonModal', 'showPersonModal'],
            addTask: ['openTaskModal', 'showTaskModal'],
            addCategory: ['openCategoryModal', 'showCategoryModal'],
            addDepartment: ['openDepartmentModal', 'showDeptModal'],
        };

        for (const fn of (fnMap[target] || [])) {
            if (typeof window[fn] === 'function') {
                try { window[fn](); this._setStatus('En línea'); return true; } catch (e) { }
            }
        }

        const btnMap = {
            upload: ['#uploadDocumentBtn', '#addDocumentBtn'],
            addPerson: ['#addPersonBtn'],
            addTask: ['#addTaskBtn', '#newTaskBtn'],
            addCategory: ['#addCategoryBtn'],
            addDepartment: ['#addDepartmentBtn'],
        };

        for (const sel of (btnMap[target] || [])) {
            const btn = document.querySelector(sel);
            if (btn) { btn.click(); this._setStatus('En línea'); return true; }
        }

        return false;
    }

    async _doSearch(query, section = 'documentos') {
        if (!query) return false;
        log.action(`Buscando "${query}" en ${section}`);
        this._setStatus(`🔍 Buscando...`);
        this.close();
        await new Promise(r => setTimeout(r, 300));

        if (NAV_MAP[section]) { await this._doNavigate(section); await new Promise(r => setTimeout(r, 500)); }

        const selectors = ['#searchInput', '#docSearch', 'input[type="search"]', '.search-input'];
        for (const sel of selectors) {
            const input = document.querySelector(sel);
            if (input?.offsetParent) {
                input.value = query;
                ['input', 'change'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
                input.focus();
                this._setStatus('En línea');
                return true;
            }
        }
        this._setStatus('En línea');
        return false;
    }

    _renderAll() {
        if (!this._els.messages) return;
        this._els.messages.innerHTML = '';
        for (const msg of this.messages) this._appendMessage(msg, false);
        this._scrollBottom();

        const lastBot = [...this.messages].reverse().find(m => m.role === 'assistant');
        this._renderSuggestions(lastBot?.suggestions?.length ? lastBot.suggestions : this.quickSuggestions.slice(0, 6));
        this._setStatus('En línea');
    }

    _appendMessage(msg, scroll = true) {
        if (!this._els.messages) return;
        const isUser = msg.role === 'user';

        const el = document.createElement('div');
        el.className = [
            'aria-msg',
            isUser ? 'aria-msg--user' : 'aria-msg--bot',
            msg.isError ? 'aria-msg--error' : '',
            msg.isWelcome ? 'aria-msg--welcome' : '',
        ].filter(Boolean).join(' ');

        const contentHtml = this._parseMarkdown(msg.content);
        const timeStr = this._formatTime(msg.timestamp);

        let actionHtml = '';
        if (msg.actions?.length) {
            const btns = msg.actions.map(a => {
                if (a.action === 'navigate' && NAV_MAP[a.target]) {
                    const nav = NAV_MAP[a.target];
                    return `<button class="aria-action-btn" data-nav="${a.target}">
                        <i class="fas ${nav.icon}"></i> Ir a ${nav.label}
                    </button>`;
                }
                if (a.action === 'openModal') {
                    return `<button class="aria-action-btn aria-action-btn--modal" data-modal="${a.target}">
                        <i class="fas fa-plus-circle"></i> ${MODAL_LABELS[a.target] || a.target}
                    </button>`;
                }
                return '';
            }).filter(Boolean).join('');
            if (btns) actionHtml = `<div class="aria-msg__actions">${btns}</div>`;
        }

        el.innerHTML = `
            <div class="aria-msg__avatar">
                <i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="aria-msg__body">
                <div class="aria-msg__bubble">
                    <div class="aria-msg__text">${contentHtml}</div>
                    ${actionHtml}
                </div>
                <div class="aria-msg__meta">
                    <span class="aria-msg__time">${timeStr}</span>
                </div>
            </div>`;

        this._els.messages.appendChild(el);
        if (scroll) this._scrollBottom();
    }

    _renderSuggestions(suggestions) {
        if (!this._els.suggestions || !suggestions?.length) return;
        this._els.suggestions.innerHTML = suggestions.slice(0, 6).map(s => {
            const short = s.length > 48 ? s.substring(0, 48) + '…' : s;
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
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    async _loadHistory() {
        try {
            const res = await api.call('/chatbot/history?limit=12', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user', content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse, timestamp: h.timestamp },
                ]);
                this._renderAll();
                log.info(`Historial cargado: ${res.data.length}`);
                return;
            }
        } catch (e) {
            log.warn('No se pudo cargar historial:', e.message);
        }

        try {
            const saved = localStorage.getItem('aria_history_v4');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.length > 0) {
                    this.messages = parsed.slice(-40);
                    this._renderAll();
                    return;
                }
            }
        } catch (e) { }

        this._showWelcome();
    }

    async _loadFromServer() {
        this._setStatus('Cargando historial...');
        try {
            const res = await api.call('/chatbot/history?limit=30', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user', content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse, timestamp: h.timestamp },
                ]);
                this._renderAll();
                showAlert(`${res.data.length} conversaciones cargadas`, 'success');
            } else {
                showAlert('No hay historial guardado', 'info');
            }
        } catch (e) {
            showAlert('No se pudo cargar el historial', 'error');
        }
        this._setStatus('En línea');
    }

    async _clearChat() {
        if (!confirm('¿Borrar toda la conversación?')) return;
        try { await api.call('/chatbot/history', { method: 'DELETE' }); } catch (e) { }
        this.messages = [];
        localStorage.removeItem('aria_history_v4');
        this._showWelcome();
        showAlert('Conversación borrada', 'success');
    }

    _exportChat() {
        if (!this.messages.length) { showAlert('No hay conversación', 'warning'); return; }
        const data = {
            exportado: new Date().toLocaleString('es-MX'),
            usuario: this.userContext?.nombre,
            total: this.messages.length,
            conversacion: this.messages.map(m => ({
                rol: m.role === 'user' ? 'Usuario' : 'ARIA',
                mensaje: m.content,
                hora: m.timestamp ? new Date(m.timestamp).toLocaleString('es-MX') : '',
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url, download: `aria_chat_${new Date().toISOString().slice(0, 10)}.json`,
        });
        a.click(); URL.revokeObjectURL(url);
        showAlert('Conversación exportada', 'success');
    }

    _showWelcome() {
        const stats = this.systemStats || {};
        const nombre = this.userContext?.nombre || 'usuario';
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const s = stats.stats || {};
        const t = stats.tareas || {};

        const lines = [
            `${saludo}, **${nombre}** 👋 Soy **ARIA v4.0**`,
            '',
            `📊 **Estado actual:**`,
            `• ${s.totalDocs ?? 0} documentos`,
            `• ${t.pendientes ?? 0} tareas pendientes`,
            `• ${s.totalPersonas ?? 0} personas`,
            '',
            `¿En qué te ayudo hoy?`,
        ].join('\n');

        this.messages = [{
            role: 'assistant',
            content: lines,
            timestamp: new Date().toISOString(),
            suggestions: this.quickSuggestions.slice(0, 6),
            isWelcome: true,
        }];
        this._renderAll();
        this._saveLocal();
    }

    _showWelcomeBadge() {
        const key = 'aria_welcomed_v4';
        if (!this.isOpen && !localStorage.getItem(key)) {
            if (this._els.badge) {
                this._els.badge.style.display = 'flex';
                this._els.badge.textContent = '4.0';
                localStorage.setItem(key, '1');
                setTimeout(() => { if (!this.isOpen && this._els.badge) this._els.badge.style.display = 'none'; }, 8000);
            }
        }
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
        this.isOpen = true;
        this._els.window?.classList.remove('aria-window--closed');
        this._els.toggle?.classList.add('aria-toggle--open');
        if (this._els.badge) this._els.badge.style.display = 'none';
        this._setStatus('En línea');
        setTimeout(() => this._els.input?.focus(), 100);
        if (Date.now() - this._lastStatsLoad > 120000) this._loadStats(true);
    }

    close() {
        this.isOpen = false;
        this._els.window?.classList.add('aria-window--closed');
        this._els.toggle?.classList.remove('aria-toggle--open');

        const currentTab = window.getCurrentTab?.() || 'dashboard';
        if (currentTab !== 'chatbot' && this._els.toggle) {
            this._els.toggle.style.display = 'flex';
        }

        if (this.isListening) this._stopVoice();
        log.info('close: widget cerrado');
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
        el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }

    _updateSendBtn() {
        if (this._els.send) {
            this._els.send.disabled = !this._els.input?.value.trim() || this.isLoading;
        }
    }

    _updateCharCount() {
        if (!this._els.charCount) return;
        const len = this._els.input?.value.length ?? 0;
        this._els.charCount.textContent = `${len} / 2000`;
    }

    _saveLocal() {
        try {
            localStorage.setItem('aria_history_v4', JSON.stringify(this.messages.slice(-40)));
        } catch (e) { }
    }

    _cleanJSON(text) {
        if (!text) return '';
        return text.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim();
    }

    _formatTime(ts) {
        if (!ts) return '';
        try { return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
        catch (_) { return ''; }
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

    _showReportProgress(show) {
        if (!show) {
            clearInterval(this._reportProgressInterval);
            document.getElementById('ariaReportPreloader')?.remove();
            return;
        }
        document.getElementById('ariaReportPreloader')?.remove();

        const icon = this._currentFormat === 'csv' ? 'file-csv' : 'file-excel';
        const el = document.createElement('div');
        el.id = 'ariaReportPreloader';
        el.className = 'aria-report-preloader';
        el.innerHTML = `
            <div class="aria-report-preloader__overlay"></div>
            <div class="aria-report-preloader__content">
                <div class="aria-report-preloader__spinner"></div>
                <div class="aria-report-preloader__text">
                    <h4>Generando Reporte</h4>
                    <p>Procesando datos...</p>
                </div>
            </div>`;
        document.body.appendChild(el);
    }

    _initVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            if (this._els.voiceBtn) this._els.voiceBtn.style.display = 'none';
            return;
        }
        try {
            this.recognition = new SR();
            this.recognition.lang = 'es-MX';
            this.recognition.interimResults = false;
            this.recognition.continuous = false;

            this.recognition.onstart = () => { this.isListening = true; this._updateVoiceUI(true); };
            this.recognition.onend = () => this._stopVoice();
            this.recognition.onresult = (ev) => {
                const text = ev.results[0][0].transcript;
                if (this._els.input) {
                    this._els.input.value = text;
                    this._autoResize();
                    this._updateSendBtn();
                    setTimeout(() => { if (this._els.input.value.trim()) this._sendMessage(); }, 500);
                }
                this._stopVoice();
            };
            this.recognition.onerror = (ev) => {
                log.error('Voice error:', ev.error);
                this._stopVoice();
            };
        } catch (e) {
            if (this._els.voiceBtn) this._els.voiceBtn.style.display = 'none';
        }
    }

    _startVoice() {
        if (!this.recognition || this.isListening) return;
        try { this.recognition.start(); } catch (e) { this._stopVoice(); }
    }

    _stopVoice() {
        try { if (this.isListening && this.recognition) this.recognition.stop(); } catch (e) { }
        this.isListening = false;
        this._updateVoiceUI(false);
    }

    _updateVoiceUI(listening) {
        if (!this._els.voiceBtn) return;
        const icon = this._els.voiceBtn.querySelector('i');
        this._els.voiceBtn.classList.toggle('aria-voice-btn--listening', listening);
        if (icon) icon.className = listening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
    }

    _toggleVoice() {
        if (!this.recognition) { showAlert('Voz no disponible', 'warning'); return; }
        this.isListening ? this._stopVoice() : this._startVoice();
    }

    _createUI() {
        if (document.getElementById('ariaContainer')) {
            this._cacheEls(); return;
        }
        const c = document.createElement('div');
        c.id = 'ariaContainer';
        c.className = 'aria-container';
        c.innerHTML = this._getTemplate();
        document.body.appendChild(c);
        this._cacheEls();
    }

    _cacheEls() {
        this._els = {
            toggle: document.getElementById('ariaToggle'),
            window: document.getElementById('ariaWindow'),
            messages: document.getElementById('ariaMessages'),
            input: document.getElementById('ariaInput'),
            send: document.getElementById('ariaSend'),
            badge: document.getElementById('ariaBadge'),
            status: document.getElementById('ariaStatus'),
            typing: document.getElementById('ariaTyping'),
            suggestions: document.getElementById('ariaSuggestions'),
            charCount: document.getElementById('ariaCharCount'),
            voiceBtn: document.getElementById('ariaVoice'),
        };
    }

    _getTemplate() {
        return /* html */`
        <button class="aria-toggle" id="ariaToggle" aria-label="Abrir ARIA">
            <span class="aria-toggle__icon"><i class="fas fa-robot"></i></span>
            <span class="aria-toggle__pulse"></span>
            <span class="aria-badge" id="ariaBadge" style="display:none">4.0</span>
        </button>

        <div class="aria-window aria-window--closed" id="ariaWindow" role="dialog" aria-label="Asistente ARIA">

            <div class="aria-header">
                <div class="aria-header__identity">
                    <div class="aria-avatar">
                        <i class="fas fa-robot"></i>
                        <span class="aria-avatar__dot"></span>
                    </div>
                    <div class="aria-header__info">
                        <span class="aria-header__name">ARIA <span class="aria-version-tag">v4.0</span></span>
                        <span class="aria-header__sub" id="ariaStatus">Cargando...</span>
                    </div>
                </div>
                <div class="aria-header__actions">
                    <button class="aria-btn-icon" id="ariaRefreshBtn" title="Actualizar"><i class="fas fa-sync-alt"></i></button>
                    <button class="aria-btn-icon" id="ariaHistoryBtn" title="Historial"><i class="fas fa-history"></i></button>
                    <button class="aria-btn-icon" id="ariaClearBtn" title="Nueva conversación"><i class="fas fa-broom"></i></button>
                    <button class="aria-btn-icon" id="ariaExportBtn" title="Exportar"><i class="fas fa-download"></i></button>
                    <button class="aria-btn-icon aria-btn-close" id="ariaClose" title="Cerrar"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div class="aria-messages" id="ariaMessages" role="log"></div>

            <div class="aria-typing" id="ariaTyping" style="display:none">
                <div class="aria-typing__avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-typing__dots"><span></span><span></span><span></span></div>
            </div>

            <div class="aria-suggestions-bar">
                <div class="aria-suggestions__inner" id="ariaSuggestions"></div>
            </div>

            <div class="aria-input-area">
                <div class="aria-input-row">
                    <textarea id="ariaInput" class="aria-input" rows="1" placeholder="Pregúntame lo que quieras..." maxlength="2000"></textarea>
                    <button class="aria-voice-btn" id="ariaVoice" title="Voz"><i class="fas fa-microphone"></i></button>
                    <button class="aria-send-btn" id="ariaSend" title="Enviar" disabled><i class="fas fa-paper-plane"></i></button>
                </div>
                <div class="aria-input-meta">
                    <span class="aria-char-count" id="ariaCharCount">0 / 2000</span>
                    <span class="aria-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
                </div>
            </div>
        </div>`;
    }

    _bindEvents() {
        const e = this._els;

        e.toggle?.addEventListener('click', () => this.toggle());
        document.getElementById('ariaClose')?.addEventListener('click', () => this.close());
        document.getElementById('ariaClearBtn')?.addEventListener('click', () => this._clearChat());
        document.getElementById('ariaExportBtn')?.addEventListener('click', () => this._exportChat());
        document.getElementById('ariaHistoryBtn')?.addEventListener('click', () => this._loadFromServer());
        document.getElementById('ariaRefreshBtn')?.addEventListener('click', async () => {
            this._setStatus('Actualizando...');
            await this._loadStats();
            this._setStatus('En línea');
            showAlert('Estadísticas actualizadas', 'success', 2000);
        });

        e.send?.addEventListener('click', () => this._sendMessage());
        document.getElementById('ariaVoice')?.addEventListener('click', () => this._toggleVoice());

        e.input?.addEventListener('input', () => {
            this._autoResize();
            this._updateSendBtn();
            this._updateCharCount();
        });

        e.input?.addEventListener('keydown', ev => {
            if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
                ev.preventDefault();
                this._sendMessage();
            }
        });

        document.getElementById('ariaSuggestions')?.addEventListener('click', ev => {
            const btn = ev.target.closest('[data-query]');
            if (btn && e.input) {
                e.input.value = btn.dataset.query;
                this._autoResize();
                this._updateSendBtn();
                this._sendMessage();
            }
        });

        document.addEventListener('keydown', ev => {
            if (ev.key === 'Escape' && this.isOpen) this.close();
        });

        window.addEventListener('taskCreated', () => this._loadStats(true));
        window.addEventListener('tasks:updated', () => this._loadStats(true));
    }

    // ========== FULLSCREEN ==========
    renderFullscreen(container) {
        if (!container) container = document.getElementById('ariaFullscreenContainer');
        if (!container) return;

        this._fullscreenContainer = container;
        this._originalWindow = this._els.window;
        this._originalToggle = this._els.toggle;

        container.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'aria-fullscreen-wrapper';

        const header = document.createElement('div');
        header.className = 'aria-fullscreen-header';
        header.innerHTML = `
            <div class="aria-fullscreen-header-left">
                <div class="aria-fullscreen-avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-fullscreen-title">
                    <h2>ARIA</h2>
                    <p>Asistente Inteligente v4.0 · CBTIS 051 <span class="aria-fullscreen-status"><span class="aria-fullscreen-status-dot"></span><span id="ariaFullscreenStatus">En línea</span></span></p>
                </div>
            </div>
            <div class="aria-fullscreen-actions">
                <button class="aria-fullscreen-btn" id="ariaFullscreenRefresh" title="Actualizar"><i class="fas fa-sync-alt"></i></button>
                <button class="aria-fullscreen-btn" id="ariaFullscreenHistory" title="Historial"><i class="fas fa-history"></i></button>
                <button class="aria-fullscreen-btn" id="ariaFullscreenClear" title="Nueva conversación"><i class="fas fa-broom"></i></button>
                <button class="aria-fullscreen-btn" id="ariaFullscreenExport" title="Exportar"><i class="fas fa-download"></i></button>
            </div>
        `;

        const messagesContainer = document.createElement('div');
        messagesContainer.className = 'aria-fullscreen-messages';
        messagesContainer.id = 'ariaFullscreenMessages';

        const suggestionsBar = document.createElement('div');
        suggestionsBar.className = 'aria-fullscreen-suggestions';
        suggestionsBar.innerHTML = `<div class="aria-fullscreen-suggestions-inner" id="ariaFullscreenSuggestions"></div>`;

        const inputArea = document.createElement('div');
        inputArea.className = 'aria-fullscreen-input-area';
        inputArea.innerHTML = `
            <div class="aria-fullscreen-input-wrapper">
                <textarea id="ariaFullscreenInput" class="aria-fullscreen-input" placeholder="Escribe tu mensaje..." rows="1" maxlength="2000"></textarea>
                <div class="aria-fullscreen-input-actions">
                    <button class="aria-fullscreen-voice-btn" id="ariaFullscreenVoice" title="Voz"><i class="fas fa-microphone"></i></button>
                    <button class="aria-fullscreen-send-btn" id="ariaFullscreenSend" disabled title="Enviar"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
            <div class="aria-fullscreen-input-meta">
                <span class="aria-fullscreen-char-count" id="ariaFullscreenCharCount">0 / 2000</span>
                <span class="aria-fullscreen-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
            </div>
        `;

        wrapper.appendChild(header);
        wrapper.appendChild(messagesContainer);
        wrapper.appendChild(suggestionsBar);
        wrapper.appendChild(inputArea);
        container.appendChild(wrapper);

        this._fullscreenMode = true;
        this._fullscreenMessages = messagesContainer;
        this._fullscreenInput = document.getElementById('ariaFullscreenInput');
        this._fullscreenSend = document.getElementById('ariaFullscreenSend');
        this._fullscreenVoice = document.getElementById('ariaFullscreenVoice');
        this._fullscreenCharCount = document.getElementById('ariaFullscreenCharCount');
        this._fullscreenStatus = document.getElementById('ariaFullscreenStatus');
        this._fullscreenSuggestions = document.getElementById('ariaFullscreenSuggestions');

        this._renderMessagesToContainer(messagesContainer);

        const lastBotMsg = [...this.messages].reverse().find(m => m.role === 'assistant');
        this._renderFullscreenSuggestions(lastBotMsg?.suggestions?.length ? lastBotMsg.suggestions : this.quickSuggestions.slice(0, 6));

        this._bindFullscreenEvents();

        if (this._els.window) this._els.window.style.display = 'none';
        if (this._els.toggle) this._els.toggle.style.display = 'none';

        if (this._fullscreenStatus) this._fullscreenStatus.textContent = 'En línea';
    }

    _renderMessagesToContainer(container) {
        if (!container) return;
        container.innerHTML = '';
        for (const msg of this.messages) {
            const el = this._createFullscreenMessageElement(msg);
            container.appendChild(el);
        }
        this._scrollContainer(container);
    }

    _createFullscreenMessageElement(msg) {
        const isUser = msg.role === 'user';
        const el = document.createElement('div');
        el.className = `aria-msg ${isUser ? 'aria-msg--user' : 'aria-msg--bot'}`;
        if (msg.isWelcome) el.classList.add('aria-msg--welcome');
        if (msg.isError) el.classList.add('aria-msg--error');

        const content = this._parseMarkdown(msg.content);
        const time = this._formatTime(msg.timestamp);

        let actionsHtml = '';
        if (msg.actions?.length) {
            actionsHtml = `<div class="aria-msg__actions">` + msg.actions.map(a => {
                if (a.action === 'navigate') return `<button class="aria-action-btn" data-nav="${a.target}"><i class="fas fa-arrow-right"></i> Ir a ${a.target}</button>`;
                if (a.action === 'openModal') return `<button class="aria-action-btn aria-action-btn--modal" data-modal="${a.target}"><i class="fas fa-plus-circle"></i> ${a.target}</button>`;
                return '';
            }).join('') + `</div>`;
        }

        el.innerHTML = `
            <div class="aria-msg__avatar"><i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i></div>
            <div class="aria-msg__body">
                <div class="aria-msg__bubble"><div class="aria-msg__text">${content}</div>${actionsHtml}</div>
                <div class="aria-msg__meta"><span class="aria-msg__time">${time}</span></div>
            </div>
        `;

        el.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => this._doNavigate(btn.dataset.nav)));
        el.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._doOpenModal(btn.dataset.modal)));

        return el;
    }

    _renderFullscreenSuggestions(suggestions) {
        if (!this._fullscreenSuggestions || !suggestions?.length) return;
        this._fullscreenSuggestions.innerHTML = suggestions.slice(0, 8).map(s => {
            const short = s.length > 50 ? s.substring(0, 50) + '…' : s;
            return `<button class="aria-fullscreen-chip" data-query="${this._escapeAttr(s)}">${this._escapeHtml(short)}</button>`;
        }).join('');
    }

    _bindFullscreenEvents() {
        if (this._fullscreenInput) {
            this._fullscreenInput.addEventListener('input', () => {
                this._fullscreenSend.disabled = !this._fullscreenInput.value.trim() || this.isLoading;
                if (this._fullscreenCharCount) {
                    this._fullscreenCharCount.textContent = `${this._fullscreenInput.value.length} / 2000`;
                }
                this._fullscreenInput.style.height = 'auto';
                this._fullscreenInput.style.height = Math.min(this._fullscreenInput.scrollHeight, 150) + 'px';
            });
            this._fullscreenInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this._sendFullscreenMessage();
                }
            });
        }

        if (this._fullscreenSend) this._fullscreenSend.addEventListener('click', () => this._sendFullscreenMessage());
        if (this._fullscreenVoice) this._fullscreenVoice.addEventListener('click', () => this._toggleVoice());

        document.getElementById('ariaFullscreenRefresh')?.addEventListener('click', async () => {
            this._setFullscreenStatus('Actualizando...');
            await this._loadStats(true);
            this._setFullscreenStatus('En línea');
            showAlert('Estadísticas actualizadas', 'success');
        });
        document.getElementById('ariaFullscreenHistory')?.addEventListener('click', () => this._loadFromServer());
        document.getElementById('ariaFullscreenClear')?.addEventListener('click', () => this._clearChat());
        document.getElementById('ariaFullscreenExport')?.addEventListener('click', () => this._exportChat());

        if (this._fullscreenSuggestions) {
            this._fullscreenSuggestions.addEventListener('click', (e) => {
                const chip = e.target.closest('[data-query]');
                if (chip && this._fullscreenInput) {
                    this._fullscreenInput.value = chip.dataset.query;
                    this._fullscreenInput.dispatchEvent(new Event('input'));
                    this._sendFullscreenMessage();
                }
            });
        }
    }

    async _sendFullscreenMessage() {
        const text = this._fullscreenInput?.value.trim();
        if (!text || this.isLoading) return;

        const originalInput = this._els.input;
        const originalMessages = this._els.messages;
        const originalSend = this._els.send;
        const originalSuggestions = this._els.suggestions;

        this._els.input = this._fullscreenInput;
        this._els.messages = this._fullscreenMessages;
        this._els.send = this._fullscreenSend;
        this._els.suggestions = this._fullscreenSuggestions;

        const messageText = text;
        this._fullscreenInput.value = '';
        this._fullscreenInput.style.height = 'auto';
        this._fullscreenSend.disabled = true;

        const userMsg = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
        this.messages.push(userMsg);
        this._fullscreenMessages.appendChild(this._createFullscreenMessageElement(userMsg));
        this._scrollContainer(this._fullscreenMessages);
        this._saveLocal();

        this.isLoading = true;
        this._fullscreenSend.disabled = true;
        this._setFullscreenStatus('Procesando...');

        try {
            await this._processMessageFullscreen(messageText);
        } catch (error) {
            this._appendFullscreenBotMessage('❌ Error al procesar tu mensaje.', { isError: true });
        } finally {
            this.isLoading = false;
            this._fullscreenSend.disabled = false;
            this._setFullscreenStatus('En línea');

            this._els.input = originalInput;
            this._els.messages = originalMessages;
            this._els.send = originalSend;
            this._els.suggestions = originalSuggestions;
        }
    }

    async _processMessageFullscreen(text) {
        const taskCmd = detectTaskCreation(text);
        if (taskCmd.detected) {
            this._setFullscreenStatus('Creando tarea...');
            const result = await this._createTaskDirectly(taskCmd.title, taskCmd.dueDate);
            this._appendFullscreenBotMessage(result.message, {
                suggestions: result.success ? ['Ver mis tareas', 'Crear otra tarea'] : ['Intentar de nuevo'],
                taskCreated: result.success
            });
            return;
        }

        const reportCmd = detectReportCommand(text);
        if (reportCmd.detected) {
            this._setFullscreenStatus('Generando reporte...');
            const result = await this._generateReportDirectly(reportCmd);
            this._appendFullscreenBotMessage(result.message, {
                suggestions: result.success ? ['Generar otro reporte', 'Ir a Reportes'] : ['Intentar de nuevo']
            });
            return;
        }

        try {
            const res = await api.call('/chatbot/message', { method: 'POST', body: { message: text } });
            if (res?.success && res.data) {
                const cleanMsg = this._cleanJSON(res.data.message);
                this._appendFullscreenBotMessage(cleanMsg, {
                    actions: res.data.actions,
                    suggestions: res.data.suggestions,
                    latency: res.data.latency
                });
                if (res.data.actions?.length) {
                    setTimeout(async () => {
                        for (const action of res.data.actions) await this._executeAction(action);
                    }, 500);
                }
            }
        } catch (error) {
            throw error;
        }
    }

    _appendFullscreenBotMessage(content, opts = {}) {
        const msg = {
            role: 'assistant', content, timestamp: new Date().toISOString(),
            actions: opts.actions || [], suggestions: opts.suggestions || [],
            isError: opts.isError || false, taskCreated: opts.taskCreated || false
        };
        this.messages.push(msg);
        const msgEl = this._createFullscreenMessageElement(msg);
        this._fullscreenMessages.appendChild(msgEl);
        this._scrollContainer(this._fullscreenMessages);
        this._saveLocal();
        if (msg.suggestions?.length) this._renderFullscreenSuggestions(msg.suggestions);
    }

    _setFullscreenStatus(text) {
        if (this._fullscreenStatus) this._fullscreenStatus.textContent = text;
    }

    setMode(mode) {
        log.info(`setMode: cambiando a "${mode}"`);
        if (mode === 'fullscreen') {
            const container = document.getElementById('ariaFullscreenContainer');
            if (container) {
                this.renderFullscreen(container);
                this._fullscreenMode = true;
                if (this._els.toggle) this._els.toggle.style.display = 'none';
                if (this._els.window) this._els.window.classList.add('aria-window--closed');
                this.isOpen = false;
                log.info('setMode: fullscreen activado');
            } else {
                log.error('setMode: contenedor no encontrado');
            }
        } else {
            this._fullscreenMode = false;
            if (this._fullscreenContainer) this._fullscreenContainer.innerHTML = '';
            this._els.input = document.getElementById('ariaInput');
            this._els.messages = document.getElementById('ariaMessages');
            this._els.send = document.getElementById('ariaSend');
            this._els.suggestions = document.getElementById('ariaSuggestions');
            if (this._els.toggle) this._els.toggle.style.display = 'flex';
            if (this._els.window) this._els.window.classList.add('aria-window--closed');
            this._renderAll();
            this.isOpen = false;
            this._setStatus('En línea');
            log.info('setMode: widget restaurado');
        }
    }

    _scrollContainer(container) {
        if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
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
            console.group('%c[ARIA v4.0] Debug', 'color:#818cf8');
            console.log('Abierto:', _instance.isOpen);
            console.log('Mensajes:', _instance.messages.length);
            console.groupEnd();
        };
        console.log('%c[ARIA v4.0] Debug: window.__ariaDebug()', 'color:#818cf8');
    }

    return _instance;
}

export default ChatbotAssistant;