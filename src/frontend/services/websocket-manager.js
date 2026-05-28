// =============================================================================
// src/frontend/services/websocket-manager.js
// GESTOR DE WEBSOCKETS — IMPLEMENTACIÓN PRODUCTION-GRADE
//
// Arquitectura:
//  • Máquina de estados para el ciclo de vida de la conexión
//  • Reconexión automática con backoff exponencial + jitter
//  • Supresión de eco propio (no procesar eventos que nosotros emitimos)
//  • Deduplicación de eventos (ventana de 300ms)
//  • Actualizaciones de estado LOCAL sin llamadas API innecesarias
//  • Batching/debounce de re-renders para evitar tormentas de renders
//  • Cola de eventos salientes mientras está desconectado
//  • Indicador visual de estado de conexión
// =============================================================================

// ─── Estados de conexión ─────────────────────────────────────────────────────
const WS_STATES = Object.freeze({
    DISCONNECTED : 'DISCONNECTED',
    CONNECTING   : 'CONNECTING',
    CONNECTED    : 'CONNECTED',
    RECONNECTING : 'RECONNECTING',
    FAILED       : 'FAILED',
});

// ─── Nombres de eventos ───────────────────────────────────────────────────────
const WS_EVENTS = Object.freeze({
    // Estado interno
    STATE_CHANGE        : 'ws:state-change',

    // Categorías
    CATEGORY_CREATED    : 'category:created',
    CATEGORY_UPDATED    : 'category:updated',
    CATEGORY_DELETED    : 'category:deleted',

    // Documentos
    DOCUMENT_CREATED    : 'document:created',
    DOCUMENT_UPDATED    : 'document:updated',
    DOCUMENT_DELETED    : 'document:deleted',

    // Personas
    PERSON_CREATED      : 'person:created',
    PERSON_UPDATED      : 'person:updated',
    PERSON_DELETED      : 'person:deleted',

    // Departamentos
    DEPARTMENT_CREATED  : 'department:created',
    DEPARTMENT_UPDATED  : 'department:updated',
    DEPARTMENT_DELETED  : 'department:deleted',

    // Tareas
    TASK_CREATED        : 'task:created',
    TASK_UPDATED        : 'task:updated',
    TASK_DELETED        : 'task:deleted',

    // Notificaciones
    NOTIFICATION_NEW    : 'notification:new',
});

// ─── Mapeo entidad → clave en appState ───────────────────────────────────────
const ENTITY_STATE_MAP = Object.freeze({
    category   : 'categories',
    document   : 'documents',
    person     : 'persons',
    department : 'departments',
    task       : 'tasks',
});

// =============================================================================
// CLASE PRINCIPAL
// =============================================================================
class WebSocketManager {
    constructor() {
        // ── Estado de conexión ─────────────────────────────────────────────
        this.socket       = null;
        this.state        = WS_STATES.DISCONNECTED;
        this._connectPromise = null;   // Garantiza una sola promesa de conexión

        // ── Reconexión ─────────────────────────────────────────────────────
        this._reconnectAttempts    = 0;
        this._maxReconnectAttempts = 12;          // Intentos antes de FAILED
        this._baseDelay            = 1_000;       // ms
        this._maxDelay             = 30_000;      // ms
        this._reconnectTimer       = null;

        // ── Listeners personalizados ───────────────────────────────────────
        // eventName → Set<callback>
        this._listeners = new Map();

        // ── Cola de eventos salientes (mientras desconectado) ──────────────
        this._outboundQueue  = [];
        this._MAX_QUEUE_SIZE = 50;
        this._MAX_EVENT_AGE  = 30_000;  // ms — descartar eventos muy viejos

        // ── Supresión de eco propio ────────────────────────────────────────
        // Cuando nosotros emitimos un evento, el servidor lo re-emite a OTROS
        // (socket.to(room)), por lo que NO nos llega a nosotros mismos.
        // Sin embargo, si hay varias pestañas o el servidor cambia, el _eid
        // actúa como defensa en profundidad.
        this._ownEventIds   = new Set();
        this._EID_TTL       = 8_000;    // ms — tiempo de vida del ID propio

        // ── Deduplicación de eventos entrantes ────────────────────────────
        this._seenEvents         = new Map();   // clave → timestamp
        this._DEDUPE_WINDOW      = 350;         // ms
        this._dedupeCleanupTimer = null;

        // ── Batching de actualizaciones de UI ─────────────────────────────
        // entityType → [ { action, data } ]
        this._pendingBatch    = new Map();
        this._batchTimer      = null;
        this._BATCH_DELAY     = 80;     // ms — coalescencia de eventos

        // ── Timers de actualización diferida ──────────────────────────────
        this._dashboardTimer  = null;
        this._catCountTimer   = null;

        // ── Socket.IO ─────────────────────────────────────────────────────
        this._socketIOLoaded  = (typeof io !== 'undefined');

        // ── Debug ─────────────────────────────────────────────────────────
        this._debug = localStorage.getItem('ws_debug') === 'true';
    }

    // =========================================================================
    // API PÚBLICA
    // =========================================================================

    /**
     * Conecta al servidor WebSocket.
     * Llamar UNA vez desde app.js al iniciar.
     * @returns {Promise<boolean>}
     */
    connect() {
        // Reutilizar promesa si ya se está conectando / conectado
        if (this._connectPromise) return this._connectPromise;

        this._connectPromise = new Promise(resolve => {
            this._transitionTo(WS_STATES.CONNECTING);

            const doConnect = () => {
                if (typeof io === 'undefined') {
                    this._loadSocketIO()
                        .then(doConnect)
                        .catch(() => {
                            this._log('error', 'No se pudo cargar Socket.IO');
                            this._transitionTo(WS_STATES.FAILED);
                            resolve(false);
                        });
                    return;
                }
                this._initSocket(resolve);
            };

            doConnect();
        });

        return this._connectPromise;
    }

    /**
     * Emite un evento al servidor.
     * Si está desconectado, encola el evento.
     *
     * @param {string} eventName  Ej: 'category:created'
     * @param {object} data       Payload del evento
     */
    emit(eventName, data = {}) {
        const eid     = this._genEID();
        const payload = { ...data, _eid: eid };

        // Registrar como evento propio para supresión de eco
        this._ownEventIds.add(eid);
        setTimeout(() => this._ownEventIds.delete(eid), this._EID_TTL);

        if (this.state === WS_STATES.CONNECTED && this.socket?.connected) {
            this._log('emit', `→ ${eventName}`);
            this.socket.emit(eventName, payload);
        } else {
            this._log('queue', `Encolado: ${eventName}`);
            this._enqueue(eventName, payload);
        }
    }

    /**
     * Suscribirse a un evento WebSocket.
     * @param {string}   eventName
     * @param {Function} callback
     * @returns {Function} Función para desuscribirse
     */
    on(eventName, callback) {
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }
        this._listeners.get(eventName).add(callback);
        return () => this.off(eventName, callback);
    }

    /**
     * Suscribirse una única vez.
     */
    once(eventName, callback) {
        const unsub = this.on(eventName, data => {
            unsub();
            callback(data);
        });
        return unsub;
    }

    /**
     * Desuscribirse de un evento.
     */
    off(eventName, callback) {
        this._listeners.get(eventName)?.delete(callback);
    }

    /** @returns {boolean} */
    get isConnected() {
        return this.state === WS_STATES.CONNECTED && !!this.socket?.connected;
    }

    /**
     * Desconecta limpiamente.
     */
    disconnect() {
        this._cleanup();
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this._transitionTo(WS_STATES.DISCONNECTED);
        this._connectPromise = null;
    }

    /** Activa/desactiva logs de debug. */
    setDebug(enabled) {
        this._debug = enabled;
        if (enabled) localStorage.setItem('ws_debug', 'true');
        else         localStorage.removeItem('ws_debug');
        this._log('info', `Debug ${enabled ? 'activado' : 'desactivado'}`);
    }

    // =========================================================================
    // PRIVADO — CICLO DE VIDA DE CONEXIÓN
    // =========================================================================

    /**
     * Crea y configura el socket Socket.IO.
     * @param {Function} connectResolve  Resuelve la promesa externa de connect()
     */
    _initSocket(connectResolve) {
        const token     = localStorage.getItem('token') ?? '';
        const serverUrl = this._getServerUrl();
        let   resolved  = false;

        const resolve = (val) => {
            if (resolved) return;
            resolved = true;
            connectResolve(val);
        };

        this._log('info', `Conectando a ${serverUrl}`);

        this.socket = io(serverUrl, {
            auth            : { token },
            query           : { token },
            reconnection    : false,      // Reconexión manual con backoff
            timeout         : 12_000,
            transports      : ['websocket', 'polling'],
            forceNew        : false,
        });

        // ── Conectado ──────────────────────────────────────────────────────
        this.socket.on('connect', () => {
            this._reconnectAttempts = 0;
            this._transitionTo(WS_STATES.CONNECTED);
            this._startDedupeCleanup();
            this._drainQueue();
            this._log('info', `✅ Conectado [${this.socket.id}]`);
            resolve(true);
        });

        // ── Desconectado ───────────────────────────────────────────────────
        this.socket.on('disconnect', (reason) => {
            this._log('warn', `Desconectado: ${reason}`);
            this._stopDedupeCleanup();

            if (reason === 'io server disconnect' ||
                reason === 'io client disconnect') {
                // Desconexión intencional — no reconectar
                this._transitionTo(WS_STATES.DISCONNECTED);
                this._connectPromise = null;
            } else {
                // Desconexión inesperada — reconectar
                this._transitionTo(WS_STATES.RECONNECTING);
                this._scheduleReconnect();
            }
        });

        // ── Error de conexión ──────────────────────────────────────────────
        this.socket.on('connect_error', (err) => {
            this._log('warn', `Error de conexión: ${err.message}`);
            if (!resolved) {
                this._transitionTo(WS_STATES.RECONNECTING);
                this._scheduleReconnect();
                resolve(false);
            }
        });

        // ── Registrar todos los listeners de entidades ─────────────────────
        this._registerEntityListeners();
    }

    /**
     * Programa un intento de reconexión con backoff exponencial + jitter.
     */
    _scheduleReconnect() {
        if (this._reconnectTimer) clearTimeout(this._reconnectTimer);

        if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            this._transitionTo(WS_STATES.FAILED);
            this._log('error', `Máximo de reconexiones alcanzado (${this._maxReconnectAttempts})`);
            this._showConnectionToast('error', 'Sin conexión en tiempo real. Recarga la página.');
            return;
        }

        const base   = Math.min(this._baseDelay * (2 ** this._reconnectAttempts), this._maxDelay);
        const jitter = base * 0.25 * Math.random();
        const delay  = Math.floor(base + jitter);

        this._reconnectAttempts++;
        this._log('info', `Reconectando en ${delay}ms (intento ${this._reconnectAttempts})`);

        this._reconnectTimer = setTimeout(() => {
            if (this.state !== WS_STATES.RECONNECTING) return;

            // Destruir socket anterior limpiamente
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
                this.socket = null;
            }

            this._connectPromise = null;
            this.connect();
        }, delay);
    }

    /**
     * Transición de estado con log y dispatch de evento global.
     */
    _transitionTo(newState) {
        if (this.state === newState) return;
        const prev = this.state;
        this.state = newState;
        this._log('state', `${prev} → ${newState}`);

        // Evento global para que los componentes puedan reaccionar
        window.dispatchEvent(new CustomEvent(WS_EVENTS.STATE_CHANGE, {
            detail: { state: newState, previous: prev }
        }));

        this._updateStatusIndicators(newState);
    }

    // =========================================================================
    // PRIVADO — MANEJO DE EVENTOS ENTRANTES
    // =========================================================================

    /**
     * Registra un listener Socket.IO por cada combinación entidad+acción.
     */
    _registerEntityListeners() {
        if (!this.socket) return;

        const entities = Object.keys(ENTITY_STATE_MAP);   // category, document, …
        const actions  = ['created', 'updated', 'deleted'];

        entities.forEach(entity => {
            actions.forEach(action => {
                const eventName = `${entity}:${action}`;
                this.socket.on(eventName, data =>
                    this._handleIncoming(eventName, data)
                );
            });
        });

        // Notificaciones del sistema
        this.socket.on(WS_EVENTS.NOTIFICATION_NEW, data =>
            this._handleIncoming(WS_EVENTS.NOTIFICATION_NEW, data)
        );
    }

    /**
     * Punto de entrada para TODOS los eventos entrantes.
     * Filtra ecos propios, duplicados y luego encola en el batch de UI.
     */
    _handleIncoming(eventName, data) {
        // 1. Suprimir eco propio
        if (data?._eid && this._ownEventIds.has(data._eid)) {
            this._log('skip', `Eco propio suprimido: ${eventName}`);
            return;
        }

        // 2. Deduplicar
        const key = this._dedupeKey(eventName, data);
        if (this._isDuplicate(key)) {
            this._log('skip', `Duplicado ignorado: ${eventName}`);
            return;
        }
        this._markSeen(key);

        this._log('recv', `← ${eventName}`, data);

        // 3. Notificar listeners personalizados (síncronos)
        this._notifyListeners(eventName, data);

        // 4. Encolar actualización de estado + UI (batched)
        const [entityType, action] = eventName.split(':');
        if (entityType && action) {
            this._enqueueBatch(entityType, action, data);
        }
    }

    // =========================================================================
    // PRIVADO — BATCHING DE ACTUALIZACIONES DE UI
    // =========================================================================

    _enqueueBatch(entityType, action, data) {
        if (!this._pendingBatch.has(entityType)) {
            this._pendingBatch.set(entityType, []);
        }
        this._pendingBatch.get(entityType).push({ action, data });

        if (this._batchTimer) clearTimeout(this._batchTimer);
        this._batchTimer = setTimeout(() => this._flushBatch(), this._BATCH_DELAY);
    }

    _flushBatch() {
        if (this._pendingBatch.size === 0) return;

        const batch = new Map(this._pendingBatch);
        this._pendingBatch.clear();
        this._batchTimer = null;

        this._log('batch', `Flush: ${batch.size} tipo(s) de entidad`);

        batch.forEach((updates, entityType) => {
            // Aplicar cada actualización al estado local
            updates.forEach(({ action, data }) =>
                this._applyLocalStateUpdate(entityType, action, data)
            );

            // Un solo re-render por tipo de entidad
            this._triggerRender(entityType, updates);
        });
    }

    // =========================================================================
    // PRIVADO — ACTUALIZACIÓN DE ESTADO LOCAL (sin llamadas API)
    // =========================================================================

    /**
     * Actualiza window.appState directamente, sin API calls.
     * Esto es rápido y evita race conditions con el servidor.
     */
    _applyLocalStateUpdate(entityType, action, data) {
        if (!window.appState) return;

        const stateKey   = ENTITY_STATE_MAP[entityType];
        if (!stateKey) return;

        // Asegurar que el array existe
        if (!Array.isArray(window.appState[stateKey])) return;

        switch (action) {

            case 'created': {
                const entity = data[entityType] ?? data.entity;
                if (!entity?._id) return;

                const alreadyExists = window.appState[stateKey]
                    .some(item => item._id === entity._id);

                if (!alreadyExists) {
                    // Documentos y tareas: insertar al inicio (más reciente primero)
                    if (stateKey === 'documents' || stateKey === 'tasks') {
                        window.appState[stateKey].unshift(entity);
                    } else {
                        window.appState[stateKey].push(entity);
                    }
                    this._log('state', `+ ${entityType} [${entity._id}]`);
                }
                break;
            }

            case 'updated': {
                const entity   = data[entityType] ?? data.entity;
                const entityId = entity?._id ?? data[`${entityType}Id`] ?? data.entityId;
                if (!entityId) return;

                const idx = window.appState[stateKey]
                    .findIndex(item => item._id === entityId);

                if (idx !== -1 && entity) {
                    // Merge: conservar campos locales que el evento no trae
                    window.appState[stateKey][idx] = {
                        ...window.appState[stateKey][idx],
                        ...entity,
                    };
                    this._log('state', `~ ${entityType} [${entityId}]`);
                }
                break;
            }

            case 'deleted': {
                const entityId = data[`${entityType}Id`]
                    ?? data.entityId
                    ?? data._id;
                if (!entityId) return;

                const before = window.appState[stateKey].length;
                window.appState[stateKey] = window.appState[stateKey]
                    .filter(item => item._id !== entityId);

                if (window.appState[stateKey].length < before) {
                    this._log('state', `- ${entityType} [${entityId}]`);
                }
                break;
            }
        }
    }

    // =========================================================================
    // PRIVADO — DISPARADORES DE RE-RENDER POR ENTIDAD
    // =========================================================================

    _triggerRender(entityType, updates) {
        const hasDelete = updates.some(u => u.action === 'deleted');

        // Evento global para que cualquier componente pueda escuchar
        window.dispatchEvent(new CustomEvent(`ws:${entityType}-changed`, {
            detail: { updates, timestamp: Date.now() }
        }));

        switch (entityType) {
            case 'category':
                this._renderCategories(hasDelete);
                break;

            case 'document':
                this._renderDocuments();
                // Documentos afectan contadores de categorías — actualizar con delay
                this._deferCategoryCountRefresh();
                break;

            case 'person':
                this._renderPersons();
                break;

            case 'department':
                this._renderDepartments();
                break;

            case 'task':
                this._renderTasks();
                break;
        }
    }

    // ── Categorías ────────────────────────────────────────────────────────────
    _renderCategories(forceApiReload = false) {
        if (forceApiReload) {
            // Eliminación: necesitamos documentCount fresco desde el servidor
            this._safeCall('loadCategories');
            return;
        }
        // Crear/actualizar: re-render desde estado local (sin API call)
        this._safeCall('renderCategories');
        this._safeCall('populateCategorySelects');
        this._safeCall('refreshCategoryTree');
        this._safeCall('renderCategoryGrid');
    }

    /**
     * Refresca contadores de categorías 2s después del último cambio en documentos.
     * Agrupa múltiples cambios para hacer UNA sola llamada API.
     */
    _deferCategoryCountRefresh() {
        if (this._catCountTimer) clearTimeout(this._catCountTimer);
        this._catCountTimer = setTimeout(() => {
            this._safeCall('loadCategories');
        }, 2_000);
    }

    // ── Documentos ────────────────────────────────────────────────────────────
    _renderDocuments() {
        this._safeCall('renderDocumentsTable');
        this._deferDashboardUpdate();
    }

    // ── Personas ─────────────────────────────────────────────────────────────
    _renderPersons() {
        this._safeCall('renderPersonsTable');
        this._safeCall('populatePersonSelect');
    }

    // ── Departamentos ─────────────────────────────────────────────────────────
    _renderDepartments() {
        this._safeCall('renderDepartments');
        this._safeCall('populateDepartmentSelects');
    }

    // ── Tareas ────────────────────────────────────────────────────────────────
    _renderTasks() {
        if (window.taskManager?.renderTasks) {
            try { window.taskManager.renderTasks(); } catch (e) { /* silencioso */ }
        } else if (window.taskManager?.loadTasks) {
            try { window.taskManager.loadTasks(); } catch (e) { /* silencioso */ }
        }
        this._deferDashboardUpdate();
    }

    // ── Dashboard diferido ────────────────────────────────────────────────────
    _deferDashboardUpdate() {
        if (this._dashboardTimer) clearTimeout(this._dashboardTimer);
        this._dashboardTimer = setTimeout(() => {
            const loader = window.dashboard?.loadDashboardData ?? window.loadDashboardData;
            if (typeof loader === 'function') {
                loader(window.appState).catch(() => {});
            }
        }, 600);
    }

    // ── Helper: llamar función global de forma segura ─────────────────────────
    _safeCall(fnName, ...args) {
        if (typeof window[fnName] === 'function') {
            try { window[fnName](...args); }
            catch (e) { this._log('warn', `Error en ${fnName}:`, e.message); }
        }
    }

    // =========================================================================
    // PRIVADO — DEDUPLICACIÓN
    // =========================================================================

    _dedupeKey(eventName, data) {
        const [entityType, action = ''] = eventName.split(':');
        const id = data?.[`${entityType}Id`]
            ?? data?.[entityType]?._id
            ?? data?._id
            ?? data?._eid
            ?? '';
        return `${eventName}:${id}`;
    }

    _isDuplicate(key) {
        const ts = this._seenEvents.get(key);
        return ts !== undefined && (Date.now() - ts) < this._DEDUPE_WINDOW;
    }

    _markSeen(key) {
        this._seenEvents.set(key, Date.now());
    }

    _startDedupeCleanup() {
        this._dedupeCleanupTimer = setInterval(() => {
            const cutoff = Date.now() - this._DEDUPE_WINDOW * 20;
            for (const [k, ts] of this._seenEvents.entries()) {
                if (ts < cutoff) this._seenEvents.delete(k);
            }
        }, 5_000);
    }

    _stopDedupeCleanup() {
        if (this._dedupeCleanupTimer) {
            clearInterval(this._dedupeCleanupTimer);
            this._dedupeCleanupTimer = null;
        }
    }

    // =========================================================================
    // PRIVADO — COLA DE EVENTOS SALIENTES
    // =========================================================================

    _enqueue(eventName, data) {
        if (this._outboundQueue.length >= this._MAX_QUEUE_SIZE) {
            this._outboundQueue.shift(); // Descartar el más antiguo
        }
        this._outboundQueue.push({ eventName, data, ts: Date.now() });
    }

    _drainQueue() {
        if (this._outboundQueue.length === 0) return;

        this._log('info', `Vaciando cola: ${this._outboundQueue.length} evento(s)`);

        const cutoff = Date.now() - this._MAX_EVENT_AGE;
        const fresh  = this._outboundQueue.filter(e => e.ts > cutoff);
        this._outboundQueue = [];

        fresh.forEach(({ eventName, data }) => {
            if (this.socket?.connected) {
                this.socket.emit(eventName, data);
            }
        });
    }

    // =========================================================================
    // PRIVADO — LISTENERS PERSONALIZADOS
    // =========================================================================

    _notifyListeners(eventName, data) {
        const set = this._listeners.get(eventName);
        if (!set?.size) return;

        set.forEach(cb => {
            try { cb(data); }
            catch (e) { this._log('error', `Error en listener de ${eventName}:`, e.message); }
        });
    }

    // =========================================================================
    // PRIVADO — UI: INDICADORES DE ESTADO
    // =========================================================================

    _updateStatusIndicators(state) {
        // Actualizar cualquier elemento con [data-ws-status]
        document.querySelectorAll('[data-ws-status]').forEach(el => {
            el.setAttribute('data-ws-status', state.toLowerCase());
            const labels = {
                [WS_STATES.CONNECTED]    : '● En línea',
                [WS_STATES.RECONNECTING] : '◌ Reconectando…',
                [WS_STATES.DISCONNECTED] : '○ Sin conexión',
                [WS_STATES.CONNECTING]   : '◌ Conectando…',
                [WS_STATES.FAILED]       : '✕ Error de conexión',
            };
            if (el.tagName !== 'INPUT') el.textContent = labels[state] ?? state;
        });
    }

    _showConnectionToast(type, message) {
        // Solo mostrar si hay función global disponible
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type === 'error' ? 'warning' : type);
        }
    }

    // =========================================================================
    // PRIVADO — CARGA DE SOCKET.IO DESDE CDN
    // =========================================================================

    _loadSocketIO() {
        if (typeof io !== 'undefined') return Promise.resolve();

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.crossOrigin = 'anonymous';
            script.onload  = () => { this._socketIOLoaded = true; resolve(); };
            script.onerror = () => reject(new Error('No se pudo cargar Socket.IO'));
            document.head.appendChild(script);
        });
    }

    // =========================================================================
    // PRIVADO — UTILIDADES
    // =========================================================================

    _getServerUrl() {
        return window.CONFIG?.API_BASE_URL
            ?? localStorage.getItem('apiUrl')
            ?? window.location.origin;
    }

    _genEID() {
        return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Limpia TODOS los timers y estructuras internas.
     * Llamar antes de desconectar o al destruir la instancia.
     */
    _cleanup() {
        [
            '_reconnectTimer',
            '_batchTimer',
            '_dashboardTimer',
            '_catCountTimer',
        ].forEach(timer => {
            if (this[timer]) { clearTimeout(this[timer]); this[timer] = null; }
        });

        this._stopDedupeCleanup();
        this._pendingBatch.clear();
        this._seenEvents.clear();
        this._ownEventIds.clear();
    }

    _log(level, ...args) {
        if (!this._debug && level !== 'error') return;
        const prefix = {
            info  : '🔵 [WS]',
            warn  : '🟡 [WS]',
            error : '🔴 [WS]',
            state : '🔄 [WS]',
            emit  : '📤 [WS]',
            recv  : '📥 [WS]',
            skip  : '⏭️  [WS]',
            queue : '📋 [WS]',
            batch : '📦 [WS]',
        }[level] ?? '[WS]';

        const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
        console[method](prefix, ...args);
    }

    // =========================================================================
    // PÚBLICO — DIAGNÓSTICO
    // =========================================================================

    /**
     * Devuelve un snapshot del estado interno.
     * Útil para debugging desde la consola: wsManager.getStatus()
     */
    getStatus() {
        return {
            state           : this.state,
            connected       : this.isConnected,
            socketId        : this.socket?.id ?? null,
            reconnectAttempts : this._reconnectAttempts,
            queuedOutbound  : this._outboundQueue.length,
            pendingBatch    : this._pendingBatch.size,
            dedupeEntries   : this._seenEvents.size,
            ownEventIds     : this._ownEventIds.size,
            listenerCount   : [...this._listeners.values()]
                .reduce((s, set) => s + set.size, 0),
        };
    }

    /** Imprime el estado en tabla en la consola. */
    printStatus() {
        console.group('📊 WebSocket Manager — Estado');
        console.table(this.getStatus());
        console.log('Cola saliente:', [...this._outboundQueue]);
        console.log('Batch pendiente:', Object.fromEntries(this._pendingBatch));
        console.groupEnd();
    }
}

// =============================================================================
// SINGLETON — Una sola instancia para toda la app
// =============================================================================
const wsManager = new WebSocketManager();

// Exposición global para debugging desde la consola del navegador
if (typeof window !== 'undefined') {
    window.wsManager = wsManager;

    // Atajos de debug
    window.wsDebug  = () => wsManager.printStatus();
    window.wsOn     = () => wsManager.setDebug(true);
    window.wsOff    = () => wsManager.setDebug(false);
}

export { WebSocketManager, WS_EVENTS, WS_STATES, ENTITY_STATE_MAP };
export default wsManager;