// ============================================================================
// src/frontend/hooks/usePermisos.js
// ============================================================================
// HOOK PARA USAR PERMISOS EN COMPONENTES
// ============================================================================

import permisosService from '../services/permisos.js';

class UsePermisos {
    constructor() {
        this.service = permisosService;
    }

    /**
     * Verificar permiso y mostrar notificación si no tiene
     */
    verificarPermiso(permiso, opciones = {}) {
        const tiene = this.service.tienePermiso(permiso);
        
        if (!tiene && opciones.mostrarSiNo) {
            this.service.mostrarPermisoDenegado(permiso, opciones);
        }
        
        return tiene;
    }

    /**
     * Verificar múltiples permisos
     */
    verificarPermisos(permisos, modo = 'some') {
        if (modo === 'some') {
            return this.service.tieneAlgunPermiso(permisos);
        }
        return this.service.tieneTodosPermisos(permisos);
    }

    /**
     * Renderizar condicional basado en permisos
     */
    siTiene(permiso, elemento, sino = null) {
        if (this.service.tienePermiso(permiso)) {
            return elemento;
        }
        return sino;
    }

    /**
     * Decorador para funciones que requieren permiso
     */
    conPermiso(permiso, funcion, opciones = {}) {
        return (...args) => {
            if (this.service.tienePermiso(permiso)) {
                return funcion(...args);
            }
            
            this.service.mostrarPermisoDenegado(permiso, {
                titulo: opciones.titulo,
                mensaje: opciones.mensaje || 'No tienes permiso para realizar esta acción',
                ...opciones
            });
            
            return null;
        };
    }

    /**
     * Wrapper para fetch que maneja permisos automáticamente
     */
    async fetchConPermiso(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            return await this.service.procesarRespuesta(response, options);
            
        } catch (error) {
            console.error('Error en fetch:', error);
            
            if (options.mostrarError !== false) {
                this.service.mostrarError(error.message);
            }
            
            throw error;
        }
    }
}

export default new UsePermisos();