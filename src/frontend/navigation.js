// src/frontend/navigation.js

import { DOM } from './dom.js';
import { 
    canView, 
    canAction, 
    initPermissionsSystem,
    invalidatePermissionsCache,
    applyNavigationPermissions,
    applyActionPermissions,
    ROLES
} from './permissions.js';
import { getCurrentUser } from './auth.js';

// =============================================================================
// 1. INICIALIZACIÓN DE LA NAVEGACIÓN POR PESTAÑAS
// =============================================================================

/**
 * 1.0 Obtener rol del usuario actual
 */
function getUserRole() {
    try {
        const user = getCurrentUser();
        return user?.rol || null;
    } catch (e) {
        console.error('❌ Error obteniendo rol del usuario:', e);
        return null;
    }
}

/**
 * 1.1 Inicializar navegación con permisos
 */
async function initializeTabNavigation() {
    console.log('🔧 Inicializando navegación por pestañas...');

    // Inicializar sistema de permisos
    await initPermissionsSystem();

    // Obtener enlaces de navegación
    const navLinks = document.querySelectorAll('.sidebar__nav-link[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    if (navLinks.length === 0) {
        console.error('❌ No se encontraron enlaces de navegación');
        return;
    }

    // Aplicar permisos de visibilidad a la sidebar
    applyNavigationPermissions();

    // Establecer pestaña activa inicial
    await setInitialActiveTab(navLinks);

    // Agregar event listeners a cada enlace
    navLinks.forEach(link => {
        // Solo agregar listener si el enlace es visible
        if (link.style.display !== 'none') {
            link.addEventListener('click', async function (e) {
                e.preventDefault();
                const tabId = this.getAttribute('data-tab');
                console.log('🖱️ Clic en enlace:', tabId);
                await handleTabClick(this, navLinks, tabContents);
            });
        }
    });

    console.log('✅ Navegación por pestañas inicializada');
}

// =============================================================================
// 2. INICIALIZAR ADMIN (¡PARTE CRÍTICA QUE FALTABA!)
// =============================================================================

/**
 * 2.0 Inicializar enlace de admin
 */
function initializeAdminLink() {
    const adminNavLink = document.getElementById('nav-admin');
    if (adminNavLink) {
        // Remover listeners anteriores para evitar duplicados
        adminNavLink.removeEventListener('click', handleAdminClick);
        adminNavLink.addEventListener('click', handleAdminClick);
        console.log('✅ Enlace de admin inicializado');
    }
}

/**
 * 2.1 Manejador de clic en admin
 */
function handleAdminClick(e) {
    e.preventDefault();
    console.log('🖱️ Clic en enlace de admin');
    
    // Verificar permisos
    if (!canView('admin')) {
        console.warn('⚠️ Intento de acceso a admin sin permisos');
        return;
    }
    
    // Cambiar a la pestaña admin
    switchTab('admin').then(() => {
        // Cargar el módulo de admin
        import('./modules/admin/index.js').then(module => {
            if (module.renderAgregarAdministrador) {
                module.renderAgregarAdministrador();
            }
        }).catch(err => {
            console.error('❌ Error cargando módulo admin:', err);
        });
    });
}

// =============================================================================
// 3. ESTABLECER PESTAÑA ACTIVA INICIAL
// =============================================================================

async function setInitialActiveTab(navLinks) {
    const userRole = getUserRole();
    
    // Verificar si hay una pestaña activa en el HTML
    const currentActiveLink = document.querySelector('.sidebar__nav-link--active');
    if (currentActiveLink) {
        const activeTab = currentActiveLink.getAttribute('data-tab');
        
        // Verificar que el usuario tenga permiso para esta pestaña
        if (canView(activeTab)) {
            await switchTab(activeTab, navLinks);
            return;
        }
    }
    
    // Buscar la primera pestaña visible
    for (const link of navLinks) {
        const tabId = link.getAttribute('data-tab');
        if (canView(tabId) && link.style.display !== 'none') {
            await switchTab(tabId, navLinks);
            return;
        }
    }
    
    // Si no hay ninguna visible, ir a dashboard
    if (canView('dashboard')) {
        await switchTab('dashboard', navLinks);
    }
}

// =============================================================================
// 4. MANEJO DE PESTAÑAS
// =============================================================================

async function handleTabClick(clickedLink, navLinks, tabContents) {
    const targetTab = clickedLink.getAttribute('data-tab');
    
    // Verificar permisos antes de cambiar
    if (!canView(targetTab)) {
        console.warn(`⚠️ Intento de acceso a pestaña sin permisos: ${targetTab}`);
        return;
    }
    
    await switchTab(targetTab, navLinks, tabContents);
}

export async function switchTab(tabId, navLinksParam = null, tabContentsParam = null) {
    console.log(`🔄 Cambiando a pestaña: "${tabId}"`);

    // Verificar permisos
    if (!canView(tabId)) {
        console.error(`❌ No tienes permisos para acceder a "${tabId}"`);
        return;
    }

    // Obtener referencias
    const navLinks = navLinksParam || document.querySelectorAll('.sidebar__nav-link[data-tab]');
    const tabContents = tabContentsParam || document.querySelectorAll('.tab-content');

    // Validar que la pestaña existe
    if (!document.getElementById(tabId) && tabId !== 'admin') {
        console.error(`❌ Pestaña "${tabId}" no encontrada`);
        return;
    }

    // Remover clase activa de todos los enlaces
    navLinks.forEach(link => {
        link.classList.remove('sidebar__nav-link--active');
    });

    // Agregar clase activa al enlace seleccionado
    const activeLink = Array.from(navLinks).find(
        link => link.getAttribute('data-tab') === tabId
    );

    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
    }

    // Ocultar todos los contenidos
    tabContents.forEach(tab => {
        tab.classList.remove('tab-content--active');
        tab.style.display = 'none';
    });

    // Mostrar el contenido seleccionado
    let activeTab = document.getElementById(tabId);
    
    // Si es admin y no existe, crearlo dinámicamente
    if (!activeTab && tabId === 'admin') {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            activeTab = document.createElement('section');
            activeTab.id = 'admin';
            activeTab.className = 'tab-content';
            activeTab.style.display = 'block';
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
            console.log('✅ Contenido Admin creado dinámicamente');
        }
    }

    if (activeTab) {
        activeTab.classList.add('tab-content--active');
        activeTab.style.display = 'block';
    }

    // Actualizar estado global
    if (window.appState) window.appState.currentTab = tabId;

    // Cargar datos específicos de la pestaña
    await loadTabSpecificData(tabId);
    
    // Aplicar permisos de acción en la nueva pestaña
    setTimeout(() => {
        applyActionPermissions();
    }, 100);
}

// =============================================================================
// 5. CARGA DE DATOS ESPECÍFICOS POR PESTAÑA
// =============================================================================

async function loadTabSpecificData(tabId) {
    console.log(`📥 Cargando datos para pestaña: ${tabId}`);

    switch (tabId) {
        case 'dashboard':
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
            }
            break;
            
        case 'personas':
            if (typeof window.loadPersons === 'function') {
                window.loadPersons();
            }
            break;
            
        case 'documentos':
            if (typeof window.loadDocuments === 'function') {
                window.loadDocuments();
            }
            break;
            
        case 'tareas':
            if (window.taskManager) {
                window.taskManager.renderTasks();
                window.taskManager.updateSummary();
            }
            break;
            
        case 'historial':
            if (typeof window.loadHistory === 'function') {
                window.loadHistory();
            }
            break;
            
        case 'calendario':
            setTimeout(() => {
                if (typeof window.initializeBasicCalendar === 'function') {
                    window.initializeBasicCalendar();
                }
            }, 50);
            break;
            
        case 'papelera':
            if (typeof window.loadTrash === 'function') {
                window.loadTrash();
            }
            break;
            
        case 'ajustes':
            console.log('⚙️ Sección de ajustes');
            break;
            
        case 'reportes':
            console.log('📊 Sección de reportes');
            break;
            
        case 'soporte':
            console.log('🛟 Sección de soporte');
            break;
            
        case 'admin':
            // Admin ya se carga en el manejador de clic
            console.log('👑 Cargando módulo admin...');
            try {
                const module = await import('./modules/admin/index.js');
                if (module.renderAgregarAdministrador) {
                    module.renderAgregarAdministrador();
                }
            } catch (err) {
                console.error('❌ Error cargando admin:', err);
            }
            break;
            
        case 'auditoria':
            console.log('📋 Cargando módulo de auditoría...');
            try {
                const module = await import('./modules/auditoria.js');
                if (module.renderAuditoria) {
                    module.renderAuditoria();
                }
            } catch (err) {
                console.error('❌ Error cargando auditoría:', err);
            }
            break;
            
        default:
            console.log(`ℹ️ No hay datos específicos para: ${tabId}`);
    }
}

// =============================================================================
// 6. FUNCIONES DE UTILIDAD
// =============================================================================

export function getCurrentTab() {
    const activeLink = document.querySelector('.sidebar__nav-link--active');
    return activeLink ? activeLink.getAttribute('data-tab') : 'dashboard';
}

export function showTab(tabId) {
    if (canView(tabId)) {
        switchTab(tabId);
    }
}

// =============================================================================
// 7. NAVEGACIÓN POR TECLADO
// =============================================================================

function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const currentTab = getCurrentTab();
        
        // Obtener tabs visibles
        const visibleTabs = Array.from(document.querySelectorAll('.sidebar__nav-link[data-tab]'))
            .filter(link => link.style.display !== 'none')
            .map(link => link.getAttribute('data-tab'));

        const currentIndex = visibleTabs.indexOf(currentTab);

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % visibleTabs.length;
                if (visibleTabs[nextIndex]) {
                    switchTab(visibleTabs[nextIndex]);
                }
                break;
                
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
                if (visibleTabs[prevIndex]) {
                    switchTab(visibleTabs[prevIndex]);
                }
                break;
        }
    });
}

// =============================================================================
// 8. ACTUALIZAR INFORMACIÓN DEL USUARIO EN SIDEBAR
// =============================================================================

function updateUserInfo() {
    try {
        const user = getCurrentUser();
        if (!user) return;

        const userNameElement = document.querySelector('.sidebar__user-name');
        const userRoleElement = document.querySelector('.sidebar__user-role');
        const userEmailElement = document.getElementById('userEmail');

        if (userNameElement) {
            userNameElement.textContent = user.usuario || 'Usuario';
        }

        if (userRoleElement) {
            const roleName = user.rol === ROLES.ADMIN ? 'Administrador' : user.rol;
            userRoleElement.textContent = roleName;
        }

        if (userEmailElement) {
            userEmailElement.textContent = user.correo || '';
        }
    } catch (e) {
        console.error('Error actualizando info de usuario:', e);
    }
}

// =============================================================================
// 9. ACTUALIZAR PERMISOS EN TIEMPO REAL
// =============================================================================

export async function refreshPermissions() {
    console.log('🔄 Actualizando permisos...');
    
    invalidatePermissionsCache();
    await initPermissionsSystem();
    applyNavigationPermissions();
    applyActionPermissions();
    
    const currentTab = getCurrentTab();
    if (!canView(currentTab) && currentTab !== 'dashboard') {
        const navLinks = document.querySelectorAll('.sidebar__nav-link[data-tab]');
        for (const link of navLinks) {
            const tabId = link.getAttribute('data-tab');
            if (canView(tabId) && link.style.display !== 'none') {
                await switchTab(tabId);
                break;
            }
        }
    }
    
    console.log('✅ Permisos actualizados');
}

// =============================================================================
// 10. INICIALIZACIÓN COMPLETA
// =============================================================================

export async function initializeNavigation() {
    console.log('🚀 Iniciando sistema de navegación...');

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            await initializeTabNavigation();
            initializeAdminLink(); // ← INICIALIZAR ADMIN AQUÍ
            initializeKeyboardNavigation();
            updateUserInfo();
        });
    } else {
        await initializeTabNavigation();
        initializeAdminLink(); // ← Y TAMBIÉN AQUÍ
        initializeKeyboardNavigation();
        updateUserInfo();
    }

    console.log('✅ Sistema de navegación inicializado');
}

// =============================================================================
// 11. EXPORTACIONES
// =============================================================================

export {
    initializeTabNavigation,
    loadTabSpecificData,
    initializeKeyboardNavigation
};

// Hacer funciones disponibles globalmente
window.showTab = showTab;
window.getCurrentTab = getCurrentTab;
window.switchTab = switchTab;
window.initializeNavigation = initializeNavigation;
window.refreshPermissions = refreshPermissions;

console.log('📦 Módulo navigation.js cargado');