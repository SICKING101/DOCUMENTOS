// src/frontend/navigation.js
// Sistema de navegación por pestañas con integración completa de permisos.
//
// RESPONSABILIDADES:
//   1. Inicializar la navegación del sidebar con permisos
//   2. Cambiar entre secciones (switchTab) — ÚNICA definición canónica
//   3. Cargar datos específicos de cada sección
//   4. Teclado: navegar con flechas
//   5. Actualizar información del usuario en el sidebar

import { DOM } from './dom.js';
import {
  canView,
  initPermissionsSystem,
  invalidatePermissionsCache,
  applyNavigationPermissions,
  applyActionPermissions,
  showNoPermissionAlert,
  ROLES,
} from './permissions.js';
import { getCurrentUser } from './auth.js';

// ─── Debug ────────────────────────────────────────────────────────────────────
const DEBUG = true;
function nlog(...args)  { if (DEBUG) console.log('🧭 [Nav]', ...args); }
function nwarn(...args) { if (DEBUG) console.warn('⚠️ [Nav]', ...args); }
function nerr(...args)  {           console.error('❌ [Nav]', ...args); }

// ─── Estado de navegación ─────────────────────────────────────────────────────
let _currentTab        = 'dashboard';
let _navigationLocked  = false;  // Previene cambios durante una transición

// Tabs válidas del sistema
const VALID_TABS = [
  'dashboard', 'personas', 'documentos', 'categorias', 'departamentos',
  'tareas', 'historial', 'papelera', 'calendario', 'reportes',
  'soporte', 'ajustes', 'admin', 'auditoria',
];

// =============================================================================
// 1. INICIALIZACIÓN
// =============================================================================

/**
 * Inicializa el sistema de navegación completo.
 * - Carga permisos del usuario
 * - Aplica visibilidad en el sidebar
 * - Configura event listeners
 * - Establece la pestaña inicial
 *
 * @returns {Promise<void>}
 */
export async function initializeNavigation() {
  nlog('initializeNavigation: iniciando sistema de navegación...');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _doInit);
  } else {
    await _doInit();
  }
}

async function _doInit() {
  try {
    // 1. Cargar permisos y aplicar al sidebar
    await initPermissionsSystem();

    // 2. Inicializar navegación por pestañas
    await _setupTabNavigation();

    // 3. Enlace especial de admin
    _setupAdminLink();

    // 4. Navegación por teclado
    _setupKeyboardNavigation();

    // 5. Información del usuario en sidebar
    _updateUserInfo();

    nlog('initializeNavigation: completado ✅');
  } catch (e) {
    nerr('initializeNavigation: error crítico', e);
  }
}

// =============================================================================
// 2. CONFIGURACIÓN DE TABS
// =============================================================================

async function _setupTabNavigation() {
  nlog('_setupTabNavigation: configurando...');

  const navLinks = _getNavLinks();
  nlog(`_setupTabNavigation: ${navLinks.length} nav-links encontrados`);

  if (navLinks.length === 0) {
    nwarn('_setupTabNavigation: no se encontraron nav-links');
    return;
  }

  // Adjuntar listeners a los enlaces visibles
  navLinks.forEach((link) => {
    // Remover listener anterior si existe (evitar duplicados)
    link.removeEventListener('click', _handleNavLinkClick);
    link.addEventListener('click', _handleNavLinkClick);
  });

  // Determinar y establecer pestaña inicial
  await _setInitialTab(navLinks);
}

function _handleNavLinkClick(e) {
  e.preventDefault();
  const tabId = this.getAttribute('data-tab');
  nlog(`_handleNavLinkClick: clic en "${tabId}"`);

  if (!tabId) {
    nwarn('_handleNavLinkClick: link sin data-tab');
    return;
  }

  switchTab(tabId).catch((err) => {
    nerr(`_handleNavLinkClick: error al cambiar a "${tabId}"`, err);
  });
}

async function _setInitialTab(navLinks) {
  // Verificar si hay una pestaña marcada como activa en el HTML
  const activeLink = document.querySelector('.sidebar__nav-link--active');
  if (activeLink) {
    const tabId = activeLink.getAttribute('data-tab');
    if (tabId && canView(tabId)) {
      nlog(`_setInitialTab: pestaña activa en HTML = "${tabId}"`);
      await switchTab(tabId);
      return;
    }
  }

  // Buscar la primera pestaña visible que el usuario pueda ver
  for (const link of navLinks) {
    if (link.style.display === 'none') continue;
    const tabId = link.getAttribute('data-tab');
    if (tabId && canView(tabId)) {
      nlog(`_setInitialTab: primera pestaña visible = "${tabId}"`);
      await switchTab(tabId);
      return;
    }
  }

  // Fallback: dashboard siempre
  nlog('_setInitialTab: fallback a dashboard');
  await switchTab('dashboard');
}

function _setupAdminLink() {
  const adminLink = document.getElementById('nav-admin');
  if (!adminLink) return;

  adminLink.removeEventListener('click', _handleAdminClick);
  adminLink.addEventListener('click', _handleAdminClick);
  nlog('_setupAdminLink: enlace de admin configurado');
}

async function _handleAdminClick(e) {
  e.preventDefault();
  nlog('_handleAdminClick: clic en admin');

  if (!canView('admin')) {
    showNoPermissionAlert('admin');
    return;
  }

  await switchTab('admin');
}

// =============================================================================
// 3. SWITCH TAB — FUNCIÓN CANÓNICA ÚNICA
// =============================================================================

/**
 * Cambia la sección activa de la aplicación.
 * Esta es la ÚNICA función que debe usarse para cambiar de sección.
 * Se exporta globalmente como window.switchTab.
 *
 * @param {string} tabId — ID de la sección destino
 * @returns {Promise<void>}
 */
export async function switchTab(tabId) {
  // Validar el tabId
  if (!tabId || !VALID_TABS.includes(tabId)) {
    nerr(`switchTab: tabId inválido "${tabId}"`);
    return;
  }

  // Verificar permiso de acceso
  if (!canView(tabId)) {
    nwarn(`switchTab: sin permiso para "${tabId}"`);

    // Si es admin/auditoria sin ser administrador, mostrar alerta
    if (tabId === 'admin' || tabId === 'auditoria') {
      showNoPermissionAlert(tabId);
    }

    // Redirigir a dashboard si la pestaña actual no está disponible
    if (tabId !== 'dashboard') {
      await switchTab('dashboard');
    }
    return;
  }

  // Prevenir cambios durante una transición
  if (_navigationLocked) {
    nwarn(`switchTab: navegación bloqueada, ignorando cambio a "${tabId}"`);
    return;
  }

  _navigationLocked = true;
  nlog(`switchTab: cambiando a "${tabId}" (desde "${_currentTab}")`);

  try {
    // 1. Actualizar indicadores visuales del sidebar
    _updateSidebarActive(tabId);

    // 2. Mostrar el contenido de la sección
    _showTabContent(tabId);

    // 3. Actualizar estado
    _currentTab = tabId;
    if (window.appState) window.appState.currentTab = tabId;

    // 4. Cargar datos específicos de la sección
    await _loadTabData(tabId);

    // 5. Re-aplicar permisos de acción en el nuevo contenido
    // (dar tiempo para que el DOM se actualice)
    setTimeout(() => {
      applyActionPermissions();
    }, 150);

    nlog(`switchTab: "${tabId}" cargado ✅`);
  } catch (e) {
    nerr(`switchTab: error al cargar "${tabId}"`, e);
  } finally {
    _navigationLocked = false;
  }
}

/**
 * Actualiza qué enlace del sidebar está marcado como activo.
 */
function _updateSidebarActive(tabId) {
  const navLinks = _getNavLinks();

  // Remover estado activo de todos los enlaces
  navLinks.forEach((link) => {
    link.classList.remove('sidebar__nav-link--active', 'header__nav-link--active');

    // Ocultar indicador visual si existe
    const indicator = link.querySelector('.sidebar__nav-active-indicator');
    if (indicator) indicator.style.visibility = 'hidden';
  });

  // Marcar el enlace activo
  const activeLink = Array.from(navLinks).find(
    (link) => link.getAttribute('data-tab') === tabId
  );

  if (activeLink) {
    activeLink.classList.add('sidebar__nav-link--active');
    const indicator = activeLink.querySelector('.sidebar__nav-active-indicator');
    if (indicator) indicator.style.visibility = 'visible';
    nlog(`_updateSidebarActive: "${tabId}" marcado como activo`);
  } else {
    nwarn(`_updateSidebarActive: no se encontró enlace para "${tabId}"`);
  }
}

/**
 * Muestra el contenido de la sección y oculta el resto.
 */
function _showTabContent(tabId) {
  // Ocultar todos los contenidos de tabs
  const allTabs = document.querySelectorAll('.tab-content');
  allTabs.forEach((tab) => {
    tab.classList.remove('tab-content--active');
    tab.style.display = 'none';
  });

  // Buscar el elemento del tab
  let activeTab = document.getElementById(tabId);

  // Si es admin y no existe, crearlo dinámicamente
  if (!activeTab && tabId === 'admin') {
    activeTab = _createAdminTab();
  }

  if (activeTab) {
    activeTab.classList.add('tab-content--active');
    activeTab.style.display = 'block';
    nlog(`_showTabContent: mostrando contenido de "${tabId}"`);
  } else {
    nerr(`_showTabContent: no se encontró elemento con id="${tabId}"`);
    nlog('Tabs disponibles:', Array.from(allTabs).map((t) => t.id));
  }
}

/**
 * Crea dinámicamente la sección de admin si no existe en el HTML.
 */
function _createAdminTab() {
  const mainContent = document.querySelector('.main-content') || document.body;
  const section = document.createElement('section');
  section.id        = 'admin';
  section.className = 'tab-content';
  section.style.display = 'none';
  section.innerHTML = `
    <div class="section__header">
      <div>
        <h2 class="section__title">Administración</h2>
        <p class="section__subtitle">Panel de administración del sistema</p>
      </div>
    </div>
    <div id="admin-content"></div>
  `;
  mainContent.appendChild(section);
  nlog('_createAdminTab: sección admin creada dinámicamente');
  return section;
}

// =============================================================================
// 4. CARGA DE DATOS POR SECCIÓN
// =============================================================================

/**
 * Carga los datos específicos de cada sección.
 * Usa las funciones globales expuestas por app.js.
 */
async function _loadTabData(tabId) {
  nlog(`_loadTabData: cargando datos para "${tabId}"`);

  try {
    switch (tabId) {

      case 'dashboard':
        if (typeof window.loadDashboardData === 'function') {
          window.loadDashboardData();
        }
        break;

      case 'personas':
        if (typeof window.loadPersons === 'function') {
          await window.loadPersons();
        }
        if (typeof window.renderPersonsTable === 'function') {
          window.renderPersonsTable();
        }
        break;

      case 'documentos':
        if (typeof window.loadDocuments === 'function') {
          await window.loadDocuments();
        }
        if (typeof window.renderDocumentsTable === 'function') {
          window.renderDocumentsTable();
        }
        break;

      case 'categorias':
        if (typeof window.loadCategories === 'function') {
          await window.loadCategories();
        }
        if (typeof window.renderCategories === 'function') {
          window.renderCategories();
        }
        break;

      case 'tareas':
        if (window.taskManager) {
          await window.taskManager.loadTasks?.();
          window.taskManager.renderTasks?.();
          window.taskManager.updateSummary?.();
        }
        break;

      case 'historial':
        if (typeof window.loadTabSpecificHistorial === 'function') {
          window.loadTabSpecificHistorial();
        }
        break;

      case 'papelera':
        if (typeof window.initPapelera === 'function') {
          await window.initPapelera();
        }
        break;

      case 'calendario':
        setTimeout(() => {
          if (typeof window.initializeCalendar === 'function') {
            window.initializeCalendar();
          } else if (typeof window.initializeBasicCalendar === 'function') {
            window.initializeBasicCalendar();
          }
        }, 50);
        break;

      case 'reportes':
        if (typeof window.initReportsModule === 'function') {
          window.initReportsModule();
        }
        break;

      case 'soporte':
        if (!window.supportModule && typeof window.SupportModule === 'function') {
          window.supportModule = new window.SupportModule();
          if (window.supportModule?.init) {
            await window.supportModule.init();
          }
        } else if (window.supportModule?.init) {
          await window.supportModule.init();
        }
        break;

      case 'ajustes':
        try {
          if (!window.settingsManager) {
            const mod = await import('./modules/ajustes.js');
            window.settingsManager = mod.default;
            nlog('_loadTabData: módulo ajustes cargado');
          }
          window.settingsManager?.updateForm?.();
        } catch (e) {
          nerr('_loadTabData: error cargando ajustes', e);
        }
        break;

      case 'admin':
        try {
          const mod = await import('./modules/admin/index.js');
          mod.renderAgregarAdministrador?.();
          nlog('_loadTabData: módulo admin cargado');
        } catch (e) {
          nerr('_loadTabData: error cargando admin', e);
        }
        break;

      case 'auditoria':
        try {
          const mod = await import('./modules/auditoria.js');
          mod.renderAuditoria?.();
          nlog('_loadTabData: módulo auditoria cargado');
        } catch (e) {
          nerr('_loadTabData: error cargando auditoria', e);
        }
        break;

      default:
        nlog(`_loadTabData: sin carga específica para "${tabId}"`);
    }
  } catch (e) {
    nerr(`_loadTabData: error en "${tabId}"`, e);
  }
}

// =============================================================================
// 5. NAVEGACIÓN POR TECLADO
// =============================================================================

function _setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // No interferir con inputs
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Solo con Alt presionado para no interferir con el sistema
    if (!e.altKey) return;

    const visibleTabs = _getVisibleTabs();
    const currentIndex = visibleTabs.indexOf(_currentTab);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        const next = visibleTabs[(currentIndex + 1) % visibleTabs.length];
        if (next) switchTab(next);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        const prev = visibleTabs[(currentIndex - 1 + visibleTabs.length) % visibleTabs.length];
        if (prev) switchTab(prev);
        break;
      }
    }
  });

  nlog('_setupKeyboardNavigation: navegación con Alt+Flechas activada');
}

function _getVisibleTabs() {
  return Array.from(_getNavLinks())
    .filter((link) => link.style.display !== 'none')
    .map((link) => link.getAttribute('data-tab'))
    .filter(Boolean);
}

// =============================================================================
// 6. INFORMACIÓN DEL USUARIO EN SIDEBAR
// =============================================================================

function _updateUserInfo() {
  try {
    const user = getCurrentUser?.() || null;
    if (!user) return;

    const nameEl  = document.querySelector('.sidebar__user-name');
    const roleEl  = document.querySelector('.sidebar__user-role');
    const emailEl = document.getElementById('userEmail');

    if (nameEl)  nameEl.textContent  = user.usuario || user.name || 'Usuario';
    if (emailEl) emailEl.textContent = user.correo  || user.email || '';

    if (roleEl) {
      const rol = user.rol || user.role || '';
      roleEl.textContent = rol === ROLES.ADMIN
        ? 'Administrador'
        : (rol.charAt(0).toUpperCase() + rol.slice(1));
    }

    nlog('_updateUserInfo: info de usuario actualizada');
  } catch (e) {
    nwarn('_updateUserInfo: error', e.message);
  }
}

// =============================================================================
// 7. UTILIDADES
// =============================================================================

function _getNavLinks() {
  return document.querySelectorAll('.sidebar__nav-link[data-tab]');
}

/**
 * Devuelve el ID de la sección actualmente activa.
 */
export function getCurrentTab() {
  return _currentTab;
}

/**
 * Cambia a una sección si el usuario tiene permiso para verla.
 * Alias semántico de switchTab.
 */
export function showTab(tabId) {
  if (canView(tabId)) {
    switchTab(tabId);
  } else {
    showNoPermissionAlert(tabId);
  }
}

// =============================================================================
// 8. ACTUALIZAR PERMISOS EN TIEMPO REAL
// =============================================================================

/**
 * Actualiza todos los permisos y reaplica la UI.
 * Llamar cuando el admin modifica un rol o cambia el rol de un usuario.
 *
 * @returns {Promise<void>}
 */
export async function refreshPermissions() {
  nlog('refreshPermissions: actualizando...');

  try {
    // Invalidar cache y recargar
    invalidatePermissionsCache();
    await initPermissionsSystem();

    // Si la pestaña actual ya no es accesible, ir al dashboard
    if (_currentTab !== 'dashboard' && !canView(_currentTab)) {
      nwarn(`refreshPermissions: pestaña actual "${_currentTab}" ya no accesible → dashboard`);
      await switchTab('dashboard');
    } else {
      // Reaplicar permisos de acción en la sección actual
      applyActionPermissions();
    }

    nlog('refreshPermissions: completado ✅');
  } catch (e) {
    nerr('refreshPermissions: error', e);
  }
}

// =============================================================================
// 9. EXPORTACIONES GLOBALES
// =============================================================================

// Hacer funciones disponibles globalmente para compatibilidad con app.js
// y código legacy que accede a window.switchTab
window.switchTab        = switchTab;
window.getCurrentTab    = getCurrentTab;
window.showTab          = showTab;
window.initializeNavigation = initializeNavigation;
window.refreshPermissions   = refreshPermissions;

// Función de debug
window._navDebug = () => {
  console.group('🧭 [Nav] Debug');
  console.log('Tab actual:', _currentTab);
  console.log('Nav bloqueada:', _navigationLocked);
  console.log('Tabs válidas:', VALID_TABS);
  console.log('Tabs visibles:', _getVisibleTabs());
  const links = _getNavLinks();
  console.group(`Nav-links (${links.length}):`);
  links.forEach((l) => {
    console.log(`  [${l.getAttribute('data-tab')}] display="${l.style.display}" active=${l.classList.contains('sidebar__nav-link--active')}`);
  });
  console.groupEnd();
  console.groupEnd();
};

nlog('📦 Módulo navigation.js cargado — debug: window._navDebug()');

// =============================================================================
// 10. EXPORTACIONES DE MÓDULO
// =============================================================================

export {
  _loadTabData as loadTabSpecificData,
  _setupTabNavigation as initializeTabNavigation,
  _setupKeyboardNavigation as initializeKeyboardNavigation,
};
