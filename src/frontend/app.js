// =============================================================================
// src/frontend/app.js - SISTEMA COMPLETO
// =============================================================================

import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { showAlert, setupModalBackdropClose } from './utils.js';
import { applyVisibilityRules, hasPermission, PERMISSIONS } from './permissions.js';
import TaskManager from './task.js';
import SupportModule from './modules/soporte.js';
// Importar servicios
import { api } from './services/api.js'; // Ruta correcta

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

// =============================================================================
// 1. INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================

/**
 * 1.1 Crear instancia del estado de la aplicación
 * Objeto global que mantiene todo el estado de la aplicación para acceso
 * consistente entre módulos.
 */
const appState = new AppState();

// Hacer appState global para todos los módulos
window.appState = appState;

/**
 * 1.2 Instancia global del gestor de tareas
 * Inicializada posteriormente en el DOMContentLoaded.
 */
let taskManager = null;

/**
 * 1.3 Configurar compatibilidad para documentos
 * Esto mantiene las funciones globales que tu sistema necesita
 */
documentos.setupCompatibilityGlobals();

// =============================================================================
// Permisos UI (mostrar/ocultar y bloquear vistas)
// =============================================================================

function applyRoleBasedUI() {
    applyVisibilityRules([
        // Admin (gestión de usuarios)
        { selector: '#nav-admin, #admin-dropdown', permission: PERMISSIONS.MANAGE_USERS },

        // Papelera (acciones destructivas)
        { selector: 'a.sidebar__nav-link[data-tab="papelera"]', permission: PERMISSIONS.DELETE_DOCUMENTS },

        // Subida de documentos
        {
            selector: '#addDocumentBtn, #addFirstDocument, #uploadDocumentBtn, #uploadMultipleDocumentsBtn, .action-card[onclick*="openDocumentModal"]',
            permission: PERMISSIONS.UPLOAD_DOCUMENTS
        },

        // Eliminación masiva
        { selector: '#bulkDeleteTriggerBtn, #selectionInfoBar, #bulkActionsContainer', permission: PERMISSIONS.DELETE_DOCUMENTS }
    ]);
}

/**
 * 1.4 Evento DOMContentLoaded principal
 * Punto de entrada de la aplicación cuando el DOM está completamente cargado.
 */
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
    console.log('📡 URL de la API:', CONFIG.API_BASE_URL);
    console.log('📦 Versión del sistema:', CONFIG.APP_VERSION || '1.0.0');

    initializeApp();
    setupEventListeners();
    loadInitialData();
    initHistorial(); // Inicializar historial
    initNotificaciones(); // Inicializar notificaciones
    inicializarMenuUsuario(); // Inicializar menú de usuario

    // Aplicar reglas de UI según rol (puede re-ejecutarse cuando authGuard actualice el usuario)
    applyRoleBasedUI();

    // Re-aplicar permisos cuando se actualice usuario/rol
    window.addEventListener('auth:user-updated', () => {
        applyRoleBasedUI();
        // Re-render para que la tabla de documentos quite/añada acciones
        if (window.appState?.currentTab === 'documentos' && documentos?.renderDocumentsTable) {
            documentos.renderDocumentsTable();
        }
    });

    try {
        // Inicializar módulo de documentos
        initializeDocumentosModule();

        // Asegurar que el estado global esté disponible
        if (!window.multipleUploadState) {
            const { MultipleUploadState } = await import('./modules/documentos/index.js');
            window.multipleUploadState = new MultipleUploadState();
        }

        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        showGlobalAlert(`Error de inicialización: ${error.message}`);
    }

    // Inicializar tema
    initTheme();

    console.log('✅ Sistema inicializado correctamente');
});

// =============================================================================
// 2. FUNCIONES DE INICIALIZACIÓN
// =============================================================================

/**
 * 2.1 Inicializar aplicación completa
 * Configura todos los componentes principales y verifica integridad del DOM.
 */
function initializeApp() {
    console.log('🔧 Inicializando aplicación...');

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

    // Inicializar módulo de documentos - FIX CRÍTICO: Asegurar que se inicialice correctamente
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
 * 2.2 Inicializar gestor de tareas
 * Crea instancia del TaskManager y la hace disponible globalmente.
 */
function initializeTaskManager() {
    console.log('📝 Inicializando gestor de tareas (API)...');
    try {
        // Esperar a que la API esté disponible
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

/**
 * 2.3 Inicializar navegación activa
 * Establece la pestaña inicial activa basada en estado previo o valor por defecto.
 */
function initializeActiveNavigation() {
    console.log('🎯 Inicializando navegación activa...');

    // Ocultar todos los indicadores primero
    DOM.navLinks.forEach(link => {
        const indicator = link.querySelector('.sidebar__nav-active-indicator');
        if (indicator) indicator.style.visibility = 'hidden';
    });

    // Ocultar todos los contenidos primero
    DOM.tabContents.forEach(tab => {
        tab.classList.remove('tab-content--active');
        tab.style.display = 'none';
    });

    // Verificar si hay una pestaña activa en el HTML
    const currentActiveLink = document.querySelector('.sidebar__nav-link--active');
    if (currentActiveLink) {
        const activeTab = currentActiveLink.getAttribute('data-tab');
        console.log('📌 Pestaña activa encontrada en HTML:', activeTab);

        // Mostrar solo el indicador del activo
        const indicator = currentActiveLink.querySelector('.sidebar__nav-active-indicator');
        if (indicator) indicator.style.visibility = 'visible';

        // Asegurarse de que el contenido también esté activo
        const activeTabContent = document.getElementById(activeTab);
        if (activeTabContent) {
            activeTabContent.classList.add('tab-content--active');
            activeTabContent.style.display = 'block';
        }

        appState.currentTab = activeTab;
    } else {
        // Si no hay activa, activar dashboard
        console.log('📌 No hay pestaña activa, activando dashboard por defecto');
        const dashboardLink = document.querySelector('[data-tab="dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('sidebar__nav-link--active');
            const indicator = dashboardLink.querySelector('.sidebar__nav-active-indicator');
            if (indicator) indicator.style.visibility = 'visible';
            
            const dashboardContent = document.getElementById('dashboard');
            if (dashboardContent) {
                dashboardContent.classList.add('tab-content--active');
                dashboardContent.style.display = 'block';
            }
            
            appState.currentTab = 'dashboard';
        }
    }
}

// =============================================================================
// 3. CONFIGURACIÓN DE EVENT LISTENERS
// =============================================================================

/**
 * 3.1 Configurar todos los event listeners
 * Conecta eventos del DOM con funciones de manejo correspondientes.
 */
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');

    // =============================================================================
    // 3.1 NAVEGACIÓN PRINCIPAL
    // =============================================================================

    DOM.navLinks.forEach(link => {
        link.addEventListener('click', handleTabNavigation);
    });

    const trashBtn = document.getElementById('trashBtn');
    if (trashBtn) {
        trashBtn.addEventListener('click', async () => {
            await switchTab('papelera');
        });
    }

    // =============================================================================
    // 3.2 DASHBOARD
    // =============================================================================

    DOM.refreshDashboard?.addEventListener('click', () => handleRefreshDashboard(appState));

    DOM.addFirstDocument?.addEventListener('click', () => documentos.openDocumentModal());

    DOM.quickActions.forEach(action => {
        action.addEventListener('click', handleQuickAction);
    });

    // =============================================================================
    // 3.3 PERSONAS
    // =============================================================================

    DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());

    DOM.savePersonBtn?.addEventListener('click', () => handleSavePerson());

    DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());

    // =============================================================================
    // 3.4 DOCUMENTOS - SOLO LOS BÁSICOS
    // =============================================================================

    // Solo configuraremos los listeners básicos aquí
    // Los listeners específicos del modal se configuran EN EL MODAL

    DOM.addDocumentBtn?.addEventListener('click', () => documentos.openDocumentModal());

    // =============================================================================
    // 3.5 DOCUMENTOS - SUBIDA MÚLTIPLE
    // LOS LISTENERS ESPECÍFICOS SE CONFIGURAN EN EL MODAL PARA EVITAR DUPLICACIÓN
    // =============================================================================

    // =============================================================================
    // 3.6 BÚSQUEDA DE DOCUMENTOS
    // =============================================================================

    DOM.searchDocumentsBtn?.addEventListener('click', () => handleDocumentSearch());

    DOM.clearSearchBtn?.addEventListener('click', () => handleClearSearch());

    DOM.documentSearch?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleDocumentSearch();
        }
    });

    // =============================================================================
    // 3.7 FILTROS DE DOCUMENTOS
    // =============================================================================

    DOM.filterCategory?.addEventListener('change', handleFilterChange);

    DOM.filterType?.addEventListener('change', handleFilterChange);

    DOM.filterDate?.addEventListener('change', handleFilterChange);

    DOM.filterStatus?.addEventListener('change', handleFilterChange);

    // =============================================================================
    // 3.8 CATEGORÍAS
    // =============================================================================

    DOM.addCategoryBtn?.addEventListener('click', () => openCategoryModal());

    DOM.saveCategoryBtn?.addEventListener('click', () => handleSaveCategory());

    DOM.cancelCategoryBtn?.addEventListener('click', () => closeCategoryModal());

    // =============================================================================
    // 3.9 DEPARTAMENTOS
    // =============================================================================

    DOM.addDepartmentBtn?.addEventListener('click', () => openDepartmentModal());

    DOM.saveDepartmentBtn?.addEventListener('click', () => handleSaveDepartment());

    DOM.cancelDepartmentBtn?.addEventListener('click', () => closeDepartmentModal());

    // =============================================================================
    // 3.10 BÚSQUEDA AVANZADA
    // =============================================================================

    DOM.performSearchBtn?.addEventListener('click', () => handleAdvancedSearch());

    DOM.cancelSearchBtn?.addEventListener('click', () => closeSearchModal());


    // =============================================================================
    // 3.11 REPORTES (NUEVA PÁGINA)
    // =============================================================================
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

    // =============================================================================
    // 3.13 BOTONES DE CIERRE DE MODALES
    // =============================================================================

    DOM.modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', handleModalClose);
    });

    /**
     * 3.13.2 Cerrar modales al hacer clic fuera
     */
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

    // =============================================================================
    // 3.14 TEMA OSCURO/CLARO
    // =============================================================================

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
// 4. MANEJO DE TEMA OSCURO/CLARO
// =============================================================================

/**
 * 4.1 Obtener tema preferido
 * Determina tema basado en localStorage o preferencia del sistema.
 */
const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * 4.2 Aplicar tema
 * Agrega/remueve clases CSS y actualiza ícono según tema seleccionado.
 */
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

/**
 * 4.3 Inicializar tema
 * Aplica tema inicial al cargar la aplicación.
 */
const initTheme = () => {
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme);

    // Escuchar cambios en preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
};

/**
 * 4.4 Alternar tema
 * Cambia entre tema claro y oscuro al hacer clic en el botón.
 */
const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-theme');
    applyTheme(isDark ? 'light' : 'dark');
};

// =============================================================================
// 5. FUNCIONES DE NAVEGACIÓN
// =============================================================================

/**
 * 5.1 Manejar navegación por pestañas
 * Procesa clics en enlaces de la barra lateral para cambiar de sección.
 */
async function handleTabNavigation(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    
    // Validar que sea una pestaña válida
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas', 'historial', 'papelera', 'calendario', 'reportes', 'soporte', 'ajustes', 'admin'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida en enlace:', tabId);
        return;
    }
    
    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    await switchTab(tabId);
}

/**
 * 5.2 Cambiar pestaña
 * Función principal que actualiza interfaz y estado al cambiar de sección.
 */
async function switchTab(tabId) {
    // Bloquear pestañas según permisos
    if (tabId === 'admin' && !hasPermission(PERMISSIONS.MANAGE_USERS)) {
        showAlert('No tienes permisos para acceder a Admin', 'error');
        tabId = 'dashboard';
    }

    if (tabId === 'papelera' && !hasPermission(PERMISSIONS.DELETE_DOCUMENTS)) {
        showAlert('No tienes permisos para acceder a Papelera', 'error');
        tabId = 'dashboard';
    }

    // Validar tabId
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas', 'historial', 'papelera', 'calendario', 'reportes', 'soporte', 'ajustes', 'admin'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }

    console.log(`🔄 Cambiando a pestaña: ${tabId}`);

    // 1. Remover clase activa y ocultar indicador de TODOS los enlaces
    DOM.navLinks.forEach(link => {
        link.classList.remove('sidebar__nav-link--active', 'header__nav-link--active');
        const indicator = link.querySelector('.sidebar__nav-active-indicator');
        if (indicator) indicator.style.visibility = 'hidden';
    });

    // 2. Agregar clase activa y mostrar indicador SOLO al enlace seleccionado
    const activeLink = Array.from(DOM.navLinks).find(
        link => link.getAttribute('data-tab') === tabId
    );

    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
        const indicator = activeLink.querySelector('.sidebar__nav-active-indicator');
        if (indicator) indicator.style.visibility = 'visible';
        console.log(`✅ Enlace activo establecido: ${tabId}`);
    } else {
        console.log(`⚠️ No hay enlace en sidebar para: ${tabId} (tab especial)`);
    }

    // 3. Ocultar TODOS los contenidos
    DOM.tabContents.forEach(tab => {
        tab.classList.remove('tab-content--active');
        tab.style.display = 'none';
    });

    // 4. Mostrar SOLO el contenido activo
    let activeTab = document.getElementById(tabId);

    // Si la pestaña Admin no existe en el HTML, crearla dinámicamente
    if (!activeTab && tabId === 'admin') {
        const mainContent = document.querySelector('.main-content');

        if (mainContent) {
            activeTab = document.createElement('section');
            activeTab.id = 'admin';
            activeTab.className = 'tab-content';
            activeTab.style.display = 'none';
            activeTab.innerHTML = `
                <div class="section__header">
                    <div>
                        <h2 class="section__title">Admin</h2>
                        <p class="section__subtitle">Administración del sistema</p>
                    </div>
                </div>
                <div id="admin-content"></div>
            `;
            mainContent.appendChild(activeTab);

            // Actualizar lista de contenidos para futuras transiciones
            DOM.tabContents = document.querySelectorAll('.tab-content');
            console.log('✅ Contenido Admin creado dinámicamente');
        }
    }

    if (activeTab) {
        activeTab.classList.add('tab-content--active');
        activeTab.style.display = 'block';
        console.log(`✅ Contenido activo establecido: ${tabId}`);
    } else {
        console.error(`❌ No se encontró contenido para: ${tabId}`);
        // IMPORTANTE: Buscar en todo el documento, no solo en DOM.tabContents
        const allTabContents = document.querySelectorAll('.tab-content');
        console.log('Tabs disponibles:', Array.from(allTabContents).map(t => t.id));
        return;
    }

    // 5. Actualizar estado
    appState.currentTab = tabId;
    console.log(`🎯 Pestaña cambiada exitosamente a: ${tabId}`);

    // 6. Cargar datos específicos
    await loadTabSpecificData(tabId);
}

/**
 * 5.3 Cargar datos específicos por pestaña
 * Ejecuta funciones de carga correspondientes según la sección activa.
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
                // Inicializar calendario si existe la función
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
        // El módulo exporta una instancia ya creada por defecto
        if (typeof window.settingsManager === 'undefined') {
            const ajustesModule = await import('./modules/ajustes.js');
            window.settingsManager = ajustesModule.default;
            console.log('✅ Módulo de ajustes cargado');
        }
        
        // Actualizar la interfaz
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

/**
 * 6.1 Cargar datos iniciales de la aplicación
 * Obtiene información base de todas las secciones al iniciar.
 */
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
// 7. MANEJADORES DE INTERFAZ DE USUARIO
// =============================================================================

/**
 * 7.1 Manejador de acciones rápidas (función principal)
 * Controla la lógica de las tarjetas de acciones rápidas en el dashboard.
 */
function handleQuickAction(e) {
    const action = this.querySelector('.action-card__title')?.textContent;
    console.log(`⚡ Acción rápida: ${action}`);

    switch (action) {
        case 'Subir Documento':
            documentos.openDocumentModal();
            break;
        case 'Subir Múltiples':
            documentos.openDocumentModal();
            // Cambiar automáticamente a modo múltiple
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

/**
 * 7.2 Manejador de cierre de modales
 * Cierra cualquier modal activo según su tipo.
 */
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
// 8. FUNCIONES PARA GESTIÓN DE TAREAS
// =============================================================================

/**
 * 8.1 Abrir modal de tarea desde otros módulos
 * Interfaz externa para abrir el formulario de tareas con datos opcionales.
 */
function openTaskModal(task = null) {
    if (taskManager) {
        taskManager.openTaskModal(task);
    } else {
        console.error('❌ taskManager no está disponible');
        showAlert('Error: Módulo de tareas no disponible', 'error');
    }
}

/**
 * 8.2 Crear tarea rápida desde dashboard
 * Genera tarea con configuración básica para casos de uso rápido.
 */
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

/**
 * 8.3 Obtener estadísticas de tareas para el dashboard
 * Calcula métricas de tareas para mostrar en el panel principal.
 */
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
// 9. FUNCIONES DE DEBUG Y TEST
// =============================================================================

/**
 * 9.1 Debug del estado de la aplicación
 * Muestra en consola el estado completo de la app para diagnóstico.
 */
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

/**
 * 9.2 Probar conexión con la API
 * Verifica conectividad con el servidor backend.
 */
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

/**
 * 9.3 Probar conexión con Cloudinary
 * Verifica configuración de Cloudinary para subida de archivos.
 */
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

/**
 * 9.4 Probar gestor de tareas
 * Crea tarea de prueba para verificar funcionamiento del módulo.
 */
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

/**
 * 9.5 Resetear aplicación
 * Limpia almacenamiento local y recarga la página.
 */
function resetApp() {
    if (confirm('¿Estás seguro de que deseas resetear la aplicación? Se perderán TODOS los datos incluyendo tareas.')) {
        localStorage.clear();
        location.reload();
    }
}

// =============================================================================
// 10. FUNCIONES GLOBALES DE UTILIDAD
// =============================================================================

/**
 * 10.1 Mostrar todos los documentos
 * Remueve filtros y términos de búsqueda para mostrar lista completa.
 */
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

    documentos.renderDocumentsTable();
    showAlert('Mostrando todos los documentos', 'info');
}

// =============================================================================
// 11. EXPORTACIÓN DE FUNCIONES GLOBALES
// =============================================================================

// =============================================================================
// 11.1 FUNCIONES DE DOCUMENTOS
// =============================================================================

// Hacer funciones de documentos disponibles globalmente
window.downloadDocument = documentos.downloadDocument;
window.previewDocument = documentos.previewDocument;
window.deleteDocument = documentos.deleteDocument;
window.openDocumentModal = documentos.openDocumentModal;
window.closeDocumentModal = documentos.closeDocumentModal;
window.switchUploadMode = documentos.switchUploadMode;
window.handleUploadMultipleDocuments = documentos.handleUploadMultipleDocuments;

// Funciones de subida múltiple
window.debugMultipleUpload = documentos.debugMultipleUpload;
window.testMultipleUploadWithMockFiles = documentos.testMultipleUploadWithMockFiles;
window.cancelMultipleUpload = documentos.cancelMultipleUpload;

// Funciones de descarga
window.downloadDocumentSimple = documentos.downloadDocumentSimple;
window.downloadDocumentAlternative = documentos.downloadDocumentAlternative;

// Funciones de debug
window.debugDownload = documentos.debugDocumentDownload;
window.testAllDownloads = documentos.testAllDownloads;

// Funciones auxiliares
window.loadDocuments = documentos.loadDocuments;
window.renderDocumentsTable = documentos.renderDocumentsTable;
window.populateDocumentCategorySelect = documentos.populateDocumentCategorySelect;

// =============================================================================
// 11.2 FUNCIONES DE PERSONAS
// =============================================================================

window.editPerson = editPerson;
window.deletePerson = deletePerson;
window.openPersonModal = openPersonModal;
window.closePersonModal = closePersonModal;
window.populatePersonSelect = populatePersonSelect;
window.refreshDepartmentSelect = refreshDepartmentSelect;

// =============================================================================
// 11.3 FUNCIONES DE CATEGORÍAS
// =============================================================================

window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.populateCategorySelects = populateCategorySelects;

// =============================================================================
// 11.4 FUNCIONES DE DEPARTAMENTOS
// =============================================================================

window.openDepartmentModal = openDepartmentModal;
window.closeDepartmentModal = closeDepartmentModal;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;

// =============================================================================
// 11.5 FUNCIONES DE BÚSQUEDA Y REPORTES
// =============================================================================

window.showAdvancedSearch = showAdvancedSearch;
window.closeSearchModal = closeSearchModal;
// Reportes: exponer funciones para la nueva página/tab
import * as reportsModule from './modules/reports.js';
window.generateReport = reportsModule.generateReport;
window.closeReportModal = reportsModule.closeReportModal;
window.handleGenerateReport = reportsModule.handleGenerateReport;
window.handleReportTypeChange = reportsModule.handleReportTypeChange;
window.handleReportFormatChange = reportsModule.handleReportFormatChange;
window.initReportsModule = reportsModule.initReportsModule;

// =============================================================================
// 11.6 FUNCIONES GENERALES
// =============================================================================

window.showAllDocuments = showAllDocuments;
window.debugAppState = debugAppState;
window.testAPIConnection = testAPIConnection;
window.testCloudinaryConnection = testCloudinaryConnection;
window.testTaskManager = testTaskManager;
window.resetApp = resetApp;

// Funciones de navegación
window.switchTab = switchTab;
window.loadTabSpecificData = loadTabSpecificData;

// Funciones de tareas
window.openTaskModal = openTaskModal;
window.createQuickTask = createQuickTask;
window.getTasksStats = getTasksStats;

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

/**
 * 12.1 Capturar errores globales
 * Intercepta errores no manejados para evitar caídas inesperadas.
 */
window.addEventListener('error', function (e) {
    console.error('🚨 Error global capturado:', e.error);
    showAlert('Ha ocurrido un error inesperado. Revisa la consola para más detalles.', 'error');
});

/**
 * 12.2 Capturar promesas rechazadas no manejadas
 * Maneja errores en operaciones asíncronas no capturadas.
 */
window.addEventListener('unhandledrejection', function (e) {
    console.error('🚨 Promise rechazada no manejada:', e.reason);
    showAlert('Error en operación asíncrona. Revisa la consola para más detalles.', 'error');
});

// =============================================================================
// 13. INICIALIZACIÓN TARDÍA PARA ELEMENTOS DINÁMICOS
// =============================================================================

/**
 * 13.1 Re-bindear eventos de tareas después de carga
 * Reconfigura event listeners para elementos que puedan cargarse dinámicamente.
 */
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

    // Inicializar filtros de documentos si están disponibles
    if (typeof documentos.initializeTableFilters === 'function') {
        try {
            documentos.initializeTableFilters();
            console.log('✅ Filtros de documentos inicializados');
        } catch (error) {
            console.error('❌ Error inicializando filtros:', error);
        }
    }
}, 1000);

// =============================================================================
// 15. CARGAR DEBUGGER DE TAREAS (SOLO DESARROLLO)
// =============================================================================

/*

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Configurando debugger de tareas para desarrollo...');
    
    // Verificar si el botón ya existe
    if (!document.getElementById('taskDebugBtn')) {
        // Crear botón de debug en la interfaz
        const debugButton = document.createElement('button');
        debugButton.id = 'taskDebugBtn';
        debugButton.className = 'btn btn--warning btn--sm';
        debugButton.style.position = 'fixed';
        debugButton.style.bottom = '20px';
        debugButton.style.right = '20px';
        debugButton.style.zIndex = '9999';
        debugButton.innerHTML = '<i class="fas fa-bug"></i> Debug Tareas';
        debugButton.title = 'Herramientas de debugging para tareas';
        
        debugButton.addEventListener('click', async () => {
            console.log('🔍 Iniciando debugging de tareas...');
            
            // Verificar si ya está cargado
            if (window.taskDebugger && typeof window.taskDebugger.debugAllTasks === 'function') {
                console.log('✅ Usando TaskDebugger existente');
                await window.taskDebugger.debugAllTasks();
                return;
            }
            
            // Cargar dinámicamente el debugger
            try {
                // Crear script con timestamp para evitar caché
                const script = document.createElement('script');
                const timestamp = new Date().getTime();
                script.src = `/src/frontend/debugTasks.js?_t=${timestamp}`;
                script.type = 'module'; // Usar módulo para evitar conflictos
                
                script.onload = async () => {
                    console.log('✅ debugTasks.js cargado');
                    
                    // Dar tiempo para que se inicialice
                    setTimeout(async () => {
                        if (window.taskDebugger && typeof window.taskDebugger.debugAllTasks === 'function') {
                            await window.taskDebugger.debugAllTasks();
                        } else {
                            console.error('❌ taskDebugger no disponible después de cargar');
                            // Intentar inicializar manualmente
                            if (window.TaskDebugger) {
                                window.taskDebugger = new window.TaskDebugger();
                                await window.taskDebugger.debugAllTasks();
                            }
                        }
                    }, 500);
                };
                
                script.onerror = (error) => {
                    console.error('❌ Error cargando debugTasks.js:', error);
                    showAlert('Error cargando herramientas de debug', 'error');
                };
                
                document.head.appendChild(script);
                
            } catch (error) {
                console.error('❌ Error en debugging:', error);
                showAlert(`Error: ${error.message}`, 'error');
            }
        });
        
        document.body.appendChild(debugButton);
        console.log('✅ Botón de debug de tareas agregado');
    } else {
        console.log('ℹ️ Botón de debug ya existe');
    }
    
    // También agregar función de debug directa en consola
    window.debugTasks = async function() {
        console.log('🔍 Iniciando debugging directo de tareas...');
        
        if (!window.api) {
            console.error('❌ API no disponible. Cargando...');
            // Intentar encontrar la API
            if (typeof api !== 'undefined') {
                window.api = api;
                console.log('✅ API encontrada en variable global');
            } else {
                console.error('❌ No se pudo encontrar la API');
                return;
            }
        }
        
        try {
            // Obtener todas las tareas directamente
            console.log('📡 Obteniendo tareas...');
            const response = await window.api.getTasks();
            
            console.log(`📊 Total de tareas: ${response.tasks?.length || 0}`);
            
            if (response.tasks && response.tasks.length > 0) {
                // Mostrar tareas de alta prioridad
                const altaPrioridad = response.tasks.filter(t => 
                    t.prioridad === 'alta' || t.prioridad === 'critica'
                );
                console.log(`🔴 Tareas de alta prioridad: ${altaPrioridad.length}`);
                altaPrioridad.forEach((t, i) => {
                    console.log(`  ${i + 1}. ${t.titulo} - ${t.estado} - ${t.fecha_limite}`);
                });
                
                // Mostrar tareas para hoy
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const manana = new Date(hoy);
                manana.setDate(manana.getDate() + 1);
                
                const paraHoy = response.tasks.filter(t => {
                    if (!t.fecha_limite) return false;
                    const fechaTarea = new Date(t.fecha_limite);
                    return fechaTarea >= hoy && fechaTarea < manana && t.estado !== 'completada';
                });
                
                console.log(`📅 Tareas para hoy: ${paraHoy.length}`);
                paraHoy.forEach((t, i) => {
                    console.log(`  ${i + 1}. ${t.titulo} - ${t.prioridad} - ${t.fecha_limite}`);
                });
                
                // Probar endpoints específicos
                console.log('\n🔌 Probando endpoints:');
                
                try {
                    const highRes = await window.api.getHighPriorityTasks();
                    console.log(`  /high-priority: ${highRes.tasks?.length || 0} tareas`);
                } catch (e) {
                    console.error(`  ❌ /high-priority: ${e.message}`);
                }
                
                try {
                    const todayRes = await window.api.getTodayTasks();
                    console.log(`  /today: ${todayRes.tasks?.length || 0} tareas`);
                } catch (e) {
                    console.error(`  ❌ /today: ${e.message}`);
                }
            }
        } catch (error) {
            console.error('❌ Error en debug directo:', error);
        }
    };
    
    console.log('💡 También puedes usar debugTasks() en la consola');
}

// Cargar debug simple automáticamente en desarrollo
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setTimeout(() => {
        const script = document.createElement('script');
        script.src = '/src/frontend/simpleTaskDebug.js';
        script.onload = () => console.log('✅ Simple Task Debug cargado automáticamente');
        script.onerror = () => console.log('ℹ️ No se pudo cargar Simple Task Debug');
        document.head.appendChild(script);
    }, 2000);
}
*/

console.log('✅ Script de aplicación cargado correctamente');

// =============================================================================
// 14. EXPORTACIONES PRINCIPALES
// =============================================================================

export {
    loadTabSpecificData,
    switchTab,
    taskManager,
    openTaskModal,
    createQuickTask,
    getTasksStats,
    appState,
    initializeApp
};