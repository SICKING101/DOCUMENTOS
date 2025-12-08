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
        console.log('Dashboard Stats:', this.dashboardStats);
        console.log('Current Tab:', this.currentTab);
        console.log('Selected File:', this.selectedFile);
        console.log('Filters:', this.filters);
        console.log('Search Results:', this.searchResults);
        console.log('Current Search Query:', this.currentSearchQuery);
        console.groupEnd();
    }
}

export { AppState };