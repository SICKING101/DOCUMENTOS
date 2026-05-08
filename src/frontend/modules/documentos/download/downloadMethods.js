import { CONFIG } from '../../../config.js';
import { showAlert } from '../../../utils.js';

/**
 * Descarga un documento usando método simple (abrir URL).
 * @param {string} id - ID del documento a descargar
 */
export async function downloadDocumentSimple(id) {
    const doc = window.appState.documents.find(d => d._id === id);
    if (!doc) {
        showAlert('Documento no encontrado', 'error');
        return;
    }
    
    console.log('⚡ Descarga simple para:', doc.nombre_original);
    
    const url = `${CONFIG.API_BASE_URL}/documents/${id}/download?simple=true&t=${Date.now()}`;
    
    // Método ultra simple: abrir URL
    window.open(url, '_blank');
    
    showAlert(`Descargando: ${doc.nombre_original}`, 'info');
}

/**
 * Descarga un documento usando método alternativo (formulario oculto).
 * Útil para casos donde el método principal falla.
 * @param {string} id - ID del documento a descargar
 * @returns {Promise<boolean>} - True si la descarga fue exitosa
 */
export async function downloadDocumentAlternative(id) {
    console.group('🔄 DESCARGAR DOCUMENTO - MÉTODO ALTERNATIVO');
    
    try {
        const doc = window.appState.documents.find(d => d._id === id);
        if (!doc) {
            throw new Error('Documento no encontrado');
        }
        
        const fileName = doc.nombre_original;
        const endpoint = `${CONFIG.API_BASE_URL}/documents/${id}/download`;
        
        console.log('📄 Usando método alternativo para:', fileName);
        showAlert(`Descargando: ${fileName}...`, 'info');
        
        // Crear formulario oculto
        const form = document.createElement('form');
        form.method = 'GET';
        form.action = endpoint;
        form.target = '_blank';
        form.style.display = 'none';
        
        // Agregar parámetros
        const timestampInput = document.createElement('input');
        timestampInput.type = 'hidden';
        timestampInput.name = 't';
        timestampInput.value = Date.now();
        form.appendChild(timestampInput);
        
        // Agregar al body y enviar
        document.body.appendChild(form);
        form.submit();
        
        // Limpiar
        setTimeout(() => {
            if (form.parentNode) {
                document.body.removeChild(form);
            }
        }, 3000);
        
        console.log('✅ Formulario enviado para descarga');
        console.groupEnd();
        return true;
        
    } catch (error) {
        console.error('❌ Error en método alternativo:', error);
        showAlert(`Error: ${error.message}`, 'error');
        console.groupEnd();
        return false;
    }
}
