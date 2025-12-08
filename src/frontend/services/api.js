import { CONFIG } from '../config.js';
import { showAlert } from '../utils.js';

// =============================================================================
// 1. CLASE PRINCIPAL DEL SERVICIO API
// =============================================================================

class apiCall {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
    }

    // =========================================================================
    // 1.1 FUNCIÓN PRINCIPAL DE LLAMADAS A LA API
    // =========================================================================

    /**
     * Función auxiliar genérica para llamadas a la API
     * Maneja todas las solicitudes HTTP al backend, incluyendo gestión de headers,
     * manejo de errores y procesamiento de respuestas JSON.
     */
    async call(endpoint, options = {}) {
        try {
            console.log(`📡 API Call: ${this.baseURL}${endpoint}`, options.method || 'GET');
            
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

            const response = await fetch(`${this.baseURL}${endpoint}`, finalOptions);

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

    // =========================================================================
    // 2. FUNCIONES ESPECIALIZADAS PARA DESCARGAS DE ARCHIVOS
    // =========================================================================

    /**
     * Función especializada para descargar archivos
     * Gestiona la descarga de archivos binarios desde el servidor, incluyendo
     * manejo de blobs, creación de URLs temporales y disparo de descargas.
     */
    async downloadFile(endpoint, fileName, options = {}) {
        console.group('📥 DOWNLOAD FILE API');
        console.log('📋 Parámetros:', { endpoint, fileName, options });
        
        try {
            const url = `${this.baseURL}${endpoint}`;
            
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
     * Verificar disponibilidad de endpoint de descarga
     * Realiza una petición HEAD para verificar si un endpoint de descarga está activo
     * antes de intentar la descarga completa.
     */
    async checkDownloadEndpoint(fileId) {
        try {
            console.log('🔍 Verificando endpoint de descarga para:', fileId);
            
            const endpoint = `/documents/${fileId}/download`;
            const url = `${this.baseURL}${endpoint}`;
            
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
     * Obtener información detallada del archivo
     * Recupera metadatos específicos de un archivo antes de intentar la descarga.
     */
    async getFileInfo(fileId) {
        try {
            const data = await this.call(`/documents/${fileId}/info`);
            return data;
        } catch (error) {
            console.error('❌ Error obteniendo info del archivo:', error);
            throw error;
        }
    }

    // =========================================================================
    // 3. FUNCIONES DE DIAGNÓSTICO Y DEBUG
    // =========================================================================

    /**
     * Probar múltiples endpoints de descarga
     * Evalúa diferentes rutas de API para encontrar el endpoint funcional
     * para descargar un archivo específico.
     */
    async testDownloadEndpoints(fileId) {
        const endpoints = [
            `/documents/${fileId}/download`,
            `/documents/${fileId}/file`,
            `/documents/${fileId}/raw`
        ];
        
        const results = [];
        
        for (const endpoint of endpoints) {
            try {
                const url = `${this.baseURL}${endpoint}`;
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
     * Debug detallado de descarga
     * Herramienta de diagnóstico completa que analiza todos los aspectos
     * de una descarga fallida para identificar la causa raíz.
     */
    async debugDownload(fileId) {
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
            const endpointsTest = await this.testDownloadEndpoints(fileId);
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

    // =========================================================================
    // 4. MÉTODOS PARA ENDPOINTS ESPECÍFICOS (FACHADA)
    // =========================================================================

    // Dashboard
    async getDashboardData() {
        return this.call('/dashboard');
    }

    // Personas
    async getPersons() {
        return this.call('/persons');
    }

    async createPerson(personData) {
        return this.call('/persons', {
            method: 'POST',
            body: personData
        });
    }

    async updatePerson(id, personData) {
        return this.call(`/persons/${id}`, {
            method: 'PUT',
            body: personData
        });
    }

    async deletePerson(id) {
        return this.call(`/persons/${id}`, {
            method: 'DELETE'
        });
    }

    // Documentos
    async getDocuments() {
        return this.call('/documents');
    }

    async uploadDocument(formData) {
        return this.call('/documents', {
            method: 'POST',
            body: formData,
            headers: {} // No Content-Type para FormData, el navegador lo maneja
        });
    }

    async deleteDocument(id) {
        return this.call(`/documents/${id}`, {
            method: 'DELETE'
        });
    }

    async downloadDocument(id, filename) {
        const endpoint = `/documents/${id}/download${filename ? `?filename=${encodeURIComponent(filename)}` : ''}`;
        return this.downloadFile(endpoint, filename || 'documento');
    }

    async getDocumentContent(id) {
        return this.call(`/documents/${id}/content`);
    }

    async previewDocument(id) {
        return this.call(`/documents/${id}/preview`);
    }

    // Categorías
    async getCategories() {
        return this.call('/categories');
    }

    async createCategory(categoryData) {
        return this.call('/categories', {
            method: 'POST',
            body: categoryData
        });
    }

    async updateCategory(id, categoryData) {
        return this.call(`/categories/${id}`, {
            method: 'PUT',
            body: categoryData
        });
    }

    async deleteCategory(id) {
        return this.call(`/categories/${id}`, {
            method: 'DELETE'
        });
    }

    // Reportes
    async generateExcelReport(reportData) {
        return this.call('/reports/excel', {
            method: 'POST',
            body: reportData
        });
    }

    async generatePDFReport(reportData) {
        return this.call('/reports/pdf', {
            method: 'POST',
            body: reportData
        });
    }

    async generateCSVReport(reportData) {
        return this.call('/reports/csv', {
            method: 'POST',
            body: reportData
        });
    }

    // Tareas
    async getTasks() {
        return this.call('/tasks');
    }

    async createTask(taskData) {
        return this.call('/tasks', {
            method: 'POST',
            body: taskData
        });
    }

    async updateTask(id, taskData) {
        return this.call(`/tasks/${id}`, {
            method: 'PUT',
            body: taskData
        });
    }

    async deleteTask(id) {
        return this.call(`/tasks/${id}`, {
            method: 'DELETE'
        });
    }

    async updateTaskStatus(id, status) {
        return this.call(`/tasks/${id}/status`, {
            method: 'PATCH',
            body: { status }
        });
    }

    async getTasksStats() {
        return this.call('/tasks/stats');
    }

    // Notificaciones
    async getNotifications(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.call(`/notifications${params ? `?${params}` : ''}`);
    }

    async getUnreadNotifications() {
        return this.call('/notifications/unread');
    }

    async getNotificationsStats() {
        return this.call('/notifications/stats');
    }

    async markNotificationAsRead(id) {
        return this.call(`/notifications/${id}/read`, {
            method: 'PATCH'
        });
    }

    async markAllNotificationsAsRead() {
        return this.call('/notifications/read-all', {
            method: 'PATCH'
        });
    }

    async deleteNotification(id) {
        return this.call(`/notifications/${id}`, {
            method: 'DELETE'
        });
    }

    async cleanupNotifications(days = 30) {
        return this.call('/notifications/cleanup', {
            method: 'POST',
            body: { dias: days }
        });
    }
}

// =============================================================================
// 5. CREAR INSTANCIA ÚNICA Y EXPORTAR
// =============================================================================

// Crear instancia única
const api = new apiCall();

// Exportar tanto la clase como la instancia
export { apiCall, api };