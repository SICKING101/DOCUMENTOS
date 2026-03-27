// src/frontend/modules/tasks.js
// =============================================================================
// TASK MANAGER VERSION 2.0 - CORREGIDO (Botones de acción funcionando)
// =============================================================================

import { canView, canAction, showNoPermissionAlert, loadCurrentPermissions } from './permissions.js';
import { showFloatingNotification } from './modules/personas.js';

const DEBUG = true;
function tlog(...args) { if (DEBUG) console.log('📋 [TasksModule]', ...args); }

// =============================================================================
// CLASE PRINCIPAL TASK_MANAGER
// =============================================================================

class TaskManager {
    constructor() {
        this.tasks = [];
        this.users = [];
        this.currentFilter = {
            estado: 'all',
            prioridad: 'all',
            tipo: 'all',
            search: ''
        };
        this.isLoading = false;
        this.isSaving = false;
        this.currentUser = null;
        this.pendingAction = null;
        this.apiBaseUrl = '/api';
        
        this.init();
    }
    
    // ===========================================================================
    // INICIALIZACIÓN
    // ===========================================================================
    
    async init() {
        tlog('🚀 Inicializando TaskManager 2.0...');
        
        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                this.currentUser = JSON.parse(userStr);
                tlog(`👤 Usuario actual: ${this.currentUser.usuario} (${this.currentUser.rol})`);
            }
        } catch (e) {
            console.error('Error al obtener usuario:', e);
        }
        
        await loadCurrentPermissions();
        
        if (!canView('tareas')) {
            showNoPermissionAlert('tareas');
            this.showNoPermissionState();
            return;
        }
        
        this.bindEvents();
        await this.loadUsers();
        await this.loadTasks();
    }
    
    showNoPermissionState() {
        const container = document.getElementById('tasksContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state empty-state--center">
                    <i class="fas fa-lock" style="font-size: 3rem; color: var(--danger);"></i>
                    <h3>Acceso restringido</h3>
                    <p class="empty-state__description">No tienes permisos para acceder al módulo de tareas.</p>
                </div>
            `;
        }
    }
    
    // ===========================================================================
    // EVENTOS - CORREGIDO
    // ===========================================================================
    
    bindEvents() {
        tlog('🔗 Vinculando eventos...');
        
        // Botón crear tarea principal
        const addTaskBtn = document.getElementById('addTaskBtn');
        if (addTaskBtn) {
            addTaskBtn.removeEventListener('click', this.boundOpenModal);
            this.boundOpenModal = () => this.openTaskModal();
            addTaskBtn.addEventListener('click', this.boundOpenModal);
        }
        
        // Filtros
        const filterEstado = document.getElementById('filterEstado');
        const filterPrioridad = document.getElementById('filterPrioridad');
        const filterTipo = document.getElementById('filterTipo');
        const tasksSearch = document.getElementById('tasksSearch');
        
        if (filterEstado) {
            filterEstado.removeEventListener('change', this.boundApplyFilters);
            this.boundApplyFilters = () => this.applyFilters();
            filterEstado.addEventListener('change', this.boundApplyFilters);
        }
        
        if (filterPrioridad) {
            filterPrioridad.removeEventListener('change', this.boundApplyFilters);
            filterPrioridad.addEventListener('change', this.boundApplyFilters);
        }
        
        if (filterTipo) {
            filterTipo.removeEventListener('change', this.boundApplyFilters);
            filterTipo.addEventListener('change', this.boundApplyFilters);
        }
        
        if (tasksSearch) {
            tasksSearch.removeEventListener('input', this.boundSearch);
            this.boundSearch = (e) => this.handleSearch(e);
            tasksSearch.addEventListener('input', this.boundSearch);
        }
        
        // Modal de tarea
        const closeTaskModal = document.getElementById('closeTaskModal');
        const cancelTaskBtn = document.getElementById('cancelTaskBtn');
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        const taskModal = document.getElementById('taskModal');
        
        if (closeTaskModal) {
            closeTaskModal.removeEventListener('click', this.boundCloseModal);
            this.boundCloseModal = () => this.closeTaskModal();
            closeTaskModal.addEventListener('click', this.boundCloseModal);
        }
        
        if (cancelTaskBtn) {
            cancelTaskBtn.removeEventListener('click', this.boundCloseModal);
            cancelTaskBtn.addEventListener('click', this.boundCloseModal);
        }
        
        if (saveTaskBtn) {
            saveTaskBtn.removeEventListener('click', this.boundSaveTask);
            this.boundSaveTask = () => this.saveTask();
            saveTaskBtn.addEventListener('click', this.boundSaveTask);
        }
        
        if (taskModal) {
            taskModal.removeEventListener('click', this.boundModalClick);
            this.boundModalClick = (e) => {
                if (e.target === taskModal) this.closeTaskModal();
            };
            taskModal.addEventListener('click', this.boundModalClick);
        }
        
        // Modal de confirmación
        const closeActionModal = document.getElementById('closeActionModal');
        const cancelActionBtn = document.getElementById('cancelActionBtn');
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        const actionModal = document.getElementById('actionModal');
        
        if (closeActionModal) {
            closeActionModal.removeEventListener('click', this.boundCloseAction);
            this.boundCloseAction = () => this.closeActionModal();
            closeActionModal.addEventListener('click', this.boundCloseAction);
        }
        
        if (cancelActionBtn) {
            cancelActionBtn.removeEventListener('click', this.boundCloseAction);
            cancelActionBtn.addEventListener('click', this.boundCloseAction);
        }
        
        if (confirmActionBtn) {
            confirmActionBtn.removeEventListener('click', this.boundExecuteAction);
            this.boundExecuteAction = () => this.executePendingAction();
            confirmActionBtn.addEventListener('click', this.boundExecuteAction);
        }
        
        if (actionModal) {
            actionModal.removeEventListener('click', this.boundActionModalClick);
            this.boundActionModalClick = (e) => {
                if (e.target === actionModal) this.closeActionModal();
            };
            actionModal.addEventListener('click', this.boundActionModalClick);
        }
        
        // Evento global para acciones de tarjeta - DELEGACIÓN DE EVENTOS
        document.removeEventListener('click', this.boundTaskAction);
        this.boundTaskAction = (e) => {
            // Buscar si se hizo clic en un botón de acción
            const actionBtn = e.target.closest('.task-card__action');
            if (actionBtn) {
                e.preventDefault();
                e.stopPropagation();
                
                const taskId = actionBtn.dataset.taskId;
                const action = actionBtn.dataset.action;
                
                tlog(`🖱️ Acción detectada: ${action} en tarea ${taskId}`);
                
                if (taskId && action) {
                    this.handleTaskAction(action, taskId);
                }
            }
        };
        document.addEventListener('click', this.boundTaskAction);
        
        // Tecla Escape
        document.removeEventListener('keydown', this.boundEscape);
        this.boundEscape = (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeActionModal();
            }
        };
        document.addEventListener('keydown', this.boundEscape);
        
        tlog('✅ Eventos vinculados');
    }
    
    // ===========================================================================
    // CARGA DE DATOS
    // ===========================================================================
    
    async loadUsers() {
        try {
            tlog('👥 Cargando usuarios asignables...');
            
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('No hay token');
                return;
            }
            
            const response = await fetch(`${this.apiBaseUrl}/tasks/assignable-users`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.success) {
                this.users = data.users;
                tlog(`✅ ${this.users.length} usuarios cargados`);
            }
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            this.users = [];
        }
    }
    
    async loadTasks() {
        if (this.isLoading) return;
        this.isLoading = true;
        
        this.showPreloader();
        
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('No hay sesión activa');
            
            const params = new URLSearchParams();
            if (this.currentFilter.estado !== 'all') params.append('estado', this.currentFilter.estado);
            if (this.currentFilter.prioridad !== 'all') params.append('prioridad', this.currentFilter.prioridad);
            if (this.currentFilter.tipo !== 'all') params.append('tipo', this.currentFilter.tipo);
            if (this.currentFilter.search) params.append('search', this.currentFilter.search);
            
            const url = `${this.apiBaseUrl}/tasks${params.toString() ? '?' + params.toString() : ''}`;
            tlog(`📡 Cargando tareas desde: ${url}`);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            
            if (data.success) {
                this.tasks = data.tasks || [];
                tlog(`✅ ${this.tasks.length} tareas cargadas`);
                
                this.renderTasks();
                this.updateStats();
            } else {
                throw new Error(data.message || 'Error al cargar tareas');
            }
        } catch (error) {
            console.error('❌ Error cargando tareas:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    // ===========================================================================
    // RENDERIZADO
    // ===========================================================================
    
    showPreloader() {
        const container = document.getElementById('tasksContainer');
        if (container) {
            container.innerHTML = `
                <div class="tasks-preloader">
                    <div class="elegant-spinner">
                        <div class="elegant-spinner__ring"></div>
                        <div class="elegant-spinner__ring"></div>
                        <div class="elegant-spinner__ring"></div>
                    </div>
                    <div class="tasks-preloader__text">
                        <h4 class="tasks-preloader__title">Cargando tareas</h4>
                        <p class="tasks-preloader__subtitle">Organizando tu lista de pendientes</p>
                    </div>
                </div>
            `;
        }
    }
    
    showErrorState(message) {
        const container = document.getElementById('tasksContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state empty-state--center">
                    <i class="fas fa-exclamation-triangle" style="color: var(--danger); font-size: 3rem;"></i>
                    <h3>Error al cargar</h3>
                    <p class="empty-state__description">${this.escapeHtml(message || 'No se pudieron cargar las tareas')}</p>
                    <button class="btn btn--primary" onclick="window.taskManager?.loadTasks()">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                </div>
            `;
        }
    }
    
    renderTasks() {
        const container = document.getElementById('tasksContainer');
        if (!container) return;
        
        if (this.tasks.length === 0) {
            container.innerHTML = this.getEmptyState();
            this.bindEmptyStateButton();
            return;
        }
        
        container.innerHTML = this.tasks.map(task => this.createTaskCard(task)).join('');
    }
    
    bindEmptyStateButton() {
        const addFirstTask = document.getElementById('addFirstTask');
        if (addFirstTask) {
            addFirstTask.removeEventListener('click', this.boundOpenFirstTask);
            this.boundOpenFirstTask = () => this.openTaskModal();
            addFirstTask.addEventListener('click', this.boundOpenFirstTask);
        }
    }
    
    createTaskCard(task) {
        const puedeCompletar = task.permisos?.puedeCompletar || false;
        const puedeEditar = task.permisos?.puedeEditar || false;
        const puedeEliminar = task.permisos?.puedeEliminar || false;
        
        const dueDate = task.fecha_limite ? new Date(task.fecha_limite) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.estado !== 'completada';
        const formattedDate = dueDate ? dueDate.toLocaleDateString('es-ES', {
            day: 'numeric', month: 'short'
        }) : 'Sin fecha';
        
        const tipoIcon = {
            'personal': 'fa-user',
            'asignada': 'fa-user-check',
            'grupal': 'fa-users',
            'clase': 'fa-chalkboard'
        }[task.tipo] || 'fa-tasks';
        
        const prioridadClass = task.prioridad === 'critica' ? 'critica' : task.prioridad;
        
        let asignadosHtml = '';
        if (task.asignado_a && task.asignado_a.length > 0) {
            const nombres = task.asignado_a.map(u => u.usuario || u).join(', ');
            asignadosHtml = `
                <div class="task-card__assignees" title="Asignado a: ${this.escapeHtml(nombres)}">
                    <i class="fas fa-users"></i>
                    <span>${this.escapeHtml(nombres.substring(0, 20))}${nombres.length > 20 ? '...' : ''}</span>
                </div>
            `;
        }
        
        const showCompleteButton = puedeCompletar && task.estado !== 'completada';
        const showEditButton = puedeEditar;
        const showDeleteButton = puedeEliminar;
        
        return `
            <div class="task-card task-card--${prioridadClass} ${task.estado === 'completada' ? 'task-card--completed' : ''}" data-task-id="${task._id}">
                <div class="task-card__header">
                    <div class="task-card__title-wrapper">
                        <span class="task-card__type" title="Tipo: ${task.tipo}">
                            <i class="fas ${tipoIcon}"></i>
                        </span>
                        <h3 class="task-card__title">${this.escapeHtml(task.titulo)}</h3>
                    </div>
                    <span class="task-card__priority task-card__priority--${prioridadClass}">
                        ${task.prioridad === 'critica' ? 'Crítica' : task.prioridad}
                    </span>
                </div>
                
                ${task.descripcion ? `<p class="task-card__description">${this.escapeHtml(task.descripcion.substring(0, 100))}${task.descripcion.length > 100 ? '...' : ''}</p>` : ''}
                
                <div class="task-card__meta">
                    <span class="task-card__status task-card__status--${task.estado}">
                        ${this.getEstadoLabel(task.estado)}
                    </span>
                    ${task.categoria ? `<span class="task-card__category">${this.escapeHtml(task.categoria)}</span>` : ''}
                    ${dueDate ? `
                        <span class="task-card__due ${isOverdue ? 'task-card__due--overdue' : ''}">
                            <i class="fas fa-calendar-alt"></i> ${formattedDate}
                            ${task.hora_limite ? task.hora_limite : ''}
                        </span>
                    ` : ''}
                    ${asignadosHtml}
                </div>
                
                <div class="task-card__footer">
                    <div class="task-card__info">
                        <span><i class="fas fa-user"></i> ${this.escapeHtml((task.creado_por_nombre || task.creado_por?.usuario || 'Desconocido').substring(0, 12))}</span>
                        ${task.comentarios_count > 0 ? `<span><i class="fas fa-comment"></i> ${task.comentarios_count}</span>` : ''}
                    </div>
                    <div class="task-card__actions">
                        ${showCompleteButton ? `
                            <button class="task-card__action task-card__action--complete" data-task-id="${task._id}" data-action="complete" title="Completar tarea">
                                <i class="fas fa-check-circle"></i>
                            </button>
                        ` : ''}
                        ${showEditButton ? `
                            <button class="task-card__action task-card__action--edit" data-task-id="${task._id}" data-action="edit" title="Editar tarea">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        ${showDeleteButton ? `
                            <button class="task-card__action task-card__action--delete" data-task-id="${task._id}" data-action="delete" title="Eliminar tarea">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    getEstadoLabel(estado) {
        const labels = {
            'pendiente': 'Pendiente',
            'en-progreso': 'En progreso',
            'completada': 'Completada',
            'cancelada': 'Cancelada'
        };
        return labels[estado] || estado;
    }
    
    getEmptyState() {
        const hasFilters = this.currentFilter.search ||
                           this.currentFilter.estado !== 'all' ||
                           this.currentFilter.prioridad !== 'all' ||
                           this.currentFilter.tipo !== 'all';
        
        const canCreate = canAction('tareas');
        
        return `
            <div class="empty-state empty-state--center">
                <i class="fas fa-clipboard-list empty-state__icon"></i>
                <h3 class="empty-state__title">${hasFilters ? 'No hay tareas que coincidan' : 'No hay tareas registradas'}</h3>
                <p class="empty-state__description">${hasFilters ? 'Intenta cambiar los filtros' : (canCreate ? 'Crea tu primera tarea para comenzar' : 'No tienes permisos para crear tareas')}</p>
                ${!hasFilters && canCreate ? `
                    <button class="btn btn--primary" id="addFirstTask">
                        <i class="fas fa-plus"></i> Crear Tarea
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    async updateStats() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch(`${this.apiBaseUrl}/tasks/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) return;
            
            const data = await response.json();
            
            if (data.success && data.stats) {
                const stats = data.stats;
                const totalEl = document.getElementById('totalTasks');
                const pendingEl = document.getElementById('pendingTasks');
                const progressEl = document.getElementById('progressTasks');
                const completedEl = document.getElementById('completedTasks');
                
                if (totalEl) totalEl.textContent = stats.total || 0;
                if (pendingEl) pendingEl.textContent = stats.pendientes || 0;
                if (progressEl) progressEl.textContent = stats.enProgreso || 0;
                if (completedEl) completedEl.textContent = stats.completadas || 0;
            }
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }
    
    // ===========================================================================
    // MODAL DE TAREA
    // ===========================================================================
    
    openTaskModal(task = null) {
        if (!canAction('tareas')) {
            showNoPermissionAlert('tareas');
            return;
        }
        
        const modal = document.getElementById('taskModal');
        if (!modal) {
            console.error('❌ Modal #taskModal no encontrado');
            return;
        }
        
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        const asignadosSelect = document.getElementById('taskAssignees');
        
        if (asignadosSelect && this.users && this.users.length > 0) {
            asignadosSelect.innerHTML = `
                <option value="">Seleccionar usuarios (opcional)</option>
                ${this.users.map(user => `
                    <option value="${user.id}">${this.escapeHtml(user.usuario)} (${user.rol})</option>
                `).join('')}
            `;
        }
        
        if (task) {
            if (title) title.textContent = 'Editar Tarea';
            this.populateForm(task);
        } else {
            if (title) title.textContent = 'Nueva Tarea';
            if (form) form.reset();
            
            const taskIdInput = document.getElementById('taskId');
            if (taskIdInput) taskIdInput.value = '';
            
            const tipoSelect = document.getElementById('taskTipo');
            if (tipoSelect) tipoSelect.value = 'personal';
            
            const prioridadSelect = document.getElementById('taskPrioridad');
            if (prioridadSelect) prioridadSelect.value = 'media';
            
            const estadoSelect = document.getElementById('taskEstado');
            if (estadoSelect) estadoSelect.value = 'pendiente';
            
            const today = new Date().toISOString().split('T')[0];
            const dueDateInput = document.getElementById('taskDueDate');
            if (dueDateInput) {
                dueDateInput.min = today;
                dueDateInput.value = today;
            }
            
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const timeInput = document.getElementById('taskTime');
            if (timeInput) {
                timeInput.value = currentTime;
                timeInput.min = currentTime;
            }
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }
    
    populateForm(task) {
        if (!task) return;
        
        const taskIdInput = document.getElementById('taskId');
        if (taskIdInput) taskIdInput.value = task._id;
        
        const tituloInput = document.getElementById('taskTitulo');
        if (tituloInput) tituloInput.value = task.titulo || '';
        
        const descripcionInput = document.getElementById('taskDescripcion');
        if (descripcionInput) descripcionInput.value = task.descripcion || '';
        
        const prioridadSelect = document.getElementById('taskPrioridad');
        if (prioridadSelect) prioridadSelect.value = task.prioridad || 'media';
        
        const estadoSelect = document.getElementById('taskEstado');
        if (estadoSelect) estadoSelect.value = task.estado || 'pendiente';
        
        const tipoSelect = document.getElementById('taskTipo');
        if (tipoSelect) tipoSelect.value = task.tipo || 'personal';
        
        const categoriaInput = document.getElementById('taskCategoria');
        if (categoriaInput) categoriaInput.value = task.categoria || '';
        
        const reminderCheckbox = document.getElementById('taskReminder');
        if (reminderCheckbox) reminderCheckbox.checked = task.recordatorio || false;
        
        const asignadosSelect = document.getElementById('taskAssignees');
        if (asignadosSelect && task.asignado_a && task.asignado_a.length > 0) {
            const asignadosIds = task.asignado_a.map(u => u._id || u);
            Array.from(asignadosSelect.options).forEach(option => {
                if (asignadosIds.includes(option.value)) {
                    option.selected = true;
                }
            });
        }
        
        if (task.fecha_limite) {
            const dueDate = new Date(task.fecha_limite);
            const dateStr = dueDate.toISOString().split('T')[0];
            const dueDateInput = document.getElementById('taskDueDate');
            if (dueDateInput) dueDateInput.value = dateStr;
            
            const today = new Date().toISOString().split('T')[0];
            if (dueDateInput) dueDateInput.min = today;
            
            if (task.hora_limite) {
                const timeInput = document.getElementById('taskTime');
                if (timeInput) timeInput.value = task.hora_limite;
                
                if (dateStr === today) {
                    const now = new Date();
                    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                    if (timeInput) timeInput.min = currentTime;
                }
            }
        }
    }
    
    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        this.clearAllFieldErrors();
    }
    
    // ===========================================================================
    // GUARDAR TAREA
    // ===========================================================================
    
    async saveTask() {
        if (!canAction('tareas')) {
            showNoPermissionAlert('tareas');
            return;
        }
        
        if (this.isSaving) return;
        
        if (!this.validateForm()) return;
        
        const taskData = this.getFormData();
        this.isSaving = true;
        
        const preloader = this.showModalPreloader(true);
        
        try {
            const token = localStorage.getItem('token');
            const url = taskData._id
                ? `${this.apiBaseUrl}/tasks/${taskData._id}`
                : `${this.apiBaseUrl}/tasks`;
            
            const method = taskData._id ? 'PUT' : 'POST';
            
            tlog(`${method} ${url}`);
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(taskData)
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error al guardar la tarea');
            }
            
            this.transformPreloaderToSuccess(preloader, taskData._id ? 'Tarea actualizada' : 'Tarea creada');
            
            await this.loadTasks();
            
            setTimeout(() => {
                this.closeTaskModal();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Error guardando:', error);
            this.transformPreloaderToError(preloader, error.message);
        } finally {
            this.isSaving = false;
        }
    }
    
    getFormData() {
        const asignadosSelect = document.getElementById('taskAssignees');
        const asignados = asignadosSelect
            ? Array.from(asignadosSelect.selectedOptions).map(opt => opt.value).filter(v => v && v !== '')
            : [];
        
        const dueDateInput = document.getElementById('taskDueDate');
        const dueDate = dueDateInput?.value;
        
        const dueTimeInput = document.getElementById('taskTime');
        const dueTime = dueTimeInput?.value;
        
        let fechaLimite = null;
        if (dueDate) {
            fechaLimite = dueTime
                ? new Date(`${dueDate}T${dueTime}`).toISOString()
                : new Date(`${dueDate}T23:59:59`).toISOString();
        }
        
        const taskIdInput = document.getElementById('taskId');
        const tituloInput = document.getElementById('taskTitulo');
        const descripcionInput = document.getElementById('taskDescripcion');
        const prioridadSelect = document.getElementById('taskPrioridad');
        const estadoSelect = document.getElementById('taskEstado');
        const tipoSelect = document.getElementById('taskTipo');
        const categoriaInput = document.getElementById('taskCategoria');
        const reminderCheckbox = document.getElementById('taskReminder');
        
        return {
            _id: taskIdInput?.value || null,
            titulo: tituloInput?.value?.trim() || '',
            descripcion: descripcionInput?.value?.trim() || '',
            prioridad: prioridadSelect?.value || 'media',
            estado: estadoSelect?.value || 'pendiente',
            tipo: tipoSelect?.value || 'personal',
            categoria: categoriaInput?.value?.trim() || '',
            etiquetas: [],
            asignado_a: asignados,
            fecha_limite: fechaLimite,
            hora_limite: dueTime || null,
            recordatorio: reminderCheckbox?.checked || false
        };
    }
    
    // ===========================================================================
    // VALIDACIÓN
    // ===========================================================================
    
    validateForm() {
        let isValid = true;
        this.clearAllFieldErrors();
        
        const titulo = document.getElementById('taskTitulo')?.value?.trim();
        if (!titulo) {
            this.showFieldError('taskTitulo', 'El título es obligatorio');
            isValid = false;
        }
        
        const dueDate = document.getElementById('taskDueDate')?.value;
        if (dueDate) {
            const selectedDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                this.showFieldError('taskDueDate', 'La fecha no puede ser anterior a hoy');
                isValid = false;
            }
            
            if (selectedDate.toDateString() === today.toDateString()) {
                const dueTime = document.getElementById('taskTime')?.value;
                if (dueTime) {
                    const now = new Date();
                    const selectedDateTime = new Date(`${dueDate}T${dueTime}`);
                    if (selectedDateTime < now) {
                        this.showFieldError('taskTime', 'La hora no puede ser anterior a la actual');
                        isValid = false;
                    }
                }
            }
        }
        
        return isValid;
    }
    
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        this.clearFieldError(fieldId);
        
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.id = `${fieldId}-error`;
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: var(--danger);
            font-size: 0.85rem;
            margin-top: 4px;
            margin-bottom: 8px;
        `;
        
        field.parentNode.insertBefore(errorElement, field.nextSibling);
        field.style.borderColor = 'var(--danger)';
    }
    
    clearFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errorElement) errorElement.remove();
        
        const field = document.getElementById(fieldId);
        if (field) field.style.borderColor = '';
    }
    
    clearAllFieldErrors() {
        document.querySelectorAll('.field-error').forEach(el => el.remove());
        ['taskTitulo', 'taskDueDate', 'taskTime'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.style.borderColor = '';
        });
    }
    
    // ===========================================================================
    // ACCIONES DE TAREA - CORREGIDO
    // ===========================================================================
    
    handleTaskAction(action, taskId) {
        tlog(`📌 handleTaskAction: ${action} para tarea ${taskId}`);
        
        if (!canAction('tareas')) {
            showNoPermissionAlert('tareas');
            return;
        }
        
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) {
            console.error(`❌ Tarea no encontrada: ${taskId}`);
            return;
        }
        
        tlog(`✅ Tarea encontrada: "${task.titulo}"`);
        
        switch (action) {
            case 'edit':
                tlog(`✏️ Abriendo modal para editar tarea`);
                this.openTaskModal(task);
                break;
            case 'delete':
                tlog(`🗑️ Mostrando modal de confirmación para eliminar`);
                this.showActionModal('delete', taskId);
                break;
            case 'complete':
                tlog(`✅ Mostrando modal de confirmación para completar`);
                this.showActionModal('complete', taskId);
                break;
            default:
                console.warn(`Acción desconocida: ${action}`);
        }
    }
    
    showActionModal(actionType, taskId) {
    tlog(`🔔 showActionModal: ${actionType} para tarea ${taskId}`);
    
    const modal = document.getElementById('actionModal');
    if (!modal) {
        console.error('❌ Modal #actionModal no encontrado');
        return;
    }
    
    const configs = {
        delete: {
            title: 'Eliminar Tarea',
            message: '¿Estás seguro de eliminar esta tarea? Esta acción no se puede deshacer.',
            icon: 'fas fa-trash-alt',
            btnClass: 'btn--danger',
            btnText: 'Eliminar'
        },
        complete: {
            title: 'Completar Tarea',
            message: '¿Marcar esta tarea como completada?',
            icon: 'fas fa-check-circle',
            btnClass: 'btn--success',
            btnText: 'Completar'
        }
    };
    
    const config = configs[actionType];
    if (!config) {
        console.error(`❌ Configuración no encontrada para: ${actionType}`);
        return;
    }
    
    // Obtener elementos
    const titleEl = document.getElementById('actionModalTitle');
    const messageEl = document.getElementById('actionModalMessage');
    const iconEl = document.getElementById('actionModalIcon');
    const confirmBtn = document.getElementById('confirmActionBtn');
    const cancelBtn = document.getElementById('cancelActionBtn');
    const closeBtn = document.getElementById('closeActionModalBtn');
    
    // Actualizar contenido
    if (titleEl) titleEl.textContent = config.title;
    if (messageEl) messageEl.textContent = config.message;
    if (iconEl) {
        iconEl.innerHTML = `<i class="${config.icon}"></i>`;
        iconEl.className = `action-modal__icon action-modal__icon--${actionType}`;
    }
    if (confirmBtn) {
        confirmBtn.className = `btn ${config.btnClass}`;
        confirmBtn.textContent = config.btnText;
    }
    
    // Guardar acción pendiente
    this.pendingAction = { type: actionType, taskId };
    
    // Configurar eventos de cierre (eliminar previos para evitar duplicados)
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        this.pendingAction = null;
    };
    
    // Remover listeners anteriores si existen
    if (this.boundCancelAction) {
        cancelBtn?.removeEventListener('click', this.boundCancelAction);
        closeBtn?.removeEventListener('click', this.boundCancelAction);
    }
    
    // Crear nuevo listener
    this.boundCancelAction = closeModal;
    
    // Agregar listeners
    if (cancelBtn) cancelBtn.addEventListener('click', this.boundCancelAction);
    if (closeBtn) closeBtn.addEventListener('click', this.boundCancelAction);
    
    // Mostrar modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    
    tlog(`✅ Modal de confirmación mostrado para: ${actionType}`);
}
    
    closeActionModal() {
    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
    this.pendingAction = null;
}
    
    async executePendingAction() {
    if (!this.pendingAction || this.isSaving) {
        tlog('⚠️ No hay acción pendiente o ya está guardando');
        return;
    }
    
    const { type, taskId } = this.pendingAction;
    tlog(`⚡ Ejecutando acción: ${type} en tarea ${taskId}`);
    
    this.isSaving = true;
    
    const preloader = this.showConfirmationPreloader();
    
    try {
        const token = localStorage.getItem('token');
        let response;
        let url;
        
        if (type === 'delete') {
            url = `${this.apiBaseUrl}/tasks/${taskId}`;
            tlog(`🗑️ DELETE ${url}`);
            response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else if (type === 'complete') {
            url = `${this.apiBaseUrl}/tasks/${taskId}/complete`;
            tlog(`✅ PATCH ${url}`);
            response = await fetch(url, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        
        if (!response) throw new Error('No se recibió respuesta');
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Error al ${type === 'delete' ? 'eliminar' : 'completar'} la tarea`);
        }
        
        tlog(`✅ Acción ${type} completada exitosamente`);
        
        this.transformPreloaderToSuccess(preloader, type === 'delete' ? 'Tarea eliminada' : 'Tarea completada');
        
        // Cerrar el modal de confirmación
        this.closeActionModal();
        
        // Recargar tareas
        await this.loadTasks();
        
    } catch (error) {
        console.error('❌ Error ejecutando acción:', error);
        this.transformPreloaderToError(preloader, error.message);
    } finally {
        this.isSaving = false;
        this.pendingAction = null;
    }
}
    
    // ===========================================================================
    // FILTROS Y BÚSQUEDA
    // ===========================================================================
    
    applyFilters() {
        this.currentFilter.estado = document.getElementById('filterEstado')?.value || 'all';
        this.currentFilter.prioridad = document.getElementById('filterPrioridad')?.value || 'all';
        this.currentFilter.tipo = document.getElementById('filterTipo')?.value || 'all';
        this.loadTasks();
    }
    
    handleSearch(e) {
        this.currentFilter.search = e.target.value.toLowerCase();
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadTasks();
        }, 500);
    }
    
    // ===========================================================================
    // PRELOADERS
    // ===========================================================================
    
    showModalPreloader(isSaving = false) {
        const modalContent = document.querySelector('#taskModal .modal__content');
        if (!modalContent) return null;
        
        const preloader = document.createElement('div');
        preloader.className = 'modal-preloader';
        preloader.innerHTML = `
            <div class="modal-preloader__content">
                <div class="smooth-spinner"></div>
                <p class="modal-preloader__message">${isSaving ? 'Guardando...' : 'Cargando...'}</p>
                ${isSaving ? `
                    <div class="modal-preloader__progress">
                        <div class="modal-preloader__progress-bar"></div>
                    </div>
                ` : ''}
            </div>
        `;
        
        modalContent.style.position = 'relative';
        modalContent.appendChild(preloader);
        
        return preloader;
    }
    
    showConfirmationPreloader() {
        const modalContent = document.querySelector('#actionModal .modal__content');
        if (!modalContent) return null;
        
        const preloader = document.createElement('div');
        preloader.className = 'confirmation-preloader';
        preloader.innerHTML = `
            <div class="confirmation-preloader__content">
                <div class="spinner-ring"></div>
                <p class="confirmation-preloader__text">Procesando...</p>
            </div>
        `;
        
        modalContent.style.position = 'relative';
        modalContent.appendChild(preloader);
        
        return preloader;
    }
    
    transformPreloaderToSuccess(preloader, message) {
        if (!preloader) return;
        
        preloader.innerHTML = `
            <div class="success-animation">
                <i class="fas fa-check-circle"></i>
                <p class="success-message">${message}</p>
            </div>
        `;
        
        setTimeout(() => {
            if (preloader.parentNode) {
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    if (preloader.parentNode) preloader.remove();
                }, 300);
            }
        }, 1500);
    }
    
    transformPreloaderToError(preloader, message) {
        if (!preloader) return;
        
        preloader.innerHTML = `
            <div class="error-animation">
                <i class="fas fa-exclamation-circle"></i>
                <p class="error-message">${message}</p>
            </div>
        `;
        
        setTimeout(() => {
            if (preloader.parentNode) {
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    if (preloader.parentNode) preloader.remove();
                }, 300);
            }
        }, 2500);
    }
    
    // ===========================================================================
    // UTILIDADES
    // ===========================================================================
    
    escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// =============================================================================
// EXPORTAR
// =============================================================================

export default TaskManager;

// Exponer en window para debugging
if (typeof window !== 'undefined') {
    window.TaskManager = TaskManager;
}

// Función de inicialización
export function initTasksModule() {
    if (!window.taskManager) {
        window.taskManager = new TaskManager();
    }
    return window.taskManager;
}