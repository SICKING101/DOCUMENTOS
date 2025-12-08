import { DOM } from '../dom.js';
import { apiCall } from '../api.js';
import { setLoadingState, showAlert, getFileIcon, formatDate } from '../utils.js';

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
        
        const data = await apiCall('/dashboard');
        
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
 * todos los datos del panel principal.
 */
function handleRefreshDashboard(appState) {
    console.log('🔄 Actualizando dashboard...');
    loadDashboardData(appState);
}

export { loadDashboardData, updateDashboardStats, loadRecentDocuments, handleRefreshDashboard };