// ============================================================================
// src/backend/controllers/adminController.js
// ============================================================================
// CONTROLADOR DE ADMINISTRACIÓN COMPLETO
// Con gestión de único administrador, roles, permisos y auditoría real
// ============================================================================

import User from '../models/User.js';
import Role from '../models/Role.js';
import AuditLog from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene la IP del cliente
 */
const getClientIp = (req) => {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.connection.remoteAddress || 
           '0.0.0.0';
};

/**
 * Verifica si el usuario actual es el administrador único
 */
const esAdminUnico = (user) => {
    return user && user.rol === 'administrador' && user.esAdminUnico === true;
};

/**
 * Registra una acción en auditoría
 */
const registrarAuditoria = async (req, accion, descripcion, datos = {}) => {
    try {
        await AuditLog.registrar({
            usuario: req.user,
            accion,
            descripcion,
            ip: getClientIp(req),
            userAgent: req.headers['user-agent'],
            ...datos
        });
    } catch (error) {
        console.error('Error registrando auditoría:', error);
    }
};

// ============================================================================
// GESTIÓN DE USUARIOS
// ============================================================================

/**
 * Obtener todos los usuarios (excluyendo contraseñas)
 * GET /api/admin/users
 */
export const getUsuarios = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede ver usuarios'
            });
        }
        
        const usuarios = await User.find()
            .select('-password -resetPasswordToken -changePasswordToken -changeAdminToken')
            .sort({ createdAt: -1 })
            .lean();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'VER_USUARIOS',
            `Listó todos los usuarios (${usuarios.length} encontrados)`
        );
        
        res.json({
            success: true,
            usuarios
        });
        
    } catch (error) {
        console.error('Error getUsuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios'
        });
    }
};

/**
 * Crear nuevo usuario (no admin)
 * POST /api/admin/users
 */
export const crearUsuario = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede crear usuarios'
            });
        }
        
        const { usuario, correo, password, rol, activo } = req.body;
        
        // Validaciones básicas
        if (!usuario || !correo || !password) {
            return res.status(400).json({
                success: false,
                message: 'Usuario, correo y contraseña son requeridos'
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 6 caracteres'
            });
        }
        
        // Verificar si ya existe
        const existe = await User.findOne({
            $or: [{ usuario }, { correo }]
        });
        
        if (existe) {
            return res.status(400).json({
                success: false,
                message: 'El usuario o correo ya existe'
            });
        }
        
        // Verificar que el rol exista (excepto administrador)
        if (rol && rol !== 'administrador') {
            const rolExiste = await Role.findOne({ nombre: rol });
            if (!rolExiste) {
                return res.status(400).json({
                    success: false,
                    message: `El rol "${rol}" no existe`
                });
            }
        }
        
        // Crear usuario (nunca crear otro admin)
        const nuevoUsuario = new User({
            usuario,
            correo,
            password,
            rol: rol || 'usuario',
            activo: activo !== undefined ? activo : true,
            creadoPor: req.user._id
        });
        
        await nuevoUsuario.save();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'CREAR_USUARIO',
            `Creó usuario: ${usuario} con rol: ${rol || 'usuario'}`,
            {
                recursoId: nuevoUsuario._id,
                recursoTipo: 'User',
                datosNuevos: { usuario, correo, rol: rol || 'usuario' }
            }
        );
        
        // Responder sin contraseña
        const usuarioResponse = nuevoUsuario.toObject();
        delete usuarioResponse.password;
        delete usuarioResponse.resetPasswordToken;
        delete usuarioResponse.changePasswordToken;
        delete usuarioResponse.changeAdminToken;
        
        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            usuario: usuarioResponse
        });
        
    } catch (error) {
        console.error('Error crearUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear usuario'
        });
    }
};

/**
 * Editar usuario (no admin)
 * PUT /api/admin/users/:id
 */
export const editarUsuario = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede editar usuarios'
            });
        }
        
        const { id } = req.params;
        const { usuario, correo, rol, activo, permisos } = req.body;
        
        // Buscar usuario a editar
        const userToEdit = await User.findById(id);
        if (!userToEdit) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        // NO PERMITIR EDITAR AL ADMIN ÚNICO
        if (userToEdit.esAdminUnico) {
            return res.status(403).json({
                success: false,
                message: 'No puedes editar al administrador único'
            });
        }
        
        // Guardar datos anteriores para auditoría
        const datosAnteriores = {
            usuario: userToEdit.usuario,
            correo: userToEdit.correo,
            rol: userToEdit.rol,
            activo: userToEdit.activo,
            permisos: userToEdit.permisos
        };
        
        // Actualizar campos
        if (usuario) userToEdit.usuario = usuario;
        if (correo) userToEdit.correo = correo;
        if (rol) userToEdit.rol = rol;
        if (activo !== undefined) userToEdit.activo = activo;
        if (permisos) userToEdit.permisos = permisos;
        
        userToEdit.editadoPor = req.user._id;
        
        await userToEdit.save();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'EDITAR_USUARIO',
            `Editó usuario: ${userToEdit.usuario}`,
            {
                recursoId: userToEdit._id,
                recursoTipo: 'User',
                datosAnteriores,
                datosNuevos: { usuario, correo, rol, activo }
            }
        );
        
        // Responder sin contraseña
        const usuarioResponse = userToEdit.toObject();
        delete usuarioResponse.password;
        delete usuarioResponse.resetPasswordToken;
        delete usuarioResponse.changePasswordToken;
        delete usuarioResponse.changeAdminToken;
        
        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            usuario: usuarioResponse
        });
        
    } catch (error) {
        console.error('Error editarUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar usuario'
        });
    }
};

/**
 * Eliminar usuario (dar de baja)
 * DELETE /api/admin/users/:id
 */
export const eliminarUsuario = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede eliminar usuarios'
            });
        }
        
        const { id } = req.params;
        
        // Buscar usuario a eliminar
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        // NO PERMITIR ELIMINAR AL ADMIN ÚNICO
        if (userToDelete.esAdminUnico) {
            return res.status(403).json({
                success: false,
                message: 'No puedes eliminar al administrador único'
            });
        }
        
        // Guardar estado anterior
        const estabaActivo = userToDelete.activo;
        
        // Soft delete - cambiar estado
        userToDelete.activo = !userToDelete.activo; // Toggle
        userToDelete.rol = userToDelete.activo ? userToDelete.rol : 'desactivado';
        userToDelete.editadoPor = req.user._id;
        
        await userToDelete.save();
        
        // Registrar auditoría
        const accion = estabaActivo ? 'DESACTIVAR_USUARIO' : 'ACTIVAR_USUARIO';
        await registrarAuditoria(
            req,
            accion,
            `${estabaActivo ? 'Desactivó' : 'Activó'} usuario: ${userToDelete.usuario}`,
            {
                recursoId: userToDelete._id,
                recursoTipo: 'User',
                datosAnteriores: { activo: estabaActivo },
                datosNuevos: { activo: userToDelete.activo }
            }
        );
        
        res.json({
            success: true,
            message: `Usuario ${userToDelete.activo ? 'activado' : 'desactivado'} exitosamente`
        });
        
    } catch (error) {
        console.error('Error eliminarUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cambiar estado del usuario'
        });
    }
};

// ============================================================================
// GESTIÓN DE ROLES
// ============================================================================

/**
 * Obtener todos los roles
 * GET /api/admin/roles
 */
export const getRoles = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede ver roles'
            });
        }
        
        const roles = await Role.find()
            .sort({ nombre: 1 })
            .lean();
        
        res.json({
            success: true,
            roles
        });
        
    } catch (error) {
        console.error('Error getRoles:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener roles'
        });
    }
};

/**
 * Crear nuevo rol
 * POST /api/admin/roles
 */
export const crearRol = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede crear roles'
            });
        }
        
        const { nombre, descripcion, permisos } = req.body;
        
        // Validaciones
        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del rol es requerido'
            });
        }
        
        // Verificar si ya existe
        const existe = await Role.findOne({ nombre: nombre.toLowerCase() });
        if (existe) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un rol con ese nombre'
            });
        }
        
        // Crear rol
        const nuevoRol = new Role({
            nombre: nombre.toLowerCase(),
            descripcion,
            permisos: permisos || [],
            creadoPor: req.user._id,
            esProtegido: false
        });
        
        await nuevoRol.save();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'CREAR_ROL',
            `Creó rol: ${nuevoRol.nombre} con ${nuevoRol.permisos.length} permisos`,
            {
                recursoId: nuevoRol._id,
                recursoTipo: 'Role',
                datosNuevos: { nombre, descripcion, permisos: permisos?.length }
            }
        );
        
        res.status(201).json({
            success: true,
            message: 'Rol creado exitosamente',
            rol: nuevoRol
        });
        
    } catch (error) {
        console.error('Error crearRol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear rol'
        });
    }
};

/**
 * Editar rol
 * PUT /api/admin/roles/:id
 */
export const editarRol = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede editar roles'
            });
        }
        
        const { id } = req.params;
        const { nombre, descripcion, permisos } = req.body;
        
        const rol = await Role.findById(id);
        if (!rol) {
            return res.status(404).json({
                success: false,
                message: 'Rol no encontrado'
            });
        }
        
        // No permitir editar rol protegido (administrador)
        if (rol.esProtegido) {
            return res.status(403).json({
                success: false,
                message: 'No puedes editar este rol protegido'
            });
        }
        
        // Guardar datos anteriores
        const datosAnteriores = {
            nombre: rol.nombre,
            descripcion: rol.descripcion,
            permisos: rol.permisos
        };
        
        // Actualizar
        if (nombre) rol.nombre = nombre.toLowerCase();
        if (descripcion !== undefined) rol.descripcion = descripcion;
        if (permisos) rol.permisos = permisos;
        
        rol.editadoPor = req.user._id;
        await rol.save();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'EDITAR_ROL',
            `Editó rol: ${rol.nombre}`,
            {
                recursoId: rol._id,
                recursoTipo: 'Role',
                datosAnteriores,
                datosNuevos: { nombre, descripcion, permisos: permisos?.length }
            }
        );
        
        res.json({
            success: true,
            message: 'Rol actualizado exitosamente',
            rol
        });
        
    } catch (error) {
        console.error('Error editarRol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al editar rol'
        });
    }
};

/**
 * Eliminar rol
 * DELETE /api/admin/roles/:id
 */
export const eliminarRol = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede eliminar roles'
            });
        }
        
        const { id } = req.params;
        
        const rol = await Role.findById(id);
        if (!rol) {
            return res.status(404).json({
                success: false,
                message: 'Rol no encontrado'
            });
        }
        
        // No permitir eliminar roles protegidos
        if (rol.esProtegido) {
            return res.status(403).json({
                success: false,
                message: 'No puedes eliminar este rol protegido'
            });
        }
        
        // Verificar si hay usuarios usando este rol
        const usuariosConRol = await User.countDocuments({ rol: rol.nombre });
        if (usuariosConRol > 0) {
            return res.status(400).json({
                success: false,
                message: `No se puede eliminar el rol porque ${usuariosConRol} usuario(s) lo tienen asignado`
            });
        }
        
        await rol.deleteOne();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'ELIMINAR_ROL',
            `Eliminó rol: ${rol.nombre}`,
            {
                recursoId: rol._id,
                recursoTipo: 'Role',
                datosAnteriores: { nombre: rol.nombre, permisos: rol.permisos }
            }
        );
        
        res.json({
            success: true,
            message: 'Rol eliminado exitosamente'
        });
        
    } catch (error) {
        console.error('Error eliminarRol:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar rol'
        });
    }
};

// ============================================================================
// GESTIÓN DE PERMISOS ESPECÍFICOS DE USUARIO
// ============================================================================

/**
 * Actualizar permisos específicos de un usuario
 * PUT /api/admin/users/:id/permisos
 */
export const actualizarPermisosUsuario = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede modificar permisos'
            });
        }
        
        const { id } = req.params;
        const { permisos } = req.body;
        
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        // No permitir modificar permisos del admin único
        if (user.esAdminUnico) {
            return res.status(403).json({
                success: false,
                message: 'No puedes modificar los permisos del administrador único'
            });
        }
        
        // Guardar permisos anteriores
        const permisosAnteriores = [...(user.permisos || [])];
        
        // Actualizar permisos
        user.permisos = permisos || [];
        user.editadoPor = req.user._id;
        await user.save();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'MODIFICAR_PERMISOS_USUARIO',
            `Modificó permisos de ${user.usuario}: ${permisosAnteriores.length} → ${permisos?.length || 0} permisos`,
            {
                recursoId: user._id,
                recursoTipo: 'User',
                datosAnteriores: { permisos: permisosAnteriores },
                datosNuevos: { permisos: permisos || [] }
            }
        );
        
        res.json({
            success: true,
            message: 'Permisos actualizados exitosamente'
        });
        
    } catch (error) {
        console.error('Error actualizarPermisosUsuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar permisos'
        });
    }
};

// ============================================================================
// AUDITORÍA / LOGS
// ============================================================================

/**
 * Obtener logs de auditoría
 * GET /api/admin/audit-logs
 */
export const getAuditLogs = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede ver los logs'
            });
        }
        
        const { 
            pagina = 1, 
            limite = 50,
            usuario,
            accion,
            desde,
            hasta 
        } = req.query;
        
        const filtros = {
            pagina: parseInt(pagina),
            limite: parseInt(limite),
            usuario,
            accion,
            desde,
            hasta
        };
        
        const resultado = await AuditLog.obtenerLogs(filtros);
        
        res.json({
            success: true,
            ...resultado
        });
        
    } catch (error) {
        console.error('Error getAuditLogs:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener logs'
        });
    }
};

// ============================================================================
// INICIALIZACIÓN DEL SISTEMA
// ============================================================================

/**
 * Inicializar el sistema (crear admin único si no existe)
 * POST /api/admin/init
 */
export const inicializarSistema = async (req, res) => {
    try {
        // Verificar si ya hay admin
        const adminCount = await User.countDocuments({ 
            rol: 'administrador', 
            activo: true 
        });
        
        if (adminCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'El sistema ya tiene administradores'
            });
        }
        
        // Crear roles por defecto
        await Role.crearRolesPorDefecto();
        
        // Crear admin único
        const adminData = {
            usuario: 'admin',
            correo: 'admin@cbtis051.edu.mx',
            password: 'Admin123!',
            rol: 'administrador',
            activo: true,
            esAdminUnico: true
        };
        
        const admin = new User(adminData);
        await admin.save();
        
        console.log('✅ Sistema inicializado con admin único');
        
        res.json({
            success: true,
            message: 'Sistema inicializado',
            admin: {
                usuario: admin.usuario,
                correo: admin.correo
            }
        });
        
    } catch (error) {
        console.error('Error inicializarSistema:', error);
        res.status(500).json({
            success: false,
            message: 'Error al inicializar sistema'
        });
    }
};

/**
 * Eliminar usuario permanentemente
 * DELETE /api/admin/users/:id/permanent
 */
export const eliminarUsuarioPermanente = async (req, res) => {
    try {
        // Verificar que sea admin único
        if (!esAdminUnico(req.user)) {
            return res.status(403).json({
                success: false,
                message: 'Solo el administrador único puede eliminar usuarios permanentemente'
            });
        }
        
        const { id } = req.params;
        
        // Buscar usuario a eliminar
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
        
        // NO PERMITIR ELIMINAR AL ADMIN ÚNICO
        if (userToDelete.esAdminUnico) {
            return res.status(403).json({
                success: false,
                message: 'No puedes eliminar al administrador único'
            });
        }
        
        // Guardar datos para auditoría
        const usuarioInfo = {
            usuario: userToDelete.usuario,
            correo: userToDelete.correo,
            rol: userToDelete.rol
        };
        
        // Eliminar permanentemente
        await userToDelete.deleteOne();
        
        // Registrar auditoría
        await registrarAuditoria(
            req,
            'ELIMINAR_PERMANENTE_USUARIO',
            `Eliminó permanentemente usuario: ${usuarioInfo.usuario} (${usuarioInfo.correo})`,
            {
                recursoId: id,
                recursoTipo: 'User',
                datosAnteriores: usuarioInfo
            }
        );
        
        res.json({
            success: true,
            message: 'Usuario eliminado permanentemente'
        });
        
    } catch (error) {
        console.error('Error eliminarUsuarioPermanente:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar usuario permanentemente'
        });
    }
};

// ============================================================================
// VERIFICACIONES
// ============================================================================

/**
 * Verificar si se puede cambiar admin
 * GET /api/admin/verify-admin-change
 */
export const verificarCambioAdmin = async (req, res) => {
    try {
        const adminCount = await User.countDocuments({ 
            rol: 'administrador',
            activo: true 
        });
        
        const puedeCambiar = adminCount === 1 && req.user.esAdminUnico;
        
        res.json({
            success: true,
            puedeCambiar,
            adminCount,
            esUnico: req.user.esAdminUnico || false
        });
        
    } catch (error) {
        console.error('Error verificarCambioAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar'
        });
    }
};