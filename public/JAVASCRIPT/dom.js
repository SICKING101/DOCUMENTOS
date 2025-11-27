// =============================================================================
// ELEMENTOS DOM
// =============================================================================
const DOM = {
    // Header
    headerTitle: document.querySelector('.header__title'),
    
    // Navigation
    navLinks: document.querySelectorAll('.sidebar__nav-link'),
    
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
    
    // Search Elements
    documentSearch: document.getElementById('documentSearch'),
    searchDocumentsBtn: document.getElementById('searchDocumentsBtn'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    
    // Filter Elements
    filterCategory: document.getElementById('filterCategory'),
    filterType: document.getElementById('filterType'),
    filterDate: document.getElementById('filterDate'),
    filterStatus: document.getElementById('filterStatus'),
    
    // Categorías Elements
    categoriesStats: document.getElementById('categoriesStats'),
    categoriasTableBody: document.getElementById('categoriasTableBody'),
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
    
    // Form Elements - Documentos
    documentForm: document.getElementById('documentForm'),
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
    uploadDocumentBtn: document.getElementById('uploadDocumentBtn'),
    cancelDocumentBtn: document.getElementById('cancelDocumentBtn'),
    
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
    
    // Alert Container
    alertContainer: document.getElementById('alertContainer'),
    
    // Modal Close Buttons
    modalCloseButtons: document.querySelectorAll('.modal__close')
};

export { DOM };