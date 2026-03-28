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
    info:   (...a) => ARIA_DEBUG && console.log  ('%c[ARIA v4]',       'color:#818cf8;font-weight:bold', ...a),
    warn:   (...a) => ARIA_DEBUG && console.warn ('%c[ARIA-WARN]',     'color:#f59e0b;font-weight:bold', ...a),
    error:  (...a) =>               console.error('%c[ARIA-ERROR]',    'color:#ef4444;font-weight:bold', ...a),
    action: (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-ACTION]',   'color:#34d399;font-weight:bold', ...a),
    nav:    (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-NAV]',      'color:#60a5fa;font-weight:bold', ...a),
    voice:  (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-VOICE]',    'color:#f59e0b;font-weight:bold', ...a),
    report: (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-REPORT]',   'color:#10b981;font-weight:bold', ...a),
    nlp:    (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-NLP]',      'color:#c084fc;font-weight:bold', ...a),
    task:   (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-TASK]',     'color:#fb923c;font-weight:bold', ...a),
    perf:   (...a) => ARIA_DEBUG && console.log  ('%c[ARIA-PERF]',     'color:#2dd4bf;font-weight:bold', ...a),
};

// ──────────────────────────────────────────────────────────────
// CONSTANTES
// ──────────────────────────────────────────────────────────────
const NAV_MAP = {
    dashboard:      { hash: '#/dashboard',      label: 'Dashboard',      icon: 'fa-tachometer-alt', tabId: 'dashboard'      },
    documentos:     { hash: '#/documentos',     label: 'Documentos',     icon: 'fa-file-alt',       tabId: 'documentos'     },
    personas:       { hash: '#/personas',       label: 'Personas',       icon: 'fa-users',          tabId: 'personas'       },
    tareas:         { hash: '#/tareas',         label: 'Tareas',         icon: 'fa-check-square',   tabId: 'tareas'         },
    reportes:       { hash: '#/reportes',       label: 'Reportes',       icon: 'fa-chart-bar',      tabId: 'reportes'       },
    papelera:       { hash: '#/papelera',       label: 'Papelera',       icon: 'fa-trash-alt',      tabId: 'papelera'       },
    notificaciones: { hash: '#/notificaciones', label: 'Notificaciones', icon: 'fa-bell',           tabId: 'notificaciones' },
    ajustes:        { hash: '#/ajustes',        label: 'Ajustes',        icon: 'fa-cog',            tabId: 'ajustes'        },
    soporte:        { hash: '#/soporte',        label: 'Soporte',        icon: 'fa-life-ring',      tabId: 'soporte'        },
    categorias:     { hash: '#/categorias',     label: 'Categorías',     icon: 'fa-folder',         tabId: 'categorias'     },
    departamentos:  { hash: '#/departamentos',  label: 'Departamentos',  icon: 'fa-building',       tabId: 'departamentos'  },
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
// PARSEO DE FECHAS AVANZADO
// ──────────────────────────────────────────────────────────────
const MESES = {
    'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
    'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11,
    'ene':0,'feb':1,'mar':2,'abr':3,'may':4,'jun':5,
    'jul':6,'ago':7,'sep':8,'oct':9,'nov':10,'dic':11,
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
                const d = new Date(year, parseInt(mm)-1, parseInt(dm), 23, 59, 59, 999);
                if (d < now && !yy) d.setFullYear(year + 1);
                return d;
            }
            case 'mañana': {
                const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23,59,59,999); return d;
            }
            case 'pasadoMañana': {
                const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(23,59,59,999); return d;
            }
            case 'days': {
                const d = new Date(); d.setDate(d.getDate() + parseInt(match[1])); d.setHours(23,59,59,999); return d;
            }
            case 'nextWeek': {
                const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23,59,59,999); return d;
            }
            case 'nextMonth': {
                const d = new Date(); d.setMonth(d.getMonth() + 1); d.setHours(23,59,59,999); return d;
            }
            case 'weekend': {
                const d = new Date();
                const daysUntilFri = (5 - d.getDay() + 7) % 7;
                d.setDate(d.getDate() + (daysUntilFri || 7));
                d.setHours(23,59,59,999); return d;
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
            // Limpiar el título de fragmentos de fecha
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
        { pattern: /\b(general|completo|todos?)\b/,                           type: 'general',     label: 'General' },
        { pattern: /\b(por\s+categor[ií]a|por\s+categorías?|categorías?)\b/,  type: 'byCategory',  label: 'por Categoría' },
        { pattern: /\b(por\s+persona|por\s+usuario|personas?)\b/,              type: 'byPerson',    label: 'por Persona' },
        { pattern: /\b(por\s+vencer|próximos?\s+a\s+vencer|vencen\s+pronto)\b/,type: 'expiring',   label: 'Por Vencer' },
        { pattern: /\b(vencidos?|expirados?)\b/,                               type: 'expired',    label: 'Vencidos' },
    ];

    const fmtMap = [
        { pattern: /\b(excel|xlsx)\b/, format: 'excel', label: 'Excel' },
        { pattern: /\b(csv)\b/,        format: 'csv',   label: 'CSV'   },
        { pattern: /\b(pdf)\b/,        format: 'pdf',   label: 'PDF'   },
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
        this.isOpen    = false;
        this.isLoading = false;
        this.messages  = [];
        this.systemStats   = null;
        this.userContext   = null;
        this._els          = {};
        this._currentFormat = 'excel';
        this._reportProgressInterval = null;
        this._typingTimeout = null;
        this._lastStatsLoad = 0;

        // Voice
        this.recognition    = null;
        this.isListening    = false;
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

        // Recargar stats cada 5 minutos si el chat está abierto
        setInterval(() => {
            if (this.isOpen && Date.now() - this._lastStatsLoad > 300000) {
                this._loadStats(true);
            }
        }, 60000);
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
                if (!silent) log.info('Stats cargadas:', {
                    docs: res.data.stats?.totalDocs,
                    tareas: res.data.tareas?.total,
                    personas: res.data.stats?.totalPersonas,
                });
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

    // ─── FECHA LÍMITE POR DEFECTO ─────────────────────────────
    _getDefaultDueDate() {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    // ─── CREACIÓN DIRECTA DE TAREA ────────────────────────────
   async _createTaskDirectly(title, dueDate = null) {
    log.task('Creando tarea:', { title, dueDate: dueDate?.toLocaleDateString('es-MX') });

    if (!title?.trim() || title.trim().length < 3) {
        return { success: false, message: '❌ El título debe tener al menos 3 caracteres.' };
    }
    if (title.length > 200) {
        return { success: false, message: '❌ El título no puede exceder los 200 caracteres.' };
    }

    try {
        this._setStatus('Creando tarea...');

        let fechaLimite = dueDate || this._getDefaultDueDate();
        const hoy = new Date(); hoy.setHours(0,0,0,0);
        if (fechaLimite < hoy) {
            log.warn('Fecha pasada — usando +3 días');
            fechaLimite = this._getDefaultDueDate();
        }

        const taskData = {
            titulo:      title.trim(),
            descripcion: `Tarea creada por ARIA: "${title.trim()}"${dueDate ? `. Fecha: ${dueDate.toLocaleDateString('es-MX')}` : ''}`,
            prioridad:   'media',
            estado:      'pendiente',        // ✅ CORREGIDO: antes era 'en-progreso'
            tipo:        'personal',
            asignado_a:  this.userContext?.id ? [this.userContext.id] : [],
            creado_por:      this.userContext?.id   || null,
            creado_por_nombre: this.userContext?.nombre || 'ARIA',
            fecha_limite: fechaLimite,
            recordatorio: false,
            activo:       true,
        };

        log.task('POST /tasks:', taskData);
        const response = await api.call('/tasks', { method: 'POST', body: taskData });

        if (response && (response.success || response._id)) {
            const task = response.data || response;
            log.task('✅ Tarea creada:', task._id || task.id);

            // Sincronización con el sistema
            await this._syncAfterTaskCreate(task);

            const fechaStr = fechaLimite.toLocaleDateString('es-MX', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            return {
                success: true,
                message: `✅ **Tarea creada exitosamente**\n\n📌 **"${title.trim()}"**\n\n📅 **Fecha límite:** ${fechaStr}\n🎯 **Prioridad:** Media\n📋 **Estado:** Pendiente\n\n✨ Ya está visible en la sección **Tareas**.`,
                task,
            };
        }

        throw new Error(response?.message || 'Respuesta inválida del servidor');

    } catch (error) {
        log.error('Error creando tarea:', error.message);
        return {
            success: false,
            message: `❌ **No pude crear la tarea**\n\n${error.message || 'Error de conexión. Intenta de nuevo o créala manualmente.'}`,
        };
    } finally {
        this._setStatus('En línea');
    }
}

    async _syncAfterTaskCreate(task) {
        // 1. appState
        if (window.appState?.tasks) {
            window.appState.tasks.unshift(task);
            window.appState.updateTasksStats?.();
        }
        // 2. TaskManager
        if (window.taskManager?.loadTasks) {
            try { await window.taskManager.loadTasks(); } catch(e) {}
        }
        // 3. Dashboard
        if (window.dashboard?.updateDashboardTasks) {
            try { await window.dashboard.updateDashboardTasks(); } catch(e) {}
        }
        // 4. Eventos globales
        window.dispatchEvent(new CustomEvent('taskCreated',   { detail: { task } }));
        window.dispatchEvent(new CustomEvent('tasks:updated', { detail: { task } }));
        window.dispatchEvent(new CustomEvent('tasks:reload'));
        // 5. Rerender si la pestaña está activa
        const currentTab = window.appState?.currentTab || document.querySelector('.tab.active')?.dataset?.tab;
        if (currentTab === 'tareas') {
            window.taskManager?.renderTasks?.();
        }
        // 6. Reload stats
        await this._loadStats(true);
    }

    // ─── GENERAR REPORTE ──────────────────────────────────────
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
            const timeoutId  = setTimeout(() => controller.abort(), 60000);

            const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
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
                try { const j = await response.json(); errMsg = j.message || errMsg; } catch(_) {}
                throw new Error(errMsg);
            }

            const blob = await response.blob();
            if (blob.size === 0) throw new Error('El reporte está vacío.');

            const url = URL.createObjectURL(blob);
            const a   = Object.assign(document.createElement('a'), {
                href:     url,
                download: `reporte_${reportType}_${new Date().toISOString().slice(0,10)}.${format === 'csv' ? 'csv' : 'xlsx'}`,
            });
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return {
                success: true,
                message: `✅ **Reporte ${typeLabel} generado**\n\n📄 Formato: **${formatLabel}**\n📊 Tamaño: **${this._formatBytes(blob.size)}**\n📅 ${new Date().toLocaleString('es-MX')}\n\nEl archivo se descargó automáticamente.`,
            };

        } catch (error) {
            this._showReportProgress(false);
            log.error('Error reporte:', error.message);
            const msg = error.name === 'AbortError'
                ? 'La generación tomó demasiado tiempo. Intenta con menos datos.'
                : error.message;
            return { success: false, message: `❌ **Error generando reporte**\n\n${msg}` };
        } finally {
            this._setStatus('En línea');
        }
    }

    _formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B','KB','MB','GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    // ─── ENVIAR MENSAJE ───────────────────────────────────────
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

        // ── Detección de tarea ────────────────────────────────
        const taskCmd = detectTaskCreation(text);
        if (taskCmd.detected) {
            this._showTyping(true);
            this._setStatus('Creando tarea...');
            const result = await this._createTaskDirectly(taskCmd.title, taskCmd.dueDate);
            this._showTyping(false);
            this._appendBotMessage(result.message, {
                suggestions: result.success
                    ? ['Ver mis tareas', 'Crear otra tarea', 'Ir a Tareas', 'Mis tareas para hoy']
                    : ['Intentar de nuevo', 'Ir a Tareas', 'Ayuda'],
                isTaskResult:  true,
                taskCreated:   result.success,
            });
            if (result.success) showAlert('✅ Tarea creada', 'success', 3000);
            this._finishLoading();
            return;
        }

        // ── Detección de reporte ──────────────────────────────
        const reportCmd = detectReportCommand(text);
        if (reportCmd.detected) {
            this._showTyping(true);
            this._setStatus('Generando reporte...');
            const result = await this._generateReportDirectly(reportCmd);
            this._showTyping(false);
            this._appendBotMessage(result.message, {
                suggestions: result.success
                    ? ['Generar otro reporte', 'Ir a Reportes', 'Ver documentos']
                    : ['Intentar de nuevo', 'Ir a Reportes'],
                isReportResult: true,
            });
            if (result.success) showAlert('📊 Reporte generado', 'success', 3000);
            this._finishLoading();
            return;
        }

        // ── API principal ─────────────────────────────────────
        this._showTyping(true);
        this._setStatus('ARIA está pensando...');

        try {
            const res = await api.call('/chatbot/message', {
                method: 'POST',
                body:   { message: text },
            });

            this._showTyping(false);

            if (!res?.success || !res.data) {
                throw new Error(res?.message || 'Respuesta inválida del servidor');
            }

            const { message: rawMsg, actions = [], suggestions = [], latency, conversationId, debug: dbg } = res.data;
            const cleanMsg = this._cleanJSON(rawMsg);

            log.info(`Respuesta en ${latency}ms | acciones: ${actions.length}`);
            if (dbg && ARIA_DEBUG) {
                log.info('Debug stats:', dbg);
                if (dbg.taskSchema) log.info('Task schema:', dbg.taskSchema);
            }

            this._appendBotMessage(cleanMsg, {
                actions, suggestions, latency,
                conversationId: String(conversationId || ''),
            });

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
                `⚠️ **Error de conexión**\n\nNo pude procesar tu mensaje. Verifica tu conexión e intenta de nuevo.\n\n_${err.message}_`,
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
            role:           'assistant',
            content,
            timestamp:      new Date().toISOString(),
            actions:        opts.actions        || [],
            suggestions:    opts.suggestions    || [],
            latency:        opts.latency        || null,
            conversationId: opts.conversationId || '',
            isError:        opts.isError        || false,
            isTaskResult:   opts.isTaskResult   || false,
            isReportResult: opts.isReportResult || false,
            taskCreated:    opts.taskCreated    || false,
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

    // ─── EJECUTAR ACCIONES ────────────────────────────────────
    async _executeAction(action) {
        if (!action?.action) return false;
        log.action('Ejecutando:', JSON.stringify(action));
        switch (action.action) {
            case 'navigate':  return this._doNavigate(action.target);
            case 'openModal': return this._doOpenModal(action.target);
            case 'search':    return this._doSearch(action.query, action.section);
            default:          log.warn('Acción desconocida:', action.action); return false;
        }
    }

    async _doNavigate(target) {
        if (!target) return false;
        const nav = NAV_MAP[target.toLowerCase()];
        if (!nav) {
            log.warn(`Sección "${target}" no encontrada`);
            this._appendSystemNote(`⚠️ Sección "${target}" no disponible.`);
            return false;
        }
        log.nav(`Navegando a: ${nav.label}`);
        this._setStatus(`📍 Yendo a ${nav.label}...`);
        this.close();
        await new Promise(r => setTimeout(r, 250));

        if (typeof window.switchTab === 'function') {
            try { await window.switchTab(nav.tabId); this._setStatus('En línea'); return true; } catch(e) {}
        }
        const link = document.querySelector(`[data-tab="${nav.tabId}"]`);
        if (link?.offsetParent) { link.click(); this._setStatus('En línea'); return true; }
        window.location.hash = nav.hash;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        this._setStatus('En línea');
        return true;
    }

    async _doOpenModal(target) {
        if (!target) return false;
        log.action(`Abriendo modal: ${target}`);
        this._setStatus(`Abriendo ${MODAL_LABELS[target] || target}...`);
        this.close();
        await new Promise(r => setTimeout(r, 200));

        const sectionMap = { upload:'documentos', addPerson:'personas', addTask:'tareas', addCategory:'categorias', addDepartment:'departamentos' };
        const section = sectionMap[target];
        if (section && typeof window.switchTab === 'function') {
            try { await window.switchTab(section); await new Promise(r => setTimeout(r, 300)); } catch(e) {}
        }

        const fnMap = {
            upload:        ['openDocumentModal','openUploadModal','showUploadModal'],
            addPerson:     ['openPersonModal','showPersonModal','addPersonModal'],
            addTask:       ['openTaskModal','showTaskModal','addTaskModal','openNewTaskModal'],
            addCategory:   ['openCategoryModal','showCategoryModal','addCategoryModal'],
            addDepartment: ['openDepartmentModal','showDeptModal','addDeptModal'],
            search:        ['showAdvancedSearch','openSearchModal'],
        };

        for (const fn of (fnMap[target] || [])) {
            if (typeof window[fn] === 'function') {
                try { window[fn](); this._setStatus('En línea'); return true; } catch(e) {}
            }
        }

        const btnMap = {
            upload:        ['#uploadDocumentBtn','#btnSubirDoc','#addDocumentBtn','[data-action="upload"]'],
            addPerson:     ['#addPersonBtn','#btnAgregarPersona','[data-action="addPerson"]'],
            addTask:       ['#addTaskBtn','#btnCrearTarea','#newTaskBtn','[data-action="addTask"]'],
            addCategory:   ['#addCategoryBtn','#btnNuevaCategoria'],
            addDepartment: ['#addDepartmentBtn','#btnNuevoDepto'],
            search:        ['#searchBtn','#btnBuscar','[data-action="search"]'],
        };

        for (const sel of (btnMap[target] || [])) {
            const btn = document.querySelector(sel);
            if (btn) { btn.click(); this._setStatus('En línea'); return true; }
        }

        this._appendSystemNote(`⚠️ No pude abrir **${MODAL_LABELS[target]}** automáticamente. Búscalo en la sección correspondiente.`);
        showAlert(`Ve a ${section || 'la sección'} y usa el botón de agregar`, 'info');
        this._setStatus('En línea');
        return false;
    }

    async _doSearch(query, section = 'documentos') {
        if (!query) return false;
        log.action(`Buscando "${query}" en ${section}`);
        this._setStatus(`🔍 Buscando...`);
        this.close();
        await new Promise(r => setTimeout(r, 300));

        if (NAV_MAP[section]) { await this._doNavigate(section); await new Promise(r => setTimeout(r, 500)); }

        const selectors = ['#searchInput','#docSearch','#documentSearch','input[type="search"]',
                           'input[placeholder*="buscar" i]','input[placeholder*="search" i]','.search-input'];
        for (const sel of selectors) {
            const input = document.querySelector(sel);
            if (input?.offsetParent) {
                input.value = query;
                ['input','change'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
                input.focus();
                for (const fn of ['handleDocumentSearch','searchDocuments','filterDocuments']) {
                    if (typeof window[fn] === 'function') { window[fn](); break; }
                }
                this._setStatus('En línea');
                return true;
            }
        }
        this._setStatus('En línea');
        return false;
    }

    _appendSystemNote(text) {
        this._appendBotMessage(text, { isSystem: true });
    }

    // ─── RENDERIZADO ──────────────────────────────────────────
    _renderAll() {
        if (!this._els.messages) return;
        this._els.messages.innerHTML = '';
        for (const msg of this.messages) this._appendMessage(msg, false);
        this._scrollBottom();

        const lastBot = [...this.messages].reverse().find(m => m.role === 'assistant');
        this._renderSuggestions(lastBot?.suggestions?.length ? lastBot.suggestions : this.quickSuggestions.slice(0,6));
        this._setStatus('En línea');
    }

    _appendMessage(msg, scroll = true) {
        if (!this._els.messages) return;
        const isUser = msg.role === 'user';

        const el = document.createElement('div');
        el.className = [
            'aria-msg',
            isUser ? 'aria-msg--user' : 'aria-msg--bot',
            msg.isError   ? 'aria-msg--error'   : '',
            msg.isWelcome ? 'aria-msg--welcome'  : '',
            msg.isSystem  ? 'aria-msg--system'   : '',
            (msg.taskCreated || (msg.isTaskResult && !msg.isError)) ? 'aria-msg--success' : '',
        ].filter(Boolean).join(' ');

        const contentHtml = this._parseMarkdown(msg.content);
        const timeStr     = this._formatTime(msg.timestamp);

        // Botones de acción integrados en el mensaje
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

        // Debug latency (solo localhost)
        const isLocal = ['localhost','127.0.0.1'].includes(window.location.hostname);
        const latencyHtml = (msg.latency && isLocal)
            ? `<span class="aria-msg__latency">${msg.latency}ms</span>` : '';

        // Feedback
        const feedbackHtml = (msg.conversationId && !isUser && !msg.isError && !msg.isSystem)
            ? `<button class="aria-feedback-btn" data-conv-id="${msg.conversationId}" data-feedback="true"  title="Útil">👍</button>
               <button class="aria-feedback-btn" data-conv-id="${msg.conversationId}" data-feedback="false" title="No útil">👎</button>`
            : '';

        // Copiar
        const copyHtml = (!isUser && !msg.isSystem)
            ? `<button class="aria-copy-btn" data-copy="${this._escapeAttr(msg.content)}" title="Copiar">
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
        html = html.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*?<\/li>\n?)+/gs, m => `<ul class="aria-list">${m}</ul>`);
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // ─── HISTORIAL ────────────────────────────────────────────
    async _loadHistory() {
        // Intentar desde servidor
        try {
            const res = await api.call('/chatbot/history?limit=12', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user',      content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse,  timestamp: h.timestamp },
                ]);
                this._renderAll();
                log.info(`Historial del servidor: ${res.data.length} conversaciones`);
                return;
            }
        } catch (e) {
            log.warn('No se pudo cargar historial del servidor:', e.message);
        }

        // Intentar desde localStorage
        try {
            const saved = localStorage.getItem('aria_history_v4');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.length > 0) {
                    this.messages = parsed.slice(-40);
                    this._renderAll();
                    log.info('Historial de localStorage');
                    return;
                }
            }
        } catch (e) {}

        this._showWelcome();
    }

    async _loadFromServer() {
        this._setStatus('Cargando historial...');
        try {
            const res = await api.call('/chatbot/history?limit=30', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this.messages = res.data.flatMap(h => [
                    { role: 'user',      content: h.userMessage, timestamp: h.timestamp },
                    { role: 'assistant', content: h.botResponse,  timestamp: h.timestamp },
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
        if (!confirm('¿Borrar toda la conversación? También se eliminará del servidor.')) return;
        try { await api.call('/chatbot/history', { method: 'DELETE' }); } catch(e) {}
        this.messages = [];
        localStorage.removeItem('aria_history_v4');
        this._showWelcome();
        showAlert('Conversación borrada', 'success');
    }

    _exportChat() {
        if (!this.messages.length) { showAlert('No hay conversación para exportar', 'warning'); return; }
        const data = {
            exportado: new Date().toLocaleString('es-MX'),
            usuario:   this.userContext?.nombre,
            total:     this.messages.length,
            conversacion: this.messages.map(m => ({
                rol:     m.role === 'user' ? 'Usuario' : 'ARIA',
                mensaje: m.content,
                hora:    m.timestamp ? new Date(m.timestamp).toLocaleString('es-MX') : '',
            })),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {
            href: url, download: `aria_chat_${new Date().toISOString().slice(0,10)}.json`,
        });
        a.click(); URL.revokeObjectURL(url);
        showAlert('Conversación exportada', 'success');
    }

    async _sendFeedback(conversationId, util) {
        if (!conversationId) return;
        try {
            await api.call('/chatbot/feedback', { method: 'PATCH', body: { conversationId, util } });
        } catch (e) { log.warn('Error enviando feedback:', e.message); }
    }

    // ─── BIENVENIDA ───────────────────────────────────────────
    _showWelcome() {
        const stats   = this.systemStats || {};
        const nombre  = this.userContext?.nombre || 'usuario';
        const hora    = new Date().getHours();
        const saludo  = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const s = stats.stats || {};
        const t = stats.tareas || {};

        const alertas = [
            s.docsPorVencer3 > 0 ? `🚨 **${s.docsPorVencer3}** doc(s) vencen en <3 días` : null,
            s.docsPorVencer7 > 0 ? `⚠️ **${s.docsPorVencer7}** doc(s) vencen esta semana` : null,
            s.docsVencidos   > 0 ? `❌ **${s.docsVencidos}** doc(s) vencidos` : null,
            t.vencidas       > 0 ? `⏰ **${t.vencidas}** tarea(s) vencidas` : null,
        ].filter(Boolean);

        const lines = [
            `${saludo}, **${nombre}** 👋 Soy **ARIA v4.0**, tu asistente inteligente del CBTIS051.`,
            '',
            `📊 **Estado actual del sistema:**`,
            `• ${s.totalDocs ?? 0} documentos activos`,
            `• ${t.pendientes ?? 0} tareas pendientes (${t.enProgreso ?? 0} en progreso)`,
            `• ${s.totalPersonas ?? 0} personas registradas`,
            `• ${s.totalCategorias ?? 0} categorías | ${s.totalDeptos ?? 0} departamentos`,
            ...(alertas.length > 0 ? ['', '🔔 **Alertas activas:**', ...alertas] : ['', '✅ Sin alertas urgentes.']),
            '',
            `💡 **Ahora puedo:**`,
            `• Analizar y priorizar tus tareas`,
            `• Consultas complejas: *"¿Cuál es mi tarea más urgente?"*`,
            `• Crear tareas con fecha: *"Crea tarea: X para el 15 de abril"*`,
            `• Generar reportes: *"Generar reporte de vencidos en Excel"*`,
            `• Análisis de productividad y salud del sistema`,
            '',
            `¿En qué te ayudo hoy?`,
        ].join('\n');

        this.messages = [{
            role:        'assistant',
            content:     lines,
            timestamp:   new Date().toISOString(),
            suggestions: this.quickSuggestions.slice(0, 6),
            isWelcome:   true,
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

    // ─── UI ───────────────────────────────────────────────────
    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
        this.isOpen = true;
        this._els.window?.classList.remove('aria-window--closed');
        this._els.toggle?.classList.add('aria-toggle--open');
        if (this._els.badge) this._els.badge.style.display = 'none';
        this._setStatus('En línea');
        setTimeout(() => this._els.input?.focus(), 100);
        // Recargar stats si llevan más de 2 min
        if (Date.now() - this._lastStatsLoad > 120000) this._loadStats(true);
    }

    close() {
        this.isOpen = false;
        this._els.window?.classList.add('aria-window--closed');
        this._els.toggle?.classList.remove('aria-toggle--open');
        if (this.isListening) this._stopVoice();
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
        this._els.charCount.classList.toggle('aria-char-count--warn', len > 1600);
    }

    _saveLocal() {
        try {
            localStorage.setItem('aria_history_v4', JSON.stringify(this.messages.slice(-40)));
        } catch(e) {}
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
        try { return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); }
        catch(_) { return ''; }
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

    // ─── REPORTE PROGRESS ─────────────────────────────────────
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
                    <p>Procesando datos del sistema...</p>
                    <div class="aria-report-preloader__steps">
                        <div class="aria-report-preloader__step" id="arStep1"><i class="fas fa-database"></i><span>Consultando datos</span></div>
                        <div class="aria-report-preloader__step" id="arStep2"><i class="fas fa-chart-line"></i><span>Procesando</span></div>
                        <div class="aria-report-preloader__step" id="arStep3"><i class="fas fa-${icon}"></i><span>Generando archivo</span></div>
                        <div class="aria-report-preloader__step" id="arStep4"><i class="fas fa-download"></i><span>Descargando</span></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        let step = 1;
        this._reportProgressInterval = setInterval(() => {
            const s = document.getElementById(`arStep${step}`);
            if (s) { s.classList.add('aria-report-preloader__step--active'); step++; }
            if (step > 4) clearInterval(this._reportProgressInterval);
        }, 800);
    }

    // ─── VOZ ──────────────────────────────────────────────────
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
            this.recognition.maxAlternatives = 1;
            this.recognition.continuous = false;

            this.recognition.onstart  = () => { this.isListening = true; this._updateVoiceUI(true); };
            this.recognition.onend    = () => this._stopVoice();
            this.recognition.onresult = (ev) => {
                const text = ev.results[0][0].transcript;
                log.voice('Reconocido:', text);
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
                if (ev.error === 'not-allowed') showAlert('Permite el micrófono para usar voz', 'warning');
                else if (ev.error === 'no-speech') showAlert('No detecté voz. Intenta de nuevo.', 'info', 2000);
                this._stopVoice();
            };
        } catch(e) {
            if (this._els.voiceBtn) this._els.voiceBtn.style.display = 'none';
        }
    }

    _startVoice() {
        if (!this.recognition || this.isListening) return;
        try { this.recognition.start(); } catch(e) { this._stopVoice(); }
    }

    _stopVoice() {
        try { if (this.isListening && this.recognition) this.recognition.stop(); } catch(e) {}
        this.isListening = false;
        this._updateVoiceUI(false);
    }

    _updateVoiceUI(listening) {
        if (!this._els.voiceBtn) return;
        const icon = this._els.voiceBtn.querySelector('i');
        this._els.voiceBtn.classList.toggle('aria-voice-btn--listening', listening);
        if (icon) icon.className = listening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        this._els.voiceBtn.title = listening ? 'Detener grabación' : 'Entrada de voz';
    }

    _toggleVoice() {
        if (!this.recognition) { showAlert('Voz no disponible en este navegador', 'warning'); return; }
        this.isListening ? this._stopVoice() : this._startVoice();
    }

    // ─── CREAR UI ─────────────────────────────────────────────
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
                        <span class="aria-header__name">ARIA <span class="aria-version-tag">v1.0</span></span>
                        <span class="aria-header__sub" id="ariaStatus">Cargando...</span>
                    </div>
                </div>
                <div class="aria-header__actions">
                    <button class="aria-btn-icon" id="ariaRefreshBtn"  title="Actualizar estadísticas"><i class="fas fa-sync-alt"></i></button>
                    <button class="aria-btn-icon" id="ariaHistoryBtn"  title="Cargar historial del servidor"><i class="fas fa-history"></i></button>
                    <button class="aria-btn-icon" id="ariaClearBtn"    title="Nueva conversación"><i class="fas fa-broom"></i></button>
                    <button class="aria-btn-icon" id="ariaExportBtn"   title="Exportar conversación"><i class="fas fa-download"></i></button>
                    <button class="aria-btn-icon aria-btn-close" id="ariaClose" title="Cerrar (Esc)"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div class="aria-messages" id="ariaMessages" role="log" aria-live="polite"></div>

            <div class="aria-typing" id="ariaTyping" style="display:none" aria-hidden="true">
                <div class="aria-typing__avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-typing__dots"><span></span><span></span><span></span></div>
            </div>

            <div class="aria-suggestions-bar">
                <div class="aria-suggestions__inner" id="ariaSuggestions"></div>
            </div>

            <div class="aria-input-area">
                <div class="aria-input-row">
                    <textarea
                        id="ariaInput"
                        class="aria-input"
                        rows="1"
                        placeholder="Pregúntame lo que quieras..."
                        maxlength="2000"
                        aria-label="Mensaje para ARIA"
                    ></textarea>
                    <button class="aria-voice-btn" id="ariaVoice" title="Voz" aria-label="Entrada de voz">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="aria-send-btn" id="ariaSend" title="Enviar (Ctrl+Enter)" disabled aria-label="Enviar">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="aria-input-meta">
                    <span class="aria-char-count" id="ariaCharCount">0 / 2000</span>
                    <span class="aria-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> enviar</span>
                </div>
            </div>
        </div>`;
    }

    // ─── BIND EVENTS ──────────────────────────────────────────
    _bindEvents() {
        const e = this._els;

        e.toggle?.addEventListener('click', () => this.toggle());
        document.getElementById('ariaClose')?.addEventListener('click',      () => this.close());
        document.getElementById('ariaClearBtn')?.addEventListener('click',   () => this._clearChat());
        document.getElementById('ariaExportBtn')?.addEventListener('click',  () => this._exportChat());
        document.getElementById('ariaHistoryBtn')?.addEventListener('click', () => this._loadFromServer());
        document.getElementById('ariaRefreshBtn')?.addEventListener('click', async () => {
            this._setStatus('Actualizando estadísticas...');
            await this._loadStats();
            this._setStatus('En línea ✓');
            setTimeout(() => this._setStatus('En línea'), 2000);
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

        // Chips de sugerencias
        document.getElementById('ariaSuggestions')?.addEventListener('click', ev => {
            const btn = ev.target.closest('[data-query]');
            if (btn && e.input) {
                e.input.value = btn.dataset.query;
                this._autoResize();
                this._updateSendBtn();
                this._sendMessage();
            }
        });

        // Acciones dentro de mensajes
        document.getElementById('ariaMessages')?.addEventListener('click', ev => {
            const navBtn    = ev.target.closest('[data-nav]');
            const modalBtn  = ev.target.closest('[data-modal]');
            const copyBtn   = ev.target.closest('[data-copy]');
            const fbBtn     = ev.target.closest('[data-feedback]');

            if (navBtn)   { this._doNavigate(navBtn.dataset.nav); return; }
            if (modalBtn) { this._doOpenModal(modalBtn.dataset.modal); return; }
            if (copyBtn) {
                navigator.clipboard?.writeText(copyBtn.dataset.copy)
                    .then(() => showAlert('Copiado', 'success', 1500))
                    .catch(() => {});
                return;
            }
            if (fbBtn) {
                const conv = fbBtn.dataset.convId;
                const util = fbBtn.dataset.feedback === 'true';
                this._sendFeedback(conv, util);
                fbBtn.classList.add('aria-feedback-btn--active');
                fbBtn.parentElement?.querySelectorAll('.aria-feedback-btn').forEach(b => b.disabled = true);
            }
        });

        document.addEventListener('keydown', ev => {
            if (ev.key === 'Escape' && this.isOpen) this.close();
        });

        // Escuchar eventos del sistema
        window.addEventListener('taskCreated',    () => this._loadStats(true));
        window.addEventListener('tasks:updated',  () => this._loadStats(true));
        window.addEventListener('documentSaved',  () => this._loadStats(true));
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
            console.group('%c[ARIA v4.0] Debug Info', 'color:#818cf8;font-weight:bold');
            console.log('Abierto:',    _instance.isOpen);
            console.log('Cargando:',   _instance.isLoading);
            console.log('Mensajes:',   _instance.messages.length);
            console.log('Stats:',      _instance.systemStats);
            console.log('Usuario:',    _instance.userContext);
            console.log('Voice:',      !!_instance.recognition);
            console.log('Last stats:', new Date(_instance._lastStatsLoad).toLocaleTimeString('es-MX'));
            console.log('Tareas totales:', _instance.systemStats?.tareas?.total);
            console.log('Tareas pendientes:', _instance.systemStats?.tareas?.pendientes);
            console.log('Tareas en progreso:', _instance.systemStats?.tareas?.enProgreso);
            console.groupEnd();
        };
        window.__ariaForceReload = () => {
            _instance._loadStats();
            log.info('Stats recargadas manualmente');
        };
        console.log('%c[ARIA v4.0] Debug disponible. Usa window.__ariaDebug() o window.__ariaForceReload()', 'color:#818cf8');
    }

    return _instance;
}

export default ChatbotAssistant;