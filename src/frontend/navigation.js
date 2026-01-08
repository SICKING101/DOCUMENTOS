import { DOM } from '../dom.js';

// =============================================================================
// 1. INICIALIZACIÓN DE LA NAVEGACIÓN POR PESTAÑAS - VERSIÓN DEBUG
// =============================================================================

/**
 * 1.1 Inicializar navegación por pestañas - VERSIÓN DEBUG
 */
function initializeTabNavigation() {
    console.log('🔧 DEBUG: Inicializando navegación por pestañas...');
    
    // Obtener TODOS los enlaces de navegación del sidebar (incluyendo posibles duplicados)
    const allNavLinks = document.querySelectorAll('.sidebar__nav-link');
    const navLinksWithDataTab = document.querySelectorAll('.sidebar__nav-link[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    
    console.log('📌 DEBUG: Todos los enlaces sidebar__nav-link:', allNavLinks.length);
    console.log('📌 DEBUG: Enlaces con data-tab:', navLinksWithDataTab.length);
    console.log('📌 DEBUG: Contenidos tab-content:', tabContents.length);
    
    // Mostrar cada enlace con data-tab
    console.log('🔗 DEBUG: Enlaces encontrados:');
    navLinksWithDataTab.forEach((link, index) => {
        const tab = link.getAttribute('data-tab');
        const text = link.querySelector('.sidebar__nav-text')?.textContent || 'Sin texto';
        console.log(`  ${index + 1}. data-tab="${tab}" - Texto: "${text}"`);
    });
    
    // Mostrar cada tab-content
    console.log('📄 DEBUG: Secciones encontradas:');
    tabContents.forEach((tab, index) => {
        console.log(`  ${index + 1}. id="${tab.id}"`);
    });

    if (navLinksWithDataTab.length === 0) {
        console.error('❌ ERROR: No se encontraron enlaces de navegación con data-tab');
        console.log('📝 INFO: Revisando si hay enlaces sin data-tab...');
        allNavLinks.forEach((link, index) => {
            console.log(`  ${index + 1}. Clases: "${link.className}" - data-tab: "${link.getAttribute('data-tab')}"`);
        });
        return;
    }

    if (tabContents.length === 0) {
        console.error('❌ ERROR: No se encontraron contenidos de pestañas');
        return;
    }

    // Establecer pestaña activa inicial
    setInitialActiveTab(navLinksWithDataTab);

    // Agregar event listeners a cada enlace
    navLinksWithDataTab.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            console.log('🖱️ DEBUG: Clic en enlace:', tabId);
            console.log('ℹ️ DEBUG: Elemento clickeado:', this);
            handleTabClick(this, navLinksWithDataTab, tabContents);
        });
    });

    console.log('✅ DEBUG: Navegación por pestañas inicializada');
}

/**
 * 1.2 Establecer pestaña activa inicial
 */
function setInitialActiveTab(navLinks) {
    console.log('🎯 DEBUG: Configurando pestaña activa inicial...');
    
    // Verificar si hay una pestaña activa en el HTML
    const currentActiveLink = document.querySelector('.sidebar__nav-link--active');
    if (currentActiveLink) {
        const activeTab = currentActiveLink.getAttribute('data-tab');
        console.log('📌 DEBUG: Pestaña activa encontrada en HTML:', activeTab);
        switchTab(activeTab, navLinks);
    } else {
        // Si no hay activa, usar dashboard por defecto
        console.log('📌 DEBUG: No hay pestaña activa, usando dashboard por defecto');
        switchTab('dashboard', navLinks);
    }
}

// =============================================================================
// 2. VALIDACIÓN Y MANEJO DE PESTAÑAS - VERSIÓN DEBUG
// =============================================================================

/**
 * 2.1 Validar identificador de pestaña - VERSIÓN DEBUG
 */
function isValidTab(tabId) {
    console.log(`🔍 DEBUG: Validando tabId: "${tabId}"`);
    
    if (!tabId || tabId.trim() === '') {
        console.error('❌ ERROR: tabId está vacío o es undefined');
        return false;
    }
    
    // Obtener todas las pestañas existentes en el HTML
    const allTabs = Array.from(document.querySelectorAll('.tab-content')).map(tab => tab.id);
    console.log('📋 DEBUG: IDs de tab-content encontrados:', allTabs);
    
    const isValid = allTabs.includes(tabId);
    
    if (isValid) {
        console.log(`✅ DEBUG: "${tabId}" es una pestaña válida`);
    } else {
        console.error(`❌ ERROR: "${tabId}" NO es una pestaña válida`);
        console.log('💡 SUGERENCIA: Verifica que:');
        console.log('   1. Exista un elemento con id="' + tabId + '"');
        console.log('   2. El elemento tenga la clase "tab-content"');
        console.log('   3. No haya errores de ortografía (calendario vs calendario)');
        
        // Verificar si hay algún elemento con ese ID (aunque no tenga la clase correcta)
        const elementWithId = document.getElementById(tabId);
        if (elementWithId) {
            console.log(`ℹ️ INFO: Existe elemento con id="${tabId}" pero no tiene clase "tab-content"`);
            console.log('   Clases del elemento:', elementWithId.className);
        } else {
            console.log(`ℹ️ INFO: NO existe ningún elemento con id="${tabId}"`);
        }
    }
    
    return isValid;
}

/**
 * 2.2 Manejar clic en enlace de pestaña
 */
function handleTabClick(clickedLink, navLinks, tabContents) {
    const targetTab = clickedLink.getAttribute('data-tab');
    console.log(`📂 DEBUG: Cambiando a pestaña: "${targetTab}"`);
    
    switchTab(targetTab, navLinks, tabContents);
}

/**
 * 2.3 Cambiar a pestaña específica - VERSIÓN DEBUG
 */
function switchTab(tabId, navLinksParam = null, tabContentsParam = null) {
    console.log(`🔄 DEBUG: Iniciando switchTab para: "${tabId}"`);
    
    // Obtener referencias si no se proporcionaron
    const navLinks = navLinksParam || document.querySelectorAll('.sidebar__nav-link[data-tab]');
    const tabContents = tabContentsParam || document.querySelectorAll('.tab-content');
    
    // Validar tabId
    if (!isValidTab(tabId)) {
        console.error(`❌ ERROR CRÍTICO: No se puede cambiar a pestaña "${tabId}" porque no es válida`);
        
        // Mostrar qué pestañas SÍ son válidas
        const validTabs = Array.from(tabContents).map(tab => tab.id);
        console.log('📋 Pestañas válidas disponibles:', validTabs);
        
        // Mostrar qué enlaces hay en el sidebar
        console.log('🔗 Enlaces en el sidebar:');
        navLinks.forEach(link => {
            console.log(`   - data-tab="${link.getAttribute('data-tab')}"`);
        });
        
        return;
    }
    
    console.log(`🔄 DEBUG: Procediendo con cambio a "${tabId}"...`);
    
    // 1. Remover clase activa de TODOS los enlaces de navegación
    console.log('➖ DEBUG: Removiendo clase activa de todos los enlaces...');
    navLinks.forEach(link => {
        const currentTab = link.getAttribute('data-tab');
        link.classList.remove('sidebar__nav-link--active');
        console.log(`   - Removido de: ${currentTab}`);
    });
    
    // 2. Agregar clase activa SOLO al enlace seleccionado
    console.log(`➕ DEBUG: Buscando enlace con data-tab="${tabId}"...`);
    const activeLink = Array.from(navLinks).find(
        link => link.getAttribute('data-tab') === tabId
    );
    
    if (activeLink) {
        activeLink.classList.add('sidebar__nav-link--active');
        console.log(`✅ DEBUG: Agregado activo a enlace: ${tabId}`);
    } else {
        console.error(`❌ ERROR: No se encontró enlace con data-tab="${tabId}"`);
        console.log('📋 Enlaces disponibles:');
        navLinks.forEach(link => {
            console.log(`   - "${link.getAttribute('data-tab')}"`);
        });
        return;
    }
    
    // 3. Ocultar TODOS los contenidos de pestañas
    console.log('👁️ DEBUG: Ocultando todas las pestañas...');
    tabContents.forEach(tab => {
        tab.classList.remove('tab-content--active');
        tab.style.display = 'none';
        console.log(`   - Ocultado: ${tab.id}`);
    });
    
    // 4. Mostrar SOLO el contenido de la pestaña seleccionada
    console.log(`👁️ DEBUG: Mostrando pestaña con id="${tabId}"...`);
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('tab-content--active');
        activeTab.style.display = 'block';
        console.log(`✅ DEBUG: Mostrada pestaña: ${tabId}`);
        
        // Verificar que realmente se esté mostrando
        console.log(`📏 DEBUG: Estilo display de ${tabId}:`, activeTab.style.display);
        console.log(`🎨 DEBUG: Clases de ${tabId}:`, activeTab.className);
    } else {
        console.error(`❌ ERROR: No se encontró elemento con id="${tabId}"`);
        // Esto no debería pasar porque isValidTab ya validó que existe
        return;
    }
    
    // 5. Actualizar estado global si existe
    if (window.appState) {
        window.appState.currentTab = tabId;
        console.log(`📝 DEBUG: Estado actualizado: ${tabId}`);
    }
    
    console.log(`🎯 DEBUG: Pestaña cambiada exitosamente a: ${tabId}`);
    
    // 6. Cargar datos específicos de la pestaña
    loadTabSpecificData(tabId);
}

// =============================================================================
// 3. CARGA DE DATOS ESPECÍFICOS POR PESTAÑA
// =============================================================================

/**
 * 3.1 Cargar datos específicos de pestaña
 */
function loadTabSpecificData(tabId) {
    console.log(`📥 DEBUG: Cargando datos para pestaña: ${tabId}`);
    
    switch(tabId) {
        case 'personas':
            console.log('👥 DEBUG: Cargando datos de personas...');
            if (typeof window.loadPersons === 'function') {
                window.loadPersons();
            } else {
                console.warn('⚠️ WARN: loadPersons no está disponible');
            }
            break;
        case 'documentos':
            console.log('📄 DEBUG: Cargando documentos...');
            if (typeof window.loadDocuments === 'function') {
                window.loadDocuments();
            } else {
                console.warn('⚠️ WARN: loadDocuments no está disponible');
            }
            break;
        case 'tareas':
            console.log('✅ DEBUG: Cargando tareas...');
            if (typeof window.taskManager !== 'undefined' && window.taskManager) {
                console.log('🔄 Actualizando vista de tareas...');
                window.taskManager.renderTasks();
                window.taskManager.updateSummary();
            } else {
                console.warn('⚠️ WARN: taskManager no está disponible');
            }
            break;
        case 'dashboard':
            console.log('📊 DEBUG: Cargando dashboard...');
            if (typeof window.loadDashboardData === 'function') {
                window.loadDashboardData();
            } else {
                console.warn('⚠️ WARN: loadDashboardData no está disponible');
            }
            break;
        case 'calendario':
            console.log('📅 DEBUG: Inicializando sección de calendario...');
            // Dar un pequeño retraso para asegurar que el DOM esté listo
            setTimeout(() => {
                console.log('⏰ DEBUG: Inicializando calendario básico...');
                if (typeof initializeBasicCalendar === 'function') {
                    initializeBasicCalendar();
                } else {
                    console.error('❌ ERROR: initializeBasicCalendar no está definida');
                    console.log('💡 SUGERENCIA: Asegúrate de que la función está definida y exportada');
                }
            }, 50);
            break;
        case 'historial':
            console.log('📜 DEBUG: Cargando historial...');
            if (typeof window.loadHistory === 'function') {
                window.loadHistory();
            } else {
                console.warn('⚠️ WARN: loadHistory no está disponible');
            }
            break;
        case 'ajustes':
            console.log('⚙️ DEBUG: Sección de ajustes - Sin carga específica');
            break;
        case 'reportes':
            console.log('📈 DEBUG: Sección de reportes - Sin carga específica');
            break;
        case 'soporte':
            console.log('🛟 DEBUG: Sección de soporte - Sin carga específica');
            break;
        default:
            console.log(`ℹ️ INFO: No hay datos específicos para la pestaña: ${tabId}`);
    }
}

// =============================================================================
// 4. FUNCIONES GLOBALES DE NAVEGACIÓN
// =============================================================================

/**
 * 4.1 Mostrar pestaña (función global)
 */
function showTab(tabId) {
    console.log(`🔍 DEBUG: showTab() llamado con: ${tabId}`);
    switchTab(tabId);
}

/**
 * 4.2 Obtener pestaña actual activa
 */
function getCurrentTab() {
    const activeLink = document.querySelector('.sidebar__nav-link--active');
    const currentTab = activeLink ? activeLink.getAttribute('data-tab') : 'dashboard';
    console.log(`🔍 DEBUG: getCurrentTab() retorna: ${currentTab}`);
    return currentTab;
}

// =============================================================================
// 5. NAVEGACIÓN POR TECLADO
// =============================================================================

/**
 * 5.1 Inicializar navegación por teclado
 */
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        const currentTab = getCurrentTab();
        const tabs = Array.from(document.querySelectorAll('.sidebar__nav-link[data-tab]'))
            .map(link => link.getAttribute('data-tab'));
        
        console.log(`⌨️ DEBUG: Tecla presionada: ${e.key}, Pestaña actual: ${currentTab}`);
        
        const currentIndex = tabs.indexOf(currentTab);

        switch(e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % tabs.length;
                if (tabs[nextIndex]) {
                    console.log(`➡️ DEBUG: Navegando a pestaña: ${tabs[nextIndex]}`);
                    switchTab(tabs[nextIndex]);
                }
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                if (tabs[prevIndex]) {
                    console.log(`⬅️ DEBUG: Navegando a pestaña: ${tabs[prevIndex]}`);
                    switchTab(tabs[prevIndex]);
                }
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
                switchTab('tareas');
                break;
            case '5':
                e.preventDefault();
                switchTab('historial');
                break;
            case '6':
                e.preventDefault();
                switchTab('calendario');
                break;
        }
    });
}

// =============================================================================
// 6. ACTUALIZACIÓN DE CONTADORES Y ESTADOS
// =============================================================================

/**
 * 6.1 Actualizar contadores de navegación
 */
function updateNavigationCounters() {
    console.log('🔢 DEBUG: Actualizando contadores de navegación...');
    // Implementar según necesites
}

// =============================================================================
// 8. INICIALIZACIÓN COMPLETA DEL SISTEMA DE NAVEGACIÓN
// =============================================================================

/**
 * 8.1 Inicializar toda la navegación
 */
function initializeNavigation() {
    console.log('🚀 DEBUG: Iniciando sistema de navegación completo...');
    
    // Esperar un momento para asegurar que el DOM esté listo
    if (document.readyState === 'loading') {
        console.log('⏳ DEBUG: DOM todavía cargando, esperando...');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('✅ DEBUG: DOM completamente cargado');
            initializeTabNavigation();
            initializeKeyboardNavigation();
        });
    } else {
        console.log('✅ DEBUG: DOM ya está cargado');
        initializeTabNavigation();
        initializeKeyboardNavigation();
    }
    
    // Actualizar contadores
    setInterval(updateNavigationCounters, 30000);
    
    console.log('✅ DEBUG: Sistema de navegación inicializado');
}

// Exportar todas las funciones
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

// Hacer funciones disponibles globalmente para debugging
window.showTab = showTab;
window.getCurrentTab = getCurrentTab;
window.switchTab = switchTab;
window.initializeBasicCalendar = initializeBasicCalendar;
window.initializeNavigation = initializeNavigation;

console.log('📦 DEBUG: Módulo navigation.js cargado correctamente');