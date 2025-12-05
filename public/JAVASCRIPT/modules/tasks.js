// modules/tasks.js - Gestión de Tareas (Versión Definitiva Integrada)

// Configuración visual para la barra lateral
const TAG_CONFIG = {
    'urgent':   { colorClass: 'taskbar__item--urgent',   icon: 'fa-exclamation-triangle', label: 'Urgente' },
    'work':     { colorClass: 'taskbar__item--work',     icon: 'fa-briefcase',            label: 'Trabajo' },
    'personal': { colorClass: 'taskbar__item--personal', icon: 'fa-home',                 label: 'Personal' },
    'study':    { colorClass: 'taskbar__item--study',    icon: 'fa-book',                 label: 'Estudio' },
    'default':  { colorClass: 'taskbar__item--default',  icon: 'fa-sticky-note',          label: 'General' }
};

class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = { priority: 'all', status: 'all' };
        this.currentSearch = '';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTasks();
        console.log('✅ TaskManager inicializado correctamente');
    }

    bindEvents() {
        // --- 1. BOTONES DE APERTURA ---
        const addTaskBtn = document.getElementById('addTaskBtn');
        const addFirstTask = document.getElementById('addFirstTask');
        
        if (addTaskBtn) addTaskBtn.addEventListener('click', () => this.openTaskModal());
        if (addFirstTask) addFirstTask.addEventListener('click', () => this.openTaskModal());
        
        // --- 2. MODAL DE CREAR/EDITAR (taskModal) ---
        const saveTaskBtn = document.getElementById('saveTaskBtn');
        const cancelTaskBtn = document.getElementById('cancelTaskBtn');
        const closeTaskModalBtn = document.querySelector('[data-close-modal="addTaskModal"]'); // Busca por data-attribute
        
        if (saveTaskBtn) saveTaskBtn.addEventListener('click', () => this.saveTask());
        if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', () => this.closeTaskModal());
        if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', () => this.closeTaskModal());
        
        // --- 3. MODAL DE VER DETALLES (viewTaskModal) - AQUÍ ARREGLAMOS EL BUG ---
        const closeViewBtn = document.querySelector('[data-close-modal="viewTaskModal"]');
        const viewModal = document.getElementById('viewTaskModal');
        
        if (closeViewBtn) {
            closeViewBtn.addEventListener('click', () => this.closeViewTaskModal());
        }

        // Acciones dentro del modal de vista
        const deleteBtn = document.getElementById('deleteTaskBtn');
        const editBtn = document.getElementById('editTaskActionBtn');
        const completeBtn = document.getElementById('completeTaskBtn');

        if (deleteBtn) deleteBtn.addEventListener('click', () => this.handleViewAction('delete'));
        if (editBtn) editBtn.addEventListener('click', () => this.handleViewAction('edit'));
        if (completeBtn) completeBtn.addEventListener('click', () => this.handleViewAction('complete'));

        // --- 4. FILTROS Y BÚSQUEDA ---
        const filterPriority = document.getElementById('filterPriority');
        const filterStatus = document.getElementById('filterStatus');
        const tasksSearch = document.getElementById('tasksSearch');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        
        if (filterPriority) filterPriority.addEventListener('change', () => this.filterTasks());
        if (filterStatus) filterStatus.addEventListener('change', () => this.filterTasks());
        if (tasksSearch) tasksSearch.addEventListener('input', (e) => this.searchTasks(e));
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        
        // Cerrar modales con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeTaskModal();
                this.closeViewTaskModal();
            }
        });
    }

    // =============================================================================
    // GESTIÓN DE DATOS
    // =============================================================================

    loadTasks() {
        console.log('🔄 Cargando tareas...');
        const stored = localStorage.getItem('myTasks'); // Usamos 'myTasks' para consistencia
        this.tasks = stored ? JSON.parse(stored) : [];
        this.renderAll(); // Renderiza todo (Sidebar y Panel)
    }

    saveTasksToLocalStorage() {
        localStorage.setItem('myTasks', JSON.stringify(this.tasks));
    }

    // =============================================================================
    // LÓGICA DEL MODAL CREAR/EDITAR
    // =============================================================================

    openTaskModal(task = null) {
        const modal = document.getElementById('addTaskModal'); // Corregido ID
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        if (!modal) return;
        
        // Limpiar tags seleccionados (si usas la lógica de tags visuales)
        // Aquí simplificamos para usar el form standard
        
        if (task) {
            if(title) title.textContent = 'Editar Tarea';
            if(document.getElementById('saveTaskBtn')) document.getElementById('saveTaskBtn').textContent = 'Actualizar';
            this.populateForm(task);
        } else {
            if(title) title.textContent = 'Nueva Tarea';
            if(document.getElementById('saveTaskBtn')) document.getElementById('saveTaskBtn').textContent = 'Guardar';
            if(form) form.reset();
            document.getElementById('taskId').value = '';
            
            // Fecha hoy por defecto
            const today = new Date().toISOString().split('T')[0];
            const dateInput = document.getElementById('taskDueDate');
            if(dateInput) dateInput.value = today;
        }
        
        modal.showModal();
    }

    populateForm(task) {
        if(document.getElementById('taskId')) document.getElementById('taskId').value = task.id;
        if(document.getElementById('taskTitle')) document.getElementById('taskTitle').value = task.title;
        if(document.getElementById('taskDescription')) document.getElementById('taskDescription').value = task.description || '';
        if(document.getElementById('taskDueDate')) document.getElementById('taskDueDate').value = task.dueDate;
        if(document.getElementById('taskTime')) document.getElementById('taskTime').value = task.dueTime || '';
        
        // Aquí podrías agregar lógica para poblar tags si usas el selector complejo
    }

    closeTaskModal() {
        const modal = document.getElementById('addTaskModal');
        if (modal) {
            modal.close();
            document.getElementById('taskForm')?.reset();
        }
    }

    saveTask() {
        const titleInput = document.getElementById('taskTitle');
        const dateInput = document.getElementById('taskDueDate');
        
        if (!titleInput?.value || !dateInput?.value) {
            this.showAlert('Título y fecha son obligatorios', 'warning');
            return;
        }

        const idInput = document.getElementById('taskId');
        const isEdit = idInput.value !== '';

        const taskData = {
            id: isEdit ? idInput.value : Date.now().toString(),
            title: titleInput.value.trim(),
            description: document.getElementById('taskDescription')?.value.trim() || '',
            dueDate: dateInput.value,
            dueTime: document.getElementById('taskTime')?.value || '00:00',
            status: 'pending',
            // Por simplicidad, asignamos un tag por defecto si no hay lógica de tags compleja
            tags: ['default'], 
            createdAt: new Date().toISOString()
        };

        if (isEdit) {
            const index = this.tasks.findIndex(t => t.id === taskData.id);
            if (index !== -1) {
                // Preservar tags y createdAt originales
                taskData.tags = this.tasks[index].tags; 
                taskData.createdAt = this.tasks[index].createdAt;
                this.tasks[index] = taskData;
            }
        } else {
            this.tasks.push(taskData);
        }

        this.saveTasksToLocalStorage();
        this.renderAll();
        this.closeTaskModal();
        this.showAlert(isEdit ? 'Tarea actualizada' : 'Tarea creada', 'success');
    }

    // =============================================================================
    // LÓGICA DEL MODAL "VER TAREA" (VIEW)
    // =============================================================================

    openViewTaskModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Referencias
        const modal = document.getElementById('viewTaskModal');
        const vId = document.getElementById('viewTaskId');
        const vTitle = document.getElementById('viewTaskTitle');
        const vDate = document.getElementById('viewTaskDate');
        const vTime = document.getElementById('viewTaskTime');
        const vDesc = document.getElementById('viewTaskDescription');
        const vIcon = document.getElementById('viewTaskTagIcon');

        // Llenar datos
        if(vId) vId.value = task.id;
        if(vTitle) vTitle.textContent = task.title;
        if(vDate) vDate.textContent = task.dueDate;
        if(vTime) vTime.textContent = task.dueTime;
        if(vDesc) vDesc.textContent = task.description || 'Sin descripción';

        // Renderizar icono
        const mainTag = (task.tags && task.tags[0]) || 'default';
        const style = TAG_CONFIG[mainTag] || TAG_CONFIG['default'];
        
        if(vIcon) {
            vIcon.className = `view-task__icon ${style.colorClass}`;
            vIcon.innerHTML = `<i class="fas ${style.icon}"></i> ${style.label}`;
        }

        if(modal) modal.showModal();
    }

    closeViewTaskModal() {
        const modal = document.getElementById('viewTaskModal');
        if (modal) modal.close();
    }

    handleViewAction(action) {
        const id = document.getElementById('viewTaskId')?.value;
        if (!id) return;

        if (action === 'delete') {
            if(confirm('¿Eliminar tarea?')) {
                this.tasks = this.tasks.filter(t => t.id !== id);
                this.saveTasksToLocalStorage();
                this.renderAll();
                this.closeViewTaskModal();
                this.showAlert('Tarea eliminada', 'info');
            }
        } else if (action === 'edit') {
            const task = this.tasks.find(t => t.id === id);
            this.closeViewTaskModal();
            this.openTaskModal(task);
        } else if (action === 'complete') {
            this.tasks = this.tasks.filter(t => t.id !== id); // O cambiar status
            this.saveTasksToLocalStorage();
            this.renderAll();
            this.closeViewTaskModal();
            this.showAlert('¡Tarea completada!', 'success');
        }
    }

    // =============================================================================
    // RENDERIZADO (Sidebar y Panel Principal)
    // =============================================================================

    renderAll() {
        this.renderSidebar();
        this.renderTasksPanel(); // Si usas el panel principal también
    }

    renderSidebar() {
        const container = document.getElementById('task__list');
        if (!container) return;

        container.innerHTML = '';

        this.tasks.forEach(task => {
            const btn = document.createElement('button');
            const mainTag = (task.tags && task.tags[0]) || 'default';
            const config = TAG_CONFIG[mainTag] || TAG_CONFIG['default'];

            btn.className = `taskbar__button ${config.colorClass}`;
            btn.setAttribute('data-tooltip', task.title);
            btn.innerHTML = `<i class="fas ${config.icon}"></i>`;
            
            // Evento para abrir el modal de vista
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openViewTaskModal(task.id);
            });

            container.appendChild(btn);
        });
    }

    renderTasksPanel() {
        // Implementación opcional si usas el panel grande de tareas
        // Mantenida vacía para enfocarnos en la sidebar
    }

    // =============================================================================
    // UTILIDADES
    // =============================================================================

    showAlert(message, type = 'info') {
        if (typeof window.showAlert === 'function') {
            window.showAlert(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});

export default TaskManager;