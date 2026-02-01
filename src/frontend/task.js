// =============================================================================
// 1. DEFINICIÓN DE LA CLASE TASKMANAGER - VERSIÓN CON ENDPOINTS CORREGIDOS
// =============================================================================

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = { priority: 'all', status: 'all' };
        this.currentSearch = '';
        this.pendingAction = null;
        this.isSaving = false;
        this.isLoading = false;
        this.activePreloaders = new Set();
        
        // Configuración de API - PUERTO 4000
        this.apiBaseUrl = 'http://localhost:4000/api';
        
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
    // 2. SISTEMA DE PRELOADERS (MANTENIDO IGUAL)
    // =============================================================================

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

    showTaskActionIndicator(taskId, actionType) {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`)?.closest('.task-card');
        if (!taskCard) return null;

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

        setTimeout(() => {
            const progressBar = preloader.querySelector('.clear-tasks-indicator__progress-bar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        }, 100);

        return preloader;
    }

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

        setTimeout(() => {
            this.safeRemovePreloader(preloaderElement);
        }, 1500);
    }

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

        setTimeout(() => {
            this.safeRemovePreloader(preloaderElement);
        }, 2500);
    }

    safeRemovePreloader(preloaderElement) {
        if (!preloaderElement || !preloaderElement.parentNode) return;

        preloaderElement.classList.add('preloader--exiting');
        
        if (preloaderElement.id) {
            this.activePreloaders.delete(preloaderElement.id);
        }
        
        setTimeout(() => {
            if (preloaderElement.parentNode) {
                preloaderElement.parentNode.removeChild(preloaderElement);
            }
        }, 300);
    }

    clearAllPreloaders() {
        this.activePreloaders.forEach(id => {
            const preloader = document.getElementById(id);
            if (preloader) {
                this.safeRemovePreloader(preloader);
            }
        });
        this.activePreloaders.clear();
        
        document.querySelectorAll('.task-card--processing').forEach(card => {
            card.classList.remove('task-card--processing');
        });
    }

    // =============================================================================
    // 3. CONFIGURACIÓN DE EVENTOS (MANTENIDO IGUAL)
    // =============================================================================

    bindEvents() {
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.closest('#addTaskBtn') || target.closest('#addFirstTask')) {
                e.preventDefault();
                if (!this.isLoading) {
                    this.openTaskModal();
                }
                return;
            }
            
            const actionBtn = target.closest('.task-card__action');
            if (actionBtn && !this.isSaving) {
                const taskId = actionBtn.dataset.taskId;
                const action = actionBtn.dataset.action;
                
                if (!taskId) return;
                
                switch (action) {
                    case 'edit':
                        const task = this.tasks.find(t => t._id === taskId);
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
        
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const tasksSearch = document.getElementById('tasksSearch');
        
        if (filterPriority) filterPriority.addEventListener('change', () => this.filterTasks());
        if (filterStatus) filterStatus.addEventListener('change', () => this.filterTasks());
        
        if (tasksSearch) {
            tasksSearch.addEventListener('input', (e) => this.searchTasks(e));
        }
        
        const clearCompletedBtn = document.getElementById('clearCompletedBtn');
        if (clearCompletedBtn) {
            clearCompletedBtn.addEventListener('click', () => {
                if (!this.isSaving) this.showClearCompletedModal();
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeActionModal();
            }
        });
        
        const formFields = ['taskTitle', 'taskDescription', 'taskPriority', 'taskStatus', 'taskDueDate', 'taskTime'];
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.clearFieldError(fieldId));
            }
        });
    }

    // =============================================================================
    // 4. FUNCIONALIDAD PRINCIPAL - ENDPOINTS CORREGIDOS
    // =============================================================================

    /**
     * 4.1 Cargar tareas desde la API
     */
    async loadTasks() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showTasksPreloader();
        
        try {
            console.group('🔍 DEBUG: TaskManager.loadTasks');
            console.log('📡 Llamando API:', `${this.apiBaseUrl}/tasks`);
            
            const response = await fetch(`${this.apiBaseUrl}/tasks`);
            
            // Verificar si la respuesta es HTML en lugar de JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('El servidor respondió con HTML en lugar de JSON');
            }
            
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Respuesta API:', data);
            
            if (data.success) {
                this.tasks = data.tasks || [];
                console.log(`📋 Tareas cargadas: ${this.tasks.length}`);
                
                this.renderTasks();
                this.updateSummary();
                console.log('✅ TaskManager actualizado correctamente');
                
                // NOTIFICAR AL DASHBOARD QUE LAS TAREAS SE ACTUALIZARON
                document.dispatchEvent(new CustomEvent('task-data-updated', {
                    detail: { tasks: this.tasks }
                }));
            } else {
                throw new Error(data.message || 'Error al cargar tareas');
            }
            
            console.groupEnd();
        } catch (error) {
            console.error('❌ Error cargando tareas:', error);
            this.tasks = [];
            
            // Mostrar estado vacío
            const container = document.getElementById('tasksContainer');
            if (container) {
                container.innerHTML = this.getEmptyState();
            }
            
            // Mostrar notificación apropiada
            if (error.message.includes('HTML')) {
                this.showNotification('Error en el servidor de tareas', 'error');
            } else {
                this.showNotification('Error al cargar tareas: ' + error.message, 'error');
            }
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * 4.2 Abrir modal de tarea
     */
    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        if (!modal) return;

        this.clearAllPreloaders();
        this.clearAllFieldErrors();

        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        if (task) {
            title.textContent = 'Editar Tarea';
            this.populateForm(task);
        } else {
            title.textContent = 'Nueva Tarea';
            form.reset();
            document.getElementById('taskId').value = '';
            
            // Establecer fecha mínima como hoy
            const today = new Date().toISOString().split('T')[0];
            const dueDateInput = document.getElementById('taskDueDate');
            if (dueDateInput) {
                dueDateInput.min = today;
                dueDateInput.value = today;
            }
            
            // Establecer hora mínima según la hora actual
            const now = new Date();
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMinute = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHour}:${currentMinute}`;
            
            const timeInput = document.getElementById('taskTime');
            if (timeInput) {
                timeInput.value = currentTime;
                timeInput.min = currentTime;
            }
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    /**
     * 4.3 Rellenar formulario
     */
    populateForm(task) {
        document.getElementById('taskId').value = task._id;
        document.getElementById('taskTitle').value = task.titulo;
        document.getElementById('taskDescription').value = task.descripcion || '';
        document.getElementById('taskPriority').value = task.prioridad;
        document.getElementById('taskStatus').value = task.estado;
        document.getElementById('taskCategory').value = task.categoria || '';
        
        const reminderCheckbox = document.getElementById('taskReminder');
        if (reminderCheckbox) {
            reminderCheckbox.checked = task.recordatorio || false;
        }
        
        if (task.fecha_limite) {
            const dueDate = new Date(task.fecha_limite);
            const dateStr = dueDate.toISOString().split('T')[0];
            document.getElementById('taskDueDate').value = dateStr;
            
            // Establecer fecha mínima como hoy
            const today = new Date().toISOString().split('T')[0];
            const dueDateInput = document.getElementById('taskDueDate');
            if (dueDateInput) {
                dueDateInput.min = today;
            }
            
            const taskTimeInput = document.getElementById('taskTime');
            if (taskTimeInput && task.hora_limite) {
                taskTimeInput.value = task.hora_limite;
                
                // Si la fecha es hoy, establecer hora mínima según hora actual
                if (dateStr === today) {
                    const now = new Date();
                    const currentHour = now.getHours().toString().padStart(2, '0');
                    const currentMinute = now.getMinutes().toString().padStart(2, '0');
                    const currentTime = `${currentHour}:${currentMinute}`;
                    taskTimeInput.min = currentTime;
                } else {
                    taskTimeInput.removeAttribute('min');
                }
            }
        }
    }

    /**
     * 4.4 Cerrar modal
     */
    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        this.isSaving = false;
        this.clearAllFieldErrors();
    }

    // =============================================================================
    // 5. SISTEMA DE VALIDACIÓN MEJORADO CON HORA
    // =============================================================================

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
            animation: fadeIn 0.3s ease-out;
        `;

        field.parentNode.insertBefore(errorElement, field.nextSibling);
        field.style.borderColor = 'var(--danger)';
        field.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    clearFieldError(fieldId) {
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errorElement) {
            errorElement.remove();
        }

        const field = document.getElementById(fieldId);
        if (field) {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    }

    clearAllFieldErrors() {
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => element.remove());

        const fields = ['taskTitle', 'taskDescription', 'taskPriority', 'taskStatus', 'taskDueDate', 'taskTime'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.style.borderColor = '';
                field.style.boxShadow = '';
            }
        });
    }

    validateForm() {
        let isValid = true;
        this.clearAllFieldErrors();

        const title = document.getElementById('taskTitle')?.value.trim();
        if (!title) {
            this.showFieldError('taskTitle', 'El título es obligatorio');
            isValid = false;
        }

        const description = document.getElementById('taskDescription')?.value.trim();
        if (!description) {
            this.showFieldError('taskDescription', 'La descripción es obligatoria');
            isValid = false;
        }

        const priority = document.getElementById('taskPriority')?.value;
        if (!priority) {
            this.showFieldError('taskPriority', 'La prioridad es obligatoria');
            isValid = false;
        }

        const status = document.getElementById('taskStatus')?.value;
        if (!status) {
            this.showFieldError('taskStatus', 'El estado es obligatorio');
            isValid = false;
        }

        const dueDate = document.getElementById('taskDueDate')?.value;
        const dueTime = document.getElementById('taskTime')?.value;
        
        if (!dueDate) {
            this.showFieldError('taskDueDate', 'La fecha de vencimiento es obligatoria');
            isValid = false;
        } else {
            const selectedDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Validar fecha no anterior a hoy
            if (selectedDate < today) {
                this.showFieldError('taskDueDate', 'La fecha no puede ser anterior a hoy');
                isValid = false;
            }
            
            // Validar hora si la fecha es hoy
            if (selectedDate.toDateString() === today.toDateString() && dueTime) {
                const now = new Date();
                const selectedDateTime = new Date(`${dueDate}T${dueTime}`);
                
                // No permitir horas pasadas para hoy
                if (selectedDateTime < now) {
                    this.showFieldError('taskTime', 'La hora no puede ser anterior a la hora actual');
                    isValid = false;
                }
            }
        }

        return isValid;
    }

    /**
     * 5.5 Guardar tarea - ENDPOINT CORREGIDO
     */
    async saveTask() {
        if (this.isSaving) return;
        
        if (!this.validateForm()) {
            return;
        }

        const taskData = this.getFormData();
        this.isSaving = true;
        
        try {
            const preloader = this.showTaskModalPreloader(true);
            
            let response;
            let url;
            
            if (taskData._id) {
                // Editar tarea existente - CORREGIDO
                console.log(`📝 Editando tarea ID: ${taskData._id}`);
                url = `${this.apiBaseUrl}/tasks/${taskData._id}`;
                response = await fetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
            } else {
                // Crear nueva tarea - CORREGIDO
                console.log('📝 Creando nueva tarea');
                url = `${this.apiBaseUrl}/tasks`;
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(taskData)
                });
            }

            // Verificar si es HTML
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                throw new Error('El servidor respondió con HTML. Verifica los endpoints.');
            }

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Error al guardar la tarea');
            }

            this.transformToSuccess(preloader, taskData._id ? 'Tarea actualizada' : 'Tarea creada');
            
            // NOTIFICAR AL DASHBOARD QUE SE CREÓ/EDITÓ UNA TAREA
            if (taskData._id) {
                document.dispatchEvent(new CustomEvent('task-updated', {
                    detail: { taskId: taskData._id, task: taskData }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('task-created', {
                    detail: { task: data.task || taskData }
                }));
            }
            
            // Forzar actualización inmediata en dashboard
            if (typeof window.forceDashboardTasksUpdate === 'function') {
                window.forceDashboardTasksUpdate();
            }
            
            setTimeout(() => {
                this.loadTasks();
                this.closeTaskModal();
            }, 1500);
            
        } catch (error) {
            console.error('❌ Error guardando:', error);
            const preloader = document.querySelector('.modal-preloader');
            if (preloader) {
                this.transformToError(preloader, error.message || 'Error al guardar');
            }
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * 5.6 Obtener datos del formulario
     */
    getFormData() {
        const dueDate = this.getDueDate();
        const dueDateObj = dueDate ? new Date(dueDate) : null;
        
        return {
            _id: document.getElementById('taskId')?.value || null,
            titulo: document.getElementById('taskTitle')?.value.trim() || '',
            descripcion: document.getElementById('taskDescription')?.value.trim() || '',
            prioridad: document.getElementById('taskPriority')?.value || 'media',
            estado: document.getElementById('taskStatus')?.value || 'pendiente',
            categoria: document.getElementById('taskCategory')?.value.trim() || '',
            recordatorio: document.getElementById('taskReminder')?.checked || false,
            fecha_limite: dueDate,
            hora_limite: dueDateObj ? dueDateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''
        };
    }

    // =============================================================================
    // 6. SISTEMA DE ACCIONES - ENDPOINTS COMPLETAMENTE CORREGIDOS
    // =============================================================================

    showActionModal(actionType, taskId) {
        const modal = document.getElementById('actionModal');
        if (!modal) return;

        const configs = {
            delete: {
                title: 'Eliminar Tarea',
                message: '¿Estás seguro de eliminar esta tarea? Esta acción no se puede deshacer.',
                icon: 'fas fa-trash-alt',
                btnClass: 'btn--danger',
                btnText: 'Eliminar Permanentemente'
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
                message: '¿Eliminar permanentemente todas las tareas completadas? Esta acción no se puede deshacer.',
                icon: 'fas fa-broom',
                btnClass: 'btn--warning',
                btnText: 'Limpiar Permanentemente'
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
        const completedTasks = this.tasks.filter(t => t.estado === 'completada');
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

    /**
     * 6.1 Ejecutar acción pendiente - ENDPOINTS COMPLETAMENTE CORREGIDOS
     * CORRECCIÓN: Se eliminaron los endpoints con /status que no existen
     * Ahora se usa PUT al endpoint principal de tareas con el estado actualizado
     */
    async executePendingAction() {
        if (!this.pendingAction || this.isSaving) return;
        
        this.isSaving = true;
        const { type, taskId } = this.pendingAction;
        
        try {
            const preloader = this.showConfirmationPreloader();
            
            let response;
            let url;
            
            switch (type) {
                case 'delete':
                    // Endpoint: DELETE /api/tasks/:id
                    url = `${this.apiBaseUrl}/tasks/${taskId}`;
                    console.log(`🗑️  Eliminando tarea: ${url}`);
                    response = await fetch(url, { 
                        method: 'DELETE' 
                    });
                    
                    // NOTIFICAR AL DASHBOARD QUE SE ELIMINÓ UNA TAREA
                    document.dispatchEvent(new CustomEvent('task-deleted', {
                        detail: { taskId }
                    }));
                    break;
                    
                case 'complete':
                    // Endpoint: PUT /api/tasks/:id con estado "completada"
                    url = `${this.apiBaseUrl}/tasks/${taskId}`;
                    console.log(`✅ Completando tarea: ${url}`);
                    // Primero obtenemos la tarea actual
                    const completeTask = this.tasks.find(t => t._id === taskId);
                    if (!completeTask) {
                        throw new Error('Tarea no encontrada');
                    }
                    response = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            ...completeTask, // Mantenemos todos los datos existentes
                            estado: 'completada', // Solo cambiamos el estado
                            updatedAt: new Date().toISOString()
                        })
                    });
                    
                    // NOTIFICAR AL DASHBOARD QUE SE ACTUALIZÓ UNA TAREA
                    document.dispatchEvent(new CustomEvent('task-updated', {
                        detail: { taskId, task: { ...completeTask, estado: 'completada' } }
                    }));
                    break;
                    
                case 'restart':
                    // Endpoint: PUT /api/tasks/:id con estado "pendiente"
                    url = `${this.apiBaseUrl}/tasks/${taskId}`;
                    console.log(`🔄 Reiniciando tarea: ${url}`);
                    // Primero obtenemos la tarea actual
                    const restartTask = this.tasks.find(t => t._id === taskId);
                    if (!restartTask) {
                        throw new Error('Tarea no encontrada');
                    }
                    response = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            ...restartTask, // Mantenemos todos los datos existentes
                            estado: 'pendiente', // Solo cambiamos el estado
                            updatedAt: new Date().toISOString()
                        })
                    });
                    
                    // NOTIFICAR AL DASHBOARD QUE SE ACTUALIZÓ UNA TAREA
                    document.dispatchEvent(new CustomEvent('task-updated', {
                        detail: { taskId, task: { ...restartTask, estado: 'pendiente' } }
                    }));
                    break;
                    
                case 'clearCompleted':
                    // Endpoint: DELETE /api/tasks/completed
                    url = `${this.apiBaseUrl}/tasks/completed`;
                    console.log(`🧹 Limpiando completadas: ${url}`);
                    response = await fetch(url, { 
                        method: 'DELETE' 
                    });
                    
                    // NOTIFICAR AL DASHBOARD QUE SE ELIMINARON TAREAS
                    document.dispatchEvent(new CustomEvent('tasks-cleared', {
                        detail: { count: this.tasks.filter(t => t.estado === 'completada').length }
                    }));
                    break;
                    
                default:
                    throw new Error(`Tipo de acción no válido: ${type}`);
            }

            if (!response) {
                throw new Error('No se recibió respuesta del servidor');
            }

            // Verificar si es HTML
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const htmlResponse = await response.text();
                console.error('❌ El servidor respondió con HTML:', htmlResponse.substring(0, 500));
                throw new Error(`Endpoint no encontrado o error en el servidor: ${url}`);
            }

            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.message || `Error en ${type}`);
            }
            
            this.transformToSuccess(preloader, 'Acción completada exitosamente');
            
            // Forzar actualización inmediata en dashboard
            if (typeof window.forceDashboardTasksUpdate === 'function') {
                window.forceDashboardTasksUpdate();
            }
            
            setTimeout(() => {
                this.closeActionModal();
                this.loadTasks();
            }, 1200);
            
        } catch (error) {
            console.error('❌ Error ejecutando acción:', error);
            const preloader = document.querySelector('.confirmation-preloader');
            if (preloader) {
                this.transformToError(preloader, error.message || 'Error en la acción');
            }
            this.showNotification(error.message, 'error');
        } finally {
            this.isSaving = false;
            this.pendingAction = null;
        }
    }

    // =============================================================================
    // 7. FUNCIONALIDADES AUXILIARES
    // =============================================================================

    getDueDate() {
        const dateInput = document.getElementById('taskDueDate');
        const timeInput = document.getElementById('taskTime');
        
        if (!dateInput || !dateInput.value) return null;
        
        const date = dateInput.value;
        
        if (timeInput && timeInput.value) {
            // Si hay hora, combinamos fecha y hora
            return new Date(`${date}T${timeInput.value}`).toISOString();
        }
        // Si no hay hora, usamos fin de día
        return new Date(`${date}T23:59:59`).toISOString();
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
            if (this.currentFilter.priority !== 'all' && task.prioridad !== this.currentFilter.priority) return false;
            if (this.currentFilter.status !== 'all' && task.estado !== this.currentFilter.status) return false;
            if (this.currentSearch && 
                !task.titulo.toLowerCase().includes(this.currentSearch) &&
                !(task.descripcion && task.descripcion.toLowerCase().includes(this.currentSearch)) &&
                !(task.categoria && task.categoria.toLowerCase().includes(this.currentSearch))) return false;
            return true;
        });

        if (filteredTasks.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const dueDate = task.fecha_limite ? new Date(task.fecha_limite) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.estado !== 'completada';
        const formattedDate = dueDate ? dueDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';
        const formattedTime = task.hora_limite || (dueDate ? dueDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '');

        return `
            <div class="task-card task-card--${task.prioridad} ${task.estado === 'completada' ? 'task-card--completed' : ''}" data-task-id="${task._id}">
                <div class="task-card__header">
                    <h3 class="task-card__title">${this.escapeHtml(task.titulo)}</h3>
                    <span class="task-card__priority task-card__priority--${task.prioridad}">
                        ${task.prioridad}
                    </span>
                </div>
                
                ${task.descripcion ? `<p class="task-card__description">${this.escapeHtml(task.descripcion)}</p>` : ''}
                
                <div class="task-card__meta">
                    <span class="task-card__status task-card__status--${task.estado}">
                        ${task.estado.replace('-', ' ')}
                    </span>
                    
                    ${task.categoria ? `<span class="task-card__category">${this.escapeHtml(task.categoria)}</span>` : ''}
                    
                    ${dueDate ? `
                        <div class="task-card__meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span class="task-card__due-date ${isOverdue ? 'task-card__due-date--overdue' : ''}">
                                ${formattedDate} ${formattedTime ? `a las ${formattedTime}` : ''}
                            </span>
                        </div>
                    ` : ''}
                    
                    ${task.recordatorio ? `
                        <div class="task-card__meta-item">
                            <i class="fas fa-bell"></i>
                            <span>Recordatorio</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="task-card__footer">
                    <div class="task-card__date">
                        Creada: ${new Date(task.createdAt || task.fecha_creacion).toLocaleDateString('es-ES')}
                    </div>
                    <div class="task-card__actions">
                        ${task.estado !== 'completada' ? `
                            <button class="task-card__action task-card__action--complete" data-task-id="${task._id}" data-action="complete" title="Completar">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="task-card__action task-card__action--restart" data-task-id="${task._id}" data-action="restart" title="Reiniciar">
                                <i class="fas fa-redo"></i>
                            </button>
                        `}
                        <button class="task-card__action task-card__action--edit" data-task-id="${task._id}" data-action="edit" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-card__action task-card__action--delete" data-task-id="${task._id}" data-action="delete" title="Eliminar">
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
            <div class="empty-state empty-state--center">
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
        const pending = this.tasks.filter(t => t.estado === 'pendiente').length;
        const progress = this.tasks.filter(t => t.estado === 'en-progreso').length;
        const completed = this.tasks.filter(t => t.estado === 'completada').length;

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