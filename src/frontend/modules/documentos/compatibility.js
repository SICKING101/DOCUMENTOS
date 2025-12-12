// =============================================================================
// src/frontend/modules/documentos/compatibility.js
// =============================================================================

// Este archivo mantiene compatibilidad con el código existente
// que espera estas funciones en el objeto global window

import { api } from '../../services/api.js';           // Corregido: 3 niveles
import { showAlert, formatFileSize } from '../../utils.js'; // Corregido: 3 niveles
import { updateTrashBadge } from '../papelera.js';

// Importar TODO desde progressManager.js en una sola línea
import { 
    updateOverallProgress,
    showUploadProgressContainer,
    hideUploadProgressContainer,
    cancelMultipleUpload as cancelUpload
} from './upload/progressManager.js';

// IMPORTANTE: Importar multipleUploadState desde uploadMultiple.js
import { multipleUploadState } from './upload/uploadMultiple.js';

/**
 * Función de compatibilidad para eliminar documentos.
 */
export async function deleteDocument(id) {
    console.log('🔧 deleteDocument llamada con ID:', id);
    
    if (!confirm('¿Mover este documento a la papelera?')) {
        console.log('⚠️ Usuario canceló la eliminación');
        return;
    }
    
    try {
        console.log('🗑️ Moviendo documento a la papelera:', id);
        console.log('📡 Haciendo llamada DELETE a:', `/documents/${id}`);
        
        const data = await api.call(`/documents/${id}`, { method: 'DELETE' });
        
        console.log('📦 Respuesta del servidor:', data);
        
        if (data.success) {
            showAlert(data.message || 'Documento movido a la papelera', 'success');
            
            // Cargar documentos actualizados
            if (window.loadDocuments) {
                await window.loadDocuments();
            }
            
            // Actualizar badge de papelera
            if (updateTrashBadge) {
                await updateTrashBadge();
            }
            
            if (window.appState && window.appState.currentTab === 'dashboard' && window.loadDashboardData) {
                await window.loadDashboardData();
            }
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error moviendo documento a papelera:', error);
        showAlert('Error al mover documento a la papelera: ' + error.message, 'error');
    }
}

/**
 * Función de compatibilidad para cargar documentos.
 */
export async function loadDocuments() {
    try {
        console.log('📄 Cargando documentos...');
        
        const data = await api.call('/documents');
        
        if (data.success) {
            window.appState.documents = (data.documents || []).map(doc => ({
                ...doc,
                url_cloudinary: doc.url_cloudinary || doc.cloudinary_url
            }));
            
            // Renderizar tabla si la función está disponible
            if (window.renderDocumentsTable) {
                window.renderDocumentsTable();
            }
            
            console.log(`✅ ${window.appState.documents.length} documentos cargados`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        showAlert('Error al cargar documentos: ' + error.message, 'error');
    }
}

/**
 * Diagnóstico de subida múltiple (compatibilidad).
 */
export function debugMultipleUpload() {
    console.group('🐛 DIAGNÓSTICO DE SUBIDA MÚLTIPLE (Compatibilidad)');
    
    if (!multipleUploadState) {
        console.error('❌ Estado de subida múltiple no disponible');
        console.groupEnd();
        return;
    }
    
    console.log('📊 Estado actual:', {
        modo: window.appState?.uploadMode || 'no definido',
        archivosSeleccionados: multipleUploadState.files.length,
        subiendo: multipleUploadState.isUploading,
        tamañoTotal: formatFileSize(multipleUploadState.totalSize)
    });
    
    console.log('📋 Archivos individuales:');
    multipleUploadState.files.forEach((fileObj, index) => {
        console.log(`${index + 1}. ${fileObj.file.name}`, {
            tamaño: formatFileSize(fileObj.file.size),
            estado: fileObj.status,
            progreso: fileObj.progress,
            error: fileObj.error
        });
    });
    
    // Estadísticas
    const stats = multipleUploadState.getStats();
    console.table({
        'Total Archivos': stats.total,
        'Pendientes': stats.pending,
        'Subiendo': stats.uploading,
        'Completados': stats.completed,
        'Fallidos': stats.failed,
        'Tamaño Total': formatFileSize(stats.totalSize),
        'Tamaño Subido': formatFileSize(stats.uploadedSize)
    });
    
    console.groupEnd();
    
    showAlert('Diagnóstico de subida múltiple completado. Revisa la consola.', 'info');
}

/**
 * Prueba la subida múltiple con archivos mock (compatibilidad).
 */
export function testMultipleUploadWithMockFiles() {
    console.group('🧪 TEST CON ARCHIVOS DE PRUEBA (Compatibilidad)');
    
    // Crear archivos de prueba
    const mockFiles = [];
    const fileNames = [
        'documento_prueba_1.pdf',
        'imagen_prueba_1.jpg',
        'texto_prueba_1.txt'
    ];
    
    fileNames.forEach((fileName, index) => {
        const blob = new Blob([`Contenido de prueba ${index + 1}`], { type: 'text/plain' });
        const file = new File([blob], fileName, {
            type: fileName.endsWith('.pdf') ? 'application/pdf' :
                  fileName.endsWith('.jpg') ? 'image/jpeg' :
                  'text/plain',
            lastModified: Date.now()
        });
        
        mockFiles.push(file);
    });
    
    console.log(`📁 ${mockFiles.length} archivos de prueba creados`);
    
    // Cambiar a modo múltiple si no está
    if (window.appState?.uploadMode !== 'multiple' && window.switchUploadMode) {
        window.switchUploadMode('multiple');
    }
    
    // Agregar archivos de prueba
    if (window.handleMultipleFiles) {
        window.handleMultipleFiles(mockFiles);
    }
    
    console.log('✅ Test configurado. Archivos listos para subir.');
    console.groupEnd();
    
    showAlert('Test de subida múltiple configurado. Revisa los archivos de prueba.', 'info');
}

/**
 * Función de compatibilidad para cancelar subida múltiple.
 */
export function cancelMultipleUpload() {
    console.log('⏹️ Cancelando subida múltiple (compatibilidad)...');
    cancelUpload();
}

/**
 * Función de compatibilidad para mostrar progreso de subida.
 */
export function showUploadProgress() {
    console.log('📊 Mostrando progreso de subida (compatibilidad)...');
    showUploadProgressContainer();
}

/**
 * Función de compatibilidad para ocultar progreso de subida.
 */
export function hideUploadProgress() {
    console.log('📊 Ocultando progreso de subida (compatibilidad)...');
    hideUploadProgressContainer();
}

/**
 * Función de compatibilidad para actualizar progreso general.
 */
export function updateUploadProgress() {
    console.log('📈 Actualizando progreso (compatibilidad)...');
    updateOverallProgress();
}

// =============================================================================
// Configuración global para compatibilidad
// =============================================================================

/**
 * Configura todas las funciones de compatibilidad globalmente.
 * Debe llamarse después de importar el módulo.
 */
export function setupCompatibilityGlobals() {
    console.log('🔧 Configurando funciones globales de compatibilidad...');
    
    // Solo configurar si window está disponible
    if (typeof window === 'undefined') return;
    
    // Asignar funciones esenciales
    window.deleteDocument = deleteDocument;
    window.loadDocuments = loadDocuments;
    window.debugMultipleUpload = debugMultipleUpload;
    window.testMultipleUploadWithMockFiles = testMultipleUploadWithMockFiles;
    window.cancelMultipleUpload = cancelMultipleUpload;
    window.showUploadProgress = showUploadProgress;
    window.hideUploadProgress = hideUploadProgress;
    window.updateUploadProgress = updateUploadProgress;
    
    // Agregar función de editar documento
    window.editDocument = async (documentId) => {
        const { openEditDocumentModal } = await import('./modals/editDocumentModal.js');
        return openEditDocumentModal(documentId);
    };
    
    console.log('✅ Funciones globales de compatibilidad configuradas');
}