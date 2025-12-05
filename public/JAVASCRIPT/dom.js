// =============================================================================
// ELEMENTOS DOM - ACTUALIZADO CON SUBIDA MÚLTIPLE
// =============================================================================
const DOM = {
    
    // Navigation
    navLinks: document.querySelectorAll('.sidebar__nav-link'),

    // Elementos de tareas
    tasksContainer: document.getElementById('tasksContainer'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    tasksSearch: document.getElementById('tasksSearch'),
    addFirstTask: document.getElementById('addFirstTask'),
    
    // Modal close buttons
    modalCloseButtons: document.querySelectorAll('.modal__close'),
    
    // Main Content
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Dashboard Elements
    statsCards: {
        totalPersonas: document.getElementById('totalPersonas'),
        totalDocumentos: document.getElementById('totalDocumentos'),
        proximosVencer: document.getElementById('proximosVencer'),
        totalCategorias: document.getElementById('totalCategorias')
    },
    refreshDashboard: document.getElementById('refreshDashboard'),
    recentDocuments: document.getElementById('recentDocuments'),
    addFirstDocument: document.getElementById('addFirstDocument'),
    
    // Quick Actions
    quickActions: document.querySelectorAll('.action-card'),
    
    // Personas Elements
    personasTableBody: document.getElementById('personasTableBody'),
    addPersonBtn: document.getElementById('addPersonBtn'),
    
    // Documentos Elements
    documentosTableBody: document.getElementById('documentosTableBody'),
    addDocumentBtn: document.getElementById('addDocumentBtn'),
    
    // Filter Elements
    filterCategory: document.getElementById('filterCategory'),
    filterType: document.getElementById('filterType'),
    filterDate: document.getElementById('filterDate'),
    filterStatus: document.getElementById('filterStatus'),
    
    // Categorías Elements
    categoriesStats: document.getElementById('categoriesStats'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    
    // Modal Elements
    personModal: document.getElementById('personModal'),
    documentModal: document.getElementById('documentModal'),
    categoryModal: document.getElementById('categoryModal'),
    searchModal: document.getElementById('searchModal'),
    reportModal: document.getElementById('reportModal'),
    
    // Form Elements - Personas
    personForm: document.getElementById('personForm'),
    personId: document.getElementById('personId'),
    personName: document.getElementById('personName'),
    personEmail: document.getElementById('personEmail'),
    personPhone: document.getElementById('personPhone'),
    personDepartment: document.getElementById('personDepartment'),
    personPosition: document.getElementById('personPosition'),
    savePersonBtn: document.getElementById('savePersonBtn'),
    cancelPersonBtn: document.getElementById('cancelPersonBtn'),
    personModalTitle: document.getElementById('personModalTitle'),
    
    // =========================================================================
    // FORM ELEMENTS - DOCUMENTOS (ACTUALIZADO CON MÚLTIPLE)
    // =========================================================================
    
    // Contenedores principales
    documentForm: document.getElementById('documentForm'),
    singleUploadContainer: document.getElementById('singleUploadContainer'),
    multipleUploadContainer: document.getElementById('multipleUploadContainer'),
    
    // Tabs de modo
    uploadTabs: document.querySelectorAll('.upload__tab'),
    
    // Modo único
    fileUploadContainer: document.getElementById('fileUploadContainer'),
    browseFilesBtn: document.getElementById('browseFilesBtn'),
    fileInput: document.getElementById('fileInput'),
    fileInfo: document.getElementById('fileInfo'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    documentDescription: document.getElementById('documentDescription'),
    documentCategory: document.getElementById('documentCategory'),
    documentExpiration: document.getElementById('documentExpiration'),
    documentPerson: document.getElementById('documentPerson'),
    
    // Modo múltiple - NUEVO
    multipleFileUploadContainer: document.getElementById('multipleFileUploadContainer'),
    browseMultipleFilesBtn: document.getElementById('browseMultipleFilesBtn'),
    multipleFileInput: document.getElementById('multipleFileInput'),
    multipleFilesList: document.getElementById('multipleFilesList'),
    filesListContainer: document.getElementById('filesListContainer'),
    selectedFilesCount: document.getElementById('selectedFilesCount'),
    filesSummary: document.getElementById('filesSummary'),
    
    // Configuración múltiple
    multipleDocumentCategory: document.getElementById('multipleDocumentCategory'),
    multipleDocumentPerson: document.getElementById('multipleDocumentPerson'),
    multipleExpirationDays: document.getElementById('multipleExpirationDays'),
    
    // Opciones avanzadas múltiples
    toggleAdvancedOptions: document.getElementById('toggleAdvancedOptions'),
    advancedOptions: document.getElementById('advancedOptions'),
    autoGenerateDescriptions: document.getElementById('autoGenerateDescriptions'),
    notifyPerson: document.getElementById('notifyPerson'),
    uploadStrategy: document.getElementById('uploadStrategy'),
    
    // Botones de acción
    uploadDocumentBtn: document.getElementById('uploadDocumentBtn'),
    uploadMultipleDocumentsBtn: document.getElementById('uploadMultipleDocumentsBtn'),
    uploadCount: document.getElementById('uploadCount'),
    cancelDocumentBtn: document.getElementById('cancelDocumentBtn'),
    
    // =========================================================================
    
    // Form Elements - Categorías
    categoryForm: document.getElementById('categoryForm'),
    categoryId: document.getElementById('categoryId'),
    categoryName: document.getElementById('categoryName'),
    categoryDescription: document.getElementById('categoryDescription'),
    categoryColor: document.getElementById('categoryColor'),
    categoryIcon: document.getElementById('categoryIcon'),
    saveCategoryBtn: document.getElementById('saveCategoryBtn'),
    cancelCategoryBtn: document.getElementById('cancelCategoryBtn'),
    categoryModalTitle: document.getElementById('categoryModalTitle'),
    
    // Form Elements - Búsqueda Avanzada
    searchForm: document.getElementById('searchForm'),
    searchKeyword: document.getElementById('searchKeyword'),
    searchCategory: document.getElementById('searchCategory'),
    searchDateFrom: document.getElementById('searchDateFrom'),
    searchDateTo: document.getElementById('searchDateTo'),
    searchPerson: document.getElementById('searchPerson'),
    searchStatus: document.getElementById('searchStatus'),
    searchResultsList: document.getElementById('searchResultsList'),
    performSearchBtn: document.getElementById('performSearchBtn'),
    cancelSearchBtn: document.getElementById('cancelSearchBtn'),
    
    // Form Elements - Reportes
    reportForm: document.getElementById('reportForm'),
    reportType: document.getElementById('reportType'),
    reportSpecificFilters: document.getElementById('reportSpecificFilters'),
    reportFormat: document.getElementById('reportFormat'),
    reportPreviewContent: document.getElementById('reportPreviewContent'),
    generateReportBtn: document.getElementById('generateReportBtn'),
    cancelReportBtn: document.getElementById('cancelReportBtn'),
    
    // Progress Container (nuevo)
    uploadProgressContainer: document.createElement('div')
};

// Configurar contenedor de progreso
DOM.uploadProgressContainer.id = 'uploadProgressContainer';
DOM.uploadProgressContainer.className = 'upload-progress';
DOM.uploadProgressContainer.style.display = 'none';

export { DOM };