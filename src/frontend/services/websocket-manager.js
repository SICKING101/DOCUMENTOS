// =============================================================================
// src/frontend/services/websocket-manager.js
// GESTOR DE WEBSOCKETS SOCKET.IO - CLIENTE
// =============================================================================

class WebSocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.listeners = new Map();
        this.eventQueue = [];
    }

    /**
     * Conecta al servidor WebSocket
     */
    connect() {
        return new Promise((resolve) => {
            try {
                // Verificar si io está disponible (cargado desde CDN)
                if (typeof io === 'undefined') {
                    console.warn('⚠️ Socket.io no cargado. Cargando desde CDN...');
                    this._loadSocketIO().then(() => this._doConnect(resolve));
                    return;
                }

                this._doConnect(resolve);
            } catch (error) {
                console.error('❌ Error al conectar WebSocket:', error);
                resolve(false);
            }
        });
    }

    /**
     * Carga Socket.io desde CDN dinámicamente
     */
    _loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.onload = () => {
                console.log('✅ Socket.io cargado desde CDN');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Error cargando Socket.io desde CDN');
                reject(new Error('No se pudo cargar Socket.io'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Realiza la conexión real
     */
    _doConnect(resolve) {
        const token = localStorage.getItem('token');

        if (!token) {
            console.warn('⚠️ No hay token JWT, WebSocket se conectará como anónimo');
        }

        console.log('🔌 Conectando a WebSocket...');

        // Obtener URL base de la API
        const apiUrl = window.CONFIG?.API_BASE_URL ||
            localStorage.getItem('apiUrl') ||
            window.location.origin;

        this.socket = io(apiUrl, {
            auth: { token },
            query: { token },
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('🟢 WebSocket conectado! ID:', this.socket.id);
            this.isConnected = true;
            this._processEventQueue();
            resolve(true);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔴 WebSocket desconectado:', reason);
            this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Error de conexión WebSocket:', error.message);
            if (!this.isConnected) {
                resolve(false);
            }
        });

        // Registrar listeners del servidor
        this._registerEventListeners();

        // Timeout de seguridad
        setTimeout(() => {
            if (!this.isConnected) {
                console.warn('⚠️ Timeout de conexión WebSocket');
                resolve(false);
            }
        }, 10000);
    }

    /**
     * Registra todos los listeners para eventos del servidor
     */
    _registerEventListeners() {
        if (!this.socket) return;

        // Categorías
        this.socket.on('category:created', (data) => this._handleEntityEvent('categories', 'created', data));
        this.socket.on('category:updated', (data) => this._handleEntityEvent('categories', 'updated', data));
        this.socket.on('category:deleted', (data) => this._handleEntityEvent('categories', 'deleted', data));

        // Documentos
        this.socket.on('document:created', (data) => this._handleEntityEvent('documents', 'created', data));
        this.socket.on('document:updated', (data) => this._handleEntityEvent('documents', 'updated', data));
        this.socket.on('document:deleted', (data) => this._handleEntityEvent('documents', 'deleted', data));

        // Personas
        this.socket.on('person:created', (data) => this._handleEntityEvent('persons', 'created', data));
        this.socket.on('person:updated', (data) => this._handleEntityEvent('persons', 'updated', data));
        this.socket.on('person:deleted', (data) => this._handleEntityEvent('persons', 'deleted', data));

        // Departamentos
        this.socket.on('department:created', (data) => this._handleEntityEvent('departments', 'created', data));
        this.socket.on('department:updated', (data) => this._handleEntityEvent('departments', 'updated', data));
        this.socket.on('department:deleted', (data) => this._handleEntityEvent('departments', 'deleted', data));

        // Tareas
        this.socket.on('task:created', (data) => this._handleEntityEvent('tasks', 'created', data));
        this.socket.on('task:updated', (data) => this._handleEntityEvent('tasks', 'updated', data));
        this.socket.on('task:deleted', (data) => this._handleEntityEvent('tasks', 'deleted', data));
    }

    /**
     * Maneja eventos de entidades y actualiza el estado
     */
    _handleEntityEvent(entityType, action, data) {
        console.log(`📥 [WS] ${entityType} ${action}:`, data);

        // Actualizar estado global si existe
        if (window.appState) {
            switch (entityType) {
                case 'categories':
                    if (action === 'created' && data.category) {
                        window.appState.categories.push(data.category);
                    } else if (action === 'updated' && data.category) {
                        const idx = window.appState.categories.findIndex(c => c._id === data.category._id);
                        if (idx !== -1) window.appState.categories[idx] = data.category;
                    } else if (action === 'deleted' && data.categoryId) {
                        window.appState.categories = window.appState.categories.filter(c => c._id !== data.categoryId);
                    }

                    // ✅ NUEVO: Forzar actualización de UI de categorías
                    if (typeof window.renderCategories === 'function') {
                        window.renderCategories();
                    }
                    if (typeof window.populateCategorySelects === 'function') {
                        window.populateCategorySelects();
                    }
                    if (typeof window.refreshCategoryTree === 'function') {
                        window.refreshCategoryTree();
                    }
                    // También recargar documentos si estamos en vista de categoría
                    if (typeof window.loadDocuments === 'function') {
                        window.loadDocuments();
                    }
                    break;
                    
                case 'documents':
                    if (action === 'created' && data.document) {
                        window.appState.documents.unshift(data.document);
                    } else if (action === 'updated' && data.document) {
                        const idx = window.appState.documents.findIndex(d => d._id === data.document._id);
                        if (idx !== -1) window.appState.documents[idx] = data.document;
                    } else if (action === 'deleted' && data.documentId) {
                        window.appState.documents = window.appState.documents.filter(d => d._id !== data.documentId);
                    }
                    break;

                case 'persons':
                    if (action === 'created' && data.person) {
                        window.appState.persons.push(data.person);
                    } else if (action === 'updated' && data.person) {
                        const idx = window.appState.persons.findIndex(p => p._id === data.person._id);
                        if (idx !== -1) window.appState.persons[idx] = data.person;
                    } else if (action === 'deleted' && data.personId) {
                        window.appState.persons = window.appState.persons.filter(p => p._id !== data.personId);
                    }

                    // ✅ NUEVO: Forzar actualización de UI
                    if (typeof window.renderPersonsTable === 'function') {
                        window.renderPersonsTable();
                    }
                    break;

                case 'departments':
                    if (action === 'created' && data.department) {
                        window.appState.departments.push(data.department);
                    } else if (action === 'updated' && data.department) {
                        const idx = window.appState.departments.findIndex(d => d._id === data.department._id);
                        if (idx !== -1) window.appState.departments[idx] = data.department;
                    } else if (action === 'deleted' && data.departmentId) {
                        window.appState.departments = window.appState.departments.filter(d => d._id !== data.departmentId);
                    }

                    // ✅ NUEVO: Forzar actualización de UI
                    if (typeof window.renderDepartments === 'function') {
                        window.renderDepartments();
                    }
                    if (typeof window.populateDepartmentSelects === 'function') {
                        window.populateDepartmentSelects();
                    }
                    break;

                case 'tasks':
                    if (action === 'created' && data.task) {
                        window.appState.tasks.unshift(data.task);
                        window.appState.updateTasksStats?.();
                    } else if (action === 'updated' && data.task) {
                        const idx = window.appState.tasks.findIndex(t => t._id === data.task._id);
                        if (idx !== -1) window.appState.tasks[idx] = data.task;
                        window.appState.updateTasksStats?.();
                    } else if (action === 'deleted' && data.taskId) {
                        window.appState.tasks = window.appState.tasks.filter(t => t._id !== data.taskId);
                        window.appState.updateTasksStats?.();
                    }
                    break;
            }
        }

        // Notificar a listeners personalizados
        this._notifyListeners(`${entityType}:${action}`, data);

        // Disparar evento global para actualizar UI
        window.dispatchEvent(new CustomEvent(`ws:${entityType}-changed`, {
            detail: { action, data, timestamp: new Date().toISOString() }
        }));
    }

    /**
     * Emite un evento al servidor
     */
    emit(eventName, data) {
        if (this.isConnected && this.socket) {
            console.log(`📤 [WS] Emitiendo: ${eventName}`);
            this.socket.emit(eventName, data);
        } else {
            console.warn(`⚠️ [WS] No conectado, encolando: ${eventName}`);
            this.eventQueue.push({ eventName, data });
        }
    }

    /**
     * Procesa eventos pendientes
     */
    _processEventQueue() {
        if (this.eventQueue.length > 0) {
            console.log(`📤 [WS] Procesando ${this.eventQueue.length} eventos pendientes`);
            while (this.eventQueue.length > 0) {
                const { eventName, data } = this.eventQueue.shift();
                this.emit(eventName, data);
            }
        }
    }

    /**
     * Registra un listener para un evento
     */
    on(eventName, callback) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);
        return () => this.off(eventName, callback);
    }

    /**
     * Elimina un listener
     */
    off(eventName, callback) {
        if (this.listeners.has(eventName)) {
            const listeners = this.listeners.get(eventName);
            const index = listeners.indexOf(callback);
            if (index !== -1) listeners.splice(index, 1);
        }
    }

    /**
     * Notifica a los listeners
     */
    _notifyListeners(eventName, data) {
        if (this.listeners.has(eventName)) {
            this.listeners.get(eventName).forEach(cb => {
                try { cb(data); } catch (e) { console.error('Error en listener:', e); }
            });
        }
    }

    /**
     * Verifica conexión
     */
    isActive() {
        return this.isConnected && this.socket?.connected;
    }

    /**
     * Desconecta
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// Instancia única
const wsManager = new WebSocketManager();
export { WebSocketManager, wsManager };
export default wsManager;