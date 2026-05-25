// ===== CALENDARIO ACADÉMICO v2.0 — LÓGICA RENOVADA =====
// Motor de eventos con detección de conflictos, drag & drop,
// recurrencia inteligente, undo/redo, y sistema de permisos integrado.

import {
    canView,
    canAction,
    showNoPermissionAlert,
    loadCurrentPermissions
} from '../permissions.js';
import { showAlert } from '../utils.js';

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'cal_events_v2';
const SETTINGS_KEY  = 'cal_settings_v2';
const UNDO_LIMIT    = 50;

const MONTH_NAMES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];
const DAY_NAMES_SHORT  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAY_NAMES_LONG   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

const EVENT_TYPES = {
    academic:  { label: 'Académico',  color: '#6366f1', icon: '📚' },
    meetings:  { label: 'Reunión',    color: '#10b981', icon: '🤝' },
    deadlines: { label: 'Plazo',      color: '#f59e0b', icon: '⏰' },
    holidays:  { label: 'Festivo',    color: '#ef4444', icon: '🎉' },
    exam:      { label: 'Examen',     color: '#8b5cf6', icon: '📝' },
    personal:  { label: 'Personal',   color: '#06b6d4', icon: '👤' },
};

const RECURRENCE_OPTIONS = [
    { value: 'none',    label: 'Sin repetición' },
    { value: 'daily',   label: 'Cada día' },
    { value: 'weekly',  label: 'Cada semana' },
    { value: 'biweekly',label: 'Cada 2 semanas' },
    { value: 'monthly', label: 'Cada mes' },
    { value: 'yearly',  label: 'Cada año' },
];

// ─── UTILIDADES PURAS (sin efectos secundarios) ──────────────────────────────

const uid = () => `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const sid = () => `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const dateToStr  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const strToDate  = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays    = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
const addMonths  = (d, n) => { const r = new Date(d); r.setMonth(r.getMonth()+n); return r; };
const addYears   = (d, n) => { const r = new Date(d); r.setFullYear(r.getFullYear()+n); return r; };
const isSameDay  = (a,b)  => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const daysBetween = (a,b) => Math.round((b-a)/(1000*60*60*24));

function hexToRgba(hex, alpha=1) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function formatTime(t) {
    if (!t) return '';
    const [h,m] = t.split(':').map(Number);
    const ampm  = h >= 12 ? 'PM' : 'AM';
    const hh    = h % 12 || 12;
    return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}

function formatDateShort(d) {
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`;
}

function formatDateLong(d) {
    return `${DAY_NAMES_LONG[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── MOTOR DE RECURRENCIA ────────────────────────────────────────────────────

function generateRecurringDates(startStr, recurrence, limitDate) {
    const dates   = [];
    const start   = strToDate(startStr);
    const limit   = limitDate || addYears(new Date(), 2);
    let   current = new Date(start);

    while (current <= limit) {
        dates.push(dateToStr(current));
        switch (recurrence) {
            case 'daily':     current = addDays(current, 1);    break;
            case 'weekly':    current = addDays(current, 7);    break;
            case 'biweekly':  current = addDays(current, 14);   break;
            case 'monthly':   current = addMonths(current, 1);  break;
            case 'yearly':    current = addYears(current, 1);   break;
            default: return dates;
        }
        if (dates.length > 500) break; // seguro
    }
    return dates;
}

function expandEventToInstances(eventTemplate) {
    if (!eventTemplate.recurrence || eventTemplate.recurrence === 'none') {
        return [{
            ...eventTemplate,
            instanceId: eventTemplate.id,
            isSingle: true
        }];
    }

    const startD = strToDate(eventTemplate.startDate);
    const endD   = eventTemplate.endDate ? strToDate(eventTemplate.endDate) : startD;
    const duration = daysBetween(startD, endD);

    return generateRecurringDates(eventTemplate.startDate, eventTemplate.recurrence)
        .map(dateStr => {
            const iStart = strToDate(dateStr);
            const iEnd   = addDays(iStart, duration);
            return {
                ...eventTemplate,
                instanceId:    `${eventTemplate.id}_${dateStr}`,
                startDate:     dateStr,
                endDate:       dateToStr(iEnd),
                isSingle:      false,
                originalStart: eventTemplate.startDate,
            };
        });
}

// ─── DETECTOR DE CONFLICTOS ──────────────────────────────────────────────────

function eventsConflict(a, b) {
    if (a.id === b.id) return false;
    const aStart = strToDate(a.startDate);
    const aEnd   = a.endDate   ? strToDate(a.endDate)   : aStart;
    const bStart = strToDate(b.startDate);
    const bEnd   = b.endDate   ? strToDate(b.endDate)   : bStart;

    // Solapamiento de fechas
    if (aEnd < bStart || bEnd < aStart) return false;

    // Si hay horas, verificar solapamiento horario también
    if (a.startTime && b.startTime) {
        const aT1 = a.startTime, aT2 = a.endTime || '23:59';
        const bT1 = b.startTime, bT2 = b.endTime || '23:59';
        if (aT2 <= bT1 || bT2 <= aT1) return false;
    }
    return true;
}

function detectConflicts(events, candidate) {
    return events.filter(ev => ev.id !== candidate.id && eventsConflict(ev, candidate));
}

// ─── STORE DE EVENTOS ────────────────────────────────────────────────────────

class EventStore {
    constructor() {
        this._events    = [];   // eventos "plantilla" (master)
        this._undoStack = [];
        this._redoStack = [];
        this._listeners = new Set();
        this.load();
    }

    get _storageKey() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return `cal_events_v2_${user?.schoolId || 'global'}`;
    } catch {
        return 'cal_events_v2_global';
    }
}

load() {
    try {
        const raw = localStorage.getItem(this._storageKey);
        this._events = raw ? JSON.parse(raw) : [];
    } catch { this._events = []; }
}

save() {
    try { 
        localStorage.setItem(this._storageKey, JSON.stringify(this._events)); 
    }
    catch(e) { console.error('Cal: error guardando', e); }
    
    // 🆕 Forzar sync inmediato (sin esperar 30s)
    this._syncToBackend(true);
}

_syncToBackend(force = false) {
    const now = Date.now();
    if (!force && this._lastSync && now - this._lastSync < 30000) return;
    this._lastSync = now;
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('Cal: No hay token para sincronizar');
        return;
    }
    
    const eventos = this._events.map(ev => ({
        id: ev.id,
        title: ev.title,
        type: ev.type,
        priority: ev.priority,
        color: ev.color,
        startDate: ev.startDate,
        endDate: ev.endDate,
        startTime: ev.startTime,
        endTime: ev.endTime,
        location: ev.location,
        description: ev.description,
        recurrence: ev.recurrence,
        reminder: ev.reminder
    }));
    
    console.log('📅 Sincronizando', eventos.length, 'eventos...');
    
    fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ eventos })
    })
    .then(r => r.json())
    .then(d => {
        console.log('📅 Sync OK:', d);
        document.dispatchEvent(new CustomEvent('notifications:refresh'));
    })
    .catch(err => console.error('📅 Sync error:', err));
}

    // — Suscriptores (reactivo) —
    subscribe(fn)   { this._listeners.add(fn); }
    unsubscribe(fn) { this._listeners.delete(fn); }
    _notify()       { this._listeners.forEach(fn => fn(this._events)); }

    // — Snapshot para undo/redo —
    _snapshot() { return JSON.parse(JSON.stringify(this._events)); }

    _pushUndo() {
        this._undoStack.push(this._snapshot());
        if (this._undoStack.length > UNDO_LIMIT) this._undoStack.shift();
        this._redoStack = [];
    }

    undo() {
        if (!this._undoStack.length) return false;
        this._redoStack.push(this._snapshot());
        this._events = this._undoStack.pop();
        this.save();
        this._notify();
        return true;
    }

    redo() {
        if (!this._redoStack.length) return false;
        this._undoStack.push(this._snapshot());
        this._events = this._redoStack.pop();
        this.save();
        this._notify();
        return true;
    }

    canUndo() { return this._undoStack.length > 0; }
    canRedo() { return this._redoStack.length > 0; }

    // — CRUD —
    getAll() { return [...this._events]; }

    getById(id) { return this._events.find(e => e.id === id) || null; }

    add(eventData) {
        this._pushUndo();
        const event = { ...eventData, id: eventData.id || uid(), seriesId: eventData.seriesId || sid(), createdAt: new Date().toISOString() };
        this._events.push(event);
        this.save();
        this._notify();
        return event;
    }

    update(id, changes) {
        this._pushUndo();
        const idx = this._events.findIndex(e => e.id === id);
        if (idx === -1) return null;
        this._events[idx] = { ...this._events[idx], ...changes, updatedAt: new Date().toISOString() };
        this.save();
        this._notify();
        return this._events[idx];
    }

    updateSeries(seriesId, changes) {
        this._pushUndo();
        this._events = this._events.map(e =>
            e.seriesId === seriesId ? { ...e, ...changes, updatedAt: new Date().toISOString() } : e
        );
        this.save();
        this._notify();
    }

    updateSeriesFrom(id, changes) {
        const ev = this.getById(id);
        if (!ev) return;
        this._pushUndo();
        const threshold = ev.startDate;
        this._events = this._events.map(e =>
            e.seriesId === ev.seriesId && e.startDate >= threshold
                ? { ...e, ...changes, updatedAt: new Date().toISOString() }
                : e
        );
        this.save();
        this._notify();
    }

    delete(id) {
        this._pushUndo();
        this._events = this._events.filter(e => e.id !== id);
        this.save();
        this._notify();
    }

    deleteSeries(seriesId) {
        this._pushUndo();
        this._events = this._events.filter(e => e.seriesId !== seriesId);
        this.save();
        this._notify();
    }

    deleteSeriesFrom(id) {
        const ev = this.getById(id);
        if (!ev) return;
        this._pushUndo();
        const threshold = ev.startDate;
        this._events = this._events.filter(e =>
            !(e.seriesId === ev.seriesId && e.startDate >= threshold)
        );
        this.save();
        this._notify();
    }

    clear() {
        this._pushUndo();
        this._events = [];
        this.save();
        this._notify();
    }

    // — Consultas —

    // Obtiene instancias expandidas para un rango de fechas
    getInstancesInRange(startStr, endStr) {
        const rangeStart = strToDate(startStr);
        const rangeEnd   = strToDate(endStr);

        const instances = [];
        for (const ev of this._events) {
            const evs = expandEventToInstances(ev);
            for (const inst of evs) {
                const iStart = strToDate(inst.startDate);
                const iEnd   = inst.endDate ? strToDate(inst.endDate) : iStart;
                // Dentro del rango
                if (iStart <= rangeEnd && iEnd >= rangeStart) {
                    instances.push(inst);
                }
            }
        }
        return instances;
    }

    getInstancesForDate(dateStr) {
        return this.getInstancesInRange(dateStr, dateStr);
    }

    getInstancesForMonth(year, month) {
        const first = dateToStr(new Date(year, month, 1));
        const last  = dateToStr(new Date(year, month+1, 0));
        return this.getInstancesInRange(first, last);
    }

    // Eventos próximos (x días desde hoy)
    getUpcoming(days = 14) {
        const today = dateToStr(new Date());
        const limit = dateToStr(addDays(new Date(), days));
        return this.getInstancesInRange(today, limit)
            .sort((a,b) => a.startDate.localeCompare(b.startDate));
    }

    // Estadísticas rápidas
    getStats() {
        const total = this._events.length;
        const byType = {};
        this._events.forEach(e => { byType[e.type] = (byType[e.type]||0) + 1; });
        const thisMonth = this.getInstancesForMonth(new Date().getFullYear(), new Date().getMonth()).length;
        return { total, byType, thisMonth };
    }
}

// ─── GESTOR DE CONFIGURACIÓN ─────────────────────────────────────────────────

class Settings {
    constructor() {
        this._data = { firstDayMonday: true, defaultView: 'month', activeFilter: 'all', showWeekNumbers: false };
        this.load();
    }
    get _storageKey() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        return `cal_settings_v2_${user?.schoolId || 'global'}`;
    } catch {
        return 'cal_settings_v2_global';
    }
}

load() {
    try {
        const raw = localStorage.getItem(this._storageKey);
        if (raw) this._data = { ...this._data, ...JSON.parse(raw) };
    } catch {}
}

save() {
    try { 
        localStorage.setItem(this._storageKey, JSON.stringify(this._data)); 
    } catch {}
}
    get(key)      { return this._data[key]; }
    set(key, val) { this._data[key] = val; this.save(); }
}

// ─── TOAST MANAGER ───────────────────────────────────────────────────────────

class Toast {
    static show(message, type = 'info', duration = 3200) {
        // Delegate calendar toasts to global alert system for consistency and dedupe
        if (window.__SUPPRESS_NOTIFICATIONS) return;
        try {
            showAlert(message, type, duration);
        } catch (e) {
            // Fallback: console log if alert system isn't available
            console.log(`CalToast [${type}]: ${message}`);
        }
    }
}

// ─── MODAL ENGINE ─────────────────────────────────────────────────────────────

class Modal {
    static _stack = [];

    static open(config) {
        // config: { title, body, actions, size='md', onClose }
        const overlay = document.createElement('div');
        overlay.className = 'cal-modal-overlay';
        overlay.style.cssText = `
            position:fixed;inset:0;z-index:9000;
            background:rgba(15,14,23,0.72);
            backdrop-filter:blur(6px);
            display:flex;align-items:center;justify-content:center;
            opacity:0;transition:opacity 0.22s ease;
            padding: 1rem;
        `;

        const sizeMap = { sm:'400px', md:'560px', lg:'720px', xl:'900px' };
        const panel = document.createElement('div');
        panel.className = 'cal-modal-panel';
        panel.style.cssText = `
            background:#0f0e17;
            border:1px solid rgba(99,102,241,0.2);
            border-radius:20px;
            width:100%;
            max-width:${sizeMap[config.size||'md']};
            max-height:90vh;
            overflow-y:auto;
            padding:2rem;
            transform:translateY(24px) scale(0.97);
            transition:transform 0.28s cubic-bezier(0.34,1.56,0.64,1),opacity 0.22s ease;
            opacity:0;
            scrollbar-width:thin;
            scrollbar-color:rgba(99,102,241,0.3) transparent;
            position:relative;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;`;
        header.innerHTML = `
            <h3 style="margin:0;font-size:1.2rem;font-weight:700;color:#fffffe;font-family:'DM Sans',sans-serif;">${config.title}</h3>
            <button class="cal-modal-close" style="
                background:rgba(255,255,255,0.06);border:none;
                width:32px;height:32px;border-radius:8px;
                cursor:pointer;color:#a8a8b3;font-size:1rem;
                display:flex;align-items:center;justify-content:center;
                transition:background 0.15s,color 0.15s;
            ">✕</button>
        `;

        // Body
        const body = document.createElement('div');
        body.style.cssText = `color:#a8a8b3;font-family:'DM Sans',sans-serif;`;
        if (typeof config.body === 'string') {
            body.innerHTML = config.body;
        } else if (config.body instanceof HTMLElement) {
            body.appendChild(config.body);
        }

        // Actions
        const footer = document.createElement('div');
        footer.style.cssText = `display:flex;gap:0.75rem;justify-content:flex-end;margin-top:1.75rem;flex-wrap:wrap;`;
        (config.actions || []).forEach(action => {
            const btn = document.createElement('button');
            btn.textContent = action.label;
            const styles = {
                cancel: `background:rgba(255,255,255,0.06);color:#fffffe;border:1px solid rgba(255,255,255,0.1);`,
                primary:`background:#6366f1;color:#fff;border:none;`,
                danger: `background:#ef4444;color:#fff;border:none;`,
                success:`background:#10b981;color:#fff;border:none;`,
            };
            btn.style.cssText = `
                padding:0.6rem 1.2rem;
                border-radius:10px;
                font-family:'DM Sans',sans-serif;
                font-size:0.875rem;
                font-weight:600;
                cursor:pointer;
                transition:filter 0.15s,transform 0.1s;
                ${styles[action.variant||'cancel']}
            `;
            btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(1.15)');
            btn.addEventListener('mouseleave', () => btn.style.filter = '');
            btn.addEventListener('mousedown',  () => btn.style.transform = 'scale(0.97)');
            btn.addEventListener('mouseup',    () => btn.style.transform = '');
            btn.addEventListener('click', () => {
                if (action.onClick) action.onClick();
                if (action.close !== false) Modal.close(overlay);
            });
            footer.appendChild(btn);
        });

        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        Modal._stack.push(overlay);

        const closeBtn = header.querySelector('.cal-modal-close');
        const close = () => {
            if (config.onClose) config.onClose();
            Modal.close(overlay);
        };
        closeBtn.addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            panel.style.opacity   = '1';
            panel.style.transform = 'translateY(0) scale(1)';
        });

        // Esc para cerrar
        const escHandler = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }};
        document.addEventListener('keydown', escHandler);

        return { overlay, panel, body, close };
    }

    static close(overlay) {
        overlay.style.opacity = '0';
        const panel = overlay.querySelector('.cal-modal-panel');
        if (panel) { panel.style.opacity = '0'; panel.style.transform = 'translateY(16px) scale(0.97)'; }
        setTimeout(() => { overlay.remove(); Modal._stack = Modal._stack.filter(o => o !== overlay); }, 250);
    }

    static closeAll() {
        Modal._stack.forEach(o => Modal.close(o));
    }
}

// ─── FORMULARIO DE EVENTOS ───────────────────────────────────────────────────

class EventForm {
    constructor(store, onSaved) {
        this._store   = store;
        this._onSaved = onSaved;
        this._editId  = null;
    }

    _buildForm(defaults = {}) {
        const now = dateToStr(new Date());

        const form = document.createElement('form');
        form.style.cssText = `display:flex;flex-direction:column;gap:1.1rem;`;
        form.innerHTML = `
            <div class="cf-row" style="display:grid;grid-template-columns:1fr auto;gap:0.75rem;align-items:start;">
                <div class="cf-field">
                    <label class="cf-label">Título del evento *</label>
                    <input id="cf-title" type="text" class="cf-input" placeholder="Nombre del evento..." value="${defaults.title||''}" maxlength="100" autocomplete="off">
                    <span class="cf-err" id="cf-err-title"></span>
                </div>
                <div class="cf-field">
                    <label class="cf-label">Color</label>
                    <div style="position:relative;width:50px;">
                        <input id="cf-color" type="color" class="cf-color-input" value="${defaults.color||'#6366f1'}">
                        <div id="cf-color-preview" style="
                            width:48px;height:48px;border-radius:12px;
                            background:${defaults.color||'#6366f1'};
                            cursor:pointer;border:2px solid rgba(255,255,255,0.1);
                            position:absolute;top:0;left:0;pointer-events:none;
                        "></div>
                    </div>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <div class="cf-field">
                    <label class="cf-label">Tipo</label>
                    <select id="cf-type" class="cf-input">
                        ${Object.entries(EVENT_TYPES).map(([k,v]) =>
                            `<option value="${k}" ${(defaults.type||'academic')===k?'selected':''}>${v.icon} ${v.label}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="cf-field">
                    <label class="cf-label">Prioridad</label>
                    <select id="cf-priority" class="cf-input">
                        <option value="normal"  ${(defaults.priority||'normal')==='normal'?'selected':''}>Normal</option>
                        <option value="high"    ${defaults.priority==='high'?'selected':''}>Alta</option>
                        <option value="urgent"  ${defaults.priority==='urgent'?'selected':''}>Urgente</option>
                        <option value="low"     ${defaults.priority==='low'?'selected':''}>Baja</option>
                    </select>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0.75rem;">
                <div class="cf-field">
                    <label class="cf-label">Fecha inicio *</label>
                    <input id="cf-start-date" type="date" class="cf-input" value="${defaults.startDate||now}">
                    <span class="cf-err" id="cf-err-date"></span>
                </div>
                <div class="cf-field">
                    <label class="cf-label">Hora inicio</label>
                    <input id="cf-start-time" type="time" class="cf-input" value="${defaults.startTime||'09:00'}">
                </div>
                <div class="cf-field">
                    <label class="cf-label">Fecha fin</label>
                    <input id="cf-end-date" type="date" class="cf-input" value="${defaults.endDate||defaults.startDate||now}">
                </div>
                <div class="cf-field">
                    <label class="cf-label">Hora fin</label>
                    <input id="cf-end-time" type="time" class="cf-input" value="${defaults.endTime||'10:00'}">
                </div>
            </div>

            <div class="cf-field">
                <label class="cf-label">Ubicación</label>
                <input id="cf-location" type="text" class="cf-input" placeholder="Aula, sala, plataforma..." value="${defaults.location||''}" maxlength="150">
            </div>

            <div class="cf-field">
                <label class="cf-label">Descripción</label>
                <textarea id="cf-desc" class="cf-input" rows="3" placeholder="Detalles del evento..." style="resize:vertical;min-height:72px;">${defaults.description||''}</textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                <div class="cf-field">
                    <label class="cf-label">Recordatorio</label>
                    <select id="cf-reminder" class="cf-input">
                        <option value="">Sin recordatorio</option>
                        <option value="1d"   ${defaults.reminder==='1d'?'selected':''}>1 día antes</option>
                        <option value="3d"   ${defaults.reminder==='3d'?'selected':''}>3 días antes</option>
                    </select>
                </div>
                <div class="cf-field">
                    <label class="cf-label">Repetir</label>
                    <select id="cf-recurrence" class="cf-input">
                        ${RECURRENCE_OPTIONS.map(o =>
                            `<option value="${o.value}" ${(defaults.recurrence||'none')===o.value?'selected':''}>${o.label}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>

            <div id="cf-conflict-warning" style="
                display:none;
                background:rgba(245,158,11,0.1);
                border:1px solid rgba(245,158,11,0.3);
                border-radius:10px;
                padding:0.75rem 1rem;
                font-size:0.8rem;
                color:#fcd34d;
            "></div>
        `;

        // Estilos del formulario
        const style = document.createElement('style');
        style.textContent = `
            .cf-label {
                display:block;
                font-size:0.75rem;
                font-weight:600;
                color:#7b7b8a;
                margin-bottom:0.35rem;
                text-transform:uppercase;
                letter-spacing:0.06em;
            }
            .cf-input {
                width:100%;
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(99,102,241,0.2);
                border-radius:10px;
                color:#fffffe;
                font-family:'DM Sans',sans-serif;
                font-size:0.875rem;
                padding:0.6rem 0.875rem;
                outline:none;
                transition:border-color 0.15s,background 0.15s;
                box-sizing:border-box;
                color-scheme:dark;
            }
            .cf-input:focus {
                border-color:#6366f1;
                background:rgba(99,102,241,0.08);
            }
            .cf-input option { background:#1a1a2e;color:#fffffe; }
            .cf-color-input {
                position:absolute;opacity:0;width:48px;height:48px;cursor:pointer;border:none;padding:0;z-index:1;
            }
            .cf-err {
                display:block;
                font-size:0.75rem;
                color:#f87171;
                margin-top:0.25rem;
                min-height:1rem;
            }
            .cf-field { display:flex;flex-direction:column; }
        `;
        form.prepend(style);

        // — Lógica reactiva del formulario —

        const colorInput   = form.querySelector('#cf-color');
        const colorPreview = form.querySelector('#cf-color-preview');
        colorInput.addEventListener('input', () => {
            colorPreview.style.background = colorInput.value;
        });
        colorPreview.parentElement.addEventListener('click', () => colorInput.click());

        // Auto-rellenar fecha fin al cambiar inicio
        const startDateInput = form.querySelector('#cf-start-date');
        const endDateInput   = form.querySelector('#cf-end-date');
        startDateInput.addEventListener('change', () => {
            if (!endDateInput.value || endDateInput.value < startDateInput.value) {
                endDateInput.value = startDateInput.value;
            }
            this._checkConflicts(form);
        });
        endDateInput.addEventListener('change',        () => this._checkConflicts(form));
        form.querySelector('#cf-start-time').addEventListener('change', () => this._checkConflicts(form));
        form.querySelector('#cf-end-time').addEventListener('change',   () => this._checkConflicts(form));

        // Autocompletar hora fin (+1h)
        form.querySelector('#cf-start-time').addEventListener('change', e => {
            const [h,m] = e.target.value.split(':').map(Number);
            const endTime = form.querySelector('#cf-end-time');
            if (!endTime.value || endTime.value <= e.target.value) {
                const nh = (h+1) % 24;
                endTime.value = `${String(nh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            }
        });

        // Color automático por tipo
        form.querySelector('#cf-type').addEventListener('change', e => {
            const typeColor = EVENT_TYPES[e.target.value]?.color;
            if (typeColor && !defaults.color) {
                colorInput.value           = typeColor;
                colorPreview.style.background = typeColor;
            }
        });

        this._form = form;
        return form;
    }

    _checkConflicts(form) {
        const warning = form.querySelector('#cf-conflict-warning');
        if (!warning) return;

        const sd = form.querySelector('#cf-start-date').value;
        const ed = form.querySelector('#cf-end-date').value;
        const st = form.querySelector('#cf-start-time').value;
        const et = form.querySelector('#cf-end-time').value;

        if (!sd) { warning.style.display = 'none'; return; }

        const candidate = { id: this._editId || '__new__', startDate: sd, endDate: ed || sd, startTime: st, endTime: et };
        const conflicts = detectConflicts(this._store.getAll(), candidate);

        if (conflicts.length > 0) {
            warning.style.display = 'block';
            warning.innerHTML = `⚠ Conflicto con: ${conflicts.map(c => `<strong>${c.title}</strong>`).join(', ')}`;
        } else {
            warning.style.display = 'none';
        }
    }

    _validate(form) {
        let valid = true;
        const title = form.querySelector('#cf-title');
        const start = form.querySelector('#cf-start-date');
        const end   = form.querySelector('#cf-end-date');

        form.querySelectorAll('.cf-err').forEach(e => e.textContent = '');

        if (!title.value.trim()) {
            form.querySelector('#cf-err-title').textContent = 'El título es obligatorio';
            title.style.borderColor = '#ef4444';
            valid = false;
        } else { title.style.borderColor = ''; }

        if (!start.value) {
            form.querySelector('#cf-err-date').textContent = 'La fecha de inicio es obligatoria';
            valid = false;
        } else if (end.value && end.value < start.value) {
            form.querySelector('#cf-err-date').textContent = 'La fecha fin no puede ser anterior al inicio';
            valid = false;
        }

        return valid;
    }

    _getData(form) {
        return {
            title:      form.querySelector('#cf-title').value.trim(),
            type:       form.querySelector('#cf-type').value,
            priority:   form.querySelector('#cf-priority').value,
            color:      form.querySelector('#cf-color').value,
            startDate:  form.querySelector('#cf-start-date').value,
            startTime:  form.querySelector('#cf-start-time').value,
            endDate:    form.querySelector('#cf-end-date').value || form.querySelector('#cf-start-date').value,
            endTime:    form.querySelector('#cf-end-time').value,
            location:   form.querySelector('#cf-location').value.trim(),
            description:form.querySelector('#cf-desc').value.trim(),
            reminder:   form.querySelector('#cf-reminder').value,
            recurrence: form.querySelector('#cf-recurrence').value,
        };
    }

    openNew(defaultDate = null) {
        this._editId = null;
        const defaults = defaultDate ? { startDate: defaultDate, endDate: defaultDate } : {};
        const form = this._buildForm(defaults);

        const { close } = Modal.open({
            title: '✦ Nuevo Evento',
            body: form,
            size: 'lg',
            actions: [
                { label: 'Cancelar', variant: 'cancel' },
                {
                    label: 'Guardar Evento',
                    variant: 'primary',
                    close: false,
                    onClick: () => {
                        if (!this._validate(form)) return;
                        const data = this._getData(form);
                        const event = this._store.add(data);
                        Toast.show(`Evento "${event.title}" guardado`, 'success');
                        close();
                        if (this._onSaved) this._onSaved(event);
                    }
                }
            ]
        });
    }

    openEdit(eventId) {
        const event = this._store.getById(eventId);
        if (!event) return;
        this._editId = eventId;

        const isRecurring = event.recurrence && event.recurrence !== 'none';
        const form = this._buildForm(event);

        const actions = [
            { label: 'Cancelar', variant: 'cancel' },
        ];

        if (isRecurring) {
            // Para recurrentes: opciones de edición
            actions.push({
                label: 'Guardar solo este',
                variant: 'primary',
                close: false,
                onClick: () => {
                    if (!this._validate(form)) return;
                    const data = this._getData(form);
                    // Desvinculamos de la serie
                    this._store.update(eventId, { ...data, recurrence: 'none', seriesId: sid() });
                    Toast.show('Evento actualizado', 'success');
                    Modal.closeAll();
                    if (this._onSaved) this._onSaved();
                }
            });
            actions.push({
                label: 'Guardar toda la serie',
                variant: 'success',
                close: false,
                onClick: () => {
                    if (!this._validate(form)) return;
                    const data = this._getData(form);
                    this._store.updateSeries(event.seriesId, data);
                    Toast.show('Serie actualizada', 'success');
                    Modal.closeAll();
                    if (this._onSaved) this._onSaved();
                }
            });
        } else {
            actions.push({
                label: 'Guardar Cambios',
                variant: 'primary',
                close: false,
                onClick: () => {
                    if (!this._validate(form)) return;
                    const data = this._getData(form);
                    this._store.update(eventId, data);
                    Toast.show('Evento actualizado', 'success');
                    Modal.closeAll();
                    if (this._onSaved) this._onSaved();
                }
            });
        }

        Modal.open({
            title: '✦ Editar Evento',
            body: form,
            size: 'lg',
            actions
        });
    }

    openDelete(eventId) {
        const event = this._store.getById(eventId);
        if (!event) return;
        const isRecurring = event.recurrence && event.recurrence !== 'none';

        if (!isRecurring) {
            Modal.open({
                title: 'Eliminar Evento',
                body: `<p style="color:#a8a8b3;font-size:0.95rem;">¿Eliminar "<strong style="color:#fffffe;">${event.title}</strong>"? Esta acción no se puede deshacer.</p>`,
                actions: [
                    { label: 'Cancelar', variant: 'cancel' },
                    { label: 'Eliminar', variant: 'danger', onClick: () => {
                        this._store.delete(eventId);
                        Toast.show('Evento eliminado', 'error');
                        if (this._onSaved) this._onSaved();
                    }}
                ]
            });
            return;
        }

        // Recurrente: opciones
        const container = document.createElement('div');
        container.style.cssText = `display:flex;flex-direction:column;gap:0.75rem;`;

        const seriesCount = this._store.getAll().filter(e => e.seriesId === event.seriesId).length;
        const opts = [
            { action: 'single',  label: 'Solo este evento', sub: '1 evento', color: '#6366f1' },
            { action: 'forward', label: 'Este y siguientes', sub: 'Desde esta fecha', color: '#f59e0b' },
            { action: 'series',  label: 'Toda la serie', sub: `${seriesCount} eventos`, color: '#ef4444' },
        ];

        opts.forEach(opt => {
            const card = document.createElement('div');
            card.style.cssText = `
                padding:0.875rem 1rem;
                border-radius:12px;
                border:1px solid rgba(255,255,255,0.08);
                cursor:pointer;
                display:flex;justify-content:space-between;align-items:center;
                transition:background 0.15s,border-color 0.15s;
            `;
            card.innerHTML = `
                <div>
                    <div style="color:#fffffe;font-weight:600;font-size:0.9rem;margin-bottom:0.2rem;">${opt.label}</div>
                    <div style="color:#7b7b8a;font-size:0.8rem;">${opt.sub}</div>
                </div>
                <span style="color:${opt.color};font-size:1.1rem;">→</span>
            `;
            card.addEventListener('mouseenter', () => { card.style.background = 'rgba(255,255,255,0.04)'; card.style.borderColor = opt.color; });
            card.addEventListener('mouseleave', () => { card.style.background = ''; card.style.borderColor = 'rgba(255,255,255,0.08)'; });
            card.addEventListener('click', () => {
                if (opt.action === 'single')  this._store.delete(eventId);
                if (opt.action === 'forward') this._store.deleteSeriesFrom(eventId);
                if (opt.action === 'series')  this._store.deleteSeries(event.seriesId);
                Toast.show('Evento(s) eliminado(s)', 'error');
                Modal.closeAll();
                if (this._onSaved) this._onSaved();
            });
            container.appendChild(card);
        });

        Modal.open({
            title: 'Eliminar Evento Recurrente',
            body: container,
            actions: [{ label: 'Cancelar', variant: 'cancel' }]
        });
    }
}

// ─── RENDERER DEL CALENDARIO ─────────────────────────────────────────────────

class CalendarRenderer {
    constructor(store, settings, form, canEdit) {
        this._store    = store;
        this._settings = settings;
        this._form     = form;
        this._canEdit  = canEdit;
        this._year     = new Date().getFullYear();
        this._month    = new Date().getMonth();
        this._filter   = 'all';
        this._view     = 'month'; // month | week | agenda
        this._selected = null;

        this._dragState = null;
        this._root      = null;
    }

    mount(container) {
        this._root = container;
        this._buildShell();
        this._store.subscribe(() => this.refresh());
        this.refresh();
    }

    // — Shell del DOM —
    _buildShell() {
        this._root.innerHTML = '';
        this._root.style.cssText = `
            display:flex;flex-direction:column;gap:0;
            height:100%;min-height:600px;
            font-family:'DM Sans',sans-serif;
        `;

        // Toolbar
        const toolbar = document.createElement('div');
        toolbar.id = 'cal-toolbar';
        toolbar.style.cssText = `
            display:flex;align-items:center;gap:0.75rem;
            padding:1rem 1.5rem;
            border-bottom:1px solid rgba(99,102,241,0.15);
            flex-wrap:wrap;
        `;
        this._root.appendChild(toolbar);

        // Body: sidebar + grid
        const body = document.createElement('div');
        body.style.cssText = `display:flex;flex:1;overflow:hidden;min-height:0;`;

        const sidebar = document.createElement('div');
        sidebar.id = 'cal-sidebar';
        sidebar.style.cssText = `
            width:260px;flex-shrink:0;
            border-right:1px solid rgba(99,102,241,0.15);
            display:flex;flex-direction:column;
            overflow-y:auto;padding:1.25rem;gap:1.25rem;
            scrollbar-width:thin;scrollbar-color:rgba(99,102,241,0.2) transparent;
        `;

        const main = document.createElement('div');
        main.id = 'cal-main';
        main.style.cssText = `flex:1;overflow:auto;min-width:0;scrollbar-width:thin;scrollbar-color:rgba(99,102,241,0.2) transparent;`;

        body.appendChild(sidebar);
        body.appendChild(main);
        this._root.appendChild(body);
    }

    refresh() {
        this._renderToolbar();
        this._renderSidebar();
        if (this._view === 'month')  this._renderMonthView();
        if (this._view === 'week')   this._renderWeekView();
        if (this._view === 'agenda') this._renderAgendaView();
    }

    _navigate(dir) {
        if (this._view === 'month') {
            this._month += dir;
            if (this._month > 11) { this._month = 0;  this._year++; }
            if (this._month < 0)  { this._month = 11; this._year--; }
        } else if (this._view === 'week') {
            this._weekOffset = (this._weekOffset || 0) + dir;
        }
        this.refresh();
    }

    _goToday() {
        const t = new Date();
        this._year  = t.getFullYear();
        this._month = t.getMonth();
        this._weekOffset = 0;
        this.refresh();
    }

    _setView(v) { this._view = v; this._settings.set('defaultView', v); this.refresh(); }
    _setFilter(f) { this._filter = f; this.refresh(); }

    _matchesFilter(event) {
        if (this._filter === 'all') return true;
        return event.type === this._filter;
    }

    // ─ TOOLBAR ────────────────────────────────────────────────────────────────

    _renderToolbar() {
        const tb = document.getElementById('cal-toolbar');
        if (!tb) return;
        tb.innerHTML = '';

        // Navegación
        const navGroup = document.createElement('div');
        navGroup.style.cssText = `display:flex;align-items:center;gap:0.5rem;`;

        const prevBtn = this._mkBtn('←', () => this._navigate(-1));
        const todayBtn = this._mkBtn('Hoy', () => this._goToday(), 'secondary');
        const nextBtn = this._mkBtn('→', () => this._navigate(1));

        const monthLabel = document.createElement('span');
        monthLabel.style.cssText = `
            font-size:1.25rem;font-weight:800;color:#fffffe;
            min-width:190px;text-align:center;letter-spacing:-0.02em;
        `;
        monthLabel.textContent = `${MONTH_NAMES[this._month]} ${this._year}`;

        navGroup.appendChild(prevBtn);
        navGroup.appendChild(todayBtn);
        navGroup.appendChild(monthLabel);
        navGroup.appendChild(nextBtn);
        tb.appendChild(navGroup);

        // Spacer
        const sp = document.createElement('div');
        sp.style.cssText = `flex:1;`;
        tb.appendChild(sp);

        // Filtros
        const filterGroup = document.createElement('div');
        filterGroup.style.cssText = `display:flex;align-items:center;gap:0.35rem;flex-wrap:wrap;`;

        [{ k: 'all', label: 'Todos' }, ...Object.entries(EVENT_TYPES).map(([k,v]) => ({ k, label: v.label }))].forEach(({ k, label }) => {
            const btn = document.createElement('button');
            const isActive = this._filter === k;
            btn.textContent = label;
            btn.style.cssText = `
                padding:0.35rem 0.75rem;
                border-radius:999px;
                font-family:'DM Sans',sans-serif;
                font-size:0.78rem;
                font-weight:600;
                cursor:pointer;
                transition:all 0.15s;
                border:1px solid ${isActive ? (EVENT_TYPES[k]?.color||'#6366f1') : 'rgba(255,255,255,0.1)'};
                background:${isActive ? (EVENT_TYPES[k]?.color||'#6366f1')+'22' : 'transparent'};
                color:${isActive ? (EVENT_TYPES[k]?.color||'#6366f1') : '#7b7b8a'};
            `;
            btn.addEventListener('click', () => this._setFilter(k));
            filterGroup.appendChild(btn);
        });
        tb.appendChild(filterGroup);

        // View switcher
        const viewGroup = document.createElement('div');
        viewGroup.style.cssText = `display:flex;align-items:center;gap:0.25rem;background:rgba(255,255,255,0.04);border-radius:10px;padding:3px;`;
        [
            { v: 'month', label: 'Mes' },
            { v: 'week',  label: 'Semana' },
            { v: 'agenda',label: 'Lista' },
        ].forEach(({ v, label }) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            const isA = this._view === v;
            btn.style.cssText = `
                padding:0.35rem 0.75rem;border-radius:8px;
                font-family:'DM Sans',sans-serif;font-size:0.8rem;font-weight:600;
                cursor:pointer;transition:all 0.15s;border:none;
                background:${isA ? '#6366f1' : 'transparent'};
                color:${isA ? '#fff' : '#7b7b8a'};
            `;
            btn.addEventListener('click', () => this._setView(v));
            viewGroup.appendChild(btn);
        });
        tb.appendChild(viewGroup);

        // Botón nuevo evento
        if (this._canEdit) {
            const addBtn = this._mkBtn('+ Nuevo evento', () => this._form.openNew(), 'primary');
            tb.appendChild(addBtn);
        }

        // Undo/Redo
        const undoBtn = this._mkBtn('↩', () => {
            if (this._store.undo()) Toast.show('Acción deshecha', 'undo');
            else Toast.show('Nada que deshacer', 'info');
        });
        const redoBtn = this._mkBtn('↪', () => {
            if (this._store.redo()) Toast.show('Acción rehecha', 'undo');
            else Toast.show('Nada que rehacer', 'info');
        });
        undoBtn.title = 'Deshacer (Ctrl+Z)';
        redoBtn.title = 'Rehacer (Ctrl+Y)';
        tb.appendChild(undoBtn);
        tb.appendChild(redoBtn);
    }

    _mkBtn(label, onClick, variant = 'ghost') {
        const btn = document.createElement('button');
        btn.textContent = label;
        const styles = {
            ghost:    `background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#a8a8b3;`,
            secondary:`background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc;`,
            primary:  `background:#6366f1;border:none;color:#fff;`,
        };
        btn.style.cssText = `
            padding:0.45rem 0.875rem;border-radius:10px;
            font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:600;
            cursor:pointer;transition:filter 0.15s,transform 0.1s;
            ${styles[variant]||styles.ghost}
        `;
        btn.addEventListener('mouseenter', () => btn.style.filter = 'brightness(1.2)');
        btn.addEventListener('mouseleave', () => btn.style.filter = '');
        btn.addEventListener('mousedown',  () => btn.style.transform = 'scale(0.96)');
        btn.addEventListener('mouseup',    () => btn.style.transform = '');
        btn.addEventListener('click', onClick);
        return btn;
    }

    // ─ SIDEBAR ────────────────────────────────────────────────────────────────

    _renderSidebar() {
        const sidebar = document.getElementById('cal-sidebar');
        if (!sidebar) return;
        sidebar.innerHTML = '';

        // Mini calendario
        sidebar.appendChild(this._buildMiniCalendar());

        // Próximos eventos
        sidebar.appendChild(this._buildUpcoming());

        // Estadísticas
        sidebar.appendChild(this._buildStats());
    }

    _buildMiniCalendar() {
        const wrap = document.createElement('div');

        const header = document.createElement('div');
        header.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;`;
        header.innerHTML = `
            <span style="font-size:0.8rem;font-weight:700;color:#fffffe;text-transform:uppercase;letter-spacing:0.05em;">
                ${MONTH_NAMES[this._month].slice(0,3)} ${this._year}
            </span>
        `;
        const navRow = document.createElement('div');
        navRow.style.cssText = `display:flex;gap:4px;`;
        const p = this._mkBtn('‹', () => this._navigate(-1));
        const n = this._mkBtn('›', () => this._navigate(1));
        p.style.padding = n.style.padding = '0.2rem 0.5rem';
        navRow.appendChild(p); navRow.appendChild(n);
        header.appendChild(navRow);
        wrap.appendChild(header);

        const grid = document.createElement('div');
        grid.style.cssText = `display:grid;grid-template-columns:repeat(7,1fr);gap:2px;`;

        // Encabezados
        const startDay = 1; // Lunes
        const dayLabels = ['L','M','X','J','V','S','D'];
        dayLabels.forEach(d => {
            const cell = document.createElement('div');
            cell.textContent = d;
            cell.style.cssText = `text-align:center;font-size:0.65rem;font-weight:700;color:#4a4a5a;padding:2px 0;`;
            grid.appendChild(cell);
        });

        const firstDay = new Date(this._year, this._month, 1);
        let startOffset = (firstDay.getDay() + 6) % 7; // Lunes=0
        const daysInMonth = new Date(this._year, this._month+1, 0).getDate();
        const today = new Date();

        for (let i = 0; i < startOffset; i++) {
            grid.appendChild(document.createElement('div'));
        }

        const instances = this._store.getInstancesForMonth(this._year, this._month);

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(this._year, this._month, d);
            const dateStr = dateToStr(date);
            const isToday = isSameDay(date, today);
            const hasEvents = instances.some(e => e.startDate === dateStr || (e.startDate <= dateStr && e.endDate >= dateStr));

            const cell = document.createElement('div');
            cell.textContent = d;
            cell.style.cssText = `
                width:28px;height:28px;
                display:flex;align-items:center;justify-content:center;
                border-radius:50%;font-size:0.75rem;cursor:pointer;
                transition:background 0.15s;margin:0 auto;
                font-weight:${isToday?'800':'400'};
                background:${isToday ? '#6366f1' : 'transparent'};
                color:${isToday ? '#fff' : '#a8a8b3'};
                position:relative;
            `;
            if (hasEvents && !isToday) {
                const dot = document.createElement('span');
                dot.style.cssText = `position:absolute;bottom:2px;width:4px;height:4px;border-radius:50%;background:#6366f1;`;
                cell.appendChild(dot);
            }
            cell.addEventListener('mouseenter', () => { if (!isToday) cell.style.background = 'rgba(99,102,241,0.15)'; });
            cell.addEventListener('mouseleave', () => { if (!isToday) cell.style.background = 'transparent'; });
            cell.addEventListener('click', () => {
                if (this._canEdit) this._form.openNew(dateStr);
            });
            grid.appendChild(cell);
        }

        wrap.appendChild(grid);
        return wrap;
    }

    _buildUpcoming() {
        const wrap = document.createElement('div');

        const title = document.createElement('div');
        title.style.cssText = `font-size:0.75rem;font-weight:700;color:#4a4a5a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.75rem;`;
        title.textContent = 'Próximos 14 días';
        wrap.appendChild(title);

        const upcoming = this._store.getUpcoming(14).filter(e => this._matchesFilter(e)).slice(0, 8);

        if (!upcoming.length) {
            const empty = document.createElement('div');
            empty.style.cssText = `color:#4a4a5a;font-size:0.8rem;text-align:center;padding:1rem 0;`;
            empty.textContent = 'Sin eventos próximos';
            wrap.appendChild(empty);
            return wrap;
        }

        upcoming.forEach(ev => {
            const item = document.createElement('div');
            const d = strToDate(ev.startDate);
            const isToday = isSameDay(d, new Date());
            const diffDays = daysBetween(new Date().setHours(0,0,0,0), d.setHours(0,0,0,0));

            item.style.cssText = `
                padding:0.5rem 0.625rem;
                border-radius:8px;
                border-left:3px solid ${ev.color};
                background:${hexToRgba(ev.color, 0.07)};
                margin-bottom:0.375rem;
                cursor:pointer;
                transition:background 0.15s;
            `;
            item.innerHTML = `
                <div style="font-size:0.75rem;font-weight:700;color:${ev.color};">
                    ${isToday ? 'Hoy' : diffDays === 1 ? 'Mañana' : formatDateShort(d)}
                    ${ev.startTime ? `· ${formatTime(ev.startTime)}` : ''}
                </div>
                <div style="font-size:0.8rem;color:#fffffe;font-weight:500;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ev.title}</div>
                ${ev.location ? `<div style="font-size:0.7rem;color:#6b6b7a;margin-top:1px;">📍 ${ev.location}</div>` : ''}
            `;
            item.addEventListener('mouseenter', () => item.style.background = hexToRgba(ev.color, 0.14));
            item.addEventListener('mouseleave', () => item.style.background = hexToRgba(ev.color, 0.07));
            item.addEventListener('click', () => {
                if (this._canEdit) {
                    const master = this._store.getById(ev.id);
                    if (master) this._form.openEdit(ev.id);
                }
            });
            wrap.appendChild(item);
        });

        return wrap;
    }

    _buildStats() {
        const stats = this._store.getStats();
        const wrap = document.createElement('div');
        wrap.style.cssText = `margin-top:0.5rem;`;

        const title = document.createElement('div');
        title.style.cssText = `font-size:0.75rem;font-weight:700;color:#4a4a5a;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:0.625rem;`;
        title.textContent = 'Resumen';
        wrap.appendChild(title);

        const grid = document.createElement('div');
        grid.style.cssText = `display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;`;

        const cards = [
            { label: 'Total eventos', value: stats.total, color: '#6366f1' },
            { label: 'Este mes', value: stats.thisMonth, color: '#10b981' },
        ];
        cards.forEach(c => {
            const card = document.createElement('div');
            card.style.cssText = `
                background:${hexToRgba(c.color, 0.08)};
                border:1px solid ${hexToRgba(c.color, 0.2)};
                border-radius:10px;padding:0.625rem;text-align:center;
            `;
            card.innerHTML = `
                <div style="font-size:1.4rem;font-weight:800;color:${c.color};">${c.value}</div>
                <div style="font-size:0.7rem;color:#6b6b7a;margin-top:2px;">${c.label}</div>
            `;
            grid.appendChild(card);
        });
        wrap.appendChild(grid);

        // Por tipo
        if (Object.keys(stats.byType).length > 0) {
            const list = document.createElement('div');
            list.style.cssText = `margin-top:0.625rem;display:flex;flex-direction:column;gap:0.3rem;`;
            Object.entries(stats.byType).forEach(([type, count]) => {
                const t = EVENT_TYPES[type] || { label: type, color: '#6366f1' };
                const row = document.createElement('div');
                row.style.cssText = `display:flex;align-items:center;gap:0.4rem;font-size:0.75rem;`;
                row.innerHTML = `
                    <span style="width:8px;height:8px;border-radius:50%;background:${t.color};flex-shrink:0;"></span>
                    <span style="color:#7b7b8a;flex:1;">${t.label}</span>
                    <span style="color:#fffffe;font-weight:700;">${count}</span>
                `;
                list.appendChild(row);
            });
            wrap.appendChild(list);
        }

        return wrap;
    }

    // ─ VISTA MENSUAL ──────────────────────────────────────────────────────────

    _renderMonthView() {
        const main = document.getElementById('cal-main');
        if (!main) return;
        main.innerHTML = '';

        const table = document.createElement('div');
        table.style.cssText = `display:flex;flex-direction:column;height:100%;min-height:560px;`;

        // Encabezados días
        const headerRow = document.createElement('div');
        headerRow.style.cssText = `display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid rgba(99,102,241,0.12);`;
        const days = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        days.forEach((d, i) => {
            const cell = document.createElement('div');
            cell.textContent = d;
            cell.style.cssText = `
                padding:0.625rem 0;text-align:center;
                font-size:0.7rem;font-weight:700;letter-spacing:0.08em;
                color:${i >= 5 ? '#6366f1' : '#4a4a5a'};
                text-transform:uppercase;
                border-right:${i<6 ? '1px solid rgba(99,102,241,0.08)' : 'none'};
            `;
            headerRow.appendChild(cell);
        });
        table.appendChild(headerRow);

        // Grid días
        const grid = document.createElement('div');
        grid.style.cssText = `display:grid;grid-template-columns:repeat(7,1fr);flex:1;`;

        const firstDay = new Date(this._year, this._month, 1);
        const daysInMonth = new Date(this._year, this._month+1, 0).getDate();
        const startOffset = (firstDay.getDay() + 6) % 7; // Lunes=0
        const prevMonthDays = new Date(this._year, this._month, 0).getDate();
        const today = new Date();

        // Instancias del mes + algo de margen para eventos multi-día
        const rangeStart = dateToStr(addDays(new Date(this._year, this._month, 1), -7));
        const rangeEnd   = dateToStr(addDays(new Date(this._year, this._month+1, 0), 7));
        const allInstances = this._store.getInstancesInRange(rangeStart, rangeEnd)
            .filter(e => this._matchesFilter(e));

        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            let date, isCurrentMonth;
            if (i < startOffset) {
                date = new Date(this._year, this._month-1, prevMonthDays - startOffset + i + 1);
                isCurrentMonth = false;
            } else if (i - startOffset < daysInMonth) {
                date = new Date(this._year, this._month, i - startOffset + 1);
                isCurrentMonth = true;
            } else {
                date = new Date(this._year, this._month+1, i - startOffset - daysInMonth + 1);
                isCurrentMonth = false;
            }

            const dateStr    = dateToStr(date);
            const isToday    = isSameDay(date, today);
            const isWeekend  = date.getDay() === 0 || date.getDay() === 6;
            const colIndex   = i % 7;

            const cell = document.createElement('div');
            cell.dataset.date = dateStr;
            cell.style.cssText = `
                min-height:110px;
                padding:0.4rem 0.5rem;
                border-right:${colIndex<6 ? '1px solid rgba(99,102,241,0.08)' : 'none'};
                border-bottom:1px solid rgba(99,102,241,0.08);
                position:relative;
                cursor:${this._canEdit ? 'pointer' : 'default'};
                transition:background 0.12s;
                background:${!isCurrentMonth ? 'rgba(0,0,0,0.15)' : isWeekend ? 'rgba(99,102,241,0.025)' : 'transparent'};
                display:flex;flex-direction:column;
                overflow:hidden;
            `;

            // Número del día
            const dayNum = document.createElement('div');
            dayNum.textContent = date.getDate();
            dayNum.style.cssText = `
                width:28px;height:28px;
                display:flex;align-items:center;justify-content:center;
                border-radius:50%;
                font-size:0.82rem;font-weight:${isToday?'800':'600'};
                background:${isToday ? '#6366f1' : 'transparent'};
                color:${isToday ? '#fff' : !isCurrentMonth ? '#3a3a4a' : isWeekend ? '#8b8bff' : '#fffffe'};
                align-self:flex-end;
                margin-bottom:2px;flex-shrink:0;
            `;
            cell.appendChild(dayNum);

            // Eventos del día
            const dayInstances = allInstances.filter(e => {
                return e.startDate <= dateStr && e.endDate >= dateStr;
            });

            const MAX_VISIBLE = 3;
            const visible  = dayInstances.slice(0, MAX_VISIBLE);
            const overflow = dayInstances.length - MAX_VISIBLE;

            visible.forEach(ev => {
                const chip = document.createElement('div');
                const isStart  = ev.startDate === dateStr;
                const isEnd    = ev.endDate === dateStr;
                const isMulti  = ev.startDate !== ev.endDate;

                chip.textContent = isStart || !isMulti ? ev.title : '';
                chip.style.cssText = `
                    font-size:0.7rem;font-weight:600;
                    padding:2px 5px;
                    border-radius:${isMulti ? (isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0') : '4px'};
                    background:${hexToRgba(ev.color, isMulti && !isStart ? 0.2 : 0.85)};
                    color:${isMulti && !isStart ? ev.color : '#fff'};
                    border-left:${isMulti && !isStart ? `2px solid ${ev.color}` : 'none'};
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                    cursor:pointer;
                    transition:filter 0.12s;
                    margin-bottom:2px;flex-shrink:0;
                    ${ev.priority === 'urgent' ? `box-shadow:0 0 0 1px ${ev.color};` : ''}
                `;

                chip.addEventListener('mouseenter', () => chip.style.filter = 'brightness(1.2)');
                chip.addEventListener('mouseleave', () => chip.style.filter = '');
                chip.addEventListener('click', e => {
                    e.stopPropagation();
                    this._showEventPopover(ev, chip);
                });

                // Drag start
                if (this._canEdit) {
                    chip.draggable = true;
                    chip.addEventListener('dragstart', de => {
                        this._dragState = { eventId: ev.id, originalDate: ev.startDate };
                        de.dataTransfer.effectAllowed = 'move';
                        chip.style.opacity = '0.5';
                    });
                    chip.addEventListener('dragend', () => { chip.style.opacity = ''; this._dragState = null; });
                }

                cell.appendChild(chip);
            });

            if (overflow > 0) {
                const more = document.createElement('div');
                more.textContent = `+${overflow} más`;
                more.style.cssText = `
                    font-size:0.68rem;color:#6366f1;cursor:pointer;
                    padding:1px 4px;font-weight:600;
                `;
                more.addEventListener('click', e => {
                    e.stopPropagation();
                    this._showDayModal(date, dayInstances);
                });
                cell.appendChild(more);
            }

            // Click en celda vacía = nuevo evento
            cell.addEventListener('click', () => {
                if (this._canEdit) this._form.openNew(dateStr);
            });

            // Drop target
            cell.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                cell.style.background = 'rgba(99,102,241,0.1)';
            });
            cell.addEventListener('dragleave', () => {
                cell.style.background = '';
            });
            cell.addEventListener('drop', e => {
                e.preventDefault();
                cell.style.background = '';
                if (!this._dragState) return;
                const { eventId, originalDate } = this._dragState;
                const diff = daysBetween(strToDate(originalDate), strToDate(dateStr));
                if (diff === 0) return;
                const ev = this._store.getById(eventId);
                if (!ev) return;
                const newStart = dateToStr(addDays(strToDate(ev.startDate), diff));
                const newEnd   = ev.endDate ? dateToStr(addDays(strToDate(ev.endDate), diff)) : newStart;
                this._store.update(eventId, { startDate: newStart, endDate: newEnd });
                Toast.show(`"${ev.title}" movido a ${formatDateShort(strToDate(newStart))}`, 'success');
                this._dragState = null;
            });

            cell.addEventListener('mouseenter', () => {
                if (!this._dragState) cell.style.background = isCurrentMonth ? 'rgba(99,102,241,0.04)' : 'rgba(0,0,0,0.18)';
            });
            cell.addEventListener('mouseleave', () => {
                cell.style.background = !isCurrentMonth ? 'rgba(0,0,0,0.15)' : isWeekend ? 'rgba(99,102,241,0.025)' : 'transparent';
            });

            grid.appendChild(cell);
        }

        table.appendChild(grid);
        main.appendChild(table);
    }

    // ─ VISTA SEMANAL ──────────────────────────────────────────────────────────

    _renderWeekView() {
        const main = document.getElementById('cal-main');
        if (!main) return;
        main.innerHTML = '';

        const offset = this._weekOffset || 0;
        const today  = new Date();
        const startOfWeek = addDays(today, (1 - (today.getDay() || 7) + offset * 7));

        const wrap = document.createElement('div');
        wrap.style.cssText = `display:flex;flex-direction:column;height:100%;`;

        // Header días
        const headerRow = document.createElement('div');
        headerRow.style.cssText = `display:grid;grid-template-columns:60px repeat(7,1fr);border-bottom:1px solid rgba(99,102,241,0.12);flex-shrink:0;`;

        const cornerCell = document.createElement('div');
        cornerCell.style.cssText = `border-right:1px solid rgba(99,102,241,0.12);`;
        headerRow.appendChild(cornerCell);

        for (let d = 0; d < 7; d++) {
            const date = addDays(startOfWeek, d);
            const isT  = isSameDay(date, new Date());
            const cell = document.createElement('div');
            cell.style.cssText = `
                padding:0.625rem;text-align:center;
                border-right:${d<6 ? '1px solid rgba(99,102,241,0.08)' : 'none'};
            `;
            cell.innerHTML = `
                <div style="font-size:0.68rem;font-weight:700;color:#4a4a5a;text-transform:uppercase;letter-spacing:0.06em;">${DAY_NAMES_SHORT[date.getDay()]}</div>
                <div style="
                    width:32px;height:32px;display:flex;align-items:center;justify-content:center;
                    border-radius:50%;margin:2px auto 0;
                    font-size:1rem;font-weight:800;
                    background:${isT ? '#6366f1' : 'transparent'};
                    color:${isT ? '#fff' : '#fffffe'};
                ">${date.getDate()}</div>
            `;
            headerRow.appendChild(cell);
        }
        wrap.appendChild(headerRow);

        // Time grid
        const scrollable = document.createElement('div');
        scrollable.style.cssText = `flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(99,102,241,0.2) transparent;`;

        const timeGrid = document.createElement('div');
        timeGrid.style.cssText = `display:grid;grid-template-columns:60px repeat(7,1fr);position:relative;`;

        // Horas (0-23)
        for (let h = 0; h < 24; h++) {
            const timeLabel = document.createElement('div');
            timeLabel.style.cssText = `
                height:56px;display:flex;align-items:flex-start;justify-content:flex-end;
                padding:2px 8px 0 0;font-size:0.68rem;color:#4a4a5a;font-weight:600;
                border-bottom:1px solid rgba(99,102,241,0.05);
                border-right:1px solid rgba(99,102,241,0.12);
            `;
            timeLabel.textContent = h === 0 ? '' : `${String(h).padStart(2,'0')}:00`;
            timeGrid.appendChild(timeLabel);

            for (let d = 0; d < 7; d++) {
                const date = addDays(startOfWeek, d);
                const cell = document.createElement('div');
                cell.style.cssText = `
                    height:56px;
                    border-bottom:1px solid rgba(99,102,241,0.05);
                    border-right:${d<6 ? '1px solid rgba(99,102,241,0.05)' : 'none'};
                    position:relative;cursor:${this._canEdit?'pointer':'default'};
                    transition:background 0.1s;
                `;
                cell.dataset.date = dateToStr(date);
                cell.dataset.hour  = h;

                cell.addEventListener('mouseenter', () => cell.style.background = 'rgba(99,102,241,0.04)');
                cell.addEventListener('mouseleave', () => cell.style.background = '');
                cell.addEventListener('click', () => {
                    if (this._canEdit) {
                        const t = `${String(h).padStart(2,'0')}:00`;
                        this._form.openNew(cell.dataset.date);
                    }
                });
                timeGrid.appendChild(cell);
            }
        }

        // Colocar eventos en el grid
        for (let d = 0; d < 7; d++) {
            const date = addDays(startOfWeek, d);
            const dateStr = dateToStr(date);
            const dayEvs  = this._store.getInstancesForDate(dateStr).filter(e => this._matchesFilter(e) && e.startTime);

            dayEvs.forEach(ev => {
                const [sh, sm] = ev.startTime.split(':').map(Number);
                const [eh, em] = (ev.endTime || `${sh+1}:00`).split(':').map(Number);
                const top    = (sh * 60 + sm) / 60 * 56;
                const height = Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * 56, 28);

                const slot = timeGrid.querySelector(`[data-date="${dateStr}"][data-hour="${sh}"]`);
                if (!slot) return;

                const chip = document.createElement('div');
                chip.style.cssText = `
                    position:absolute;left:2px;right:2px;
                    top:0;height:${height}px;
                    background:${hexToRgba(ev.color, 0.85)};
                    border-radius:6px;padding:2px 5px;
                    font-size:0.7rem;font-weight:600;color:#fff;
                    overflow:hidden;cursor:pointer;z-index:1;
                    transition:filter 0.12s;
                `;
                chip.textContent = ev.title;
                chip.addEventListener('mouseenter', () => chip.style.filter = 'brightness(1.2)');
                chip.addEventListener('mouseleave', () => chip.style.filter = '');
                chip.addEventListener('click', e => { e.stopPropagation(); this._showEventPopover(ev, chip); });
                slot.style.position = 'relative';
                slot.appendChild(chip);
            });
        }

        // Línea de hora actual
        const nowH = new Date().getHours();
        const nowM = new Date().getMinutes();
        const nowTop = (nowH * 60 + nowM) / 60 * 56;
        const nowLine = document.createElement('div');
        nowLine.style.cssText = `
            position:absolute;left:60px;right:0;
            top:${nowTop}px;height:2px;
            background:#ef4444;z-index:2;
            pointer-events:none;
        `;
        const nowDot = document.createElement('div');
        nowDot.style.cssText = `
            position:absolute;left:-4px;top:-4px;
            width:10px;height:10px;border-radius:50%;background:#ef4444;
        `;
        nowLine.appendChild(nowDot);
        timeGrid.style.position = 'relative';
        timeGrid.appendChild(nowLine);

        scrollable.appendChild(timeGrid);
        wrap.appendChild(scrollable);
        main.appendChild(wrap);

        // Scroll a hora actual
        setTimeout(() => { scrollable.scrollTop = Math.max(0, nowTop - 100); }, 50);
    }

    // ─ VISTA AGENDA ───────────────────────────────────────────────────────────

    _renderAgendaView() {
        const main = document.getElementById('cal-main');
        if (!main) return;
        main.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.style.cssText = `padding:1.5rem;max-width:740px;`;

        // Obtener próximos 90 días
        const from = dateToStr(new Date(this._year, this._month, 1));
        const to   = dateToStr(new Date(this._year, this._month+1, 0));
        const instances = this._store.getInstancesInRange(from, to)
            .filter(e => this._matchesFilter(e))
            .sort((a,b) => a.startDate.localeCompare(b.startDate) || a.startTime?.localeCompare(b.startTime||''));

        if (!instances.length) {
            const empty = document.createElement('div');
            empty.style.cssText = `
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                padding:4rem;color:#3a3a4a;gap:0.75rem;
            `;
            empty.innerHTML = `
                <div style="font-size:3rem;opacity:0.5;">◷</div>
                <div style="font-size:1rem;font-weight:600;">Sin eventos este mes</div>
                ${this._canEdit ? `<div style="font-size:0.85rem;">Haz clic en "+ Nuevo evento" para empezar</div>` : ''}
            `;
            wrap.appendChild(empty);
            main.appendChild(wrap);
            return;
        }

        // Agrupar por fecha
        const groups = {};
        instances.forEach(ev => {
            if (!groups[ev.startDate]) groups[ev.startDate] = [];
            groups[ev.startDate].push(ev);
        });

        const today = dateToStr(new Date());
        const yesterday = dateToStr(addDays(new Date(), -1));
        const tomorrow  = dateToStr(addDays(new Date(), 1));

        Object.entries(groups).forEach(([dateStr, evs]) => {
            const date = strToDate(dateStr);
            let dateLabel = formatDateLong(date);
            if (dateStr === today)     dateLabel = 'Hoy — ' + dateLabel;
            if (dateStr === tomorrow)  dateLabel = 'Mañana — ' + dateLabel;

            // Separador de fecha
            const sep = document.createElement('div');
            sep.style.cssText = `
                display:flex;align-items:center;gap:0.75rem;
                margin:1.5rem 0 0.75rem;
            `;
            sep.innerHTML = `
                <span style="font-size:0.8rem;font-weight:700;color:#6366f1;white-space:nowrap;">${dateLabel}</span>
                <span style="flex:1;height:1px;background:rgba(99,102,241,0.15);"></span>
            `;
            wrap.appendChild(sep);

            evs.forEach(ev => {
                const card = document.createElement('div');
                card.style.cssText = `
                    display:flex;gap:0.875rem;
                    padding:0.875rem 1rem;
                    border-radius:12px;
                    border:1px solid rgba(255,255,255,0.06);
                    background:rgba(255,255,255,0.02);
                    margin-bottom:0.5rem;
                    cursor:pointer;
                    transition:background 0.15s,border-color 0.15s;
                    position:relative;overflow:hidden;
                `;
                card.innerHTML = `
                    <div style="
                        width:4px;border-radius:999px;
                        background:${ev.color};flex-shrink:0;align-self:stretch;
                    "></div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                            <span style="font-size:0.95rem;font-weight:700;color:#fffffe;">${ev.title}</span>
                            ${ev.priority === 'urgent' ? `<span style="font-size:0.68rem;font-weight:700;color:#ef4444;background:rgba(239,68,68,0.1);padding:1px 6px;border-radius:4px;">URGENTE</span>` : ''}
                            ${ev.recurrence && ev.recurrence !== 'none' ? `<span style="font-size:0.68rem;color:#6366f1;background:rgba(99,102,241,0.1);padding:1px 6px;border-radius:4px;">↺ ${RECURRENCE_OPTIONS.find(r=>r.value===ev.recurrence)?.label||''}</span>` : ''}
                        </div>
                        <div style="display:flex;gap:1rem;margin-top:3px;flex-wrap:wrap;">
                            ${ev.startTime ? `<span style="font-size:0.78rem;color:#6b6b7a;">${formatTime(ev.startTime)}${ev.endTime ? ` – ${formatTime(ev.endTime)}` : ''}</span>` : ''}
                            ${ev.location  ? `<span style="font-size:0.78rem;color:#6b6b7a;">📍 ${ev.location}</span>` : ''}
                        </div>
                        ${ev.description ? `<div style="font-size:0.8rem;color:#5a5a6a;margin-top:4px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ev.description}</div>` : ''}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.35rem;flex-shrink:0;">
                        <span style="font-size:0.68rem;font-weight:700;color:${ev.color};background:${hexToRgba(ev.color,0.1)};padding:2px 8px;border-radius:6px;white-space:nowrap;">
                            ${EVENT_TYPES[ev.type]?.icon||'•'} ${EVENT_TYPES[ev.type]?.label||ev.type}
                        </span>
                    </div>
                `;
                card.addEventListener('mouseenter', () => {
                    card.style.background = 'rgba(255,255,255,0.04)';
                    card.style.borderColor = hexToRgba(ev.color, 0.3);
                });
                card.addEventListener('mouseleave', () => {
                    card.style.background = 'rgba(255,255,255,0.02)';
                    card.style.borderColor = 'rgba(255,255,255,0.06)';
                });
                card.addEventListener('click', () => this._showEventPopover(ev, card));
                wrap.appendChild(card);
            });
        });

        main.appendChild(wrap);
    }

    // ─ POPOVER DE EVENTO ──────────────────────────────────────────────────────

    _showEventPopover(evInstance, anchor) {
        // Buscar el evento master (original)
        const master = this._store.getById(evInstance.id);
        if (!master) return;

        const { close } = Modal.open({
            title: `${EVENT_TYPES[master.type]?.icon||'•'} ${master.title}`,
            size: 'sm',
            body: `
                <div style="display:flex;flex-direction:column;gap:0.625rem;">
                    ${master.startDate ? `
                    <div style="display:flex;gap:0.5rem;align-items:flex-start;">
                        <span style="color:#4a4a5a;font-size:0.875rem;flex-shrink:0;margin-top:2px;">📅</span>
                        <span style="color:#fffffe;font-size:0.875rem;">
                            ${formatDateLong(strToDate(master.startDate))}
                            ${master.endDate && master.endDate !== master.startDate ? ` — ${formatDateLong(strToDate(master.endDate))}` : ''}
                        </span>
                    </div>` : ''}
                    ${master.startTime ? `
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <span style="color:#4a4a5a;font-size:0.875rem;">⏰</span>
                        <span style="color:#fffffe;font-size:0.875rem;">${formatTime(master.startTime)}${master.endTime ? ` – ${formatTime(master.endTime)}` : ''}</span>
                    </div>` : ''}
                    ${master.location ? `
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <span style="color:#4a4a5a;font-size:0.875rem;">📍</span>
                        <span style="color:#fffffe;font-size:0.875rem;">${master.location}</span>
                    </div>` : ''}
                    ${master.recurrence && master.recurrence !== 'none' ? `
                    <div style="display:flex;gap:0.5rem;align-items:center;">
                        <span style="color:#4a4a5a;font-size:0.875rem;">↺</span>
                        <span style="color:#6366f1;font-size:0.875rem;">${RECURRENCE_OPTIONS.find(r=>r.value===master.recurrence)?.label||''}</span>
                    </div>` : ''}
                    ${master.description ? `
                    <div style="margin-top:0.25rem;padding:0.625rem;background:rgba(255,255,255,0.03);border-radius:8px;font-size:0.85rem;color:#a8a8b3;line-height:1.5;">${master.description}</div>
                    ` : ''}
                </div>
            `,
            actions: [
                { label: 'Cerrar', variant: 'cancel' },
                ...(this._canEdit ? [
                    { label: 'Editar', variant: 'primary', onClick: () => { close(); this._form.openEdit(master.id); }},
                    { label: 'Eliminar', variant: 'danger', onClick: () => { close(); this._form.openDelete(master.id); }},
                ] : [])
            ]
        });
    }

    // ─ MODAL: TODOS LOS EVENTOS DE UN DÍA ────────────────────────────────────

    _showDayModal(date, instances) {
        const filtered = instances.filter(e => this._matchesFilter(e));
        const container = document.createElement('div');
        container.style.cssText = `display:flex;flex-direction:column;gap:0.5rem;`;

        filtered.forEach(ev => {
            const row = document.createElement('div');
            row.style.cssText = `
                display:flex;align-items:center;gap:0.625rem;
                padding:0.6rem 0.75rem;border-radius:10px;
                background:${hexToRgba(ev.color, 0.08)};
                border-left:3px solid ${ev.color};
                cursor:pointer;transition:background 0.12s;
            `;
            row.innerHTML = `
                <span style="font-size:0.875rem;font-weight:600;color:#fffffe;flex:1;">${ev.title}</span>
                ${ev.startTime ? `<span style="font-size:0.75rem;color:#6b6b7a;">${formatTime(ev.startTime)}</span>` : ''}
            `;
            row.addEventListener('mouseenter', () => row.style.background = hexToRgba(ev.color, 0.15));
            row.addEventListener('mouseleave', () => row.style.background = hexToRgba(ev.color, 0.08));
            row.addEventListener('click', () => { Modal.closeAll(); this._showEventPopover(ev, row); });
            container.appendChild(row);
        });

        Modal.open({
            title: `Eventos — ${formatDateLong(date)}`,
            body: container,
            actions: [
                { label: 'Cerrar', variant: 'cancel' },
                ...(this._canEdit ? [{ label: '+ Nuevo evento este día', variant: 'primary', onClick: () => { Modal.closeAll(); this._form.openNew(dateToStr(date)); }}] : [])
            ]
        });
    }

    // ─ IMPRESIÓN ──────────────────────────────────────────────────────────────

    print() {
        const win = window.open('', '_blank');
        if (!win) { Toast.show('Habilita las ventanas emergentes para imprimir', 'warning'); return; }

        const instances = this._store.getInstancesForMonth(this._year, this._month)
            .filter(e => this._matchesFilter(e));

        const firstDay   = new Date(this._year, this._month, 1);
        const daysInMonth= new Date(this._year, this._month+1, 0).getDate();
        const startOffset= (firstDay.getDay() + 6) % 7;

        let rows = '';
        let day = 0;
        for (let w = 0; w < 6; w++) {
            let row = '<tr>';
            for (let d = 0; d < 7; d++) {
                const ci = w * 7 + d;
                if (ci < startOffset || ci >= startOffset + daysInMonth) {
                    row += '<td></td>';
                    continue;
                }
                day++;
                const date = new Date(this._year, this._month, day);
                const dateStr = dateToStr(date);
                const evs = instances.filter(e => e.startDate <= dateStr && e.endDate >= dateStr);
                row += `<td style="${isSameDay(date, new Date()) ? 'background:#e8e8ff;' : ''}">
                    <div class="day-num">${day}</div>
                    ${evs.map(e => `<div class="ev" style="background:${e.color};">${e.title}</div>`).join('')}
                </td>`;
            }
            row += '</tr>';
            rows += row;
            if (day >= daysInMonth) break;
        }

        win.document.write(`
            <!DOCTYPE html><html><head><title>Calendario ${MONTH_NAMES[this._month]} ${this._year}</title>
            <style>
                body{font-family:Arial,sans-serif;margin:20px;}
                h1{text-align:center;font-size:20px;margin-bottom:16px;}
                table{width:100%;border-collapse:collapse;}
                th{background:#f0f0f0;padding:8px;text-align:center;border:1px solid #ddd;font-size:12px;}
                td{border:1px solid #ddd;padding:6px;vertical-align:top;height:90px;font-size:11px;}
                .day-num{font-weight:bold;margin-bottom:4px;}
                .ev{color:#fff;padding:2px 4px;border-radius:3px;margin:1px 0;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            </style></head><body>
            <h1>${MONTH_NAMES[this._month]} ${this._year}</h1>
            <table><thead><tr><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr></thead>
            <tbody>${rows}</tbody></table>
            <script>window.onload=()=>window.print();<\/script>
            </body></html>
        `);
        win.document.close();
    }

    // ─ RESET ──────────────────────────────────────────────────────────────────

    confirmReset() {
        Modal.open({
            title: 'Reiniciar Calendario',
            body: `<p style="color:#a8a8b3;">Esta acción eliminará <strong style="color:#ef4444;">todos los eventos</strong> permanentemente. No se puede deshacer después de confirmado.</p>`,
            actions: [
                { label: 'Cancelar', variant: 'cancel' },
                { label: 'Reiniciar todo', variant: 'danger', onClick: () => {
                    this._store.clear();
                    Toast.show('Calendario reiniciado', 'info');
                }}
            ]
        });
    }

    // ─ BÚSQUEDA RÁPIDA ────────────────────────────────────────────────────────

    openSearch() {
        const container = document.createElement('div');
        container.style.cssText = `display:flex;flex-direction:column;gap:1rem;`;

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Buscar eventos...';
        input.style.cssText = `
            width:100%;background:rgba(255,255,255,0.05);
            border:1px solid rgba(99,102,241,0.3);border-radius:10px;
            color:#fffffe;font-family:'DM Sans',sans-serif;font-size:0.95rem;
            padding:0.75rem 1rem;outline:none;box-sizing:border-box;color-scheme:dark;
        `;
        container.appendChild(input);

        const results = document.createElement('div');
        results.style.cssText = `display:flex;flex-direction:column;gap:0.4rem;max-height:320px;overflow-y:auto;`;
        container.appendChild(results);

        const { close } = Modal.open({ title: '🔍 Buscar Eventos', body: container, size: 'md', actions: [{ label: 'Cerrar', variant: 'cancel' }] });

        const doSearch = q => {
            results.innerHTML = '';
            if (!q.trim()) return;
            const hits = this._store.getAll()
                .filter(e => e.title.toLowerCase().includes(q.toLowerCase()) || e.description?.toLowerCase().includes(q.toLowerCase()) || e.location?.toLowerCase().includes(q.toLowerCase()))
                .slice(0, 20);

            if (!hits.length) {
                results.innerHTML = `<div style="color:#4a4a5a;text-align:center;padding:1rem;font-size:0.875rem;">Sin resultados para "${q}"</div>`;
                return;
            }
            hits.forEach(ev => {
                const row = document.createElement('div');
                row.style.cssText = `
                    padding:0.6rem 0.75rem;border-radius:8px;
                    border-left:3px solid ${ev.color};
                    background:${hexToRgba(ev.color, 0.07)};
                    cursor:pointer;transition:background 0.12s;
                `;
                row.innerHTML = `
                    <div style="font-size:0.875rem;font-weight:600;color:#fffffe;">${ev.title}</div>
                    <div style="font-size:0.75rem;color:#6b6b7a;margin-top:2px;">
                        ${formatDateShort(strToDate(ev.startDate))}
                        ${ev.startTime ? `· ${formatTime(ev.startTime)}` : ''}
                        ${ev.location ? `· 📍 ${ev.location}` : ''}
                    </div>
                `;
                row.addEventListener('mouseenter', () => row.style.background = hexToRgba(ev.color, 0.14));
                row.addEventListener('mouseleave', () => row.style.background = hexToRgba(ev.color, 0.07));
                row.addEventListener('click', () => {
                    close();
                    if (this._canEdit) this._form.openEdit(ev.id);
                    else this._showEventPopover(ev, document.body);
                });
                results.appendChild(row);
            });
        };

        input.addEventListener('input', e => doSearch(e.target.value));
        setTimeout(() => input.focus(), 100);
    }
}

// ─── CONTROLADOR PRINCIPAL ───────────────────────────────────────────────────

class CalendarManager {
    constructor() {
        this._store    = new EventStore();
        this._settings = new Settings();
        this._canEdit  = false;
        this._renderer = null;
        this._form     = null;
        this._unloaded = false;
    }

    async init() {
        try {
            await loadCurrentPermissions();

            if (!canView('calendario')) {
                showNoPermissionAlert('calendario');
                console.warn('Cal: sin permisos de vista');
                return;
            }

            this._canEdit = canAction('calendario');
            this._form = new EventForm(this._store, () => this._renderer?.refresh());
            this._renderer = new CalendarRenderer(this._store, this._settings, this._form, this._canEdit);

            const section = document.getElementById('calendario');
            if (!section) { console.warn('Cal: sección #calendario no encontrada'); return; }

            // Contenedor del calendario
            let container = section.querySelector('.cal-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'cal-container';
                container.style.cssText = `
                    width:100%;height:100%;
                    background:#0f0e17;
                    border-radius:20px;
                    overflow:hidden;
                    display:flex;flex-direction:column;
                    border:1px solid rgba(99,102,241,0.15);
                    min-height:680px;
                `;
                section.appendChild(container);
            }

            this._renderer.mount(container);
            this._setupKeyboard();
            this._setupExternalButton();

            console.debug('Cal: inicializado correctamente');
        } catch (e) {
            console.error('Cal: error de inicialización', e);
        }
    }

    _setupKeyboard() {
        const handler = e => {
            if (e.target.matches('input,textarea,select')) return;
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); if (this._store.undo()) Toast.show('Deshecho', 'undo'); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); if (this._store.redo()) Toast.show('Rehecho', 'undo'); }
            if (e.key === 'ArrowLeft')       this._renderer?._navigate(-1);
            if (e.key === 'ArrowRight')      this._renderer?._navigate(1);
            if (e.key === 'Home' || e.key==='t') this._renderer?._goToday();
            if ((e.key === 'f' || e.key === '/') && e.ctrlKey) { e.preventDefault(); this._renderer?.openSearch(); }
            if (e.key === 'n' && this._canEdit) this._form?.openNew();
            if (e.key === 'p' && e.ctrlKey) { e.preventDefault(); this._renderer?.print(); }
        };
        document.addEventListener('keydown', handler);
        this._kbHandler = handler;
    }

    _setupExternalButton() {
        // Botones externos que llamen acciones del calendario
        document.getElementById('printCalendar')  ?.addEventListener('click', () => this._renderer?.print());
        document.getElementById('resetCalendar')  ?.addEventListener('click', () => {
            if (!this._canEdit) { showNoPermissionAlert('calendario'); return; }
            this._renderer?.confirmReset();
        });
        document.getElementById('addEvent')       ?.addEventListener('click', () => {
            if (!this._canEdit) { showNoPermissionAlert('calendario'); return; }
            this._form?.openNew();
        });
        document.getElementById('searchCalendar') ?.addEventListener('click', () => this._renderer?.openSearch());
    }

    destroy() {
        if (this._unloaded) return;
        this._unloaded = true;
        if (this._kbHandler) document.removeEventListener('keydown', this._kbHandler);
        Modal.closeAll();
    }

    // — API pública para debug —
    debug() {
        console.group('📅 CalendarManager Debug');
        console.log('Eventos master:', this._store.getAll().length);
        console.log('Puede editar:', this._canEdit);
        console.log('Vista:', this._renderer?._view);
        console.log('Mes/Año:', `${this._renderer?._month + 1}/${this._renderer?._year}`);
        console.log('Estadísticas:', this._store.getStats());
        console.groupEnd();
    }
}

// ─── BOOTSTRAP ───────────────────────────────────────────────────────────────

let _managerInstance = null;

function _tryInit() {
    const section = document.getElementById('calendario');
    if (!section) return;

    if (section.classList.contains('active') && !_managerInstance) {
        _managerInstance = new CalendarManager();
        _managerInstance.init().then(() => {
            window.calendarManager = _managerInstance;
            window.debugCalendar   = () => _managerInstance?.debug();
            console.debug('📅 Calendario listo. Usa debugCalendar() para inspección.');
        });
        return;
    }

    if (!section.classList.contains('active') && _managerInstance) {
        _managerInstance.destroy();
        _managerInstance = null;
        window.calendarManager = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    _tryInit();

    // Observar activación de sección
    const section = document.getElementById('calendario');
    if (section) {
        const obs = new MutationObserver(_tryInit);
        obs.observe(section, { attributes: true, attributeFilter: ['class'] });
    }
});

// Reaccionar a cambios de visibilidad de pestaña
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && _managerInstance) {
        _managerInstance._renderer?.refresh();
    }
});

window.addEventListener('unhandledrejection', e => {
    console.error('Cal: promesa rechazada no manejada:', e.reason);
});