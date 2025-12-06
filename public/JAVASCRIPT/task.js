// =============================================================================
// 1. DEFINICIÓN DE LA CLASE TASKMANAGER
// =============================================================================

/**
 * 1.1 Clase principal del gestor de tareas
 * Maneja toda la funcionalidad relacionada con tareas: CRUD, filtrado,
 * persistencia local y modales de confirmación.
 */
class TaskManager {
    constructor() {
        /**
         * 1.1.1 Lista de tareas
         * Almacena todas las tareas creadas en la aplicación.
         */
        this.tasks = [];
        
        /**
         * 1.1.2 Filtros actuales
         * Estado de los filtros aplicados a la lista de tareas.
         */
        this.currentFilter = {
            priority: 'all',
            status: 'all'
        };
        
        /**
         * 1.1.3 Término de búsqueda actual
         * Texto para filtrar tareas por contenido.
         */
        this.currentSearch = '';
        
        /**
         * 1.1.4 Acción pendiente
         * Almacena información sobre acciones que requieren confirmación.
         */
        this.pendingAction = null;
        
        /**
         * 1.1.5 Inicializar instancia
         * Configura eventos y carga datos existentes.
         */
        this.init();
    }

    /**
     * 1.2 Inicializar gestor de tareas
     * Conecta eventos del DOM y carga tareas guardadas.
     */
    init() {
        this.bindEvents();
        this.loadTasks();
    }

    // =============================================================================
    // 2. CONFIGURACIÓN DE EVENT LISTENERS
    // =============================================================================

    /**
     * 2.1 Vincular todos los eventos del DOM
     * Conecta botones, formularios y controles con sus funciones correspondientes.
     */
    bindEvents() {
        // Botones principales
        const addTaskBtn = document.getElementById('addTaskBtn');
        const addFirstTask = document.getElementById('addFirstTask');
        
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', () => this.openTaskModal());
        }
        
        if (addFirstTask) {
            addFirstTask.addEventListener('click', () => this.openTaskModal());
        }
        
        // Modal de tareas
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        const cancelTaskBtn = document.getElementById('cancelTaskBtn');
        const closeTaskModal = document.getElementById('closeTaskModal');
        const taskModal = document.getElementById('taskModal');
        
        if (saveTaskBtn) {
            saveTaskBtn.addEventListener('click', () => this.saveTask());
        }
        
        if (cancelTaskBtn) {
            cancelTaskBtn.addEventListener('click', () => this.closeTaskModal());
        }
        
        if (closeTaskModal) {
            closeTaskModal.addEventListener('click', () => this.closeTaskModal());
        }
        
        if (taskModal) {
            taskModal.addEventListener('click', (e) => {
                if (e.target === taskModal) {
                    this.closeTaskModal();
                }
            });
        }
        
        // Modal de acciones
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        const cancelActionBtn = document.getElementById('cancelActionBtn');
        const closeActionModal = document.getElementById('closeActionModal');
        const actionModal = document.getElementById('actionModal');
        
        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', () => this.executePendingAction());
        }
        
        if (cancelActionBtn) {
            cancelActionBtn.addEventListener('click', () => this.closeActionModal());
        }
        
        if (closeActionModal) {
            closeActionModal.addEventListener('click', () => this.closeActionModal());
        }
        
        if (actionModal) {
            actionModal.addEventListener('click', (e) => {
                if (e.target === actionModal) {
                    this.closeActionModal();
                }
            });
        }
        
        // Filtros
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const tasksSearch = document.getElementById('tasksSearch');
        
        if (filterPriority) {
            filterPriority.addEventListener('change', (e) => this.filterTasks());
        }
        
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => this.filterTasks());
        }
        
        if (tasksSearch) {
            tasksSearch.addEventListener('input', (e) => this.searchTasks(e));
        }
        
        // Botón para limpiar tareas completadas
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', () => this.showClearCompletedModal());
        }
        
        // Cerrar modales con escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeActionModal();
            }
        });
    }

    // =============================================================================
    // 3. FUNCIONES PRINCIPALES DE GESTIÓN
    // =============================================================================

    /**
     * 3.1 Cargar tareas desde almacenamiento local
     * Recupera tareas guardadas anteriormente o inicializa lista vacía.
     */
    loadTasks() {
        this.loadTasksFromLocalStorage();
    }

    /**
     * 3.2 Abrir modal de tarea
     * Muestra formulario para crear nueva tarea o editar existente.
     */
    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        if (!modal) {
            this.showNotification('Error: No se pudo abrir el formulario', 'error');
            return;
        }
        
        if (task) {
            title.textContent = 'Editar Tarea';
            this.populateForm(task);
        } else {
            title.textContent = 'Nueva Tarea';
            form.reset();
            document.getElementById('taskId').value = '';
            // Establecer fecha mínima como hoy
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('taskDueDate').min = today;
        }
        
        // Abrir modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Agregar animación
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    /**
     * 3.3 Poblar formulario con datos de tarea
     * Llena los campos del formulario con datos existentes para edición.
     */
    populateForm(task) {
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskStatus').value = task.status;
        document.getElementById('taskCategory').value = task.category || '';
        document.getElementById('taskReminder').checked = task.reminder || false;
        
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            document.getElementById('taskDueDate').value = dueDate.toISOString().split('T')[0];
            document.getElementById('taskTime').value = dueDate.toTimeString().slice(0, 5);
        } else {
            document.getElementById('taskDueDate').value = '';
            document.getElementById('taskTime').value = '';
        }
    }

    /**
     * 3.4 Cerrar modal de tarea
     * Oculta el formulario y restaura estado del documento.
     */
    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
        const form = document.getElementById('taskForm');
        if (form) {
            form.reset();
        }
    }

    /**
     * 3.5 Guardar tarea (crear o actualizar)
     * Valida formulario y persiste datos en localStorage.
     */
    saveTask() {
        const form = document.getElementById('taskForm');
        if (!form) {
            this.showNotification('Error: No se encontró el formulario', 'error');
            return;
        }
        
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const taskData = {
            id: document.getElementById('taskId').value,
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            category: document.getElementById('taskCategory').value.trim(),
            reminder: document.getElementById('taskReminder').checked,
            dueDate: this.getDueDate()
        };

        // Validar título
        if (!taskData.title) {
            this.showNotification('El título de la tarea es obligatorio', 'warning');
            return;
        }

        try {
            const isEdit = !!taskData.id;
            
            if (isEdit) {
                const index = this.tasks.findIndex(t => t.id === taskData.id);
                if (index !== -1) {
                    this.tasks[index] = {
                        ...this.tasks[index],
                        ...taskData,
                        updatedAt: new Date().toISOString()
                    };
                    this.showNotification('Tarea actualizada correctamente', 'success');
                }
            } else {
                taskData.id = this.generateId();
                taskData.createdAt = new Date().toISOString();
                taskData.updatedAt = new Date().toISOString();
                this.tasks.unshift(taskData);
                this.showNotification('Tarea creada correctamente', 'success');
            }

            this.saveTasksToLocalStorage();
            this.renderTasks();
            this.updateSummary();
            this.closeTaskModal();
        } catch (error) {
            this.showNotification('Error al guardar la tarea', 'error');
        }
    }

    // =============================================================================
    // 4. MODAL DE ACCIONES CON CONFIRMACIÓN
    // =============================================================================

    /**
     * 4.1 Mostrar modal de acción con confirmación
     * Presenta diálogo para confirmar operaciones críticas (eliminar, completar, etc.).
     */
    showActionModal(actionType, taskId, additionalData = {}) {
        const modal = document.getElementById('actionModal');
        const title = document.getElementById('actionModalTitle');
        const message = document.getElementById('actionModalMessage');
        const icon = document.getElementById('actionModalIcon');
        const confirmBtn = document.getElementById('confirmActionBtn');
        
        if (!modal) {
            this.showNotification('Error: No se pudo abrir el panel de confirmación', 'error');
            return;
        }
        
        // Configurar según el tipo de acción
        const actionConfig = {
            delete: {
                title: 'Eliminar Tarea',
                message: '¿Estás seguro de que quieres eliminar esta tarea? Esta acción no se puede deshacer.',
                icon: 'fas fa-trash-alt',
                iconClass: 'action-modal__icon--error',
                btnClass: 'btn--danger',
                btnText: 'Eliminar'
            },
            complete: {
                title: 'Marcar como Completada',
                message: '¿Quieres marcar esta tarea como completada?',
                icon: 'fas fa-check-circle',
                iconClass: 'action-modal__icon--success',
                btnClass: 'btn--success',
                btnText: 'Completar'
            },
            restart: {
                title: 'Reiniciar Tarea',
                message: '¿Quieres volver a marcar esta tarea como pendiente?',
                icon: 'fas fa-redo-alt',
                iconClass: 'action-modal__icon--info',
                btnClass: 'btn--primary',
                btnText: 'Reiniciar'
            },
            clearCompleted: {
                title: 'Limpiar Tareas Completadas',
                message: '¿Estás seguro de que quieres eliminar todas las tareas completadas? Esta acción no se puede deshacer.',
                icon: 'fas fa-broom',
                iconClass: 'action-modal__icon--warning',
                btnClass: 'btn--warning',
                btnText: 'Limpiar Todo'
            }
        };
        
        const config = actionConfig[actionType] || actionConfig.delete;
        
        // Aplicar configuración
        title.textContent = config.title;
        message.textContent = config.message;
        
        // Configurar icono
        icon.className = 'action-modal__icon';
        icon.classList.add(config.iconClass);
        const iconElement = document.createElement('i');
        iconElement.className = config.icon;
        icon.innerHTML = '';
        icon.appendChild(iconElement);
        
        // Configurar botón de confirmación
        confirmBtn.className = 'btn';
        confirmBtn.classList.add(config.btnClass);
        confirmBtn.textContent = config.btnText;
        
        // Guardar acción pendiente
        this.pendingAction = {
            type: actionType,
            taskId: taskId,
            additionalData: additionalData
        };
        
        // Abrir modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Agregar animación
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    }

    /**
     * 4.2 Mostrar modal para limpiar tareas completadas
     * Solicita confirmación antes de eliminar todas las tareas completadas.
     */
    showClearCompletedModal() {
        const completedTasks = this.tasks.filter(task => task.status === 'completada');
        if (completedTasks.length === 0) {
            this.showNotification('No hay tareas completadas para eliminar', 'info');
            return;
        }
        this.showActionModal('clearCompleted');
    }

    /**
     * 4.3 Cerrar modal de acción
     * Oculta diálogo de confirmación y limpia acción pendiente.
     */
    closeActionModal() {
        const modal = document.getElementById('actionModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
        this.pendingAction = null;
    }

    /**
     * 4.4 Ejecutar acción pendiente confirmada
     * Realiza la operación después de confirmación del usuario.
     */
    executePendingAction() {
        if (!this.pendingAction) return;
        
        const { type, taskId, additionalData } = this.pendingAction;
        
        try {
            switch (type) {
                case 'delete':
                    this.deleteTask(taskId);
                    break;
                case 'complete':
                    this.toggleTaskStatus(taskId, 'completada');
                    break;
                case 'restart':
                    this.toggleTaskStatus(taskId, 'pendiente');
                    break;
                case 'clearCompleted':
                    this.clearCompletedTasks();
                    break;
                default:
                    this.showNotification('Acción no reconocida', 'warning');
            }
            
            this.closeActionModal();
        } catch (error) {
            this.showNotification('Error al ejecutar la acción', 'error');
            this.closeActionModal();
        }
    }

    /**
     * 4.5 Eliminar tarea específica
     * Remueve tarea de la lista y actualiza interfaz.
     */
    deleteTask(taskId) {
        try {
            const taskTitle = this.tasks.find(t => t.id === taskId)?.title || 'la tarea';
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasksToLocalStorage();
            this.renderTasks();
            this.updateSummary();
            this.showNotification(`Tarea "${taskTitle}" eliminada correctamente`, 'success');
        } catch (error) {
            this.showNotification('Error al eliminar la tarea', 'error');
        }
    }

    /**
     * 4.6 Cambiar estado de tarea
     * Alterna entre estados "pendiente" y "completada".
     */
    toggleTaskStatus(taskId, newStatus) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                const oldStatus = task.status;
                task.status = newStatus;
                task.updatedAt = new Date().toISOString();
                this.saveTasksToLocalStorage();
                this.renderTasks();
                this.updateSummary();
                
                const statusText = newStatus === 'completada' ? 'completada' : 'reiniciada';
                this.showNotification(`Tarea "${task.title}" ${statusText} correctamente`, 'success');
            }
        } catch (error) {
            this.showNotification('Error al cambiar el estado de la tarea', 'error');
        }
    }

    /**
     * 4.7 Limpiar todas las tareas completadas
     * Elimina permanentemente tareas con estado "completada".
     */
    clearCompletedTasks() {
        try {
            const completedTasks = this.tasks.filter(task => task.status === 'completada');
            this.tasks = this.tasks.filter(task => task.status !== 'completada');
            this.saveTasksToLocalStorage();
            this.renderTasks();
            this.updateSummary();
            this.showNotification(`${completedTasks.length} tareas completadas eliminadas`, 'success');
        } catch (error) {
            this.showNotification('Error al limpiar las tareas completadas', 'error');
        }
    }

    // =============================================================================
    // 5. FUNCIONES DE INTERFAZ DE USUARIO
    // =============================================================================

    /**
     * 5.1 Obtener fecha de vencimiento formateada
     * Combina fecha y hora del formulario en objeto Date.
     */
    getDueDate() {
        const date = document.getElementById('taskDueDate')?.value;
        const time = document.getElementById('taskTime')?.value;
        
        if (!date) return null;
        
        if (time) {
            return new Date(`${date}T${time}`).toISOString();
        } else {
            return new Date(date + 'T23:59:59').toISOString();
        }
    }

    /**
     * 5.2 Generar ID único para tarea
     * Crea identificador único usando timestamp y random.
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 5.3 Filtrar tareas por criterios
     * Aplica filtros de prioridad y estado a la lista.
     */
    filterTasks() {
        const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
        const statusFilter = document.getElementById('filterStatus')?.value || 'all';
        
        this.currentFilter = {
            priority: priorityFilter,
            status: statusFilter
        };
        
        this.renderTasks();
    }

    /**
     * 5.4 Buscar tareas por texto
     * Filtra tareas que contengan el término de búsqueda en título, descripción o categoría.
     */
    searchTasks(e) {
        this.currentSearch = e.target.value.toLowerCase();
        this.renderTasks();
    }

    /**
     * 5.5 Limpiar todos los filtros
     * Restaura filtros a valores por defecto y muestra todas las tareas.
     */
    clearFilters() {
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const tasksSearch = document.getElementById('tasksSearch');
        
        if (filterPriority) filterPriority.value = 'all';
        if (filterStatus) filterStatus.value = 'all';
        if (tasksSearch) tasksSearch.value = '';
        
        this.currentFilter = {
            priority: 'all',
            status: 'all'
        };
        this.currentSearch = '';
        this.renderTasks();
        this.showNotification('Filtros limpiados correctamente', 'info');
    }

    /**
     * 5.6 Renderizar lista de tareas
     * Genera HTML para mostrar tareas filtradas en el contenedor.
     */
    renderTasks() {
        const container = document.getElementById('tasksContainer');
        if (!container) {
            return;
        }

        let filteredTasks = [...this.tasks];

        // Aplicar filtros
        if (this.currentFilter.priority !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === this.currentFilter.priority);
        }

        if (this.currentFilter.status !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === this.currentFilter.status);
        }

        // Aplicar búsqueda
        if (this.currentSearch) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(this.currentSearch) ||
                (task.description && task.description.toLowerCase().includes(this.currentSearch)) ||
                (task.category && task.category.toLowerCase().includes(this.currentSearch))
            );
        }

        if (filteredTasks.length === 0) {
            container.innerHTML = this.getEmptyState();
            // Re-bind el evento del botón en el empty state
            setTimeout(() => {
                const addFirstTask = document.getElementById('addFirstTask');
                if (addFirstTask) {
                    addFirstTask.addEventListener('click', () => this.openTaskModal());
                }
            }, 0);
            return;
        }

        container.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
        
        // Agregar event listeners a los botones de las tarjetas
        this.bindTaskCardEvents();
    }

    /**
     * 5.7 Crear tarjeta HTML para tarea
     * Genera elemento visual con información completa de la tarea.
     */
    createTaskCard(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completada';
        const formattedDate = dueDate ? dueDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }) : 'Sin fecha';
        
        const formattedTime = dueDate ? dueDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        return `
            <div class="task-card task-card--${task.priority} ${task.status === 'completada' ? 'task-card--completed' : ''} ${isOverdue ? 'task-card--overdue' : ''}">
                <div class="task-card__header">
                    <h3 class="task-card__title">${this.escapeHtml(task.title)}</h3>
                    <span class="task-card__priority task-card__priority--${task.priority}">
                        ${task.priority}
                    </span>
                </div>
                
                ${task.description ? `
                    <p class="task-card__description">${this.escapeHtml(task.description)}</p>
                ` : ''}
                
                <div class="task-card__meta">
                    <span class="task-card__status task-card__status--${task.status}">
                        ${task.status.replace('-', ' ')}
                    </span>
                    
                    ${task.category ? `
                        <span class="task-card__category">${this.escapeHtml(task.category)}</span>
                    ` : ''}
                    
                    ${dueDate ? `
                        <div class="task-card__meta-item">
                            <i class="fas fa-calendar-alt task-card__meta-icon"></i>
                            <span class="task-card__due-date ${isOverdue ? 'task-card__due-date--overdue' : ''}">
                                ${formattedDate} ${formattedTime ? `a las ${formattedTime}` : ''}
                            </span>
                        </div>
                    ` : ''}
                    
                    ${task.reminder ? `
                        <div class="task-card__meta-item">
                            <i class="fas fa-bell task-card__meta-icon"></i>
                            <span>Recordatorio</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-card__footer">
                    <div class="task-card__date">
                        Creada: ${new Date(task.createdAt).toLocaleDateString('es-ES')}
                    </div>
                    <div class="task-card__actions">
                        ${task.status !== 'completada' ? `
                            <button class="task-card__action task-card__action--complete" data-task-id="${task.id}" data-action="complete" title="Completar tarea">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="task-card__action task-card__action--restart" data-task-id="${task.id}" data-action="restart" title="Reiniciar tarea">
                                <i class="fas fa-redo"></i>
                            </button>
                        `}
                        <button class="task-card__action task-card__action--edit" data-task-id="${task.id}" data-action="edit" title="Editar tarea">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-card__action task-card__action--delete" data-task-id="${task.id}" data-action="delete" title="Eliminar tarea">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 5.8 Vincular eventos de tarjetas de tareas
     * Asigna listeners a botones de acción dentro de cada tarjeta.
     */
    bindTaskCardEvents() {
        document.querySelectorAll('.task-card__action').forEach(button => {
            button.addEventListener('click', (e) => {
                const taskId = e.currentTarget.dataset.taskId;
                const action = e.currentTarget.dataset.action;
                
                if (!taskId) return;
                
                switch (action) {
                    case 'edit':
                        const task = this.tasks.find(t => t.id === taskId);
                        if (task) this.openTaskModal(task);
                        break;
                    case 'delete':
                        this.showActionModal('delete', taskId);
                        break;
                    case 'complete':
                        this.showActionModal('complete', taskId);
                        break;
                    case 'restart':
                        this.showActionModal('restart', taskId);
                        break;
                }
            });
        });
    }

    /**
     * 5.9 Obtener estado vacío
     * Genera HTML para mostrar cuando no hay tareas que coincidan con los filtros.
     */
    getEmptyState() {
        const hasFilters = this.currentSearch || 
                          this.currentFilter.priority !== 'all' || 
                          this.currentFilter.status !== 'all';
        
        return `
            <div class="empty-state">
                <i class="fas fa-clipboard-list empty-state__icon"></i>
                <h3 class="empty-state__title">${hasFilters ? 'No hay tareas que coincidan' : 'No hay tareas registradas'}</h3>
                <p class="empty-state__description">${hasFilters ? 'Intenta cambiar los filtros o términos de búsqueda' : 'Crea tu primera tarea para comenzar'}</p>
                <button class="btn btn--primary" id="addFirstTask">
                    <i class="fas fa-plus"></i> Crear Tarea
                </button>
            </div>
        `;
    }

    /**
     * 5.10 Actualizar resumen de estadísticas
     * Muestra contadores de tareas por estado en la interfaz.
     */
    updateSummary() {
        const total = this.tasks.length;
        const pending = this.tasks.filter(task => task.status === 'pendiente').length;
        const progress = this.tasks.filter(task => task.status === 'en-progreso').length;
        const completed = this.tasks.filter(task => task.status === 'completada').length;

        const totalTasks = document.getElementById('totalTasks');
        const pendingTasks = document.getElementById('pendingTasks');
        const progressTasks = document.getElementById('progressTasks');
        const completedTasks = document.getElementById('completedTasks');
        
        if (totalTasks) totalTasks.textContent = total;
        if (pendingTasks) pendingTasks.textContent = pending;
        if (progressTasks) progressTasks.textContent = progress;
        if (completedTasks) completedTasks.textContent = completed;
    }

    // =============================================================================
    // 6. SISTEMA DE NOTIFICACIONES
    // =============================================================================

    /**
     * 6.1 Mostrar notificación al usuario
     * Crea notificación visual temporal con mensaje y tipo específico.
     */
    showNotification(message, type = 'info') {
        // Crear contenedor de notificaciones si no existe
        let container = document.getElementById('notificationsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationsContainer';
            container.className = 'notifications';
            document.body.appendChild(container);
        }

        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification__icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification__content">
                <div class="notification__message">${message}</div>
            </div>
            <button class="notification__close">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notification);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('notification--leaving');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);

        // Cerrar al hacer clic en la X
        const closeBtn = notification.querySelector('.notification__close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('notification--leaving');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });
    }

    // =============================================================================
    // 7. PERSISTENCIA EN LOCALSTORAGE
    // =============================================================================

    /**
     * 7.1 Cargar tareas desde localStorage
     * Recupera tareas guardadas y actualiza estado e interfaz.
     */
    loadTasksFromLocalStorage() {
        try {
            const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
            this.tasks = storedTasks;
            this.renderTasks();
            this.updateSummary();
        } catch (error) {
            this.tasks = [];
            this.showNotification('Error al cargar las tareas guardadas', 'error');
        }
    }

    /**
     * 7.2 Guardar tareas en localStorage
     * Persiste lista actual de tareas para recuperación posterior.
     */
    saveTasksToLocalStorage() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            this.showNotification('Error al guardar las tareas', 'error');
        }
    }

    /**
     * 7.3 Escapar HTML para prevenir XSS
     * Convierte caracteres especiales para mostrar texto seguro.
     */
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// =============================================================================
// 8. INICIALIZACIÓN AL CARGAR EL DOM
// =============================================================================

/**
 * 8.1 Inicializar TaskManager cuando el DOM esté listo
 * Crea instancia global y maneja errores críticos.
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.taskManager = new TaskManager();
    } catch (error) {
        // En caso de error crítico, crear una notificación de error
        const errorNotification = document.createElement('div');
        errorNotification.className = 'notification notification--error';
        errorNotification.style.position = 'fixed';
        errorNotification.style.top = '20px';
        errorNotification.style.left = '50%';
        errorNotification.style.transform = 'translateX(-50%)';
        errorNotification.style.zIndex = '9999';
        errorNotification.style.background = '#fef2f2';
        errorNotification.style.color = '#dc2626';
        errorNotification.style.padding = '1rem';
        errorNotification.style.borderRadius = '8px';
        errorNotification.style.border = '1px solid #fecaca';
        errorNotification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-exclamation-circle"></i>
                <span>Error al cargar el sistema de tareas</span>
            </div>
        `;
        document.body.appendChild(errorNotification);
    }
});

// =============================================================================
// 9. ESTILOS CSS PARA NOTIFICACIONES
// =============================================================================

/**
 * 9.1 Estilos CSS para el sistema de notificaciones
 * Se inyectan automáticamente al cargar el módulo.
 */
const notificationStyles = `
.notifications {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1100;
    max-width: 400px;
}

.notification {
    background: white;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    border-left: 4px solid #3b82f6;
    transform: translateX(400px);
    opacity: 0;
    animation: slideIn 0.3s ease forwards;
}

.notification--success {
    border-left-color: #10b981;
}

.notification--error {
    border-left-color: #ef4444;
}

.notification--warning {
    border-left-color: #f59e0b;
}

.notification--info {
    border-left-color: #06b6d4;
}

.notification--leaving {
    animation: slideOut 0.3s ease forwards;
}

.notification__icon {
    font-size: 1.25rem;
}

.notification--success .notification__icon {
    color: #10b981;
}

.notification--error .notification__icon {
    color: #ef4444;
}

.notification--warning .notification__icon {
    color: #f59e0b;
}

.notification--info .notification__icon {
    color: #06b6d4;
}

.notification__content {
    flex: 1;
}

.notification__message {
    font-weight: 500;
}

.notification__close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.notification__close:hover {
    background-color: #f3f4f6;
}

@keyframes slideIn {
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOut {
    to {
        transform: translateX(400px);
        opacity: 0;
    }
}
`;

// =============================================================================
// 10. INYECTAR ESTILOS EN EL DOCUMENTO
// =============================================================================

/**
 * 10.1 Agregar estilos de notificaciones al documento
 * Se asegura de que los estilos estén disponibles para las notificaciones.
 */
if (!document.querySelector('#notification-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'notification-styles';
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
}

// =============================================================================
// 11. EXPORTACIÓN PARA USO EN OTROS MÓDULOS
// =============================================================================

/**
 * 11.1 Exportar TaskManager como módulo por defecto
 * Permite importar la clase en otros archivos de la aplicación.
 */
export default TaskManager;