// ============================================================================
// src/frontend/services/permisos.js - VALIDADOR GLOBAL CON ALERTAS VISUALES
// ============================================================================

class ValidadorPermisos {
    constructor() {
        this.permisos = [];
        this.esAdmin = false;
        this.init();
    }

    async init() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('/api/auth/mis-permisos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            if (data.success) {
                this.permisos = data.permisos || [];
                this.esAdmin = data.esAdminUnico || data.rol === 'administrador';
            }
        } catch (error) {
            console.warn('Error cargando permisos:', error);
        }
    }

    // VALIDADOR PRINCIPAL - Retorna true/false y muestra alerta si no tiene permiso
    validar(permiso, opciones = {}) {
        const {
            mostrarAlerta = true,
            accion = 'acceder a esta sección',
            tipo = 'sección'
        } = opciones;

        // Admin siempre tiene permiso
        if (this.esAdmin) return true;

        // Verificar permiso
        const tienePermiso = this.permisos.includes(permiso);

        if (!tienePermiso && mostrarAlerta) {
            this.mostrarAlerta(permiso, accion, tipo);
        }

        return tienePermiso;
    }

    // Mostrar alerta visual (NO error en consola)
    mostrarAlerta(permiso, accion, tipo) {
        const nombreSeccion = permiso.replace('ver_', '').replace('acciones_', '');
        
        // Usar sistema de notificaciones existente o crear alerta flotante
        if (window.mostrarNotificacion) {
            window.mostrarNotificacion({
                tipo: 'warning',
                titulo: '⚠️ Acceso Restringido',
                mensaje: `No tienes permiso para ${accion}`,
                duracion: 4000
            });
        } else {
            // Fallback: Alerta flotante personalizada
            this.crearAlertaFlotante(`🔒 No tienes permiso para ${accion}`);
        }
    }

    crearAlertaFlotante(mensaje) {
        const alerta = document.createElement('div');
        alerta.className = 'alerta-permiso';
        alerta.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f59e0b;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        alerta.innerHTML = `🔒 ${mensaje}`;
        document.body.appendChild(alerta);
        
        setTimeout(() => {
            alerta.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alerta.remove(), 300);
        }, 3000);
    }

    // Validar sección completa (oculta elementos si no tiene permiso)
    validarSeccion(seccionId, permisoRequerido) {
        const seccion = document.getElementById(seccionId);
        if (!seccion) return false;

        if (!this.validar(permisoRequerido, { 
            accion: `ver la sección de ${seccionId}`,
            tipo: 'sección'
        })) {
            seccion.style.display = 'none';
            return false;
        }
        
        seccion.style.display = 'block';
        return true;
    }

    // Decorador para acciones (botones, etc)
    conPermiso(accion, permisoRequerido, callback) {
        return (...args) => {
            if (this.validar(permisoRequerido, { 
                accion: `realizar esta acción`,
                tipo: 'acción'
            })) {
                return callback(...args);
            }
            return null;
        };
    }

    /**
 * Procesar respuesta del servidor y extraer mensaje simple
 */
async procesarRespuesta(response, options = {}) {
    try {
        // Intentar parsear como JSON
        const data = await response.json();
        
        // Si no es exitoso y queremos mostrar error
        if (!response.ok && options.mostrarError !== false) {
            // Extraer SOLO el mensaje, no todo el JSON
            const mensaje = data.message || 'Error en la operación';
            this.mostrarError(mensaje);
        }
        
        return data;
    } catch (error) {
        // Si no es JSON, devolver error genérico
        if (options.mostrarError !== false) {
            this.mostrarError('Error de conexión con el servidor');
        }
        throw error;
    }
}

/**
 * Mostrar error simple
 */
mostrarError(mensaje) {
    if (window.mostrarNotificacion) {
        window.mostrarNotificacion({
            tipo: 'error',
            mensaje: mensaje,
            duracion: 4000
        });
    } else {
        alert(mensaje);
    }
}

}

export default new ValidadorPermisos();