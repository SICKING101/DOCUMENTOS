// =============================================================================
// src/frontend/modules/documentos/upload/progressManager.js
// =============================================================================

import { DOM } from '../../../dom.js';
import { showAlert } from '../../../utils.js';

/**
 * Muestra el contenedor de progreso de subida múltiple
 */
export function showUploadProgressContainer() {
    console.log('📊 Mostrando contenedor de progreso');
    
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'block';
        updateOverallProgress();
    }
}

/**
 * Oculta el contenedor de progreso de subida múltiple
 */
export function hideUploadProgressContainer() {
    console.log('📊 Ocultando contenedor de progreso');
    
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

/**
 * Actualiza el progreso general de la subida múltiple
 */
export function updateOverallProgress() {
    if (!window.multipleUploadState) return;
    
    const progressContainer = document.getElementById('uploadProgressContainer');
    const progressBar = document.getElementById('overallProgressBar');
    const progressText = document.getElementById('overallProgressText');
    const statusText = document.getElementById('overallStatusText');
    const filesCount = document.getElementById('overallFilesCount');
    
    if (!progressContainer || !progressBar || !progressText || !statusText || !filesCount) {
        return;
    }
    
    const stats = window.multipleUploadState.getStats();
    
    // Calcular porcentaje general
    let overallProgress = 0;
    if (stats.total > 0) {
        overallProgress = Math.round((stats.completed / stats.total) * 100);
    }
    
    // Actualizar elementos
    progressBar.style.width = `${overallProgress}%`;
    progressText.textContent = `${overallProgress}%`;
    
    // Actualizar texto de estado
    if (window.multipleUploadState.isUploading) {
        statusText.textContent = `Subiendo... (${stats.completed}/${stats.total})`;
    } else {
        statusText.textContent = `Completado: ${stats.completed}/${stats.total}`;
    }
    
    // Actualizar contador de archivos
    filesCount.textContent = `${stats.completed} de ${stats.total} archivos`;
    
    // Actualizar detalles
    updateProgressDetails();
}

/**
 * Actualiza los detalles del progreso
 */
function updateProgressDetails() {
    if (!window.multipleUploadState) return;
    
    const detailsContainer = document.getElementById('progressDetails');
    if (!detailsContainer) return;
    
    const stats = window.multipleUploadState.getStats();
    
    detailsContainer.innerHTML = `
        <div class="progress-detail">
            <i class="fas fa-check-circle" style="color: var(--success)"></i>
            <span>Completados: <strong>${stats.completed}</strong></span>
        </div>
        <div class="progress-detail">
            <i class="fas fa-sync-alt" style="color: var(--warning)"></i>
            <span>Subiendo: <strong>${stats.uploading}</strong></span>
        </div>
        <div class="progress-detail">
            <i class="fas fa-clock" style="color: var(--info)"></i>
            <span>Pendientes: <strong>${stats.pending}</strong></span>
        </div>
        <div class="progress-detail">
            <i class="fas fa-times-circle" style="color: var(--danger)"></i>
            <span>Fallidos: <strong>${stats.failed}</strong></span>
        </div>
    `;
}

/**
 * Cancela la subida múltiple en curso
 */
export function cancelMultipleUpload() {
    console.log('⏹️ Cancelando subida múltiple');
    
    if (!window.multipleUploadState) return;
    
    window.multipleUploadState.isUploading = false;
    
    // Actualizar estado de archivos
    window.multipleUploadState.files.forEach(file => {
        if (file.status === 'uploading') {
            file.status = 'failed';
            file.error = 'Subida cancelada';
        }
    });
    
    // Actualizar UI
    updateOverallProgress();
    showAlert('Subida múltiple cancelada', 'warning');
}

/**
 * Muestra los resultados de la subida múltiple
 * @param {object} results - Resultados de la subida
 */
export function showUploadResults(results) {
    console.log('📋 Mostrando resultados de subida');
    
    if (!results) return;
    
    // Crear o actualizar contenedor de resultados
    let resultsContainer = document.getElementById('uploadResultsContainer');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'uploadResultsContainer';
        resultsContainer.className = 'upload-results';
        
        const progressContainer = document.getElementById('uploadProgressContainer');
        if (progressContainer) {
            progressContainer.appendChild(resultsContainer);
        }
    }
    
    // Generar HTML de resultados
    resultsContainer.innerHTML = `
        <div class="results-header">
            <h4><i class="fas fa-clipboard-check"></i> Resultados de la Subida</h4>
            <button class="btn btn--sm btn--outline" id="closeResultsBtn">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="results-summary">
            <div class="result-item result-item--success">
                <i class="fas fa-check-circle"></i>
                <span>Exitosas: <strong>${results.successCount}</strong></span>
            </div>
            <div class="result-item result-item--error">
                <i class="fas fa-times-circle"></i>
                <span>Fallidas: <strong>${results.failureCount}</strong></span>
            </div>
            <div class="result-item">
                <i class="fas fa-clock"></i>
                <span>Tiempo: <strong>${(results.totalTime / 1000).toFixed(1)}s</strong></span>
            </div>
        </div>
        
        ${results.successCount > 0 ? `
            <div class="results-files">
                <h5>Archivos subidos exitosamente:</h5>
                <ul class="files-list">
                    ${results.uploadedFiles.map(file => `
                        <li><i class="fas fa-file-alt"></i> ${file}</li>
                    `).join('')}
                </ul>
            </div>
        ` : ''}
        
        ${results.failureCount > 0 ? `
            <div class="results-actions">
                <button class="btn btn--primary" id="retryFailedBtn">
                    <i class="fas fa-redo"></i> Reintentar fallidos
                </button>
            </div>
        ` : ''}
    `;
    
    // Configurar event listeners
    const closeBtn = resultsContainer.querySelector('#closeResultsBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            resultsContainer.remove();
        });
    }
    
    const retryBtn = resultsContainer.querySelector('#retryFailedBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            retryFailedUploads();
        });
    }
}

/**
 * Reintenta los archivos que fallaron
 */
function retryFailedUploads() {
    console.log('🔄 Reintentando archivos fallidos');
    
    if (!window.multipleUploadState) return;
    
    const failedFiles = window.multipleUploadState.files.filter(f => f.status === 'failed');
    
    failedFiles.forEach(file => {
        file.status = 'pending';
        file.error = null;
        file.progress = 0;
    });
    
    // Actualizar UI
    updateOverallProgress();
    
    // Volver a subir
    if (window.handleUploadMultipleDocuments) {
        window.handleUploadMultipleDocuments();
    }
}