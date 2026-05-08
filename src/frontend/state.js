// =============================================================================
// 1. DEFINICIÓN DE LA CLASE APPSTATE
// =============================================================================

/**
 * 1.1 Clase principal del estado de la aplicación
 * Centraliza y gestiona el estado global de toda la aplicación, incluyendo
 * datos, configuraciones y estados temporales.
 */
class AppState {
    constructor() {
        // =============================================================================
        // 2. PROPIEDADES DE DATOS PRINCIPALES
        // =============================================================================
        
        /**
         * 2.1 Lista de personas registradas
         * Almacena todos los registros de personas en el sistema.
         */
        this.persons = [];
        
        /**
         * 2.2 Lista de documentos
         * Contiene todos los documentos subidos al sistema con sus metadatos.
         */
        this.documents = [];
        
        /**
         * 2.3 Lista de categorías
         * Almacena las categorías disponibles para clasificar documentos.
         */
        this.categories = [];
        
        /**
         * 2.4 Lista de departamentos
         * Almacena los departamentos disponibles para organizar personas.
         */
        this.departments = [];
        
        /**
         * 2.5 Lista de tareas del usuario
         * Almacena todas las tareas asignadas o creadas por el usuario.
         */
        this.tasks = [];
        
        // =============================================================================
        // 3. ESTADÍSTICAS DEL DASHBOARD
        // =============================================================================
        
        /**
         * 3.1 Estadísticas del panel de control
         * Objeto que contiene métricas clave para mostrar en el dashboard.
         */
        this.dashboardStats = {
            /**
             * 3.1.1 Total de personas registradas
             * Contador de todas las personas en el sistema.
             */
            totalPersonas: 0,
            
            /**
             * 3.1.2 Total de documentos subidos
             * Contador de todos los documentos almacenados.
             */
            totalDocumentos: 0,
            
            /**
             * 3.1.3 Documentos próximos a vencer
             * Contador de documentos cuya fecha de vencimiento está cercana.
             */
            proximosVencer: 0,
            
            /**
             * 3.1.4 Total de categorías creadas
             * Contador de categorías disponibles en el sistema.
             */
            totalCategorias: 0
        };
        
        /**
         * 3.2 Estadísticas de tareas
         * Objeto que contiene métricas de tareas del usuario.
         */
        this.tasksStats = {
            total: 0,
            pendientes: 0,
            enProgreso: 0,
            completadas: 0,
            vencidas: 0,
            paraHoy: 0
        };
        
        // =============================================================================
        // 4. ESTADOS DE INTERFAZ Y NAVEGACIÓN
        // =============================================================================
        
        /**
         * 4.1 Pestaña actualmente activa
         * Identifica qué sección de la aplicación está siendo mostrada al usuario.
         */
        this.currentTab = 'dashboard';
        
        /**
         * 4.2 Archivo seleccionado para operaciones
         * Almacena referencia temporal al archivo que el usuario está manipulando.
         */
        this.selectedFile = null;
        
        /**
         * 4.3 Estado de carga
         * Indica si la aplicación está procesando una operación que requiere espera.
         */
        this.isLoading = false;
        
        // =============================================================================
        // 5. FILTROS Y BÚSQUEDAS
        // =============================================================================
        
        /**
         * 5.1 Configuración de filtros activos
         * Almacena los criterios de filtrado aplicados a la lista de documentos.
         */
        this.filters = {
            /**
             * 5.1.1 Filtro por categoría
             * Nombre de la categoría seleccionada para filtrar documentos.
             */
            category: '',
            
            /**
             * 5.1.2 Filtro por tipo de archivo
             * Extensión del tipo de archivo seleccionada para filtrar documentos.
             */
            type: '',
            
            /**
             * 5.1.3 Filtro por fecha
             * Rango de tiempo seleccionado para filtrar documentos por antigüedad.
             */
            date: '',
            
            /**
             * 5.1.4 Filtro por estado
             * Estado de vencimiento seleccionado para filtrar documentos.
             */
            status: ''
        };
        
        /**
         * 5.2 Resultados de búsqueda
         * Almacena temporalmente los documentos encontrados en búsquedas avanzadas.
         */
        this.searchResults = [];
        
        /**
         * 5.3 Término de búsqueda actual
         * Guarda el último término utilizado en búsquedas básicas.
         */
        this.currentSearchQuery = '';
    }
    
    // =============================================================================
    // 6. MÉTODOS DE UTILIDAD
    // =============================================================================
    
    /**
     * 6.1 Registrar estado completo
     * Muestra en consola todas las propiedades del estado para depuración.
     * Útil durante desarrollo para verificar el estado actual de la aplicación.
     */
    logState() {
        console.group('App State');
        console.log('Persons:', this.persons);
        console.log('Documents:', this.documents);
        console.log('Categories:', this.categories);
        console.log('Departments:', this.departments);
        console.log('Tasks:', this.tasks);
        console.log('Dashboard Stats:', this.dashboardStats);
        console.log('Tasks Stats:', this.tasksStats);
        console.log('Current Tab:', this.currentTab);
        console.log('Selected File:', this.selectedFile);
        console.log('Filters:', this.filters);
        console.log('Search Results:', this.searchResults);
        console.log('Current Search Query:', this.currentSearchQuery);
        console.groupEnd();
    }
    
    /**
     * 6.2 Actualizar estadísticas de tareas
     * Recalcula las estadísticas basadas en el array de tareas actual.
     */
    updateTasksStats() {
        const now = new Date();
        
        this.tasksStats.total = this.tasks.length;
        this.tasksStats.pendientes = this.tasks.filter(t => t.estado === 'pendiente').length;
        this.tasksStats.enProgreso = this.tasks.filter(t => t.estado === 'en-progreso').length;
        this.tasksStats.completadas = this.tasks.filter(t => t.estado === 'completada').length;
        
        // Tareas vencidas (pendientes o en progreso con fecha límite pasada)
        this.tasksStats.vencidas = this.tasks.filter(t => {
            if (t.estado === 'completada' || t.estado === 'cancelada') return false;
            if (!t.fecha_limite) return false;
            return new Date(t.fecha_limite) < now;
        }).length;
        
        // Tareas para hoy
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        this.tasksStats.paraHoy = this.tasks.filter(t => {
            if (t.estado === 'completada' || t.estado === 'cancelada') return false;
            if (!t.fecha_limite) return false;
            const dueDate = new Date(t.fecha_limite);
            return dueDate >= today && dueDate < tomorrow;
        }).length;
    }
    
    /**
     * 6.3 Agregar una tarea al estado
     * @param {Object} task - Tarea a agregar
     */
    addTask(task) {
        this.tasks.unshift(task);
        this.updateTasksStats();
    }
    
    /**
     * 6.4 Actualizar una tarea existente
     * @param {string} taskId - ID de la tarea
     * @param {Object} updatedTask - Datos actualizados
     */
    updateTask(taskId, updatedTask) {
        const index = this.tasks.findIndex(t => t._id === taskId);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updatedTask };
            this.updateTasksStats();
        }
    }
    
    /**
     * 6.5 Eliminar una tarea del estado
     * @param {string} taskId - ID de la tarea a eliminar
     */
    removeTask(taskId) {
        this.tasks = this.tasks.filter(t => t._id !== taskId);
        this.updateTasksStats();
    }
    
    /**
     * 6.6 Cargar tareas desde el servidor
     * @param {Array} tasks - Lista de tareas del servidor
     */
    loadTasks(tasks) {
        this.tasks = tasks || [];
        this.updateTasksStats();
    }
}

export { AppState };