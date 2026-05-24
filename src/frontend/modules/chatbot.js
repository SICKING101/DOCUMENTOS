// ============================================================
// chatbot.js — ARIA v3.0 Frontend
// CBTIS051 — Conversación natural, validaciones, carpetas
// ============================================================

import { api } from '../services/api.js';
import { showAlert } from '../utils.js';

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER
// ──────────────────────────────────────────────────────────────
const ARIA_DEBUG = true;

const log = {
    info: (...a) => ARIA_DEBUG && console.log('%c[ARIA v3]', 'color:#818cf8;font-weight:bold', ...a),
    warn: (...a) => ARIA_DEBUG && console.warn('%c[ARIA-WARN]', 'color:#f59e0b;font-weight:bold', ...a),
    error: (...a) => console.error('%c[ARIA-ERROR]', 'color:#ef4444;font-weight:bold', ...a),
    action: (...a) => ARIA_DEBUG && console.log('%c[ARIA-ACTION]', 'color:#34d399;font-weight:bold', ...a),
    nav: (...a) => ARIA_DEBUG && console.log('%c[ARIA-NAV]', 'color:#60a5fa;font-weight:bold', ...a),
    voice: (...a) => ARIA_DEBUG && console.log('%c[ARIA-VOICE]', 'color:#f59e0b;font-weight:bold', ...a),
    report: (...a) => ARIA_DEBUG && console.log('%c[ARIA-REPORT]', 'color:#10b981;font-weight:bold', ...a),
    nlp: (...a) => ARIA_DEBUG && console.log('%c[ARIA-NLP]', 'color:#c084fc;font-weight:bold', ...a),
    task: (...a) => ARIA_DEBUG && console.log('%c[ARIA-TASK]', 'color:#fb923c;font-weight:bold', ...a),
    settings: (...a) => ARIA_DEBUG && console.log('%c[ARIA-SETTINGS]', 'color:#f472b6;font-weight:bold', ...a),
    category: (...a) => ARIA_DEBUG && console.log('%c[ARIA-CATEGORY]', 'color:#fbbf24;font-weight:bold', ...a),
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
    addCategory: 'Nueva Carpeta',
    addDepartment: 'Nuevo Departamento',
    search: 'Búsqueda Avanzada',
};

// ──────────────────────────────────────────────────────────────
// 🆕 ACCIONES DE AJUSTES — Con sincronización al backend
// ──────────────────────────────────────────────────────────────
function executeSettingAction(action, value) {
    const sm = window.settingsManager;
    if (!sm) {
        log.warn('settingsManager no disponible');
        return { success: false, message: 'El módulo de ajustes no está cargado. Ve a la sección de Ajustes.' };
    }

    try {
        switch (action) {
            // ─── Tema (con sincronización al backend) ─────────
            case 'setThemeDark': {
                sm.settings.appearance.theme = 'dark';
                sm.settings.appearance.currentTheme = 'dark';
                sm.saveSettings();
                sm.applyTheme();
                // 🆕 Sincronizar con backend
                _syncThemeToBackend('dark');
                return { success: true, message: '🌙 **Tema oscuro activado.**\n\nLa interfaz ahora usa el modo oscuro.' };
            }
            case 'setThemeLight': {
                sm.settings.appearance.theme = 'light';
                sm.settings.appearance.currentTheme = 'light';
                sm.saveSettings();
                sm.applyTheme();
                // 🆕 Sincronizar con backend
                _syncThemeToBackend('light');
                return { success: true, message: '☀️ **Tema claro activado.**\n\nLa interfaz ahora usa el modo claro.' };
            }
            case 'setThemeAuto': {
                sm.settings.appearance.theme = 'auto';
                sm.calculateAndSetTheme();
                sm.saveSettings();
                sm.applyTheme();
                sm.startThemeChecker();
                return { success: true, message: '🔄 **Tema automático activado.**\n\nEl tema cambia según la hora configurada.' };
            }
            case 'toggleTheme': {
                const body = document.body;
                const isDark = body.classList.contains('dark-theme');
                const newTheme = isDark ? 'light' : 'dark';
                sm.settings.appearance.theme = newTheme;
                sm.settings.appearance.currentTheme = newTheme;
                sm.saveSettings();
                sm.applyTheme();
                // 🆕 Sincronizar con backend
                _syncThemeToBackend(newTheme);
                return {
                    success: true,
                    message: isDark
                        ? '☀️ **Cambiado a tema claro.**'
                        : '🌙 **Cambiado a tema oscuro.**',
                };
            }

            // ─── Densidad ───────────────────────────────────────
            case 'setDensityCompact': {
                sm.settings.appearance.interfaceDensity = 'compact';
                sm.saveSettings();
                sm.applyDensity();
                return { success: true, message: '📐 **Densidad compacta activada.**\n\nMás elementos visibles en pantalla.' };
            }
            case 'setDensityComfortable': {
                sm.settings.appearance.interfaceDensity = 'comfortable';
                sm.saveSettings();
                sm.applyDensity();
                return { success: true, message: '📐 **Densidad cómoda activada.**\n\nEspaciado equilibrado.' };
            }
            case 'setDensitySpacious': {
                sm.settings.appearance.interfaceDensity = 'spacious';
                sm.saveSettings();
                sm.applyDensity();
                return { success: true, message: '📐 **Densidad amplia activada.**\n\nMayor espaciado para mejor lectura.' };
            }

            // ─── Fuente ─────────────────────────────────────────
            case 'setFontSmall': {
                sm.setFontSize(14);
                sm.saveSettings();
                return { success: true, message: '🔡 **Tamaño de fuente: Pequeño (14px).**' };
            }
            case 'setFontMedium': {
                sm.setFontSize(16);
                sm.saveSettings();
                return { success: true, message: '🔡 **Tamaño de fuente: Normal (16px).**' };
            }
            case 'setFontLarge': {
                sm.setFontSize(18);
                sm.saveSettings();
                return { success: true, message: '🔡 **Tamaño de fuente: Grande (18px).**' };
            }

            // ─── Accesibilidad ──────────────────────────────────
            case 'toggleHighContrast': {
                const current = sm.settings.accessibility.highContrast;
                sm.settings.accessibility.highContrast = !current;
                sm.saveSettings();
                sm.applyAccessibility();
                return {
                    success: true,
                    message: !current
                        ? '♿ **Alto contraste activado.**\n\nMejora la visibilidad del texto.'
                        : '♿ **Alto contraste desactivado.**',
                };
            }
            case 'enableHighContrast': {
                sm.settings.accessibility.highContrast = true;
                sm.saveSettings();
                sm.applyAccessibility();
                return { success: true, message: '♿ **Alto contraste activado.**' };
            }
            case 'disableHighContrast': {
                sm.settings.accessibility.highContrast = false;
                sm.saveSettings();
                sm.applyAccessibility();
                return { success: true, message: '♿ **Alto contraste desactivado.**' };
            }
            case 'toggleReducedMotion': {
                const current = sm.settings.accessibility.reducedMotion;
                sm.settings.accessibility.reducedMotion = !current;
                sm.saveSettings();
                sm.applyAccessibility();
                return {
                    success: true,
                    message: !current
                        ? '🎭 **Movimiento reducido activado.**\n\nAnimaciones minimizadas.'
                        : '🎭 **Movimiento reducido desactivado.**',
                };
            }

            // ─── Auto-logout ────────────────────────────────────
            case 'enableAutoLogout': {
                sm.settings.privacy.autoLogout = true;
                sm.saveSettings();
                sm.applyPrivacy();
                const mins = sm.settings.privacy.autoLogoutTime || 30;
                return { success: true, message: `🔒 **Auto-cierre de sesión activado.**\n\nSe cerrará después de **${mins} minutos** de inactividad.` };
            }
            case 'disableAutoLogout': {
                sm.settings.privacy.autoLogout = false;
                sm.clearAutoLogout();
                sm.saveSettings();
                return { success: true, message: '🔓 **Auto-cierre de sesión desactivado.**' };
            }
            case 'setAutoLogout5': {
                sm.settings.privacy.autoLogoutTime = 5;
                if (sm.settings.privacy.autoLogout) sm.setupAutoLogout(5);
                sm.saveSettings();
                return { success: true, message: '⏱️ **Tiempo de auto-cierre: 5 minutos.**' };
            }
            case 'setAutoLogout15': {
                sm.settings.privacy.autoLogoutTime = 15;
                if (sm.settings.privacy.autoLogout) sm.setupAutoLogout(15);
                sm.saveSettings();
                return { success: true, message: '⏱️ **Tiempo de auto-cierre: 15 minutos.**' };
            }
            case 'setAutoLogout30': {
                sm.settings.privacy.autoLogoutTime = 30;
                if (sm.settings.privacy.autoLogout) sm.setupAutoLogout(30);
                sm.saveSettings();
                return { success: true, message: '⏱️ **Tiempo de auto-cierre: 30 minutos.**' };
            }
            case 'setAutoLogout60': {
                sm.settings.privacy.autoLogoutTime = 60;
                if (sm.settings.privacy.autoLogout) sm.setupAutoLogout(60);
                sm.saveSettings();
                return { success: true, message: '⏱️ **Tiempo de auto-cierre: 1 hora.**' };
            }

            // ─── Info de ajustes actuales ───────────────────────
            case 'getSettingsStatus': {
                const s = sm.settings;
                const body = document.body;
                const temaActual = body.classList.contains('dark-theme') ? '🌙 Oscuro' : '☀️ Claro';
                return {
                    success: true,
                    message: `⚙️ **Ajustes Actuales:**\n\n` +
                        `🎨 **Tema:** ${temaActual} (config: ${s.appearance.theme})\n` +
                        `📐 **Densidad:** ${s.appearance.interfaceDensity}\n` +
                        `🔡 **Fuente:** ${s.accessibility.fontSize}px\n` +
                        `♿ **Alto contraste:** ${s.accessibility.highContrast ? 'Sí' : 'No'}\n` +
                        `🎭 **Movimiento reducido:** ${s.accessibility.reducedMotion ? 'Sí' : 'No'}\n` +
                        `🔒 **Auto-cierre:** ${s.privacy.autoLogout ? `Sí (${s.privacy.autoLogoutTime} min)` : 'No'}\n` +
                        `🌐 **Idioma:** ${s.preferences.language === 'es' ? 'Español' : s.preferences.language}`,
                };
            }

            default:
                return { success: false, message: `Acción de ajuste desconocida: ${action}` };
        }
    } catch (e) {
        log.error('Error en executeSettingAction:', e);
        return { success: false, message: `Error al aplicar ajuste: ${e.message}` };
    }
}

// 🆕 Sincronizar tema con el backend
async function _syncThemeToBackend(theme) {
    try {
        await api.call('/chatbot/theme', { method: 'POST', body: { theme } });
        log.settings(`✅ Tema "${theme}" sincronizado con backend`);
    } catch (e) {
        log.warn('No se pudo sincronizar tema con backend:', e.message);
    }
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN NLP DE AJUSTES
// ──────────────────────────────────────────────────────────────
function detectSettingCommand(message) {
    const q = message.toLowerCase().trim();

    // Tema oscuro
    if (/\b(tema|modo|activa|pon|cambia|switch|enciende)\b.*\b(oscuro|dark|noche)\b|\b(oscuro|dark|noche)\b.*\b(tema|modo)\b/i.test(q))
        return { detected: true, action: 'setThemeDark' };

    // Tema claro
    if (/\b(tema|modo|activa|pon|cambia|switch|enciende)\b.*\b(claro|light|día|blanco)\b|\b(claro|light|día)\b.*\b(tema|modo)\b/i.test(q))
        return { detected: true, action: 'setThemeLight' };

    // Tema automático
    if (/\b(tema|modo)\b.*\b(auto|automático|automática|automático|sistema)\b|\b(auto|automático)\b.*\b(tema|modo)\b/i.test(q))
        return { detected: true, action: 'setThemeAuto' };

    // Toggle tema
    if (/\b(cambia|cambiar|toggle|alterna|alternar)\b.*\btema\b|\btema\b.*\b(cambia|toggle)\b/i.test(q))
        return { detected: true, action: 'toggleTheme' };

    // Estado de ajustes
    if (/\b(cómo están|estado de|ver|muéstrame|dime|cuáles son)\b.*\b(ajustes|configurac|preferencias|settings)\b/i.test(q))
        return { detected: true, action: 'getSettingsStatus' };

    // Densidad
    if (/densidad.*compact|compact.*densidad/i.test(q)) return { detected: true, action: 'setDensityCompact' };
    if (/densidad.*ampli|ampli.*densidad|densidad.*espaci/i.test(q)) return { detected: true, action: 'setDensitySpacious' };
    if (/densidad.*cómod|cómod.*densidad|densidad.*normal/i.test(q)) return { detected: true, action: 'setDensityComfortable' };

    // Fuente
    if (/fuente.*pequeñ|pequeñ.*fuente|letra.*pequeñ|tamaño.*pequeñ/i.test(q)) return { detected: true, action: 'setFontSmall' };
    if (/fuente.*grande|grande.*fuente|letra.*grande|tamaño.*grande/i.test(q)) return { detected: true, action: 'setFontLarge' };
    if (/fuente.*normal|normal.*fuente|fuente.*medium|reset.*fuente/i.test(q)) return { detected: true, action: 'setFontMedium' };

    // Alto contraste
    if (/\b(activa|enciende|pon)\b.*\b(alto contraste|contraste)\b/i.test(q)) return { detected: true, action: 'enableHighContrast' };
    if (/\b(desactiva|apaga|quita)\b.*\b(alto contraste|contraste)\b/i.test(q)) return { detected: true, action: 'disableHighContrast' };
    if (/\b(toggle|alterna)\b.*\b(contraste)\b|\balto contraste\b/i.test(q)) return { detected: true, action: 'toggleHighContrast' };

    // Movimiento reducido
    if (/movimiento reducido|reduce.*animaci|menos.*animaci/i.test(q)) return { detected: true, action: 'toggleReducedMotion' };

    // Auto-logout
    if (/\b(activa|enciende)\b.*\b(auto.?logout|auto.?cierre|cierre automático|cerrar sesión auto)\b/i.test(q))
        return { detected: true, action: 'enableAutoLogout' };
    if (/\b(desactiva|apaga)\b.*\b(auto.?logout|auto.?cierre|cierre automático)\b/i.test(q))
        return { detected: true, action: 'disableAutoLogout' };
    if (/auto.?logout.*5 min|5 min.*auto.?logout/i.test(q)) return { detected: true, action: 'setAutoLogout5' };
    if (/auto.?logout.*15 min|15 min.*auto.?logout/i.test(q)) return { detected: true, action: 'setAutoLogout15' };
    if (/auto.?logout.*30 min|30 min.*auto.?logout/i.test(q)) return { detected: true, action: 'setAutoLogout30' };
    if (/auto.?logout.*1 hora|auto.?logout.*60 min/i.test(q)) return { detected: true, action: 'setAutoLogout60' };

    return { detected: false };
}

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
    const patterns = [
        { regex: /(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:de\s+)?(\d{4}))?/i, handler: 'dayMonth' },
        { regex: /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/, handler: 'numeric' },
        { regex: /\bpasado\s+mañana\b/i, handler: 'pasadoMañana' },
        { regex: /\bmañana\b/i, handler: 'mañana' },
        { regex: /\b(hoy|para\s+hoy|el\s+d[ií]a\s+de\s+hoy)\b/i, handler: 'hoy' },
        { regex: /en\s+(\d+)\s+d[ií]as?/i, handler: 'days' },
        { regex: /\b(pr[oó]xima?\s+semana|pr[oó]ximos?\s+7\s+d[ií]as?)\b/i, handler: 'nextWeek' },
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
                return d;
            }
            case 'numeric': {
                const year = match[3] ? parseInt(match[3]) : now.getFullYear();
                const d = new Date(year, parseInt(match[2]) - 1, parseInt(match[1]), 23, 59, 59, 999);
                return d;
            }
            case 'mañana': {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'pasadoMañana': {
                const d = new Date();
                d.setDate(d.getDate() + 2);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'hoy': {
                const d = new Date();
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'days': {
                const d = new Date();
                d.setDate(d.getDate() + parseInt(match[1]));
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'nextWeek': {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'nextMonth': {
                const d = new Date();
                d.setMonth(d.getMonth() + 1);
                d.setHours(23, 59, 59, 999);
                return d;
            }
            case 'weekend': {
                const d = new Date();
                const daysUntilFri = (5 - d.getDay() + 7) % 7;
                d.setDate(d.getDate() + (daysUntilFri || 7));
                d.setHours(23, 59, 59, 999);
                return d;
            }
        }
    }
    return null;
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN NLP DE COMANDOS (TAREAS, PERSONAS, CARPETAS)
// ──────────────────────────────────────────────────────────────

// 🆕 Detección de creación de carpeta/subcarpeta
function detectCategoryCreation(message) {
    const original = message.trim();
    const q = original.toLowerCase().trim();

    // 🆕 AGREGADOS MÁS VERBOS: "crees", "quiero que crees", "podrías crear", etc.
    const hasCreateVerb = /\b(crea(?:r)?|crees?|nueva?|agrega(?:r)?|a[ñn]ade?|creame|quiero\s+que\s+crees?|podr[ií]as\s+crear?|me\s+creas?|me\s+haces?)\s+(?:una?\s+)?(?:nueva\s+)?(?:carpeta|categor[ií]a|folder|subcarpeta|subcategor[ií]a)\b/i.test(q);
    
    if (!hasCreateVerb) {
        log.category('⛔ No se detectó verbo de creación de carpeta:', q.substring(0, 80));
        return { detected: false };
    }

    let nombre = '';
    let descripcion = '';
    let color = '#4f46e5';
    let icon = 'folder';
    let parent_id = null;
    let isSubcategory = false;

    // Detectar si es subcarpeta - MEJORADO con múltiples patrones
    const subcategoryPatterns = [
        /\b(subcarpeta|subcategor[ií]a|sub-carpeta)\b/i,
        /\b(dentro\s+de|en\s+la\s+carpeta|en\s+\w+)\s+(?:llamada|llamado|nombrada|llamadas?)\b/i,
        /(?:una\s+)?(?:subcarpeta|subcategor[ií]a)\s+(?:en|dentro\s+de)\s+\w+/i,
        // 🆕 "subcarpeta en X llamada Y"
        /subcarpeta\s+en\s+["']?\w+["']?\s+llamad[ao]s?\s+["']?\w+["']?/i,
        // 🆕 "en maestros llamadas José" (después de "crea una subcarpeta")
        /(?:crea|crees?|nueva)\s+(?:una\s+)?(?:subcarpeta|subcategor[ií]a)\s+en\s+/i,
    ];
    
    for (const pattern of subcategoryPatterns) {
        if (pattern.test(q)) {
            isSubcategory = true;
            log.category('✅ Detectada creación de SUBCARPETA');
            break;
        }
    }

    // 🆕 Extraer "subcarpeta en X llamada Y" - Caso específico
    const subEnMatch = original.match(/(?:subcarpeta|subcategor[ií]a)\s+(?:en|dentro\s+de)\s+["']?(\w+(?:\s+\w+)*)["']?\s+(?:llamada|llamado|nombrada|llamadas?)\s+["']?(.+?)["']?\s*$/i);
    if (subEnMatch) {
        isSubcategory = true;
        parent_id = subEnMatch[1].trim();
        nombre = subEnMatch[2].trim().replace(/^["']|["']$/g, '');
        log.category('✅ Subcarpeta detectada (patrón directo):', { parent: parent_id, nombre });
    }

    // 🆕 Extraer "en X llamadas Y" (cuando ya se detectó subcarpeta pero no se extrajo)
    if (isSubcategory && !parent_id) {
        const enMatch = original.match(/(?:en|dentro\s+de)\s+["']?(\w+(?:\s+\w+)*)["']?\s+(?:llamada|llamado|nombrada|llamadas?)\s+["']?(.+?)["']?\s*$/i);
        if (enMatch) {
            parent_id = enMatch[1].trim();
            if (!nombre) {
                nombre = enMatch[2].trim().replace(/^["']|["']$/g, '');
            }
            log.category('✅ Subcarpeta detectada (patrón "en X llamada Y"):', { parent: parent_id, nombre });
        }
    }

    // Si no se extrajo nombre con los patrones de subcarpeta, usar los patrones generales
    if (!nombre) {
        // Extraer nombre - MÚLTIPLES PATRONES para mayor compatibilidad
        const nombrePatterns = [
            // "llamada X", "nombrada X", "con nombre X"
            /(?:llamada|llamado|nombrada|nombrado|nombre|con\s+nombre)\s+["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|dentro|color|descripci[oó]n|$))/i,
            // nombre: X
            /nombre\s*:?\s*["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|dentro|color|descripci[oó]n|$))/i,
            // "crea una carpeta X", "crea una categoría X"
            /(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada\s+)?["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|dentro|color|descripci[oó]n|$))/i,
            // 🆕 "crees una categoría llamada X" (con "crees")
            /(?:crees?|quiero\s+que\s+crees?|podr[ií]as\s+crear?)\s+(?:una?\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada\s+)?["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|dentro|color|descripci[oó]n|$))/i,
            // 🆕 "quiero que crees una categoría llamada X"
            /quiero\s+que\s+crees?\s+(?:una?\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada\s+)?["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|dentro|color|$))/i,
            // 🆕 "quiero que crees una categoría X" (sin "llamada")
            /quiero\s+que\s+crees?\s+(?:una?\s+)?(?:carpeta|categor[ií]a|folder)\s+["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|dentro|color|$))/i,
        ];
        
        for (const pattern of nombrePatterns) {
            const match = original.match(pattern);
            if (match?.[1]) {
                nombre = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '');
                log.category('✅ Nombre de carpeta detectado:', nombre);
                break;
            }
        }

        // 🆕 Si no encontró nombre, intentar extraerlo después de "carpeta/categoría"
        if (!nombre) {
            const afterKeyword = original.match(/(?:carpeta|categor[ií]a|folder)\s+(.+)/i);
            if (afterKeyword?.[1]) {
                // Limpiar palabras como "llamada", "nombrada", "que se llame"
                let possibleName = afterKeyword[1]
                    .replace(/^(?:llamada|llamado|nombrada|nombrado|que\s+se\s+llame|que\s+se\s+llama|con\s+nombre\s+de)\s+/i, '')
                    .trim();
                
                // Tomar solo hasta el primer separador
                const separators = [',', '.', ' con ', ' que ', ' cuyo ', ' su ', ' y ', ' de color ', ' color ', ' en '];
                let endIndex = possibleName.length;
                for (const sep of separators) {
                    const idx = possibleName.indexOf(sep);
                    if (idx > 0 && idx < endIndex) {
                        endIndex = idx;
                    }
                }
                
                nombre = possibleName.substring(0, endIndex).trim();
                nombre = nombre.replace(/^["']|["']$/g, '').trim();
                
                if (nombre && nombre.length >= 2) {
                    log.category('✅ Nombre de carpeta (extracción alternativa):', nombre);
                }
            }
        }
    }

    // 🆕 Si todavía no hay parent_id pero es subcarpeta, intentar extraer "en X"
    if (isSubcategory && !parent_id) {
        const enPatterns = [
            /(?:en|dentro\s+de)\s+(?:la\s+)?(?:carpeta|categor[ií]a)?\s*["']?(\w+(?:\s+\w+)*)["']?\s*(?:llamada|llamado|nombrada|llamadas?)?/i,
            /(?:en|dentro\s+de)\s+["']?(\w+(?:\s+\w+)*)["']?/i,
        ];
        for (const pattern of enPatterns) {
            const match = original.match(pattern);
            if (match?.[1]) {
                const possibleParent = match[1].trim();
                // No tomar como padre si es el nombre de la carpeta
                if (possibleParent.toLowerCase() !== nombre.toLowerCase()) {
                    parent_id = possibleParent;
                    log.category('✅ Carpeta padre detectada:', parent_id);
                    break;
                }
            }
        }
    }

    // Extraer color
    const colorMatch = original.match(/color\s+(?:es\s+)?["']?(#[0-9a-fA-F]{6}|rojo|azul|verde|amarillo|morado|naranja|gris|negro|blanco)["']?/i);
    if (colorMatch) {
        const colorMap = {
            'rojo': '#ef4444', 'azul': '#3b82f6', 'verde': '#10b981',
            'amarillo': '#f59e0b', 'morado': '#8b5cf6', 'naranja': '#f97316',
            'gris': '#6b7280', 'negro': '#1f2937', 'blanco': '#f9fafb',
        };
        color = colorMatch[1].startsWith('#') ? colorMatch[1] : (colorMap[colorMatch[1].toLowerCase()] || '#4f46e5');
        log.category('Color detectado:', color);
    }

    // Extraer descripción
    const descPatterns = [
        /(?:que\s+)?su\s+descripci[oó]n\s+(?:sea|es)\s+["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|$))/i,
        /descripci[oó]n\s*:?\s*["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|$))/i,
    ];
    for (const pattern of descPatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            descripcion = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '');
            log.category('Descripción detectada:', descripcion);
            break;
        }
    }

    if (!nombre || nombre.length < 2) {
        log.category('⛔ Nombre de carpeta inválido:', nombre);
        return { detected: false };
    }

    log.category('✅ Carpeta detectada:', { 
        nombre, 
        isSubcategory, 
        parent_id, 
        color, 
        descripcion: descripcion?.substring(0, 30) 
    });
    
    return {
        detected: true,
        nombre,
        descripcion,
        color,
        icon,
        parent_id,
        isSubcategory,
        missing: isSubcategory && !parent_id ? ['carpeta_padre'] : [],
    };
}

function detectTaskCreation(message) {
    const original = message.trim();
    const q = original.toLowerCase().trim();

    const hasCreateVerb = /\b(crea(?:r)?|nueva?|agrega(?:r)?|a[ñn]ade?|registra(?:r)?|pon(?:er)?|haz|elabora|genera|creame|crear)\s+(?:una?\s+)?(?:nueva\s+)?tarea\b/i.test(q);
    if (!hasCreateVerb) return { detected: false };

    let title = '';
    let description = '';
    let priority = 'media';
    let category = '';
    let dueDate = null;
    let hourLimit = null;

    let rest = original.replace(/(?:crea(?:r)?|nueva?|agrega(?:r)?|a[ñn]ade?|registra(?:r)?|pon(?:er)?|haz|elabora|genera|creame|crear)\s+(?:una?\s+)?(?:nueva\s+)?tarea\s*/i, '').trim();

    log.nlp('Texto después del verbo de tarea:', rest.substring(0, 120));

    // 🆕 REGLA #1: Si después del verbo NO hay nada (o solo palabras vagas), NO es creación válida
    if (!rest || /^(?:por\s+)?(?:favor|fa|pls|please|ya|ahora|porfi|porfis|gracias)\s*$/i.test(rest)) {
        log.nlp('⛔ Sin detalles después del verbo de tarea');
        return { detected: false };
    }

    // 🆕 REGLA #2: Si el usuario dice "crea una tarea" seguido de otra intención vaga
    if (/^(?:para|de|sobre|acerca\s+de)\s+(?:el|la|los|las)?\s*(?:mañana|hoy|pasado|semana|mes)\s*$/i.test(rest)) {
        log.nlp('⛔ Intención vaga después de "crea una tarea":', rest);
        return { detected: false };
    }

    // Extraer título
    const llamadaMatch = rest.match(/^(?:llamada|llamado|titulada|titulado|nombrada|nombrado|con\s+titulo|con\s+título)\s+["']?(.+?)["']?\s*(?:,|\.|que|con|cuya|su|y|$)/i);
    if (llamadaMatch) {
        title = llamadaMatch[1].trim();
        rest = rest.substring(llamadaMatch[0].length).trim();
        log.nlp('Título vía "llamada":', title);
    } else {
        // 🆕 Buscar el título de forma más inteligente
        // Primero, ver si hay una estructura "tarea X para Y" o "tarea X con Y"
        const structuralMatch = rest.match(/^["']?(.+?)["']?\s+(?:para|con|que|cuya|su|de|del|a|en|por)\s+/i);
        if (structuralMatch) {
            title = structuralMatch[1].trim();
            rest = rest.substring(structuralMatch[0].length).trim();
            log.nlp('Título vía estructura:', title);
        } else {
            // Si no hay estructura clara, tomar hasta el primer separador natural
            const separators = [
                /\s*,\s*que\s+su\b/i, /\s*,\s*que\b/i, /\s*,\s*con\s+fecha\b/i,
                /\s*,\s*con\b/i, /\s*,\s*cuya\b/i, /\s*,\s*su\b/i,
                /\s*,\s*para\b/i, /\s*\.\s*que\b/i, /\s*\.\s*su\b/i, /\s*\.\s*la\b/i,
                /\s+para\s+(?:el|la|los|las)\s+/i, /\s+con\s+(?:fecha|prioridad|descripci)/i,
            ];
            let titleEndIndex = rest.length;
            for (const sep of separators) {
                const match = rest.match(sep);
                if (match && match.index > 0 && match.index < titleEndIndex) {
                    titleEndIndex = match.index;
                }
            }

            // 🆕 Si el título es muy largo (>80 chars), truncar en el primer espacio después de 60 chars
            if (titleEndIndex > 80) {
                const truncated = rest.substring(0, 80);
                const lastSpace = truncated.lastIndexOf(' ');
                if (lastSpace > 10) {
                    titleEndIndex = lastSpace;
                }
            }

            title = titleEndIndex < rest.length ? rest.substring(0, titleEndIndex).trim() : rest;
            rest = titleEndIndex < rest.length ? rest.substring(titleEndIndex).trim() : '';
            log.nlp('Título vía separadores:', title);
        }
    }

    title = title.replace(/^["']|["']$/g, '').replace(/^[,.\s]+|[,.\s]+$/g, '').trim();

    // 🆕 REGLA #3: Validar que el título NO sea una palabra vaga
    const VAGUE_TITLES = /^(?:quiero|quisiera|necesito|deseo|me\s+gustar[ií]a|algo|una\s+tarea|un\s+documento|un\s+reporte|lo\s+que\s+sea|cualquier\s+cosa|no\s+s[eé])\s*$/i;
    if (VAGUE_TITLES.test(title)) {
        log.nlp('⛔ Título vago detectado:', title);
        return { detected: false };
    }

    // 🆕 REGLA #4: El título debe tener al menos 2 caracteres y no más de 200
    if (!title || title.length < 2 || title.length > 200) {
        log.nlp('⛔ Título inválido (longitud):', title?.length);
        return { detected: false };
    }

    // Extraer descripción
    const descPatterns = [
        /(?:que\s+)?su\s+descripci[oó]n\s+(?:sea|es|ser[aá]|ser[ií]a)\s+["']?(.+?[^"'])["']?(?:\s*(?:,|\.|que|con|cuya|su|y|a\s+las|$))/i,
        /descripci[oó]n\s*:\s*["']?(.+?[^"'])["']?(?:\s*(?:,|\.|que|con|cuya|su|y|$))/i,
        /con\s+descripci[oó]n\s+["']?(.+?[^"'])["']?(?:\s*(?:,|\.|que|con|cuya|su|y|$))/i,
    ];
    for (const pattern of descPatterns) {
        const match = rest.match(pattern) || q.match(pattern);
        if (match?.[1]) {
            description = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '').replace(/\s+a\s+las\s+.*$/i, '').trim();
            log.nlp('Descripción detectada:', description);
            break;
        }
    }

    // Extraer categoría
    const catPatterns = [
        /(?:que\s+)?su\s+categor[ií]a\s+(?:sea|es|ser[aá]|ser[ií]a)\s+["']?(.+?[^"'])["']?(?:\s*(?:,|\.|que|con|cuya|su|y|a\s+las|$))/i,
        /categor[ií]a\s*:\s*["']?(.+?[^"'])["']?(?:\s*(?:,|\.|que|con|cuya|su|y|$))/i,
        /(?:que\s+)?su\s+categor[ií]a\s+["']?(.+?[^"'])["']?(?:\s*(?:,|\.|que|con|cuya|su|y|a\s+las|$))/i,
    ];
    for (const pattern of catPatterns) {
        const match = rest.match(pattern) || q.match(pattern);
        if (match?.[1]) {
            category = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '').replace(/\s+a\s+las\s+.*$/i, '').trim();
            log.nlp('Categoría detectada:', category);
            break;
        }
    }

    // Extraer prioridad
    if (/(?:su\s+)?prioridad\s+(?:es|sea|ser[aá])\s+(alta|cr[ií]tica|media|baja)/i.test(q)) {
        const m = q.match(/(?:su\s+)?prioridad\s+(?:es|sea|ser[aá])\s+(alta|cr[ií]tica|media|baja)/i);
        if (m) { const p = m[1].toLowerCase(); priority = p === 'crítica' || p === 'critica' ? 'critica' : p; }
    } else if (/prioridad\s+(alta|cr[ií]tica|media|baja)/i.test(q)) {
        const m = q.match(/prioridad\s+(alta|cr[ií]tica|media|baja)/i);
        if (m) { const p = m[1].toLowerCase(); priority = p === 'crítica' || p === 'critica' ? 'critica' : p; }
    }
    log.nlp('Prioridad detectada:', priority);

    // Extraer hora (ej: "a las 11:00 AM", "a las 3pm", "11:00")
    const timePatterns = [
        /a\s+las?\s+(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i,
        /a\s+las?\s+(\d{1,2})\s*(am|pm|AM|PM)?/i,
        /hora\s+(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i,
    ];
    for (const pattern of timePatterns) {
        const match = original.match(pattern);
        if (match) {
            let hours = parseInt(match[1]);
            const minutes = match[2] ? parseInt(match[2]) : 0;
            const meridiem = (match[2] || match[3] || '').toLowerCase();
            if (meridiem === 'pm' && hours < 12) hours += 12;
            if (meridiem === 'am' && hours === 12) hours = 0;
            hourLimit = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            log.nlp('Hora detectada:', hourLimit);
            break;
        }
    }

    // Extraer fecha
    dueDate = parseDateFromText(original);
    if (dueDate) {
        log.nlp('Fecha detectada:', dueDate.toLocaleDateString('es-MX'));
    }

    log.nlp('✅ Tarea detectada:', { title, priority, category, dueDate: dueDate?.toISOString(), hourLimit });
    return { detected: true, title, description, priority, category, dueDate, hourLimit };
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN DE ELIMINAR / COMPLETAR TAREAS
// ──────────────────────────────────────────────────────────────
function detectTaskAction(message) {
    const q = message.toLowerCase().trim();
    const original = message.trim();

    // ELIMINAR TAREA
    const deletePatterns = [
        /(?:elimina|borra|quita|remover|suprime|eliminar|borrar|quitar)\s+(?:la\s+)?tarea\s+(?:llamada|titulada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        /(?:borrame|eliminame|quitame)\s+(?:la\s+)?tarea\s+(?:llamada|titulada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of deletePatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            let taskName = match[1].trim();
            taskName = taskName.replace(/^(?:llamada|titulada|nombrada|de)\s+/i, '');
            taskName = taskName.replace(/^["']|["']$/g, '').trim();
            if (taskName.length >= 2) return { detected: true, action: 'delete', taskName };
        }
    }

    // COMPLETAR TAREA
    const completePatterns = [
        /(?:completa|completar|marca|marcar|termina|terminar|finaliza|finalizar)\s+(?:la\s+)?tarea\s+(?:llamada|titulada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        /(?:completame|marcame|terminame)\s+(?:la\s+)?tarea\s+(?:llamada|titulada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        /tarea\s+(?:completada|terminada|finalizada|hecha|lista)\s*:?\s*["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of completePatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            let taskName = match[1].trim();
            taskName = taskName.replace(/^(?:llamada|titulada|nombrada|de)\s+/i, '');
            taskName = taskName.replace(/^["']|["']$/g, '').trim();
            if (taskName.length >= 2) return { detected: true, action: 'complete', taskName };
        }
    }

    // EDITAR TAREA
    const editPatterns = [
        /(?:cambia|cambiar|modifica|modificar|edita|editar|actualiza|actualizar|renombra|renombrar)\s+(?:el\s+)?(?:t[ií]tulo|nombre|descripci[oó]n|prioridad|fecha)\s+(?:de\s+)?(?:la\s+)?tarea\s+(?:llamada|titulada|nombrada|de\s+)?\s*["']?(.+?)["']?\s+(?:a|por|para)\s+["']?(.+?)["']?\s*$/i,
        /(?:cambia|cambiar|modifica|modificar|edita|editar|renombra|renombrar)\s+(?:la\s+)?tarea\s+(?:llamada|titulada|nombrada|de\s+)?\s*["']?(.+?)["']?\s+(?:a|por|para)\s+["']?(.+?)["']?\s*$/i,
        /(?:pon(?:le)?|asigna(?:le)?|cambia(?:le)?)\s+(?:el\s+)?(?:t[ií]tulo|nombre|descripci[oó]n|prioridad|fecha|fecha\s+l[ií]mite|fecha\s+de\s+vencimiento)\s+(?:a|de|para)\s+(?:la\s+)?tarea\s+(?:llamada|titulada|nombrada|de\s+)?\s*["']?(.+?)["']?\s+(?:a|como|con|por|para)\s+["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of editPatterns) {
        const match = original.match(pattern);
        if (match?.[2]) {
            let taskName = match[1].trim().replace(/^(?:llamada|titulada|nombrada|de)\s+/i, '').replace(/^["']|["']$/g, '').trim();
            const newValue = match[2].trim().replace(/^["']|["']$/g, '');
            let field = 'titulo';
            if (/descripci[oó]n/i.test(q)) field = 'descripcion';
            else if (/prioridad/i.test(q)) field = 'prioridad';
            else if (/fecha/i.test(q)) field = 'fecha_limite';
            if (taskName.length >= 2 && newValue.length >= 1) return { detected: true, action: 'edit', taskName, field, newValue };
        }
    }

    return { detected: false };
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN DE CREACIÓN DE PERSONAS
// ──────────────────────────────────────────────────────────────
function detectPersonCreation(message) {
    const original = message.trim();
    const q = original.toLowerCase().trim();

    const hasCreateVerb = /\b(crea(?:r)?|nueva?|agrega(?:r)?|a[ñn]ade?|registra(?:r)?|pon(?:er)?|haz|elabora|genera|creame|crear|dar\s+de\s+alta)\s+(?:una?\s+)?(?:nueva\s+)?persona\b/i.test(q);
    if (!hasCreateVerb) return { detected: false };

    let nombre = '';
    let email = '';
    let telefono = '';
    let departamento = '';
    let puesto = '';

    // Extraer nombre
    const nombrePatterns = [
        /(?:llamada|llamado|nombrada|nombrado|nombre|con\s+nombre)\s+["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|email|correo|$))/i,
        /nombre\s*:?\s*["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|email|correo|$))/i,
    ];
    for (const pattern of nombrePatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            nombre = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '');
            break;
        }
    }

    // Extraer email
    const emailMatch = original.match(/(?:email|correo|e-mail)\s+(?:es\s+)?["']?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})["']?/i);
    if (emailMatch) email = emailMatch[1].trim();

    // Extraer teléfono
    const phonePatterns = [
        /(?:tel[eé]fono|phone|celular|m[oó]vil|n[uú]mero)\s+(?:es\s+)?["']?(\d{8,10})["']?/i,
        /(?:tel[eé]fono|phone|celular|m[oó]vil|n[uú]mero)\s*:?\s*["']?(\d{8,10})["']?/i,
    ];
    for (const pattern of phonePatterns) {
        const match = original.match(pattern);
        if (match?.[1]) { telefono = match[1].trim(); break; }
    }

    // Extraer departamento
    const deptPatterns = [
        /(?:departamento|departamento|depto|área|area)\s+(?:es\s+)?["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|email|correo|tel[eé]fono|puesto|$))/i,
        /(?:departamento|departamento|depto|área|area)\s*:?\s*["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|email|correo|tel[eé]fono|puesto|$))/i,
    ];
    for (const pattern of deptPatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            departamento = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '');
            break;
        }
    }

    // Extraer puesto
    const puestoPatterns = [
        /(?:puesto|cargo|rol|posici[oó]n|trabaja\s+como)\s+(?:es\s+)?["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|email|correo|tel[eé]fono|departamento|$))/i,
        /(?:puesto|cargo|rol|posici[oó]n)\s*:?\s*["']?(.+?)["']?(?:\s*(?:,|\.|que|con|cuya|su|y|email|correo|tel[eé]fono|departamento|$))/i,
    ];
    for (const pattern of puestoPatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            puesto = match[1].trim().replace(/^["']|["']$/g, '').replace(/[,.\s]+$/g, '');
            break;
        }
    }

    const missing = [];
    if (!nombre) missing.push('nombre');
    if (!email) missing.push('email');
    if (!telefono) missing.push('teléfono');
    if (!departamento) missing.push('departamento');
    if (!puesto) missing.push('puesto');

    return {
        detected: true,
        nombre, email, telefono, departamento, puesto,
        missing,
        hasAllRequired: nombre && email && departamento
    };
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN DE ACCIONES SOBRE PERSONAS
// ──────────────────────────────────────────────────────────────
function detectPersonAction(message) {
    const q = message.toLowerCase().trim();
    const original = message.trim();

    const deletePatterns = [
        /(?:elimina|borra|quita|remover|suprime|eliminar|borrar|quitar|dar\s+de\s+baja)\s+(?:a\s+)?(?:la\s+)?persona\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        /(?:borrame|eliminame|quitame)\s+(?:a\s+)?(?:la\s+)?persona\s+(?:llamada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of deletePatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            let personName = match[1].trim().replace(/^(?:llamada|nombrada|a|de)\s+/i, '').replace(/^["']|["']$/g, '').trim();
            if (personName.length >= 2) return { detected: true, action: 'delete', personName };
        }
    }

    const viewPatterns = [
        /(?:mu[eé]strame|ver|visualiza|visualizar|mostrar|consulta|consultar|busca|buscar|dame\s+info\s+de)\s+(?:a\s+)?(?:la\s+)?persona\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        /(?:qu[ií]en\s+es|info\s+de|datos\s+de)\s+(?:la\s+)?persona\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of viewPatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            let personName = match[1].trim().replace(/^(?:llamada|nombrada|a|de)\s+/i, '').replace(/^["']|["']$/g, '').trim();
            if (personName.length >= 2) return { detected: true, action: 'view', personName };
        }
    }

    const editPatterns = [
        /(?:edita|editar|modifica|modificar|actualiza|actualizar|cambia|cambiar)\s+(?:el\s+)?(?:email|correo|tel[eé]fono|departamento|puesto|nombre)\s+(?:de\s+)?(?:la\s+)?persona\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s+(?:a|por|para)\s+["']?(.+?)["']?\s*$/i,
    ];
    for (const pattern of editPatterns) {
        const match = original.match(pattern);
        if (match?.[2]) {
            let personName = match[1].trim().replace(/^(?:llamada|nombrada|de)\s+/i, '').replace(/^["']|["']$/g, '').trim();
            const newValue = match[2].trim().replace(/^["']|["']$/g, '');
            let field = 'nombre';
            if (/email|correo/i.test(q)) field = 'email';
            else if (/tel[eé]fono/i.test(q)) field = 'telefono';
            else if (/departamento/i.test(q)) field = 'departamento';
            else if (/puesto/i.test(q)) field = 'puesto';
            if (personName.length >= 2) return { detected: true, action: 'edit', personName, field, newValue };
        }
    }

    return { detected: false };
}

function detectReportCommand(message) {
    const q = message.toLowerCase().trim();

    // ═══════════════════════════════════════════════════════════
    // 🆕 REGLA #0: Si el mensaje es VAGO (solo dice "crea/genera un reporte" sin tipo ni formato)
    // NO generar nada, dejar que detectVagueIntention lo maneje
    // ═══════════════════════════════════════════════════════════
    const vagueReportPatterns = [
        /^(?:crea|genera|haz|quiero|necesito|deseo|quisiera|me\s+gustar[ií]a)\s+(?:un|el)\s+reporte\s*$/i,
        /^(?:crea|genera|haz|quiero|necesito|deseo|quisiera)\s+(?:un|el)\s+informe\s*$/i,
        /^(?:quiero|necesito|deseo|quisiera|me\s+gustar[ií]a)\s+(?:crear|generar|hacer|obtener|sacar|exportar)\s+(?:un|el)\s+reporte\s*$/i,
        /^(?:quiero|necesito|deseo)\s+(?:crear|generar|hacer)\s+(?:un|el)\s+informe\s*$/i,
        /^(?:puedes|podr[ií]as)\s+(?:crear|generar|hacer)\s+(?:un|el)\s+reporte\s*$/i,
        /^(?:puedes|podr[ií]as)\s+(?:crear|generar|hacer)\s+(?:un|el)\s+informe\s*$/i,
        /^(?:crea|genera|haz)\s+(?:un\s+)?reporte\s+(?:por\s+)?(?:fa|favor|porfa|porfis|pls|please)\s*$/i,
    ];

    for (const pattern of vagueReportPatterns) {
        if (pattern.test(q)) {
            log.nlp('⛔ detectReportCommand: Reporte VAGO detectado, NO generar. Lo manejará detectVagueIntention');
            return { detected: false };
        }
    }

    // ⛔ REGLA #1: Si el usuario quiere NAVEGAR a reportes, NO generar reporte
    const navVerbs = /\b(ir|ve|vamos|navega|navegar|abre|abr[ií]|mostrame|mu[eé]strame|ll[ée]vame|llevame|ver|revisar|checar|consultar|acceder|cambiar\s+a|switch|mover\s+a|mu[eé]strame|ens[eé][ñn]ame|mostr[aá])\b/i;
    const reportSection = /\b(reportes?|informes?|estad[ií]sticas?|gr[aá]ficas?|anal[ií]ticas?|an[aá]lisis)\b/i;
    const toPreposition = /\b(a|al|hacia|en|para)\b/i;

    if (navVerbs.test(q) && reportSection.test(q)) {
        log.nlp('⛔ detectReportCommand: Detectada NAVEGACIÓN a reportes, NO generación');
        return { detected: false };
    }

    // "Quiero ver reportes", "Necesito revisar informes" → NAVEGACIÓN
    if (/(?:quiero|necesito|deseo|quisiera|me\s+gustar[ií]a)\s+(?:ir\s+a\s+)?(?:ver|revisar|checar|consultar|mirar|acceder\s+a)\s+(?:los\s+)?(?:reportes|informes|estad[ií]sticas)/i.test(q)) {
        log.nlp('⛔ detectReportCommand: Frase de consulta de reportes, NO generación');
        return { detected: false };
    }

    // ⛔ REGLA #2: Solo detectar generación si hay verbo de CREAR/EXPORTAR + algún detalle (tipo o formato)
    const generationVerbs = /\b(genera(?:r)?|crea(?:r)?|exporta(?:r)?|descarga(?:r)?|obt[eé]n|haz|elabora|producir|sacar|emitir|realiza(?:r)?|hacer|preparar)\b/i;

    if (!generationVerbs.test(q)) {
        // Si no hay verbo de generación, verificar si al menos menciona formato + reporte
        const formats = /\b(excel|xlsx|csv|pdf|archivo|descargable|formato)\b/i;
        const hasReport = /\b(reporte|informe)\b/i;
        if (!formats.test(q) || !hasReport.test(q)) {
            log.nlp('⛔ detectReportCommand: Sin verbo de generación ni formato explícito con reporte');
            return { detected: false };
        }
    }

    // 🆕 REGLA #3: Debe haber al menos UN detalle (tipo de reporte O formato)
    const hasType = /\b(general|completo|todos?|por\s+categor[ií]a|categor[ií]as?|por\s+persona|personas?|por\s+vencer|pr[oó]ximos?\s+a\s+vencer|vencen\s+pronto|vencidos?|expirados?)\b/i.test(q);
    const hasFormat = /\b(excel|xlsx|csv|pdf|archivo|descargable|formato)\b/i.test(q);

    if (!hasType && !hasFormat) {
        log.nlp('⛔ detectReportCommand: Sin tipo ni formato especificado, es VAGO');
        return { detected: false };
    }

    const typeMap = [
        { pattern: /\b(general|completo|todos?)\b/, type: 'general', label: 'General' },
        { pattern: /\b(por\s+categor[ií]a|por\s+categor[ií]as?|categor[ií]as?)\b/, type: 'byCategory', label: 'por Categoría' },
        { pattern: /\b(por\s+persona|por\s+usuario|personas?)\b/, type: 'byPerson', label: 'por Persona' },
        { pattern: /\b(por\s+vencer|pr[oó]ximos?\s+a\s+vencer|vencen\s+pronto)\b/, type: 'expiring', label: 'Por Vencer' },
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

    log.nlp(`✅ detectReportCommand: Generación detectada - tipo:${reportType}, formato:${format}`);
    return { detected: true, reportType, format, formatLabel, typeLabel, days };
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN DE NAVEGACIÓN
// ──────────────────────────────────────────────────────────────
function detectNavigationCommand(message) {
    const q = message.toLowerCase().trim();
    const sectionMap = {
        'dashboard': ['dashboard', 'inicio', 'principal', 'home', 'panel', 'escritorio', 'pantalla principal', 'menú principal'],
        'documentos': ['documentos', 'documento', 'archivos', 'archivo', 'docs', 'expedientes', 'expediente'],
        'personas': ['personas', 'persona', 'usuarios', 'usuario', 'empleados', 'personal', 'contactos', 'gente'],
        'tareas': ['tareas', 'tarea', 'actividades', 'pendientes', 'to-do', 'todo', 'lista de tareas', 'mis tareas'],
        'reportes': ['reportes', 'reporte', 'informes', 'informe', 'estadísticas', 'estadística', 'gráficas', 'análisis', 'analíticas'],
        'papelera': ['papelera', 'eliminados', 'trash', 'reciclaje', 'basura', 'borrados'],
        'notificaciones': ['notificaciones', 'notificación', 'alertas', 'alerta', 'avisos', 'aviso', 'campana', 'notificaciones'],
        'ajustes': ['ajustes', 'ajuste', 'configuración', 'configuraciones', 'settings', 'preferencias', 'opciones'],
        'soporte': ['soporte', 'ayuda', 'help', 'asistencia', 'faq', 'preguntas', 'asistente'],
        'categorias': ['categorías', 'categoría', 'categorias', 'categoria', 'carpetas', 'carpeta', 'folders', 'folder'],
        'departamentos': ['departamentos', 'departamento', 'áreas', 'área', 'secciones', 'sección', 'divisiones'],
    };
    const navVerbs = /\b(ir|ve|vamos|navega|navegar|abre|abr[ií]|mostrame|mu[eé]strame|ll[ée]vame|llevame|ver|revisar|checar|consultar|acceder|cambiar\s+a|switch|mover\s+a|mu[eé]strame|ens[eé][ñn]ame|mostr[aá]|ense[ñn]ar)\b/i;
    if (!navVerbs.test(q)) return { detected: false };

    for (const [section, keywords] of Object.entries(sectionMap)) {
        for (const keyword of keywords) {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`\\b${escaped}\\b`, 'i');
            if (pattern.test(q)) {
                if (section === 'tareas' && /\b(crea|nueva|agrega|a[ñn]ade)\s+(?:una\s+)?tarea/i.test(q)) continue;
                if (section === 'reportes' && /\b(genera|crea|exporta|descarga)\s+(?:un\s+)?(?:reporte|informe)/i.test(q)) continue;
                return { detected: true, target: section, label: NAV_MAP[section]?.label || section };
            }
        }
    }
    return { detected: false };
}

// ──────────────────────────────────────────────────────────────
// 🆕 DETECCIÓN DE INTENCIONES VAGAS (PREGUNTAR EN LUGAR DE ACTUAR)
// ──────────────────────────────────────────────────────────────
function detectVagueIntention(message) {
    const q = message.toLowerCase().trim();

    // Patrones que indican que el usuario quiere hacer algo pero no especifica
    const vaguePatterns = [
        {
            // "Quiero crear un documento" / "Quiero subir un archivo" (sin más detalles)
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:crear|subir|agregar|a[ñn]adir)\s+(?:un|una)\s+(?:documento|archivo|doc|expediente|nuevo\s+documento|nuevo\s+archivo)\s*$/i,
            response: {
                message: `📄 **¿Quieres subir un documento?**\n\nPara eso, puedes:\n• Decir **"Subir documento"** para abrir el formulario`,
                suggestions: ['Subir documento', 'Ir a Documentos', 'Ver documentos urgentes'],
            }
        },
        {
            // "Quiero crear una tarea" / "Quiero agregar una actividad" (sin detalles)
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:crear|agregar|a[ñn]adir|poner|hacer)\s+(?:un|una)\s+(?:tarea|nueva\s+tarea|actividad|to-?do|pendiente)\s*$/i,
            response: {
                message: `✅ **¿Quieres crear una tarea?**\n\nDime los detalles así:\n**"Crea una tarea llamada [nombre] para el [fecha]"**\n\nEjemplo: _"Crea una tarea llamada Reporte mensual para el viernes, prioridad alta"_\n\n¿Qué tarea necesitas crear?`,
                suggestions: ['Crear tarea: Reporte mensual para el viernes', 'Ir a Tareas', 'Ver mis tareas'],
            }
        },
        {
            // "Quiero crear un reporte" / "Genera un informe" (sin tipo)
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:crear|generar|hacer|obtener|sacar|exportar|descargar)\s+(?:un|una)\s+(?:reporte|informe)\s*$/i,
            response: {
                message: `📊 **¿Qué tipo de reporte necesitas?**\n\nPuedo generar:\n• 📋 **Reporte General** — Todos los documentos del sistema\n• 📁 **Por Categoría** — Agrupados por carpeta\n• 👤 **Por Persona** — Documentos de cada persona\n• ⚠️ **Por Vencer** — Próximos a vencer\n• ❌ **Vencidos** — Documentos ya vencidos\n\nDime cuál necesitas y en qué formato (Excel o CSV).\nEjemplo: _"Genera un reporte de documentos vencidos en Excel"_`,
                suggestions: ['Reporte general en Excel', 'Reporte por vencer', 'Reporte vencidos', 'Ir a Reportes'],
            }
        },
        {
            // "Quiero crear una persona" / "Quiero agregar un usuario" (sin detalles)
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:crear|agregar|a[ñn]adir|registrar|dar\s+de\s+alta)\s+(?:un|una)\s+(?:persona|usuario|empleado|nueva\s+persona|nuevo\s+usuario)\s*$/i,
            response: {
                message: `👤 **¿Quieres agregar una persona?**\n\nNecesito estos datos:\n• 👤 **Nombre** (obligatorio)\n• 📧 **Email** (obligatorio)\n• 📞 Teléfono (opcional)\n• 🏢 Departamento\n• 💼 Puesto\n\nEjemplo: _"Crea una persona llamada Juan Pérez, email juan@example.com, departamento Sistemas, puesto Profesor"_\n\n¿Cuáles son los datos?`,
                suggestions: ['Ir a Personas', 'Ver personas existentes'],
            }
        },
        {
            // "Quiero crear una carpeta" / "Quiero una categoría nueva"
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:crear|agregar|a[ñn]adir)\s+(?:un|una)\s+(?:carpeta|categor[ií]a|folder|nueva\s+carpeta)\s*$/i,
            response: {
                message: `📁 **¿Quieres crear una carpeta?**\n\nDime el nombre y opcionalmente:\n• 🎨 Un color (rojo, azul, verde, etc.)\n• 📝 Una descripción\n• 📂 Si es subcarpeta de otra\n\nEjemplo: _"Crea una carpeta llamada Reconocimientos color azul"_\n\n¿Cómo se llamará?`,
                suggestions: ['Ir a Categorías', 'Ver carpetas existentes'],
            }
        },
        {
            // "Quiero crear un evento en calendario"
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:crear|agregar|a[ñn]adir|poner|hacer)\s+(?:un|una)\s+(?:evento|cita|reuni[oó]n|compromiso|recordatorio)\b/i,
            response: {
                message: `📅 **¿Quieres crear un evento en el calendario?**\n\nActualmente no tengo acceso directo al calendario, pero puedo:\n• ✅ **Crear una tarea** con fecha límite y recordatorio\n• 🗺️ **Navegar al calendario** para que lo crees manualmente\n\nEjemplo: _"Crea una tarea llamada Junta de profesores para el lunes a las 10am"_\n\n¿Qué prefieres?`,
                suggestions: ['Ir a Calendario', 'Crear tarea: Junta para el lunes', 'Ir a Tareas'],
            }
        },
        {
            // "Quiero enviar un ticket a soporte"
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:enviar|mandar|abrir|crear|reportar)\s+(?:un|una)\s+(?:ticket|soporte|ayuda|reporte\s+de\s+error|problema)\b/i,
            response: {
                message: `🎫 **¿Quieres contactar a soporte?**\n\nPuedo:\n• 🗺️ **Navegar a Soporte** para que llenes el formulario\n• 📝 **Describirme el problema** y te ayudo a redactarlo\n\nEjemplo: _"Ir a soporte"_\n\n¿Qué prefieres?`,
                suggestions: ['Ir a Soporte', 'Ir a Ayuda', 'Ver mis tareas'],
            }
        },
        {
            // "Quiero recuperar un documento de papelera"
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:recuperar|restaurar|sacar|ver)\s+(?:un|una|el|los)\s+(?:documento|archivo|doc)\s+(?:de|en)\s+(?:la\s+)?papelera\b/i,
            response: {
                message: `🗑️ **¿Quieres recuperar un documento de la papelera?**\n\nPuedo:\n• 🗺️ **Navegar a la Papelera** para que veas los documentos eliminados\n• 🔍 **Buscar un documento específico** si me dices el nombre\n\nEjemplo: _"Ir a papelera" o "Buscar documento contrato en papelera"_\n\n¿Qué prefieres?`,
                suggestions: ['Ir a Papelera', 'Ir a Documentos', 'Buscar en papelera'],
            }
        },
        {
            // "Quiero ver/consultar documentos" (sin especificar)
            pattern: /\b(?:quiero|quisiera|me\s+gustar[ií]a|deseo|necesito)\s+(?:ver|revisar|consultar|checar|mirar|acceder\s+a)\s+(?:los\s+)?(?:documentos|archivos|docs|expedientes)\s*$/i,
            response: {
                message: `📄 **¿Quieres ver los documentos?**\n\nPuedo:\n• 🗺️ **Navegar a Documentos** para que veas todos\n• 🔍 **Buscar uno específico** — dime el nombre\n• ⚠️ **Mostrarte los urgentes** — próximos a vencer\n• ❌ **Mostrarte los vencidos**\n\n¿Qué prefieres?`,
                suggestions: ['Ir a Documentos', 'Documentos urgentes', 'Documentos vencidos'],
            }
        },
    ];

    for (const { pattern, response } of vaguePatterns) {
        if (pattern.test(q)) {
            log.nlp('Intención vaga detectada:', response.message.substring(0, 60));
            return { detected: true, ...response };
        }
    }

    return { detected: false };
}

// ──────────────────────────────────────────────────────────────
// 🆕 DETECCIÓN DE ACCIONES SOBRE CARPETAS (eliminar/ver/editar)
// ──────────────────────────────────────────────────────────────
function detectCategoryAction(message) {
    const q = message.toLowerCase().trim();
    const original = message.trim();

    // ═══════════════════════════════════════════════════════════
    // ELIMINAR carpeta/categoría
    // ═══════════════════════════════════════════════════════════
    const deletePatterns = [
        // "elimina la carpeta X", "borra la categoría X"
        /(?:elimina|borra|quita|remover|suprime|eliminar|borrar|quitar)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        // "quiero que elimines la carpeta X"
        /quiero\s+que\s+(?:elimines|borres|quites|suprimas)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        // "elimíname la carpeta X", "bórrame la categoría X"
        /(?:elim[íi]name|b[oó]rrame|qu[íi]tame)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        // "quiero eliminar la carpeta X"
        /quiero\s+(?:eliminar|borrar|quitar)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
    ];

    for (const pattern of deletePatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            let categoryName = match[1].trim();
            // Limpiar palabras sobrantes
            categoryName = categoryName.replace(/^(?:llamada|nombrada|de)\s+/i, '');
            categoryName = categoryName.replace(/^["']|["']$/g, '').trim();

            if (categoryName.length >= 2) {
                log.category('✅ Eliminación de carpeta detectada:', categoryName);
                return { detected: true, action: 'delete', categoryName };
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // VER carpeta/categoría
    // ═══════════════════════════════════════════════════════════
    const viewPatterns = [
        /(?:mu[eé]strame|ver|visualiza|visualizar|mostrar|consulta|consultar|busca|buscar|dame\s+info\s+de)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
        /(?:qu[eé]|cu[aá]l\s+es)\s+(?:contiene|tiene|hay\s+en)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s*$/i,
    ];

    for (const pattern of viewPatterns) {
        const match = original.match(pattern);
        if (match?.[1]) {
            let categoryName = match[1].trim()
                .replace(/^(?:llamada|nombrada|de)\s+/i, '')
                .replace(/^["']|["']$/g, '').trim();

            if (categoryName.length >= 2) {
                log.category('✅ Vista de carpeta detectada:', categoryName);
                return { detected: true, action: 'view', categoryName };
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // EDITAR carpeta/categoría (renombrar, cambiar color)
    // ═══════════════════════════════════════════════════════════
    const editPatterns = [
        // "renombra la carpeta X a Y"
        /(?:renombra|renombrar|cambia\s+el\s+nombre\s+de)\s+(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s+(?:a|por|para)\s+["']?(.+?)["']?\s*$/i,
        // "cambia el color de la carpeta X a Y"
        /(?:cambia|cambiar)\s+(?:el\s+)?color\s+(?:de\s+)?(?:la\s+)?(?:carpeta|categor[ií]a|folder)\s+(?:llamada|nombrada|de\s+)?\s*["']?(.+?)["']?\s+(?:a|por|para)\s+["']?(.+?)["']?\s*$/i,
    ];

    for (const pattern of editPatterns) {
        const match = original.match(pattern);
        if (match?.[2]) {
            let categoryName = match[1].trim()
                .replace(/^(?:llamada|nombrada|de)\s+/i, '')
                .replace(/^["']|["']$/g, '').trim();
            const newValue = match[2].trim().replace(/^["']|["']$/g, '');

            let field = 'nombre';
            if (/color/i.test(q)) field = 'color';

            if (categoryName.length >= 2 && newValue.length >= 1) {
                log.category('✅ Edición de carpeta detectada:', { categoryName, field, newValue });
                return { detected: true, action: 'edit', categoryName, field, newValue };
            }
        }
    }

    return { detected: false };
}

// ──────────────────────────────────────────────────────────────
// 🆕 DETECCIÓN DE CONFIRMACIONES (Sí/No después de preguntar)
// ──────────────────────────────────────────────────────────────
function detectConfirmation(message) {
    const q = message.toLowerCase().trim();
    
    // Patrones de confirmación
    const confirmPatterns = [
        /^s[ií]\s*(?:,\s*)?(?:eliminar|borrar|quitar|elim[íi]nalo|b[oó]rralo|qu[íi]talo|adelante|procede|continua|confirma|confirmo|aceptar|ok|okay|sip|simon|claro|dale|va|sale|por\s+favor|porfa|porfis)?\s*$/i,
        /^(?:eliminar|borrar|quitar|adelante|procede|continua|confirma|confirmo|aceptar|ok|okay|sip|simon|claro|dale|va|sale)\s*$/i,
        /^(?:s[ií]|yes|yep|yeah)\s*$/i,
    ];
    
    // Patrones de cancelación
    const cancelPatterns = [
        /^no\s*(?:,\s*)?(?:eliminar|borrar|quitar|gracias|cancelar|cancela|cancelado)?\s*$/i,
        /^(?:cancelar|cancela|cancelado|nop|nope|nel|mejor\s+no|no\s+gracias)\s*$/i,
        /^(?:no|nop|nope|nel)\s*$/i,
    ];
    
    for (const pattern of confirmPatterns) {
        if (pattern.test(q)) {
            return { detected: true, type: 'confirm' };
        }
    }
    
    for (const pattern of cancelPatterns) {
        if (pattern.test(q)) {
            return { detected: true, type: 'cancel' };
        }
    }
    
    return { detected: false };
}

// ──────────────────────────────────────────────────────────────
// CLASE PRINCIPAL — ARIA v3.0
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
        this._lastStatsLoad = 0;

        // Estado fullscreen
        this._inChatbotTab = false;
        this._fullscreenMessages = null;
        this._fullscreenInput = null;
        this._fullscreenSend = null;
        this._fullscreenVoice = null;
        this._fullscreenCharCount = null;
        this._fullscreenStatus = null;
        this._fullscreenSuggestions = null;
        this._pendingAction = null; // 🆕 Para confirmaciones (eliminar carpeta, etc.)

        // Voice
        this.recognition = null;
        this.isListening = false;

        this.quickSuggestions = [
            'Resumen del sistema',
            'Mis tareas pendientes',
            '¿Cuál es mi tarea más urgente?',
            'Documentos que vencen pronto',
            'Cambiar a tema oscuro',
            'Ver ajustes actuales',
            'Ir a reportes',
            '¿Qué puedes hacer?',
            'Crear persona: nombre Juan Perez, email juan@example.com, departamento Sistemas',
            'Crear carpeta llamada Reconocimientos',
        ];

        this._init();
    }

    // ─── VERIFICACIÓN DE ACCESO DEL SISTEMA ────────────────────
    async _checkSystemAccess() {
        const saved = localStorage.getItem('system_closed');
        if (!saved) return { allowed: true };
        try {
            const state = JSON.parse(saved);
            if (!state.closed) return { allowed: true };
            if (state.type === 'global') return { allowed: false, reason: state.reason || 'Sistema cerrado', type: 'global' };
            if (state.type === 'school' && state.closedSchools) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.includes('school-')) {
                        const match = key.match(/(school-[a-zA-Z0-9\-]+)/);
                        if (match && state.closedSchools.includes(match[1])) {
                            return { allowed: false, reason: state.reason || 'Escuela suspendida', type: 'school' };
                        }
                    }
                }
            }
            return { allowed: true };
        } catch (e) { return { allowed: true }; }
    }

    _hideAriaDueToSystemClosure(reason) {
        console.warn(`🔒 OCULTANDO ARIA: ${reason}`);
        const toggle = document.getElementById('ariaToggle');
        if (toggle) {
            toggle.style.setProperty('display', 'none', 'important');
            toggle.classList.add('hidden');
        }
        if (this._els.window) {
            this._els.window.classList.add('aria-window--closed');
            this._els.window.style.display = 'none';
        }
        this.isOpen = false;
    }

    _showAriaAfterSystemReopen() {
        console.log('🔓 Mostrando ARIA');
        const toggle = document.getElementById('ariaToggle');
        if (toggle) {
            toggle.style.removeProperty('display');
            toggle.classList.remove('hidden');
            const currentTab = window.getCurrentTab?.() || 'dashboard';
            toggle.style.display = currentTab !== 'chatbot' ? 'flex' : 'none';
        }
    }

    _startAccessPolling() {
        this._performAccessCheck();
        this._accessPollInterval = setInterval(() => this._performAccessCheck(), 30000);
    }

    async _performAccessCheck() {
        const result = await this._checkSystemAccess();
        if (!result.allowed) { this._hideAriaDueToSystemClosure(result.reason); this._wasHidden = true; }
        else if (this._wasHidden) { this._showAriaAfterSystemReopen(); this._wasHidden = false; }
        else { this._wasHidden = false; }
    }

    destroy() {
        if (this._accessPollInterval) clearInterval(this._accessPollInterval);
        if (this._reportProgressInterval) clearInterval(this._reportProgressInterval);
        if (this.isListening) this._stopVoice();
    }

    // ─── INICIALIZACIÓN ────────────────────────────────────────
    async _init() {
        log.info('Inicializando ARIA v3.0...');
        this._loadUserContext();
        this._createUI();
        this._bindEvents();
        this._initVoice();
        await Promise.allSettled([this._loadStats(), this._loadHistory()]);
        setTimeout(() => this._showWelcomeBadge(), 4000);
        this._wasHidden = false;
        this._accessPollInterval = null;
        this._startAccessPolling();
        log.info('ARIA v3.0 lista ✅');
        setInterval(() => {
            if (this.isOpen && Date.now() - this._lastStatsLoad > 300000) this._loadStats(true);
        }, 60000);
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
        } catch (e) { log.warn('Error cargando stats:', e.message); }
    }

    _dispatchStatsUpdate() {
        window.dispatchEvent(new CustomEvent('aria:statsUpdated', { detail: { stats: this.systemStats } }));
        if (window.dashboardManager?.refresh) window.dashboardManager.refresh();
    }

    // 🆕 Buscar carpeta por nombre
    async _findCategoryByName(categoryName) {
        const q = categoryName.toLowerCase().trim();
        log.category('Buscando carpeta:', q);

        try {
            const res = await api.call('/categories', { method: 'GET' });
            if (res?.success && (res.categories || res.data?.categories)) {
                const cats = res.categories || res.data?.categories || [];
                log.category(`Buscando entre ${cats.length} categorías...`);

                // Buscar coincidencia exacta primero
                let cat = cats.find(c => c.nombre?.toLowerCase().trim() === q);

                // Luego coincidencia parcial
                if (!cat) {
                    cat = cats.find(c => c.nombre?.toLowerCase().includes(q));
                }

                // También buscar sin "llamada" si está presente
                if (!cat && q.includes('llamada')) {
                    const cleanName = q.replace(/^llamada\s+/i, '').trim();
                    cat = cats.find(c => c.nombre?.toLowerCase().includes(cleanName));
                }

                if (cat) {
                    log.category('✅ Carpeta encontrada:', cat.nombre);
                    return {
                        found: true,
                        category: cat,
                        message: `✅ Encontré la carpeta **"${cat.nombre}"**.`
                    };
                }

                // Mostrar sugerencias
                const suggestions = cats.slice(0, 5)
                    .map(c => `• 📁 "${c.nombre}"`)
                    .join('\n');

                return {
                    found: false,
                    message: `❌ No encontré una carpeta llamada **"${categoryName}"**.\n\n${suggestions ? '**Carpetas disponibles:**\n' + suggestions : 'No hay carpetas creadas.'
                        }`
                };
            }
        } catch (e) {
            log.warn('Error buscando carpeta:', e.message);
        }

        return {
            found: false,
            message: `❌ No pude buscar la carpeta **"${categoryName}"**. Error de conexión.`
        };
    }

    // 🆕 Eliminar carpeta directamente (con validaciones)
    async _deleteCategoryDirectly(categoryId) {
        log.category('Eliminando carpeta:', categoryId);
        try {
            this._setStatus('Eliminando carpeta...');
            const response = await api.call(`/categories/${categoryId}`, { method: 'DELETE' });

            if (response?.success) {
                // 🆕 Recargar categorías inmediatamente
                await this._reloadCategories();
                await this._loadStats(true);

                window.dispatchEvent(new CustomEvent('categoryDeleted', {
                    detail: { categoryId }
                }));
                window.dispatchEvent(new CustomEvent('categories:reload'));

                log.category('✅ Carpeta eliminada y UI actualizada');
                return {
                    success: true,
                    message: '✅ **Carpeta eliminada exitosamente.**\n\n🔄 La lista de carpetas se ha actualizado.'
                };
            }

            throw new Error(response?.message || 'Error al eliminar');
        } catch (error) {
            log.error('Error eliminando carpeta:', error.message);

            let cleanMessage = this._cleanErrorMessage(error);

            // 🆕 Mensajes amigables según el tipo de error
            if (cleanMessage.includes('documentos asociados') || cleanMessage.includes('tiene')) {
                return {
                    success: false,
                    message: `❌ **No se puede eliminar esta carpeta**\n\n${cleanMessage}\n\n💡 Mueve o elimina primero los documentos que contiene.`
                };
            }
            if (cleanMessage.includes('no encontrada') || cleanMessage.includes('not found')) {
                return {
                    success: false,
                    message: `❌ **Carpeta no encontrada**\n\nLa carpeta ya no existe o fue eliminada.`
                };
            }
            if (cleanMessage.includes('subcarpetas') || cleanMessage.includes('subcategor')) {
                return {
                    success: false,
                    message: `❌ **No se puede eliminar esta carpeta**\n\n${cleanMessage}\n\n💡 Elimina primero las subcarpetas que contiene.`
                };
            }

            return {
                success: false,
                message: `❌ **No pude eliminar la carpeta**\n\n${cleanMessage}`
            };
        } finally {
            this._setStatus('En línea');
        }
    }

    // ─── CREACIÓN DE TAREAS ────────────────────────────────────
    async _createTaskDirectly(title, dueDate = null, description = '', priority = 'media', category = '', hourLimit = null) {
        log.task('Creando tarea:', { title, priority, category, hourLimit });
        if (!title?.trim() || title.trim().length < 2) return { success: false, message: '❌ El título debe tener al menos 2 caracteres.' };
        if (title.length > 200) return { success: false, message: '❌ El título no puede exceder los 200 caracteres.' };

        try {
            this._setStatus('Creando tarea...');
            let fechaLimite;
            if (!dueDate || isNaN(new Date(dueDate).getTime())) {
                const manana = new Date();
                manana.setDate(manana.getDate() + 1);
                const year = manana.getFullYear();
                const month = String(manana.getMonth() + 1).padStart(2, '0');
                const day = String(manana.getDate()).padStart(2, '0');
                fechaLimite = `${year}-${month}-${day}`;
            } else {
                const d = new Date(dueDate);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                fechaLimite = `${year}-${month}-${day}`;
            }

            const taskData = {
                titulo: title.trim(),
                descripcion: description?.trim() || '',
                prioridad: priority || 'media',
                estado: 'pendiente',
                tipo: 'personal',
                categoria: category?.trim() || '',
                asignado_a: this.userContext?.id ? [this.userContext.id] : [],
                creado_por: this.userContext?.id || null,
                creado_por_nombre: this.userContext?.nombre || 'ARIA',
                fecha_limite: fechaLimite,
                hora_limite: hourLimit || null,
                recordatorio: false,
                activo: true,
            };

            const response = await api.call('/tasks', { method: 'POST', body: taskData });
            if (response && (response.success || response._id)) {
                const task = response.data || response;
                await this._syncAfterTaskCreate(task);
                const fechaStr = typeof fechaLimite === 'string' ? fechaLimite : new Date(fechaLimite).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                const prioridadStr = { alta: '🔴 Alta', critica: '🔴 Crítica', media: '🟡 Media', baja: '🟢 Baja' }[priority] || '🟡 Media';
                let mensaje = `✅ **Tarea creada exitosamente**\n\n📌 **Título:** "${title.trim()}"\n`;
                if (taskData.descripcion) mensaje += `📝 **Descripción:** ${taskData.descripcion}\n`;
                if (taskData.categoria) mensaje += `📁 **Categoría:** ${taskData.categoria}\n`;
                mensaje += `🎯 **Prioridad:** ${prioridadStr}\n📅 **Fecha límite:** ${fechaStr}`;
                if (taskData.hora_limite) mensaje += ` a las ${taskData.hora_limite}`;
                mensaje += `\n📋 **Estado:** Pendiente`;
                return { success: true, message: mensaje, task };
            }

            const errorMsg = response?.message || 'Error desconocido del servidor';
            if (errorMsg.includes('fecha_limite') || errorMsg.includes('Cast to date failed')) {
                return { success: false, message: `❌ **No pude crear la tarea**\n\nLa fecha proporcionada no es válida. Intenta con un formato como "11 de abril" o "mañana".` };
            }
            return { success: false, message: `❌ **No pude crear la tarea**\n\n${errorMsg}` };
        } catch (error) {
            log.error('Error creando tarea:', error.message);
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
                return { success: false, message: `❌ **No pude crear la tarea**\n\nError de conexión con el servidor.` };
            }
            return { success: false, message: `❌ **No pude crear la tarea**\n\n${error.message}` };
        } finally { this._setStatus('En línea'); }
    }

    async _syncAfterTaskCreate(task) {
        if (window.appState?.tasks) { window.appState.tasks.unshift(task); window.appState.updateTasksStats?.(); }
        if (window.taskManager?.loadTasks) { try { await window.taskManager.loadTasks(); } catch (_) { } }
        window.dispatchEvent(new CustomEvent('taskCreated', { detail: { task } }));
        window.dispatchEvent(new CustomEvent('tasks:updated', { detail: { task } }));
        window.dispatchEvent(new CustomEvent('tasks:reload'));
        await this._loadStats(true);
    }

    async _deleteTaskDirectly(taskId) {
        log.task('Eliminando tarea:', taskId);
        try {
            this._setStatus('Eliminando tarea...');
            const response = await api.call(`/tasks/${taskId}`, { method: 'DELETE' });
            if (response?.success) {
                window.dispatchEvent(new CustomEvent('tasks:updated'));
                window.dispatchEvent(new CustomEvent('tasks:reload'));
                await this._loadStats(true);
                return { success: true, message: '✅ **Tarea eliminada exitosamente.**' };
            }
            throw new Error(response?.message || 'Error al eliminar');
        } catch (error) {
            return { success: false, message: `❌ **No pude eliminar la tarea**\n\n${this._cleanErrorMessage(error)}` };
        } finally { this._setStatus('En línea'); }
    }

    async _completeTaskDirectly(taskId) {
        log.task('Completando tarea:', taskId);
        try {
            this._setStatus('Completando tarea...');
            const response = await api.call(`/tasks/${taskId}/complete`, { method: 'PATCH' });
            if (response?.success) {
                window.dispatchEvent(new CustomEvent('tasks:updated'));
                window.dispatchEvent(new CustomEvent('tasks:reload'));
                await this._loadStats(true);
                return { success: true, message: '✅ **Tarea completada.** ¡Buen trabajo! 🎉' };
            }
            throw new Error(response?.message || 'Error al completar');
        } catch (error) {
            return { success: false, message: `❌ **No pude completar la tarea**\n\n${this._cleanErrorMessage(error)}` };
        } finally { this._setStatus('En línea'); }
    }

    async _updateTaskDirectly(taskId, updates) {
        log.task('Actualizando tarea:', taskId, updates);
        try {
            this._setStatus('Actualizando tarea...');
            const response = await api.call(`/tasks/${taskId}`, { method: 'PUT', body: updates });
            if (response?.success) {
                window.dispatchEvent(new CustomEvent('tasks:updated'));
                window.dispatchEvent(new CustomEvent('tasks:reload'));
                await this._loadStats(true);
                return { success: true, message: '✅ **Tarea actualizada exitosamente.**' };
            }
            throw new Error(response?.message || 'Error al actualizar');
        } catch (error) {
            return { success: false, message: `❌ **No pude actualizar la tarea**\n\n${this._cleanErrorMessage(error)}` };
        } finally { this._setStatus('En línea'); }
    }

    async _findTaskByName(taskName) {
        const q = taskName.toLowerCase().trim();
        try {
            const res = await api.call('/tasks', { method: 'GET' });
            if (res?.success && (res.tasks || res.data?.tasks)) {
                const tasks = res.tasks || res.data?.tasks || [];
                let task = tasks.find(t => t.titulo?.toLowerCase().trim() === q);
                if (!task) task = tasks.find(t => t.titulo?.toLowerCase().includes(q));
                if (!task && q.includes('llamada')) {
                    const cleanName = q.replace(/^llamada\s+/i, '').trim();
                    task = tasks.find(t => t.titulo?.toLowerCase().includes(cleanName));
                }
                if (task) return { found: true, task, message: `✅ Encontré la tarea **"${task.titulo}"**.` };
                const suggestions = tasks.filter(t => t.estado !== 'completada' && t.estado !== 'cancelada').slice(0, 5).map(t => `• "${t.titulo}"`).join('\n');
                return { found: false, message: `❌ No encontré una tarea llamada **"${taskName}"**.\n\n${suggestions ? '**Tareas activas:**\n' + suggestions : 'No tienes tareas activas.'}` };
            }
        } catch (e) { log.warn('Error buscando tarea:', e.message); }
        return { found: false, message: `❌ No pude buscar la tarea **"${taskName}"**. Error de conexión.` };
    }

    // ─── CREACIÓN DE PERSONAS ──────────────────────────────────
    async _createPersonDirectly(personData) {
        log.task('Creando persona:', personData);
        try {
            this._setStatus('Creando persona...');
            if (personData.departamento && personData.departamento.trim()) {
                const deptExists = await this._checkDepartmentExists(personData.departamento);
                if (!deptExists) {
                    const deptCreated = await this._createDepartmentIfNotExists(personData.departamento);
                    if (!deptCreated) {
                        return { success: false, message: `❌ **No pude crear la persona**\n\nEl departamento **"${personData.departamento}"** no existe y no pude crearlo.` };
                    }
                    await this._reloadDepartments();
                }
            }
            const response = await api.call('/persons', { method: 'POST', body: personData });
            if (response?.success) {
                await this._reloadPersons();
                await this._loadStats(true);
                window.dispatchEvent(new CustomEvent('personCreated', { detail: { person: response.person || response } }));
                return {
                    success: true,
                    message: `✅ **Persona creada exitosamente**\n\n👤 **Nombre:** ${personData.nombre}\n📧 **Email:** ${personData.email}\n📞 **Teléfono:** ${personData.telefono || 'No especificado'}\n🏢 **Departamento:** ${personData.departamento || 'No especificado'}\n💼 **Puesto:** ${personData.puesto || 'No especificado'}`
                };
            }
            throw new Error(response?.message || 'Error del servidor');
        } catch (error) {
            let cleanMessage = error.message || 'Error desconocido';
            if (cleanMessage.includes('ya existe') || cleanMessage.includes('duplicate')) {
                return { success: false, message: `❌ **No pude crear la persona**\n\nYa existe una persona con ese email.` };
            }
            return { success: false, message: `❌ **No pude crear la persona**\n\n${cleanMessage}` };
        } finally { this._setStatus('En línea'); }
    }

    async _reloadPersons() {
        try {
            if (typeof window.loadPersons === 'function') { await window.loadPersons(); return; }
            if (window.personasModule?.loadPersons) { await window.personasModule.loadPersons(); return; }
            window.dispatchEvent(new CustomEvent('persons:reload'));
        } catch (e) { log.warn('Error recargando personas:', e.message); }
    }

    async _reloadDepartments() {
        try {
            if (typeof window.loadDepartments === 'function') { await window.loadDepartments(); return; }
            window.dispatchEvent(new CustomEvent('departments:reload'));
        } catch (e) { log.warn('Error recargando departamentos:', e.message); }
    }

    async _checkDepartmentExists(departmentName) {
        try {
            const res = await api.call('/departments', { method: 'GET' });
            if (res?.success && (res.departments || res.data?.departments)) {
                const depts = res.departments || res.data?.departments || [];
                return depts.some(d => d.nombre?.toLowerCase().trim() === departmentName.toLowerCase().trim());
            }
        } catch (_) { }
        return false;
    }

    async _createDepartmentIfNotExists(departmentName) {
        try {
            const res = await api.call('/departments', { method: 'POST', body: { nombre: departmentName.trim(), descripcion: 'Creado por ARIA', color: '#3b82f6', icon: 'building' } });
            if (res?.success) { window.dispatchEvent(new CustomEvent('departmentCreated')); return true; }
        } catch (e) { log.warn(`No se pudo crear departamento:`, e.message); }
        return false;
    }

    async _deletePersonDirectly(personId) {
        try {
            this._setStatus('Eliminando persona...');
            const response = await api.call(`/persons/${personId}`, { method: 'DELETE' });
            if (response?.success) {
                await this._reloadPersons();
                await this._loadStats(true);
                window.dispatchEvent(new CustomEvent('personDeleted'));
                return { success: true, message: '✅ **Persona eliminada exitosamente.**' };
            }
            throw new Error(response?.message || 'Error al eliminar');
        } catch (error) {
            return { success: false, message: `❌ **No pude eliminar la persona**\n\n${this._cleanErrorMessage(error)}` };
        } finally { this._setStatus('En línea'); }
    }

    async _updatePersonDirectly(personId, updates) {
        try {
            this._setStatus('Actualizando persona...');
            const response = await api.call(`/persons/${personId}`, { method: 'PUT', body: updates });
            if (response?.success) {
                await this._reloadPersons();
                await this._loadStats(true);
                window.dispatchEvent(new CustomEvent('personUpdated'));
                return { success: true, message: `✅ **Persona actualizada.**\n\n${Object.keys(updates).map(k => `• ${k}: ${updates[k]}`).join('\n')}` };
            }
            throw new Error(response?.message || 'Error al actualizar');
        } catch (error) {
            return { success: false, message: `❌ **No pude actualizar la persona**\n\n${this._cleanErrorMessage(error)}` };
        } finally { this._setStatus('En línea'); }
    }

    async _findPersonByName(personName) {
        const q = personName.toLowerCase().trim();
        try {
            const res = await api.call('/persons', { method: 'GET' });
            if (res?.success && (res.persons || res.data?.persons)) {
                const persons = res.persons || res.data?.persons || [];
                let person = persons.find(p => p.nombre?.toLowerCase().trim() === q);
                if (!person) person = persons.find(p => p.nombre?.toLowerCase().includes(q));
                if (person) return { found: true, person, message: `✅ Encontré a **${person.nombre}**.` };
                const suggestions = persons.slice(0, 5).map(p => `• "${p.nombre}"`).join('\n');
                return { found: false, message: `❌ No encontré a **"${personName}"**.\n\n${suggestions ? '**Personas:**\n' + suggestions : 'No hay personas registradas.'}` };
            }
        } catch (e) { log.warn('Error buscando persona:', e.message); }
        return { found: false, message: `❌ No pude buscar a **"${personName}"**.` };
    }

    // 🆕 ─── CREACIÓN DE CARPETAS (con recarga automática) ──────
    async _createCategoryDirectly(categoryData) {
        log.category('Creando carpeta:', categoryData);
        try {
            this._setStatus('Creando carpeta...');
            const response = await api.call('/categories', { method: 'POST', body: categoryData });

            if (response?.success) {
                // 🆕 FORZAR recarga inmediata de categorías
                await this._reloadCategories();
                // 🆕 También recargar stats para reflejar el cambio en dashboard
                await this._loadStats(true);

                // 🆕 Disparar eventos para que otros módulos se actualicen
                window.dispatchEvent(new CustomEvent('categoryCreated', {
                    detail: { category: response.category || response.data }
                }));
                window.dispatchEvent(new CustomEvent('categories:reload'));

                log.category('✅ Carpeta creada y UI actualizada');

                return {
                    success: true,
                    message: `✅ **Carpeta creada exitosamente**\n\n📁 **Nombre:** ${categoryData.nombre}\n${categoryData.descripcion ? `📝 **Descripción:** ${categoryData.descripcion}\n` : ''
                        }${categoryData.parent_id ? `📂 **Carpeta padre:** ${categoryData.parent_id}\n` : ''
                        }🎨 **Color:** ${categoryData.color || '#4f46e5'}\n\n🔄 La carpeta ya está disponible en la sección de Categorías.`
                };
            }

            throw new Error(response?.message || 'Error del servidor');
        } catch (error) {
            let msg = this._cleanErrorMessage(error);
            if (msg.includes('ya existe')) {
                return {
                    success: false,
                    message: `❌ Ya existe una carpeta con el nombre **"${categoryData.nombre}"**.`
                };
            }
            return {
                success: false,
                message: `❌ **No pude crear la carpeta**\n\n${msg}`
            };
        } finally {
            this._setStatus('En línea');
        }
    }

    // 🆕 Recargar categorías automáticamente
    async _reloadCategories() {
        try {
            // Intentar múltiples métodos para recargar
            if (typeof window.loadCategories === 'function') {
                await window.loadCategories();
                log.category('✅ Categorías recargadas vía loadCategories()');
                return;
            }
            if (window.categoriasModule?.loadCategories) {
                await window.categoriasModule.loadCategories();
                log.category('✅ Categorías recargadas vía categoriasModule');
                return;
            }
            if (window.categoriasModule?.renderCategories) {
                await window.categoriasModule.renderCategories();
                log.category('✅ Categorías renderizadas vía categoriasModule');
                return;
            }

            // Fallback: disparar evento
            window.dispatchEvent(new CustomEvent('categories:reload'));
            window.dispatchEvent(new CustomEvent('categoryCreated'));
            log.category('📡 Eventos de recarga disparados');
        } catch (e) {
            log.warn('Error recargando categorías:', e.message);
            // Disparar eventos como último recurso
            window.dispatchEvent(new CustomEvent('categories:reload'));
        }
    }

    async _resolveCategoryId(categoryName) {
        try {
            const res = await api.call('/categories', { method: 'GET' });
            if (res?.success && (res.categories || res.data?.categories)) {
                const cats = res.categories || res.data?.categories || [];
                const found = cats.find(c => c.nombre?.toLowerCase().trim() === categoryName.toLowerCase().trim());
                if (found) return found._id;
            }
        } catch (e) { log.warn('Error buscando categoría:', e.message); }
        return null;
    }

    // ─── GENERACIÓN DE REPORTES ───────────────────────────────
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
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
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
            return { success: true, message: `✅ **Reporte ${typeLabel} generado**\n\n📄 Formato: **${formatLabel}**\n📊 Tamaño: **${this._formatBytes(blob.size)}**` };
        } catch (error) {
            this._showReportProgress(false);
            return { success: false, message: error.name === 'AbortError' ? '❌ **Error:** La generación tomó demasiado tiempo.' : `❌ **Error generando reporte**\n\n${error.message}` };
        } finally { this._setStatus('En línea'); }
    }

    _formatBytes(bytes) {
        if (!bytes) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }

    _validateEmail(email) {
        if (!email || !email.includes('@')) return { valid: false, message: 'El email debe contener un @' };
        const parts = email.split('@');
        if (parts.length !== 2) return { valid: false, message: 'El email debe tener exactamente un @' };
        if (!parts[1].includes('.')) return { valid: false, message: 'El dominio debe tener un punto (ej: gmail.com)' };
        if (parts[1].split('.').pop().length < 2) return { valid: false, message: 'La extensión del dominio es muy corta' };
        return { valid: true, message: 'Email válido' };
    }

    _validatePhone(phone) {
        if (!phone) return { valid: true, message: 'Teléfono opcional' };
        const clean = phone.replace(/[+\s\-()]/g, '');
        if (!/^\d+$/.test(clean)) return { valid: false, message: 'El teléfono solo puede contener números' };
        if (clean.length > 10) return { valid: false, message: 'El teléfono no puede tener más de 10 dígitos' };
        if (clean.length < 8) return { valid: false, message: 'El teléfono debe tener al menos 8 dígitos' };
        return { valid: true, message: 'Teléfono válido' };
    }

    _validateName(name) {
        if (!name || name.trim().length < 2) return { valid: false, message: 'El nombre debe tener al menos 2 caracteres' };
        if (name.trim().length > 100) return { valid: false, message: 'El nombre no puede exceder los 100 caracteres' };
        return { valid: true, message: 'Nombre válido' };
    }

    _cleanErrorMessage(error) {
        if (!error) return 'Error desconocido';
        let msg = typeof error === 'string' ? error : (error.message || 'Error desconocido');
        msg = msg.replace(/Error HTTP \d+: /g, '');
        if (msg.includes('{')) {
            try {
                const jsonStart = msg.indexOf('{');
                const jsonStr = msg.substring(jsonStart);
                const parsed = JSON.parse(jsonStr);
                msg = parsed.message || msg;
            } catch (_) { }
        }
        return msg;
    }

// ─── ENVÍO DE MENSAJES ────────────────────────────────────
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

    // ═══════════════════════════════════════════════════════
    // 🆕 PRIORIDAD 0: Confirmaciones pendientes (Sí/No)
    // ═══════════════════════════════════════════════════════
    if (this._pendingAction) {
        const confirmation = detectConfirmation(text);
        
        if (confirmation.detected && confirmation.type === 'confirm') {
            this._showTyping(true);
            this._setStatus('Procesando...');
            
            // Ejecutar la acción pendiente
            const action = this._pendingAction;
            this._pendingAction = null; // Limpiar pendiente
            
            if (action.type === 'deleteCategory') {
                const result = await this._deleteCategoryDirectly(action.id);
                this._showTyping(false);
                this._appendBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver todas las carpetas', 'Ir a Categorías']
                        : ['Intentar de nuevo', 'Ver todas las carpetas'],
                });
                if (result.success) showAlert('🗑️ Carpeta eliminada', 'success', 2500);
            } else if (action.type === 'deleteTask') {
                const result = await this._deleteTaskDirectly(action.id);
                this._showTyping(false);
                this._appendBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver mis tareas', 'Crear nueva tarea', 'Ir a Tareas']
                        : ['Intentar de nuevo', 'Ver mis tareas'],
                });
                if (result.success) showAlert('🗑️ Tarea eliminada', 'success', 2500);
            } else if (action.type === 'deletePerson') {
                const result = await this._deletePersonDirectly(action.id);
                this._showTyping(false);
                this._appendBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver todas las personas', 'Crear nueva persona', 'Ir a Personas']
                        : ['Intentar de nuevo', 'Ver todas las personas'],
                });
                if (result.success) showAlert('🗑️ Persona eliminada', 'success', 2500);
            } else if (action.type === 'clearHistory') {
                await this._clearChat();
                this._showTyping(false);
                this._appendBotMessage('✅ **Historial borrado exitosamente.**', {
                    suggestions: ['Resumen del sistema', 'Mis tareas'],
                });
                showAlert('Historial borrado', 'success', 2500);
            } else {
                this._showTyping(false);
                this._appendBotMessage('❌ Acción pendiente desconocida.', {
                    suggestions: ['¿Qué puedes hacer?'],
                });
            }
            
            this._finishLoading();
            return;
        }
        
        if (confirmation.detected && confirmation.type === 'cancel') {
            this._pendingAction = null;
            this._showTyping(true);
            await new Promise(r => setTimeout(r, 300));
            this._showTyping(false);
            this._appendBotMessage('✅ **Acción cancelada.**\n\n¿En qué más te ayudo?', {
                suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos urgentes'],
            });
            this._finishLoading();
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 1: Navegación Explícita
    // ═══════════════════════════════════════════════════════
    const navCmd = detectNavigationCommand(text);
    if (navCmd.detected) {
        log.nav(`Navegación prioritaria: ${navCmd.target}`);
        this._showTyping(true);
        await new Promise(r => setTimeout(r, 400));
        this._showTyping(false);

        const navInfo = NAV_MAP[navCmd.target];
        if (navInfo) {
            this._appendBotMessage(`📍 **Navegando a ${navInfo.label}...**`, {
                suggestions: ['Ver mis tareas', 'Dashboard', 'Documentos urgentes'],
                isNavigation: true,
            });
            // Cerrar ventana y navegar
            setTimeout(() => this._doNavigate(navCmd.target), 500);
        }
        this._finishLoading();
        return;
    }

    // ═══════════════════════════════════════════════════════
    // 🆕 PRIORIDAD 1.5: Intenciones vagas (preguntar al usuario)
    // ═══════════════════════════════════════════════════════
    const vagueIntention = detectVagueIntention(text);
    if (vagueIntention.detected) {
        this._showTyping(true);
        await new Promise(r => setTimeout(r, 500));
        this._showTyping(false);
        this._appendBotMessage(vagueIntention.message, {
            suggestions: vagueIntention.suggestions,
        });
        this._finishLoading();
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 2: Comando de ajustes
    // ═══════════════════════════════════════════════════════
    const settingCmd = detectSettingCommand(text);
    if (settingCmd.detected) {
        this._showTyping(true);
        await new Promise(r => setTimeout(r, 300));
        this._showTyping(false);
        const result = executeSettingAction(settingCmd.action);
        this._appendBotMessage(result.message, {
            suggestions: result.success
                ? ['Ver ajustes actuales', 'Cambiar densidad', 'Ir a Ajustes']
                : ['Ir a Ajustes', '¿Qué puedes hacer?'],
            isSettingResult: true,
        });
        if (result.success) showAlert('⚙️ Ajuste aplicado', 'success', 2500);
        this._finishLoading();
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3: Creación de tareas
    // ═══════════════════════════════════════════════════════
    const taskCmd = detectTaskCreation(text);
    if (taskCmd.detected) {
        this._showTyping(true);
        this._setStatus('Creando tarea...');
        const result = await this._createTaskDirectly(
            taskCmd.title,
            taskCmd.dueDate,
            taskCmd.description,
            taskCmd.priority,
            taskCmd.category,
            taskCmd.hourLimit
        );
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

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.5: Acciones sobre tareas (eliminar/completar/editar)
    // ═══════════════════════════════════════════════════════
    const taskActionCmd = detectTaskAction(text);
    if (taskActionCmd.detected) {
        this._showTyping(true);
        this._setStatus('Procesando...');

        if (taskActionCmd.action === 'delete') {
            const match = await this._findTaskByName(taskActionCmd.taskName);
            this._showTyping(false);
            if (match.found) {
                // 🆕 Guardar acción pendiente para confirmación
                this._pendingAction = {
                    type: 'deleteTask',
                    id: match.task._id,
                    name: match.task.titulo,
                    timestamp: Date.now()
                };
                
                // Auto-limpiar después de 60 segundos
                setTimeout(() => {
                    if (this._pendingAction?.id === match.task._id) {
                        this._pendingAction = null;
                    }
                }, 60000);
                
                this._appendBotMessage(
                    `⚠️ **¿Estás seguro de eliminar la tarea "${match.task.titulo}"?**\n\nEsta acción no se puede deshacer.\n\nResponde **"Sí, eliminar"** para confirmar o **"No"** para cancelar.`,
                    { suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver mis tareas'] }
                );
            } else {
                this._appendBotMessage(match.message, {
                    suggestions: ['Ver mis tareas', 'Crear nueva tarea'],
                });
            }
            this._finishLoading();
            return;
        }

        if (taskActionCmd.action === 'complete') {
            const match = await this._findTaskByName(taskActionCmd.taskName);
            this._showTyping(false);
            if (match.found) {
                const result = await this._completeTaskDirectly(match.task._id);
                this._appendBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver mis tareas', 'Tarea más urgente', 'Ir a Tareas']
                        : ['Intentar de nuevo', 'Ver mis tareas'],
                });
                if (result.success) showAlert('✅ Tarea completada', 'success', 2500);
            } else {
                this._appendBotMessage(match.message, {
                    suggestions: ['Ver mis tareas', 'Crear nueva tarea'],
                });
            }
            this._finishLoading();
            return;
        }

        if (taskActionCmd.action === 'edit') {
            const match = await this._findTaskByName(taskActionCmd.taskName);
            this._showTyping(false);
            if (match.found) {
                const updates = {};
                if (taskActionCmd.field === 'titulo') updates.titulo = taskActionCmd.newValue;
                else if (taskActionCmd.field === 'descripcion') updates.descripcion = taskActionCmd.newValue;
                else if (taskActionCmd.field === 'prioridad') {
                    const p = taskActionCmd.newValue.toLowerCase();
                    updates.prioridad = ['alta', 'critica', 'media', 'baja'].includes(p) ? p : 'media';
                } else if (taskActionCmd.field === 'fecha_limite') {
                    const parsedDate = parseDateFromText(taskActionCmd.newValue);
                    if (parsedDate) {
                        parsedDate.setHours(23, 59, 59, 999);
                        updates.fecha_limite = parsedDate;
                    }
                }

                if (Object.keys(updates).length > 0) {
                    const result = await this._updateTaskDirectly(match.task._id, updates);
                    this._appendBotMessage(result.message, {
                        suggestions: result.success
                            ? ['Ver mis tareas', 'Crear nueva tarea', 'Ir a Tareas']
                            : ['Intentar de nuevo', 'Ver mis tareas'],
                    });
                    if (result.success) showAlert('✏️ Tarea actualizada', 'success', 2500);
                } else {
                    this._appendBotMessage('❌ No pude entender qué campo actualizar.', {
                        suggestions: ['Ver mis tareas', '¿Qué puedes hacer?'],
                    });
                }
            } else {
                this._appendBotMessage(match.message, {
                    suggestions: ['Ver mis tareas', 'Crear nueva tarea'],
                });
            }
            this._finishLoading();
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // 🆕 PRIORIDAD 3.55: Acciones sobre carpetas (eliminar/ver/editar)
    // ═══════════════════════════════════════════════════════
    const categoryActionCmd = detectCategoryAction(text);
    if (categoryActionCmd.detected) {
        this._showTyping(true);
        this._setStatus('Procesando...');

        if (categoryActionCmd.action === 'delete') {
            const match = await this._findCategoryByName(categoryActionCmd.categoryName);
            this._showTyping(false);
            if (match.found) {
                // 🆕 Guardar acción pendiente para confirmación
                this._pendingAction = {
                    type: 'deleteCategory',
                    id: match.category._id,
                    name: match.category.nombre,
                    timestamp: Date.now()
                };
                
                // Auto-limpiar después de 60 segundos
                setTimeout(() => {
                    if (this._pendingAction?.id === match.category._id) {
                        this._pendingAction = null;
                    }
                }, 60000);
                
                this._appendBotMessage(
                    `⚠️ **¿Estás seguro de eliminar la carpeta "${match.category.nombre}"?**\n\n${
                        match.category.descripcion ? `📝 Descripción: ${match.category.descripcion}\n` : ''
                    }Esta acción no se puede deshacer si la carpeta está vacía.\n\nResponde **"Sí, eliminar"** para confirmar o **"No"** para cancelar.`,
                    { 
                        suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver todas las carpetas'],
                    }
                );
            } else {
                this._appendBotMessage(match.message, { 
                    suggestions: ['Ver todas las carpetas', 'Ir a Categorías'] 
                });
            }
            this._finishLoading();
            return;
        }

        if (categoryActionCmd.action === 'view') {
            const match = await this._findCategoryByName(categoryActionCmd.categoryName);
            this._showTyping(false);
            if (match.found) {
                const c = match.category;
                const info = `📁 **${c.nombre}**\n\n📝 **Descripción:** ${c.descripcion || 'Sin descripción'}\n🎨 **Color:** ${c.color || '#4f46e5'}\n📂 **Subcarpetas:** ${c.children?.length || 0}\n📄 **Documentos:** ${c.documentCount || 'No especificado'}`;
                this._appendBotMessage(info, { 
                    suggestions: ['Ver todas las carpetas', 'Ir a Categorías', 'Eliminar carpeta'] 
                });
            } else {
                this._appendBotMessage(match.message, { 
                    suggestions: ['Ver todas las carpetas', 'Ir a Categorías'] 
                });
            }
            this._finishLoading();
            return;
        }

        if (categoryActionCmd.action === 'edit') {
            const match = await this._findCategoryByName(categoryActionCmd.categoryName);
            this._showTyping(false);
            if (match.found) {
                const updates = {};
                if (categoryActionCmd.field === 'nombre') updates.nombre = categoryActionCmd.newValue;
                else if (categoryActionCmd.field === 'color') {
                    const colorMap = {
                        'rojo': '#ef4444', 'azul': '#3b82f6', 'verde': '#10b981',
                        'amarillo': '#f59e0b', 'morado': '#8b5cf6', 'naranja': '#f97316',
                        'gris': '#6b7280', 'negro': '#1f2937', 'blanco': '#f9fafb',
                    };
                    updates.color = colorMap[categoryActionCmd.newValue.toLowerCase()] || categoryActionCmd.newValue;
                }

                if (Object.keys(updates).length > 0) {
                    const result = await this._updateCategoryDirectly(match.category._id, updates);
                    this._appendBotMessage(result.message, {
                        suggestions: result.success
                            ? ['Ver todas las carpetas', 'Ir a Categorías']
                            : ['Intentar de nuevo', 'Ir a Categorías'],
                    });
                    if (result.success) showAlert('✏️ Carpeta actualizada', 'success', 2500);
                } else {
                    this._appendBotMessage('❌ No pude entender qué campo actualizar.', {
                        suggestions: ['Ver todas las carpetas', '¿Qué puedes hacer?'],
                    });
                }
            } else {
                this._appendBotMessage(match.message, {
                    suggestions: ['Ver todas las carpetas', 'Ir a Categorías'],
                });
            }
            this._finishLoading();
            return;
        }

        this._finishLoading();
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.6: Creación de carpetas
    // ═══════════════════════════════════════════════════════
    const categoryCmd = detectCategoryCreation(text);
    if (categoryCmd.detected) {
        this._showTyping(true);

        if (categoryCmd.missing.length > 0) {
            this._showTyping(false);
            const faltantes = categoryCmd.missing.map(f => `• ${f}`).join('\n');
            this._appendBotMessage(
                `⚠️ **Faltan datos para crear la carpeta**\n\n❌ **Falta:**\n${faltantes}\n\n${
                    categoryCmd.isSubcategory
                        ? 'Necesito saber en qué carpeta va. Ejemplo: "Crea una subcarpeta llamada 2024 dentro de Reconocimientos"'
                        : 'Dime el nombre de la carpeta.'
                }`,
                { suggestions: ['Ver carpetas existentes', 'Ir a Categorías'] }
            );
        } else {
            this._setStatus('Creando carpeta...');
            let parent_id = null;
            if (categoryCmd.isSubcategory && categoryCmd.parent_id) {
                parent_id = await this._resolveCategoryId(categoryCmd.parent_id);
                if (!parent_id) {
                    this._showTyping(false);
                    this._appendBotMessage(
                        `❌ No encontré la carpeta **"${categoryCmd.parent_id}"**.\n\nVerifica el nombre e intenta de nuevo.`,
                        { suggestions: ['Ver carpetas existentes', 'Ir a Categorías'] }
                    );
                    this._finishLoading();
                    return;
                }
            }

            const result = await this._createCategoryDirectly({
                nombre: categoryCmd.nombre,
                descripcion: categoryCmd.descripcion,
                color: categoryCmd.color,
                icon: categoryCmd.icon,
                parent_id: parent_id,
            });
            this._showTyping(false);
            this._appendBotMessage(result.message, {
                suggestions: result.success
                    ? ['Ver todas las carpetas', 'Ir a Categorías']
                    : ['Intentar de nuevo', 'Ir a Categorías'],
            });
            if (result.success) showAlert('📁 Carpeta creada', 'success', 3000);
        }
        this._finishLoading();
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.7: Creación de personas
    // ═══════════════════════════════════════════════════════
    const personCmd = detectPersonCreation(text);
    if (personCmd.detected) {
        this._showTyping(true);

        // Si faltan campos, preguntar por ellos
        if (personCmd.missing.length > 0 && !personCmd.hasAllRequired) {
            this._showTyping(false);

            // Construir lista de campos faltantes
            const faltantes = personCmd.missing.map(f => `• ${f}`).join('\n');
            const yaProporcionados = [];
            if (personCmd.nombre) yaProporcionados.push(`👤 Nombre: **${personCmd.nombre}**`);
            if (personCmd.email) yaProporcionados.push(`📧 Email: **${personCmd.email}**`);
            if (personCmd.telefono) yaProporcionados.push(`📞 Teléfono: **${personCmd.telefono}**`);
            if (personCmd.departamento) yaProporcionados.push(`🏢 Departamento: **${personCmd.departamento}**`);
            if (personCmd.puesto) yaProporcionados.push(`💼 Puesto: **${personCmd.puesto}**`);

            let mensaje = `⚠️ **Faltan datos para crear la persona**\n\n`;
            if (yaProporcionados.length > 0) {
                mensaje += `✅ **Datos que ya tengo:**\n${yaProporcionados.join('\n')}\n\n`;
            }
            mensaje += `❌ **Falta:**\n${faltantes}\n\n`;
            mensaje += `Por favor, dime los datos faltantes. Ejemplo:\n_"El email es juan@example.com, su teléfono es 5512345678 y su puesto es Profesor"_`;

            this._appendBotMessage(mensaje, {
                suggestions: ['Cancelar creación', 'Ver personas existentes', 'Intentar de nuevo'],
            });
        } else {
            // Validar email
            const emailValidation = this._validateEmail(personCmd.email);
            if (!emailValidation.valid) {
                this._showTyping(false);
                this._appendBotMessage(
                    `❌ **${emailValidation.message}**\n\nProporcionaste: _${personCmd.email}_\n\nIntenta de nuevo con un email válido.`,
                    { suggestions: ['Intentar de nuevo', 'Cancelar creación'] }
                );
                this._finishLoading();
                return;
            }

            // Validar teléfono
            const phoneValidation = this._validatePhone(personCmd.telefono);
            if (!phoneValidation.valid) {
                this._showTyping(false);
                this._appendBotMessage(
                    `❌ **${phoneValidation.message}**\n\nProporcionaste: _${personCmd.telefono}_\n\nIntenta de nuevo.`,
                    { suggestions: ['Intentar de nuevo', 'Cancelar creación'] }
                );
                this._finishLoading();
                return;
            }

            // Validar nombre
            const nameValidation = this._validateName(personCmd.nombre);
            if (!nameValidation.valid) {
                this._showTyping(false);
                this._appendBotMessage(
                    `❌ **${nameValidation.message}**`,
                    { suggestions: ['Intentar de nuevo', 'Cancelar creación'] }
                );
                this._finishLoading();
                return;
            }

            this._setStatus('Creando persona...');
            const result = await this._createPersonDirectly({
                nombre: personCmd.nombre,
                email: personCmd.email,
                telefono: personCmd.telefono || '',
                departamento: personCmd.departamento || '',
                puesto: personCmd.puesto || ''
            });
            this._showTyping(false);
            this._appendBotMessage(result.message, {
                suggestions: result.success
                    ? ['Ver todas las personas', 'Crear otra persona', 'Ir a Personas']
                    : ['Intentar de nuevo', 'Ir a Personas'],
            });
            if (result.success) showAlert('👤 Persona creada', 'success', 3000);
        }
        this._finishLoading();
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.8: Acciones sobre personas (eliminar/ver/editar)
    // ═══════════════════════════════════════════════════════
    const personActionCmd = detectPersonAction(text);
    if (personActionCmd.detected) {
        this._showTyping(true);
        this._setStatus('Procesando...');

        if (personActionCmd.action === 'delete') {
            const match = await this._findPersonByName(personActionCmd.personName);
            this._showTyping(false);
            if (match.found) {
                // 🆕 Guardar acción pendiente para confirmación
                this._pendingAction = {
                    type: 'deletePerson',
                    id: match.person._id,
                    name: match.person.nombre,
                    timestamp: Date.now()
                };
                
                setTimeout(() => {
                    if (this._pendingAction?.id === match.person._id) {
                        this._pendingAction = null;
                    }
                }, 60000);
                
                this._appendBotMessage(
                    `⚠️ **¿Estás seguro de eliminar a "${match.person.nombre}"?**\n\nEsta acción no se puede deshacer.\n\nResponde **"Sí, eliminar"** para confirmar o **"No"** para cancelar.`,
                    { suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver todas las personas'] }
                );
            } else {
                this._appendBotMessage(match.message, { 
                    suggestions: ['Ver todas las personas', 'Ir a Personas'] 
                });
            }
            this._finishLoading();
            return;
        }

        if (personActionCmd.action === 'view') {
            const match = await this._findPersonByName(personActionCmd.personName);
            this._showTyping(false);
            if (match.found) {
                const p = match.person;
                const info = `👤 **${p.nombre}**\n\n📧 **Email:** ${p.email}\n📞 **Teléfono:** ${p.telefono || 'No especificado'}\n🏢 **Departamento:** ${p.departamento || 'No especificado'}\n💼 **Puesto:** ${p.puesto || 'No especificado'}`;
                this._appendBotMessage(info, { 
                    suggestions: ['Ver todas las personas', 'Editar persona', 'Ir a Personas'] 
                });
            } else {
                this._appendBotMessage(match.message, { 
                    suggestions: ['Ver todas las personas', 'Ir a Personas'] 
                });
            }
            this._finishLoading();
            return;
        }

        if (personActionCmd.action === 'edit') {
            const match = await this._findPersonByName(personActionCmd.personName);
            this._showTyping(false);
            if (match.found) {
                const updates = {};
                updates[personActionCmd.field] = personActionCmd.newValue;

                // Validar email si se está editando
                if (personActionCmd.field === 'email') {
                    const emailValidation = this._validateEmail(personActionCmd.newValue);
                    if (!emailValidation.valid) {
                        this._appendBotMessage(`❌ **${emailValidation.message}**`, { 
                            suggestions: ['Intentar de nuevo'] 
                        });
                        this._finishLoading();
                        return;
                    }
                }

                // Validar teléfono
                if (personActionCmd.field === 'telefono') {
                    const phoneValidation = this._validatePhone(personActionCmd.newValue);
                    if (!phoneValidation.valid) {
                        this._appendBotMessage(`❌ **${phoneValidation.message}**`, { 
                            suggestions: ['Intentar de nuevo'] 
                        });
                        this._finishLoading();
                        return;
                    }
                }

                const result = await this._updatePersonDirectly(match.person._id, updates);
                this._appendBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver todas las personas', 'Ir a Personas']
                        : ['Intentar de nuevo', 'Ir a Personas'],
                });
                if (result.success) showAlert('✏️ Persona actualizada', 'success', 2500);
            } else {
                this._appendBotMessage(match.message, { 
                    suggestions: ['Ver todas las personas', 'Ir a Personas'] 
                });
            }
            this._finishLoading();
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 4: Generación de Reportes (con verbo explícito)
    // ═══════════════════════════════════════════════════════
    const reportCmd = detectReportCommand(text);
    if (reportCmd.detected) {
        log.report('Generación de reporte detectada');
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

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 5: IA (Groq / rule-based backend)
    // ═══════════════════════════════════════════════════════
    this._showTyping(true);
    this._setStatus('ARIA está pensando...');

    try {
        const res = await api.call('/chatbot/message', { method: 'POST', body: { message: text } });
        this._showTyping(false);

        if (!res?.success || !res.data) throw new Error(res?.message || 'Respuesta inválida');

        const { message: rawMsg, actions = [], suggestions = [], latency } = res.data;
        const cleanMsg = this._cleanJSON(rawMsg);

        log.info(`Respuesta en ${latency}ms | acciones: ${actions.length}`);
        this._appendBotMessage(cleanMsg, { actions, suggestions, latency });
        if (suggestions?.length) this._renderSuggestions(suggestions);

        if (actions?.length) {
            setTimeout(async () => {
                for (const action of actions) await this._executeAction(action);
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
            role: 'assistant', content, timestamp: new Date().toISOString(),
            actions: opts.actions || [], suggestions: opts.suggestions || [],
            latency: opts.latency || null, isError: opts.isError || false,
            isTaskResult: opts.isTaskResult || false, isReportResult: opts.isReportResult || false,
            isSettingResult: opts.isSettingResult || false, taskCreated: opts.taskCreated || false,
        };
        this.messages.push(msg);
        this._appendMessage(msg);
        this._saveLocal();
        if (msg.suggestions?.length) this._renderSuggestions(msg.suggestions);
    }

    _finishLoading() {
        this.isLoading = false;
        this._updateSendBtn();
        if (this._inChatbotTab && this._fullscreenSend) this._fullscreenSend.disabled = false;
    }

    // 🆕 Ejecutar acciones (incluye setTheme)
    async _executeAction(action) {
        if (!action?.action) return false;
        log.action('Ejecutando:', JSON.stringify(action));
        switch (action.action) {
            case 'navigate': return this._doNavigate(action.target);
            case 'openModal': return this._doOpenModal(action.target);
            case 'search': return this._doSearch(action.query, action.section);
            case 'setTheme': return this._doSetTheme(action.theme);
            default: log.warn('Acción desconocida:', action.action); return false;
        }
    }

    // 🆕 Cambiar tema (sincronizado con backend)
    async _doSetTheme(theme) {
        if (!theme || !['dark', 'light'].includes(theme)) return false;
        log.settings(`Cambiando tema a: ${theme}`);
        const sm = window.settingsManager;
        if (sm) {
            sm.settings.appearance.theme = theme;
            sm.settings.appearance.currentTheme = theme;
            sm.saveSettings();
            sm.applyTheme();
            await _syncThemeToBackend(theme);
            return true;
        }
        return false;
    }

    async _doNavigate(target) {
        if (!target) return false;
        const nav = NAV_MAP[target.toLowerCase()];
        if (!nav) { log.warn(`Sección "${target}" no encontrada`); return false; }
        log.nav(`Navegando a: ${nav.label}`);
        this._setStatus(`📍 Yendo a ${nav.label}...`);
        this.close();
        await new Promise(r => setTimeout(r, 250));
        if (typeof window.switchTab === 'function') {
            try { await window.switchTab(nav.tabId); this._setStatus('En línea'); return true; } catch (_) { }
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
                try { window[fn](); this._setStatus('En línea'); return true; } catch (_) { }
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

    // ─── RENDER ───────────────────────────────────────────────
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
        el.className = ['aria-msg', isUser ? 'aria-msg--user' : 'aria-msg--bot', msg.isError ? 'aria-msg--error' : '', msg.isWelcome ? 'aria-msg--welcome' : ''].filter(Boolean).join(' ');
        const contentHtml = this._parseMarkdown(msg.content);
        const timeStr = this._formatTime(msg.timestamp);
        let actionHtml = '';
        if (msg.actions?.length) {
            const btns = msg.actions.map(a => {
                if (a.action === 'navigate' && NAV_MAP[a.target]) {
                    const nav = NAV_MAP[a.target];
                    return `<button class="aria-action-btn" data-nav="${a.target}"><i class="fas ${nav.icon}"></i> Ir a ${nav.label}</button>`;
                }
                if (a.action === 'openModal') {
                    return `<button class="aria-action-btn aria-action-btn--modal" data-modal="${a.target}"><i class="fas fa-plus-circle"></i> ${MODAL_LABELS[a.target] || a.target}</button>`;
                }
                if (a.action === 'setTheme') {
                    const icon = a.theme === 'dark' ? 'fa-moon' : 'fa-sun';
                    const label = a.theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
                    return `<button class="aria-action-btn" data-theme="${a.theme}"><i class="fas ${icon}"></i> ${label}</button>`;
                }
                return '';
            }).filter(Boolean).join('');
            if (btns) actionHtml = `<div class="aria-msg__actions">${btns}</div>`;
        }
        el.innerHTML = `
            <div class="aria-msg__avatar"><i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i></div>
            <div class="aria-msg__body">
                <div class="aria-msg__bubble">
                    <div class="aria-msg__text">${contentHtml}</div>
                    ${actionHtml}
                </div>
                <div class="aria-msg__meta">
                    <span class="aria-msg__time">${timeStr}</span>
                    ${msg.latency ? `<span class="aria-msg__latency">${msg.latency}ms</span>` : ''}
                </div>
            </div>`;
        el.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => this._doNavigate(btn.dataset.nav)));
        el.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._doOpenModal(btn.dataset.modal)));
        el.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => this._doSetTheme(btn.dataset.theme)));
        this._els.messages.appendChild(el);
        if (scroll) this._scrollBottom();
    }

    _renderSuggestions(suggestions) {
        if (!this._els.suggestions || !suggestions?.length) return;
        this._els.suggestions.innerHTML = suggestions.slice(0, 6).map(s => {
            const short = s.length > 48 ? s.substring(0, 48) + '…' : s;
            return `<button class="aria-chip" data-query="${this._escapeAttr(s)}" title="${this._escapeAttr(s)}">${this._escapeHtml(short)}</button>`;
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

    // ─── HISTORIAL ────────────────────────────────────────────
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
        } catch (e) { log.warn('No se pudo cargar historial:', e.message); }
        try {
            const saved = localStorage.getItem('aria_history_v4');
            if (saved) { const parsed = JSON.parse(saved); if (parsed?.length > 0) { this.messages = parsed.slice(-40); this._renderAll(); return; } }
        } catch (_) { }
        this._showWelcome();
    }

    // 🆕 Abrir modal de historial completo
    async _openHistoryModal() {
        this._setStatus('Cargando historial...');
        try {
            const res = await api.call('/chatbot/history?limit=50', { method: 'GET' });
            if (res?.success && res.data?.length > 0) {
                this._showHistoryModal(res.data, res.total || res.data.length);
            } else {
                showAlert('No hay conversaciones guardadas', 'info');
            }
        } catch (_) {
            showAlert('No se pudo cargar el historial', 'error');
        }
        this._setStatus('En línea');
    }

    _showHistoryModal(conversations, total) {
        // Eliminar modal existente si hay
        document.getElementById('ariaHistoryModal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'ariaHistoryModal';
        modal.className = 'aria-history-modal';
        modal.innerHTML = `
            <div class="aria-history-modal__overlay"></div>
            <div class="aria-history-modal__content">
                <div class="aria-history-modal__header">
                    <h3><i class="fas fa-history"></i> Historial de Conversaciones</h3>
                    <span class="aria-history-modal__count">${total} conversaciones</span>
                    <button class="aria-history-modal__close" id="ariaHistoryClose">&times;</button>
                </div>
                <div class="aria-history-modal__body" id="ariaHistoryBody">
                    ${conversations.map(c => `
                        <div class="aria-history-item">
                            <div class="aria-history-item__user">
                                <i class="fas fa-user"></i>
                                <span>${this._escapeHtml(c.userMessage?.substring(0, 100) || '')}</span>
                            </div>
                            <div class="aria-history-item__bot">
                                <i class="fas fa-robot"></i>
                                <span>${this._escapeHtml(c.botResponse?.substring(0, 150) || '')}</span>
                            </div>
                            <div class="aria-history-item__meta">
                                <span>${this._formatTime(c.timestamp)}</span>
                                ${c.source ? `<span class="aria-history-item__source">${c.source}</span>` : ''}
                                ${c.latency ? `<span class="aria-history-item__latency">${c.latency}ms</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="aria-history-modal__footer">
                    <button class="aria-btn aria-btn--danger" id="ariaHistoryClearAll">
                        <i class="fas fa-trash"></i> Borrar todo
                    </button>
                    <button class="aria-btn aria-btn--secondary" id="ariaHistoryCloseBtn">Cerrar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeModal = () => modal.remove();
        modal.querySelector('#ariaHistoryClose')?.addEventListener('click', closeModal);
        modal.querySelector('#ariaHistoryCloseBtn')?.addEventListener('click', closeModal);
        modal.querySelector('.aria-history-modal__overlay')?.addEventListener('click', closeModal);
        modal.querySelector('#ariaHistoryClearAll')?.addEventListener('click', async () => {
            if (confirm('¿Borrar TODO el historial de conversaciones?')) {
                await this._clearChat();
                closeModal();
            }
        });
    }

    async _clearChat() {
        if (!confirm('¿Borrar toda la conversación?')) return;
        try { await api.call('/chatbot/history', { method: 'DELETE' }); } catch (_) { }
        this.messages = [];
        localStorage.removeItem('aria_history_v4');
        this._showWelcome();
        showAlert('Conversación borrada', 'success');
    }

    _showWelcome() {
        const stats = this.systemStats || {};
        const nombre = this.userContext?.nombre || 'usuario';
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const s = stats.stats || {};
        const t = stats.tareas || {};
        const lines = [
            `${saludo}, **${nombre}** 👋 Soy **ARIA v3.0**`,
            '',
            `📊 **Estado actual:**`,
            `• ${s.totalDocs ?? 0} documentos`,
            `• ${t.pendientes ?? 0} tareas pendientes`,
            `• ${s.totalPersonas ?? 0} personas`,
            '',
            `¿En qué te ayudo hoy?`,
        ].join('\n');
        this.messages = [{
            role: 'assistant', content: lines, timestamp: new Date().toISOString(),
            suggestions: this.quickSuggestions.slice(0, 6), isWelcome: true,
        }];
        this._renderAll();
        this._saveLocal();
    }

    _showWelcomeBadge() {
        const key = 'aria_welcomed_v3';
        if (!this.isOpen && !localStorage.getItem(key)) {
            if (this._els.badge) {
                this._els.badge.style.display = 'flex';
                this._els.badge.textContent = '3.0';
                localStorage.setItem(key, '1');
                setTimeout(() => { if (!this.isOpen && this._els.badge) this._els.badge.style.display = 'none'; }, 8000);
            }
        }
    }

    // ─── TOGGLE / OPEN / CLOSE ───────────────────────────────
    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
        if (this._inChatbotTab) return;
        this.isOpen = true;
        const win = this._els.window;
        if (win) { win.style.display = ''; win.classList.remove('aria-window--closed'); }
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
        if (this._els.toggle) this._els.toggle.style.display = 'flex';
        if (this.isListening) this._stopVoice();
    }

    // ─── MODO CHATBOT TAB (FULLSCREEN) ───────────────────────
    enterChatbotTab(container) {
        if (!container) container = document.getElementById('ariaFullscreenContainer');
        if (!container) { log.warn('enterChatbotTab: contenedor no encontrado'); return; }
        log.info('Entrando a modo fullscreen');
        this._inChatbotTab = true;
        if (this._els.toggle) this._els.toggle.style.display = 'none';
        if (this._els.window) { this._els.window.classList.add('aria-window--closed'); this._els.window.style.display = 'none'; }
        this.isOpen = false;
        this._buildFullscreenUI(container);
    }

    exitChatbotTab() {
        log.info('Saliendo de modo fullscreen');
        this._inChatbotTab = false;
        if (this._els.window) { this._els.window.style.display = ''; this._els.window.classList.add('aria-window--closed'); }
        if (this._els.toggle) { this._els.toggle.style.display = 'flex'; this._els.toggle.classList.remove('aria-toggle--open'); }
        this.isOpen = false;
        this._fullscreenMessages = null;
        this._fullscreenInput = null;
        this._fullscreenSend = null;
        this._fullscreenVoice = null;
        this._fullscreenCharCount = null;
        this._fullscreenStatus = null;
        this._fullscreenSuggestions = null;
    }

    _buildFullscreenUI(container) {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'aria-fullscreen-wrapper';
        wrapper.innerHTML = `
            <div class="aria-fullscreen-header">
                <div class="aria-fullscreen-header-left">
                    <div class="aria-fullscreen-avatar"><i class="fas fa-robot"></i></div>
                    <div class="aria-fullscreen-title">
                        <h2>ARIA <span class="aria-fullscreen-version">v3.0</span></h2>
                        <p>Asistente Inteligente · CBTIS 051
                            <span class="aria-fullscreen-status">
                                <span class="aria-fullscreen-status-dot"></span>
                                <span id="ariaFullscreenStatus">En línea</span>
                            </span>
                        </p>
                    </div>
                </div>
                <div class="aria-fullscreen-actions">
                    <!-- 🆕 SOLO botón Ver Historial -->
                    <button class="aria-fullscreen-btn" id="ariaFsHistory" title="Ver historial de conversaciones">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="aria-fullscreen-btn" id="ariaFsClear" title="Nueva conversación">
                        <i class="fas fa-broom"></i>
                    </button>
                </div>
            </div>
            <div class="aria-fullscreen-messages" id="ariaFsMessages" role="log" aria-live="polite"></div>
            <div class="aria-fullscreen-typing" id="ariaFsTyping" style="display:none">
                <div class="aria-typing__avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-typing__dots"><span></span><span></span><span></span></div>
            </div>
            <div class="aria-fullscreen-suggestions">
                <div class="aria-fullscreen-suggestions-inner" id="ariaFsSuggestions"></div>
            </div>
            <div class="aria-fullscreen-input-area">
                <div class="aria-fullscreen-input-wrapper">
                    <textarea id="ariaFsInput" class="aria-fullscreen-input" placeholder="Pregúntame lo que quieras…" rows="1" maxlength="2000"></textarea>
                    <div class="aria-fullscreen-input-actions">
                        <button class="aria-fullscreen-voice-btn" id="ariaFsVoice" title="Dictado por voz"><i class="fas fa-microphone"></i></button>
                        <button class="aria-fullscreen-send-btn" id="ariaFsSend" disabled title="Enviar (Ctrl+Enter)"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </div>
                <div class="aria-fullscreen-input-meta">
                    <span id="ariaFsCharCount" class="aria-fullscreen-char-count">0 / 2000</span>
                    <span class="aria-fullscreen-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> para enviar</span>
                </div>
            </div>
        `;
        container.appendChild(wrapper);

        this._fullscreenMessages = document.getElementById('ariaFsMessages');
        this._fullscreenInput = document.getElementById('ariaFsInput');
        this._fullscreenSend = document.getElementById('ariaFsSend');
        this._fullscreenVoice = document.getElementById('ariaFsVoice');
        this._fullscreenCharCount = document.getElementById('ariaFsCharCount');
        this._fullscreenStatus = document.getElementById('ariaFullscreenStatus');
        this._fullscreenSuggestions = document.getElementById('ariaFsSuggestions');
        this._fullscreenTyping = document.getElementById('ariaFsTyping');

        this._renderMessagesToFullscreen();
        const lastBot = [...this.messages].reverse().find(m => m.role === 'assistant');
        this._renderFullscreenSuggestions(lastBot?.suggestions?.length ? lastBot.suggestions : this.quickSuggestions.slice(0, 8));
        this._bindFullscreenEvents();
        if (this._fullscreenStatus) this._fullscreenStatus.textContent = 'En línea';
    }

    _renderMessagesToFullscreen() {
        if (!this._fullscreenMessages) return;
        this._fullscreenMessages.innerHTML = '';
        for (const msg of this.messages) {
            this._fullscreenMessages.appendChild(this._createFsMessageEl(msg));
        }
        this._scrollContainer(this._fullscreenMessages);
    }

    _createFsMessageEl(msg) {
        const isUser = msg.role === 'user';
        const el = document.createElement('div');
        el.className = ['aria-msg', isUser ? 'aria-msg--user' : 'aria-msg--bot', msg.isWelcome ? 'aria-msg--welcome' : '', msg.isError ? 'aria-msg--error' : ''].filter(Boolean).join(' ');
        const content = this._parseMarkdown(msg.content);
        const time = this._formatTime(msg.timestamp);
        let actionsHtml = '';
        if (msg.actions?.length) {
            actionsHtml = `<div class="aria-msg__actions">` + msg.actions.map(a => {
                if (a.action === 'navigate' && NAV_MAP[a.target]) {
                    const nav = NAV_MAP[a.target];
                    return `<button class="aria-action-btn" data-nav="${a.target}"><i class="fas ${nav.icon}"></i> Ir a ${nav.label}</button>`;
                }
                if (a.action === 'openModal') {
                    return `<button class="aria-action-btn aria-action-btn--modal" data-modal="${a.target}"><i class="fas fa-plus-circle"></i> ${MODAL_LABELS[a.target] || a.target}</button>`;
                }
                if (a.action === 'setTheme') {
                    const icon = a.theme === 'dark' ? 'fa-moon' : 'fa-sun';
                    const label = a.theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
                    return `<button class="aria-action-btn" data-theme="${a.theme}"><i class="fas ${icon}"></i> ${label}</button>`;
                }
                return '';
            }).filter(Boolean).join('') + `</div>`;
        }
        el.innerHTML = `
            <div class="aria-msg__avatar"><i class="fas ${isUser ? 'fa-user' : 'fa-robot'}"></i></div>
            <div class="aria-msg__body">
                <div class="aria-msg__bubble">
                    <div class="aria-msg__text">${content}</div>
                    ${actionsHtml}
                </div>
                <div class="aria-msg__meta">
                    <span class="aria-msg__time">${time}</span>
                    ${msg.latency ? `<span class="aria-msg__latency">${msg.latency}ms</span>` : ''}
                </div>
            </div>`;
        el.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => this._doNavigate(btn.dataset.nav)));
        el.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => this._doOpenModal(btn.dataset.modal)));
        el.querySelectorAll('[data-theme]').forEach(btn => btn.addEventListener('click', () => this._doSetTheme(btn.dataset.theme)));
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
        this._fullscreenInput?.addEventListener('input', () => {
            const val = this._fullscreenInput.value;
            if (this._fullscreenSend) this._fullscreenSend.disabled = !val.trim() || this.isLoading;
            if (this._fullscreenCharCount) this._fullscreenCharCount.textContent = `${val.length} / 2000`;
            this._fullscreenInput.style.height = 'auto';
            this._fullscreenInput.style.height = Math.min(this._fullscreenInput.scrollHeight, 150) + 'px';
        });
        this._fullscreenInput?.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this._sendFullscreenMessage(); }
        });
        this._fullscreenSend?.addEventListener('click', () => this._sendFullscreenMessage());
        this._fullscreenVoice?.addEventListener('click', () => this._toggleVoice());
        // 🆕 Botón Ver Historial
        document.getElementById('ariaFsHistory')?.addEventListener('click', () => this._openHistoryModal());
        document.getElementById('ariaFsClear')?.addEventListener('click', () => this._clearChat());
        this._fullscreenSuggestions?.addEventListener('click', e => {
            const chip = e.target.closest('[data-query]');
            if (chip && this._fullscreenInput) {
                this._fullscreenInput.value = chip.dataset.query;
                this._fullscreenInput.dispatchEvent(new Event('input'));
                this._sendFullscreenMessage();
            }
        });
    }

    async _sendFullscreenMessage() {
        const text = this._fullscreenInput?.value.trim();
        if (!text || this.isLoading) return;
        log.info('FS Enviando:', text.substring(0, 100));
        this._fullscreenInput.value = '';
        this._fullscreenInput.style.height = 'auto';
        if (this._fullscreenSend) this._fullscreenSend.disabled = true;
        if (this._fullscreenCharCount) this._fullscreenCharCount.textContent = '0 / 2000';
        const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
        this.messages.push(userMsg);
        this._fullscreenMessages.appendChild(this._createFsMessageEl(userMsg));
        this._scrollContainer(this._fullscreenMessages);
        this._saveLocal();
        this.isLoading = true;
        this._setFullscreenStatus('Procesando...');
        if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'flex';
        try {
            await this._processMessageFullscreen(text);
        } catch (err) {
            log.error('Error en sendFullscreenMessage:', err);
            this._appendFullscreenBotMessage('❌ **Error al procesar tu mensaje.**\n\n' + err.message, { isError: true });
        } finally {
            if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'none';
            this.isLoading = false;
            if (this._fullscreenSend) this._fullscreenSend.disabled = false;
            this._setFullscreenStatus('En línea');
        }
    }

async _processMessageFullscreen(text) {
    // ═══════════════════════════════════════════════════════
    // 🆕 PRIORIDAD 0: Confirmaciones pendientes (Sí/No)
    // ═══════════════════════════════════════════════════════
    if (this._pendingAction) {
        const confirmation = detectConfirmation(text);
        
        if (confirmation.detected && confirmation.type === 'confirm') {
            this._setFullscreenStatus('Procesando...');
            if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'flex';
            
            const action = this._pendingAction;
            this._pendingAction = null;
            
            if (action.type === 'deleteCategory') {
                const result = await this._deleteCategoryDirectly(action.id);
                if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'none';
                this._appendFullscreenBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver todas las carpetas', 'Ir a Categorías']
                        : ['Intentar de nuevo', 'Ver todas las carpetas'],
                });
                if (result.success) showAlert('🗑️ Carpeta eliminada', 'success', 2500);
            } else if (action.type === 'deleteTask') {
                const result = await this._deleteTaskDirectly(action.id);
                if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'none';
                this._appendFullscreenBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver mis tareas', 'Crear nueva tarea', 'Ir a Tareas']
                        : ['Intentar de nuevo', 'Ver mis tareas'],
                });
                if (result.success) showAlert('🗑️ Tarea eliminada', 'success', 2500);
            } else if (action.type === 'deletePerson') {
                const result = await this._deletePersonDirectly(action.id);
                if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'none';
                this._appendFullscreenBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver todas las personas', 'Crear nueva persona', 'Ir a Personas']
                        : ['Intentar de nuevo', 'Ver todas las personas'],
                });
                if (result.success) showAlert('🗑️ Persona eliminada', 'success', 2500);
            } else if (action.type === 'clearHistory') {
                await this._clearChat();
                if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'none';
                this._appendFullscreenBotMessage('✅ **Historial borrado exitosamente.**', {
                    suggestions: ['Resumen del sistema', 'Mis tareas'],
                });
                showAlert('Historial borrado', 'success', 2500);
            } else {
                if (this._fullscreenTyping) this._fullscreenTyping.style.display = 'none';
                this._appendFullscreenBotMessage('❌ Acción pendiente desconocida.', {
                    suggestions: ['¿Qué puedes hacer?'],
                });
            }
            
            this._setFullscreenStatus('En línea');
            return;
        }
        
        if (confirmation.detected && confirmation.type === 'cancel') {
            this._pendingAction = null;
            await new Promise(r => setTimeout(r, 300));
            this._appendFullscreenBotMessage('✅ **Acción cancelada.**\n\n¿En qué más te ayudo?', {
                suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos urgentes'],
            });
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 1: Navegación Explícita
    // ═══════════════════════════════════════════════════════
    const navCmd = detectNavigationCommand(text);
    if (navCmd.detected) {
        await new Promise(r => setTimeout(r, 300));
        const navInfo = NAV_MAP[navCmd.target];
        if (navInfo) {
            this._appendFullscreenBotMessage(`📍 **Navegando a ${navInfo.label}...**`, {
                suggestions: ['Dashboard', 'Mis tareas', 'Ver ajustes'],
            });
            setTimeout(() => this._doNavigate(navCmd.target), 500);
        }
        return;
    }

    // ═══════════════════════════════════════════════════════
    // 🆕 PRIORIDAD 1.5: Intenciones vagas (preguntar al usuario)
    // ═══════════════════════════════════════════════════════
    const vagueIntention = detectVagueIntention(text);
    if (vagueIntention.detected) {
        await new Promise(r => setTimeout(r, 400));
        this._appendFullscreenBotMessage(vagueIntention.message, {
            suggestions: vagueIntention.suggestions,
        });
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 2: Ajustes
    // ═══════════════════════════════════════════════════════
    const settingCmd = detectSettingCommand(text);
    if (settingCmd.detected) {
        await new Promise(r => setTimeout(r, 250));
        const result = executeSettingAction(settingCmd.action);
        this._appendFullscreenBotMessage(result.message, {
            suggestions: result.success
                ? ['Ver ajustes actuales', 'Cambiar tema', 'Ir a Ajustes']
                : ['Ir a Ajustes', '¿Qué puedes hacer?'],
        });
        if (result.success) showAlert('⚙️ Ajuste aplicado', 'success', 2500);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3: Creación de tareas
    // ═══════════════════════════════════════════════════════
    const taskCmd = detectTaskCreation(text);
    if (taskCmd.detected) {
        this._setFullscreenStatus('Creando tarea...');
        const result = await this._createTaskDirectly(
            taskCmd.title,
            taskCmd.dueDate,
            taskCmd.description,
            taskCmd.priority,
            taskCmd.category,
            taskCmd.hourLimit
        );
        this._appendFullscreenBotMessage(result.message, {
            suggestions: result.success
                ? ['Ver mis tareas', 'Crear otra tarea', 'Ir a Tareas']
                : ['Intentar de nuevo', 'Ir a Tareas'],
        });
        if (result.success) showAlert('✅ Tarea creada', 'success', 3000);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.5: Acciones sobre tareas (eliminar/completar/editar)
    // ═══════════════════════════════════════════════════════
    const taskActionCmd = detectTaskAction(text);
    if (taskActionCmd.detected) {
        this._setFullscreenStatus('Procesando...');
        
        if (taskActionCmd.action === 'delete') {
            const match = await this._findTaskByName(taskActionCmd.taskName);
            if (match.found) {
                // 🆕 Guardar acción pendiente
                this._pendingAction = {
                    type: 'deleteTask',
                    id: match.task._id,
                    name: match.task.titulo,
                    timestamp: Date.now()
                };
                setTimeout(() => {
                    if (this._pendingAction?.id === match.task._id) this._pendingAction = null;
                }, 60000);
                
                this._appendFullscreenBotMessage(
                    `⚠️ **¿Estás seguro de eliminar la tarea "${match.task.titulo}"?**\n\nResponde **"Sí, eliminar"** para confirmar.`,
                    { suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver mis tareas'] }
                );
            } else {
                this._appendFullscreenBotMessage(match.message, {
                    suggestions: ['Ver mis tareas', 'Crear nueva tarea'],
                });
            }
            return;
        }

        if (taskActionCmd.action === 'complete') {
            const match = await this._findTaskByName(taskActionCmd.taskName);
            if (match.found) {
                const result = await this._completeTaskDirectly(match.task._id);
                this._appendFullscreenBotMessage(result.message, {
                    suggestions: result.success
                        ? ['Ver mis tareas', 'Tarea más urgente', 'Ir a Tareas']
                        : ['Intentar de nuevo', 'Ver mis tareas'],
                });
                if (result.success) showAlert('✅ Tarea completada', 'success', 2500);
            } else {
                this._appendFullscreenBotMessage(match.message, {
                    suggestions: ['Ver mis tareas', 'Crear nueva tarea'],
                });
            }
            return;
        }

        if (taskActionCmd.action === 'edit') {
            const match = await this._findTaskByName(taskActionCmd.taskName);
            if (match.found) {
                const updates = {};
                if (taskActionCmd.field === 'titulo') updates.titulo = taskActionCmd.newValue;
                else if (taskActionCmd.field === 'descripcion') updates.descripcion = taskActionCmd.newValue;
                else if (taskActionCmd.field === 'prioridad') {
                    const p = taskActionCmd.newValue.toLowerCase();
                    updates.prioridad = ['alta', 'critica', 'media', 'baja'].includes(p) ? p : 'media';
                } else if (taskActionCmd.field === 'fecha_limite') {
                    const parsedDate = parseDateFromText(taskActionCmd.newValue);
                    if (parsedDate) {
                        parsedDate.setHours(23, 59, 59, 999);
                        updates.fecha_limite = parsedDate;
                    }
                }

                if (Object.keys(updates).length > 0) {
                    const result = await this._updateTaskDirectly(match.task._id, updates);
                    this._appendFullscreenBotMessage(result.message, {
                        suggestions: result.success
                            ? ['Ver mis tareas', 'Crear nueva tarea', 'Ir a Tareas']
                            : ['Intentar de nuevo', 'Ver mis tareas'],
                    });
                    if (result.success) showAlert('✏️ Tarea actualizada', 'success', 2500);
                } else {
                    this._appendFullscreenBotMessage('❌ No pude entender qué campo actualizar.', {
                        suggestions: ['Ver mis tareas', '¿Qué puedes hacer?'],
                    });
                }
            } else {
                this._appendFullscreenBotMessage(match.message, {
                    suggestions: ['Ver mis tareas', 'Crear nueva tarea'],
                });
            }
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // 🆕 PRIORIDAD 3.55: Acciones sobre carpetas
    // ═══════════════════════════════════════════════════════
    const categoryActionCmd = detectCategoryAction(text);
    if (categoryActionCmd.detected) {
        if (categoryActionCmd.action === 'delete') {
            const match = await this._findCategoryByName(categoryActionCmd.categoryName);
            if (match.found) {
                this._pendingAction = {
                    type: 'deleteCategory',
                    id: match.category._id,
                    name: match.category.nombre,
                    timestamp: Date.now()
                };
                setTimeout(() => {
                    if (this._pendingAction?.id === match.category._id) this._pendingAction = null;
                }, 60000);
                
                this._appendFullscreenBotMessage(
                    `⚠️ **¿Estás seguro de eliminar la carpeta "${match.category.nombre}"?**\n\nResponde **"Sí, eliminar"** para confirmar.`,
                    { suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver todas las carpetas'] }
                );
            } else {
                this._appendFullscreenBotMessage(match.message, { 
                    suggestions: ['Ver todas las carpetas', 'Ir a Categorías'] 
                });
            }
            return;
        }

        if (categoryActionCmd.action === 'view') {
            const match = await this._findCategoryByName(categoryActionCmd.categoryName);
            if (match.found) {
                const c = match.category;
                this._appendFullscreenBotMessage(
                    `📁 **${c.nombre}**\n\n📝 ${c.descripcion || 'Sin descripción'}\n🎨 Color: ${c.color || '#4f46e5'}\n📂 Subcarpetas: ${c.children?.length || 0}`,
                    { suggestions: ['Ver todas las carpetas', 'Ir a Categorías'] }
                );
            } else {
                this._appendFullscreenBotMessage(match.message, { 
                    suggestions: ['Ver todas las carpetas'] 
                });
            }
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.6: Creación de carpetas
    // ═══════════════════════════════════════════════════════
    const categoryCmd = detectCategoryCreation(text);
    if (categoryCmd.detected) {
        if (categoryCmd.missing.length > 0) {
            const faltantes = categoryCmd.missing.map(f => `• ${f}`).join('\n');
            this._appendFullscreenBotMessage(
                `⚠️ **Faltan datos para crear la carpeta**\n\n❌ **Falta:**\n${faltantes}\n\n${
                    categoryCmd.isSubcategory
                        ? 'Necesito saber en qué carpeta va. Ejemplo: "Crea una subcarpeta llamada 2024 dentro de Reconocimientos"'
                        : 'Dime el nombre de la carpeta.'
                }`,
                { suggestions: ['Ver carpetas existentes', 'Ir a Categorías'] }
            );
            return;
        }

        this._setFullscreenStatus('Creando carpeta...');
        let parent_id = null;
        if (categoryCmd.isSubcategory && categoryCmd.parent_id) {
            parent_id = await this._resolveCategoryId(categoryCmd.parent_id);
            if (!parent_id) {
                this._appendFullscreenBotMessage(
                    `❌ No encontré la carpeta **"${categoryCmd.parent_id}"**.`,
                    { suggestions: ['Ver carpetas existentes', 'Ir a Categorías'] }
                );
                return;
            }
        }

        const result = await this._createCategoryDirectly({
            nombre: categoryCmd.nombre,
            descripcion: categoryCmd.descripcion,
            color: categoryCmd.color,
            icon: categoryCmd.icon,
            parent_id: parent_id,
        });

        this._appendFullscreenBotMessage(result.message, {
            suggestions: result.success
                ? ['Ver todas las carpetas', 'Ir a Categorías']
                : ['Intentar de nuevo', 'Ir a Categorías'],
        });
        if (result.success) showAlert('📁 Carpeta creada', 'success', 3000);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.7: Creación de personas
    // ═══════════════════════════════════════════════════════
    const personCmd = detectPersonCreation(text);
    if (personCmd.detected) {
        if (personCmd.missing.length > 0 && !personCmd.hasAllRequired) {
            const faltantes = personCmd.missing.map(f => `• ${f}`).join('\n');
            const yaProporcionados = [];
            if (personCmd.nombre) yaProporcionados.push(`👤 Nombre: **${personCmd.nombre}**`);
            if (personCmd.email) yaProporcionados.push(`📧 Email: **${personCmd.email}**`);
            if (personCmd.telefono) yaProporcionados.push(`📞 Teléfono: **${personCmd.telefono}**`);
            if (personCmd.departamento) yaProporcionados.push(`🏢 Departamento: **${personCmd.departamento}**`);
            if (personCmd.puesto) yaProporcionados.push(`💼 Puesto: **${personCmd.puesto}**`);

            let mensaje = `⚠️ **Faltan datos para crear la persona**\n\n`;
            if (yaProporcionados.length > 0) mensaje += `✅ **Datos que ya tengo:**\n${yaProporcionados.join('\n')}\n\n`;
            mensaje += `❌ **Falta:**\n${faltantes}\n\nPor favor, dime los datos faltantes.`;

            this._appendFullscreenBotMessage(mensaje, {
                suggestions: ['Cancelar creación', 'Ver personas existentes', 'Intentar de nuevo'],
            });
            return;
        }

        const emailValidation = this._validateEmail(personCmd.email);
        if (!emailValidation.valid) {
            this._appendFullscreenBotMessage(`❌ **${emailValidation.message}**\n\nProporcionaste: _${personCmd.email}_`, { suggestions: ['Intentar de nuevo', 'Cancelar creación'] });
            return;
        }
        const phoneValidation = this._validatePhone(personCmd.telefono);
        if (!phoneValidation.valid) {
            this._appendFullscreenBotMessage(`❌ **${phoneValidation.message}**\n\nProporcionaste: _${personCmd.telefono}_`, { suggestions: ['Intentar de nuevo', 'Cancelar creación'] });
            return;
        }
        const nameValidation = this._validateName(personCmd.nombre);
        if (!nameValidation.valid) {
            this._appendFullscreenBotMessage(`❌ **${nameValidation.message}**`, { suggestions: ['Intentar de nuevo', 'Cancelar creación'] });
            return;
        }

        this._setFullscreenStatus('Creando persona...');
        const result = await this._createPersonDirectly({
            nombre: personCmd.nombre, email: personCmd.email,
            telefono: personCmd.telefono || '', departamento: personCmd.departamento || '', puesto: personCmd.puesto || ''
        });
        this._appendFullscreenBotMessage(result.message, {
            suggestions: result.success ? ['Ver todas las personas', 'Ir a Personas'] : ['Intentar de nuevo'],
        });
        if (result.success) showAlert('👤 Persona creada', 'success', 3000);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 3.8: Acciones sobre personas
    // ═══════════════════════════════════════════════════════
    const personActionCmd = detectPersonAction(text);
    if (personActionCmd.detected) {
        if (personActionCmd.action === 'delete') {
            const match = await this._findPersonByName(personActionCmd.personName);
            if (match.found) {
                this._pendingAction = {
                    type: 'deletePerson',
                    id: match.person._id,
                    name: match.person.nombre,
                    timestamp: Date.now()
                };
                setTimeout(() => {
                    if (this._pendingAction?.id === match.person._id) this._pendingAction = null;
                }, 60000);
                
                this._appendFullscreenBotMessage(
                    `⚠️ **¿Estás seguro de eliminar a "${match.person.nombre}"?**\n\nResponde **"Sí, eliminar"** para confirmar.`,
                    { suggestions: ['Sí, eliminar', 'No, cancelar', 'Ver todas las personas'] }
                );
            } else {
                this._appendFullscreenBotMessage(match.message, { suggestions: ['Ver todas las personas'] });
            }
            return;
        }
        if (personActionCmd.action === 'view') {
            const match = await this._findPersonByName(personActionCmd.personName);
            if (match.found) {
                const p = match.person;
                this._appendFullscreenBotMessage(
                    `👤 **${p.nombre}**\n\n📧 ${p.email}\n📞 ${p.telefono || 'N/A'}\n🏢 ${p.departamento || 'N/A'}\n💼 ${p.puesto || 'N/A'}`,
                    { suggestions: ['Ver todas las personas'] }
                );
            } else {
                this._appendFullscreenBotMessage(match.message, { suggestions: ['Ver todas las personas'] });
            }
            return;
        }
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 4: Reportes
    // ═══════════════════════════════════════════════════════
    const reportCmd = detectReportCommand(text);
    if (reportCmd.detected) {
        this._setFullscreenStatus('Generando reporte...');
        const result = await this._generateReportDirectly(reportCmd);
        this._appendFullscreenBotMessage(result.message, {
            suggestions: result.success
                ? ['Generar otro reporte', 'Ir a Reportes']
                : ['Intentar de nuevo', 'Ir a Reportes'],
        });
        if (result.success) showAlert('📊 Reporte generado', 'success', 3000);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // PRIORIDAD 5: IA (Groq / rule-based backend)
    // ═══════════════════════════════════════════════════════
    try {
        const res = await api.call('/chatbot/message', { method: 'POST', body: { message: text } });
        if (res?.success && res.data) {
            const cleanMsg = this._cleanJSON(res.data.message);
            this._appendFullscreenBotMessage(cleanMsg, {
                actions: res.data.actions,
                suggestions: res.data.suggestions,
                latency: res.data.latency,
            });
            if (res.data.actions?.length) {
                setTimeout(async () => {
                    for (const action of res.data.actions) await this._executeAction(action);
                }, 500);
            }
        } else {
            throw new Error(res?.message || 'Respuesta inválida del servidor');
        }
    } catch (err) {
        log.error('Error en _processMessageFullscreen:', err.message);
        this._appendFullscreenBotMessage(
            `⚠️ **Error de conexión**\n\nNo pude procesar tu mensaje.\n\n_${err.message}_`,
            { isError: true }
        );
    }
}

    _appendFullscreenBotMessage(content, opts = {}) {
        const msg = {
            role: 'assistant', content, timestamp: new Date().toISOString(),
            actions: opts.actions || [], suggestions: opts.suggestions || [],
            latency: opts.latency || null, isError: opts.isError || false,
        };
        this.messages.push(msg);
        if (this._fullscreenMessages) {
            this._fullscreenMessages.appendChild(this._createFsMessageEl(msg));
            this._scrollContainer(this._fullscreenMessages);
        }
        this._saveLocal();
        if (msg.suggestions?.length) this._renderFullscreenSuggestions(msg.suggestions);
    }

    _setFullscreenStatus(text) {
        if (this._fullscreenStatus) this._fullscreenStatus.textContent = text;
    }

    _scrollContainer(container) {
        if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    // ─── UTILIDADES UI ────────────────────────────────────────
    _showTyping(show) {
        if (!this._els.typing) return;
        this._els.typing.style.display = show ? 'flex' : 'none';
        if (show) this._scrollBottom();
    }

    _setStatus(text) {
        if (this._els.status) this._els.status.textContent = text;
        if (this._inChatbotTab) this._setFullscreenStatus(text);
    }

    _scrollBottom() {
        requestAnimationFrame(() => {
            if (this._els.messages) this._els.messages.scrollTo({ top: this._els.messages.scrollHeight, behavior: 'smooth' });
        });
    }

    _autoResize() {
        const el = this._els.input;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }

    _updateSendBtn() {
        if (this._els.send) this._els.send.disabled = !this._els.input?.value.trim() || this.isLoading;
    }

    _updateCharCount() {
        if (!this._els.charCount) return;
        const len = this._els.input?.value.length ?? 0;
        this._els.charCount.textContent = `${len} / 2000`;
        this._els.charCount.style.color = len > 1800 ? 'var(--aria-warning)' : '';
    }

    _saveLocal() {
        try { localStorage.setItem('aria_history_v4', JSON.stringify(this.messages.slice(-40))); } catch (_) { }
    }

    _cleanJSON(text) {
        if (!text) return '';
        return text.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '').trim();
    }

    _formatTime(ts) {
        if (!ts) return '';
        try { return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; }
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
        if (!show) { clearInterval(this._reportProgressInterval); document.getElementById('ariaReportPreloader')?.remove(); return; }
        document.getElementById('ariaReportPreloader')?.remove();
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
                </div>
            </div>`;
        document.body.appendChild(el);
    }

    // ─── VOZ ──────────────────────────────────────────────────
    _initVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { if (this._els.voiceBtn) this._els.voiceBtn.style.display = 'none'; return; }
        try {
            this.recognition = new SR();
            this.recognition.lang = 'es-MX';
            this.recognition.interimResults = false;
            this.recognition.continuous = false;
            this.recognition.onstart = () => { this.isListening = true; this._updateVoiceUI(true); };
            this.recognition.onend = () => this._stopVoice();
            this.recognition.onerror = (ev) => { log.error('Voice error:', ev.error); this._stopVoice(); };
            this.recognition.onresult = (ev) => {
                const text = ev.results[0][0].transcript;
                const activeInput = this._inChatbotTab ? this._fullscreenInput : this._els.input;
                if (activeInput) {
                    activeInput.value = text;
                    activeInput.dispatchEvent(new Event('input'));
                    setTimeout(() => {
                        if (activeInput.value.trim()) {
                            this._inChatbotTab ? this._sendFullscreenMessage() : this._sendMessage();
                        }
                    }, 500);
                }
                this._stopVoice();
            };
        } catch (_) { if (this._els.voiceBtn) this._els.voiceBtn.style.display = 'none'; }
    }

    _startVoice() { if (!this.recognition || this.isListening) return; try { this.recognition.start(); } catch (_) { this._stopVoice(); } }
    _stopVoice() { try { if (this.isListening && this.recognition) this.recognition.stop(); } catch (_) { } this.isListening = false; this._updateVoiceUI(false); }
    _updateVoiceUI(listening) {
        if (this._els.voiceBtn) {
            const icon = this._els.voiceBtn.querySelector('i');
            this._els.voiceBtn.classList.toggle('aria-voice-btn--listening', listening);
            if (icon) icon.className = listening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        }
        if (this._fullscreenVoice) {
            const icon = this._fullscreenVoice.querySelector('i');
            this._fullscreenVoice.classList.toggle('aria-voice-btn--listening', listening);
            if (icon) icon.className = listening ? 'fas fa-microphone-slash' : 'fas fa-microphone';
        }
    }
    _toggleVoice() {
        if (!this.recognition) { showAlert('Voz no disponible en este navegador', 'warning'); return; }
        this.isListening ? this._stopVoice() : this._startVoice();
    }

    // ─── CREACIÓN DE UI DEL WIDGET ────────────────────────────
    _createUI() {
        if (document.getElementById('ariaContainer')) { this._cacheEls(); return; }
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
        <button class="aria-toggle" id="ariaToggle" aria-label="Abrir asistente ARIA">
            <span class="aria-toggle__icon"><i class="fas fa-robot"></i></span>
            <span class="aria-toggle__pulse"></span>
            <span class="aria-badge" id="ariaBadge" style="display:none">3.0</span>
        </button>

        <div class="aria-window aria-window--closed" id="ariaWindow" role="dialog" aria-label="Asistente ARIA v3.0">
            <div class="aria-header">
                <div class="aria-header__identity">
                    <div class="aria-avatar">
                        <i class="fas fa-robot"></i>
                        <span class="aria-avatar__dot"></span>
                    </div>
                    <div class="aria-header__info">
                        <span class="aria-header__name">ARIA <span class="aria-version-tag">v3.0</span></span>
                        <span class="aria-header__sub" id="ariaStatus">Cargando...</span>
                    </div>
                </div>
                <div class="aria-header__actions">
                    <!-- 🆕 Solo botones necesarios: Refrescar, Ver Historial, Nueva conversación, Cerrar -->
                    <button class="aria-btn-icon" id="ariaRefreshBtn" title="Actualizar stats"><i class="fas fa-sync-alt"></i></button>
                    <button class="aria-btn-icon" id="ariaHistoryBtn" title="Ver historial"><i class="fas fa-history"></i></button>
                    <button class="aria-btn-icon" id="ariaClearBtn" title="Nueva conversación"><i class="fas fa-broom"></i></button>
                    <button class="aria-btn-icon aria-btn-close" id="ariaClose" title="Cerrar"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <div class="aria-messages" id="ariaMessages" role="log" aria-live="polite"></div>

            <div class="aria-typing" id="ariaTyping" style="display:none">
                <div class="aria-typing__avatar"><i class="fas fa-robot"></i></div>
                <div class="aria-typing__dots"><span></span><span></span><span></span></div>
            </div>

            <div class="aria-suggestions-bar">
                <div class="aria-suggestions__inner" id="ariaSuggestions"></div>
            </div>

            <div class="aria-input-area">
                <div class="aria-input-row">
                    <textarea id="ariaInput" class="aria-input" rows="1" placeholder="Pregúntame lo que quieras…" maxlength="2000"></textarea>
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
        // 🆕 Botón Ver Historial
        document.getElementById('ariaHistoryBtn')?.addEventListener('click', () => this._openHistoryModal());
        document.getElementById('ariaRefreshBtn')?.addEventListener('click', async () => {
            this._setStatus('Actualizando...');
            await this._loadStats();
            this._setStatus('En línea');
            showAlert('Estadísticas actualizadas', 'success', 2000);
        });

        e.send?.addEventListener('click', () => this._sendMessage());
        e.voiceBtn?.addEventListener('click', () => this._toggleVoice());

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

    // ─── COMPATIBILIDAD ───────────────────────────────────────
    setMode(mode) {
        if (mode === 'fullscreen') {
            const container = document.getElementById('ariaFullscreenContainer');
            if (container) this.enterChatbotTab(container);
        } else if (mode === 'widget') {
            this.exitChatbotTab();
        }
    }

    renderFullscreen(container) {
        this.enterChatbotTab(container);
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
            console.group('%c[ARIA v3.0] Debug', 'color:#818cf8');
            console.log('Abierto:', _instance.isOpen);
            console.log('Fullscreen:', _instance._inChatbotTab);
            console.log('Mensajes:', _instance.messages.length);
            console.groupEnd();
        };
        console.log('%c[ARIA v3.0] Debug: window.__ariaDebug()', 'color:#818cf8');
    }

    return _instance;
}

export default ChatbotAssistant;