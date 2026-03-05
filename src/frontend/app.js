// =============================================================================
// src/frontend/app.js - SISTEMA COMPLETO
// =============================================================================

import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { showAlert, setupModalBackdropClose } from './utils.js';
import { hasPermission, PERMISSIONS } from './permissions.js';
import TaskManager from './task.js';
import SupportModule from './modules/soporte.js';
// Importar servicios
import { api } from './services/api.js';

// =============================================================================
// HACER FUNCIONES DE PERMISOS DISPONIBLES GLOBALMENTE
// =============================================================================

import { 
    canView, 
    canAction, 
    applyActionPermissions,
    loadCurrentPermissions,
    initPermissionsSystem,
    applyNavigationPermissions,
    applyVisibilityRules
} from './permissions.js';

window.canView = canView;
window.canAction = canAction;
window.applyActionPermissions = applyActionPermissions;
window.loadCurrentPermissions = loadCurrentPermissions;

// =============================================================================
// IMPORTAR TODOS LOS MÓDULOS ORGANIZADOS
// =============================================================================

// Dashboard
import {
    loadDashboardData,
    handleRefreshDashboard,
    updateDashboardTasks
} from './modules/dashboard.js';

// Historial
import {
    initHistorial,
    loadTabSpecificHistorial
} from './modules/historial.js';

// Personas
import {
    openPersonModal,
    closePersonModal,
    savePerson,
    loadPersons,
    renderPersonsTable,
    populatePersonSelect,
    editPerson,
    deletePerson,
    handleSavePerson,
    refreshDepartmentSelect
} from './modules/personas.js';

// Documentos (MÓDULO REORGANIZADO)
import * as documentos from './modules/documentos/index.js';

// Categorías
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

// Departamentos
import {
    openDepartmentModal,
    closeDepartmentModal,
    saveDepartment,
    loadDepartments,
    renderDepartments,
    populateDepartmentSelects,
    editDepartment,
    deleteDepartment,
    handleSaveDepartment
} from './modules/departamentos.js';

// Búsqueda
import {
    showAdvancedSearch,
    closeSearchModal,
    handleDocumentSearch,
    handleClearSearch,
    handleFilterChange,
    handleAdvancedSearch
} from './modules/search.js';

// Reportes
import {
    generateReport,
    closeReportModal,
    handleGenerateReport,
    handleReportTypeChange
} from './modules/reports.js';

// Notificaciones
import {
    initNotificaciones
} from './modules/notificaciones.js';

// Papelera
import {
    initPapelera
} from './modules/papelera.js';

// Menú de usuario
import {
    inicializarMenuUsuario
} from './userMenu.js';

import { initializeDocumentosModule } from './modules/documentos/index.js';

// Importar navegación
import { initializeNavigation, switchTab as navigationSwitchTab } from './navigation.js';

// =============================================================================
// 1. INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================

/**
 * 1.1 Crear instancia del estado de la aplicación
 */
const appState = new AppState();
window.appState = appState;

/**
 * 1.2 Instancia global del gestor de tareas
 */
let taskManager = null;

/**
 * 1.3 Configurar compatibilidad para documentos
 */
documentos.setupCompatibilityGlobals();

// =============================================================================
// Permisos UI (mostrar/ocultar elementos que no están en la sidebar)
// =============================================================================

function applyRoleBasedUI() {
    // Esta función SOLO maneja elementos que no están en la sidebar
    // La sidebar ya es manejada por navigation.js con canView()
    
    applyVisibilityRules([
        // Subida de documentos
        {
            selector: '#addDocumentBtn, #addFirstDocument, #uploadDocumentBtn, #uploadMultipleDocumentsBtn, .action-card[onclick*="openDocumentModal"]',
            permission: PERMISSIONS.UPLOAD_DOCUMENTS
        },
        // Eliminación masiva
        { selector: '#bulkDeleteTriggerBtn, #selectionInfoBar, #bulkActionsContainer', permission: PERMISSIONS.DELETE_DOCUMENTS }
    ]);
}

// =============================================================================
// 2. EVENTO DOMCONTENTLOADED PRINCIPAL
// =============================================================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
    console.log('📡 URL de la API:', CONFIG.API_BASE_URL);
    console.log('📦 Versión del sistema:', CONFIG.APP_VERSION || '1.0.0');

    await initializeApp();
    setupEventListeners();
    await loadInitialData();
    initHistorial();
    initNotificaciones();
    inicializarMenuUsuario();

    // Aplicar reglas de UI según rol
    applyRoleBasedUI();

    // Re-aplicar permisos cuando se actualice usuario/rol
    window.addEventListener('auth:user-updated', async () => {
        await refreshPermissions();
    });

    // Inicializar tema
    initTheme();

    console.log('✅ Sistema inicializado correctamente');
});

// =============================================================================
// 3. FUNCIONES DE INICIALIZACIÓN
// =============================================================================

/**
 * 3.1 Inicializar aplicación completa
 */
async function initializeApp() {
    console.log('🔧 Inicializando aplicación...');

    // Verificar elementos DOM faltantes
    const missingElements = Object.keys(DOM).filter(key => {
        if (Array.isArray(DOM[key])) {
            return DOM[key].length === 0;
        }
        return DOM[key] === null;
    });

    if (missingElements.length > 0) {
        console.warn('⚠️ Elementos DOM faltantes:', missingElements);
    }

    // Inicializar sistema de permisos
    await initPermissionsSystem();

    // Inicializar navegación (aplica permisos de visibilidad)
    await initializeNavigation();

    // Inicializar gestor de tareas
    initializeTaskManager();

    // Inicializar módulo de documentos
    if (typeof documentos.initializeDocumentosModule === 'function') {
        documentos.initializeDocumentosModule();
    } else {
        console.error('❌ documentos.initializeDocumentosModule no es una función');
    }

    // Mostrar estado inicial
    appState.logState();

    console.log('✅ Aplicación inicializada correctamente');
}

/**
 * 3.2 Inicializar gestor de tareas
 */
function initializeTaskManager() {
    console.log('📝 Inicializando gestor de tareas (API)...');
    try {
        if (!window.api) {
            console.log('⏳ Esperando API para inicializar TaskManager...');
            setTimeout(() => {
                if (window.api) {
                    taskManager = new TaskManager();
                    window.taskManager = taskManager;
                    console.log('✅ Gestor de tareas inicializado correctamente con API');
                } else {
                    console.error('❌ API no disponible después de espera');
                }
            }, 1000);
        } else {
            taskManager = new TaskManager();
            window.taskManager = taskManager;
            console.log('✅ Gestor de tareas inicializado correctamente');
        }
    } catch (error) {
        console.error('❌ Error al inicializar gestor de tareas:', error);
        showAlert('Error al inicializar módulo de tareas', 'error');
    }
}

// =============================================================================
// 4. CONFIGURACIÓN DE EVENT LISTENERS
// =============================================================================

/**
 * 4.1 Configurar todos los event listeners
 */
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');

    // =========================================================================
    // NAVEGACIÓN PRINCIPAL
    // =========================================================================
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', handleTabNavigation);
    });

    const trashBtn = document.getElementById('trashBtn');
    if (trashBtn) {
        trashBtn.addEventListener('click', async () => {
            await switchTab('papelera');
        });
    }

    // =========================================================================
    // DASHBOARD
    // =========================================================================
    DOM.refreshDashboard?.addEventListener('click', () => handleRefreshDashboard(appState));
    DOM.addFirstDocument?.addEventListener('click', () => documentos.openDocumentModal());

    DOM.quickActions.forEach(action => {
        action.addEventListener('click', handleQuickAction);
    });

    // =========================================================================
    // PERSONAS
    // =========================================================================
    DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());
    DOM.savePersonBtn?.addEventListener('click', () => handleSavePerson());
    DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());

    // =========================================================================
    // DOCUMENTOS
    // =========================================================================
    DOM.addDocumentBtn?.addEventListener('click', () => documentos.openDocumentModal());

    // =========================================================================
    // BÚSQUEDA DE DOCUMENTOS
    // =========================================================================
    DOM.searchDocumentsBtn?.addEventListener('click', () => handleDocumentSearch());
    DOM.clearSearchBtn?.addEventListener('click', () => handleClearSearch());
    DOM.documentSearch?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleDocumentSearch();
        }
    });

    // =========================================================================
    // FILTROS DE DOCUMENTOS
    // =========================================================================
    DOM.filterCategory?.addEventListener('change', handleFilterChange);
    DOM.filterType?.addEventListener('change', handleFilterChange);
    DOM.filterDate?.addEventListener('change', handleFilterChange);
    DOM.filterStatus?.addEventListener('change', handleFilterChange);

    // =========================================================================
    // CATEGORÍAS
    // =========================================================================
    DOM.addCategoryBtn?.addEventListener('click', () => openCategoryModal());
    DOM.saveCategoryBtn?.addEventListener('click', () => handleSaveCategory());
    DOM.cancelCategoryBtn?.addEventListener('click', () => closeCategoryModal());

    // =========================================================================
    // DEPARTAMENTOS
    // =========================================================================
    DOM.addDepartmentBtn?.addEventListener('click', () => openDepartmentModal());
    DOM.saveDepartmentBtn?.addEventListener('click', () => handleSaveDepartment());
    DOM.cancelDepartmentBtn?.addEventListener('click', () => closeDepartmentModal());

    // =========================================================================
    // BÚSQUEDA AVANZADA
    // =========================================================================
    DOM.performSearchBtn?.addEventListener('click', () => handleAdvancedSearch());
    DOM.cancelSearchBtn?.addEventListener('click', () => closeSearchModal());

    // =========================================================================
    // REPORTES
    // =========================================================================
    if (DOM.reportType) {
        DOM.reportType.addEventListener('change', handleReportTypeChange);
    }
    if (DOM.reportFormat) {
        DOM.reportFormat.addEventListener('change', (e) => {
            if (typeof window.handleReportFormatChange === 'function') {
                window.handleReportFormatChange.call(e.target, e);
            }
        });
    }
    if (DOM.generateReportBtn) {
        DOM.generateReportBtn.addEventListener('click', handleGenerateReport);
    }

    // =========================================================================
    // BOTONES DE CIERRE DE MODALES
    // =========================================================================
    DOM.modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', handleModalClose);
    });

    // Cerrar modales al hacer clic fuera
    const modals = {
        personModal: DOM.personModal,
        documentModal: DOM.documentModal,
        categoryModal: DOM.categoryModal,
        departmentModal: DOM.departmentModal,
        searchModal: DOM.searchModal,
        reportModal: DOM.reportModal,
        taskModal: DOM.taskModal
    };
    setupModalBackdropClose(modals);

    // =========================================================================
    // TEMA OSCURO/CLARO
    // =========================================================================
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        themeToggle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }

    console.log('✅ Event listeners configurados correctamente');
}

// =============================================================================
// 5. FUNCIONES DE NAVEGACIÓN
// =============================================================================

/**
 * 5.1 Manejar navegación por pestañas
 */
async function handleTabNavigation(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');

    // Validar que sea una pestaña válida
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas', 'historial', 'papelera', 'calendario', 'reportes', 'soporte', 'ajustes', 'admin', 'auditoria'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida en enlace:', tabId);
        return;
    }

    // Verificar permisos antes de cambiar
    if (!canView(tabId)) {
        console.warn(`⚠️ Intento de acceso a pestaña sin permisos: ${tabId}`);
        showAlert('No tienes permisos para acceder a esta sección', 'error');
        return;
    }

    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    await switchTab(tabId);
}

/**
 * 5.2 Cambiar pestaña - Versión que usa permisos
 */
async function switchTab(tabId) {
    // Verificar permisos
    if (!canView(tabId)) {
        console.warn(`⚠️ Intento de acceso a pestaña sin permisos: ${tabId}`);
        showAlert('No tienes permisos para acceder a esta sección', 'error');
        
        // Redirigir a dashboard si no tiene permisos
        if (tabId !== 'dashboard' && canView('dashboard')) {
            tabId = 'dashboard';
        } else {
            return;
        }
    }

    // Validar tabId
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas', 'historial', 'papelera', 'calendario', 'reportes', 'soporte', 'ajustes', 'admin', 'auditoria'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }

    console.log(`🔄 Cambiando a pestaña: ${tabId}`);

    // Usar la función de navegación importada
    await navigationSwitchTab(tabId);
    
    // Aplicar permisos de acción en la nueva pestaña
    setTimeout(() => {
        applyActionPermissions();
    }, 100);
}

/**
 * 5.3 Cargar datos específicos por pestaña
 */
async function loadTabSpecificData(tabId) {
    try {
        console.log(`🔄 Cargando datos específicos para pestaña: ${tabId}`);

        switch (tabId) {
            case 'dashboard':
                loadDashboardData();
                break;

            case 'personas':
                await loadPersons();
                renderPersonsTable();
                break;

            case 'documentos':
                await documentos.loadDocuments();
                documentos.renderDocumentsTable();
                break;

            case 'categorias':
                await loadCategories();
                renderCategories();
                break;

            case 'tareas':
                if (taskManager && typeof taskManager.loadTasks === 'function') {
                    await taskManager.loadTasks();
                    taskManager.renderTasks();
                    taskManager.updateSummary();
                }
                break;

            case 'historial':
                loadTabSpecificHistorial();
                break;

            case 'papelera':
                await initPapelera();
                break;

            case 'calendario':
                if (typeof window.initializeCalendar === 'function') {
                    window.initializeCalendar();
                }
                break;

            case 'reportes':
                if (typeof window.initReportsModule === 'function') {
                    window.initReportsModule();
                }
                break;

            case 'soporte':
                if (!window.supportModule) {
                    window.supportModule = new SupportModule();
                }
                break;

            case 'ajustes':
                console.log('⚙️ Inicializando módulo de ajustes...');
                try {
                    if (typeof window.settingsManager === 'undefined') {
                        const ajustesModule = await import('./modules/ajustes.js');
                        window.settingsManager = ajustesModule.default;
                        console.log('✅ Módulo de ajustes cargado');
                    }
                    if (window.settingsManager && typeof window.settingsManager.updateForm === 'function') {
                        window.settingsManager.updateForm();
                    }
                } catch (error) {
                    console.error('❌ Error al cargar módulo de ajustes:', error);
                    showAlert(`Error al cargar ajustes: ${error.message}`, 'error');
                }
                break;

            case 'admin':
                import('./modules/admin/index.js').then(module => {
                    module.renderAgregarAdministrador();
                });
                break;
                
            case 'auditoria':
                console.log('📋 Cargando módulo de auditoría...');
                import('./modules/auditoria.js').then(module => {
                    module.renderAuditoria();
                }).catch(error => {
                    console.error('❌ Error cargando auditoría:', error);
                    showAlert('Error al cargar módulo de auditoría', 'error');
                });
                break;

            default:
                console.log(`ℹ️ No hay carga específica para la pestaña: ${tabId}`);
        }
    } catch (error) {
        console.error(`❌ Error cargando datos para pestaña ${tabId}:`, error);
        showAlert(`Error al cargar datos de ${tabId}`, 'error');
    }
}

// =============================================================================
// 6. CARGA DE DATOS INICIALES
// =============================================================================

async function loadInitialData() {
    console.log('📥 Cargando datos iniciales...');

    try {
        await Promise.all([
            loadDashboardData(appState),
            loadPersons(),
            updateDashboardTasks(),
            documentos.loadDocuments(),
            loadCategories(),
            loadDepartments()
        ]);

        console.log('✅ Datos iniciales cargados correctamente');
        showAlert('Sistema cargado correctamente', 'success');
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        showAlert('Error al cargar datos iniciales', 'error');
    }
}

// =============================================================================
// 7. REFRESCAR PERMISOS
// =============================================================================

async function refreshPermissions() {
    console.log('🔄 Refrescando permisos...');
    
    // Recargar permisos
    await loadCurrentPermissions();
    
    // Re-aplicar visibilidad en la sidebar
    applyNavigationPermissions();
    
    // Re-aplicar permisos de acción
    applyActionPermissions();
    
    // Verificar que la pestaña actual siga siendo accesible
    const currentTab = appState.currentTab;
    if (!canView(currentTab) && currentTab !== 'dashboard') {
        console.log('⚠️ Pestaña actual no accesible, redirigiendo a dashboard');
        await switchTab('dashboard');
    }
    
    // Re-renderizar tabla de documentos si es necesario
    if (appState.currentTab === 'documentos' && documentos?.renderDocumentsTable) {
        documentos.renderDocumentsTable();
    }
}

// =============================================================================
// 8. MANEJADORES DE INTERFAZ DE USUARIO
// =============================================================================

function handleQuickAction(e) {
    const action = this.querySelector('.action-card__title')?.textContent;
    console.log(`⚡ Acción rápida: ${action}`);

    switch (action) {
        case 'Subir Documento':
            documentos.openDocumentModal();
            break;
        case 'Subir Múltiples':
            documentos.openDocumentModal();
            setTimeout(() => {
                documentos.switchUploadMode('multiple');
            }, 100);
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
            documentos.closeDocumentModal();
        } else if (modal.id === 'categoryModal') {
            closeCategoryModal();
        } else if (modal.id === 'departmentModal') {
            closeDepartmentModal();
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
// 9. TEMA OSCURO/CLARO
// =============================================================================

const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
    const themeIcon = document.getElementById('themeToggle')?.querySelector('i');
    const themeToggleBtn = document.getElementById('themeToggle');
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('aria-pressed', 'true');
            themeToggleBtn.title = 'Tema: Oscuro';
        }
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('aria-pressed', 'false');
            themeToggleBtn.title = 'Tema: Claro';
        }
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

// =============================================================================
// 10. FUNCIONES GLOBALES DE UTILIDAD
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

    if (DOM.filterCategory) DOM.filterCategory.value = '';
    if (DOM.filterType) DOM.filterType.value = '';
    if (DOM.filterDate) DOM.filterDate.value = '';
    if (DOM.filterStatus) DOM.filterStatus.value = '';
    if (DOM.documentSearch) DOM.documentSearch.value = '';

    documentos.renderDocumentsTable();
    showAlert('Mostrando todos los documentos', 'info');
}

// =============================================================================
// 11. EXPORTACIÓN DE FUNCIONES GLOBALES
// =============================================================================

// Funciones de documentos
window.downloadDocument = documentos.downloadDocument;
window.previewDocument = documentos.previewDocument;
window.deleteDocument = documentos.deleteDocument;
window.openDocumentModal = documentos.openDocumentModal;
window.closeDocumentModal = documentos.closeDocumentModal;
window.switchUploadMode = documentos.switchUploadMode;
window.handleUploadMultipleDocuments = documentos.handleUploadMultipleDocuments;
window.debugMultipleUpload = documentos.debugMultipleUpload;
window.testMultipleUploadWithMockFiles = documentos.testMultipleUploadWithMockFiles;
window.cancelMultipleUpload = documentos.cancelMultipleUpload;
window.downloadDocumentSimple = documentos.downloadDocumentSimple;
window.downloadDocumentAlternative = documentos.downloadDocumentAlternative;
window.debugDownload = documentos.debugDocumentDownload;
window.testAllDownloads = documentos.testAllDownloads;
window.loadDocuments = documentos.loadDocuments;
window.renderDocumentsTable = documentos.renderDocumentsTable;
window.populateDocumentCategorySelect = documentos.populateDocumentCategorySelect;

// Funciones de personas
window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.openPersonModal = openPersonModal;
window.closePersonModal = closePersonModal;
window.populatePersonSelect = populatePersonSelect;
window.refreshDepartmentSelect = refreshDepartmentSelect;

// Funciones de categorías
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.populateCategorySelects = populateCategorySelects;

// Funciones de departamentos
window.openDepartmentModal = openDepartmentModal;
window.closeDepartmentModal = closeDepartmentModal;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;

// Funciones de búsqueda y reportes
window.showAdvancedSearch = showAdvancedSearch;
window.closeSearchModal = closeSearchModal;
import * as reportsModule from './modules/reports.js';
window.generateReport = reportsModule.generateReport;
window.closeReportModal = reportsModule.closeReportModal;
window.handleGenerateReport = reportsModule.handleGenerateReport;
window.handleReportTypeChange = reportsModule.handleReportTypeChange;
window.handleReportFormatChange = reportsModule.handleReportFormatChange;
window.initReportsModule = reportsModule.initReportsModule;

// Funciones generales
window.showAllDocuments = showAllDocuments;
window.switchTab = switchTab;
window.loadTabSpecificData = loadTabSpecificData;
window.refreshPermissions = refreshPermissions;

// Funciones de tareas
window.openTaskModal = (task = null) => {
    if (taskManager) {
        taskManager.openTaskModal(task);
    } else {
        console.error('❌ taskManager no está disponible');
        showAlert('Error: Módulo de tareas no disponible', 'error');
    }
};
window.createQuickTask = (title, description = '', priority = 'media') => {
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
};
window.getTasksStats = () => {
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
};

// Función para poblar categorías (compatibilidad)
window.populateCategorySelect = (selectElement) => {
    if (!selectElement) return;
    selectElement.innerHTML = '<option value="">Seleccionar categoría</option>';
    if (appState.categories) {
        appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            selectElement.appendChild(option);
        });
    }
};

// =============================================================================
// 12. MANEJO DE ERRORES GLOBALES
// =============================================================================

window.addEventListener('error', function (e) {
    console.error('🚨 Error global capturado:', e.error);
    showAlert('Ha ocurrido un error inesperado. Revisa la consola para más detalles.', 'error');
});

window.addEventListener('unhandledrejection', function (e) {
    console.error('🚨 Promise rechazada no manejada:', e.reason);
    showAlert('Error en operación asíncrona. Revisa la consola para más detalles.', 'error');
});

// =============================================================================
// 13. INICIALIZACIÓN TARDÍA
// =============================================================================

setTimeout(() => {
    const taskElements = [
        'tasksContainer',
        'addTaskBtn',
        'taskModal',
        'taskForm',
        'tasksSearch',
        'filterPriority',
        'filterStatus'
    ];

    const missingTaskElements = taskElements.filter(id => !document.getElementById(id));
    if (missingTaskElements.length > 0) {
        console.warn('⚠️ Elementos de tareas faltantes en inicialización tardía:', missingTaskElements);
    }

    if (taskManager && missingTaskElements.length === 0) {
        console.log('🔄 Re-bindeando eventos de tareas...');
        taskManager.bindEvents();
    }

    if (typeof documentos.initializeTableFilters === 'function') {
        try {
            documentos.initializeTableFilters();
            console.log('✅ Filtros de documentos inicializados');
        } catch (error) {
            console.error('❌ Error inicializando filtros:', error);
        }
    }
}, 1000);

console.log('✅ Script de aplicación cargado correctamente');

// =============================================================================
// 14. EXPORTACIONES PRINCIPALES
// =============================================================================

export {
    loadTabSpecificData,
    switchTab,
    taskManager,
    appState,
    initializeApp,
    refreshPermissions
};