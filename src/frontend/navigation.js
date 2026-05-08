// src/frontend/navigation.js
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

const DEBUG = true;
function nlog(...args)  { if (DEBUG) console.log('🧭 [Nav]', ...args); }
function nwarn(...args) { if (DEBUG) console.warn('⚠️ [Nav]', ...args); }
function nerr(...args)  { console.error('❌ [Nav]', ...args); }

let _currentTab       = 'dashboard';
let _previousTab      = null;
let _navigationLocked = false;

const VALID_TABS = [
    'dashboard', 'personas', 'documentos', 'categorias', 'departamentos',
    'tareas', 'historial', 'papelera', 'calendario', 'reportes',
    'soporte', 'ajustes', 'admin', 'auditoria', 'chatbot', 'versiones', 'avisos',
];

// ─────────────────────────────────────────────────────────────
export async function initializeNavigation() {
    nlog('initializeNavigation: iniciando...');
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _doInit);
    } else {
        await _doInit();
    }
}

async function _doInit() {
    try {
        await initPermissionsSystem();
        await _setupTabNavigation();
        _setupAdminLink();
        _setupKeyboardNavigation();
        _updateUserInfo();
        nlog('initializeNavigation: completado ✅');
    } catch (e) {
        nerr('initializeNavigation: error crítico', e);
    }
}

async function _setupTabNavigation() {
    const navLinks = _getNavLinks();
    if (navLinks.length === 0) return;
    navLinks.forEach(link => {
        link.removeEventListener('click', _handleNavLinkClick);
        link.addEventListener('click', _handleNavLinkClick);
    });
    await _setInitialTab(navLinks);
}

function _handleNavLinkClick(e) {
    e.preventDefault();
    const tabId = this.getAttribute('data-tab');
    if (!tabId) return;
    switchTab(tabId).catch(err => nerr(`Error cambiando a "${tabId}"`, err));
}

async function _setInitialTab(navLinks) {
    const activeLink = document.querySelector('.sidebar__nav-link--active');
    if (activeLink) {
        const tabId = activeLink.getAttribute('data-tab');
        if (tabId && canView(tabId)) { await switchTab(tabId); return; }
    }
    for (const link of navLinks) {
        if (link.style.display === 'none') continue;
        const tabId = link.getAttribute('data-tab');
        if (tabId && canView(tabId)) { await switchTab(tabId); return; }
    }
    await switchTab('dashboard');
}

function _setupAdminLink() {
    const adminLink = document.getElementById('nav-admin');
    if (!adminLink) return;
    adminLink.removeEventListener('click', _handleAdminClick);
    adminLink.addEventListener('click', _handleAdminClick);
}

async function _handleAdminClick(e) {
    e.preventDefault();
    if (!canView('admin')) { showNoPermissionAlert('admin'); return; }
    await switchTab('admin');
}

// =============================================================================
// SWITCH TAB — con manejo limpio de ARIA toggle
// =============================================================================
export async function switchTab(tabId) {
    if (!tabId || !VALID_TABS.includes(tabId)) {
        nerr(`switchTab: tabId inválido "${tabId}"`);
        return;
    }

    if (!canView(tabId)) {
        nwarn(`switchTab: sin permiso para "${tabId}"`);
        if (tabId === 'admin' || tabId === 'auditoria') showNoPermissionAlert(tabId);
        if (tabId !== 'dashboard') await switchTab('dashboard');
        return;
    }

    if (_navigationLocked) { nwarn('switchTab: navegación bloqueada'); return; }

    _navigationLocked = true;
    const previousTab = _currentTab;
    nlog(`switchTab: "${previousTab}" → "${tabId}"`);

    try {
        _updateSidebarActive(tabId);
        _showTabContent(tabId);

        // ─── Manejo del toggle de ARIA ──────────────────────────
        _handleAriaToggle(previousTab, tabId);
        // ───────────────────────────────────────────────────────

        _currentTab  = tabId;
        _previousTab = previousTab;
        if (window.appState) window.appState.currentTab = tabId;

        await _loadTabData(tabId);

        setTimeout(() => applyActionPermissions(), 150);
        nlog(`switchTab: "${tabId}" cargado ✅`);
    } catch (e) {
        nerr(`switchTab: error al cargar "${tabId}"`, e);
    } finally {
        _navigationLocked = false;
    }
}

/**
 * Maneja el estado del toggle de ARIA al cambiar de pestaña.
 * Centralizado aquí para evitar inconsistencias.
 */
function _handleAriaToggle(fromTab, toTab) {
    const aria = window.__aria;

    if (toTab === 'chatbot') {
        // Entrando a chatbot: ocultar toggle, ARIA manejará su fullscreen
        nlog('🤖 Entrando a chatbot — ocultando toggle');
        const toggle = document.getElementById('ariaToggle');
        const win    = document.getElementById('ariaWindow');

        if (toggle) toggle.style.display = 'none';
        if (win)    win.classList.add('aria-window--closed');

        // Notificar a ARIA (si ya está instanciado)
        // _loadTabData se encarga del renderFullscreen, así que aquí
        // solo aseguramos el estado
        if (aria) {
            aria.isOpen = false;
        }

    } else if (fromTab === 'chatbot') {
        // Saliendo de chatbot: restaurar toggle correctamente
        nlog('🤖 Saliendo de chatbot — restaurando toggle');

        if (aria) {
            // Usar el método limpio de ARIA si está disponible
            if (typeof aria.exitChatbotTab === 'function') {
                aria.exitChatbotTab();
            } else {
                // Fallback manual si ARIA no tiene el método
                const win    = document.getElementById('ariaWindow');
                const toggle = document.getElementById('ariaToggle');

                if (win) {
                    win.style.display = '';           // ⚠️ Eliminar display:none inline
                    win.classList.add('aria-window--closed');
                }
                if (toggle) {
                    toggle.style.display = 'flex';
                    toggle.classList.remove('aria-toggle--open');
                }
                aria.isOpen          = false;
                aria._inChatbotTab   = false;
                aria._fullscreenMessages    = null;
                aria._fullscreenInput       = null;
                aria._fullscreenSend        = null;
                aria._fullscreenVoice       = null;
                aria._fullscreenCharCount   = null;
                aria._fullscreenStatus      = null;
                aria._fullscreenSuggestions = null;
            }
        } else {
            // ARIA no instanciada todavía — solo manipular DOM
            const win    = document.getElementById('ariaWindow');
            const toggle = document.getElementById('ariaToggle');

            if (win) {
                win.style.display = '';
                win.classList.add('aria-window--closed');
            }
            if (toggle) {
                toggle.style.display = 'flex';
                toggle.classList.remove('aria-toggle--open');
            }
        }

    } else {
        // Navegación normal (no involucra chatbot)
        // Asegurarse de que el toggle esté visible si ARIA no está en chatbot tab
        if (aria && !aria._inChatbotTab) {
            const toggle = document.getElementById('ariaToggle');
            if (toggle) toggle.style.display = 'flex';
        }
    }
}

function _updateSidebarActive(tabId) {
    _getNavLinks().forEach(link => {
        link.classList.remove('sidebar__nav-link--active');
        const indicator = link.querySelector('.sidebar__nav-active-indicator');
        if (indicator) indicator.style.visibility = 'hidden';
    });
    const activeLink = Array.from(_getNavLinks()).find(l => l.getAttribute('data-tab') === tabId);
    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
        const indicator = activeLink.querySelector('.sidebar__nav-active-indicator');
        if (indicator) indicator.style.visibility = 'visible';
    }
}

function _showTabContent(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('tab-content--active');
        tab.style.display = 'none';
    });
    let activeTab = document.getElementById(tabId);
    if (!activeTab && tabId === 'admin') activeTab = _createAdminTab();
    if (activeTab) {
        activeTab.classList.add('tab-content--active');
        activeTab.style.display = 'block';
    }
}

function _createAdminTab() {
    const mainContent = document.querySelector('.main-content') || document.body;
    const section     = document.createElement('section');
    section.id        = 'admin';
    section.className = 'tab-content';
    section.style.display = 'none';
    section.innerHTML = `<div class="section__header"></div><div id="admin-content"></div>`;
    mainContent.appendChild(section);
    return section;
}

async function _loadTabData(tabId) {
    nlog(`_loadTabData: "${tabId}"`);
    try {
        switch (tabId) {
            case 'dashboard':
                window.loadDashboardData?.();
                break;

            case 'personas':
                await window.loadPersons?.();
                window.renderPersonsTable?.();
                break;

            case 'documentos':
                await window.loadDocuments?.();
                window.renderDocumentsTable?.();
                break;

            case 'categorias':
                await window.loadCategories?.();
                window.renderCategories?.();
                break;

            case 'tareas':
                if (window.taskManager) {
                    await window.taskManager.loadTasks?.();
                    window.taskManager.renderTasks?.();
                }
                break;

            case 'historial':
                window.loadTabSpecificHistorial?.();
                break;

            case 'papelera':
                await window.initPapelera?.();
                break;

            case 'calendario':
                setTimeout(() => window.initializeCalendar?.() || window.initializeBasicCalendar?.(), 50);
                break;

            case 'reportes':
                window.initReportsModule?.();
                break;

            case 'soporte':
                if (!window.supportModule && window.SupportModule) {
                    window.supportModule = new window.SupportModule();
                    await window.supportModule?.init();
                } else {
                    await window.supportModule?.init();
                }
                break;

            case 'ajustes':
                if (!window.settingsManager) {
                    const mod = await import('./modules/ajustes.js');
                    window.settingsManager = mod.default;
                }
                window.settingsManager?.updateForm?.();
                break;

            case 'admin':
                (await import('./modules/admin/index.js')).renderAgregarAdministrador?.();
                break;

            case 'auditoria':
                (await import('./modules/auditoria.js')).renderAuditoria?.();
                break;

            case 'versiones':
                (await import('./modules/versiones.js')).renderVersiones?.();
                break;

            case 'chatbot':
                // Esperar un tick para que el DOM del tab esté visible
                setTimeout(() => {
                    const container = document.getElementById('ariaFullscreenContainer');
                    const aria      = window.__aria;

                    if (!container) {
                        nwarn('chatbot: #ariaFullscreenContainer no encontrado');
                        return;
                    }

                    if (aria) {
                        // Usar el método limpio
                        if (typeof aria.enterChatbotTab === 'function') {
                            aria.enterChatbotTab(container);
                        } else {
                            // Fallback para compatibilidad
                            aria.renderFullscreen?.(container);
                        }
                    } else {
                        nwarn('chatbot: window.__aria no disponible todavía');
                        // Reintentar una vez
                        setTimeout(() => {
                            const a = window.__aria;
                            if (a && container) {
                                typeof a.enterChatbotTab === 'function'
                                    ? a.enterChatbotTab(container)
                                    : a.renderFullscreen?.(container);
                            }
                        }, 500);
                    }
                }, 50);
                break;

            case 'avisos':
                setTimeout(async () => {
                    if (window.renderAvisosSection) {
                        await window.renderAvisosSection();
                    } else {
                        const mod = await import('./modules/avisos.js');
                        if (mod.renderAvisosSection) await mod.renderAvisosSection();
                    }
                }, 50);
                break;
        }
    } catch (e) {
        nerr(`_loadTabData: error en "${tabId}"`, e);
    }
}

function _setupKeyboardNavigation() {
    document.addEventListener('keydown', e => {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (!e.altKey) return;

        const visibleTabs = _getVisibleTabs();
        const currentIndex = visibleTabs.indexOf(_currentTab);

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = visibleTabs[(currentIndex + 1) % visibleTabs.length];
            if (next) switchTab(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = visibleTabs[(currentIndex - 1 + visibleTabs.length) % visibleTabs.length];
            if (prev) switchTab(prev);
        }
    });
}

function _getVisibleTabs() {
    return Array.from(_getNavLinks())
        .filter(l => l.style.display !== 'none')
        .map(l => l.getAttribute('data-tab'))
        .filter(Boolean);
}

function _updateUserInfo() {
    try {
        const user = getCurrentUser?.();
        if (!user) return;

        const nameEl = document.querySelector('.sidebar__user-name');
        const emailEl = document.getElementById('userEmail');
        const roleEl  = document.querySelector('.sidebar__user-role');

        if (nameEl)  nameEl.textContent  = user.usuario || user.name || 'Usuario';
        if (emailEl) emailEl.textContent = user.correo || user.email || '';
        if (roleEl) {
            const rol = user.rol || user.role || '';
            roleEl.textContent = rol === ROLES.ADMIN
                ? 'Administrador'
                : (rol.charAt(0).toUpperCase() + rol.slice(1));
        }
    } catch (_) {}
}

function _getNavLinks() {
    return document.querySelectorAll('.sidebar__nav-link[data-tab]');
}

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
export function getCurrentTab()    { return _currentTab; }
export function getPreviousTab()   { return _previousTab; }
export function showTab(tabId)     { canView(tabId) ? switchTab(tabId) : showNoPermissionAlert(tabId); }

export async function refreshPermissions() {
    invalidatePermissionsCache();
    await initPermissionsSystem();
    if (_currentTab !== 'dashboard' && !canView(_currentTab)) {
        await switchTab('dashboard');
    } else {
        applyActionPermissions();
    }
}

// Exponer globalmente para compatibilidad con código legacy
window.switchTab             = switchTab;
window.getCurrentTab         = getCurrentTab;
window.getPreviousTab        = getPreviousTab;
window.showTab               = showTab;
window.initializeNavigation  = initializeNavigation;
window.refreshPermissions    = refreshPermissions;

export { _loadTabData, _setupTabNavigation, _setupKeyboardNavigation };