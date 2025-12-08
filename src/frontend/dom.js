// =============================================================================
// 1. CONFIGURACIÓN DE ELEMENTOS DEL DOM PRINCIPAL
// =============================================================================

/**
 * 1.1 Objeto principal de elementos DOM
 * Centraliza todas las referencias a elementos HTML para acceso consistente
 * y mantenimiento simplificado en toda la aplicación.
 */
const DOM = {
    
    // =============================================================================
    // 2. ELEMENTOS DE NAVEGACIÓN
    // =============================================================================
    
    /**
     * 2.1 Enlaces de navegación de la barra lateral
     * Referencias para cambiar entre pestañas de la aplicación.
     */
    navLinks: document.querySelectorAll('.sidebar__nav-link'),

    // =============================================================================
    // 3. ELEMENTOS DE TAREAS (SI EXISTEN)
    // =============================================================================
    
    /**
     * 3.1 Contenedor de tareas
     * Área principal donde se muestran las tareas pendientes.
     */
    tasksContainer: document.getElementById('tasksContainer'),
    
    /**
     * 3.2 Botón para agregar tarea
     * Dispara la apertura del formulario de nueva tarea.
     */
    addTaskBtn: document.getElementById('addTaskBtn'),
    
    /**
     * 3.3 Modal de tareas
     * Ventana emergente para crear o editar tareas.
     */
    taskModal: document.getElementById('taskModal'),
    
    /**
     * 3.4 Formulario de tareas
     * Formulario HTML para capturar información de tareas.
     */
    taskForm: document.getElementById('taskForm'),
    
    /**
     * 3.5 Búsqueda de tareas
     * Campo de entrada para filtrar tareas por texto.
     */
    tasksSearch: document.getElementById('tasksSearch'),
    
    /**
     * 3.6 Botón "Agregar primera tarea"
     * Elemento visual que aparece cuando no hay tareas creadas.
     */
    addFirstTask: document.getElementById('addFirstTask'),
    
    // =============================================================================
    // 4. BOTONES DE CIERRE DE MODALES
    // =============================================================================
    
    /**
     * 4.1 Botones de cierre de modales
     * Referencias a todos los botones que cierran ventanas modales.
     */
    modalCloseButtons: document.querySelectorAll('.modal__close'),
    
    // =============================================================================
    // 5. CONTENIDO PRINCIPAL
    // =============================================================================
    
    /**
     * 5.1 Contenidos de pestañas
     * Secciones principales que se muestran al cambiar entre pestañas.
     */
    tabContents: document.querySelectorAll('.tab-content'),
    
    // =============================================================================
    // 6. ELEMENTOS DEL DASHBOARD
    // =============================================================================
    
    /**
     * 6.1 Tarjetas de estadísticas
     * Elementos que muestran métricas clave en el panel de control.
     */
    statsCards: {
        totalPersonas: document.getElementById('totalPersonas'),
        totalDocumentos: document.getElementById('totalDocumentos'),
        proximosVencer: document.getElementById('proximosVencer'),
        totalCategorias: document.getElementById('totalCategorias')
    },
    
    /**
     * 6.2 Botón de refrescar dashboard
     * Actualiza todas las estadísticas y datos del panel principal.
     */
    refreshDashboard: document.getElementById('refreshDashboard'),
    
    /**
     * 6.3 Documentos recientes
     * Contenedor para mostrar los últimos documentos subidos.
     */
    recentDocuments: document.getElementById('recentDocuments'),
    
    /**
     * 6.4 Botón "Agregar primer documento"
     * Llamado a la acción cuando no hay documentos en el sistema.
     */
    addFirstDocument: document.getElementById('addFirstDocument'),
    
    // =============================================================================
    // 7. ACCIONES RÁPIDAS
    // =============================================================================
    
    /**
     * 7.1 Tarjetas de acciones rápidas
     * Botones de acceso rápido a funciones comunes del sistema.
     */
    quickActions: document.querySelectorAll('.action-card'),
    
    // =============================================================================
    // 8. ELEMENTOS DE PERSONAS
    // =============================================================================
    
    /**
     * 8.1 Cuerpo de tabla de personas
     * Área donde se renderiza la lista de personas registradas.
     */
    personasTableBody: document.getElementById('personasTableBody'),
    
    /**
     * 8.2 Botón para agregar persona
     * Abre el formulario para registrar nueva persona.
     */
    addPersonBtn: document.getElementById('addPersonBtn'),
    
    // =============================================================================
    // 9. ELEMENTOS DE DOCUMENTOS
    // =============================================================================
    
    /**
     * 9.1 Cuerpo de tabla de documentos
     * Área donde se renderiza la lista de documentos del sistema.
     */
    documentosTableBody: document.getElementById('documentosTableBody'),
    
    /**
     * 9.2 Botón para agregar documento
     * Abre el formulario para subir nuevo documento.
     */
    addDocumentBtn: document.getElementById('addDocumentBtn'),
    
    // =============================================================================
    // 10. ELEMENTOS DE FILTROS
    // =============================================================================
    
    /**
     * 10.1 Filtro por categoría
     * Dropdown para filtrar documentos por categoría específica.
     */
    filterCategory: document.getElementById('filterCategory'),
    
    /**
     * 10.2 Filtro por tipo de archivo
     * Dropdown para filtrar documentos por extensión/tipe.
     */
    filterType: document.getElementById('filterType'),
    
    /**
     * 10.3 Filtro por fecha
     * Dropdown para filtrar documentos por rango de tiempo.
     */
    filterDate: document.getElementById('filterDate'),
    
    /**
     * 10.4 Filtro por estado
     * Dropdown para filtrar documentos por estado de vencimiento.
     */
    filterStatus: document.getElementById('filterStatus'),
    
    // =============================================================================
    // 11. ELEMENTOS DE CATEGORÍAS
    // =============================================================================
    
    /**
     * 11.1 Estadísticas de categorías
     * Contenedor para mostrar métricas visuales de cada categoría.
     */
    categoriesStats: document.getElementById('categoriesStats'),
    
    /**
     * 11.2 Botón para agregar categoría
     * Abre el formulario para crear nueva categoría.
     */
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    
    // =============================================================================
    // 12. ELEMENTOS DE MODALES PRINCIPALES
    // =============================================================================
    
    /**
     * 12.1 Modal de persona
     * Ventana emergente para gestión de personas.
     */
    personModal: document.getElementById('personModal'),
    
    /**
     * 12.2 Modal de documento
     * Ventana emergente para subida de documentos (único/múltiple).
     */
    documentModal: document.getElementById('documentModal'),
    
    /**
     * 12.3 Modal de categoría
     * Ventana emergente para gestión de categorías.
     */
    categoryModal: document.getElementById('categoryModal'),
    
    /**
     * 12.4 Modal de departamento
     * Ventana emergente para gestión de departamentos.
     */
    departmentModal: document.getElementById('departmentModal'),
    
    /**
     * 12.5 Modal de búsqueda
     * Ventana emergente para búsqueda avanzada de documentos.
     */
    searchModal: document.getElementById('searchModal'),
    
    /**
     * 12.6 Modal de reportes
     * Ventana emergente para generación y configuración de reportes.
     */
    reportModal: document.getElementById('reportModal'),
    
    // =============================================================================
    // 13. ELEMENTOS DE FORMULARIO - PERSONAS
    // =============================================================================
    
    /**
     * 13.1 Formulario de persona
     * Formulario HTML para capturar datos de personas.
     */
    personForm: document.getElementById('personForm'),
    
    /**
     * 13.2 ID oculto de persona
     * Campo hidden para identificar persona en modo edición.
     */
    personId: document.getElementById('personId'),
    
    /**
     * 13.3 Nombre de persona
     * Campo de entrada para nombre completo.
     */
    personName: document.getElementById('personName'),
    
    /**
     * 13.4 Email de persona
     * Campo de entrada para dirección de correo electrónico.
     */
    personEmail: document.getElementById('personEmail'),
    
    /**
     * 13.5 Teléfono de persona
     * Campo de entrada para número telefónico.
     */
    personPhone: document.getElementById('personPhone'),
    
    /**
     * 13.6 Departamento de persona
     * Campo de entrada para departamento/área de trabajo.
     */
    personDepartment: document.getElementById('personDepartment'),
    
    /**
     * 13.7 Puesto de persona
     * Campo de entrada para cargo o posición laboral.
     */
    personPosition: document.getElementById('personPosition'),
    
    /**
     * 13.8 Botón de guardar persona
     * Ejecuta la acción de guardar/actualizar datos de persona.
     */
    savePersonBtn: document.getElementById('savePersonBtn'),
    
    /**
     * 13.9 Botón de cancelar persona
     * Cierra el modal de persona sin guardar cambios.
     */
    cancelPersonBtn: document.getElementById('cancelPersonBtn'),
    
    /**
     * 13.10 Título del modal de persona
     * Elemento que muestra "Agregar Persona" o "Editar Persona".
     */
    personModalTitle: document.getElementById('personModalTitle'),
    
    // =============================================================================
    // 14. ELEMENTOS DE FORMULARIO - DOCUMENTOS (ACTUALIZADO CON MÚLTIPLE)
    // =============================================================================
    
    /**
     * 14.1 Formulario de documento
     * Formulario principal que contiene ambos modos de subida.
     */
    documentForm: document.getElementById('documentForm'),
    
    /**
     * 14.2 Contenedor de subida única
     * Sección visible cuando se selecciona modo de subida individual.
     */
    singleUploadContainer: document.getElementById('singleUploadContainer'),
    
    /**
     * 14.3 Contenedor de subida múltiple
     * Sección visible cuando se selecciona modo de subida múltiple.
     */
    multipleUploadContainer: document.getElementById('multipleUploadContainer'),
    
    /**
     * 14.4 Tabs de modo de subida
     * Elementos para alternar entre subida única y múltiple.
     */
    uploadTabs: document.querySelectorAll('.upload__tab'),
    
    // =============================================================================
    // 15. ELEMENTOS DE SUBIDA ÚNICA
    // =============================================================================
    
    /**
     * 15.1 Contenedor de arrastrar y soltar
     * Área interactiva para arrastrar archivos en modo único.
     */
    fileUploadContainer: document.getElementById('fileUploadContainer'),
    
    /**
     * 15.2 Botón para explorar archivos
     * Abre el selector de archivos del sistema en modo único.
     */
    browseFilesBtn: document.getElementById('browseFilesBtn'),
    
    /**
     * 15.3 Input de archivo único
     * Elemento input type="file" para seleccionar un archivo.
     */
    fileInput: document.getElementById('fileInput'),
    
    /**
     * 15.4 Información del archivo
     * Contenedor que muestra detalles del archivo seleccionado.
     */
    fileInfo: document.getElementById('fileInfo'),
    
    /**
     * 15.5 Nombre del archivo
     * Elemento que muestra el nombre del archivo seleccionado.
     */
    fileName: document.getElementById('fileName'),
    
    /**
     * 15.6 Tamaño del archivo
     * Elemento que muestra el tamaño del archivo seleccionado.
     */
    fileSize: document.getElementById('fileSize'),
    
    /**
     * 15.7 Descripción del documento
     * Campo de texto para agregar descripción opcional al documento.
     */
    documentDescription: document.getElementById('documentDescription'),
    
    /**
     * 15.8 Categoría del documento
     * Dropdown para asignar el documento a una categoría.
     */
    documentCategory: document.getElementById('documentCategory'),
    
    /**
     * 15.9 Fecha de vencimiento
     * Selector de fecha para establecer fecha de expiración del documento.
     */
    documentExpiration: document.getElementById('documentExpiration'),
    
    /**
     * 15.10 Persona asignada
     * Dropdown para asociar el documento a una persona.
     */
    documentPerson: document.getElementById('documentPerson'),
    
    // =============================================================================
    // 16. ELEMENTOS DE SUBIDA MÚLTIPLE
    // =============================================================================
    
    /**
     * 16.1 Contenedor de arrastrar y soltar múltiple
     * Área interactiva para arrastrar múltiples archivos.
     */
    multipleFileUploadContainer: document.getElementById('multipleFileUploadContainer'),
    
    /**
     * 16.2 Botón para explorar múltiples archivos
     * Abre el selector de archivos para selección múltiple.
     */
    browseMultipleFilesBtn: document.getElementById('browseMultipleFilesBtn'),
    
    /**
     * 16.3 Input de archivos múltiples
     * Elemento input type="file" con atributo multiple.
     */
    multipleFileInput: document.getElementById('multipleFileInput'),
    
    /**
     * 16.4 Lista de archivos seleccionados
     * Contenedor donde se muestran todos los archivos a subir.
     */
    multipleFilesList: document.getElementById('multipleFilesList'),
    
    /**
     * 16.5 Contenedor de la lista de archivos
     * Elemento padre que organiza la visualización de archivos seleccionados.
     */
    filesListContainer: document.getElementById('filesListContainer'),
    
    /**
     * 16.6 Contador de archivos seleccionados
     * Muestra el número total de archivos listos para subir.
     */
    selectedFilesCount: document.getElementById('selectedFilesCount'),
    
    /**
     * 16.7 Resumen de archivos
     * Muestra información agregada como tamaño total y tipos de archivo.
     */
    filesSummary: document.getElementById('filesSummary'),
    
    // =============================================================================
    // 17. CONFIGURACIÓN DE SUBIDA MÚLTIPLE
    // =============================================================================
    
    /**
     * 17.1 Categoría para múltiples documentos
     * Dropdown para asignar la misma categoría a todos los documentos.
     */
    multipleDocumentCategory: document.getElementById('multipleDocumentCategory'),
    
    /**
     * 17.2 Persona para múltiples documentos
     * Dropdown para asociar todos los documentos a la misma persona.
     */
    multipleDocumentPerson: document.getElementById('multipleDocumentPerson'),
    
    /**
     * 17.3 Días de vencimiento
     * Selector numérico para establecer días hasta vencimiento.
     */
    multipleExpirationDays: document.getElementById('multipleExpirationDays'),
    
    // =============================================================================
    // 18. OPCIONES AVANZADAS MÚLTIPLES
    // =============================================================================
    
    /**
     * 18.1 Toggle de opciones avanzadas
     * Botón para mostrar/ocultar configuración avanzada.
     */
    toggleAdvancedOptions: document.getElementById('toggleAdvancedOptions'),
    
    /**
     * 18.2 Contenedor de opciones avanzadas
     * Sección que contiene configuraciones adicionales.
     */
    advancedOptions: document.getElementById('advancedOptions'),
    
    /**
     * 18.3 Generar descripciones automáticamente
     * Checkbox para crear descripciones basadas en nombres de archivo.
     */
    autoGenerateDescriptions: document.getElementById('autoGenerateDescriptions'),
    
    /**
     * 18.4 Notificar a la persona asignada
     * Checkbox para enviar notificaciones al asignar documentos.
     */
    notifyPerson: document.getElementById('notifyPerson'),
    
    /**
     * 18.5 Estrategia de subida
     * Dropdown para seleccionar método de subida (secuencial, paralelo, batch).
     */
    uploadStrategy: document.getElementById('uploadStrategy'),
    
    // =============================================================================
    // 19. BOTONES DE ACCIÓN
    // =============================================================================
    
    /**
     * 19.1 Botón de subir documento único
     * Ejecuta la subida de un solo documento.
     */
    uploadDocumentBtn: document.getElementById('uploadDocumentBtn'),
    
    /**
     * 19.2 Botón de subir documentos múltiples
     * Inicia la subida de todos los documentos seleccionados.
     */
    uploadMultipleDocumentsBtn: document.getElementById('uploadMultipleDocumentsBtn'),
    
    /**
     * 19.3 Contador de subidas pendientes
     * Muestra el número de archivos listos para subir en modo múltiple.
     */
    uploadCount: document.getElementById('uploadCount'),
    
    /**
     * 19.4 Botón de cancelar documento
     * Cierra el modal de documento sin subir archivos.
     */
    cancelDocumentBtn: document.getElementById('cancelDocumentBtn'),
    
    // =============================================================================
    // 20. ELEMENTOS DE FORMULARIO - CATEGORÍAS
    // =============================================================================
    
    /**
     * 20.1 Formulario de categoría
     * Formulario HTML para capturar datos de categorías.
     */
    categoryForm: document.getElementById('categoryForm'),
    
    /**
     * 20.2 ID oculto de categoría
     * Campo hidden para identificar categoría en modo edición.
     */
    categoryId: document.getElementById('categoryId'),
    
    /**
     * 20.3 Nombre de categoría
     * Campo de entrada para nombre descriptivo de categoría.
     */
    categoryName: document.getElementById('categoryName'),
    
    /**
     * 20.4 Descripción de categoría
     * Campo de texto para detallar propósito de la categoría.
     */
    categoryDescription: document.getElementById('categoryDescription'),
    
    /**
     * 20.5 Color de categoría
     * Selector de color para personalización visual.
     */
    categoryColor: document.getElementById('categoryColor'),
    
    /**
     * 20.6 Ícono de categoría
     * Dropdown para seleccionar ícono representativo.
     */
    categoryIcon: document.getElementById('categoryIcon'),
    
    /**
     * 20.7 Botón de guardar categoría
     * Ejecuta la acción de guardar/actualizar categoría.
     */
    saveCategoryBtn: document.getElementById('saveCategoryBtn'),
    
    /**
     * 20.8 Botón de cancelar categoría
     * Cierra el modal de categoría sin guardar cambios.
     */
    cancelCategoryBtn: document.getElementById('cancelCategoryBtn'),
    
    /**
     * 20.9 Título del modal de categoría
     * Elemento que muestra "Nueva Categoría" o "Editar Categoría".
     */
    categoryModalTitle: document.getElementById('categoryModalTitle'),
    
    // =============================================================================
    // 21. ELEMENTOS DE FORMULARIO - DEPARTAMENTOS
    // =============================================================================
    
    /**
     * 21.1 Formulario de departamento
     * Formulario HTML para capturar datos de departamentos.
     */
    departmentForm: document.getElementById('departmentForm'),
    
    /**
     * 21.2 ID oculto de departamento
     * Campo hidden para identificar departamento en modo edición.
     */
    departmentId: document.getElementById('departmentId'),
    
    /**
     * 21.3 Nombre de departamento
     * Campo de entrada para nombre descriptivo de departamento.
     */
    departmentName: document.getElementById('departmentName'),
    
    /**
     * 21.4 Descripción de departamento
     * Campo de texto para detallar propósito del departamento.
     */
    departmentDescription: document.getElementById('departmentDescription'),
    
    /**
     * 21.5 Color de departamento
     * Selector de color para personalización visual.
     */
    departmentColor: document.getElementById('departmentColor'),
    
    /**
     * 21.6 Ícono de departamento
     * Dropdown para seleccionar ícono representativo.
     */
    departmentIcon: document.getElementById('departmentIcon'),
    
    /**
     * 21.7 Botón de guardar departamento
     * Ejecuta la acción de guardar/actualizar departamento.
     */
    saveDepartmentBtn: document.getElementById('saveDepartmentBtn'),
    
    /**
     * 21.8 Botón de cancelar departamento
     * Cierra el modal de departamento sin guardar cambios.
     */
    cancelDepartmentBtn: document.getElementById('cancelDepartmentBtn'),
    
    /**
     * 21.9 Título del modal de departamento
     * Elemento que muestra "Nuevo Departamento" o "Editar Departamento".
     */
    departmentModalTitle: document.getElementById('departmentModalTitle'),
    
    /**
     * 21.10 Contenedor de estadísticas de departamentos
     * Grid donde se muestran las tarjetas de departamentos.
     */
    departmentsStats: document.getElementById('departmentsStats'),
    
    /**
     * 21.11 Botón de agregar departamento
     * Abre el modal para crear un nuevo departamento.
     */
    addDepartmentBtn: document.getElementById('addDepartmentBtn'),
    
    // =============================================================================
    // 22. ELEMENTOS DE BÚSQUEDA AVANZADA
    // =============================================================================
    
    /**
     * 22.1 Formulario de búsqueda
     * Formulario con múltiples criterios para búsqueda avanzada.
     */
    searchForm: document.getElementById('searchForm'),
    
    /**
     * 22.2 Palabra clave
     * Campo de texto para búsqueda por contenido textual.
     */
    searchKeyword: document.getElementById('searchKeyword'),
    
    /**
     * 21.3 Categoría en búsqueda
     * Dropdown para filtrar por categoría específica.
     */
    searchCategory: document.getElementById('searchCategory'),
    
    /**
     * 21.4 Fecha desde
     * Selector de fecha para rango de búsqueda inicial.
     */
    searchDateFrom: document.getElementById('searchDateFrom'),
    
    /**
     * 21.5 Fecha hasta
     * Selector de fecha para rango de búsqueda final.
     */
    searchDateTo: document.getElementById('searchDateTo'),
    
    /**
     * 21.6 Persona en búsqueda
     * Dropdown para filtrar por persona asignada.
     */
    searchPerson: document.getElementById('searchPerson'),
    
    /**
     * 21.7 Estado en búsqueda
     * Dropdown para filtrar por estado de vencimiento.
     */
    searchStatus: document.getElementById('searchStatus'),
    
    /**
     * 21.8 Lista de resultados de búsqueda
     * Contenedor donde se muestran los documentos encontrados.
     */
    searchResultsList: document.getElementById('searchResultsList'),
    
    /**
     * 21.9 Botón de realizar búsqueda
     * Ejecuta la búsqueda con los criterios especificados.
     */
    performSearchBtn: document.getElementById('performSearchBtn'),
    
    /**
     * 21.10 Botón de cancelar búsqueda
     * Cierra el modal de búsqueda sin mostrar resultados.
     */
    cancelSearchBtn: document.getElementById('cancelSearchBtn'),
    
    // =============================================================================
    // 22. ELEMENTOS DE REPORTES
    // =============================================================================
    
    /**
     * 22.1 Formulario de reportes
     * Formulario para configurar generación de reportes.
     */
    reportForm: document.getElementById('reportForm'),
    
    /**
     * 22.2 Tipo de reporte
     * Dropdown para seleccionar el tipo de reporte a generar.
     */
    reportType: document.getElementById('reportType'),
    
    /**
     * 22.3 Filtros específicos del reporte
     * Contenedor dinámico para filtros según tipo de reporte.
     */
    reportSpecificFilters: document.getElementById('reportSpecificFilters'),
    
    /**
     * 22.4 Formato de reporte
     * Dropdown para seleccionar formato de salida (PDF, Excel, CSV).
     */
    reportFormat: document.getElementById('reportFormat'),
    
    /**
     * 22.5 Contenido de vista previa
     * Área que muestra una previsualización del reporte configurado.
     */
    reportPreviewContent: document.getElementById('reportPreviewContent'),
    
    /**
     * 22.6 Botón de generar reporte
     * Ejecuta la generación y descarga del reporte.
     */
    generateReportBtn: document.getElementById('generateReportBtn'),
    
    /**
     * 22.7 Botón de cancelar reporte
     * Cierra el modal de reportes sin generar.
     */
    cancelReportBtn: document.getElementById('cancelReportBtn'),
    
    // =============================================================================
    // 23. CONTENEDOR DE PROGRESO DINÁMICO
    // =============================================================================
    
    /**
     * 23.1 Contenedor de progreso de subida
     * Elemento creado dinámicamente para mostrar barra de progreso durante subidas.
     */
    uploadProgressContainer: document.createElement('div')
};

// =============================================================================
// 24. CONFIGURACIÓN INICIAL DEL CONTENEDOR DE PROGRESO
// =============================================================================

/**
 * 24.1 Inicializar contenedor de progreso
 * Configura propiedades del elemento de progreso que se crea dinámicamente
 * para mostrar estado de subidas múltiples.
 */
DOM.uploadProgressContainer.id = 'uploadProgressContainer';
DOM.uploadProgressContainer.className = 'upload-progress';
DOM.uploadProgressContainer.style.display = 'none';

export { DOM };