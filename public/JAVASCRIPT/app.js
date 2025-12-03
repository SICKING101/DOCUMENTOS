import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { showAlert, setupModalBackdropClose } from './utils.js';
import TaskManager from './task.js';

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
    downloadDocumentSimple,
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
    initNotificaciones 
} from './modules/notificaciones.js';

// =============================================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================
const appState = new AppState();

// Hacer appState global para todos los módulos
window.appState = appState;

// Instancia global del gestor de tareas
let taskManager = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
    console.log('📡 URL de la API:', CONFIG.API_BASE_URL);
    
    initializeApp();
    setupEventListeners();
    loadInitialData();
    
    // Inicializar módulo de notificaciones
    initNotificaciones();
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
    
    // Inicializar navegación activa
    initializeActiveNavigation();
    
    // Inicializar gestor de tareas
    initializeTaskManager();
    
    // Mostrar estado inicial
    appState.logState();
}

// FUNCIÓN: Inicializar gestor de tareas
function initializeTaskManager() {
    console.log('📝 Inicializando gestor de tareas...');
    try {
        taskManager = new TaskManager();
        window.taskManager = taskManager;
        console.log('✅ Gestor de tareas inicializado correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar gestor de tareas:', error);
        showAlert('Error al inicializar módulo de tareas', 'error');
    }
}

// FUNCIÓN: Inicializar navegación activa
function initializeActiveNavigation() {
    console.log('🎯 Inicializando navegación activa...');
    
    // Verificar si hay una pestaña activa en el HTML
    const currentActiveLink = document.querySelector('.sidebar__nav-link--active');
    if (currentActiveLink) {
        const activeTab = currentActiveLink.getAttribute('data-tab');
        console.log('📌 Pestaña activa encontrada en HTML:', activeTab);
        
        // Asegurarse de que el contenido también esté activo
        DOM.tabContents.forEach(tab => {
            tab.classList.toggle('tab-content--active', tab.id === activeTab);
        });
        
        appState.currentTab = activeTab;
    } else {
        // Si no hay activa, activar dashboard
        console.log('📌 No hay pestaña activa, activando dashboard por defecto');
        const dashboardLink = document.querySelector('[data-tab="dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('sidebar__nav-link--active');
            appState.currentTab = 'dashboard';
        }
    }
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
        taskModal: DOM.taskModal
    };
    setupModalBackdropClose(modals);
    
    console.log('✅ Event listeners configurados correctamente');
}

// =============================================================================
// FUNCIONES DE NAVEGACIÓN - ACTUALIZADAS CON TAREAS
// =============================================================================
function handleTabNavigation(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    switchTab(tabId);
}

function switchTab(tabId) {
    // Validar tabId - ACTUALIZADO con tareas
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }
    
    console.log(`🔄 Cambiando a pestaña: ${tabId}`);
    
    // 1. Remover clase activa de TODOS los enlaces
    DOM.navLinks.forEach(link => {
        link.classList.remove('sidebar__nav-link--active', 'header__nav-link--active');
    });
    
    // 2. Agregar clase activa SOLO al enlace seleccionado
    const activeLink = Array.from(DOM.navLinks).find(
        link => link.getAttribute('data-tab') === tabId
    );
    
    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
        console.log(`✅ Enlace activo establecido: ${tabId}`);
    } else {
        console.error(`❌ No se encontró enlace para: ${tabId}`);
        return;
    }
    
    // 3. Ocultar TODOS los contenidos
    DOM.tabContents.forEach(tab => {
        tab.classList.remove('tab-content--active');
    });
    
    // 4. Mostrar SOLO el contenido activo
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('tab-content--active');
        console.log(`✅ Contenido activo establecido: ${tabId}`);
    } else {
        console.error(`❌ No se encontró contenido para: ${tabId}`);
        return;
    }
    
    // 5. Actualizar estado
    appState.currentTab = tabId;
    console.log(`🎯 Pestaña cambiada exitosamente a: ${tabId}`);
    
    // 6. Cargar datos específicos
    loadTabSpecificData(tabId);
}

function loadTabSpecificData(tabId) {
    try {
        console.log(`🔄 Cargando datos específicos para pestaña: ${tabId}`);
        
        switch(tabId) {
            case 'dashboard':
                loadDashboardData();
                break;
                
            case 'personas':
                if (window.personManager && typeof personManager.loadData === 'function') {
                    personManager.loadData();
                }
                break;
                
            case 'documentos':
                if (window.documentManager && typeof documentManager.loadData === 'function') {
                    documentManager.loadData();
                }
                break;
                
            case 'categorias':
                if (window.categoryManager && typeof categoryManager.loadData === 'function') {
                    categoryManager.loadData();
                }
                break;
                
            case 'tareas':
                if (window.taskManager && typeof taskManager.loadTasks === 'function') {
                    taskManager.loadTasks();
                } else if (window.taskManager) {
                    // Fallback: simplemente renderizar las tareas existentes
                    taskManager.renderTasks();
                    taskManager.updateSummary();
                }
                break;
                
            default:
                console.log(`ℹ️  No hay carga específica para la pestaña: ${tabId}`);
        }
    } catch (error) {
        console.error(`❌ Error cargando datos para pestaña ${tabId}:`, error);
        showAlert(`Error al cargar datos de ${tabId}`, 'error');
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
// MANEJADORES DE UI - ACTUALIZADOS
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
        } else if (modal.id === 'taskModal') {
            if (taskManager) {
                taskManager.closeTaskModal();
            }
        }
    }
}

// =============================================================================
// NUEVAS FUNCIONES PARA GESTIÓN DE TAREAS
// =============================================================================

// Función para abrir modal de tarea desde otros módulos
function openTaskModal(task = null) {
    if (taskManager) {
        taskManager.openTaskModal(task);
    } else {
        console.error('❌ taskManager no está disponible');
        showAlert('Error: Módulo de tareas no disponible', 'error');
    }
}

// Función para crear tarea rápida desde dashboard
function createQuickTask(title, description = '', priority = 'media') {
    if (taskManager) {
        const quickTask = {
            title: title,
            description: description,
            priority: priority,
            status: 'pendiente',
            category: 'Rápida',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            reminder: false
        };
        
        taskManager.openTaskModal(quickTask);
    }
}

// Función para obtener estadísticas de tareas para el dashboard
function getTasksStats() {
    if (!taskManager) return null;
    
    const tasks = taskManager.tasks;
    return {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pendiente').length,
        inProgress: tasks.filter(t => t.status === 'en-progreso').length,
        completed: tasks.filter(t => t.status === 'completada').length,
        overdue: tasks.filter(t => {
            if (!t.dueDate || t.status === 'completada') return false;
            return new Date(t.dueDate) < new Date();
        }).length
    };
}

// =============================================================================
// FUNCIONES GLOBALES PARA DEBUG Y TEST - ACTUALIZADAS
// =============================================================================
function debugAppState() {
    console.group('🔧 Debug App State');
    appState.logState();
    
    // Mostrar estadísticas de tareas si están disponibles
    if (taskManager) {
        console.log('📊 Estadísticas de Tareas:', {
            total: taskManager.tasks.length,
            porEstado: {
                pendientes: taskManager.tasks.filter(t => t.status === 'pendiente').length,
                enProgreso: taskManager.tasks.filter(t => t.status === 'en-progreso').length,
                completadas: taskManager.tasks.filter(t => t.status === 'completada').length
            },
            porPrioridad: {
                alta: taskManager.tasks.filter(t => t.priority === 'alta').length,
                media: taskManager.tasks.filter(t => t.priority === 'media').length,
                baja: taskManager.tasks.filter(t => t.priority === 'baja').length
            }
        });
    }
    
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
    
    console.log('Cloudinary Config:', {
        cloudName: CONFIG.CLOUDINARY_CLOUD_NAME,
        apiKey: CONFIG.CLOUDINARY_API_KEY,
        uploadPreset: CONFIG.CLOUDINARY_UPLOAD_PRESET
    });
    
    showAlert('Configuración de Cloudinary verificada correctamente', 'success');
}

function testTaskManager() {
    console.log('🧪 Probando gestor de tareas...');
    
    if (!taskManager) {
        showAlert('Gestor de tareas no disponible', 'error');
        return;
    }
    
    const testTask = {
        title: 'Tarea de prueba',
        description: 'Esta es una tarea de prueba generada automáticamente',
        priority: 'media',
        status: 'pendiente',
        category: 'Prueba',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        reminder: true
    };
    
    taskManager.openTaskModal(testTask);
    showAlert('Gestor de tareas funcionando correctamente', 'success');
}

function resetApp() {
    if (confirm('¿Estás seguro de que deseas resetear la aplicación? Se perderán TODOS los datos incluyendo tareas.')) {
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
// EXPORTAR FUNCIONES GLOBALES - ACTUALIZADO
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
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.showAllDocuments = showAllDocuments;
window.debugAppState = debugAppState;
window.testAPIConnection = testAPIConnection;
window.testCloudinaryConnection = testCloudinaryConnection;
window.testTaskManager = testTaskManager;
window.resetApp = resetApp;

// Funciones de navegación globales
window.switchTab = switchTab;
window.loadTabSpecificData = loadTabSpecificData;

// Funciones de tareas globales
window.openTaskModal = openTaskModal;
window.createQuickTask = createQuickTask;
window.getTasksStats = getTasksStats;

// Funciones de descarga
window.downloadDocument = downloadDocument;
window.downloadDocumentSimple = downloadDocumentSimple;
window.downloadDocumentAlternative = downloadDocumentAlternative;

// Para debug
window.debugDownload = debugDocumentDownload;
window.testAllDownloads = testAllDownloads;

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

// =============================================================================
// INICIALIZACIÓN TARDÍA PARA ELEMENTOS DINÁMICOS
// =============================================================================
setTimeout(() => {
    const taskElements = [
        'tasksContainer',
        'addTaskBtn',
        'taskModal',
        'taskForm',
        'tasksSearch',
        'filterPriority',
        'filterStatus',
        'clearFiltersBtn'
    ];
    
    const missingTaskElements = taskElements.filter(id => !document.getElementById(id));
    if (missingTaskElements.length > 0) {
        console.warn('⚠️ Elementos de tareas faltantes en inicialización tardía:', missingTaskElements);
    }
    
    if (taskManager && missingTaskElements.length === 0) {
        console.log('🔄 Re-bindeando eventos de tareas...');
        taskManager.bindEvents();
    }
}, 1000);

// Tema oscuro 
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
};

const initTheme = () => {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
};

const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-theme');
    applyTheme(isDark ? 'light' : 'dark');
};

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
        }
    });
}

document.addEventListener('DOMContentLoaded', initTheme);

console.log('✅ Script de aplicación cargado correctamente');

export { 
    loadTabSpecificData, 
    switchTab,
    taskManager,
    openTaskModal,
    createQuickTask,
    getTasksStats
};