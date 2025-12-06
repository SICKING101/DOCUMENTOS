// =============================================================================
// MÓDULO DE PAPELERA - Gestión de documentos eliminados
// =============================================================================

import { CONFIG } from '../config.js';
import { showAlert } from '../utils.js';

// =============================================================================
// FUNCIONES DE API
// =============================================================================

/**
 * Obtener documentos en papelera
 */
export async function loadTrash() {
    try {
        console.log('🗑️ Cargando papelera...');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/trash`);
        
        if (!response.ok) {
            throw new Error('Error al cargar papelera');
        }

        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ ${data.documentos.length} documentos en papelera`);
            renderTrashTable(data.documentos);
            return data.documentos;
        }
    } catch (error) {
        console.error('❌ Error cargando papelera:', error);
        showAlert('Error al cargar documentos en papelera', 'error');
        return [];
    }
}

/**
 * Restaurar documento de la papelera
 */
export async function restoreDocument(documentId) {
    if (!confirm('¿Estás seguro de restaurar este documento?')) {
        return;
    }

    try {
        console.log(`♻️ Restaurando documento ${documentId}...`);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/trash/restore/${documentId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Error al restaurar documento');
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert('Documento restaurado correctamente', 'success');
            await loadTrash(); // Recargar papelera
            
            // Recargar documentos si existe la función
            if (window.loadDocuments) {
                window.loadDocuments();
            }
        }
    } catch (error) {
        console.error('❌ Error restaurando documento:', error);
        showAlert('Error al restaurar documento', 'error');
    }
}

/**
 * Eliminar documento definitivamente
 */
export async function deleteDocumentPermanently(documentId, nombreDocumento) {
    if (!confirm(`⚠️ ADVERTENCIA: Esta acción es PERMANENTE.\n\n¿Estás completamente seguro de eliminar definitivamente "${nombreDocumento}"?\n\nEsta acción NO se puede deshacer.`)) {
        return;
    }

    try {
        console.log(`🗑️ Eliminando definitivamente documento ${documentId}...`);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/trash/permanent/${documentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Error al eliminar documento');
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert('Documento eliminado definitivamente', 'success');
            await loadTrash(); // Recargar papelera
        }
    } catch (error) {
        console.error('❌ Error eliminando documento:', error);
        showAlert('Error al eliminar documento', 'error');
    }
}

/**
 * Vaciar papelera completamente
 */
export async function emptyTrash() {
    if (!confirm('⚠️ ADVERTENCIA: Esto eliminará DEFINITIVAMENTE todos los documentos en la papelera.\n\n¿Estás seguro de continuar?')) {
        return;
    }

    try {
        console.log('🧹 Vaciando papelera...');
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/trash/cleanup`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Error al vaciar papelera');
        }

        const data = await response.json();
        
        if (data.success) {
            showAlert(`Papelera vaciada: ${data.eliminados} documento(s) eliminados`, 'success');
            await loadTrash(); // Recargar papelera vacía
        }
    } catch (error) {
        console.error('❌ Error vaciando papelera:', error);
        showAlert('Error al vaciar papelera', 'error');
    }
}

// =============================================================================
// FUNCIONES DE UI
// =============================================================================

/**
 * Renderizar tabla de papelera
 */
function renderTrashTable(documentos) {
    const tableBody = document.querySelector('#trashTable tbody');
    const emptyState = document.getElementById('trashEmptyState');
    const trashStats = document.getElementById('trashStats');

    if (!tableBody) {
        console.error('❌ No se encontró tabla de papelera');
        return;
    }

    // Actualizar estadísticas
    if (trashStats) {
        const totalSize = documentos.reduce((sum, doc) => sum + doc.tamano_archivo, 0);
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        trashStats.innerHTML = `
            <p><strong>${documentos.length}</strong> documento(s) en papelera</p>
            <p>Espacio ocupado: <strong>${sizeInMB} MB</strong></p>
        `;
    }

    // Si está vacía
    if (documentos.length === 0) {
        if (emptyState) {
            emptyState.style.display = 'flex';
        }
        tableBody.innerHTML = '';
        return;
    }

    // Ocultar estado vacío
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Renderizar documentos
    tableBody.innerHTML = documentos.map(doc => {
        const fechaEliminacion = new Date(doc.fechaEliminacion).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Color del contador según días restantes
        let contadorClass = 'trash-counter-safe';
        if (doc.diasRestantes <= 7) contadorClass = 'trash-counter-warning';
        if (doc.diasRestantes <= 3) contadorClass = 'trash-counter-danger';
        if (doc.seEliminaAutomaticamente) contadorClass = 'trash-counter-expired';

        const personaNombre = doc.persona_id?.nombre || 'No asignado';

        return `
            <tr class="trash-item ${doc.seEliminaAutomaticamente ? 'trash-item-expired' : ''}">
                <td>
                    <div class="document-cell">
                        <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)} file-icon"></i>
                        <div>
                            <strong>${doc.nombre_original}</strong>
                            <small>${doc.categoria || 'Sin categoría'}</small>
                        </div>
                    </div>
                </td>
                <td>${personaNombre}</td>
                <td>${fechaEliminacion}</td>
                <td>
                    <span class="trash-counter ${contadorClass}">
                        ${doc.seEliminaAutomaticamente ? 
                            '<i class="fas fa-exclamation-triangle"></i> Programado para eliminar' : 
                            `<i class="fas fa-clock"></i> ${doc.diasRestantes} día(s)`}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button 
                            class="btn-icon btn-icon--success" 
                            onclick="window.restoreDocument('${doc._id}')"
                            title="Restaurar documento">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button 
                            class="btn-icon btn-icon--danger" 
                            onclick="window.deleteDocumentPermanently('${doc._id}', '${doc.nombre_original}')"
                            title="Eliminar definitivamente">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Obtener icono según tipo de archivo
 */
function getFileIcon(tipoArchivo) {
    const tipo = tipoArchivo.toLowerCase();
    
    if (tipo.includes('pdf')) return 'pdf';
    if (tipo.includes('word') || tipo.includes('doc')) return 'word';
    if (tipo.includes('excel') || tipo.includes('sheet')) return 'excel';
    if (tipo.includes('image') || tipo.includes('png') || tipo.includes('jpg')) return 'image';
    if (tipo.includes('text')) return 'alt';
    
    return 'alt';
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================

window.restoreDocument = restoreDocument;
window.deleteDocumentPermanently = deleteDocumentPermanently;
window.emptyTrash = emptyTrash;
