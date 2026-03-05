// src/backend/controllers/roleController.js
// CRUD completo para roles personalizados dinámicos
//
// DEBUG: todos los métodos loggean en consola con prefijo [RoleController]

import Role, { SYSTEM_SECTIONS } from '../models/Role.js';
import User from '../models/User.js';

// ─── Debug helper ─────────────────────────────────────────────────────────────
const DEBUG = process.env.NODE_ENV !== 'production';
function rlog(method, ...args) {
  if (DEBUG) console.log(`📋 [RoleController.${method}]`, ...args);
}
function rwarn(method, ...args) {
  if (DEBUG) console.warn(`⚠️ [RoleController.${method}]`, ...args);
}
function rerr(method, ...args) {
  console.error(`❌ [RoleController.${method}]`, ...args);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza el array de permisos recibido del frontend.
 * Solo acepta secciones válidas (evita inyección de secciones falsas).
 * Las secciones admin/auditoria son EXCLUSIVAS del administrador y se ignoran.
 *
 * @param {Array} rawPermissions — permisos sin normalizar del body
 * @returns {Array<{section, canView, canAction}>}
 */
function normalizePermissions(rawPermissions = []) {
  const validSections = new Set(SYSTEM_SECTIONS.map((s) => s.key));
  const seen          = new Set();
  const result        = [];

  for (const p of rawPermissions) {
    const section = p.section;

    // Rechazar secciones inválidas o reservadas
    if (!validSections.has(section)) {
      rwarn('normalizePermissions', `Sección rechazada: "${section}"`);
      continue;
    }

    // Rechazar duplicados
    if (seen.has(section)) continue;

    seen.add(section);
    result.push({
      section,
      canView:   Boolean(p.canView),
      canAction: Boolean(p.canAction),
    });
  }

  // Rellenar secciones faltantes con false/false para tener el mapa completo
  for (const s of SYSTEM_SECTIONS) {
    if (!seen.has(s.key)) {
      result.push({ section: s.key, canView: false, canAction: false });
    }
  }

  return result;
}

/**
 * Construye el mapa completo de permisos para el administrador.
 * Todas las secciones (incluyendo admin y auditoria) están habilitadas.
 *
 * @returns {Object} { section: { canView: true, canAction: true } }
 */
function buildAdminPermissionsMap() {
  const map = {};

  SYSTEM_SECTIONS.forEach((s) => {
    map[s.key] = { canView: true, canAction: true };
  });

  // Secciones exclusivas del admin
  map['admin']     = { canView: true, canAction: true };
  map['auditoria'] = { canView: true, canAction: true };

  return map;
}

// ─── Controladores ────────────────────────────────────────────────────────────

const RoleController = {

  // ===========================================================================
  // GET /api/roles
  // Lista todos los roles con el conteo de usuarios que los tienen.
  // Solo admin puede listar todos los roles.
  // ===========================================================================
  async getAll(req, res) {
    try {
      rlog('getAll', `Solicitado por: ${req.user?.usuario} (${req.user?.rol})`);

      const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();

      // Contar usuarios por rol en una sola consulta agregada
      const userCounts = await User.aggregate([
        { $group: { _id: '$rol', count: { $sum: 1 } } },
      ]);

      const countMap = {};
      userCounts.forEach((u) => { countMap[u._id] = u.count; });

      const rolesWithCounts = roles.map((r) => ({
        ...r,
        userCount: countMap[r.name] || 0,
      }));

      rlog('getAll', `${roles.length} roles encontrados`);

      return res.json({
        success:  true,
        data:     rolesWithCounts,
        sections: SYSTEM_SECTIONS,
      });
    } catch (err) {
      rerr('getAll', err);
      return res.status(500).json({ success: false, message: 'Error al obtener roles' });
    }
  },

  // ===========================================================================
  // GET /api/roles/:id
  // Detalle de un rol por su ID de MongoDB.
  // ===========================================================================
  async getById(req, res) {
    try {
      rlog('getById', `ID: ${req.params.id}`);

      const role = await Role.findById(req.params.id).lean();

      if (!role) {
        rwarn('getById', `Rol no encontrado: ${req.params.id}`);
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      rlog('getById', `Encontrado: "${role.name}"`);
      return res.json({ success: true, data: role });

    } catch (err) {
      rerr('getById', err);
      return res.status(500).json({ success: false, message: 'Error al obtener el rol' });
    }
  },

  // ===========================================================================
  // POST /api/roles
  // Crear un rol nuevo. Solo admin.
  // ===========================================================================
  async create(req, res) {
    try {
      const { name, description, color, permissions } = req.body;
      rlog('create', `Creando rol "${name}" por: ${req.user?.usuario}`);

      // Validar nombre
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del rol debe tener al menos 2 caracteres',
        });
      }

      if (name.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: 'El nombre del rol no puede superar 50 caracteres',
        });
      }

      // Verificar nombres reservados (case-insensitive)
      const reservedNames = ['administrador', 'desactivado'];
      if (reservedNames.includes(name.trim().toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `El nombre "${name.trim()}" está reservado para el sistema`,
        });
      }

      // Verificar duplicado (case-sensitive en MongoDB — ajustar si se quiere case-insensitive)
      const existing = await Role.findOne({ name: name.trim() });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Ya existe un rol con el nombre "${name.trim()}"`,
        });
      }

      const normalizedPerms = normalizePermissions(permissions);
      rlog('create', `Permisos normalizados: ${normalizedPerms.length} secciones`);

      const role = await Role.create({
        name:        name.trim(),
        description: description?.trim() || '',
        color:       color || '#6b7280',
        permissions: normalizedPerms,
        isSystem:    false,
        createdBy:   req.user._id,
      });

      rlog('create', `Rol "${role.name}" creado con ID: ${role._id}`);

      return res.status(201).json({
        success: true,
        message: `Rol "${role.name}" creado exitosamente`,
        data:    role,
      });

    } catch (err) {
      rerr('create', err);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre' });
      }
      return res.status(500).json({ success: false, message: 'Error al crear el rol' });
    }
  },

  // ===========================================================================
  // PUT /api/roles/:id
  // Actualizar un rol existente. Solo admin. No se pueden editar roles del sistema.
  // ===========================================================================
  async update(req, res) {
    try {
      rlog('update', `ID: ${req.params.id} por: ${req.user?.usuario}`);

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      if (role.isSystem) {
        rwarn('update', `Intento de editar rol del sistema: "${role.name}"`);
        return res.status(403).json({
          success: false,
          message: `No se puede editar el rol del sistema "${role.name}"`,
        });
      }

      const { name, description, color, permissions } = req.body;
      const oldName = role.name;

      // Validar nuevo nombre si cambió
      if (name && name.trim() !== role.name) {
        const trimmedName = name.trim();

        if (trimmedName.length < 2) {
          return res.status(400).json({
            success: false,
            message: 'El nombre debe tener al menos 2 caracteres',
          });
        }

        const reservedNames = ['administrador', 'desactivado'];
        if (reservedNames.includes(trimmedName.toLowerCase())) {
          return res.status(400).json({
            success: false,
            message: `El nombre "${trimmedName}" está reservado para el sistema`,
          });
        }

        const existing = await Role.findOne({
          name: trimmedName,
          _id: { $ne: role._id },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: `Ya existe un rol con el nombre "${trimmedName}"`,
          });
        }
      }

      // Aplicar cambios
      if (name)                    role.name        = name.trim();
      if (description !== undefined) role.description = description.trim();
      if (color)                   role.color       = color;
      if (permissions)             role.permissions  = normalizePermissions(permissions);

      await role.save();

      // Si cambió el nombre, actualizar TODOS los usuarios que tenían el nombre anterior
      let usersUpdated = 0;
      if (name && name.trim() !== oldName) {
        const updateResult = await User.updateMany(
          { rol: oldName },
          { $set: { rol: role.name } }
        );
        usersUpdated = updateResult.modifiedCount;
        rlog('update', `${usersUpdated} usuario(s) actualizados de "${oldName}" a "${role.name}"`);
      }

      rlog('update', `Rol "${role.name}" actualizado exitosamente`);

      return res.json({
        success: true,
        message: `Rol "${role.name}" actualizado exitosamente${usersUpdated > 0 ? ` (${usersUpdated} usuario(s) actualizados)` : ''}`,
        data:    role,
      });

    } catch (err) {
      rerr('update', err);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre' });
      }
      return res.status(500).json({ success: false, message: 'Error al actualizar el rol' });
    }
  },

  // ===========================================================================
  // DELETE /api/roles/:id
  // Eliminar un rol. Solo si no está asignado a ningún usuario.
  // ===========================================================================
  async delete(req, res) {
    try {
      rlog('delete', `ID: ${req.params.id} por: ${req.user?.usuario}`);

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      if (role.isSystem) {
        rwarn('delete', `Intento de eliminar rol del sistema: "${role.name}"`);
        return res.status(403).json({
          success: false,
          message: `No se puede eliminar el rol del sistema "${role.name}"`,
        });
      }

      // Verificar que ningún usuario tenga este rol asignado
      const usersWithRole = await User.countDocuments({ rol: role.name });
      if (usersWithRole > 0) {
        return res.status(409).json({
          success: false,
          message: `No se puede eliminar el rol "${role.name}": tiene ${usersWithRole} usuario(s) asignado(s). Reasigna los usuarios antes de eliminar el rol.`,
          userCount: usersWithRole,
        });
      }

      const roleName = role.name;
      await role.deleteOne();

      rlog('delete', `Rol "${roleName}" eliminado exitosamente`);

      return res.json({
        success: true,
        message: `Rol "${roleName}" eliminado exitosamente`,
      });

    } catch (err) {
      rerr('delete', err);
      return res.status(500).json({ success: false, message: 'Error al eliminar el rol' });
    }
  },

  // ===========================================================================
  // GET /api/roles/sections
  // Devuelve las secciones disponibles para configurar permisos.
  // Accesible para cualquier usuario autenticado.
  // ===========================================================================
  async getSections(req, res) {
    try {
      rlog('getSections', `Solicitado por: ${req.user?.usuario}`);
      return res.json({
        success: true,
        data:    SYSTEM_SECTIONS,
      });
    } catch (err) {
      rerr('getSections', err);
      return res.status(500).json({ success: false, message: 'Error al obtener secciones' });
    }
  },

  // ===========================================================================
  // GET /api/roles/permissions/:roleName
  // Devuelve el mapa de permisos { section: { canView, canAction } } para un rol.
  //
  // Casos manejados:
  //   1. "administrador"  → mapa completo hardcoded (todos en true)
  //   2. "desactivado"    → mapa vacío {}
  //   3. Rol dinámico     → buscar en MongoDB y devolver su mapa
  //   4. Rol no encontrado→ mapa vacío con warning (no error 404, para no romper el frontend)
  //
  // Esta ruta NO requiere soloAdministrador porque los usuarios normales la usan
  // para cargar sus propios permisos al iniciar la app.
  // ===========================================================================
  async getPermissionsByName(req, res) {
    try {
      const { roleName } = req.params;
      rlog('getPermissionsByName', `Rol: "${roleName}" solicitado por: ${req.user?.usuario}`);

      if (!roleName) {
        return res.status(400).json({ success: false, message: 'Nombre de rol requerido' });
      }

      // ── Caso 1: Administrador ──────────────────────────────────────────────
      if (roleName === 'administrador') {
        const map = buildAdminPermissionsMap();
        rlog('getPermissionsByName', `"administrador" → mapa completo (${Object.keys(map).length} secciones)`);
        return res.json({ success: true, data: map });
      }

      // ── Caso 2: Desactivado ───────────────────────────────────────────────
      if (roleName === 'desactivado') {
        rwarn('getPermissionsByName', `Rol desactivado consultado por: ${req.user?.usuario}`);
        return res.json({ success: true, data: {} });
      }

      // ── Caso 3 y 4: Rol dinámico ──────────────────────────────────────────
      const role = await Role.findOne({ name: roleName });

      if (!role) {
        rwarn('getPermissionsByName', `Rol "${roleName}" no encontrado en la base de datos`);
        // Devolver mapa vacío en lugar de 404 para no romper el frontend
        // El frontend simplemente no mostrará ninguna sección
        return res.json({
          success: true,
          data:    {},
          warning: `El rol "${roleName}" no existe en la base de datos. Sin permisos asignados.`,
        });
      }

      const map = role.toPermissionsMap();
      rlog('getPermissionsByName', `Rol "${roleName}" → ${Object.keys(map).length} secciones en mapa`);

      if (DEBUG) {
        const viewable   = Object.entries(map).filter(([, v]) => v.canView).map(([k]) => k);
        const actionable = Object.entries(map).filter(([, v]) => v.canAction).map(([k]) => k);
        rlog('getPermissionsByName', `  canView=[${viewable.join(', ')}]`);
        rlog('getPermissionsByName', `  canAction=[${actionable.join(', ')}]`);
      }

      return res.json({ success: true, data: map });

    } catch (err) {
      rerr('getPermissionsByName', err);
      return res.status(500).json({ success: false, message: 'Error al obtener permisos del rol' });
    }
  },

};

export default RoleController;
