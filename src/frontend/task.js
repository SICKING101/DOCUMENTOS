// =============================================================================
// 1. DEFINICIÓN DE LA CLASE TASKMANAGER - VERSIÓN OPTIMIZADA
// =============================================================================

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = { priority: 'all', status: 'all' };
        this.currentSearch = '';
        this.pendingAction = null;
        this.isSaving = false;
        this.isLoading = false;
        this.activePreloaders = new Set(); // Para rastrear preloaders activos
        
        this.init();
    }

    /**
     * 1.1 Inicialización optimizada
     */
    init() {
        this.bindEvents();
        this.loadTasks();
    }

    // =============================================================================
    // 2. SISTEMA DE PRELOADERS PROFESIONALES Y OPTIMIZADOS
    // =============================================================================

    /**
     * 2.1 Mostrar preloader elegante para carga de tareas
     */
    showTasksPreloader() {
        const container = document.getElementById('tasksContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="tasks-preloader">
                <div class="tasks-preloader__content">
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
            </div>
        `;
    }

    /**
     * 2.2 Mostrar preloader sutil para el modal
     */
    showTaskModalPreloader(isSaving = false) {
        const modalContent = document.querySelector('#taskModal .modal__content');
        if (!modalContent) return null;

        const preloaderId = `modal-preloader-${Date.now()}`;
        const preloader = document.createElement('div');
        preloader.id = preloaderId;
        preloader.className = 'modal-preloader';
        preloader.innerHTML = `
            <div class="modal-preloader__content">
                <div class="modal-preloader__spinner">
                    <div class="smooth-spinner"></div>
                </div>
                <div class="modal-preloader__text">
                    <p class="modal-preloader__message">${isSaving ? 'Guardando tu tarea...' : 'Preparando formulario...'}</p>
                    ${isSaving ? '<div class="modal-preloader__progress"><div class="modal-preloader__progress-bar"></div></div>' : ''}
                </div>
            </div>
        `;

        modalContent.style.position = 'relative';
        modalContent.appendChild(preloader);
        this.activePreloaders.add(preloaderId);

        // Animación de progreso si está guardando
        if (isSaving) {
            setTimeout(() => {
                const progressBar = preloader.querySelector('.modal-preloader__progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
            }, 100);
        }

        return preloader;
    }

    /**
     * 2.3 Mostrar indicador sutil de acción en tarjeta
     */
    showTaskActionIndicator(taskId, actionType) {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`)?.closest('.task-card');
        if (!taskCard) return null;

        // Configuración minimalista
        const config = {
            delete: { icon: 'fas fa-trash', className: 'action-indicator--delete' },
            complete: { icon: 'fas fa-check', className: 'action-indicator--complete' },
            restart: { icon: 'fas fa-redo', className: 'action-indicator--restart' },
            edit: { icon: 'fas fa-edit', className: 'action-indicator--edit' }
        }[actionType] || { icon: 'fas fa-spinner', className: 'action-indicator--default' };

        const indicatorId = `action-indicator-${taskId}`;
        const indicator = document.createElement('div');
        indicator.id = indicatorId;
        indicator.className = `task-action-indicator ${config.className}`;
        indicator.innerHTML = `
            <div class="task-action-indicator__content">
                <i class="${config.icon} task-action-indicator__icon"></i>
                <div class="task-action-indicator__dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;

        taskCard.classList.add('task-card--processing');
        taskCard.appendChild(indicator);
        this.activePreloaders.add(indicatorId);

        return indicator;
    }

    /**
     * 2.4 Mostrar preloader elegante de confirmación
     */
    showConfirmationPreloader() {
        const modalContent = document.querySelector('#actionModal .modal__content');
        if (!modalContent) return null;

        const preloaderId = `confirm-preloader-${Date.now()}`;
        const preloader = document.createElement('div');
        preloader.id = preloaderId;
        preloader.className = 'confirmation-preloader';
        preloader.innerHTML = `
            <div class="confirmation-preloader__content">
                <div class="confirmation-preloader__spinner">
                    <div class="spinner-ring"></div>
                </div>
                <p class="confirmation-preloader__text">Procesando tu solicitud</p>
            </div>
        `;

        modalContent.style.position = 'relative';
        modalContent.appendChild(preloader);
        this.activePreloaders.add(preloaderId);

        return preloader;
    }

    /**
     * 2.5 Mostrar indicador de limpieza elegante
     */
    showClearTasksIndicator(count) {
        const preloaderId = `clear-indicator-${Date.now()}`;
        const preloader = document.createElement('div');
        preloader.id = preloaderId;
        preloader.className = 'clear-tasks-indicator';
        preloader.innerHTML = `
            <div class="clear-tasks-indicator__content">
                <div class="clear-tasks-indicator__header">
                    <i class="fas fa-spinner fa-spin clear-tasks-indicator__icon"></i>
                    <h4 class="clear-tasks-indicator__title">Limpiando tareas completadas</h4>
                </div>
                <div class="clear-tasks-indicator__body">
                    <div class="clear-tasks-indicator__count">${count} tareas</div>
                    <div class="clear-tasks-indicator__progress">
                        <div class="clear-tasks-indicator__progress-bar"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(preloader);
        this.activePreloaders.add(preloaderId);

        // Animar barra de progreso
        setTimeout(() => {
            const progressBar = preloader.querySelector('.clear-tasks-indicator__progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        }, 100);

        return preloader;
    }

    /**
     * 2.6 Transformar preloader a estado de éxito
     */
    transformToSuccess(preloaderElement, message) {
        if (!preloaderElement) return;

        preloaderElement.innerHTML = `
            <div class="success-state-animation">
                <div class="success-state-animation__icon">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                        <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                <div class="success-state-animation__content">
                    <p class="success-state-animation__message">${message}</p>
                </div>
            </div>
        `;

        // Auto-remover después de 1.5 segundos
        setTimeout(() => {
            this.safeRemovePreloader(preloaderElement);
        }, 1500);
    }

    /**
     * 2.7 Transformar preloader a estado de error
     */
    transformToError(preloaderElement, errorMessage) {
        if (!preloaderElement) return;

        preloaderElement.innerHTML = `
            <div class="error-state-animation">
                <div class="error-state-animation__icon">
                    <i class="fas fa-exclamation"></i>
                </div>
                <div class="error-state-animation__content">
                    <p class="error-state-animation__message">${errorMessage}</p>
                </div>
            </div>
        `;

        // Auto-remover después de 2.5 segundos
        setTimeout(() => {
            this.safeRemovePreloader(preloaderElement);
        }, 2500);
    }

    /**
     * 2.8 Remover preloader de forma segura
     */
    safeRemovePreloader(preloaderElement) {
        if (!preloaderElement || !preloaderElement.parentNode) return;

        // Agregar clase de salida
        preloaderElement.classList.add('preloader--exiting');
        
        // Remover del registro de preloaders activos
        if (preloaderElement.id) {
            this.activePreloaders.delete(preloaderElement.id);
        }
        
        // Remover del DOM después de la animación
        setTimeout(() => {
            if (preloaderElement.parentNode) {
                preloaderElement.parentNode.removeChild(preloaderElement);
            }
        }, 300);
    }

    /**
     * 2.9 Limpiar todos los preloaders activos
     */
    clearAllPreloaders() {
        this.activePreloaders.forEach(id => {
            const preloader = document.getElementById(id);
            if (preloader) {
                this.safeRemovePreloader(preloader);
            }
        });
        this.activePreloaders.clear();
        
        // También limpiar cualquier tarjeta en estado de procesamiento
        document.querySelectorAll('.task-card--processing').forEach(card => {
            card.classList.remove('task-card--processing');
        });
    }

    // =============================================================================
    // 3. CONFIGURACIÓN DE EVENTOS OPTIMIZADA
    // =============================================================================

    bindEvents() {
        // Event delegation para botones principales
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Botón de nueva tarea
            if (target.closest('#addTaskBtn') || target.closest('#addFirstTask')) {
                e.preventDefault();
                if (!this.isLoading) {
                    this.openTaskModal();
                }
                return;
            }
            
            // Acciones en tarjetas de tareas
            const actionBtn = target.closest('.task-card__action');
            if (actionBtn && !this.isSaving) {
                const taskId = actionBtn.dataset.taskId;
                const action = actionBtn.dataset.action;
                
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
            }
        });

        // Modal de tareas
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        const cancelTaskBtn = document.getElementById('cancelTaskBtn');
        const closeTaskModal = document.getElementById('closeTaskModal');
        const taskModal = document.getElementById('taskModal');
        
        if (saveTaskBtn) {
            saveTaskBtn.addEventListener('click', () => {
                if (!this.isSaving) this.saveTask();
            });
        }
        
        if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', () => this.closeTaskModal());
        if (closeTaskModal) closeTaskModal.addEventListener('click', () => this.closeTaskModal());
        
        if (taskModal) {
            taskModal.addEventListener('click', (e) => {
                if (e.target === taskModal) this.closeTaskModal();
            });
        }
        
        // Modal de acciones
        const confirmActionBtn = document.getElementById('confirmActionBtn');
        const cancelActionBtn = document.getElementById('cancelActionBtn');
        const closeActionModal = document.getElementById('closeActionModal');
        const actionModal = document.getElementById('actionModal');
        
        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', () => {
                if (!this.isSaving) this.executePendingAction();
            });
        }
        
        if (cancelActionBtn) cancelActionBtn.addEventListener('click', () => this.closeActionModal());
        if (closeActionModal) closeActionModal.addEventListener('click', () => this.closeActionModal());
        
        if (actionModal) {
            actionModal.addEventListener('click', (e) => {
                if (e.target === actionModal) this.closeActionModal();
            });
        }
        
        // Filtros y búsqueda
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const tasksSearch = document.getElementById('tasksSearch');
        
        if (filterPriority) filterPriority.addEventListener('change', () => this.filterTasks());
        if (filterStatus) filterStatus.addEventListener('change', () => this.filterTasks());
        
        if (tasksSearch) {
            tasksSearch.addEventListener('input', (e) => this.searchTasks(e));
        }
        
        // Botón para limpiar tareas completadas
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', () => {
                if (!this.isSaving) this.showClearCompletedModal();
            });
        }
        
        // Cerrar modales con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeActionModal();
            }
        });
    }

    // =============================================================================
    // 4. FUNCIONALIDAD PRINCIPAL OPTIMIZADA
    // =============================================================================

    loadTasks() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showTasksPreloader();
        
        setTimeout(() => {
            try {
                this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
                this.renderTasks();
                this.updateSummary();
            } catch (error) {
                this.tasks = [];
                console.error('Error cargando tareas:', error);
            } finally {
                this.isLoading = false;
            }
        }, 600);
    }

    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        if (!modal) return;

        this.clearAllPreloaders();

        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        if (task) {
            title.textContent = 'Editar Tarea';
            this.populateForm(task);
        } else {
            title.textContent = 'Nueva Tarea';
            form.reset();
            document.getElementById('taskId').value = '';
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('taskDueDate').min = today;
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

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
        this.isSaving = false;
    }

    async saveTask() {
        if (this.isSaving) return;
        
        const form = document.getElementById('taskForm');
        if (!form || !form.checkValidity()) {
            form?.reportValidity();
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

        if (!taskData.title) {
            this.showNotification('El título es obligatorio', 'warning');
            return;
        }

        this.isSaving = true;
        
        try {
            const preloader = this.showTaskModalPreloader(true);
            
            // Simular proceso asíncrono
            await new Promise(resolve => setTimeout(resolve, 800));

            if (taskData.id) {
                // Editar
                const index = this.tasks.findIndex(t => t.id === taskData.id);
                if (index !== -1) {
                    this.tasks[index] = { ...this.tasks[index], ...taskData, updatedAt: new Date().toISOString() };
                    this.transformToSuccess(preloader, 'Tarea actualizada');
                }
            } else {
                // Crear nueva
                taskData.id = this.generateId();
                taskData.createdAt = new Date().toISOString();
                taskData.updatedAt = taskData.createdAt;
                this.tasks.unshift(taskData);
                this.transformToSuccess(preloader, 'Tarea creada');
            }

            this.saveTasksToLocalStorage();
            
            setTimeout(() => {
                this.renderTasks();
                this.updateSummary();
                this.closeTaskModal();
            }, 1500);
            
        } catch (error) {
            console.error('Error guardando:', error);
            const preloader = document.querySelector('.modal-preloader');
            if (preloader) {
                this.transformToError(preloader, 'Error al guardar');
            }
        } finally {
            this.isSaving = false;
        }
    }

    // =============================================================================
    // 5. SISTEMA DE ACCIONES Y CONFIRMACIONES
    // =============================================================================

    showActionModal(actionType, taskId) {
        const modal = document.getElementById('actionModal');
        if (!modal) return;

        const configs = {
            delete: {
                title: 'Eliminar Tarea',
                message: '¿Estás seguro de eliminar esta tarea?',
                icon: 'fas fa-trash-alt',
                btnClass: 'btn--danger',
                btnText: 'Eliminar'
            },
            complete: {
                title: 'Completar Tarea',
                message: '¿Marcar como completada?',
                icon: 'fas fa-check-circle',
                btnClass: 'btn--success',
                btnText: 'Completar'
            },
            restart: {
                title: 'Reiniciar Tarea',
                message: '¿Volver a marcar como pendiente?',
                icon: 'fas fa-redo-alt',
                btnClass: 'btn--primary',
                btnText: 'Reiniciar'
            },
            clearCompleted: {
                title: 'Limpiar Completadas',
                message: '¿Eliminar todas las tareas completadas?',
                icon: 'fas fa-broom',
                btnClass: 'btn--warning',
                btnText: 'Limpiar'
            }
        };

        const config = configs[actionType] || configs.delete;
        
        document.getElementById('actionModalTitle').textContent = config.title;
        document.getElementById('actionModalMessage').textContent = config.message;
        
        const icon = document.getElementById('actionModalIcon');
        icon.innerHTML = `<i class="${config.icon}"></i>`;
        icon.className = `action-modal__icon action-modal__icon--${actionType}`;
        
        const confirmBtn = document.getElementById('confirmActionBtn');
        confirmBtn.className = `btn ${config.btnClass}`;
        confirmBtn.textContent = config.btnText;
        
        this.pendingAction = { type: actionType, taskId };
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    showClearCompletedModal() {
        const completedTasks = this.tasks.filter(t => t.status === 'completada');
        if (completedTasks.length === 0) {
            this.showNotification('No hay tareas completadas', 'info');
            return;
        }
        this.showActionModal('clearCompleted');
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
        if (!this.pendingAction || this.isSaving) return;
        
        this.isSaving = true;
        const { type, taskId } = this.pendingAction;
        
        try {
            const preloader = this.showConfirmationPreloader();
            
            await new Promise(resolve => setTimeout(resolve, 700));

            switch (type) {
                case 'delete':
                    await this.deleteTask(taskId);
                    break;
                case 'complete':
                    await this.toggleTaskStatus(taskId, 'completada');
                    break;
                case 'restart':
                    await this.toggleTaskStatus(taskId, 'pendiente');
                    break;
                case 'clearCompleted':
                    await this.clearCompletedTasks();
                    break;
            }
            
            this.transformToSuccess(preloader, 'Acción completada');
            setTimeout(() => this.closeActionModal(), 1200);
            
        } catch (error) {
            console.error('Error ejecutando acción:', error);
            const preloader = document.querySelector('.confirmation-preloader');
            if (preloader) {
                this.transformToError(preloader, 'Error en la acción');
            }
        } finally {
            this.isSaving = false;
        }
    }

    async deleteTask(taskId) {
        try {
            const indicator = this.showTaskActionIndicator(taskId, 'delete');
            
            await new Promise(resolve => setTimeout(resolve, 600));

            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasksToLocalStorage();
            
            this.safeRemovePreloader(indicator);
            this.renderTasks();
            this.updateSummary();
            
        } catch (error) {
            console.error('Error eliminando:', error);
            this.clearAllPreloaders();
        }
    }

    async toggleTaskStatus(taskId, newStatus) {
        try {
            const actionType = newStatus === 'completada' ? 'complete' : 'restart';
            const indicator = this.showTaskActionIndicator(taskId, actionType);
            
            await new Promise(resolve => setTimeout(resolve, 500));

            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = newStatus;
                task.updatedAt = new Date().toISOString();
                this.saveTasksToLocalStorage();
                
                this.safeRemovePreloader(indicator);
                this.renderTasks();
                this.updateSummary();
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            this.clearAllPreloaders();
        }
    }

    async clearCompletedTasks() {
        try {
            const completedTasks = this.tasks.filter(t => t.status === 'completada');
            const count = completedTasks.length;
            
            if (count === 0) return;
            
            const indicator = this.showClearTasksIndicator(count);
            
            await new Promise(resolve => setTimeout(resolve, 1200));

            this.tasks = this.tasks.filter(t => t.status !== 'completada');
            this.saveTasksToLocalStorage();
            
            this.transformToSuccess(indicator, `${count} tareas eliminadas`);
            
            setTimeout(() => {
                this.renderTasks();
                this.updateSummary();
            }, 1500);
            
        } catch (error) {
            console.error('Error limpiando:', error);
            this.clearAllPreloaders();
        }
    }

    // =============================================================================
    // 6. FUNCIONALIDADES AUXILIARES
    // =============================================================================

    getDueDate() {
        const date = document.getElementById('taskDueDate')?.value;
        const time = document.getElementById('taskTime')?.value;
        
        if (!date) return null;
        
        if (time) {
            return new Date(`${date}T${time}`).toISOString();
        }
        return new Date(date + 'T23:59:59').toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    filterTasks() {
        const container = document.getElementById('tasksContainer');
        if (container) {
            container.style.opacity = '0.5';
            container.style.transition = 'opacity 0.3s';
        }

        this.currentFilter = {
            priority: document.getElementById('filterPriority')?.value || 'all',
            status: document.getElementById('filterStatus')?.value || 'all'
        };
        
        setTimeout(() => {
            this.renderTasks();
            if (container) container.style.opacity = '1';
        }, 300);
    }

    searchTasks(e) {
        const container = document.getElementById('tasksContainer');
        if (container) {
            container.style.opacity = '0.5';
        }

        this.currentSearch = e.target.value.toLowerCase();
        
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.renderTasks();
            if (container) container.style.opacity = '1';
        }, 500);
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        if (!container) return;

        let filteredTasks = this.tasks.filter(task => {
            if (this.currentFilter.priority !== 'all' && task.priority !== this.currentFilter.priority) return false;
            if (this.currentFilter.status !== 'all' && task.status !== this.currentFilter.status) return false;
            if (this.currentSearch && !task.title.toLowerCase().includes(this.currentSearch) &&
                !(task.description && task.description.toLowerCase().includes(this.currentSearch)) &&
                !(task.category && task.category.toLowerCase().includes(this.currentSearch))) return false;
            return true;
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completada';
        const formattedDate = dueDate ? dueDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';
        const formattedTime = dueDate ? dueDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

        return `
            <div class="task-card task-card--${task.priority} ${task.status === 'completada' ? 'task-card--completed' : ''}" data-task-id="${task.id}">
                <div class="task-card__header">
                    <h3 class="task-card__title">${this.escapeHtml(task.title)}</h3>
                    <span class="task-card__priority task-card__priority--${task.priority}">
                        ${task.priority}
                    </span>
                </div>
                
                ${task.description ? `<p class="task-card__description">${this.escapeHtml(task.description)}</p>` : ''}
                
                <div class="task-card__meta">
                    <span class="task-card__status task-card__status--${task.status}">
                        ${task.status.replace('-', ' ')}
                    </span>
                    
                    ${task.category ? `<span class="task-card__category">${this.escapeHtml(task.category)}</span>` : ''}
                    
                    ${dueDate ? `
                        <div class="task-card__meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span class="task-card__due-date ${isOverdue ? 'task-card__due-date--overdue' : ''}">
                                ${formattedDate} ${formattedTime ? `a las ${formattedTime}` : ''}
                            </span>
                        </div>
                    ` : ''}
                    
                    ${task.reminder ? `
                        <div class="task-card__meta-item">
                            <i class="fas fa-bell"></i>
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
                            <button class="task-card__action task-card__action--complete" data-task-id="${task.id}" data-action="complete" title="Completar">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="task-card__action task-card__action--restart" data-task-id="${task.id}" data-action="restart" title="Reiniciar">
                                <i class="fas fa-redo"></i>
                            </button>
                        `}
                        <button class="task-card__action task-card__action--edit" data-task-id="${task.id}" data-action="edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-card__action task-card__action--delete" data-task-id="${task.id}" data-action="delete" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyState() {
        const hasFilters = this.currentSearch || this.currentFilter.priority !== 'all' || this.currentFilter.status !== 'all';
        
        return `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>${hasFilters ? 'No hay tareas que coincidan' : 'No hay tareas registradas'}</h3>
                <p class="empty-state__description">${hasFilters ? 'Intenta cambiar los filtros' : 'Crea tu primera tarea'}</p>
                <button class="btn btn--primary" id="addFirstTask">
                    <i class="fas fa-plus"></i> Crear Tarea
                </button>
            </div>
        `;
    }

    updateSummary() {
        const total = this.tasks.length;
        const pending = this.tasks.filter(t => t.status === 'pendiente').length;
        const progress = this.tasks.filter(t => t.status === 'en-progreso').length;
        const completed = this.tasks.filter(t => t.status === 'completada').length;

        const elements = ['totalTasks', 'pendingTasks', 'progressTasks', 'completedTasks'];
        const values = [total, pending, progress, completed];
        
        elements.forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) element.textContent = values[index];
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer') || (() => {
            const div = document.createElement('div');
            div.id = 'notificationsContainer';
            div.className = 'notifications';
            document.body.appendChild(div);
            return div;
        })();

        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification__close"><i class="fas fa-times"></i></button>
        `;

        container.appendChild(notification);

        setTimeout(() => notification.classList.add('notification--show'), 10);
        
        setTimeout(() => {
            notification.classList.remove('notification--show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        notification.querySelector('.notification__close').addEventListener('click', () => {
            notification.classList.remove('notification--show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    saveTasksToLocalStorage() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});

export default TaskManager;