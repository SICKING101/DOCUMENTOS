// =============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN
// =============================================================================
const CONFIG = {
    API_BASE_URL: 'http://localhost:4000/api',
    CLOUDINARY_CLOUD_NAME: 'dn9ts84q6',
    CLOUDINARY_API_KEY: '797652563747974',
    CLOUDINARY_UPLOAD_PRESET: 'DOCUMENTOS',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png']
};

// =============================================================================
// ESTADO DE LA APLICACIÓN
// =============================================================================
class AppState {
    constructor() {
        this.persons = [];
        this.documents = [];
        this.categories = [];
        this.dashboardStats = {
            totalPersonas: 0,
            totalDocumentos: 0,
            proximosVencer: 0,
            totalCategorias: 0
        };
        this.currentTab = 'dashboard';
        this.selectedFile = null;
        this.isLoading = false;
        this.filters = {
            category: '',
            type: '',
            date: '',
            status: ''
        };
        this.searchResults = [];
        this.currentSearchQuery = '';
    }

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

// =============================================================================
// ELEMENTOS DOM
// =============================================================================
const DOM = {
    // Header
    headerTitle: document.querySelector('.header__title'),
    
    // Navigation
    navLinks: document.querySelectorAll('.header__nav-link'),
    
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

// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================
const appState = new AppState();

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
    console.log('📡 URL de la API:', CONFIG.API_BASE_URL);
    
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

// =============================================================================
// FUNCIONES DE INICIALIZACIÓN
// =============================================================================
function initializeApp() {
    // Verificar que todos los elementos DOM estén disponibles
    const missingElements = Object.keys(DOM).filter(key => {
        if (Array.isArray(DOM[key])) {
            return DOM[key].length === 0;
        }
        return DOM[key] === null;
    });
    
    if (missingElements.length > 0) {
        console.warn('⚠️ Elementos DOM faltantes:', missingElements);
    }
    
    // Mostrar estado inicial
    appState.logState();
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Navegación entre pestañas
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', handleTabNavigation);
    });
    
    // Dashboard
    DOM.refreshDashboard?.addEventListener('click', handleRefreshDashboard);
    DOM.addFirstDocument?.addEventListener('click', () => openDocumentModal());
    
    // Quick Actions
    DOM.quickActions.forEach(action => {
        action.addEventListener('click', handleQuickAction);
    });
    
    // Personas
    DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());
    DOM.savePersonBtn?.addEventListener('click', handleSavePerson);
    DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());
    
    // Documentos
    DOM.addDocumentBtn?.addEventListener('click', () => openDocumentModal());
    DOM.browseFilesBtn?.addEventListener('click', () => DOM.fileInput?.click());
    DOM.fileInput?.addEventListener('change', handleFileSelect);
    DOM.uploadDocumentBtn?.addEventListener('click', handleUploadDocument);
    DOM.cancelDocumentBtn?.addEventListener('click', () => closeDocumentModal());
    
    // Búsqueda de documentos
    DOM.searchDocumentsBtn?.addEventListener('click', handleDocumentSearch);
    DOM.clearSearchBtn?.addEventListener('click', handleClearSearch);
    DOM.documentSearch?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleDocumentSearch();
        }
    });
    
    // Filtros
    DOM.filterCategory?.addEventListener('change', handleFilterChange);
    DOM.filterType?.addEventListener('change', handleFilterChange);
    DOM.filterDate?.addEventListener('change', handleFilterChange);
    DOM.filterStatus?.addEventListener('change', handleFilterChange);
    
    // Categorías
    DOM.addCategoryBtn?.addEventListener('click', () => openCategoryModal());
    DOM.saveCategoryBtn?.addEventListener('click', handleSaveCategory);
    DOM.cancelCategoryBtn?.addEventListener('click', () => closeCategoryModal());
    
    // Búsqueda avanzada
    DOM.performSearchBtn?.addEventListener('click', handleAdvancedSearch);
    DOM.cancelSearchBtn?.addEventListener('click', () => closeSearchModal());
    
    // Reportes
    DOM.reportType?.addEventListener('change', handleReportTypeChange);
    DOM.generateReportBtn?.addEventListener('click', handleGenerateReport);
    DOM.cancelReportBtn?.addEventListener('click', () => closeReportModal());
    
    // Drag and Drop
    setupFileDragAndDrop();
    
    // Modal Close Buttons
    DOM.modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', handleModalClose);
    });
    
    // Cerrar modales al hacer clic fuera
    setupModalBackdropClose();
    
    console.log('✅ Event listeners configurados correctamente');
}

// =============================================================================
// MANEJADORES DE EVENTOS PRINCIPALES
// =============================================================================
function handleTabNavigation(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    switchTab(tabId);
}

function handleRefreshDashboard() {
    console.log('🔄 Actualizando dashboard...');
    loadDashboardData();
}

function handleQuickAction(e) {
    const action = this.querySelector('.action-card__title')?.textContent;
    console.log(`⚡ Acción rápida: ${action}`);
    
    switch(action) {
        case 'Subir Documento':
            openDocumentModal();
            break;
        case 'Agregar Persona':
            openPersonModal();
            break;
        case 'Generar Reporte':
            generateReport();
            break;
        case 'Búsqueda Avanzada':
            showAdvancedSearch();
            break;
        default:
            console.warn('Acción no reconocida:', action);
    }
}

function handleSavePerson() {
    console.log('💾 Guardando persona...');
    savePerson();
}

function handleUploadDocument() {
    console.log('📤 Subiendo documento...');
    uploadDocument();
}

function handleFileSelect(e) {
    console.log('📁 Archivo seleccionado:', e.target.files[0]?.name);
    handleFile(e.target.files[0]);
}

function handleDocumentSearch() {
    const query = DOM.documentSearch.value.trim();
    console.log('🔍 Buscando documentos:', query);
    
    if (query) {
        searchDocuments(query);
    } else {
        showAlert('Por favor ingresa un término de búsqueda', 'warning');
    }
}

function handleClearSearch() {
    console.log('🧹 Limpiando búsqueda...');
    DOM.documentSearch.value = '';
    appState.currentSearchQuery = '';
    renderDocumentsTable();
}

function handleFilterChange() {
    const filterType = this.id.replace('filter', '').toLowerCase();
    const value = this.value;
    
    console.log(`🔍 Filtro ${filterType} cambiado a: ${value}`);
    appState.filters[filterType] = value;
    applyFilters();
}

function handleSaveCategory() {
    console.log('💾 Guardando categoría...');
    saveCategory();
}

function handleAdvancedSearch() {
    console.log('🔍 Realizando búsqueda avanzada...');
    performAdvancedSearch();
}

function handleReportTypeChange() {
    const reportType = this.value;
    console.log(`📊 Cambiando tipo de reporte a: ${reportType}`);
    updateReportFilters(reportType);
}

function handleGenerateReport() {
    console.log('📄 Generando reporte...');
    generateReportData();
}

function handleModalClose() {
    const modal = this.closest('.modal');
    if (modal) {
        if (modal.id === 'personModal') {
            closePersonModal();
        } else if (modal.id === 'documentModal') {
            closeDocumentModal();
        } else if (modal.id === 'categoryModal') {
            closeCategoryModal();
        } else if (modal.id === 'searchModal') {
            closeSearchModal();
        } else if (modal.id === 'reportModal') {
            closeReportModal();
        }
    }
}

// =============================================================================
// FUNCIONES DE NAVEGACIÓN Y UI
// =============================================================================
function switchTab(tabId) {
    // Validar tabId
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }
    
    // Actualizar navegación
    DOM.navLinks.forEach(link => {
        const isActive = link.getAttribute('data-tab') === tabId;
        link.classList.toggle('header__nav-link--active', isActive);
    });
    
    // Mostrar contenido de pestaña seleccionada
    DOM.tabContents.forEach(tab => {
        const isActive = tab.id === tabId;
        tab.classList.toggle('tab-content--active', isActive);
    });
    
    appState.currentTab = tabId;
    console.log(`✅ Pestaña cambiada a: ${tabId}`);
    
    // Cargar datos específicos de la pestaña
    loadTabSpecificData(tabId);
}

function loadTabSpecificData(tabId) {
    switch(tabId) {
        case 'personas':
            loadPersons();
            break;
        case 'documentos':
            loadDocuments();
            break;
        case 'categorias':
            loadCategories();
            break;
        case 'dashboard':
            // El dashboard ya se carga por defecto
            break;
    }
}

// =============================================================================
// FUNCIONES DE CARGA DE DATOS
// =============================================================================
async function loadInitialData() {
    console.log('📥 Cargando datos iniciales...');
    
    try {
        await Promise.all([
            loadDashboardData(),
            loadPersons(),
            loadDocuments(),
            loadCategories()
        ]);
        
        console.log('✅ Datos iniciales cargados correctamente');
        showAlert('Sistema cargado correctamente', 'success');
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        showAlert('Error al cargar datos iniciales', 'error');
    }
}

async function loadDashboardData() {
    if (appState.isLoading) return;
    
    try {
        setLoadingState(true);
        console.log('📊 Cargando datos del dashboard...');
        
        const data = await apiCall('/dashboard');
        
        if (data.success) {
            appState.dashboardStats = data.stats;
            updateDashboardStats();
            loadRecentDocuments(data.recent_documents || []);
            console.log('✅ Dashboard actualizado correctamente');
            showAlert('Dashboard actualizado', 'success');
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showAlert('Error al cargar el dashboard: ' + error.message, 'error');
    } finally {
        setLoadingState(false);
    }
}

async function loadPersons() {
    try {
        console.log('👥 Cargando personas...');
        
        const data = await apiCall('/persons');
        
        if (data.success) {
            appState.persons = data.persons || [];
            renderPersonsTable();
            populatePersonSelect();
            populateSearchPersonSelect();
            console.log(`✅ ${appState.persons.length} personas cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando personas:', error);
        showAlert('Error al cargar personas: ' + error.message, 'error');
    }
}

async function loadDocuments() {
    try {
        console.log('📄 Cargando documentos...');
        
        const data = await apiCall('/documents');
        
        if (data.success) {
            appState.documents = data.documents || [];
            renderDocumentsTable();
            console.log(`✅ ${appState.documents.length} documentos cargados`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        showAlert('Error al cargar documentos: ' + error.message, 'error');
    }
}

async function loadCategories() {
    try {
        console.log('🏷️ Cargando categorías...');
        
        const data = await apiCall('/categories');
        
        if (data.success) {
            appState.categories = data.categories || [];
            renderCategories();
            populateCategorySelects();
            console.log(`✅ ${appState.categories.length} categorías cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
        // No mostrar alerta para evitar spam en pestaña no utilizada
    }
}

// =============================================================================
// FUNCIONES DE RENDERIZADO
// =============================================================================
function updateDashboardStats() {
    DOM.statsCards.totalPersonas.textContent = appState.dashboardStats.totalPersonas;
    DOM.statsCards.totalDocumentos.textContent = appState.dashboardStats.totalDocumentos;
    DOM.statsCards.proximosVencer.textContent = appState.dashboardStats.proximosVencer;
    DOM.statsCards.totalCategorias.textContent = appState.dashboardStats.totalCategorias;
}

function loadRecentDocuments(recentDocuments = []) {
    const docsToShow = recentDocuments.length > 0 ? recentDocuments : appState.documents.slice(0, 5);
    
    DOM.recentDocuments.innerHTML = '';
    
    if (docsToShow.length === 0) {
        DOM.recentDocuments.innerHTML = `
            <article class="empty-state">
                <i class="fas fa-file-alt empty-state__icon"></i>
                <h3 class="empty-state__title">No hay documentos recientes</h3>
                <p class="empty-state__description">Sube tu primer documento para comenzar</p>
                <button class="btn btn--primary" id="addFirstDocument">
                    <i class="fas fa-plus"></i> Subir Documento
                </button>
            </article>
        `;
        // Re-attach event listener
        document.getElementById('addFirstDocument')?.addEventListener('click', () => openDocumentModal());
        return;
    }
    
    docsToShow.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        
        const documentItem = document.createElement('article');
        documentItem.className = 'documents__item';
        
        documentItem.innerHTML = `
            <div class="documents__info">
                <div class="documents__icon">
                    <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
                </div>
                <div class="documents__details">
                    <h4 class="documents__details-name">${doc.nombre_original}</h4>
                    <p class="documents__details-meta">Subido por: ${person.nombre} • ${formatDate(doc.fecha_subida)}</p>
                    ${doc.descripcion ? `<p class="documents__details-description">${doc.descripcion}</p>` : ''}
                </div>
            </div>
            <div class="documents__actions">
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
            </div>
        `;
        
        DOM.recentDocuments.appendChild(documentItem);
    });
}

function renderPersonsTable() {
    DOM.personasTableBody.innerHTML = '';
    
    if (appState.persons.length === 0) {
        DOM.personasTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-users empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay personas registradas</h3>
                    <p class="empty-state__description">Agrega la primera persona para comenzar</p>
                </td>
            </tr>
        `;
        return;
    }
    
    appState.persons.forEach(person => {
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        row.innerHTML = `
            <td class="table__cell">${person.nombre}</td>
            <td class="table__cell">${person.email}</td>
            <td class="table__cell">${person.telefono || '-'}</td>
            <td class="table__cell">${person.departamento || '-'}</td>
            <td class="table__cell">${person.puesto || '-'}</td>
            <td class="table__cell">
                <button class="btn btn--sm btn--outline" onclick="editPerson('${person._id}')" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn--sm btn--danger" onclick="deletePerson('${person._id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        DOM.personasTableBody.appendChild(row);
    });
}

function renderDocumentsTable() {
    DOM.documentosTableBody.innerHTML = '';
    
    let documentsToShow = appState.documents;
    
    // Aplicar búsqueda si existe
    if (appState.currentSearchQuery) {
        const query = appState.currentSearchQuery.toLowerCase();
        documentsToShow = documentsToShow.filter(doc => 
            doc.nombre_original.toLowerCase().includes(query) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
            doc.categoria.toLowerCase().includes(query)
        );
    }
    
    // Aplicar filtros
    if (appState.filters.category) {
        documentsToShow = documentsToShow.filter(doc => doc.categoria === appState.filters.category);
    }
    
    if (appState.filters.type) {
        documentsToShow = documentsToShow.filter(doc => doc.tipo_archivo.toLowerCase() === appState.filters.type.toLowerCase());
    }
    
    if (appState.filters.date) {
        const now = new Date();
        let startDate;
        
        switch(appState.filters.date) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }
        
        documentsToShow = documentsToShow.filter(doc => {
            const docDate = new Date(doc.fecha_subida);
            return docDate >= startDate;
        });
    }
    
    if (appState.filters.status) {
        const now = new Date();
        documentsToShow = documentsToShow.filter(doc => {
            if (!doc.fecha_vencimiento) return appState.filters.status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(appState.filters.status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    if (documentsToShow.length === 0) {
        DOM.documentosTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <i class="fas fa-file-alt empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay documentos</h3>
                    <p class="empty-state__description">${appState.currentSearchQuery || appState.filters.category || appState.filters.type || appState.filters.date || appState.filters.status ? 'No hay documentos que coincidan con la búsqueda o filtros aplicados' : 'Sube tu primer documento para comenzar'}</p>
                </td>
            </tr>
        `;
        return;
    }
    
    documentsToShow.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        const fileSize = formatFileSize(doc.tamano_archivo);
        const uploadDate = formatDate(doc.fecha_subida);
        
        // Determinar estado de vencimiento
        let vencimientoClass = '';
        let vencimientoText = '';
        let statusIndicator = '';
        
        if (doc.fecha_vencimiento) {
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const hoy = new Date();
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias <= 0) {
                vencimientoClass = 'badge--danger';
                vencimientoText = 'Vencido';
                statusIndicator = '<span class="status-indicator status-indicator--danger"></span>';
            } else if (diferenciaDias <= 7) {
                vencimientoClass = 'badge--warning';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusIndicator = '<span class="status-indicator status-indicator--warning"></span>';
            } else if (diferenciaDias <= 30) {
                vencimientoClass = 'badge--info';
                vencimientoText = `Vence en ${diferenciaDias} días`;
                statusIndicator = '<span class="status-indicator status-indicator--success"></span>';
            } else {
                vencimientoText = formatDate(doc.fecha_vencimiento);
                statusIndicator = '<span class="status-indicator status-indicator--success"></span>';
            }
        }
        
        const row = document.createElement('tr');
        row.className = 'table__row';
        
        row.innerHTML = `
            <td class="table__cell">
                <div class="documents__info documents__info--inline">
                    <div class="documents__icon documents__icon--sm">
                        <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
                    </div>
                    <div>
                        <div class="documents__details-name">${doc.nombre_original}</div>
                        ${doc.descripcion ? `<div class="documents__details-description">${doc.descripcion}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="table__cell"><span class="badge badge--info">${doc.tipo_archivo.toUpperCase()}</span></td>
            <td class="table__cell">${fileSize}</td>
            <td class="table__cell">${person.nombre}</td>
            <td class="table__cell"><span class="badge badge--info">${doc.categoria}</span></td>
            <td class="table__cell">${uploadDate}</td>
            <td class="table__cell">
                ${statusIndicator}
                ${vencimientoText ? `<span class="badge ${vencimientoClass}">${vencimientoText}</span>` : 'Sin vencimiento'}
            </td>
            <td class="table__cell">
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn--sm btn--danger" onclick="deleteDocument('${doc._id}')" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        DOM.documentosTableBody.appendChild(row);
    });
}

function renderCategories() {
    // Renderizar tarjetas de estadísticas
    if (DOM.categoriesStats) {
        DOM.categoriesStats.innerHTML = '';
        
        if (appState.categories.length === 0) {
            DOM.categoriesStats.innerHTML = `
                <article class="empty-state">
                    <i class="fas fa-tags empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay categorías creadas</h3>
                    <p class="empty-state__description">Crea tu primera categoría para organizar los documentos</p>
                </article>
            `;
            return;
        }
        
        appState.categories.forEach(category => {
            const categoryCard = document.createElement('article');
            categoryCard.className = 'stats__card';
            
            categoryCard.innerHTML = `
                <div class="stats__icon" style="background: linear-gradient(135deg, ${category.color || '#4f46e5'}, #4338ca);">
                    <i class="fas fa-${category.icon || 'folder'}"></i>
                </div>
                <div class="stats__info">
                    <h3 class="stats__info-value">${category.documentCount || 0}</h3>
                    <p class="stats__info-label">${category.nombre}</p>
                </div>
            `;
            
            DOM.categoriesStats.appendChild(categoryCard);
        });
    }
    
    // Renderizar tabla de categorías
    if (DOM.categoriasTableBody) {
        DOM.categoriasTableBody.innerHTML = '';
        
        if (appState.categories.length === 0) {
            DOM.categoriasTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-tags empty-state__icon"></i>
                        <h3 class="empty-state__title">No hay categorías creadas</h3>
                        <p class="empty-state__description">Crea tu primera categoría para organizar los documentos</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        appState.categories.forEach(category => {
            const row = document.createElement('tr');
            row.className = 'table__row';
            
            row.innerHTML = `
                <td class="table__cell">${category.nombre}</td>
                <td class="table__cell">${category.descripcion || '-'}</td>
                <td class="table__cell">
                    <span class="color-preview" style="background-color: ${category.color || '#4f46e5'}"></span>
                    ${category.color || '#4f46e5'}
                </td>
                <td class="table__cell">
                    <i class="fas fa-${category.icon || 'folder'}"></i> ${getIconName(category.icon || 'folder')}
                </td>
                <td class="table__cell">${category.documentCount || 0}</td>
                <td class="table__cell">
                    <button class="btn btn--sm btn--outline" onclick="editCategory('${category._id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--sm btn--danger" onclick="deleteCategory('${category._id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            DOM.categoriasTableBody.appendChild(row);
        });
    }
}

// =============================================================================
// FUNCIONES DE PERSONAS (CRUD)
// =============================================================================
function openPersonModal(personId = null) {
    console.log(`👤 Abriendo modal de persona: ${personId || 'Nueva'}`);
    
    if (personId) {
        DOM.personModalTitle.textContent = 'Editar Persona';
        const person = appState.persons.find(p => p._id === personId);
        if (person) {
            DOM.personId.value = person._id;
            DOM.personName.value = person.nombre;
            DOM.personEmail.value = person.email;
            DOM.personPhone.value = person.telefono || '';
            DOM.personDepartment.value = person.departamento || '';
            DOM.personPosition.value = person.puesto || '';
        }
    } else {
        DOM.personModalTitle.textContent = 'Agregar Persona';
        DOM.personForm.reset();
        DOM.personId.value = '';
    }
    
    DOM.personModal.style.display = 'flex';
}

function closePersonModal() {
    console.log('❌ Cerrando modal de persona');
    DOM.personModal.style.display = 'none';
}

async function savePerson() {
    // Validaciones
    if (!DOM.personName.value.trim() || !DOM.personEmail.value.trim()) {
        showAlert('Nombre y email son obligatorios', 'error');
        return;
    }
    
    if (!isValidEmail(DOM.personEmail.value)) {
        showAlert('Por favor ingresa un email válido', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.savePersonBtn);
        
        const personData = {
            nombre: DOM.personName.value.trim(),
            email: DOM.personEmail.value.trim(),
            telefono: DOM.personPhone.value.trim(),
            departamento: DOM.personDepartment.value.trim(),
            puesto: DOM.personPosition.value.trim()
        };
        
        console.log('💾 Guardando persona:', personData);
        
        let data;
        if (DOM.personId.value) {
            // Actualizar persona existente
            data = await apiCall(`/persons/${DOM.personId.value}`, {
                method: 'PUT',
                body: JSON.stringify(personData)
            });
        } else {
            // Crear nueva persona
            data = await apiCall('/persons', {
                method: 'POST',
                body: JSON.stringify(personData)
            });
        }
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadPersons();
            closePersonModal();
            
            // Actualizar dashboard si está visible
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando persona:', error);
        showAlert('Error al guardar persona: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.savePersonBtn);
    }
}

function editPerson(id) {
    console.log('✏️ Editando persona:', id);
    openPersonModal(id);
}

async function deletePerson(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta persona?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando persona:', id);
        
        const data = await apiCall(`/persons/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadPersons();
            
            // Actualizar dashboard si está visible
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando persona:', error);
        showAlert('Error al eliminar persona: ' + error.message, 'error');
    }
}

// =============================================================================
// FUNCIONES DE DOCUMENTOS (CRUD)
// =============================================================================
function openDocumentModal() {
    console.log('📄 Abriendo modal de documento');
    
    DOM.documentForm.reset();
    DOM.fileInfo.style.display = 'none';
    DOM.uploadDocumentBtn.disabled = true;
    appState.selectedFile = null;
    DOM.fileUploadContainer.classList.remove('upload__container--dragover');
    
    // Poblar selects
    populatePersonSelect();
    populateCategorySelect(DOM.documentCategory);
    
    DOM.documentModal.style.display = 'flex';
}

function closeDocumentModal() {
    console.log('❌ Cerrando modal de documento');
    DOM.documentModal.style.display = 'none';
}

function setupFileDragAndDrop() {
    if (!DOM.fileUploadContainer) return;
    
    DOM.fileUploadContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('upload__container--dragover');
    });
    
    DOM.fileUploadContainer.addEventListener('dragleave', function() {
        this.classList.remove('upload__container--dragover');
    });
    
    DOM.fileUploadContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('upload__container--dragover');
        
        if (e.dataTransfer.files.length) {
            console.log('📁 Archivo arrastrado:', e.dataTransfer.files[0].name);
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file) {
        console.warn('⚠️ No se proporcionó archivo');
        return;
    }
    
    console.log('📋 Procesando archivo:', file.name);
    
    // Validar tipo de archivo
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(fileExtension)) {
        showAlert(`Tipo de archivo no permitido. Formatos aceptados: ${CONFIG.ALLOWED_FILE_TYPES.join(', ').toUpperCase()}`, 'error');
        return;
    }
    
    // Validar tamaño
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showAlert(`El archivo excede el tamaño máximo permitido (${formatFileSize(CONFIG.MAX_FILE_SIZE)})`, 'error');
        return;
    }
    
    appState.selectedFile = file;
    
    // Mostrar información del archivo
    DOM.fileName.textContent = file.name;
    DOM.fileSize.textContent = formatFileSize(file.size);
    DOM.fileInfo.style.display = 'block';
    DOM.uploadDocumentBtn.disabled = false;
    
    console.log('✅ Archivo validado correctamente');
}

async function handleUploadDocument() {
    if (!appState.selectedFile) {
        showAlert('Por favor selecciona un archivo', 'error');
        return;
    }
    
    // Validar campos obligatorios
    if (!DOM.documentCategory.value) {
        showAlert('Por favor selecciona una categoría', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.uploadDocumentBtn);
        
        console.log('📤 Iniciando upload del documento...');
        
        const formData = new FormData();
        formData.append('file', appState.selectedFile);
        formData.append('descripcion', DOM.documentDescription.value);
        formData.append('categoria', DOM.documentCategory.value);
        formData.append('fecha_vencimiento', DOM.documentExpiration.value);
        formData.append('persona_id', DOM.documentPerson.value);

        const response = await fetch(`${CONFIG.API_BASE_URL}/documents`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showAlert(data.message, 'success');
            await loadDocuments();
            closeDocumentModal();
            
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error subiendo documento:', error);
        showAlert('Error al subir documento: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.uploadDocumentBtn);
    }
}

function populatePersonSelect() {
    if (!DOM.documentPerson) return;
    
    DOM.documentPerson.innerHTML = '<option value="">Seleccionar persona</option>';
    
    appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person._id;
        option.textContent = person.nombre;
        DOM.documentPerson.appendChild(option);
    });
}

function populateSearchPersonSelect() {
    if (!DOM.searchPerson) return;
    
    DOM.searchPerson.innerHTML = '<option value="">Todas las personas</option>';
    
    appState.persons.forEach(person => {
        const option = document.createElement('option');
        option.value = person._id;
        option.textContent = person.nombre;
        DOM.searchPerson.appendChild(option);
    });
}

async function downloadDocument(id) {
    try {
        console.log('📥 Descargando documento:', id);
        
        showAlert('Iniciando descarga del documento...', 'info');
        
        // Crear un enlace temporal para la descarga
        const downloadLink = document.createElement('a');
        downloadLink.href = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        downloadLink.target = '_blank';
        downloadLink.download = '';
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        showAlert('Descarga iniciada correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error descargando documento:', error);
        showAlert('Error al descargar documento: ' + error.message, 'error');
    }
}

function previewDocument(id) {
    console.log('👁️ Vista previa del documento:', id);
    
    const document = appState.documents.find(doc => doc._id === id);
    if (!document) {
        showAlert('Documento no encontrado', 'error');
        return;
    }
    
    // Abrir el documento en una nueva pestaña
    window.open(`${CONFIG.API_BASE_URL}/documents/${id}/preview`, '_blank');
}

async function deleteDocument(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando documento:', id);
        
        const data = await apiCall(`/documents/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadDocuments();
            
            if (appState.currentTab === 'dashboard') {
                await loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando documento:', error);
        showAlert('Error al eliminar documento: ' + error.message, 'error');
    }
}

// =============================================================================
// FUNCIONES DE BÚSQUEDA DE DOCUMENTOS
// =============================================================================
function searchDocuments(query) {
    console.log('🔍 Buscando documentos con query:', query);
    
    appState.currentSearchQuery = query;
    renderDocumentsTable();
    
    showAlert(`Se encontraron ${getFilteredDocuments().length} documentos para "${query}"`, 'success');
}

function getFilteredDocuments() {
    let documents = appState.documents;
    
    // Aplicar búsqueda si existe
    if (appState.currentSearchQuery) {
        const query = appState.currentSearchQuery.toLowerCase();
        documents = documents.filter(doc => 
            doc.nombre_original.toLowerCase().includes(query) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
            doc.categoria.toLowerCase().includes(query)
        );
    }
    
    // Aplicar filtros
    if (appState.filters.category) {
        documents = documents.filter(doc => doc.categoria === appState.filters.category);
    }
    
    if (appState.filters.type) {
        documents = documents.filter(doc => doc.tipo_archivo.toLowerCase() === appState.filters.type.toLowerCase());
    }
    
    if (appState.filters.date) {
        const now = new Date();
        let startDate;
        
        switch(appState.filters.date) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }
        
        documents = documents.filter(doc => {
            const docDate = new Date(doc.fecha_subida);
            return docDate >= startDate;
        });
    }
    
    if (appState.filters.status) {
        const now = new Date();
        documents = documents.filter(doc => {
            if (!doc.fecha_vencimiento) return appState.filters.status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(appState.filters.status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    return documents;
}

function showAdvancedSearch() {
    console.log('🔍 Abriendo búsqueda avanzada...');
    
    // Poblar selects
    populateCategorySelect(DOM.searchCategory);
    populateSearchPersonSelect();
    
    DOM.searchModal.style.display = 'flex';
}

function closeSearchModal() {
    console.log('❌ Cerrando modal de búsqueda avanzada');
    DOM.searchModal.style.display = 'none';
}

function performAdvancedSearch() {
    console.log('🔍 Realizando búsqueda avanzada...');
    
    const keyword = DOM.searchKeyword.value.trim();
    const category = DOM.searchCategory.value;
    const dateFrom = DOM.searchDateFrom.value;
    const dateTo = DOM.searchDateTo.value;
    const person = DOM.searchPerson.value;
    const status = DOM.searchStatus.value;
    
    // Construir objeto de búsqueda
    const searchCriteria = {
        keyword,
        category,
        dateFrom,
        dateTo,
        person,
        status
    };
    
    console.log('Criterios de búsqueda:', searchCriteria);
    
    // Realizar búsqueda
    let results = appState.documents;
    
    if (keyword) {
        results = results.filter(doc => 
            doc.nombre_original.toLowerCase().includes(keyword.toLowerCase()) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(keyword.toLowerCase()))
        );
    }
    
    if (category) {
        results = results.filter(doc => doc.categoria === category);
    }
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        results = results.filter(doc => new Date(doc.fecha_subida) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Fin del día
        results = results.filter(doc => new Date(doc.fecha_subida) <= toDate);
    }
    
    if (person) {
        results = results.filter(doc => doc.persona_id && doc.persona_id._id === person);
    }
    
    if (status) {
        const now = new Date();
        results = results.filter(doc => {
            if (!doc.fecha_vencimiento) return status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    // Mostrar resultados
    displaySearchResults(results);
    
    showAlert(`Se encontraron ${results.length} documentos con los criterios especificados`, 'success');
}

function displaySearchResults(results) {
    DOM.searchResultsList.innerHTML = '';
    
    if (results.length === 0) {
        DOM.searchResultsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search empty-state__icon"></i>
                <h3 class="empty-state__title">No se encontraron documentos</h3>
                <p class="empty-state__description">Intenta con otros criterios de búsqueda</p>
            </div>
        `;
        return;
    }
    
    results.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        const fileSize = formatFileSize(doc.tamano_archivo);
        const uploadDate = formatDate(doc.fecha_subida);
        
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <div class="search-result-item__icon">
                <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
            </div>
            <div class="search-result-item__content">
                <h4 class="search-result-item__title">${doc.nombre_original}</h4>
                <p class="search-result-item__meta">
                    <span class="badge badge--info">${doc.tipo_archivo.toUpperCase()}</span>
                    <span>${fileSize}</span>
                    <span>${person.nombre}</span>
                    <span>${doc.categoria}</span>
                    <span>${uploadDate}</span>
                </p>
                ${doc.descripcion ? `<p class="search-result-item__description">${doc.descripcion}</p>` : ''}
            </div>
            <div class="search-result-item__actions">
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        
        DOM.searchResultsList.appendChild(resultItem);
    });
}

// =============================================================================
// FUNCIONES DE CATEGORÍAS (CRUD)
// =============================================================================
function openCategoryModal(categoryId = null) {
    console.log(`🏷️ Abriendo modal de categoría: ${categoryId || 'Nueva'}`);
    
    if (categoryId) {
        DOM.categoryModalTitle.textContent = 'Editar Categoría';
        const category = appState.categories.find(c => c._id === categoryId);
        if (category) {
            DOM.categoryId.value = category._id;
            DOM.categoryName.value = category.nombre;
            DOM.categoryDescription.value = category.descripcion || '';
            DOM.categoryColor.value = category.color || '#4f46e5';
            DOM.categoryIcon.value = category.icon || 'folder';
        }
    } else {
        DOM.categoryModalTitle.textContent = 'Nueva Categoría';
        DOM.categoryForm.reset();
        DOM.categoryId.value = '';
        DOM.categoryColor.value = '#4f46e5';
        DOM.categoryIcon.value = 'folder';
    }
    
    DOM.categoryModal.style.display = 'flex';
}

function closeCategoryModal() {
    console.log('❌ Cerrando modal de categoría');
    DOM.categoryModal.style.display = 'none';
}

async function saveCategory() {
    // Validaciones
    if (!DOM.categoryName.value.trim()) {
        showAlert('El nombre de la categoría es obligatorio', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.saveCategoryBtn);
        
        const categoryData = {
            nombre: DOM.categoryName.value.trim(),
            descripcion: DOM.categoryDescription.value.trim(),
            color: DOM.categoryColor.value,
            icon: DOM.categoryIcon.value
        };
        
        console.log('💾 Guardando categoría:', categoryData);
        
        let data;
        if (DOM.categoryId.value) {
            // Actualizar categoría existente
            data = await apiCall(`/categories/${DOM.categoryId.value}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });
        } else {
            // Crear nueva categoría
            data = await apiCall('/categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });
        }
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadCategories();
            closeCategoryModal();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando categoría:', error);
        showAlert('Error al guardar categoría: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.saveCategoryBtn);
    }
}

function editCategory(id) {
    console.log('✏️ Editando categoría:', id);
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Los documentos asociados quedarán sin categoría.')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando categoría:', id);
        
        const data = await apiCall(`/categories/${id}`, {
            method: 'DELETE'
        });
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadCategories();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando categoría:', error);
        showAlert('Error al eliminar categoría: ' + error.message, 'error');
    }
}

function populateCategorySelects() {
    // Poblar select de categorías en filtros
    if (DOM.filterCategory) {
        DOM.filterCategory.innerHTML = '<option value="">Todas las categorías</option>';
        appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.filterCategory.appendChild(option);
        });
    }
    
    // Poblar select de categorías en búsqueda avanzada
    if (DOM.searchCategory) {
        DOM.searchCategory.innerHTML = '<option value="">Todas las categorías</option>';
        appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.searchCategory.appendChild(option);
        });
    }
}

function populateCategorySelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">Seleccionar categoría</option>';
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.nombre;
        option.textContent = category.nombre;
        selectElement.appendChild(option);
    });
}

// =============================================================================
// FUNCIONES DE REPORTES
// =============================================================================
function generateReport() {
    console.log('📊 Abriendo generador de reportes...');
    
    // Actualizar filtros específicos según el tipo de reporte
    updateReportFilters(DOM.reportType.value);
    
    DOM.reportModal.style.display = 'flex';
}

function closeReportModal() {
    console.log('❌ Cerrando modal de reportes');
    DOM.reportModal.style.display = 'none';
}

function updateReportFilters(reportType) {
    console.log(`📊 Actualizando filtros para reporte: ${reportType}`);
    
    DOM.reportSpecificFilters.innerHTML = '';
    
    switch(reportType) {
        case 'byCategory':
            DOM.reportSpecificFilters.innerHTML = `
                <div class="form__group">
                    <label for="reportCategory" class="form__label">Categoría</label>
                    <select id="reportCategory" class="form__select">
                        <option value="">Todas las categorías</option>
                        ${appState.categories.map(cat => `<option value="${cat.nombre}">${cat.nombre}</option>`).join('')}
                    </select>
                </div>
            `;
            break;
            
        case 'byPerson':
            DOM.reportSpecificFilters.innerHTML = `
                <div class="form__group">
                    <label for="reportPerson" class="form__label">Persona</label>
                    <select id="reportPerson" class="form__select">
                        <option value="">Todas las personas</option>
                        ${appState.persons.map(person => `<option value="${person._id}">${person.nombre}</option>`).join('')}
                    </select>
                </div>
            `;
            break;
            
        case 'expiring':
            DOM.reportSpecificFilters.innerHTML = `
                <div class="form__group">
                    <label for="reportDays" class="form__label">Días hasta vencimiento</label>
                    <input type="number" id="reportDays" class="form__input" value="30" min="1">
                </div>
            `;
            break;
            
        default:
            // No se necesitan filtros adicionales para reporte general o vencidos
            break;
    }
    
    // Actualizar vista previa
    updateReportPreview();
}

function updateReportPreview() {
    const reportType = DOM.reportType.value;
    let previewContent = '';
    
    switch(reportType) {
        case 'general':
            previewContent = `
                <p><strong>Resumen General del Sistema</strong></p>
                <ul>
                    <li>Total de personas: ${appState.persons.length}</li>
                    <li>Total de documentos: ${appState.documents.length}</li>
                    <li>Total de categorías: ${appState.categories.length}</li>
                    <li>Documentos próximos a vencer: ${appState.dashboardStats.proximosVencer}</li>
                </ul>
            `;
            break;
            
        case 'byCategory':
            const selectedCategory = document.getElementById('reportCategory')?.value;
            if (selectedCategory) {
                const categoryDocs = appState.documents.filter(doc => doc.categoria === selectedCategory);
                previewContent = `
                    <p><strong>Reporte por Categoría: ${selectedCategory}</strong></p>
                    <ul>
                        <li>Total de documentos: ${categoryDocs.length}</li>
                        <li>Tipos de archivo: ${[...new Set(categoryDocs.map(doc => doc.tipo_archivo))].join(', ')}</li>
                    </ul>
                `;
            } else {
                previewContent = `
                    <p><strong>Reporte por Categorías</strong></p>
                    <ul>
                        ${appState.categories.map(cat => `
                            <li>${cat.nombre}: ${appState.documents.filter(doc => doc.categoria === cat.nombre).length} documentos</li>
                        `).join('')}
                    </ul>
                `;
            }
            break;
            
        case 'byPerson':
            const selectedPerson = document.getElementById('reportPerson')?.value;
            if (selectedPerson) {
                const person = appState.persons.find(p => p._id === selectedPerson);
                const personDocs = appState.documents.filter(doc => doc.persona_id && doc.persona_id._id === selectedPerson);
                previewContent = `
                    <p><strong>Reporte por Persona: ${person ? person.nombre : 'No encontrada'}</strong></p>
                    <ul>
                        <li>Total de documentos: ${personDocs.length}</li>
                        <li>Categorías: ${[...new Set(personDocs.map(doc => doc.categoria))].join(', ')}</li>
                    </ul>
                `;
            } else {
                previewContent = `
                    <p><strong>Reporte por Personas</strong></p>
                    <ul>
                        ${appState.persons.map(person => `
                            <li>${person.nombre}: ${appState.documents.filter(doc => doc.persona_id && doc.persona_id._id === person._id).length} documentos</li>
                        `).join('')}
                    </ul>
                `;
            }
            break;
            
        case 'expiring':
            const days = document.getElementById('reportDays')?.value || 30;
            const expiringDocs = appState.documents.filter(doc => {
                if (!doc.fecha_vencimiento) return false;
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const hoy = new Date();
                const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                return diferenciaDias <= days && diferenciaDias > 0;
            });
            previewContent = `
                <p><strong>Documentos que vencen en los próximos ${days} días</strong></p>
                <ul>
                    <li>Total de documentos: ${expiringDocs.length}</li>
                    <li>Por categorías: ${[...new Set(expiringDocs.map(doc => doc.categoria))].join(', ')}</li>
                </ul>
            `;
            break;
            
        case 'expired':
            const expiredDocs = appState.documents.filter(doc => {
                if (!doc.fecha_vencimiento) return false;
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const hoy = new Date();
                return fechaVencimiento < hoy;
            });
            previewContent = `
                <p><strong>Documentos Vencidos</strong></p>
                <ul>
                    <li>Total de documentos: ${expiredDocs.length}</li>
                    <li>Por categorías: ${[...new Set(expiredDocs.map(doc => doc.categoria))].join(', ')}</li>
                <li>Necesitan atención inmediata</li>
                </ul>
            `;
            break;
    }
    
    DOM.reportPreviewContent.innerHTML = previewContent;
}

function handleGenerateReport() {
    console.group('📊 Generando Reporte');
    console.time('⏱️ Tiempo de generación');
    
    const reportType = DOM.reportType.value;
    const reportFormat = DOM.reportFormat.value;
    
    console.log('Tipo de reporte:', reportType);
    console.log('Formato solicitado:', reportFormat);
    
    // Construir filtros según el tipo de reporte
    const filters = {
        reportType: reportType
    };
    
    // Agregar filtros específicos según el tipo de reporte
    switch(reportType) {
        case 'byCategory':
            const categorySelect = document.getElementById('reportCategory');
            if (categorySelect) {
                filters.categoria = categorySelect.value;
                console.log('Filtro categoría:', filters.categoria || 'Todas');
            }
            break;
            
        case 'byPerson':
            const personSelect = document.getElementById('reportPerson');
            if (personSelect) {
                filters.persona_id = personSelect.value;
                console.log('Filtro persona:', filters.persona_id || 'Todas');
            }
            break;
            
        case 'expiring':
            const daysInput = document.getElementById('reportDays');
            if (daysInput) {
                filters.dias = parseInt(daysInput.value) || 30;
                console.log('Días hasta vencimiento:', filters.dias);
            }
            break;
    }
    
    // Llamada a la API para generar el reporte
    setLoadingState(true, DOM.generateReportBtn);
    
    console.log('📤 Enviando petición al servidor...');
    
    fetch(`${CONFIG.API_BASE_URL}/reports/${reportFormat}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
    })
    .then(response => {
        console.log('📥 Respuesta recibida:', response.status);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return response.blob();
    })
    .then(blob => {
        console.log('✅ Blob recibido:', {
            size: blob.size,
            type: blob.type
        });
        
        // Crear URL temporal para el blob
        const url = window.URL.createObjectURL(blob);
        
        // Determinar extensión del archivo
        let extension = reportFormat;
        if (reportFormat === 'csv') extension = 'csv';
        if (reportFormat === 'excel') extension = 'xlsx';
        if (reportFormat === 'pdf') extension = 'pdf';
        
        // Crear nombre del archivo con timestamp
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `reporte_${reportType}_${timestamp}.${extension}`;
        
        console.log('📥 Descargando archivo:', fileName);
        
        // Crear elemento <a> temporal para descargar
        const a = window.document.createElement('a');
        a.href = url;
        a.download = fileName;
        window.document.body.appendChild(a);
        a.click();
        
        // Limpiar
        window.document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Archivo descargado exitosamente');
        console.timeEnd('⏱️ Tiempo de generación');
        console.groupEnd();
        
        setLoadingState(false, DOM.generateReportBtn);
        showAlert(`Reporte generado y descargado exitosamente`, 'success');
        closeReportModal();
    })
    .catch(error => {
        console.error('❌ Error generando reporte:', error);
        console.timeEnd('⏱️ Tiempo de generación');
        console.groupEnd();
        
        setLoadingState(false, DOM.generateReportBtn);
        showAlert(`Error al generar el reporte: ${error.message}`, 'error');
    });
}

// =============================================================================
// FUNCIONES UTILITARIAS
// =============================================================================
function setLoadingState(loading, element = null) {
    appState.isLoading = loading;
    
    if (element) {
        if (loading) {
            const originalText = element.innerHTML;
            element.innerHTML = '<div class="spinner"></div> Procesando...';
            element.disabled = true;
            element.dataset.originalText = originalText;
        } else {
            if (element.dataset.originalText) {
                element.innerHTML = element.dataset.originalText;
                element.disabled = false;
            }
        }
    }
    
    // Añadir/remover clase de loading al body
    document.body.classList.toggle('loading', loading);
}

function showAlert(message, type = 'info') {
    console.log(`🔔 Alert [${type}]: ${message}`);
    
    const alert = document.createElement('div');
    alert.className = `alert alert--${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    alert.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    DOM.alertContainer.appendChild(alert);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function setupModalBackdropClose() {
    window.addEventListener('click', function(e) {
        if (e.target === DOM.personModal) {
            closePersonModal();
        }
        if (e.target === DOM.documentModal) {
            closeDocumentModal();
        }
        if (e.target === DOM.categoryModal) {
            closeCategoryModal();
        }
        if (e.target === DOM.searchModal) {
            closeSearchModal();
        }
        if (e.target === DOM.reportModal) {
            closeReportModal();
        }
    });
}

function applyFilters() {
    console.log('🔍 Aplicando filtros...', appState.filters);
    renderDocumentsTable();
}

// =============================================================================
// FUNCIONES DE FORMATO Y VALIDACIÓN
// =============================================================================
function getFileIcon(fileType) {
    const iconMap = {
        'pdf': 'pdf',
        'doc': 'word',
        'docx': 'word',
        'txt': 'alt',
        'jpg': 'image',
        'jpeg': 'image',
        'png': 'image'
    };
    
    return iconMap[fileType.toLowerCase()] || 'file';
}

function getIconName(iconValue) {
    const iconNames = {
        'folder': 'Carpeta',
        'file-contract': 'Contrato',
        'id-card': 'Identificación',
        'certificate': 'Certificado',
        'chart-line': 'Reporte',
        'file-invoice': 'Factura',
        'file-medical': 'Médico',
        'graduation-cap': 'Académico',
        'briefcase': 'Laboral',
        'home': 'Personal'
    };
    
    return iconNames[iconValue] || 'Carpeta';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric'
        };
        return date.toLocaleDateString('es-ES', options);
    } catch (error) {
        console.warn('Error formateando fecha:', error);
        return 'Fecha inválida';
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// =============================================================================
// FUNCIÓN AUXILIAR PARA LLAMADAS A LA API
// =============================================================================
async function apiCall(endpoint, options = {}) {
    try {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        if (finalOptions.body && typeof finalOptions.body === 'object' && !(finalOptions.body instanceof FormData)) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, finalOptions);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error en API call:', error);
        throw error;
    }
}

// =============================================================================
// FUNCIONES GLOBALES PARA DEBUG Y TEST
// =============================================================================
function debugAppState() {
    console.group('🔧 Debug App State');
    appState.logState();
    console.groupEnd();
}

function testAPIConnection() {
    console.log('🧪 Probando conexión API...');
    showAlert('Probando conexión con el servidor...', 'info');
    
    fetch(`${CONFIG.API_BASE_URL}/health`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Conexión con el servidor establecida correctamente', 'success');
            } else {
                throw new Error(data.message);
            }
        })
        .catch(error => {
            console.error('❌ Error conectando con el servidor:', error);
            showAlert('Error al conectar con el servidor: ' + error.message, 'error');
        });
}

function testCloudinaryConnection() {
    console.log('☁️ Probando Cloudinary...');
    showAlert('Probando conexión con Cloudinary...', 'info');
    
    // Tu funcionalidad de Cloudinary intacta
    console.log('Cloudinary Config:', {
        cloudName: CONFIG.CLOUDINARY_CLOUD_NAME,
        apiKey: CONFIG.CLOUDINARY_API_KEY,
        uploadPreset: CONFIG.CLOUDINARY_UPLOAD_PRESET
    });
    
    showAlert('Configuración de Cloudinary verificada correctamente', 'success');
}

function resetApp() {
    if (confirm('¿Estás seguro de que deseas resetear la aplicación? Se perderán los datos no guardados.')) {
        localStorage.clear();
        location.reload();
    }
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================
window.downloadDocument = downloadDocument;
window.previewDocument = previewDocument;
window.deleteDocument = deleteDocument;
window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.openDocumentModal = openDocumentModal;
window.openPersonModal = openPersonModal;
window.showAllDocuments = showAllDocuments;
window.debugAppState = debugAppState;
window.testAPIConnection = testAPIConnection;
window.testCloudinaryConnection = testCloudinaryConnection;
window.resetApp = resetApp;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

// =============================================================================
// MANEJO DE ERRORES GLOBALES
// =============================================================================
window.addEventListener('error', function(e) {
    console.error('🚨 Error global capturado:', e.error);
    showAlert('Ha ocurrido un error inesperado. Revisa la consola para más detalles.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('🚨 Promise rechazada no manejada:', e.reason);
    showAlert('Error en operación asíncrona. Revisa la consola para más detalles.', 'error');
});

console.log('✅ Script de aplicación cargado correctamente');