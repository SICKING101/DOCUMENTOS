import { CONFIG } from './config.js';
import { showAlert } from './utils.js';

// =============================================================================
// 1. FUNCIÓN PRINCIPAL DE LLAMADAS A LA API
// =============================================================================

/**
 * 1.1 Función auxiliar genérica para llamadas a la API
 * Maneja todas las solicitudes HTTP al backend, incluyendo gestión de headers,
 * manejo de errores y procesamiento de respuestas JSON.
 */
async function apiCall(endpoint, options = {}) {
    try {
        console.log(`📡 API Call: ${CONFIG.API_BASE_URL}${endpoint}`, options.method || 'GET');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        if (finalOptions.body && typeof finalOptions.body === 'object' && !(finalOptions.body instanceof FormData)) {
            finalOptions.body = JSON.stringify(finalOptions.body);
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, finalOptions);

        console.log(`📥 API Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', errorText);
            throw new Error(`Error HTTP ${response.status}: ${errorText}`);
        }

        // Verificar tipo de contenido
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // Para respuestas que no son JSON (como archivos)
            return response;
        }
        
    } catch (error) {
        console.error('💥 Error en API call:', error);
        throw error;
    }
}

// =============================================================================
// 2. FUNCIONES ESPECIALIZADAS PARA DESCARGAS DE ARCHIVOS
// =============================================================================

/**
 * 2.1 Función especializada para descargar archivos
 * Gestiona la descarga de archivos binarios desde el servidor, incluyendo
 * manejo de blobs, creación de URLs temporales y disparo de descargas.
 */
async function downloadFileApi(endpoint, fileName, options = {}) {
    console.group('📥 DOWNLOAD FILE API');
    console.log('📋 Parámetros:', { endpoint, fileName, options });
    
    try {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        console.log('🔗 URL completa:', url);
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': '*/*'
            },
            credentials: 'include',
            timeout: CONFIG.DOWNLOAD_TIMEOUT
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        // Agregar timestamp para evitar caché
        const finalUrl = new URL(url);
        finalUrl.searchParams.append('_t', Date.now());
        
        console.log('🔗 URL con timestamp:', finalUrl.toString());
        
        // Intentar la descarga
        const response = await fetch(finalUrl.toString(), finalOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Obtener el blob
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('Archivo vacío recibido');
        }
        
        console.log(`✅ Blob recibido: ${blob.size} bytes, tipo: ${blob.type}`);
        
        // Verificar si es un error HTML disfrazado
        if (blob.type.includes('text/html') && blob.size < 5000) {
            const text = await blob.text();
            if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('Error')) {
                throw new Error('Recibió una página de error HTML en lugar del archivo');
            }
        }
        
        // Crear URL para el blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Crear elemento de descarga
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        
        // Agregar atributos para mejor compatibilidad
        link.setAttribute('type', blob.type);
        link.setAttribute('download', fileName);
        link.style.display = 'none';
        
        // Agregar al DOM
        document.body.appendChild(link);
        
        // Crear evento de clic
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: false
        });
        
        // Disparar el evento
        link.dispatchEvent(clickEvent);
        
        // También intentar con click nativo
        link.click();
        
        // Limpiar después de un tiempo
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
            window.URL.revokeObjectURL(blobUrl);
        }, 2000);
        
        console.log('✅ Descarga iniciada exitosamente');
        console.groupEnd();
        
        return true;
        
    } catch (error) {
        console.error('❌ ERROR en downloadFileApi:', error);
        console.groupEnd();
        throw error;
    }
}

/**
 * 2.2 Verificar disponibilidad de endpoint de descarga
 * Realiza una petición HEAD para verificar si un endpoint de descarga está activo
 * antes de intentar la descarga completa.
 */
async function checkDownloadEndpoint(fileId) {
    try {
        console.log('🔍 Verificando endpoint de descarga para:', fileId);
        
        const endpoint = `/documents/${fileId}/download`;
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        
        // Hacer HEAD request para verificar
        const response = await fetch(url, {
            method: 'HEAD',
            headers: {
                'Accept': '*/*'
            }
        });
        
        console.log('📊 Resultado HEAD:', {
            ok: response.ok,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        return response.ok;
        
    } catch (error) {
        console.error('❌ Error verificando endpoint:', error);
        return false;
    }
}

/**
 * 2.3 Obtener información detallada del archivo
 * Recupera metadatos específicos de un archivo antes de intentar la descarga.
 */
async function getFileInfo(fileId) {
    try {
        const data = await apiCall(`/documents/${fileId}/info`);
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo info del archivo:', error);
        throw error;
    }
}

// =============================================================================
// 3. FUNCIONES DE DIAGNÓSTICO Y DEBUG
// =============================================================================

/**
 * 3.1 Probar múltiples endpoints de descarga
 * Evalúa diferentes rutas de API para encontrar el endpoint funcional
 * para descargar un archivo específico.
 */
async function testDownloadEndpoints(fileId) {
    const endpoints = [
        `/documents/${fileId}/download`,
        `/documents/${fileId}/file`,
        `/documents/${fileId}/raw`
    ];
    
    const results = [];
    
    for (const endpoint of endpoints) {
        try {
            const url = `${CONFIG.API_BASE_URL}${endpoint}`;
            const response = await fetch(url, { method: 'HEAD' });
            
            results.push({
                endpoint,
                url,
                available: response.ok,
                status: response.status,
                contentType: response.headers.get('content-type')
            });
        } catch (error) {
            results.push({
                endpoint,
                available: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * 3.2 Debug detallado de descarga
 * Herramienta de diagnóstico completa que analiza todos los aspectos
 * de una descarga fallida para identificar la causa raíz.
 */
async function debugDownload(fileId) {
    console.group('🐛 DEBUG DE DESCARGA DETALLADO');
    
    try {
        // 1. Obtener información del documento
        const documents = window.appState?.documents || [];
        const doc = documents.find(d => d._id === fileId);
        
        if (!doc) {
            console.error('❌ Documento no encontrado en appState');
            console.groupEnd();
            return null;
        }
        
        console.log('📄 INFORMACIÓN DEL DOCUMENTO:');
        console.table({
            'ID': doc._id,
            'Nombre': doc.nombre_original,
            'Tipo': doc.tipo_archivo,
            'Tamaño': doc.tamano_archivo,
            'Cloudinary URL': doc.url_cloudinary || doc.cloudinary_url,
            'URL Disponible': !!(doc.url_cloudinary || doc.cloudinary_url)
        });
        
        // 2. Verificar endpoints del servidor
        console.log('🔍 VERIFICANDO ENDPOINTS DEL SERVIDOR:');
        const endpointsTest = await testDownloadEndpoints(fileId);
        console.table(endpointsTest);
        
        // 3. Verificar conexión a Cloudinary
        console.log('☁️ VERIFICANDO CLOUDINARY:');
        if (doc.url_cloudinary || doc.cloudinary_url) {
            const cloudinaryUrl = doc.url_cloudinary || doc.cloudinary_url;
            try {
                const response = await fetch(cloudinaryUrl, { method: 'HEAD' });
                console.log('✅ Cloudinary accesible:', {
                    ok: response.ok,
                    status: response.status,
                    contentType: response.headers.get('content-type'),
                    contentLength: response.headers.get('content-length')
                });
            } catch (error) {
                console.error('❌ Cloudinary no accesible:', error.message);
            }
        } else {
            console.log('❌ No hay URL de Cloudinary disponible');
        }
        
        // 4. Recomendaciones
        console.log('💡 RECOMENDACIONES:');
        const extension = doc.nombre_original.split('.').pop().toLowerCase();
        
        if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
            console.log('   • Usar descarga directa desde Cloudinary');
            console.log('   • Agregar fl_attachment para forzar descarga');
        } else if (extension === 'pdf') {
            console.log('   • Usar endpoint del servidor (/download)');
            console.log('   • Verificar headers Content-Type: application/pdf');
        } else if (['doc', 'docx', 'xls', 'xlsx'].includes(extension)) {
            console.log('   • Requiere endpoint del servidor');
            console.log('   • Asegurar headers Content-Type correctos');
            console.log('   • Puede necesitar fl_attachment en Cloudinary');
        }
        
        return {
            document: doc,
            endpoints: endpointsTest,
            recommendations: {
                bestStrategy: endpointsTest.find(e => e.available) ? 'server' : 'cloudinary',
                extension: extension
            }
        };
        
    } catch (error) {
        console.error('❌ Error en debug:', error);
        return null;
    } finally {
        console.groupEnd();
    }
}

// =============================================================================
// 4. EXPORTACIONES DE FUNCIONES
// =============================================================================

/**
 * 4.1 Exportar todas las funciones de API
 * Hace disponibles las funciones de llamada a API, descarga y diagnóstico
 * para su uso en otros módulos de la aplicación.
 */
export { 
    apiCall,
    downloadFileApi,
    checkDownloadEndpoint,
    getFileInfo,
    testDownloadEndpoints,
    debugDownload
};