// ============================================================================
// src/frontend/services/permisos.js
// ============================================================================
// SERVICIO DE PERMISOS PARA EL FRONTEND
// Maneja la verificación de permisos y muestra notificaciones amigables
// ============================================================================

class PermisosService {
    constructor() {
        this.permisosCache = null;
        this.esAdmin = false;
        this.cargando = false;
        this.observadores = [];
    }

    /**
     * Inicializar el servicio (llamar al inicio)
     */
    async init() {
        if (this.permisosCache) return this.permisosCache;
        
        try {
            this.cargando = true;
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.warn('No hay token, permisos no disponibles');
                return null;
            }

            const response = await fetch('/api/auth/mis-permisos', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al obtener permisos');
            }

            const data = await response.json();
            
            if (data.success) {
                this.permisosCache = data.permisos || [];
                this.esAdmin = data.isAdmin || false;
                this.notificarCambio();
                return this.permisosCache;
            }
            
            return null;

        } catch (error) {
            console.error('Error cargando permisos:', error);
            this.mostrarErrorCarga(error);
            return null;
        } finally {
            this.cargando = false;
        }
    }

    /**
     * Verificar si tiene un permiso específico
     */
    tienePermiso(permiso) {
        if (this.esAdmin) return true;
        if (!this.permisosCache) return false;
        return this.permisosCache.includes(permiso);
    }

    /**
     * Verificar si tiene ALGUNO de los permisos
     */
    tieneAlgunPermiso(permisos) {
        if (this.esAdmin) return true;
        if (!this.permisosCache) return false;
        return permisos.some(p => this.permisosCache.includes(p));
    }

    /**
     * Verificar si tiene TODOS los permisos
     */
    tieneTodosPermisos(permisos) {
        if (this.esAdmin) return true;
        if (!this.permisosCache) return false;
        return permisos.every(p => this.permisosCache.includes(p));
    }

    /**
     * Mostrar notificación de permiso denegado
     */
    mostrarPermisoDenegado(permiso, opciones = {}) {
        const { 
            titulo = 'Permiso denegado',
            mensaje = `No tienes permiso para realizar esta acción`,
            duracion = 5000,
            accion = null
        } = opciones;

        // Usar el sistema de notificaciones existente
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion({
                tipo: 'warning',
                titulo,
                mensaje,
                duracion,
                icono: '🔒',
                accion
            });
        } else {
            // Fallback a alert nativo pero más amigable
            console.warn(`🔒 ${titulo}: ${mensaje}`);
            
            // Crear toast temporal si no hay sistema de notificaciones
            this.crearToast(titulo, mensaje, duracion);
        }
    }

    /**
     * Crear toast notification de fallback
     */
    crearToast(titulo, mensaje, duracion = 5000) {
        // Verificar si ya existe un contenedor de toasts
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            color: #856404;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            min-width: 300px;
            animation: slideIn 0.3s ease;
            font-family: sans-serif;
        `;

        toast.innerHTML = `
            <strong style="display: block; margin-bottom: 5px;">🔒 ${titulo}</strong>
            <div style="font-size: 14px;">${mensaje}</div>
        `;

        container.appendChild(toast);

        // Animar entrada
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);

        // Auto remover después de la duración
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duracion);
    }

    /**
     * Procesar respuesta de API con posible error de permisos
     */
    async procesarRespuesta(response, opciones = {}) {
        const { 
            mostrarError = true,
            accion = null,
            contexto = 'operación'
        } = opciones;

        // Si la respuesta es exitosa, retornar los datos
        if (response.ok) {
            const data = await response.json();
            return data;
        }

        try {
            const errorData = await response.json();
            
            // Verificar si es un error amigable de permisos
            if (errorData.friendly && errorData.type === 'permission-denied') {
                if (mostrarError) {
                    this.mostrarPermisoDenegado(errorData.permiso, {
                        titulo: errorData.title,
                        mensaje: errorData.message,
                        duracion: errorData.duration || 5000,
                        accion: errorData.action
                    });
                }
                
                // No lanzar error, solo retornar null indicando permiso denegado
                return {
                    success: false,
                    permissionDenied: true,
                    message: errorData.message
                };
            }

            // Otros tipos de errores
            if (mostrarError) {
                this.mostrarError(errorData.message || 'Error en la operación');
            }

            throw new Error(errorData.message || 'Error desconocido');

        } catch (error) {
            if (error.name !== 'Error' || !error.message.includes('Error desconocido')) {
                throw error;
            }
            
            // Error de parsing JSON u otro
            console.error('Error procesando respuesta:', error);
            throw new Error('Error al procesar la respuesta del servidor');
        }
    }

    /**
     * Mostrar error genérico
     */
    mostrarError(mensaje) {
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion({
                tipo: 'error',
                titulo: 'Error',
                mensaje
            });
        } else {
            alert(`❌ Error: ${mensaje}`);
        }
    }

    /**
     * Mostrar error de carga de permisos
     */
    mostrarErrorCarga(error) {
        console.warn('No se pudieron cargar los permisos, usando modo limitado');
        
        // Crear indicador visual de modo limitado
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: #fff3cd;
            color: #856404;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            z-index: 9998;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        `;
        indicator.innerHTML = '🔒 Modo limitado - Sin permisos';
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 5000);
    }

    /**
     * Limpiar caché de permisos
     */
    limpiarCache() {
        this.permisosCache = null;
        this.esAdmin = false;
        this.notificarCambio();
    }

    /**
     * Suscribirse a cambios en permisos
     */
    suscribir(callback) {
        this.observadores.push(callback);
        if (this.permisosCache) {
            callback(this.permisosCache, this.esAdmin);
        }
    }

    /**
     * Notificar a observadores
     */
    notificarCambio() {
        this.observadores.forEach(cb => {
            try {
                cb(this.permisosCache, this.esAdmin);
            } catch (e) {
                console.error('Error en observador de permisos:', e);
            }
        });
    }
}

// Exportar instancia única
export default new PermisosService();