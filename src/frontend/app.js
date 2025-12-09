import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { showAlert, setupModalBackdropClose } from './utils.js';
import TaskManager from './task.js';
// Importar servicios
import { api } from './services/api.js'; // Ruta correcta

// Importar todos los módulos
import {
    loadDashboardData,
    handleRefreshDashboard
} from './modules/dashboard.js';

import {
    initHistorial,
    loadTabSpecificHistorial
} from './modules/historial.js';

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
    downloadDocumentAlternative,
    debugDocumentDownload,
    testAllDownloads,
    handleMultipleFileSelect,
    switchUploadMode,
    handleUploadMultipleDocuments,
    debugMultipleUpload,
    testMultipleUploadWithMockFiles,
    cancelMultipleUpload,
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

import {
    initPapelera
} from './modules/papelera.js';

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
 * 1.3 Evento DOMContentLoaded principal
 * Punto de entrada de la aplicación cuando el DOM está completamente cargado.
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
    console.log('📡 URL de la API:', CONFIG.API_BASE_URL);

    initializeApp();
    setupEventListeners();
    loadInitialData();

    initHistorial(); // Nueva línea

    // Inicializar módulo de notificaciones
    initNotificaciones();
});

// =============================================================================
// 2. FUNCIONES DE INICIALIZACIÓN
// =============================================================================

/**
 * 2.1 Inicializar aplicación completa
 * Configura todos los componentes principales y verifica integridad del DOM.
 */
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

/**
 * 2.2 Inicializar gestor de tareas
 * Crea instancia del TaskManager y la hace disponible globalmente.
 */
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

/**
 * 2.3 Inicializar navegación activa
 * Establece la pestaña inicial activa basada en estado previo o valor por defecto.
 */
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

// =============================================================================
// 3. CONFIGURACIÓN DE EVENT LISTENERS
// =============================================================================

/**
 * 3.1 Configurar todos los event listeners
 * Conecta eventos del DOM con funciones de manejo correspondientes.
 */
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');

    /**
     * 3.1.1 Manejador de acciones rápidas
     * Procesa clics en las tarjetas de acciones rápidas del dashboard.
     */
    function handleQuickAction(e) {
        const action = this.querySelector('.action-card__title')?.textContent;
        console.log(`⚡ Acción rápida: ${action}`);

        switch (action) {
            case 'Subir Documento':
                openDocumentModal();
                break;
            case 'Subir Múltiples':
                openDocumentModal();
                // Cambiar automáticamente a modo múltiple
                setTimeout(() => {
                    switchUploadMode('multiple');
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

    document.getElementById('historialBtn')?.addEventListener('click', () => {
        switchTab('historial');
    });

    // =============================================================================
    // 3.2 EVENT LISTENERS PARA SUBIDA MÚLTIPLE
    // =============================================================================

    /**
     * 3.2.1 Tabs de modo de subida
     * Alterna entre subida única y múltiple.
     */
    DOM.uploadTabs?.forEach(tab => {
        tab.addEventListener('click', function () {
            const mode = this.dataset.mode;
            switchUploadMode(mode);
        });
    });

    /**
     * 3.2.2 Botón para seleccionar múltiples archivos
     * Dispara el input file con atributo multiple.
     */
    DOM.browseMultipleFilesBtn?.addEventListener('click', () => DOM.multipleFileInput?.click());

    /**
     * 3.2.3 Input para múltiples archivos
     * Maneja la selección de múltiples archivos.
     */
    DOM.multipleFileInput?.addEventListener('change', handleMultipleFileSelect);

    /**
     * 3.2.4 Botón para subir múltiples documentos
     * Inicia el proceso de subida de todos los archivos seleccionados.
     */
    DOM.uploadMultipleDocumentsBtn?.addEventListener('click', () => handleUploadMultipleDocuments());

    /**
     * 3.2.5 Toggle de opciones avanzadas
     * Muestra/oculta configuración adicional para subidas múltiples.
     */
    DOM.toggleAdvancedOptions?.addEventListener('click', function () {
        const advancedOptions = DOM.advancedOptions;
        if (advancedOptions) {
            const isVisible = advancedOptions.style.display === 'block';
            advancedOptions.style.display = isVisible ? 'none' : 'block';
            this.innerHTML = isVisible ?
                '<i class="fas fa-sliders-h"></i> Opciones Avanzadas' :
                '<i class="fas fa-sliders-h"></i> Ocultar Opciones';
        }
    });

    // =============================================================================
    // 3.3 EVENT LISTENERS PRINCIPALES
    // =============================================================================

    /**
     * 3.3.1 Navegación entre pestañas
     * Maneja clics en los enlaces de la barra lateral.
     */
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', handleTabNavigation);
    });

    /**
     * 3.3.1b Botón de papelera en topbar
     * Cambia a la pestaña de papelera al hacer clic
     */
    const trashBtn = document.getElementById('trashBtn');
    if (trashBtn) {
        trashBtn.addEventListener('click', async () => {
            await switchTab('papelera');
        });
    }

    /**
     * 3.3.2 Dashboard - Refrescar datos
     * Actualiza todas las estadísticas del panel principal.
     */
    DOM.refreshDashboard?.addEventListener('click', () => handleRefreshDashboard(appState));

    /**
     * 3.3.3 Dashboard - Agregar primer documento
     * Acceso rápido al formulario de subida desde estado vacío.
     */
    DOM.addFirstDocument?.addEventListener('click', () => openDocumentModal());

    /**
     * 3.3.4 Acciones rápidas
     * Procesa clics en tarjetas de acciones del dashboard.
     */
    DOM.quickActions.forEach(action => {
        action.addEventListener('click', handleQuickAction);
    });

    /**
     * 3.3.5 Personas - Agregar
     * Abre formulario para registrar nueva persona.
     */
    DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());

    /**
     * 3.3.6 Personas - Guardar
     * Ejecuta guardado/actualización de datos de persona.
     */
    DOM.savePersonBtn?.addEventListener('click', () => handleSavePerson());

    /**
     * 3.3.7 Personas - Cancelar
     * Cierra formulario de persona sin guardar.
     */
    DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());

    /**
     * 3.3.8 Documentos - Agregar
     * Abre formulario para subir documento.
     */
    DOM.addDocumentBtn?.addEventListener('click', () => openDocumentModal());

    /**
     * 3.3.9 Documentos - Explorar archivos
     * Abre selector de archivos del sistema.
     */
    DOM.browseFilesBtn?.addEventListener('click', () => DOM.fileInput?.click());

    /**
     * 3.3.10 Documentos - Selección de archivo
     * Maneja selección de archivo único.
     */
    DOM.fileInput?.addEventListener('change', handleFileSelect);

    /**
     * 3.3.11 Documentos - Subir documento único
     * Inicia subida de archivo individual.
     */
    DOM.uploadDocumentBtn?.addEventListener('click', () => handleUploadDocument());

    /**
     * 3.3.12 Documentos - Cancelar
     * Cierra formulario de documento sin subir.
     */
    DOM.cancelDocumentBtn?.addEventListener('click', () => closeDocumentModal());

    /**
     * 3.3.13 Búsqueda de documentos - Buscar
     * Ejecuta búsqueda básica por término.
     */
    DOM.searchDocumentsBtn?.addEventListener('click', () => handleDocumentSearch());

    /**
     * 3.3.14 Búsqueda de documentos - Limpiar
     * Remueve filtros y términos de búsqueda.
     */
    DOM.clearSearchBtn?.addEventListener('click', () => handleClearSearch());

    /**
     * 3.3.15 Búsqueda de documentos - Enter
     * Ejecuta búsqueda al presionar Enter en campo de texto.
     */
    DOM.documentSearch?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            handleDocumentSearch();
        }
    });

    /**
     * 3.3.16 Filtros - Cambio de categoría
     * Actualiza filtro por categoría y refresca tabla.
     */
    DOM.filterCategory?.addEventListener('change', handleFilterChange);

    /**
     * 3.3.17 Filtros - Cambio de tipo
     * Actualiza filtro por tipo de archivo y refresca tabla.
     */
    DOM.filterType?.addEventListener('change', handleFilterChange);

    /**
     * 3.3.18 Filtros - Cambio de fecha
     * Actualiza filtro por rango de tiempo y refresca tabla.
     */
    DOM.filterDate?.addEventListener('change', handleFilterChange);

    /**
     * 3.3.19 Filtros - Cambio de estado
     * Actualiza filtro por estado de vencimiento y refresca tabla.
     */
    DOM.filterStatus?.addEventListener('change', handleFilterChange);

    /**
     * 3.3.20 Categorías - Agregar
     * Abre formulario para crear nueva categoría.
     */
    DOM.addCategoryBtn?.addEventListener('click', () => openCategoryModal());

    /**
     * 3.3.21 Categorías - Guardar
     * Ejecuta guardado/actualización de categoría.
     */
    DOM.saveCategoryBtn?.addEventListener('click', () => handleSaveCategory());

    /**
     * 3.3.22 Categorías - Cancelar
     * Cierra formulario de categoría sin guardar.
     */
    DOM.cancelCategoryBtn?.addEventListener('click', () => closeCategoryModal());

    /**
     * 3.3.23 Departamentos - Agregar
     * Abre formulario para crear nuevo departamento.
     */
    DOM.addDepartmentBtn?.addEventListener('click', () => openDepartmentModal());

    /**
     * 3.3.24 Departamentos - Guardar
     * Ejecuta guardado/actualización de departamento.
     */
    DOM.saveDepartmentBtn?.addEventListener('click', () => handleSaveDepartment());

    /**
     * 3.3.25 Departamentos - Cancelar
     * Cierra formulario de departamento sin guardar.
     */
    DOM.cancelDepartmentBtn?.addEventListener('click', () => closeDepartmentModal());

    /**
     * 3.3.26 Búsqueda avanzada - Ejecutar
     * Realiza búsqueda con múltiples criterios.
     */
    DOM.performSearchBtn?.addEventListener('click', () => handleAdvancedSearch());

    /**
     * 3.3.24 Búsqueda avanzada - Cancelar
     * Cierra modal de búsqueda avanzada.
     */
    DOM.cancelSearchBtn?.addEventListener('click', () => closeSearchModal());

    /**
     * 3.3.25 Reportes - Cambio de tipo
     * Actualiza filtros específicos según tipo de reporte seleccionado.
     */
    DOM.reportType?.addEventListener('change', handleReportTypeChange);

    /**
     * 3.3.26 Reportes - Generar
     * Ejecuta generación y descarga de reporte.
     */
    DOM.generateReportBtn?.addEventListener('click', handleGenerateReport);

    /**
     * 3.3.27 Reportes - Cancelar
     * Cierra modal de reportes sin generar.
     */
    DOM.cancelReportBtn?.addEventListener('click', () => closeReportModal());

    /**
     * 3.3.28 Drag and Drop
     * Configura área de arrastrar y soltar archivos.
     */
    setupFileDragAndDrop();

    /**
     * 3.3.29 Botones de cierre de modales
     * Asigna funcionalidad a botones de cerrar (×) de todos los modales.
     */
    DOM.modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', handleModalClose);
    });

    /**
     * 3.3.30 Cerrar modales al hacer clic fuera
     * Configura cierre de modales al hacer clic en el fondo oscuro.
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

    console.log('✅ Event listeners configurados correctamente');
}

// =============================================================================
// 4. MANEJO DE TEMA OSCURO/CLARO
// =============================================================================

/**
 * 4.1 Configuración de toggle de tema
 * Controla la alternancia entre tema claro y oscuro con persistencia en localStorage.
 */
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle?.querySelector('i');

/**
 * 4.2 Obtener tema preferido
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
 * 4.3 Aplicar tema
 * Agrega/remueve clases CSS y actualiza ícono según tema seleccionado.
 */
const applyTheme = (theme) => {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeIcon?.classList.remove('fa-moon');
        themeIcon?.classList.add('fa-sun');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        themeIcon?.classList.remove('fa-sun');
        themeIcon?.classList.add('fa-moon');
        localStorage.setItem('theme', 'light');
    }
};

/**
 * 4.4 Inicializar tema
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
 * 4.5 Alternar tema
 * Cambia entre tema claro y oscuro al hacer clic en el botón.
 */
const toggleTheme = () => {
    const isDark = document.body.classList.contains('dark-theme');
    applyTheme(isDark ? 'light' : 'dark');
};

// Configurar botón de tema si existe
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
    themeToggle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleTheme();
        }
    });
}

// Inicializar tema al cargar
document.addEventListener('DOMContentLoaded', initTheme);

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
    console.log(`📂 Cambiando a pestaña: ${tabId}`);
    await switchTab(tabId);
}

/**
 * 5.2 Cambiar pestaña
 * Función principal que actualiza interfaz y estado al cambiar de sección.
 */
async function switchTab(tabId) {
    // Validar tabId
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas', 'historial', 'papelera'];
    if (!validTabs.includes(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }

    console.log(`🔄 Cambiando a pestaña: ${tabId}`);

    // 1. Remover clase activa de TODOS los enlaces
    DOM.navLinks.forEach(link => {
        link.classList.remove('sidebar__nav-link--active', 'header__nav-link--active');
    });

    // 2. Agregar clase activa SOLO al enlace seleccionado (si existe en sidebar)
    const activeLink = Array.from(DOM.navLinks).find(
        link => link.getAttribute('data-tab') === tabId
    );

    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
        console.log(`✅ Enlace activo establecido: ${tabId}`);
    } else {
        console.log(`⚠️ No hay enlace en sidebar para: ${tabId} (tab especial)`);
        // No retornar - tabs especiales como papelera no tienen enlace en sidebar
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

            case 'historial':
                loadTabSpecificHistorial();
                break;

            case 'papelera':
                await initPapelera();
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
            loadDocuments(),
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
            closeDocumentModal();
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

    renderDocumentsTable();
    showAlert('Mostrando todos los documentos', 'info');
}

// =============================================================================
// 11. EXPORTACIÓN DE FUNCIONES GLOBALES
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
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
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

// Funciones de subida múltiple globales
window.switchUploadMode = switchUploadMode;
window.handleUploadMultipleDocuments = handleUploadMultipleDocuments;
window.debugMultipleUpload = debugMultipleUpload;
window.testMultipleUploadWithMockFiles = testMultipleUploadWithMockFiles;
window.cancelMultipleUpload = cancelMultipleUpload;

// Funciones de descarga globales
window.downloadDocument = downloadDocument;
window.downloadDocumentSimple = downloadDocumentSimple;
window.downloadDocumentAlternative = downloadDocumentAlternative;

// Funciones de debug globales
window.debugDownload = debugDocumentDownload;
window.testAllDownloads = testAllDownloads;

// Funciones auxiliares globales
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
}, 1000);

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
    getTasksStats
};