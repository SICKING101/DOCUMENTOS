import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { showAlert, setupModalBackdropClose } from './utils.js';

// Importar todos los módulos
import { 
    loadDashboardData, 
    handleRefreshDashboard 
} from './modules/dashboard.js';

import { 
    openPersonModal, 
    closePersonModal, 
    savePerson, 
    loadPersons, 
    renderPersonsTable, 
    populatePersonSelect, 
    editPerson, 
    deletePerson, 
    handleSavePerson 
} from './modules/personas.js';

import { 
    openDocumentModal, 
    closeDocumentModal, 
    setupFileDragAndDrop, 
    handleFile, 
    handleUploadDocument, 
    loadDocuments, 
    renderDocumentsTable, 
    downloadDocument, 
    previewDocument, 
    deleteDocument, 
    handleFileSelect 
} from './modules/documentos.js';

import { 
    openCategoryModal, 
    closeCategoryModal, 
    saveCategory, 
    loadCategories, 
    renderCategories, 
    populateCategorySelects, 
    editCategory, 
    deleteCategory, 
    handleSaveCategory 
} from './modules/categorias.js';

import { 
    showAdvancedSearch, 
    closeSearchModal, 
    handleDocumentSearch, 
    handleClearSearch, 
    handleFilterChange, 
    handleAdvancedSearch 
} from './modules/search.js';

import { 
    generateReport, 
    closeReportModal, 
    handleGenerateReport, 
    handleReportTypeChange 
} from './modules/reports.js';
 

import {
    openAddTaskModal,
    closeAddTaskModal,
    handleSaveTask
} from './modules/tasks.js';



// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================
const appState = new AppState();

// Hacer appState global para todos los módulos
window.appState = appState;

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
    DOM.refreshDashboard?.addEventListener('click', () => handleRefreshDashboard(appState));
    DOM.addFirstDocument?.addEventListener('click', () => openDocumentModal());
    
    // Quick Actions
    DOM.quickActions.forEach(action => {
        action.addEventListener('click', handleQuickAction);
    });
    
    // Personas
    DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());
    DOM.savePersonBtn?.addEventListener('click', () => handleSavePerson());
    DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());
    
    // Documentos
    DOM.addDocumentBtn?.addEventListener('click', () => openDocumentModal());
    DOM.browseFilesBtn?.addEventListener('click', () => DOM.fileInput?.click());
    DOM.fileInput?.addEventListener('change', handleFileSelect);
    DOM.uploadDocumentBtn?.addEventListener('click', () => handleUploadDocument());
    DOM.cancelDocumentBtn?.addEventListener('click', () => closeDocumentModal());
    
    // Búsqueda de documentos
    DOM.searchDocumentsBtn?.addEventListener('click', () => handleDocumentSearch());
    DOM.clearSearchBtn?.addEventListener('click', () => handleClearSearch());
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
    DOM.saveCategoryBtn?.addEventListener('click', () => handleSaveCategory());
    DOM.cancelCategoryBtn?.addEventListener('click', () => closeCategoryModal());
    
    // Búsqueda avanzada
    DOM.performSearchBtn?.addEventListener('click', () => handleAdvancedSearch());
    DOM.cancelSearchBtn?.addEventListener('click', () => closeSearchModal());
    
    // Reportes
    DOM.reportType?.addEventListener('change', handleReportTypeChange);
    DOM.generateReportBtn?.addEventListener('click', handleGenerateReport);
    DOM.cancelReportBtn?.addEventListener('click', () => closeReportModal());
    
    DOM.addTaskBtn?.addEventListener('click', () => openAddTaskModal());
    DOM.saveTaskBtn?.addEventListener('click', () => handleSaveTask()); // Llamar a la función del módulo tasks.js
    DOM.cancelTaskBtn?.addEventListener('click', () => closeAddTaskModal());

    
    // Drag and Drop
    setupFileDragAndDrop();
    
    // Modal Close Buttons
    DOM.modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', handleModalClose);
    });
    
    // Cerrar modales al hacer clic fuera
    const modals = {
        personModal: DOM.personModal,
        documentModal: DOM.documentModal,
        categoryModal: DOM.categoryModal,
        searchModal: DOM.searchModal,
        reportModal: DOM.reportModal,
        addTaskModal: DOM.addTaskModal
    };
    setupModalBackdropClose(modals);
    
    console.log('✅ Event listeners configurados correctamente');
}

// =============================================================================
// FUNCIONES DE NAVEGACIÓN
// =============================================================================
function handleTabNavigation(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    switchTab(tabId);
}

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
            loadDashboardData(appState),
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

// =============================================================================
// MANEJADORES DE UI
// =============================================================================
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
        case 'Agregar Tarea':
            openAddTaskModal();
            break;
        default:
            console.warn('Acción no reconocida:', action);
    }
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
        } else if (modal.id === 'addTaskModal') {
            closeAddTaskModal();
        }
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
    
    // Funcionalidad Cloudinary
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
// FUNCIÓN GLOBAL PARA MOSTRAR TODOS LOS DOCUMENTOS
// =============================================================================
function showAllDocuments() {
    console.log('📄 Mostrando todos los documentos');
    appState.currentSearchQuery = '';
    appState.filters = {
        category: '',
        type: '',
        date: '',
        status: ''
    };
    
    // Resetear filtros en la UI
    if (DOM.filterCategory) DOM.filterCategory.value = '';
    if (DOM.filterType) DOM.filterType.value = '';
    if (DOM.filterDate) DOM.filterDate.value = '';
    if (DOM.filterStatus) DOM.filterStatus.value = '';
    if (DOM.documentSearch) DOM.documentSearch.value = '';
    
    renderDocumentsTable();
    showAlert('Mostrando todos los documentos', 'info');
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================

// Hacer todas las funciones necesarias disponibles globalmente
window.downloadDocument = downloadDocument;
window.previewDocument = previewDocument;
window.deleteDocument = deleteDocument;
window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.openDocumentModal = openDocumentModal;
window.openPersonModal = openPersonModal;
window.closePersonModal = closePersonModal;
window.closeDocumentModal = closeDocumentModal;
window.closeCategoryModal = closeCategoryModal;
window.closeSearchModal = closeSearchModal;
window.closeReportModal = closeReportModal;
window.openCategoryModal = openCategoryModal;
window.showAdvancedSearch = showAdvancedSearch;
window.generateReport = generateReport;
window.openAddTaskModal = openAddTaskModal;
window.closeAddTaskModal = closeAddTaskModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.showAllDocuments = showAllDocuments;
window.debugAppState = debugAppState;
window.testAPIConnection = testAPIConnection;
window.testCloudinaryConnection = testCloudinaryConnection;
window.resetApp = resetApp;

// Funciones que necesitan ser globales para otros módulos
window.loadDashboardData = () => loadDashboardData(appState);
window.renderDocumentsTable = renderDocumentsTable;
window.populateCategorySelect = (selectElement) => {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Seleccionar categoría</option>';
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.nombre;
        option.textContent = category.nombre;
        selectElement.appendChild(option);
    });
};

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

export { loadTabSpecificData };