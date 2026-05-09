import { DOM } from '../dom.js';
import { api } from '../services/api.js';  // CAMBIADO: importar 'api' en lugar de 'apiCall'
import { setLoadingState, showAlert, getFileIcon, formatDate } from '../utils.js';
import { showFloatingNotification } from './personas.js';  // CAMBIADO: importar showFloatingNotification
import { canAction, loadCurrentPermissions } from '../permissions.js';
import { ReactiveAPIHooks } from '/src/frontend/api/reactiveHooks.js';
import { reactiveState } from '/src/frontend/state/reactiveState.js';
import { emit, eventBus } from '/src/frontend/events/eventBus.js';

// =============================================================================
// 1. CARGA DE DATOS DEL DASHBOARD
// =============================================================================

/**
 * 1.1 Cargar datos principales del dashboard
 * Obtiene estadísticas y documentos recientes desde la API para mostrar
 * en el panel principal de la aplicación.
 */
async function loadDashboardData(appState) {
    if (appState && appState.isLoading) return;
    
    try {
        setLoadingState(true);
        console.log('📊 Cargando datos del dashboard...');

        // Asegurar cache de permisos antes de renderizar controles
        try {
            await loadCurrentPermissions();
        } catch (e) {
            console.warn('⚠️ No se pudieron cargar permisos antes del dashboard:', e?.message || e);
        }
        
        const data = await api.getDashboardData();  // CAMBIADO: usar api.getDashboardData()
        
        if (data.success) {
            if (appState) {
                appState.dashboardStats = data.stats;
            }
            
            // ✨ NUEVO: Emitir evento reactivo para actualización automática
            ReactiveAPIHooks.afterDashboardStatsUpdated(data.stats);
            
            updateDashboardStats(appState);
            loadRecentDocuments(data.recent_documents || [], appState);
            console.log('✅ Dashboard actualizado correctamente');
            
            // ACTUALIZACIÓN INMEDIATA: Cargar tareas también
            await updateDashboardTasks();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando dashboard:', error);
        showAlert('Error al cargar el dashboard: ' + error.message, 'error');
    } finally {
        setLoadingState(false);
    }
}

// =============================================================================
// 2. ACTUALIZACIÓN DE ESTADÍSTICAS
// =============================================================================

/**
 * 2.1 Actualizar tarjetas de estadísticas en la UI
 * Muestra los valores numéricos de las métricas principales en las tarjetas
 * del dashboard (personas, documentos, vencimientos, categorías).
 */
function updateDashboardStats(appState) {
    if (!appState || !appState.dashboardStats) return;
    
    if (DOM.statsCards.totalPersonas) DOM.statsCards.totalPersonas.textContent = appState.dashboardStats.totalPersonas;
    if (DOM.statsCards.totalDocumentos) DOM.statsCards.totalDocumentos.textContent = appState.dashboardStats.totalDocumentos;
    if (DOM.statsCards.proximosVencer) DOM.statsCards.proximosVencer.textContent = appState.dashboardStats.proximosVencer;
    if (DOM.statsCards.totalCategorias) DOM.statsCards.totalCategorias.textContent = appState.dashboardStats.totalCategorias;
}

// =============================================================================
// 3. MANEJO DE DOCUMENTOS RECIENTES
// =============================================================================

/**
 * 3.1 Cargar y mostrar documentos recientes
 * Renderiza la lista de documentos más recientes en el dashboard,
 * con opciones para vista previa y descarga.
 */
function loadRecentDocuments(recentDocuments = [], appState) {
    if (!DOM.recentDocuments) return;

    const canDocumentActions = canAction('documentos');
    
    const docsToShow = recentDocuments.length > 0 ? recentDocuments : (appState && appState.documents ? appState.documents.slice(0, 5) : []);
    
    DOM.recentDocuments.innerHTML = '';
    
    if (docsToShow.length === 0) {
        DOM.recentDocuments.innerHTML = `
            <article class="empty-state">
                <i class="fas fa-file-alt empty-state__icon"></i>
                <h3 class="empty-state__title">No hay documentos recientes</h3>
                <p class="empty-state__description">Sube tu primer documento para comenzar</p>
                ${canDocumentActions ? `
                  <button class="btn btn--primary" id="addFirstDocument">
                      <i class="fas fa-plus"></i> Subir Documento
                  </button>
                ` : ''}
            </article>
        `;
        // Re-attach event listener
        if (canDocumentActions) {
            document.getElementById('addFirstDocument')?.addEventListener('click', () => {
                if (typeof window.openDocumentModal === 'function') {
                    window.openDocumentModal();
                }
            });
        }
        return;
    }
    
    docsToShow.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        
        const documentItem = document.createElement('article');
        documentItem.className = 'documents__item';
        
        documentItem.innerHTML = `
            <div class="documents__info">
                <div class="documents__icon">
                    <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
                </div>
                <div class="documents__details">
                    <h4 class="documents__details-name">${doc.nombre_original}</h4>
                    <p class="documents__details-meta">Subido por: ${person.nombre} • ${formatDate(doc.fecha_subida)}</p>
                    ${doc.descripcion ? `<p class="documents__details-description">${doc.descripcion}</p>` : ''}
                </div>
            </div>
            ${canDocumentActions ? `
              <div class="documents__actions">
                  <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                      <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                      <i class="fas fa-download"></i>
                  </button>
              </div>
            ` : ''}
        `;
        
        DOM.recentDocuments.appendChild(documentItem);
    });
}

// =============================================================================
// 4. HANDLERS/CONTROLADORES
// =============================================================================

/**
 * 4.1 Handler para refrescar el dashboard
 * Función para ser llamada desde botones de actualización que recarga
 * todos los datos del panel principal con preloader mejorado.
 */
/**
 * 4.1 Handler para refrescar el dashboard
 * ⚠️ DEPRECADO: Ahora el dashboard se actualiza automáticamente
 * Se mantiene por compatibilidad retroactiva
 */
async function handleRefreshDashboard(appState) {
    console.log('🔄 Actualizando dashboard... (función legacy, uso automático recomendado)');
    
    try {
        // Simplemente llamar loadDashboardData
        // Los cambios se emitirán automáticamente y la UI se actualizará
        await loadDashboardData(appState);
        
        showFloatingNotification('Dashboard actualizado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error actualizando dashboard:', error);
        showAlert('Error al actualizar dashboard: ' + error.message, 'error');
    }
}

// =============================================================================
// 5. FUNCIONES PARA TAREAS EN DASHBOARD
// =============================================================================

// Variable global para manejar actualizaciones en tiempo real
window.dashboardTasks = {
    needsRefresh: false,
    lastUpdate: null
};

/**
 * 5.1 Cargar tareas de alta prioridad
 * Obtiene y muestra las tareas con prioridad alta o crítica en el dashboard
 * SOLO tareas en estado "pendiente" o "en-progreso"
 */
async function loadHighPriorityTasks() {
    try {
        console.group('🔍 DEBUG: loadHighPriorityTasks');
        console.log('📡 Llamando API: /tasks/high-priority');
        
        const response = await api.getHighPriorityTasks();
        console.log('✅ Respuesta API:', {
            success: response.success,
            count: response.tasks?.length || 0,
            tasks: response.tasks || []
        });
        
        // Filtrar solo tareas pendientes o en progreso
        const activeTasks = response.tasks ? response.tasks.filter(task => 
            task.estado === 'pendiente' || task.estado === 'en-progreso'
        ) : [];
        
        console.log(`📋 Tareas activas (pendientes/en-progreso): ${activeTasks.length}`);
        
        // DEBUG: Verificar estructura de tareas
        if (activeTasks.length > 0) {
            console.log('📋 Tareas de alta prioridad activas:');
            activeTasks.forEach((task, index) => {
                console.log(`  ${index + 1}. ${task.titulo} (${task.prioridad}) - ${task.estado}`);
                console.log(`     Fecha límite: ${task.fecha_limite}`);
                console.log(`     Hora límite: ${task.hora_limite || 'No especificada'}`);
                console.log(`     ID: ${task._id}`);
                console.log(`     Activo: ${task.activo}`);
            });
        }
        
        if (response.success && activeTasks.length > 0) {
            renderTaskCards('highPriorityTasks', activeTasks, 'alta');
            document.getElementById('highPriorityCount').textContent = activeTasks.length;
            console.log('✅ Tareas de alta prioridad renderizadas en dashboard');
        } else {
            console.log('ℹ️ No hay tareas de alta prioridad activas');
            showEmptyState('highPriorityTasks', 'No hay tareas de alta prioridad', 'Todas tus tareas de alta prioridad están completadas');
        }
        
        console.groupEnd();
    } catch (error) {
        console.error('❌ Error cargando tareas de alta prioridad:', error);
        console.error('📋 Detalles del error:', {
            message: error.message,
            stack: error.stack
        });
        showEmptyState('highPriorityTasks', 'Error al cargar', 'Intenta de nuevo más tarde');
    }
}

/**
 * 5.2 Cargar tareas para hoy
 * Obtiene y muestra las tareas que vencen hoy en el dashboard
 */
async function loadTodayTasks() {
    try {
        console.group('🔍 DEBUG: loadTodayTasks');
        console.log('📡 Llamando API: /tasks/today');
        
        const response = await api.getTodayTasks();
        console.log('✅ Respuesta API:', {
            success: response.success,
            count: response.tasks?.length || 0,
            tasks: response.tasks || []
        });
        
        // DEBUG: Verificar estructura de tareas
        if (response.tasks && response.tasks.length > 0) {
            console.log('📋 Tareas para hoy:');
            const hoy = new Date();
            console.log(`📅 Fecha actual: ${hoy.toISOString()}`);
            
            response.tasks.forEach((task, index) => {
                console.log(`  ${index + 1}. ${task.titulo}`);
                console.log(`     Prioridad: ${task.prioridad}`);
                console.log(`     Estado: ${task.estado}`);
                console.log(`     Fecha límite: ${task.fecha_limite}`);
                console.log(`     Hora límite: ${task.hora_limite || 'No especificada'}`);
                console.log(`     Activo: ${task.activo}`);
                
                // Verificar si la fecha es de hoy
                if (task.fecha_limite) {
                    const taskDate = new Date(task.fecha_limite);
                    const isToday = taskDate.toDateString() === hoy.toDateString();
                    console.log(`     ¿Es hoy?: ${isToday ? '✅ SÍ' : '❌ NO'}`);
                }
            });
        }
        
        if (response.success && response.tasks.length > 0) {
            renderTaskCards('todayTasks', response.tasks, 'hoy');
            document.getElementById('todayTasksCount').textContent = response.tasks.length;
            console.log('✅ Tareas para hoy renderizadas');
        } else {
            console.log('ℹ️ No hay tareas para hoy o respuesta vacía');
            showEmptyState('todayTasks', 'No hay tareas para hoy', '¡Excelente trabajo!');
        }
        
        console.groupEnd();
    } catch (error) {
        console.error('❌ Error cargando tareas para hoy:', error);
        console.error('📋 Detalles del error:', {
            message: error.message,
            stack: error.stack
        });
        showEmptyState('todayTasks', 'Error al cargar', 'Intenta de nuevo más tarde');
    }
}

/**
 * 5.3 Renderizar tarjetas de tareas
 * Crea el HTML para mostrar las tarjetas de tareas en el dashboard
 * CON SCROLLBAR cuando hay más de 6 tareas
 */
function renderTaskCards(containerId, tasks, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    // Aplicar clases para scrollbar si hay más de 6 tareas
    if (tasks.length > 3) {
        container.classList.add('task-cards--scrollable');
        container.style.maxHeight = '400px';
        container.style.overflowY = 'auto';
    } else {
        container.classList.remove('task-cards--scrollable');
        container.style.maxHeight = 'none';
        container.style.overflowY = 'visible';
    }
    
    // Limitar a mostrar 10 tareas como máximo (aunque el scroll permita ver todas)
    const tasksToShow = tasks.slice(0, 10);
    
    tasksToShow.forEach(task => {
        const taskCard = createTaskCard(task, type);
        container.appendChild(taskCard);
    });
    
    // Mostrar contador si hay más tareas de las que se muestran
    if (tasks.length > 10) {
        const counter = document.createElement('div');
        counter.className = 'task-cards-counter';
        counter.innerHTML = `<small>+${tasks.length - 10} más (usa scroll para ver)</small>`;
        container.appendChild(counter);
    }
}

function createTaskCard(task, type) {
    const card = document.createElement('div');
    card.className = 'task-card--compact';
    card.dataset.taskId = task._id;
    card.dataset.priority = task.prioridad;
    card.style.cursor = 'pointer';
    
    // Manejar clic en la tarjeta para ir a tareas
    card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`🖱️ Clic en tarea: ${task.titulo} (ID: ${task._id})`);
        
        if (typeof window.openTasksTab === 'function') {
            window.openTasksTab();
        }
    });
    
    // Formatear fecha y hora por separado
    const fechaLimite = task.fecha_limite ? new Date(task.fecha_limite) : null;
    let fechaTexto = 'Sin fecha límite';
    let horaTexto = '';
    let fechaClass = '';
    let displayText = ''; // Texto para mostrar
    
    if (fechaLimite) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        
        // Formatear solo la fecha
        fechaTexto = fechaLimite.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Obtener hora por separado
        if (task.hora_limite) {
            horaTexto = task.hora_limite;
        }
        
        // Determinar clase CSS según fecha
        if (fechaLimite < hoy) {
            fechaClass = 'overdue';
            displayText = 'Vencida';
        } else if (fechaLimite >= hoy && fechaLimite < manana) {
            fechaClass = 'today';
            displayText = 'Hoy';
        } else {
            fechaClass = 'upcoming';
            displayText = fechaTexto;
        }
        
        // Si está vencida pero tiene fecha, mostrar la fecha de vencimiento
        if (fechaLimite < hoy && fechaTexto) {
            displayText = `Vencida el ${fechaTexto}`;
        }
    }
    
    // Icono según prioridad
    const priorityIcon = getPriorityIcon(task.prioridad);
    
    // Construir el HTML - SOLUCIÓN: Mostrar fecha y hora en elementos separados pero no duplicados
    card.innerHTML = `
        <div class="task-card__header--compact">
            <h4 class="task-card__title--compact" title="${task.titulo}">
                ${task.titulo}
            </h4>
            <span class="task-priority--compact" data-priority="${task.prioridad}">
                <i class="fas ${priorityIcon}"></i> ${task.prioridad}
            </span>
        </div>
        <div class="task-card__info--compact">
            <div class="task-card__due--compact ${fechaClass}">
                <i class="fas fa-calendar-day"></i>
                <span class="task-card__date-text">${displayText}</span>
                ${horaTexto ? `<span class="task-card__time-text">${horaTexto}</span>` : ''}
            </div>
        </div>
        <div class="task-card__action-hint">
            <small>Click para ver detalles</small>
        </div>
    `;
    
    return card;
}

/**
 * 5.5 Obtener icono según prioridad
 * Retorna el icono de FontAwesome apropiado para la prioridad
 */
function getPriorityIcon(priority) {
    const icons = {
        'critica': 'fa-skull-crossbones',
        'alta': 'fa-exclamation-triangle',
        'media': 'fa-exclamation-circle',
        'baja': 'fa-info-circle'
    };
    return icons[priority] || 'fa-tasks';
}

/**
 * 5.6 Mostrar estado vacío
 * Muestra un mensaje cuando no hay tareas
 */
function showEmptyState(containerId, title, message) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="task-cards-empty">
            <i class="fas fa-clipboard-list"></i>
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    // Actualizar contador a 0
    const countElement = document.getElementById(`${containerId}Count`);
    if (countElement) {
        countElement.textContent = '0';
    }
}

/**
 * 5.7 Abrir pestaña de tareas
 * Navega a la sección de tareas
 */
function openTasksTab() {
    const tasksTab = document.querySelector('[data-tab="tasks"]');
    if (tasksTab) {
        tasksTab.click();
    }
}

/**
 * 5.8 Actualizar todas las tareas del dashboard
 * Función principal para cargar todas las tareas
 */
async function updateDashboardTasks() {
    console.log('🔄 Actualizando tareas del dashboard...');
    await Promise.all([
        loadHighPriorityTasks(),
        loadTodayTasks()
    ]);
    window.dashboardTasks.lastUpdate = new Date();
}

/**
 * 5.9 Forzar actualización inmediata de tareas
 * Para ser llamada cuando se crea/edita/elimina una tarea
 */
window.forceDashboardTasksUpdate = async function() {
    console.log('🚀 Forzando actualización inmediata de tareas en dashboard');
    await updateDashboardTasks();
    showFloatingNotification('Tareas actualizadas en dashboard', 'success');
};

// =============================================================================
// 6. SISTEMA DE ACTUALIZACIÓN EN TIEMPO REAL
// =============================================================================

/**
 * 6.1 Inicializar sistema de actualización automática
 * Verifica cada 30 segundos si hay cambios en las tareas
 */
function initDashboardAutoRefresh() {
    // Escuchar eventos de cambio en tareas
    document.addEventListener('task-created', async () => {
        console.log('📝 Evento: Tarea creada - actualizando dashboard');
        await updateDashboardTasks();
    });
    
    document.addEventListener('task-updated', async () => {
        console.log('📝 Evento: Tarea actualizada - actualizando dashboard');
        await updateDashboardTasks();
    });
    
    document.addEventListener('task-deleted', async () => {
        console.log('🗑️ Evento: Tarea eliminada - actualizando dashboard');
        await updateDashboardTasks();
    });
    
    // Actualizar automáticamente cada 30 segundos
    setInterval(async () => {
        if (document.visibilityState === 'visible') {
            console.log('⏰ Actualización periódica de dashboard');
            await updateDashboardTasks();
        }
    }, 30000);
    
    // Actualizar cuando la pestaña se vuelve visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('👀 Pestaña visible - actualizando dashboard');
            updateDashboardTasks();
        }
    });
}

/**
 * 6.2 Abrir pestaña de tareas - Función global CORREGIDA
 * Navega a la sección de tareas cuando se hace clic en una tarjeta
 */
window.openTasksTab = function() {
    console.log('🔍 DEBUG: openTasksTab llamado - Intentando abrir pestaña de tareas');
    
    try {
        // Método 1: Buscar el tab de tareas por ID (el más directo)
        const tasksTab = document.querySelector('#tab-tareas');
        if (tasksTab) {
            console.log('✅ Encontrado tab de tareas por ID, haciendo clic...');
            tasksTab.click();
            
            // Forzar scroll a la sección de tareas
            setTimeout(() => {
                const tareasSection = document.getElementById('tareas');
                if (tareasSection) {
                    tareasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
            
            return true;
        }
        
        // Método 2: Buscar por data-tab
        const tabs = document.querySelectorAll('[data-tab]');
        console.log(`🔍 Tabs encontrados: ${tabs.length}`);
        
        for (const tab of tabs) {
            const tabValue = tab.getAttribute('data-tab');
            console.log(`🔍 Tab encontrado: data-tab="${tabValue}"`);
            
            if (tabValue === 'tareas' || tabValue === 'tasks') {
                console.log('✅ Encontrado tab de tareas por data-tab, haciendo clic...');
                tab.click();
                
                // Forzar scroll a la sección de tareas
                setTimeout(() => {
                    const tareasSection = document.getElementById('tareas');
                    if (tareasSection) {
                        tareasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
                
                return true;
            }
        }
        
        // Método 3: Buscar enlace en la navegación
        const navLinks = document.querySelectorAll('nav a, .nav a, .sidebar a, .tabs a');
        for (const link of navLinks) {
            const href = link.getAttribute('href') || '';
            const text = link.textContent || '';
            
            if (href.includes('#tareas') || href.includes('#tasks') || 
                text.toLowerCase().includes('tarea') || text.toLowerCase().includes('task')) {
                console.log('✅ Encontrado enlace de tareas, haciendo clic...');
                link.click();
                
                // Forzar scroll a la sección de tareas
                setTimeout(() => {
                    const tareasSection = document.getElementById('tareas');
                    if (tareasSection) {
                        tareasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 100);
                
                return true;
            }
        }
        
        // Método 4: Cambiar URL hash directamente
        console.log('📍 Cambiando URL hash a #tareas');
        window.location.hash = '#tareas';
        
        // Mostrar la sección manualmente
        setTimeout(() => {
            const tareasSection = document.getElementById('tareas');
            if (tareasSection) {
                // Ocultar todas las secciones
                document.querySelectorAll('.tab-content').forEach(section => {
                    section.style.display = 'none';
                });
                
                // Mostrar solo la sección de tareas
                tareasSection.style.display = 'block';
                tareasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                console.log('✅ Sección de tareas mostrada manualmente');
            }
        }, 100);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error en openTasksTab:', error);
        
        // Método de emergencia: Mostrar alerta
        showFloatingNotification('Redirigiendo a tareas...', 'info');
        
        // Intentar mostrar directamente
        const tareasSection = document.getElementById('tareas');
        if (tareasSection) {
            tareasSection.style.display = 'block';
            tareasSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        return false;
    }
};

/**
 * 6.3 Función para activar el sistema de tabs si existe
 */
function activateTabSystem() {
    console.log('🔧 Activando sistema de tabs...');
    
    // Buscar todos los tabs
    const tabs = document.querySelectorAll('[data-tab]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.getAttribute('data-tab');
            console.log(`🔄 Cambiando a tab: ${targetTab}`);
            
            // Remover clase active de todos los tabs
            document.querySelectorAll('[data-tab]').forEach(t => {
                t.classList.remove('active');
            });
            
            // Añadir clase active al tab actual
            this.classList.add('active');
            
            // Ocultar todos los contenidos
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Mostrar el contenido correspondiente
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.style.display = 'block';
                
                // Si es el tab de dashboard, actualizar tareas
                if (targetTab === 'dashboard') {
                    console.log('🏠 Tab dashboard activado - actualizando tareas');
                    updateDashboardTasks();
                }
                
                // Disparar evento personalizado
                window.dispatchEvent(new CustomEvent('tab-changed', {
                    detail: { tab: targetTab }
                }));
                
                console.log(`✅ Tab ${targetTab} activado`);
            }
        });
    });
    
    console.log(`✅ Sistema de tabs activado (${tabs.length} tabs encontrados)`);
}

/**
 * 6.4 Inicializar sistema de tabs cuando el DOM esté listo
 */
function initializeTabs() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            activateTabSystem();
            initDashboardAutoRefresh(); // Iniciar auto-refresh
        });
    } else {
        activateTabSystem();
        initDashboardAutoRefresh(); // Iniciar auto-refresh
    }
}

// Inicializar tabs automáticamente
initializeTabs();

/**
 * 6.5 Abrir tarea específica por ID
 * @param {string} taskId - ID de la tarea a abrir
 */
window.openTaskById = function(taskId) {
    console.log(`🔍 DEBUG: openTaskById llamado con ID: ${taskId}`);
    
    // Primero abrir la pestaña de tareas
    window.openTasksTab();
    
    // Después buscar y abrir la tarea específica
    setTimeout(() => {
        // Aquí puedes agregar lógica para resaltar o abrir la tarea específica
        console.log(`Buscando tarea con ID: ${taskId}`);
        
        // Disparar evento para abrir tarea específica
        window.dispatchEvent(new CustomEvent('open-specific-task', {
            detail: { taskId }
        }));
    }, 500);
};

// =============================================================================
// 7. INICIALIZACIÓN GLOBAL
// =============================================================================

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.dashboard = {
        loadDashboardData,
        updateDashboardStats,
        loadRecentDocuments,
        handleRefreshDashboard,
        updateDashboardTasks,
        forceDashboardTasksUpdate: window.forceDashboardTasksUpdate,
        openTasksTab,
        openTaskById
    };
}

export { loadDashboardData, updateDashboardStats, loadRecentDocuments, handleRefreshDashboard, updateDashboardTasks };