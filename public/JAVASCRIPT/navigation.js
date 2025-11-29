import { DOM } from '../dom.js';

// =============================================================================
// FUNCIONES DE NAVEGACIÓN
// =============================================================================

function initializeTabNavigation() {
    console.log('🔧 Inicializando navegación por pestañas...');
    
    // DEBUG: Verificar qué elementos se están seleccionando
    console.log('📌 Enlaces de navegación encontrados:', DOM.navLinks?.length);
    console.log('📌 Contenidos de pestañas encontrados:', DOM.tabContents?.length);
    
    if (!DOM.navLinks || DOM.navLinks.length === 0) {
        console.error('❌ No se encontraron enlaces de navegación');
        return;
    }

    if (!DOM.tabContents || DOM.tabContents.length === 0) {
        console.error('❌ No se encontraron contenidos de pestañas');
        return;
    }

    // DEBUG: Mostrar los enlaces y contenidos encontrados
    DOM.navLinks.forEach(link => {
        console.log('🔗 Enlace:', link.getAttribute('data-tab'));
    });
    
    DOM.tabContents.forEach(tab => {
        console.log('📄 Contenido:', tab.id);
    });

    // Establecer pestaña activa inicial
    setInitialActiveTab();

    // Agregar event listeners a cada enlace
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🖱️ Clic en enlace:', this.getAttribute('data-tab'));
            handleTabClick(this);
        });
    });

    console.log('✅ Navegación por pestañas inicializada');
}

function setInitialActiveTab() {
    console.log('🎯 Configurando pestaña activa inicial...');
    
    // Verificar si hay una pestaña activa en el HTML
    const currentActiveLink = document.querySelector('.sidebar__nav-link--active');
    if (currentActiveLink) {
        const activeTab = currentActiveLink.getAttribute('data-tab');
        console.log('📌 Pestaña activa encontrada en HTML:', activeTab);
        switchTab(activeTab);
    } else {
        // Si no hay activa, usar dashboard por defecto
        console.log('📌 No hay pestaña activa, usando dashboard por defecto');
        switchTab('dashboard');
    }
}

function isValidTab(tabId) {
    const validTabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas'];
    return validTabs.includes(tabId);
}

function handleTabClick(clickedLink) {
    const targetTab = clickedLink.getAttribute('data-tab');
    console.log(`📂 Cambiando a pestaña: ${targetTab}`);
    
    switchTab(targetTab);
}

function switchTab(tabId) {
    // Validar tabId
    if (!isValidTab(tabId)) {
        console.error('❌ Pestaña no válida:', tabId);
        return;
    }
    
    console.log(`🔄 Cambiando a pestaña: ${tabId}`);
    
    // 1. Remover clase activa de TODOS los enlaces de navegación
    DOM.navLinks.forEach(link => {
        link.classList.remove('sidebar__nav-link--active');
        console.log(`➖ Removido activo de: ${link.getAttribute('data-tab')}`);
    });
    
    // 2. Agregar clase activa SOLO al enlace seleccionado
    const activeLink = Array.from(DOM.navLinks).find(
        link => link.getAttribute('data-tab') === tabId
    );
    
    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
        console.log(`✅ Agregado activo a: ${tabId}`);
    } else {
        console.error(`❌ No se encontró enlace para la pestaña: ${tabId}`);
        return;
    }
    
    // 3. Ocultar TODOS los contenidos de pestañas
    DOM.tabContents.forEach(tab => {
        tab.classList.remove('tab-content--active');
        console.log(`➖ Ocultado: ${tab.id}`);
    });
    
    // 4. Mostrar SOLO el contenido de la pestaña seleccionada
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('tab-content--active');
        console.log(`✅ Mostrado: ${tabId}`);
    } else {
        console.error(`❌ No se encontró contenido para la pestaña: ${tabId}`);
        return;
    }
    
    // 5. Actualizar estado global si existe
    if (window.appState) {
        window.appState.currentTab = tabId;
        console.log(`📝 Estado actualizado: ${tabId}`);
    }
    
    console.log(`🎯 Pestaña cambiada exitosamente a: ${tabId}`);
    
    // 6. Cargar datos específicos de la pestaña
    loadTabSpecificData(tabId);
}

function loadTabSpecificData(tabId) {
    console.log(`📥 Cargando datos para pestaña: ${tabId}`);
    
    switch(tabId) {
        case 'personas':
            if (typeof window.loadPersons === 'function') {
                window.loadPersons();
            } else {
                console.warn('⚠️ loadPersons no está disponible');
            }
            break;
        case 'documentos':
            if (typeof window.loadDocuments === 'function') {
                window.loadDocuments();
            } else {
                console.warn('⚠️ loadDocuments no está disponible');
            }
            break;
        case 'categorias':
            if (typeof window.loadCategories === 'function') {
                window.loadCategories();
            } else {
                console.warn('⚠️ loadCategories no está disponible');
            }
            break;
        case 'tareas':
            if (typeof window.taskManager !== 'undefined' && window.taskManager) {
                console.log('🔄 Actualizando vista de tareas...');
                window.taskManager.renderTasks();
                window.taskManager.updateSummary();
            } else {
                console.warn('⚠️ taskManager no está disponible');
            }
            break;
        case 'dashboard':
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
            } else {
                console.warn('⚠️ loadDashboardData no está disponible');
            }
            break;
        default:
            console.log(`ℹ️  No hay datos específicos para la pestaña: ${tabId}`);
    }
}

// Función global para mostrar pestañas desde otros lugares
function showTab(tabId) {
    console.log(`🔍 Mostrando pestaña desde función global: ${tabId}`);
    switchTab(tabId);
}

// Función para obtener la pestaña actual activa
function getCurrentTab() {
    const activeLink = document.querySelector('.sidebar__nav-link--active');
    return activeLink ? activeLink.getAttribute('data-tab') : 'dashboard';
}

// Función para inicializar navegación por teclado
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Solo activar si no estamos en un campo de entrada
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        const currentTab = getCurrentTab();
        const tabs = ['dashboard', 'personas', 'documentos', 'categorias', 'tareas'];
        const currentIndex = tabs.indexOf(currentTab);

        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % tabs.length;
                switchTab(tabs[nextIndex]);
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                switchTab(tabs[prevIndex]);
                break;
            case '1':
                e.preventDefault();
                switchTab('dashboard');
                break;
            case '2':
                e.preventDefault();
                switchTab('personas');
                break;
            case '3':
                e.preventDefault();
                switchTab('documentos');
                break;
            case '4':
                e.preventDefault();
                switchTab('categorias');
                break;
            case '5':
                e.preventDefault();
                switchTab('tareas');
                break;
        }
    });
}

// Función para actualizar contadores en la navegación
function updateNavigationCounters() {
    // Actualizar contador de tareas pendientes si existe
    if (window.taskManager) {
        const pendingTasks = window.taskManager.tasks.filter(task => 
            task.status === 'pendiente'
        ).length;
        
        const tasksNavLink = document.querySelector('[data-tab="tareas"]');
        if (tasksNavLink) {
            // Remover contador existente
            const existingBadge = tasksNavLink.querySelector('.nav-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Agregar nuevo contador si hay tareas pendientes
            if (pendingTasks > 0) {
                const badge = document.createElement('span');
                badge.className = 'nav-badge';
                badge.textContent = pendingTasks;
                tasksNavLink.appendChild(badge);
            }
        }
    }
}

// Inicializar toda la navegación
function initializeNavigation() {
    initializeTabNavigation();
    initializeKeyboardNavigation();
    
    // Actualizar contadores periódicamente
    setInterval(updateNavigationCounters, 30000); // Cada 30 segundos
}

export { 
    initializeTabNavigation, 
    switchTab, 
    showTab,
    loadTabSpecificData,
    getCurrentTab,
    initializeKeyboardNavigation,
    updateNavigationCounters,
    initializeNavigation
};