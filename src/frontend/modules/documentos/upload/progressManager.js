import { multipleUploadState } from './uploadMultiple.js';
import { formatFileSize } from '../../../utils.js';
import { showAlert } from '../../../utils.js';

/**
 * Muestra el contenedor de progreso de subida múltiple.
 * Contiene barra de progreso general, estadísticas y tiempo.
 */
export function showUploadProgressContainer() {
    console.log('📊 Mostrando contenedor de progreso');
    
    // Crear contenedor si no existe
    let progressContainer = document.getElementById('uploadProgressContainer');
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'uploadProgressContainer';
        progressContainer.className = 'upload-progress';
        
        progressContainer.innerHTML = `
            <div class="upload-progress__header">
                <h4><i class="fas fa-layer-group"></i> Subida Múltiple en Progreso</h4>
                <button class="btn btn--sm btn--outline" id="cancelUploadBtn">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
            
            <div class="upload-progress__body">
                <div class="overall-progress">
                    <div class="overall-progress__bar">
                        <div class="overall-progress__bar-fill" style="width: 0%"></div>
                    </div>
                    <div class="overall-progress__text">0/0 archivos (0%)</div>
                </div>
                
                <div class="upload-stats">
                    <!-- Las estadísticas se actualizarán dinámicamente -->
                </div>
                
                <div class="current-uploads" id="currentUploadsList">
                    <!-- Las subidas actuales se mostrarán aquí -->
                </div>
            </div>
            
            <div class="upload-progress__footer">
                <div class="upload-speed">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Velocidad: <span id="uploadSpeed">Calculando...</span></span>
                </div>
                <div class="upload-time">
                    <i class="fas fa-clock"></i>
                    <span>Tiempo: <span id="uploadTime">0s</span></span>
                </div>
            </div>
        `;
        
        // Agregar al body
        document.body.appendChild(progressContainer);
        
        // Agregar event listener para cancelar
        const cancelBtn = document.getElementById('cancelUploadBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancelMultipleUpload);
        }
    }
    
    // Mostrar contenedor
    progressContainer.style.display = 'block';
    
    // Posicionar
    progressContainer.style.position = 'fixed';
    progressContainer.style.bottom = '20px';
    progressContainer.style.right = '20px';
    progressContainer.style.zIndex = '9999';
    
    // Iniciar actualización de tiempo
    startUploadTimer();
}

/**
 * Oculta el contenedor de progreso de subida múltiple.
 */
export function hideUploadProgressContainer() {
    const progressContainer = document.getElementById('uploadProgressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
}

/**
 * Actualiza el progreso general de la subida múltiple.
 * Actualiza barra de progreso y estadísticas.
 */
export function updateOverallProgress() {
    const stats = multipleUploadState.getStats();
    const progressContainer = document.getElementById('uploadProgressContainer');
    
    if (!progressContainer) return;
    
    const totalFiles = stats.total;
    const completedFiles = stats.completed;
    const progressPercent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
    
    // Actualizar barra de progreso principal
    const overallProgressBar = progressContainer.querySelector('.overall-progress__bar-fill');
    const overallProgressText = progressContainer.querySelector('.overall-progress__text');
    
    if (overallProgressBar) {
        overallProgressBar.style.width = `${progressPercent}%`;
    }
    
    if (overallProgressText) {
        overallProgressText.textContent = `${completedFiles}/${totalFiles} archivos (${progressPercent}%)`;
    }
    
    // Actualizar estadísticas
    const statsElement = progressContainer.querySelector('.upload-stats');
    if (statsElement) {
        statsElement.innerHTML = `
            <div class="stat-item">
                <span class="stat-item__label">Completados:</span>
                <span class="stat-item__value stat-item__value--success">${stats.completed}</span>
            </div>
            <div class="stat-item">
                <span class="stat-item__label">Fallidos:</span>
                <span class="stat-item__value stat-item__value--danger">${stats.failed}</span>
            </div>
            <div class="stat-item">
                <span class="stat-item__label">Subiendo:</span>
                <span class="stat-item__value stat-item__value--info">${stats.uploading}</span>
            </div>
            <div class="stat-item">
                <span class="stat-item__label">Tamaño:</span>
                <span class="stat-item__value">${formatFileSize(stats.uploadedSize)} / ${formatFileSize(stats.totalSize)}</span>
            </div>
        `;
    }
}

/**
 * Inicia el temporizador para mostrar tiempo transcurrido de subida.
 */
function startUploadTimer() {
    const startTime = Date.now();
    const timeElement = document.getElementById('uploadTime');
    
    const timer = setInterval(() => {
        if (!multipleUploadState.isUploading) {
            clearInterval(timer);
            return;
        }
        
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        if (timeElement) {
            timeElement.textContent = `${elapsedSeconds}s`;
        }
    }, 1000);
}

/**
 * Cancela la subida múltiple con confirmación.
 * Cambia estado de archivos y oculta progreso.
 */
export function cancelMultipleUpload() {
    console.log('⏹️ Cancelando subida múltiple...');
    
    if (confirm('¿Estás seguro de que deseas cancelar la subida múltiple?')) {
        multipleUploadState.isUploading = false;
        
        // Cancelar todas las subidas pendientes
        multipleUploadState.files.forEach(fileObj => {
            if (fileObj.status === 'uploading' || fileObj.status === 'pending') {
                fileObj.status = 'failed';
                fileObj.error = 'Subida cancelada por el usuario';
                updateFileUI(fileObj.id);
            }
        });
        
        showAlert('Subida múltiple cancelada', 'warning');
        hideUploadProgressContainer();
    }
}

/**
 * Muestra los resultados de la subida múltiple.
 * Notifica al usuario y limpia archivos exitosos.
 * @param {object} results - Resultados de la subida
 */
export function showUploadResults(results) {
    console.group('📊 Resultados de la subida múltiple');
    console.table({
        'Archivos exitosos': results.successCount,
        'Archivos fallidos': results.failureCount,
        'Tiempo total': `${results.totalTime}ms`,
        'Archivos subidos': results.uploadedFiles.join(', ')
    });
    console.groupEnd();
    
    // Mostrar notificación con resultados
    if (results.successCount > 0 && results.failureCount === 0) {
        showAlert(`✅ Todos los ${results.successCount} archivos se subieron correctamente`, 'success');
    } else if (results.successCount > 0) {
        showAlert(
            `⚠️ ${results.successCount} archivos subidos, ${results.failureCount} fallidos. ` +
            `Revisa la lista para más detalles.`,
            'warning'
        );
    } else {
        showAlert(
            `❌ Todos los ${results.failureCount} archivos fallaron. ` +
            `Revisa la lista para más detalles.`,
            'error'
        );
    }
    
    // Si todos fallaron, mantener los archivos en la lista
    if (results.successCount > 0) {
        // Remover archivos exitosos
        multipleUploadState.files = multipleUploadState.files.filter(f => f.status !== 'completed');
        updateMultipleUploadUI();
        
        if (multipleUploadState.files.length === 0) {
            // Cerrar modal si no quedan archivos
            setTimeout(() => {
                if (window.closeDocumentModal) {
                    window.closeDocumentModal();
                }
            }, 2000);
        }
    }
}