// ============================================================================
// src/backend/middleware/permisos.js (VERSIÓN COMPLETA)
// ============================================================================
// MIDDLEWARE DE VERIFICACIÓN DE PERMISOS CON RESPUESTAS AMIGABLES
// ============================================================================

import User from '../models/User.js';

/**
 * Middleware para verificar si el usuario tiene un permiso específico
 * @param {string} permiso - ID del permiso requerido (ej. 'ver_documentos')
 */
export const requierePermiso = (permiso) => {
    return async (req, res, next) => {
        try {
            // Verificar autenticación
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    friendly: true,
                    type: 'warning',
                    title: 'Sesión no iniciada',
                    message: 'Por favor inicia sesión para continuar',
                    action: 'redirect',
                    redirectTo: '/login.html'
                });
            }

            // Admin único tiene todos los permisos
            if (req.user.esAdminUnico) {
                return next();
            }

            // Obtener permisos efectivos
            const permisosEfectivos = await req.user.obtenerPermisosEfectivos();
            
            if (permisosEfectivos.includes(permiso)) {
                return next();
            }

            // Buscar información del permiso para mostrar mensaje amigable
            const permisoInfo = await obtenerInfoPermiso(permiso);
            
            // Respuesta amigable - NO es un error crítico
            return res.status(403).json({
                success: false,
                friendly: true,
                type: 'permission-denied',
                title: 'Permiso denegado',
                message: `No tienes permiso para: ${permisoInfo.nombre || permiso}`,
                description: permisoInfo.descripcion || 'Contacta al administrador si necesitas este acceso',
                icon: '🔒',
                action: 'notification', // Solo mostrar notificación, no interrumpir
                showAs: 'toast', // Mostrar como toast notification
                duration: 5000,
                permiso: permiso,
                permisoInfo: permisoInfo
            });

        } catch (error) {
            console.error('Error en middleware de permisos:', error);
            return res.status(500).json({
                success: false,
                friendly: true,
                type: 'error',
                title: 'Error del sistema',
                message: 'Ocurrió un error al verificar permisos',
                action: 'none'
            });
        }
    };
};

/**
 * Middleware para verificar si el usuario tiene ALGUNO de los permisos especificados
 * @param {string[]} permisos - Array de IDs de permisos
 */
export const requiereCualquierPermiso = (permisos) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    friendly: true,
                    type: 'warning',
                    title: 'Sesión no iniciada',
                    message: 'Por favor inicia sesión para continuar',
                    action: 'redirect',
                    redirectTo: '/login.html'
                });
            }

            if (req.user.esAdminUnico) {
                return next();
            }

            const permisosEfectivos = await req.user.obtenerPermisosEfectivos();
            
            const permisosQueTiene = permisos.filter(p => permisosEfectivos.includes(p));
            
            if (permisosQueTiene.length > 0) {
                return next();
            }

            // Obtener nombres de los permisos requeridos
            const nombresPermisos = await Promise.all(
                permisos.map(p => obtenerInfoPermiso(p))
            );

            return res.status(403).json({
                success: false,
                friendly: true,
                type: 'permission-denied',
                title: 'Permisos insuficientes',
                message: 'Necesitas al menos uno de estos permisos:',
                requiredPermissions: nombresPermisos.map(p => p.nombre || p),
                icon: '🔑',
                action: 'notification',
                showAs: 'toast',
                duration: 6000
            });

        } catch (error) {
            console.error('Error en middleware de permisos múltiples:', error);
            return res.status(500).json({
                success: false,
                friendly: true,
                type: 'error',
                title: 'Error',
                message: 'Error al verificar permisos',
                action: 'none'
            });
        }
    };
};

/**
 * Middleware para verificar propiedad de un recurso (ej. documentos, tareas)
 * @param {string} modelo - Nombre del modelo ('Document', 'Task', 'Person', etc.)
 * @param {string} idParam - Nombre del parámetro que contiene el ID (default: 'id')
 */
export const verificarPropietario = (modelo, idParam = 'id') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    friendly: true,
                    type: 'warning',
                    title: 'Sesión no iniciada',
                    message: 'Por favor inicia sesión para continuar',
                    action: 'redirect',
                    redirectTo: '/login.html'
                });
            }

            // Admin puede todo (tanto admin único como rol administrador)
            if (req.user.esAdminUnico || req.user.rol === 'administrador') {
                return next();
            }

            const resourceId = req.params[idParam];
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    friendly: true,
                    type: 'error',
                    title: 'Error de solicitud',
                    message: 'ID de recurso no proporcionado'
                });
            }

            // Importar modelo dinámicamente
            let Model;
            try {
                Model = (await import(`../models/${modelo}.js`)).default;
            } catch (importError) {
                console.error(`Error importando modelo ${modelo}:`, importError);
                return res.status(500).json({
                    success: false,
                    friendly: true,
                    type: 'error',
                    title: 'Error del sistema',
                    message: 'Error al verificar propiedad del recurso'
                });
            }
            
            // Buscar recurso
            const recurso = await Model.findById(resourceId).select('creadoPor createdBy persona_id usuario_id');
            
            if (!recurso) {
                return res.status(404).json({
                    success: false,
                    friendly: true,
                    type: 'error',
                    title: 'Recurso no encontrado',
                    message: 'El recurso solicitado no existe'
                });
            }

            // Determinar campo de propietario según el modelo
            let propietarioId = null;
            
            // Mapeo de posibles campos de propietario según el modelo
            if (modelo === 'Document') {
                propietarioId = recurso.creadoPor || recurso.persona_id;
            } else if (modelo === 'Task') {
                propietarioId = recurso.creadoPor || recurso.asignadoA;
            } else if (modelo === 'Person') {
                propietarioId = recurso.creadoPor;
            } else if (modelo === 'Notification') {
                propietarioId = recurso.usuario_id || recurso.usuario;
            } else {
                // Intento genérico
                propietarioId = recurso.creadoPor || recurso.createdBy || recurso.usuario_id;
            }

            // Si no hay campo de propietario, permitir (el controlador manejará)
            if (!propietarioId) {
                console.log(`⚠️ Recurso ${modelo} sin campo de propietario, permitiendo acceso`);
                return next();
            }

            // Comparar IDs
            const userId = req.user._id.toString();
            const ownerId = propietarioId.toString();

            if (ownerId === userId) {
                return next();
            }

            // Verificar si tiene permiso específico para editar cualquier recurso de este tipo
            const permisosEfectivos = await req.user.obtenerPermisosEfectivos();
            const permisoGlobal = `editar_cualquier_${modelo.toLowerCase()}`;
            
            if (permisosEfectivos.includes(permisoGlobal)) {
                console.log(`✅ Usuario tiene permiso global ${permisoGlobal}`);
                return next();
            }

            // Si no es propietario ni tiene permiso global, denegar
            console.log(`🚫 Acceso denegado: usuario ${req.user.usuario} no es propietario del recurso ${modelo} ${resourceId}`);
            
            return res.status(403).json({
                success: false,
                friendly: true,
                type: 'permission-denied',
                title: 'Acceso denegado',
                message: 'No eres propietario de este recurso',
                description: 'Solo el creador o un administrador puede modificar este recurso',
                icon: '🔒',
                action: 'notification',
                duration: 5000
            });

        } catch (error) {
            console.error('Error en verificarPropietario:', error);
            return res.status(500).json({
                success: false,
                friendly: true,
                type: 'error',
                title: 'Error del sistema',
                message: 'Error al verificar propiedad del recurso',
                action: 'none'
            });
        }
    };
};

/**
 * Helper para obtener información de un permiso
 */
async function obtenerInfoPermiso(permisoId) {
    try {
        // Intentar importar PERMISOS_DISPONIBLES
        const { PERMISOS_DISPONIBLES } = await import('../models/Role.js');
        const permiso = PERMISOS_DISPONIBLES.find(p => p.id === permisoId);
        
        if (permiso) {
            return {
                id: permiso.id,
                nombre: permiso.nombre,
                descripcion: permiso.descripcion,
                categoria: permiso.categoria
            };
        }
    } catch (error) {
        console.warn('No se pudo cargar información del permiso:', permisoId);
    }
    
    // Fallback
    return {
        id: permisoId,
        nombre: permisoId.replace(/_/g, ' '),
        descripcion: 'Permiso desconocido'
    };
}

/**
 * Endpoint para obtener todos los permisos del usuario actual
 * Útil para el frontend para mostrar/ocultar elementos de UI
 */
export const obtenerMisPermisos = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const permisosEfectivos = await req.user.obtenerPermisosEfectivos();
        
        // Obtener información detallada de los permisos
        let PERMISOS_DISPONIBLES = [];
        try {
            const roleModule = await import('../models/Role.js');
            PERMISOS_DISPONIBLES = roleModule.PERMISOS_DISPONIBLES || [];
        } catch (error) {
            console.warn('No se pudo cargar PERMISOS_DISPONIBLES');
        }
        
        const permisosDetallados = permisosEfectivos.map(permisoId => {
            const info = PERMISOS_DISPONIBLES.find(p => p.id === permisoId);
            return info || {
                id: permisoId,
                nombre: permisoId.replace(/_/g, ' '),
                categoria: 'Otros'
            };
        });

        // Agrupar por categoría
        const agrupados = {};
        permisosDetallados.forEach(p => {
            if (!agrupados[p.categoria]) {
                agrupados[p.categoria] = [];
            }
            agrupados[p.categoria].push(p);
        });

        res.json({
            success: true,
            isAdmin: req.user.esAdminUnico || req.user.rol === 'administrador',
            esAdminUnico: req.user.esAdminUnico || false,
            rol: req.user.rol,
            permisos: permisosEfectivos,
            permisosDetallados,
            agrupados
        });

    } catch (error) {
        console.error('Error obteniendo permisos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener permisos'
        });
    }
};

/**
 * Middleware para verificar permisos en operaciones de escritura
 * Con manejo especial para no bloquear la UI
 */
export const verificarAccion = (accion, recurso) => {
    const permisoMap = {
        create: `crear_${recurso}`,
        read: `ver_${recurso}`,
        update: `editar_${recurso}`,
        delete: `eliminar_${recurso}`
    };

    return requierePermiso(permisoMap[accion] || `${accion}_${recurso}`);
};