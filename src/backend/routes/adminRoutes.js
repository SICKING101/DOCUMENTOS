// ============================================================================
// src/backend/routes/adminRoutes.js
// ============================================================================
// RUTAS DE ADMINISTRACIÓN COMPLETAS
// ============================================================================

import express from 'express';
import { 
    getUsuarios,
    crearUsuario,
    editarUsuario,
    eliminarUsuario,
    getRoles,
    crearRol,
    editarRol,
    eliminarRol,
    actualizarPermisosUsuario,
    getAuditLogs,
    inicializarSistema,
    verificarCambioAdmin
} from '../controllers/adminController.js';
import { 
    protegerRuta, 
    soloAdministrador,
    verificarUnicoAdmin
} from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación y ser admin
router.use(protegerRuta);
router.use(soloAdministrador);
router.use(verificarUnicoAdmin);

// ============================================================================
// GESTIÓN DE USUARIOS
// ============================================================================

// Obtener todos los usuarios
router.get('/users', getUsuarios);

// Crear nuevo usuario
router.post('/users', crearUsuario);

// Editar usuario
router.put('/users/:id', editarUsuario);

// Eliminar usuario (dar de baja/activar)
router.delete('/users/:id', eliminarUsuario);

// Actualizar permisos específicos de usuario
router.put('/users/:id/permisos', actualizarPermisosUsuario);

// ============================================================================
// GESTIÓN DE ROLES
// ============================================================================

// Obtener todos los roles
router.get('/roles', getRoles);

// Crear nuevo rol
router.post('/roles', crearRol);

// Editar rol
router.put('/roles/:id', editarRol);

// Eliminar rol
router.delete('/roles/:id', eliminarRol);

// ============================================================================
// AUDITORÍA
// ============================================================================

// Obtener logs de auditoría
router.get('/audit-logs', getAuditLogs);

// ============================================================================
// VERIFICACIONES
// ============================================================================

// Verificar si se puede cambiar admin
router.get('/verify-admin-change', verificarCambioAdmin);

// ============================================================================
// INICIALIZACIÓN (SOLO USAR UNA VEZ)
// ============================================================================

// Inicializar sistema (crear admin único y roles por defecto)
router.post('/init', inicializarSistema);

export default router;