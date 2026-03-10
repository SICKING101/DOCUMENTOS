// =============================================================================
// src/frontend/app.js - SISTEMA COMPLETO
// =============================================================================

import { CONFIG } from './config.js';
import { AppState } from './state.js';
import { DOM } from './dom.js';
import { showAlert, setupModalBackdropClose } from './utils.js';
import {
  applyVisibilityRules,
  hasPermission,
  canView,
  canAction,
  PERMISSIONS,
  initPermissionsSystem,
  applyNavigationPermissions,
  applyActionPermissions,
  showNoPermissionAlert,
  invalidatePermissionsCache,
} from './permissions.js';
import TaskManager from './task.js';
import SupportModule from './modules/soporte.js';
import { api } from './services/api.js';

// =============================================================================
// IMPORTAR TODOS LOS MÓDULOS ORGANIZADOS
// =============================================================================

// Dashboard
import {
  loadDashboardData,
  handleRefreshDashboard,
  updateDashboardTasks,
} from './modules/dashboard.js';

// Historial
import { initHistorial, loadTabSpecificHistorial } from './modules/historial.js';

// Personas
import {
  openPersonModal, closePersonModal, savePerson,
  loadPersons, renderPersonsTable, populatePersonSelect,
  editPerson, deletePerson, handleSavePerson, refreshDepartmentSelect,
} from './modules/personas.js';

// Documentos
import * as documentos from './modules/documentos/index.js';

// Categorías
import {
  openCategoryModal, closeCategoryModal, saveCategory,
  loadCategories, renderCategories, populateCategorySelects,
  editCategory, deleteCategory, handleSaveCategory,
} from './modules/categorias.js';

// Departamentos
import {
  openDepartmentModal, closeDepartmentModal, saveDepartment,
  loadDepartments, renderDepartments, populateDepartmentSelects,
  editDepartment, deleteDepartment, handleSaveDepartment,
} from './modules/departamentos.js';

// Búsqueda
import {
  showAdvancedSearch, closeSearchModal, handleDocumentSearch,
  handleClearSearch, handleFilterChange, handleAdvancedSearch,
} from './modules/search.js';

// Reportes
import {
  generateReport, closeReportModal, handleGenerateReport, handleReportTypeChange,
} from './modules/reports.js';
import * as reportsModule from './modules/reports.js';

// Notificaciones
import { initNotificaciones } from './modules/notificaciones.js';

// Papelera
import { initPapelera } from './modules/papelera.js';

// Menú de usuario
import { inicializarMenuUsuario } from './userMenu.js';

// Navegación con permisos — ÚNICA fuente de verdad
import {
  switchTab,
  getCurrentTab,
  initializeNavigation,
  refreshPermissions,
} from './navigation.js';

// =============================================================================
// 1. INICIALIZACIÓN DE LA APLICACIÓN
// =============================================================================

const appState = new AppState();
window.appState = appState;

let taskManager = null;

documentos.setupCompatibilityGlobals?.();

// =============================================================================
// 2. APLICAR REGLAS DE VISIBILIDAD BASADAS EN ROL (UI extra)
// =============================================================================

/**
 * Aplica reglas adicionales de visibilidad en la UI según permisos.
 * Se llama después de loadCurrentPermissions() para que el cache esté listo.
 */
function applyRoleBasedUI() {
  // Botones de subida de documentos
  const uploadSelectors = [
    '#addDocumentBtn',
    '#addFirstDocument',
    '#uploadDocumentBtn',
    '#uploadMultipleDocumentsBtn',
    '.action-card[onclick*="openDocumentModal"]',
  ].join(', ');

  document.querySelectorAll(uploadSelectors).forEach((el) => {
    el.style.display = canAction('documentos') ? '' : 'none';
  });

  // Botones de eliminación masiva
  const deleteSelectors = [
    '#bulkDeleteTriggerBtn',
    '#selectionInfoBar',
    '#bulkActionsContainer',
  ].join(', ');

  document.querySelectorAll(deleteSelectors).forEach((el) => {
    el.style.display = canAction('documentos') ? '' : 'none';
  });

  // Sección admin en el header/dropdown
  const adminSelectors = '#nav-admin, #admin-dropdown';
  document.querySelectorAll(adminSelectors).forEach((el) => {
    el.style.display = hasPermission(PERMISSIONS.MANAGE_USERS) ? '' : 'none';
  });
}

// =============================================================================
// 3. EVENTO DOMCONTENTLOADED — PUNTO DE ENTRADA
// =============================================================================

document.addEventListener('DOMContentLoaded', async function () {
  const systemPreloader = document.getElementById('systemPreloader');
  if (systemPreloader) {
    systemPreloader.style.display = 'flex';
    systemPreloader.setAttribute('aria-busy', 'true');
  }

  console.log('🚀 Inicializando Sistema de Gestión de Documentos - CBTIS051');
  console.log('📡 URL de la API:', CONFIG.API_BASE_URL);
  console.log('📦 Versión:', CONFIG.APP_VERSION || '1.0.0');

  try {
    // ── Fase 1: Permisos (debe ir PRIMERO antes de cualquier render de UI) ──
    await initPermissionsSystem();
    console.log('✅ Sistema de permisos inicializado');

    // ── Fase 2: Navegación (usa permisos ya cargados) ──
    await initializeNavigation();
    console.log('✅ Navegación inicializada');

    // ── Fase 3: Componentes de la app ──
    _initializeAppComponents();
    _setupEventListeners();

    // ── Fase 4: Datos iniciales ──
    await _loadInitialData();

    // ── Fase 5: Módulos adicionales ──
    if (canView('historial')) {
      initHistorial();
    }
    if (canView('notificaciones')) {
      initNotificaciones();
    }
    inicializarMenuUsuario();

    // ── Fase 6: Reglas extra de UI ──
    applyRoleBasedUI();
    applyActionPermissions();

    // ── Fase 7: Inicializar módulo de documentos ──
    if (canView('documentos') && typeof documentos.initializeDocumentosModule === 'function') {
      documentos.initializeDocumentosModule();
    }

    // ── Fase 8: Inicializar tema ──
    _initTheme();

    // ── Evento: re-aplicar permisos cuando cambia el usuario/rol ──
    window.addEventListener('auth:user-updated', async () => {
      console.log('🔄 auth:user-updated → recargando permisos...');
      await refreshPermissions();
      applyRoleBasedUI();

      // Re-render de la tabla de documentos si está activa
      if (window.appState?.currentTab === 'documentos') {
        documentos.renderDocumentsTable?.();
      }
    });

    console.log('✅ Sistema inicializado correctamente');

  } catch (error) {
    console.error('❌ Error inicializando aplicación:', error);
    showAlert(`Error de inicialización: ${error.message}`, 'error');
  } finally {
    if (systemPreloader) {
      systemPreloader.setAttribute('aria-busy', 'false');
      systemPreloader.remove();
    }
  }
});

// =============================================================================
// 4. INICIALIZACIÓN DE COMPONENTES
// =============================================================================

function _initializeAppComponents() {
  console.log('🔧 Inicializando componentes...');

  // Verificar elementos DOM
  const missingElements = Object.keys(DOM).filter((key) => {
    if (Array.isArray(DOM[key])) return DOM[key].length === 0;
    return DOM[key] === null;
  });
  if (missingElements.length > 0) {
    console.warn('⚠️ Elementos DOM faltantes:', missingElements);
  }

  // Task Manager
  _initTaskManager();

  appState.logState?.();
  console.log('✅ Componentes inicializados');
}

function _initTaskManager() {
  console.log('📝 Inicializando TaskManager...');
  try {
    if (!canView('tareas')) {
      console.log('⛔ TaskManager omitido: sin permiso de ver tareas');
      return;
    }

    if (window.taskManager) {
      taskManager = window.taskManager;
      console.log('✅ TaskManager ya existe, reutilizando instancia');
      return;
    }

    if (window.api || api) {
      taskManager = new TaskManager();
      window.taskManager = taskManager;
      console.log('✅ TaskManager inicializado');
    } else {
      // Reintentar después de 1s si la API no está lista
      setTimeout(() => {
        if (!canView('tareas')) return;
        if (window.taskManager) {
          taskManager = window.taskManager;
          return;
        }
        taskManager = new TaskManager();
        window.taskManager = taskManager;
        console.log('✅ TaskManager inicializado (retry)');
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Error al inicializar TaskManager:', error);
    showAlert('Error al inicializar módulo de tareas', 'error');
  }
}

// =============================================================================
// 5. CONFIGURACIÓN DE EVENT LISTENERS
// =============================================================================

function _setupEventListeners() {
  console.log('🔧 Configurando event listeners...');

  // ── Dashboard ──
  DOM.refreshDashboard?.addEventListener('click', () => handleRefreshDashboard(appState));
  DOM.addFirstDocument?.addEventListener('click', () => documentos.openDocumentModal());
  DOM.quickActions?.forEach((action) => {
    action.addEventListener('click', _handleQuickAction);
  });

  // ── Personas ──
  DOM.addPersonBtn?.addEventListener('click', () => openPersonModal());
  DOM.savePersonBtn?.addEventListener('click', () => handleSavePerson());
  DOM.cancelPersonBtn?.addEventListener('click', () => closePersonModal());

  // ── Documentos ──
  DOM.addDocumentBtn?.addEventListener('click', () => documentos.openDocumentModal());

  // ── Búsqueda ──
  DOM.searchDocumentsBtn?.addEventListener('click', () => handleDocumentSearch());
  DOM.clearSearchBtn?.addEventListener('click', () => handleClearSearch());
  DOM.documentSearch?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleDocumentSearch();
  });

  // ── Filtros de documentos ──
  DOM.filterCategory?.addEventListener('change', handleFilterChange);
  DOM.filterType?.addEventListener('change', handleFilterChange);
  DOM.filterDate?.addEventListener('change', handleFilterChange);
  DOM.filterStatus?.addEventListener('change', handleFilterChange);

  // ── Categorías ──
  DOM.addCategoryBtn?.addEventListener('click', () => openCategoryModal());
  DOM.saveCategoryBtn?.addEventListener('click', () => handleSaveCategory());
  DOM.cancelCategoryBtn?.addEventListener('click', () => closeCategoryModal());

  // ── Departamentos ──
  DOM.addDepartmentBtn?.addEventListener('click', () => openDepartmentModal());
  DOM.saveDepartmentBtn?.addEventListener('click', () => handleSaveDepartment());
  DOM.cancelDepartmentBtn?.addEventListener('click', () => closeDepartmentModal());

  // ── Búsqueda avanzada ──
  DOM.performSearchBtn?.addEventListener('click', () => handleAdvancedSearch());
  DOM.cancelSearchBtn?.addEventListener('click', () => closeSearchModal());

  // ── Reportes ──
  DOM.reportType?.addEventListener('change', handleReportTypeChange);
  DOM.reportFormat?.addEventListener('change', (e) => {
    window.handleReportFormatChange?.call(e.target, e);
  });
  DOM.generateReportBtn?.addEventListener('click', handleGenerateReport);

  // ── Botones de cierre de modales ──
  DOM.modalCloseButtons?.forEach((btn) => {
    btn.addEventListener('click', _handleModalClose);
  });

  // ── Cerrar modales al hacer clic en el backdrop ──
  const modals = {
    personModal:     DOM.personModal,
    documentModal:   DOM.documentModal,
    categoryModal:   DOM.categoryModal,
    departmentModal: DOM.departmentModal,
    searchModal:     DOM.searchModal,
    reportModal:     DOM.reportModal,
    taskModal:       DOM.taskModal,
  };
  setupModalBackdropClose(modals);

  // ── Tema oscuro/claro ──
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', _toggleTheme);
    themeToggle.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        _toggleTheme();
      }
    });
  }

  // ── Papelera (botón del sidebar especial) ──
  const trashBtn = document.getElementById('trashBtn');
  if (trashBtn) {
    trashBtn.addEventListener('click', async () => {
      if (canAction('papelera') || canView('papelera')) {
        await switchTab('papelera');
      } else {
        showNoPermissionAlert('papelera');
      }
    });
  }

  console.log('✅ Event listeners configurados');
}

// =============================================================================
// 6. CARGA DE DATOS INICIALES
// =============================================================================

async function _loadInitialData() {
  console.log('📥 Cargando datos iniciales...');

  try {
    const jobs = [];

    // Dashboard (por ahora siempre para usuarios autenticados)
    jobs.push(loadDashboardData(appState));

    // Secciones condicionadas por permisos
    if (canView('personas')) jobs.push(loadPersons());
    if (canView('tareas')) jobs.push(updateDashboardTasks());
    if (canView('documentos')) jobs.push(documentos.loadDocuments());
    if (canView('categorias')) jobs.push(loadCategories());
    if (canView('departamentos')) jobs.push(loadDepartments());

    await Promise.allSettled(jobs);

    console.log('✅ Datos iniciales cargados');
    showAlert('Sistema cargado correctamente', 'success');
  } catch (error) {
    console.error('❌ Error cargando datos iniciales:', error);
    showAlert('Error al cargar datos iniciales', 'error');
  }
}

// =============================================================================
// 7. TEMA OSCURO / CLARO
// =============================================================================

const _getPreferredTheme = () => localStorage.getItem('theme') || 'light';

const _applyTheme = (theme) => {
  const themeIcon   = document.querySelector('#themeToggle i');
  const themeToggle = document.getElementById('themeToggle');

  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    themeIcon?.classList.replace('fa-moon', 'fa-sun');
    themeToggle?.setAttribute('aria-pressed', 'true');
    if (themeToggle) themeToggle.title = 'Tema: Oscuro';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-theme');
    themeIcon?.classList.replace('fa-sun', 'fa-moon');
    themeToggle?.setAttribute('aria-pressed', 'false');
    if (themeToggle) themeToggle.title = 'Tema: Claro';
    localStorage.setItem('theme', 'light');
  }
};

const _initTheme  = () => _applyTheme(_getPreferredTheme());
const _toggleTheme = () => _applyTheme(document.body.classList.contains('dark-theme') ? 'light' : 'dark');

// =============================================================================
// 8. MANEJADORES DE UI
// =============================================================================

function _handleQuickAction(e) {
  const title = this.querySelector('.action-card__title')?.textContent;
  console.log(`⚡ Acción rápida: ${title}`);

  switch (title) {
    case 'Subir Documento':
      if (canAction('documentos')) {
        documentos.openDocumentModal();
      } else {
        showNoPermissionAlert('documentos');
      }
      break;

    case 'Subir Múltiples':
      if (canAction('documentos')) {
        documentos.openDocumentModal();
        setTimeout(() => documentos.switchUploadMode?.('multiple'), 100);
      } else {
        showNoPermissionAlert('documentos');
      }
      break;

    case 'Agregar Persona':
      if (canAction('personas')) {
        openPersonModal();
      } else {
        showNoPermissionAlert('personas');
      }
      break;

    case 'Generar Reporte':
      if (canView('reportes')) {
        generateReport();
      } else {
        showNoPermissionAlert('reportes');
      }
      break;

    case 'Búsqueda Avanzada':
      showAdvancedSearch();
      break;

    default:
      console.warn('Acción rápida no reconocida:', title);
  }
}

function _handleModalClose() {
  const modal = this.closest('.modal');
  if (!modal) return;

  switch (modal.id) {
    case 'personModal':     closePersonModal();             break;
    case 'documentModal':   documentos.closeDocumentModal?.(); break;
    case 'categoryModal':   closeCategoryModal();           break;
    case 'departmentModal': closeDepartmentModal();         break;
    case 'searchModal':     closeSearchModal();             break;
    case 'reportModal':     closeReportModal();             break;
    case 'taskModal':       taskManager?.closeTaskModal?.(); break;
  }
}

// =============================================================================
// 9. FUNCIONES DE TAREAS
// =============================================================================

function openTaskModal(task = null) {
  if (taskManager) {
    taskManager.openTaskModal(task);
  } else {
    console.error('❌ taskManager no disponible');
    showAlert('Error: Módulo de tareas no disponible', 'error');
  }
}

function createQuickTask(title, description = '', priority = 'media') {
  taskManager?.openTaskModal({
    title, description, priority,
    status: 'pendiente',
    category: 'Rápida',
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    reminder: false,
  });
}

function getTasksStats() {
  if (!taskManager) return null;
  const tasks = taskManager.tasks;
  return {
    total:      tasks.length,
    pending:    tasks.filter((t) => t.status === 'pendiente').length,
    inProgress: tasks.filter((t) => t.status === 'en-progreso').length,
    completed:  tasks.filter((t) => t.status === 'completada').length,
    overdue:    tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completada') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
  };
}

// =============================================================================
// 10. FUNCIONES GLOBALES DE UTILIDAD
// =============================================================================

function showAllDocuments() {
  appState.currentSearchQuery = '';
  appState.filters = { category: '', type: '', date: '', status: '' };
  if (DOM.filterCategory) DOM.filterCategory.value = '';
  if (DOM.filterType)     DOM.filterType.value     = '';
  if (DOM.filterDate)     DOM.filterDate.value     = '';
  if (DOM.filterStatus)   DOM.filterStatus.value   = '';
  if (DOM.documentSearch) DOM.documentSearch.value = '';
  documentos.renderDocumentsTable?.();
  showAlert('Mostrando todos los documentos', 'info');
}

function debugAppState() {
  console.group('🔧 Debug App State');
  appState.logState?.();
  if (taskManager) {
    console.log('📊 Tareas:', getTasksStats());
  }
  console.groupEnd();
}

function testAPIConnection() {
  showAlert('Probando conexión con el servidor...', 'info');
  fetch(`${CONFIG.API_BASE_URL}/health`)
    .then((r) => r.json())
    .then((d) => {
      if (d.success) showAlert('Conexión establecida correctamente', 'success');
      else throw new Error(d.message);
    })
    .catch((e) => {
      console.error('❌ Error de conexión:', e);
      showAlert(`Error al conectar: ${e.message}`, 'error');
    });
}

function resetApp() {
  if (confirm('¿Resetear la aplicación? Se perderán TODOS los datos locales.')) {
    localStorage.clear();
    location.reload();
  }
}

// =============================================================================
// 11. EXPORTACIONES GLOBALES (window.*)
// =============================================================================

// ── Documentos ──
window.downloadDocument           = documentos.downloadDocument;
window.previewDocument            = documentos.previewDocument;
window.deleteDocument             = documentos.deleteDocument;
window.openDocumentModal          = documentos.openDocumentModal;
window.closeDocumentModal         = documentos.closeDocumentModal;
window.switchUploadMode           = documentos.switchUploadMode;
window.handleUploadMultipleDocuments = documentos.handleUploadMultipleDocuments;
window.debugMultipleUpload        = documentos.debugMultipleUpload;
window.testMultipleUploadWithMockFiles = documentos.testMultipleUploadWithMockFiles;
window.cancelMultipleUpload       = documentos.cancelMultipleUpload;
window.downloadDocumentSimple     = documentos.downloadDocumentSimple;
window.downloadDocumentAlternative= documentos.downloadDocumentAlternative;
window.debugDownload              = documentos.debugDocumentDownload;
window.testAllDownloads           = documentos.testAllDownloads;
window.loadDocuments              = documentos.loadDocuments;
window.renderDocumentsTable       = documentos.renderDocumentsTable;
window.changeDocumentsPage        = documentos.changeDocumentsPage;
window.populateDocumentCategorySelect = documentos.populateDocumentCategorySelect;

// ── Personas ──
window.editPerson            = editPerson;
window.deletePerson          = deletePerson;
window.openPersonModal       = openPersonModal;
window.closePersonModal      = closePersonModal;
window.loadPersons           = loadPersons;
window.renderPersonsTable    = renderPersonsTable;
window.populatePersonSelect  = populatePersonSelect;
window.refreshDepartmentSelect = refreshDepartmentSelect;

// ── Categorías ──
window.openCategoryModal     = openCategoryModal;
window.closeCategoryModal    = closeCategoryModal;
window.editCategory          = editCategory;
window.deleteCategory        = deleteCategory;
window.loadCategories        = loadCategories;
window.renderCategories      = renderCategories;
window.populateCategorySelects = populateCategorySelects;

// ── Departamentos ──
window.openDepartmentModal   = openDepartmentModal;
window.closeDepartmentModal  = closeDepartmentModal;
window.editDepartment        = editDepartment;
window.deleteDepartment      = deleteDepartment;

// ── Búsqueda y reportes ──
window.showAdvancedSearch    = showAdvancedSearch;
window.closeSearchModal      = closeSearchModal;
window.generateReport        = reportsModule.generateReport;
window.closeReportModal      = reportsModule.closeReportModal;
window.handleGenerateReport  = reportsModule.handleGenerateReport;
window.handleReportTypeChange= reportsModule.handleReportTypeChange;
window.handleReportFormatChange = reportsModule.handleReportFormatChange;
window.initReportsModule     = reportsModule.initReportsModule;

// ── Historial ──
window.loadTabSpecificHistorial = loadTabSpecificHistorial;

// ── Papelera ──
window.initPapelera          = initPapelera;

// ── Navegación — window.switchTab ya se expone desde navigation.js ──
// No redefinir aquí para evitar colisión. navigation.js lo hace primero.

// ── Tareas ──
window.openTaskModal         = openTaskModal;
window.createQuickTask       = createQuickTask;
window.getTasksStats         = getTasksStats;

// ── Utilidades ──
window.showAllDocuments      = showAllDocuments;
window.debugAppState         = debugAppState;
window.testAPIConnection     = testAPIConnection;
window.resetApp              = resetApp;

// ── Permisos ──
window.refreshPermissions    = refreshPermissions;
window.canView               = canView;
window.canAction             = canAction;
window.hasPermission         = hasPermission;

// ── Categorías (compatibilidad) ──
window.populateCategorySelect = (selectElement) => {
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="">Seleccionar categoría</option>';
  appState.categories?.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value       = cat.nombre;
    opt.textContent = cat.nombre;
    selectElement.appendChild(opt);
  });
};

// =============================================================================
// 12. MANEJO DE ERRORES GLOBALES
// =============================================================================

window.addEventListener('error', (e) => {
  console.error('🚨 Error global:', e.error);
  // No mostrar alert para errores menores de red
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('🚨 Promise rechazada:', e.reason);
});

// =============================================================================
// 13. INICIALIZACIÓN TARDÍA
// =============================================================================

setTimeout(() => {
  // Re-bindear eventos de tareas si los elementos ya están en el DOM
  if (taskManager) {
    const taskElements = ['tasksContainer', 'addTaskBtn', 'taskModal'];
    const allPresent   = taskElements.every((id) => document.getElementById(id));
    if (allPresent) {
      taskManager.bindEvents?.();
      console.log('🔄 Eventos de tareas re-bindeados');
    }
  }

  // Inicializar filtros de documentos
  if (typeof documentos.initializeTableFilters === 'function') {
    try {
      documentos.initializeTableFilters();
      console.log('✅ Filtros de documentos inicializados');
    } catch (error) {
      console.error('❌ Error inicializando filtros:', error);
    }
  }

  // Reaplica permisos una vez más para capturar elementos renderizados dinámicamente
  applyNavigationPermissions();
  applyActionPermissions();
  applyRoleBasedUI();
  console.log('🔄 Permisos reaplicados (inicialización tardía)');

}, 1200);

console.log('✅ app.js cargado correctamente');

// =============================================================================
// 14. EXPORTACIONES DE MÓDULO
// =============================================================================

export {
  switchTab,
  getCurrentTab,
  taskManager,
  openTaskModal,
  createQuickTask,
  getTasksStats,
  appState,
  _initializeAppComponents as initializeApp,
};
