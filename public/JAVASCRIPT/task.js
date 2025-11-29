// task.js - Gestión de Tareas (Versión definitiva con overlay completo)

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = {
            priority: 'all',
            status: 'all'
        };
        this.currentSearch = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
        console.log('TaskManager inicializado correctamente');
    }

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
        
        // Filtros
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const tasksSearch = document.getElementById('tasksSearch');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        if (filterPriority) {
            filterPriority.addEventListener('change', (e) => this.filterTasks());
        }
        
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => this.filterTasks());
        }
        
        if (tasksSearch) {
            tasksSearch.addEventListener('input', (e) => this.searchTasks(e));
        }
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Cerrar modal con escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeTaskModal();
        });
    }

    // =============================================================================
    // FUNCIONES PRINCIPALES
    // =============================================================================

    loadTasks() {
        console.log('📡 Cargando tareas...');
        this.loadTasksFromLocalStorage();
    }

    openTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        if (!modal) {
            console.error('❌ No se encontró el modal de tareas');
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
        
        // Abrir modal como div normal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        
        // Agregar animación
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
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
        } else {
            document.getElementById('taskDueDate').value = '';
            document.getElementById('taskTime').value = '';
        }
    }

    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        if (modal) {
            // Animación de salida
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
                document.body.style.overflow = ''; // Restaurar scroll
            }, 300);
        }
        const form = document.getElementById('taskForm');
        if (form) {
            form.reset();
        }
    }

    saveTask() {
        const form = document.getElementById('taskForm');
        if (!form) {
            console.error('❌ No se encontró el formulario de tareas');
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
            this.showAlert('El título de la tarea es obligatorio', 'error');
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
                }
            } else {
                taskData.id = this.generateId();
                taskData.createdAt = new Date().toISOString();
                taskData.updatedAt = new Date().toISOString();
                this.tasks.unshift(taskData);
            }

            this.saveTasksToLocalStorage();
            this.renderTasks();
            this.updateSummary();
            
            this.showAlert(
                isEdit ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente', 
                'success'
            );
            this.closeTaskModal();
        } catch (error) {
            console.error('Error guardando tarea:', error);
            this.showAlert('Error al guardar tarea: ' + error.message, 'error');
        }
    }

    deleteTask(taskId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            return;
        }

        try {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasksToLocalStorage();
            this.renderTasks();
            this.updateSummary();
            this.showAlert('Tarea eliminada correctamente', 'success');
        } catch (error) {
            console.error('Error eliminando tarea:', error);
            this.showAlert('Error al eliminar tarea: ' + error.message, 'error');
        }
    }

    toggleTaskStatus(taskId, newStatus) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.status = newStatus;
                task.updatedAt = new Date().toISOString();
                this.saveTasksToLocalStorage();
                this.renderTasks();
                this.updateSummary();
                
                const statusText = newStatus === 'completada' ? 'completada' : 'actualizada';
                this.showAlert(`Tarea ${statusText} correctamente`, 'success');
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            this.showAlert('Error al cambiar estado: ' + error.message, 'error');
        }
    }

    // =============================================================================
    // FUNCIONES DE UI
    // =============================================================================

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

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    filterTasks() {
        const priorityFilter = document.getElementById('filterPriority')?.value || 'all';
        const statusFilter = document.getElementById('filterStatus')?.value || 'all';
        
        this.currentFilter = {
            priority: priorityFilter,
            status: statusFilter
        };
        
        this.renderTasks();
    }

    searchTasks(e) {
        this.currentSearch = e.target.value.toLowerCase();
        this.renderTasks();
    }

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
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        if (!container) {
            console.error('❌ No se encontró el contenedor de tareas');
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
                        ` : ''}
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
                        this.deleteTask(taskId);
                        break;
                    case 'complete':
                        this.toggleTaskStatus(taskId, 'completada');
                        break;
                }
            });
        });
    }

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
    // LOCALSTORAGE
    // =============================================================================

    loadTasksFromLocalStorage() {
        console.log('🔄 Cargando tareas desde localStorage...');
        try {
            const storedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
            this.tasks = storedTasks;
            this.renderTasks();
            this.updateSummary();
            console.log(`✅ ${this.tasks.length} tareas cargadas desde localStorage`);
        } catch (error) {
            console.error('Error cargando tareas desde localStorage:', error);
            this.tasks = [];
        }
    }

    saveTasksToLocalStorage() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error guardando tareas en localStorage:', error);
        }
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showAlert(message, type = 'info') {
        // Usar el sistema de alertas existente
        const alertContainer = document.getElementById('alertContainer');
        if (alertContainer && typeof window.showAlert === 'function') {
            window.showAlert(message, type);
        } else {
            // Fallback básico
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(message);
        }
    }

    // =============================================================================
    // MÉTODOS DE DEBUG
    // =============================================================================

    debug() {
        console.group('🐛 Debug TaskManager');
        console.log('Tareas:', this.tasks);
        console.log('Filtro actual:', this.currentFilter);
        console.log('Búsqueda actual:', this.currentSearch);
        console.log('Elementos DOM encontrados:', {
            tasksContainer: !!document.getElementById('tasksContainer'),
            taskModal: !!document.getElementById('taskModal'),
            addTaskBtn: !!document.getElementById('addTaskBtn')
        });
        console.groupEnd();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 Inicializando módulo de tareas...');
    try {
        window.taskManager = new TaskManager();
        console.log('✅ TaskManager inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar TaskManager:', error);
    }
});

// Exportar para uso en otros módulos
export default TaskManager;