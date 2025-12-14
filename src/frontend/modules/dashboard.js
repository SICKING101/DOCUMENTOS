import { DOM } from '../dom.js';
import { api } from '../services/api.js';  // CAMBIADO: importar 'api' en lugar de 'apiCall'
import { setLoadingState, showAlert, getFileIcon, formatDate } from '../utils.js';
import { showFloatingNotification } from './personas.js';  // CAMBIADO: importar showFloatingNotification

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
        
        const data = await api.getDashboardData();  // CAMBIADO: usar api.getDashboardData()
        
        if (data.success) {
            if (appState) {
                appState.dashboardStats = data.stats;
            }
            updateDashboardStats(appState);
            loadRecentDocuments(data.recent_documents || [], appState);
            console.log('✅ Dashboard actualizado correctamente');
            showAlert('Dashboard actualizado', 'success');
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
    
    const docsToShow = recentDocuments.length > 0 ? recentDocuments : (appState && appState.documents ? appState.documents.slice(0, 5) : []);
    
    DOM.recentDocuments.innerHTML = '';
    
    if (docsToShow.length === 0) {
        DOM.recentDocuments.innerHTML = `
            <article class="empty-state">
                <i class="fas fa-file-alt empty-state__icon"></i>
                <h3 class="empty-state__title">No hay documentos recientes</h3>
                <p class="empty-state__description">Sube tu primer documento para comenzar</p>
                <button class="btn btn--primary" id="addFirstDocument">
                    <i class="fas fa-plus"></i> Subir Documento
                </button>
            </article>
        `;
        // Re-attach event listener
        document.getElementById('addFirstDocument')?.addEventListener('click', () => {
            if (typeof window.openDocumentModal === 'function') {
                window.openDocumentModal();
            }
        });
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
            <div class="documents__actions">
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
            </div>
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
async function handleRefreshDashboard(appState) {
    console.log('🔄 Actualizando dashboard...');
    
    try {
        // Crear preloader overlay para toda la página
        const preloader = document.createElement('div');
        preloader.className = 'preloader-overlay preloader-overlay--light global-preloader';
        preloader.innerHTML = `
            <div class="preloader-overlay__content">
                <div class="preloader__spinner preloader--primary preloader--lg"></div>
                <h3 class="preloader-overlay__title">Actualizando Dashboard</h3>
                <p class="preloader-overlay__subtitle">Obteniendo la información más reciente...</p>
                
                <!-- Indicadores de progreso -->
                <div class="refresh-progress">
                    <div class="refresh-progress__steps">
                        <div class="refresh-step refresh-step--active" data-step="1">
                            <span class="refresh-step__number">1</span>
                            <span class="refresh-step__text">Cargando estadísticas</span>
                        </div>
                        <div class="refresh-step" data-step="2">
                            <span class="refresh-step__number">2</span>
                            <span class="refresh-step__text">Actualizando documentos</span>
                        </div>
                        <div class="refresh-step" data-step="3">
                            <span class="refresh-step__number">3</span>
                            <span class="refresh-step__text">Refrescando personas</span>
                        </div>
                    </div>
                    
                    <!-- Barra de progreso -->
                    <div class="refresh-progress__bar">
                        <div class="refresh-progress__fill" id="refreshProgressFill"></div>
                    </div>
                    
                    <!-- Mensaje de tiempo estimado -->
                    <div class="refresh-progress__time">
                        <i class="fas fa-clock" style="margin-right: 5px;"></i>
                        <span class="refresh-progress__time-text">Tiempo estimado: <span id="refreshTime">5s</span></span>
                    </div>
                </div>
                
                <!-- Contador -->
                <div class="refresh-counter">
                    <span class="refresh-counter__label">Actualizando en:</span>
                    <span class="refresh-counter__value" id="refreshCountdown">3</span>
                </div>
            </div>
        `;
        
        // Agregar al body
        document.body.appendChild(preloader);
        
        // Mostrar con animación
        setTimeout(() => {
            preloader.style.display = 'flex';
            preloader.classList.add('preloader-fade-in');
        }, 10);
        
        // Actualizar tiempo estimado dinámicamente
        let timeRemaining = 5;
        const timeElement = document.getElementById('refreshTime');
        const countdownElement = document.getElementById('refreshCountdown');
        const progressFill = document.getElementById('refreshProgressFill');
        
        const timeInterval = setInterval(() => {
            timeRemaining--;
            if (timeRemaining <= 0) {
                clearInterval(timeInterval);
            } else {
                if (timeElement) timeElement.textContent = `${timeRemaining}s`;
                if (countdownElement) countdownElement.textContent = timeRemaining;
                if (progressFill) {
                    const progress = ((5 - timeRemaining) / 5) * 100;
                    progressFill.style.width = `${progress}%`;
                }
            }
        }, 1000);
        
        // Actualizar pasos del progreso
        const updateStep = (stepNumber) => {
            const steps = document.querySelectorAll('.refresh-step');
            steps.forEach(step => {
                if (parseInt(step.dataset.step) <= stepNumber) {
                    step.classList.add('refresh-step--active');
                } else {
                    step.classList.remove('refresh-step--active');
                }
            });
        };
        
        // Paso 1: Cargar estadísticas
        updateStep(1);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Paso 2: Actualizar documentos
        updateStep(2);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Paso 3: Refrescar personas
        updateStep(3);
        
        // Cargar datos del dashboard
        await loadDashboardData(appState);
        
        // Actualizar contador final
        if (countdownElement) countdownElement.textContent = '0';
        if (progressFill) progressFill.style.width = '100%';
        
        // Mostrar animación de éxito
        preloader.innerHTML = `
            <div class="preloader-overlay__content">
                <div class="success-animation" style="font-size: 4rem; color: #4CAF50; margin-bottom: 1rem;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="preloader-overlay__title">¡Dashboard Actualizado!</h3>
                <p class="preloader-overlay__subtitle">Todos los datos han sido refrescados correctamente</p>
                
                <div class="refresh-stats">
                    <div class="refresh-stat">
                        <i class="fas fa-users" style="color: var(--primary);"></i>
                        <span class="refresh-stat__value">${appState.persons?.length || 0}</span>
                        <span class="refresh-stat__label">Personas</span>
                    </div>
                    <div class="refresh-stat">
                        <i class="fas fa-file-alt" style="color: var(--secondary);"></i>
                        <span class="refresh-stat__value">${appState.documents?.length || 0}</span>
                        <span class="refresh-stat__label">Documentos</span>
                    </div>
                    <div class="refresh-stat">
                        <i class="fas fa-building" style="color: var(--success);"></i>
                        <span class="refresh-stat__value">${appState.departments?.length || 0}</span>
                        <span class="refresh-stat__label">Departamentos</span>
                    </div>
                </div>
                
                <div class="preloader-message" style="margin-top: 1.5rem;">
                    <p class="preloader-message__text">
                        <i class="fas fa-info-circle" style="margin-right: 5px; color: var(--primary);"></i>
                        Los datos se actualizarán automáticamente en <span id="autoCloseCountdown">2</span> segundos
                    </p>
                </div>
            </div>
        `;
        
        // Contador para cerrar automáticamente
        let closeCountdown = 2;
        const autoCloseElement = document.getElementById('autoCloseCountdown');
        const closeInterval = setInterval(() => {
            closeCountdown--;
            if (autoCloseElement) autoCloseElement.textContent = closeCountdown;
            
            if (closeCountdown <= 0) {
                clearInterval(closeInterval);
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    if (preloader.parentNode) {
                        preloader.remove();
                    }
                }, 300);
            }
        }, 1000);
        
        // También permitir cerrar manualmente
        setTimeout(() => {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'btn btn--primary btn--sm';
            closeBtn.innerHTML = '<i class="fas fa-times"></i> Cerrar';
            closeBtn.style.marginTop = '1rem';
            closeBtn.onclick = () => {
                clearInterval(closeInterval);
                preloader.classList.add('fade-out');
                setTimeout(() => {
                    if (preloader.parentNode) {
                        preloader.remove();
                    }
                }, 300);
            };
            
            const content = preloader.querySelector('.preloader-overlay__content');
            if (content) {
                content.appendChild(closeBtn);
            }
        }, 500);
        
        // Mostrar notificación flotante
        showFloatingNotification('Dashboard actualizado exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error actualizando dashboard:', error);
        
        // Mostrar error en el preloader
        const preloader = document.querySelector('.global-preloader');
        if (preloader) {
            preloader.innerHTML = `
                <div class="preloader-overlay__content">
                    <div class="error-animation" style="font-size: 4rem; color: #f44336; margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <h3 class="preloader-overlay__title">Error al Actualizar</h3>
                    <p class="preloader-overlay__subtitle">${error.message || 'Ocurrió un error al actualizar el dashboard'}</p>
                    
                    <div class="preloader-actions" style="margin-top: 1.5rem;">
                        <button class="btn btn--outline btn--sm" onclick="this.closest('.preloader-overlay').remove();">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn btn--primary btn--sm" onclick="handleRefreshDashboard(window.appState)">
                            <i class="fas fa-redo"></i> Reintentar
                        </button>
                    </div>
                </div>
            `;
        }
        
        showAlert('Error al actualizar dashboard: ' + error.message, 'error');
    }
}

export { loadDashboardData, updateDashboardStats, loadRecentDocuments, handleRefreshDashboard };