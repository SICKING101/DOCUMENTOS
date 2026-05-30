// =============================================================================
// src/frontend/modules/documentos/dragdrop/documentMoveHandler.js
// Handles moving documents between folders via drag & drop
// Listens for document:dropped event and makes API call to update folder_id
// UPDATED: Moves document in DOM instantly before API confirmation
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert } from '../../../utils.js';
import wsManager from '../../../services/websocket-manager.js';
// Track pending requests to prevent duplicate submissions
const pendingMoves = new Map();

/**
 * Initialize document move handler
 * Sets up listener for document:dropped event
 */
export function initializeDocumentMoveHandler() {
    console.log('🎯 Initializing document move handler');

    // Remove existing listener to prevent duplicates
    window.removeEventListener('document:dropped', handleDocumentDrop);

    // Listen for the custom event fired by documentDragDrop.js
    window.addEventListener('document:dropped', handleDocumentDrop);

    console.log('✅ Document move handler initialized');
}

/**
 * Handle document drop event
 * Shows loading indicator and makes API call to move document
 * NOW WITH INSTANT DOM UPDATE
 * @param {CustomEvent} event - Contains { documentId, folderId, folderName }
 */
async function handleDocumentDrop(event) {
    const { documentId, folderId, folderName } = event.detail;

    console.log(`🚀 Handling document drop:`, { documentId, folderId, folderName });

    // Prevent duplicate moves if already in progress
    if (pendingMoves.has(documentId)) {
        console.warn(`⚠️ Move already in progress for document ${documentId}`);
        showAlert('⏳ Este documento ya se está moviendo...', 'warning');
        return;
    }

    try {
        // Mark move as pending
        pendingMoves.set(documentId, true);

        // ✅ INSTANT DOM UPDATE: Mover visualmente antes de la API
        const wasMovedInDOM = moveDocumentInDOM(documentId, folderId, folderName);

        // Find the document row in the DOM
        const docRow = document.querySelector(`[data-document-id="${documentId}"]`);

        // Show loading indicator on the row
        showDocumentLoadingState(docRow, true);

        // If folderId is null or empty, move to root
        const targetFolderId = folderId || null;

        // Make the API call to move the document
        const response = await moveDocumentToFolder(documentId, targetFolderId);

        if (response && response.success) {
            console.log(`✅ Document moved successfully: ${documentId} → ${folderId || 'root'}`);

            // ✅ NUEVO: Emitir evento WebSocket para sincronización en tiempo real
            wsManager.emit('document:updated', {
                documentId: documentId,
                document: {
                    _id: documentId,
                    categoria: folderName,
                    folder_id: folderId || null
                }
            });

            // Show success toast
            showAlert(
                `✅ Documento movido a "${folderName}" exitosamente`,
                'success'
            );

            // ✅ ACTUALIZAR DATOS SIN RECARGAR LA PÁGINA
            await refreshDocumentData();

            // ✅ Navegar a la carpeta destino si se movió a una carpeta específica
            if (folderId && window.navigateCategoryInto) {
                // Pequeño delay para que se complete la actualización de datos
                setTimeout(() => {
                    window.navigateCategoryInto(folderId);
                }, 300);
            } else if (!folderId && window.navigateCategoryRoot) {
                // Si se movió a la raíz
                setTimeout(() => {
                    window.navigateCategoryRoot();
                }, 300);
            }

        } else {
            // ❌ API falló: revertir el movimiento en el DOM
            throw new Error(response?.message || 'Failed to move document');
        }

    } catch (error) {
        console.error(`❌ Error moving document:`, error);

        // Show error toast
        showAlert(
            `❌ Error al mover documento: ${error.message}`,
            'error'
        );

        // ✅ REVERTIR CAMBIOS EN EL DOM si la API falló
        revertDocumentMove(documentId);

        // Find and remove loading state
        const docRow = document.querySelector(`[data-document-id="${documentId}"]`);
        showDocumentLoadingState(docRow, false);

        // Recargar datos para asegurar consistencia
        await refreshDocumentData();

    } finally {
        // Remove from pending moves
        pendingMoves.delete(documentId);
    }
}

/**
 * ✅ NUEVO: Mueve el documento visualmente en el DOM antes de la confirmación de la API
 * @param {string} documentId - ID del documento
 * @param {string|null} folderId - ID de la carpeta destino (null = raíz)
 * @param {string} folderName - Nombre de la carpeta destino
 * @returns {boolean} - true si se pudo mover en el DOM
 */
function moveDocumentInDOM(documentId, folderId, folderName) {
    console.log(`🔄 Moving document ${documentId} in DOM to "${folderName}" (${folderId || 'root'})`);

    const docRow = document.querySelector(`[data-document-id="${documentId}"]`);
    if (!docRow) {
        console.warn(`⚠️ Document row not found in DOM for instant move`);
        return false;
    }

    // Guardar posición original para posible reversión
    const parentTable = docRow.closest('tbody');
    const originalNextSibling = docRow.nextSibling;
    const originalParent = docRow.parentNode;

    // Guardar en el elemento para posible reversión
    docRow.setAttribute('data-original-parent', originalParent ? 'true' : 'false');
    docRow.setAttribute('data-original-sibling', originalNextSibling ? originalNextSibling.getAttribute('data-document-id') || '' : '');

    // Si estamos en la misma vista (misma carpeta), no mover
    const currentCategoryId = getCurrentCategoryId();
    if (currentCategoryId === folderId) {
        console.log(`📌 Document already in target folder, no DOM move needed`);
        return false;
    }

    // Añadir clase de animación
    docRow.classList.add('document--moving-out');

    // Después de la animación, remover del DOM
    setTimeout(() => {
        if (docRow.parentNode) {
            // Animación de salida
            docRow.style.transition = 'all 0.3s ease';
            docRow.style.opacity = '0';
            docRow.style.transform = 'translateX(-50px)';

            setTimeout(() => {
                if (docRow.parentNode) {
                    docRow.parentNode.removeChild(docRow);
                    console.log(`📤 Document ${documentId} removed from current view`);

                    // Actualizar contador de documentos en la carpeta actual
                    updateDocumentCountInCurrentView(-1);

                    // Disparar evento para actualizar la UI
                    window.dispatchEvent(new CustomEvent('document:moved-in-dom', {
                        detail: { documentId, folderId, folderName }
                    }));
                }
            }, 300);
        }
    }, 150);

    return true;
}

/**
 * ✅ NUEVO: Revierte el movimiento en el DOM si la API falló
 * @param {string} documentId - ID del documento a revertir
 */
function revertDocumentMove(documentId) {
    console.log(`⏪ Reverting DOM move for document ${documentId}`);

    // Recargar la tabla completa para asegurar consistencia
    if (typeof window.renderDocumentsTable === 'function') {
        window.renderDocumentsTable();
    }

    // También refrescar las categorías
    if (typeof window.refreshCategoryTree === 'function') {
        window.refreshCategoryTree();
    }

    showAlert('🔄 Movimiento revertido debido a un error', 'warning');
}

/**
 * ✅ NUEVO: Actualiza los datos de documentos y categorías sin recargar la página
 */
async function refreshDocumentData() {
    console.log('🔄 Refrescando datos sin recargar la página...');

    try {
        // Recargar documentos
        if (typeof window.loadDocuments === 'function') {
            await window.loadDocuments();
            console.log('📄 Documentos recargados');
        }

        // Recargar categorías
        if (typeof window.loadCategories === 'function') {
            await window.loadCategories();
            console.log('📁 Categorías recargadas');
        }

        // Refrescar el árbol de categorías
        if (typeof window.refreshCategoryTree === 'function') {
            window.refreshCategoryTree();
            console.log('🌳 Árbol de categorías refrescado');
        }

        // Re-renderizar la tabla de documentos
        if (typeof window.renderDocumentsTable === 'function') {
            window.renderDocumentsTable();
            console.log('📊 Tabla de documentos re-renderizada');
        }

        // Actualizar panel de vencidos si existe
        if (typeof window.renderExpiredDocuments === 'function') {
            window.renderExpiredDocuments();
            console.log('⏰ Panel de vencidos actualizado');
        }

        // Actualizar dashboard si existe
        if (typeof window.loadDashboardData === 'function') {
            window.loadDashboardData(window.appState).catch(err => {
                console.warn('⚠️ Error actualizando dashboard:', err);
            });
        }

        console.log('✅ Datos refrescados exitosamente');

    } catch (error) {
        console.error('❌ Error refrescando datos:', error);
        // Si falla la recarga suave, hacer recarga completa
        if (confirm('No se pudieron actualizar los datos. ¿Deseas recargar la página?')) {
            window.location.reload();
        }
    }
}

/**
 * ✅ NUEVO: Obtiene el ID de la categoría actual
 * @returns {string|null}
 */
function getCurrentCategoryId() {
    if (window.categoryNavState && window.categoryNavState.stack.length > 0) {
        const current = window.categoryNavState.stack[window.categoryNavState.stack.length - 1];
        return current._id;
    }
    return null;
}

/**
 * ✅ NUEVO: Actualiza el contador de documentos en la vista actual
 * @param {number} delta - Cambio en el contador (+1 o -1)
 */
function updateDocumentCountInCurrentView(delta) {
    const docCountElement = document.querySelector('.document-count-badge');
    if (docCountElement) {
        const currentCount = parseInt(docCountElement.textContent) || 0;
        const newCount = Math.max(0, currentCount + delta);
        docCountElement.textContent = newCount;

        // Animar el cambio
        docCountElement.classList.add('count-updated');
        setTimeout(() => docCountElement.classList.remove('count-updated'), 1000);
    }
}

/**
 * Make API call to move document to a new folder
 * @param {string} documentId - Document ID to move
 * @param {string|null} folderId - Target folder/category ID (null = root)
 * @returns {Promise<Object>} API response
 */
async function moveDocumentToFolder(documentId, folderId) {
    console.log(`📤 Sending PATCH request: /api/documents/${documentId}/move-folder`);

    try {
        const response = await api.call(
            `/documents/${documentId}/move-folder`,
            {
                method: 'PATCH',
                body: {
                    folder_id: folderId
                }
            }
        );

        console.log('📥 API Response:', response);
        return response;

    } catch (error) {
        console.error('❌ API call failed:', error);
        throw error;
    }
}

/**
 * Show or hide loading state on document row
 * @param {HTMLElement|null} docRow - Document table row element
 * @param {boolean} isLoading - True to show loading, false to hide
 */
function showDocumentLoadingState(docRow, isLoading) {
    if (!docRow) {
        console.warn('⚠️ Document row not found in DOM');
        return;
    }

    if (isLoading) {
        // Add loading class and opacity
        docRow.classList.add('document--loading');
        docRow.style.position = 'relative';

        // Remove existing spinner if any
        const existingSpinner = docRow.querySelector('.document-move-spinner');
        if (existingSpinner) {
            existingSpinner.remove();
        }

        // Show loading spinner overlay
        const spinner = document.createElement('div');
        spinner.className = 'document-move-spinner';
        spinner.innerHTML = `
            <div class="spinner-content">
                <div class="spinner-icon">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <span class="spinner-text">Moviendo...</span>
            </div>
        `;
        docRow.appendChild(spinner);

        console.log(`⏳ Loading state shown for document row`);
    } else {
        // Remove loading class and opacity
        docRow.classList.remove('document--loading');
        docRow.style.position = '';

        // Remove spinner if it exists
        const spinner = docRow.querySelector('.document-move-spinner');
        if (spinner) {
            spinner.style.opacity = '0';
            spinner.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (spinner.parentNode) {
                    spinner.parentNode.removeChild(spinner);
                }
            }, 300);
        }

        console.log(`🛑 Loading state removed from document row`);
    }
}

/**
 * Add CSS styles for loading indicator and animations
 * Call this once during initialization
 */
export function injectDocumentMoveStyles() {
    const styleId = 'document-move-styles';

    // Check if styles already injected
    if (document.getElementById(styleId)) {
        return;
    }

    const styles = `
        /* Document move loading styles */
        
        /* Document row during move operation */
        [data-document-id].document--loading {
            opacity: 0.6;
            pointer-events: none;
            position: relative;
        }
        
        /* Document moving out animation */
        [data-document-id].document--moving-out {
            animation: slideOutLeft 0.3s ease forwards;
        }
        
        @keyframes slideOutLeft {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(-50px);
            }
        }
        
        /* Loading spinner container */
        .document-move-spinner {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(2px);
            border-radius: var(--radius-md, 8px);
            z-index: 100;
            animation: fadeIn 0.2s ease;
        }
        
        .spinner-content {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--primary-color, #3b82f6);
            font-size: 0.875rem;
            font-weight: 500;
        }
        
        .spinner-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }
        
        .spinner-icon i {
            font-size: 1rem;
            color: var(--primary-color, #3b82f6);
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }
        
        /* Document count badge animation */
        .count-updated {
            animation: pulse 1s ease;
        }
        
        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.3);
                color: var(--primary-color, #3b82f6);
            }
        }
        
        /* Success animation for moved document */
        .document-moved-success {
            animation: successFlash 1s ease;
        }
        
        @keyframes successFlash {
            0% {
                background-color: rgba(34, 197, 94, 0.3);
            }
            100% {
                background-color: transparent;
            }
        }
        
        /* Dark theme support */
        [data-theme="dark"] .document-move-spinner {
            background: rgba(20, 20, 30, 0.9);
        }
        
        [data-theme="dark"] .document-move-spinner .spinner-content {
            color: #60a5fa;
        }
    `;

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);

    console.log('✅ Document move styles injected');
}

/**
 * Cleanup handler (optional, for when the module is unloaded)
 */
export function removeDocumentMoveHandler() {
    window.removeEventListener('document:dropped', handleDocumentDrop);
    console.log('🗑️ Document move handler removed');
}

/**
 * Get status of all pending document moves
 * Useful for debugging
 */
export function getPendingMoves() {
    return Array.from(pendingMoves.keys());
}

/**
 * Cancel a pending move operation
 * @param {string} documentId - Document ID to cancel
 */
export function cancelDocumentMove(documentId) {
    if (pendingMoves.has(documentId)) {
        pendingMoves.delete(documentId);
        const docRow = document.querySelector(`[data-document-id="${documentId}"]`);
        showDocumentLoadingState(docRow, false);
        console.log(`⏹️ Cancelled move for document ${documentId}`);
        return true;
    }
    return false;
}