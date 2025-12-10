import { CONFIG } from '../../../config.js';
import { showAlert, formatFileSize } from '../../../utils.js';

/**
 * Descarga un documento con manejo robusto de errores.
 * Usa enlace temporal para la descarga.
 * @param {string} id - ID del documento a descargar
 * @returns {Promise<boolean>} - True si la descarga fue exitosa
 */
export async function downloadDocument(id) {
    console.group('🚀 DESCARGAR DOCUMENTO');
    
    try {
        // Verificar que estamos en un navegador
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            throw new Error('Este método solo funciona en el navegador');
        }
        
        // Buscar documento
        const doc = window.appState.documents.find(d => d._id === id);
        if (!doc) {
            throw new Error('Documento no encontrado');
        }
        
        const fileName = doc.nombre_original;
        
        console.log('📄 Descargando:', {
            id: id,
            nombre: fileName,
            tipo: doc.tipo_archivo
        });
        
        showAlert(`Iniciando descarga: ${fileName}`, 'info');
        
        // URL del endpoint
        const endpoint = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        
        // Agregar parámetros para evitar caché
        const url = new URL(endpoint);
        url.searchParams.append('t', Date.now());
        url.searchParams.append('filename', fileName);
        
        const finalUrl = url.toString();
        console.log('🔗 URL final:', finalUrl);
        
        // Método: Enlace temporal (UNICAMENTE ESTE MÉTODO)
        const link = document.createElement('a');
        link.href = finalUrl;
        link.download = fileName;
        
        // Para documentos no-imagen, abrir en nueva pestaña
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(fileExtension);
        const isPDF = fileExtension === 'pdf';
        const isText = ['txt', 'csv', 'json', 'xml', 'html', 'htm'].includes(fileExtension);
        
        // Solo abrir en nueva pestaña para PDFs o texto
        if (isPDF || isText) {
            link.target = '_blank';
        }
        // Para imágenes, usar descarga directa
        // Para otros tipos (Excel, Word, etc.), también descarga directa
        
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        
        // Agregar al body
        document.body.appendChild(link);
        
        // Hacer clic UNA VEZ
        link.click();
        
        // Limpiar después de un tiempo
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
        }, 3000);
        
        console.log('✅ Descarga iniciada');
        showAlert(`Descarga iniciada: ${fileName}`, 'success');
        
        // NO ABRIR EN NUEVA PESTAÑA - ESTO CAUSA LA DESCARGA DOBLE
        // Si el usuario quiere abrir en nueva pestaña, puede hacerlo manualmente
        
        console.groupEnd();
        return true;
        
    } catch (error) {
        console.error('❌ Error en descarga:', error);
        
        // Mostrar error específico
        let errorMessage = `Error: ${error.message}`;
        
        if (error.message.includes('document is not defined')) {
            errorMessage = 'Error del navegador. Intenta recargar la página.';
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
            errorMessage = 'Error de red. Verifica tu conexión a internet.';
        }
        
        showAlert(errorMessage, 'error');
        console.groupEnd();
        return false;
    }
}

/**
 * Función global para descargar documentos desde modales de vista previa.
 * @param {string} documentId - ID del documento a descargar
 */
export function downloadDocumentFromPreview(documentId) {
    downloadDocument(documentId);
}