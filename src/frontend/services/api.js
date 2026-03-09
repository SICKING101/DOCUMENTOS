import { CONFIG } from '../config.js';
import { showAlert } from '../utils.js';

class ApiService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.systemStatusCache = {
            data: null,
            timestamp: null,
            ttl: 30000 // 30 segundos de cache
        };
        
        // Verificar si estamos en navegador y detectar entorno
        this.isDevelopment = this.detectDevelopmentEnvironment();
        console.log(`🌍 Entorno detectado: ${this.isDevelopment ? 'Desarrollo' : 'Producción'}`);
    }

    // =========================================================================
    // DETECCIÓN SEGURA DEL ENTORNO (compatible con navegador)
    // =========================================================================
    detectDevelopmentEnvironment() {
        // Método seguro para navegador
        if (typeof window !== 'undefined') {
            // Verificar por hostname local
            const hostname = window.location.hostname;
            const isLocalhost = hostname === 'localhost' || 
                               hostname === '127.0.0.1' || 
                               hostname === '::1' ||
                               hostname.includes('local');
            
            // Verificar por puerto de desarrollo
            const port = window.location.port;
            const isDevPort = port === '3000' || port === '4000' || port === '8080';
            
            // Verificar por parámetros de URL
            const urlParams = new URLSearchParams(window.location.search);
            const hasDebugParam = urlParams.has('debug') || urlParams.has('development');
            
            // Verificar variables globales
            const hasDebugGlobal = window.DEBUG_MODE === true || 
                                  window.ENV === 'development' ||
                                  window.IS_DEVELOPMENT === true;
            
            return isLocalhost || isDevPort || hasDebugParam || hasDebugGlobal;
        }
        
        return false; // Por defecto, asumir producción
    }

    // =========================================================================
    // FUNCIÓN PRINCIPAL DE LLAMADAS A LA API (MEJORADA CON MANEJO DE 403)
    // =========================================================================
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

            // =================================================================
            // MANEJO ESPECIAL PARA ERROR 403 (PERMISOS DENEGADOS)
            // =================================================================
            if (response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Acceso denegado (403):', errorData);
                
                // Disparar evento global para que el sistema de permisos reaccione
                if (typeof window !== 'undefined') {
                    const event = new CustomEvent('auth:permission-denied', { 
                        detail: { 
                            endpoint, 
                            requiredPermission: errorData.requiredPermission,
                            message: errorData.message || 'No tienes permisos para realizar esta acción'
                        } 
                    });
                    window.dispatchEvent(event);
                }
                
                throw new Error(errorData.message || 'No tienes permisos para realizar esta acción');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', errorText);
                
                // Si es un error 404 y estamos en desarrollo, mostrar mensaje más claro
                if (response.status === 404 && this.isDevelopment) {
                    console.warn(`⚠️ Endpoint no encontrado: ${endpoint}. Verifica las rutas en apiRoutes.js`);
                }
                
                throw new Error(`Error HTTP ${response.status}: ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return response;
            }
            
        } catch (error) {
            console.error('💥 Error en API call:', error);
            throw error;
        }
    }

    // =========================================================================
    // FUNCIONES PARA ESTADO DEL SISTEMA (REAL - NO PRUEBA)
    // =========================================================================

    /**
     * Obtiene el estado REAL actual del sistema
     * @returns {Promise} Estado del sistema
     */
    async getSystemStatus(forceRefresh = false) {
        try {
            // Verificar cache si no se fuerza refresco
            if (!forceRefresh && this.systemStatusCache.data && this.systemStatusCache.timestamp) {
                const now = Date.now();
                const cacheAge = now - this.systemStatusCache.timestamp;
                
                if (cacheAge < this.systemStatusCache.ttl) {
                    console.log('📊 Estado del sistema obtenido de caché');
                    return this.systemStatusCache.data;
                }
            }
            
            console.log('🌐 API: Obteniendo estado REAL del sistema...');
            
            const response = await fetch(`${this.baseURL}/support/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                // Intentar endpoint alternativo si el principal falla
                console.warn('⚠️ Endpoint principal falló, intentando alternativo...');
                return await this.getSystemStatusFallback();
            }

            const data = await response.json();
            
            // Validar que la respuesta tenga la estructura esperada
            if (!data || typeof data !== 'object') {
                throw new Error('Respuesta del servidor inválida');
            }
            
            if (!data.services || typeof data.services !== 'object') {
                throw new Error('Estructura de servicios inválida en la respuesta');
            }
            
            // Cachear la respuesta
            this.systemStatusCache = {
                data: data,
                timestamp: Date.now(),
                ttl: 30000 // 30 segundos
            };
            
            console.log('✅ Estado REAL del sistema obtenido correctamente');
            return data;
            
        } catch (error) {
            console.error('💥 Error en getSystemStatus:', error);
            
            // Si hay error, intentar con método de fallback
            try {
                return await this.getSystemStatusFallback();
            } catch (fallbackError) {
                console.error('💥 Error también en fallback:', fallbackError);
                
                // Devolver estado de error genérico
                return this.getDefaultErrorStatus();
            }
        }
    }

    /**
     * Método de fallback para obtener estado del sistema
     */
    async getSystemStatusFallback() {
        try {
            console.log('🔄 Intentando método de fallback para estado del sistema...');
            
            // Intentar con endpoint de health como fallback
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Fallback también falló');
            }

            const healthData = await response.json();
            
            // Crear un estado básico basado en health
            const fallbackStatus = {
                success: true,
                timestamp: new Date().toISOString(),
                overallStatus: 'warning',
                services: {
                    database: {
                        name: 'Base de Datos',
                        status: 'warning',
                        message: 'Estado verificado por health check',
                        details: { fallback: true },
                        timestamp: new Date().toISOString()
                    },
                    system: {
                        name: 'Sistema Principal',
                        status: healthData.success ? 'operational' : 'error',
                        message: healthData.message || 'Estado desconocido',
                        details: healthData,
                        timestamp: new Date().toISOString()
                    },
                    cloudStorage: {
                        name: 'Almacenamiento Cloud',
                        status: 'warning',
                        message: 'No se pudo verificar',
                        details: { fallback: true },
                        timestamp: new Date().toISOString()
                    },
                    emailService: {
                        name: 'Servicio de Email',
                        status: 'warning',
                        message: 'No se pudo verificar',
                        details: { fallback: true },
                        timestamp: new Date().toISOString()
                    }
                },
                metrics: {
                    timestamp: new Date().toISOString(),
                    responseTime: 'N/A',
                    environment: this.isDevelopment ? 'development' : 'production'
                }
            };
            
            console.log('⚠️ Usando estado de fallback del sistema');
            return fallbackStatus;
            
        } catch (error) {
            throw error;
        }
    }

    /**
     * Estado de error por defecto cuando todo falla
     */
    getDefaultErrorStatus() {
        return {
            success: false,
            message: 'No se pudo obtener el estado del sistema',
            timestamp: new Date().toISOString(),
            overallStatus: 'error',
            services: {
                database: {
                    name: 'Base de Datos',
                    status: 'error',
                    message: 'No se pudo verificar',
                    timestamp: new Date().toISOString()
                },
                system: {
                    name: 'Sistema Principal',
                    status: 'error',
                    message: 'Error de conexión con el servidor',
                    timestamp: new Date().toISOString()
                },
                cloudStorage: {
                    name: 'Almacenamiento Cloud',
                    status: 'error',
                    message: 'No se pudo verificar',
                    timestamp: new Date().toISOString()
                },
                emailService: {
                    name: 'Servicio de Email',
                    status: 'error',
                    message: 'No se pudo verificar',
                    timestamp: new Date().toISOString()
                }
            }
        };
    }

    /**
     * Limpia el caché del estado del sistema
     */
    clearSystemStatusCache() {
        this.systemStatusCache = {
            data: null,
            timestamp: null,
            ttl: 30000
        };
        console.log('🗑️ Caché de estado del sistema limpiado');
    }

    // =========================================================================
    // FUNCIONES PARA DESARROLLO (SOLO EN MODO DESARROLLO)
    // =========================================================================
    
    async activateRealErrors(services) {
        // Verificar que estamos en desarrollo
        if (!this.isDevelopment) {
            console.warn('⚠️ Esta función solo está disponible en modo desarrollo');
            return {
                success: false,
                message: 'Solo disponible en modo desarrollo'
            };
        }
        
        try {
            console.log('🔥 API: Activando errores reales:', services);
            
            const response = await fetch(`${this.baseURL}/support/activate-errors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ services }),
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error activando errores');
            }

            return data;
            
        } catch (error) {
            console.error('💥 Error en activateRealErrors:', error);
            throw error;
        }
    }

    async resetRealErrors() {
        // Verificar que estamos en desarrollo
        if (!this.isDevelopment) {
            console.warn('⚠️ Esta función solo está disponible en modo desarrollo');
            return {
                success: false,
                message: 'Solo disponible en modo desarrollo'
            };
        }
        
        try {
            console.log('🔄 API: Restableciendo errores reales');
            
            const response = await fetch(`${this.baseURL}/support/reset-errors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error restableciendo errores');
            }

            return data;
            
        } catch (error) {
            console.error('💥 Error en resetRealErrors:', error);
            throw error;
        }
    }

    async validateSystemErrors() {
        // Verificar que estamos en desarrollo
        if (!this.isDevelopment) {
            console.warn('⚠️ Esta función solo está disponible en modo desarrollo');
            return {
                success: false,
                message: 'Solo disponible en modo desarrollo'
            };
        }
        
        try {
            console.log('🔍 API: Validando errores del sistema');
            
            const response = await fetch(`${this.baseURL}/support/validate-errors`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error validando errores');
            }

            return data;
            
        } catch (error) {
            console.error('💥 Error en validateSystemErrors:', error);
            throw error;
        }
    }

    async simulateRealError(service) {
        // Verificar que estamos en desarrollo
        if (!this.isDevelopment) {
            console.warn('⚠️ Esta función solo está disponible en modo desarrollo');
            return {
                success: false,
                message: 'Solo disponible en modo desarrollo'
            };
        }
        
        try {
            console.log(`🧪 API: Simulando error real en ${service}`);
            
            const response = await fetch(`${this.baseURL}/support/simulate-error/${service}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error simulando error');
            }

            return data;
            
        } catch (error) {
            console.error('💥 Error en simulateRealError:', error);
            throw error;
        }
    }

    async resetAllRealErrors() {
        // Verificar que estamos en desarrollo
        if (!this.isDevelopment) {
            console.warn('⚠️ Esta función solo está disponible en modo desarrollo');
            return {
                success: false,
                message: 'Solo disponible en modo desarrollo'
            };
        }
        
        try {
            console.log('🔄 API: Restableciendo todos los errores reales');
            
            const response = await fetch(`${this.baseURL}/support/reset-all-errors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error restableciendo errores');
            }

            return data;
            
        } catch (error) {
            console.error('💥 Error en resetAllRealErrors:', error);
            throw error;
        }
    }

    // =========================================================================
    // FUNCIONES PARA SOPORTE
    // =========================================================================

    async createTicket(ticketData, files = []) {
        const formData = new FormData();
        
        Object.keys(ticketData).forEach(key => {
            formData.append(key, ticketData[key]);
        });
        
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('files', file);
            });
            console.log(`📤 Enviando ${files.length} archivo(s) con el ticket`);
        }
        
        try {
            const response = await fetch(`${this.baseURL}/support/tickets`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error creando ticket:', error);
            throw error;
        }
    }

    async getFAQ() {
        try {
            const response = await fetch(`${this.baseURL}/support/faq`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo FAQ:', error);
            throw error;
        }
    }

    async getSystemGuide() {
        try {
            const response = await fetch(`${this.baseURL}/support/guide`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo guía:', error);
            throw error;
        }
    }

    // =========================================================================
    // FUNCIONES PARA DESCARGAS
    // =========================================================================

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
            
            const finalUrl = new URL(url);
            finalUrl.searchParams.append('_t', Date.now());
            
            console.log('🔗 URL con timestamp:', finalUrl.toString());
            
            const response = await fetch(finalUrl.toString(), finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            if (blob.size === 0) {
                throw new Error('Archivo vacío recibido');
            }
            
            console.log(`✅ Blob recibido: ${blob.size} bytes, tipo: ${blob.type}`);
            
            if (blob.type.includes('text/html') && blob.size < 5000) {
                const text = await blob.text();
                if (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('Error')) {
                    throw new Error('Recibió una página de error HTML en lugar del archivo');
                }
            }
            
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            link.setAttribute('type', blob.type);
            link.setAttribute('download', fileName);
            link.style.display = 'none';
            
            document.body.appendChild(link);
            
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: false
            });
            
            link.dispatchEvent(clickEvent);
            link.click();
            
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

    // =========================================================================
    // FUNCIONES PARA DOCUMENTOS
    // =========================================================================

    async uploadDocument(formData, documentId = null) {
        console.group('📤 UPLOAD DOCUMENT API');
        console.log('📋 Parámetros:', { 
            documentId, 
            hasFile: formData.has('file'),
            isUpdate: !!documentId 
        });
        
        try {
            let endpoint = '/documents';
            let method = 'POST';
            
            if (documentId) {
                endpoint = `/documents/${documentId}`;
                method = 'PUT';
                
                console.log('🔄 Modo actualización con archivo');
                
                const options = {
                    method: method,
                    body: formData,
                    credentials: 'include'
                };
                
                console.log('📡 Enviando FormData al servidor...');
                const response = await fetch(`${this.baseURL}${endpoint}`, options);
                
                console.log(`📥 Respuesta: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Error del servidor:', errorText);
                    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
                }
                
                const data = await response.json();
                console.log('✅ Upload exitoso:', data);
                console.groupEnd();
                return data;
                
            } else {
                return this.call('/documents', {
                    method: method,
                    body: formData
                });
            }
            
        } catch (error) {
            console.error('💥 Error en uploadDocument:', error);
            console.groupEnd();
            throw error;
        }
    }

    // Agrega esto después del método uploadDocument:

async updateDocument(id, documentData) {
    return this.call(`/documents/${id}`, {
        method: 'PUT',
        body: documentData
    });
}

async patchDocument(id, partialData) {
    return this.call(`/documents/${id}`, {
        method: 'PATCH',
        body: partialData
    });
}

    async getDocuments() {
        return this.call('/documents');
    }

    async deleteDocument(id) {
        return this.call(`/documents/${id}`, {
            method: 'DELETE'
        });
    }

    // =========================================================================
    // FUNCIONES PARA DASHBOARD
    // =========================================================================

    async getDashboardData() {
        return this.call('/dashboard');
    }

    // =========================================================================
    // FUNCIONES PARA PERSONAS (ACTUALIZADAS CON MANEJO DE PERMISOS)
    // =========================================================================

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

    async deactivatePerson(id) {
        return this.call(`/persons/${id}/deactivate`, {
            method: 'PATCH'
        });
    }

    async reactivatePerson(id) {
        return this.call(`/persons/${id}/reactivate`, {
            method: 'PATCH'
        });
    }

    // =========================================================================
    // FUNCIONES PARA CATEGORÍAS
    // =========================================================================

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

    // =========================================================================
    // FUNCIONES PARA DEPARTAMENTOS
    // =========================================================================

    async getDepartments() {
        return this.call('/departments');
    }

    async createDepartment(departmentData) {
        return this.call('/departments', {
            method: 'POST',
            body: departmentData
        });
    }

    async updateDepartment(id, departmentData) {
        return this.call(`/departments/${id}`, {
            method: 'PUT',
            body: departmentData
        });
    }

    async deleteDepartment(id) {
        return this.call(`/departments/${id}`, {
            method: 'DELETE'
        });
    }

    // =========================================================================
    // FUNCIONES PARA TAREAS
    // =========================================================================

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

        async getHighPriorityTasks() {
        return this.call('/tasks/high-priority');
    }

    async getTodayTasks() {
        return this.call('/tasks/today');
    }

    // =========================================================================
    // FUNCIONES PARA NOTIFICACIONES
    // =========================================================================

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

    // =========================================================================
    // FUNCIONES PARA REPORTES
    // =========================================================================

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

    // =========================================================================
    // FUNCIONES DE DIAGNÓSTICO Y DEBUG
    // =========================================================================

    async checkDownloadEndpoint(fileId) {
        try {
            console.log('🔍 Verificando endpoint de descarga para:', fileId);
            
            const endpoint = `/documents/${fileId}/download`;
            const url = `${this.baseURL}${endpoint}`;
            
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

    async getFileInfo(fileId) {
        try {
            const data = await this.call(`/documents/${fileId}/info`);
            return data;
        } catch (error) {
            console.error('❌ Error obteniendo info del archivo:', error);
            throw error;
        }
    }

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

    async debugDownload(fileId) {
        console.group('🐛 DEBUG DE DESCARGA DETALLADO');
        
        try {
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
            
            console.log('🔍 VERIFICANDO ENDPOINTS DEL SERVIDOR:');
            const endpointsTest = await this.testDownloadEndpoints(fileId);
            console.table(endpointsTest);
            
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
    // MÉTODOS AUXILIARES PARA VERIFICACIÓN DEL SISTEMA
    // =========================================================================
    
    /**
     * Verifica si el sistema está completamente operativo
     */
    async isSystemFullyOperational() {
        try {
            const status = await this.getSystemStatus();
            
            if (!status.success) return false;
            
            // Verificar que todos los servicios estén operativos
            const services = status.services || {};
            const allOperational = Object.values(services).every(
                service => service.status === 'operational'
            );
            
            return allOperational;
        } catch (error) {
            console.error('Error verificando estado operacional:', error);
            return false;
        }
    }
    
    /**
     * Obtiene un resumen rápido del estado del sistema
     */
    async getSystemSummary() {
        try {
            const status = await this.getSystemStatus();
            
            if (!status.success) {
                return {
                    operational: false,
                    message: 'No se pudo obtener estado del sistema',
                    timestamp: new Date().toISOString()
                };
            }
            
            const services = status.services || {};
            const errorCount = Object.values(services).filter(
                s => s.status === 'error'
            ).length;
            
            const warningCount = Object.values(services).filter(
                s => s.status === 'warning'
            ).length;
            
            return {
                operational: errorCount === 0,
                overallStatus: status.overallStatus,
                errorCount,
                warningCount,
                services: Object.keys(services).map(key => ({
                    name: services[key].name,
                    status: services[key].status,
                    message: services[key].message
                })),
                timestamp: status.timestamp
            };
        } catch (error) {
            return {
                operational: false,
                message: 'Error obteniendo resumen',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

// =============================================================================
// CREAR INSTANCIA ÚNICA Y EXPORTAR
// =============================================================================

const api = new ApiService();

// Exponer métodos globales para desarrollo (solo en desarrollo)
if (api.isDevelopment) {
    window.debugApi = {
        getSystemStatus: (force) => api.getSystemStatus(force),
        clearCache: () => api.clearSystemStatusCache(),
        isSystemOperational: () => api.isSystemFullyOperational(),
        getSummary: () => api.getSystemSummary(),
        simulateError: (service) => api.simulateRealError(service),
        resetErrors: () => api.resetAllRealErrors(),
        isDevelopment: api.isDevelopment
    };
    
    console.log('🧪 API debug methods available on window.debugApi');
}

export { ApiService, api };