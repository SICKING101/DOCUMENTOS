import { DOM } from '../dom.js';

// =============================================================================
// FUNCIONES DE NAVEGACIÓN
// =============================================================================

function initializeTabNavigation() {
    console.log('🔧 Inicializando navegación por pestañas...');
    
    if (!DOM.navLinks || DOM.navLinks.length === 0) {
        console.warn('⚠️ No se encontraron enlaces de navegación');
        return;
    }

    DOM.navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            handleTabClick(this);
        });
    });

    console.log('✅ Navegación por pestañas inicializada');
}

function handleTabClick(clickedLink) {
    const targetTab = clickedLink.getAttribute('data-tab');
    console.log(`📂 Cambiando a pestaña: ${targetTab}`);
    
    switchTab(targetTab);
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
        link.classList.toggle('sidebar__nav-link--active', isActive);
    });
    
    // Mostrar contenido de pestaña seleccionada
    DOM.tabContents.forEach(tab => {
        const isActive = tab.id === tabId;
        tab.classList.toggle('tab-content--active', isActive);
    });
    
    // Actualizar estado global si existe
    if (window.appState) {
        window.appState.currentTab = tabId;
    }
    
    console.log(`✅ Pestaña cambiada a: ${tabId}`);
    
    // Cargar datos específicos de la pestaña
    loadTabSpecificData(tabId);
}

function loadTabSpecificData(tabId) {
    console.log(`📥 Cargando datos para pestaña: ${tabId}`);
    
    switch(tabId) {
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
        case 'categorias':
            if (typeof window.loadCategories === 'function') {
                window.loadCategories();
            }
            break;
        case 'dashboard':
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
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

export { 
    initializeTabNavigation, 
    switchTab, 
    showTab,
    loadTabSpecificData 
};