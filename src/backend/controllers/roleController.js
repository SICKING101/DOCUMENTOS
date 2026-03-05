// src/backend/controllers/roleController.js
// CRUD completo para roles personalizados dinámicos

import Role, { SYSTEM_SECTIONS } from '../models/Role.js';
import User from '../models/User.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normaliza el array de permisos recibido del frontend.
 * Solo acepta secciones válidas (evita inyección de secciones falsas).
 * Las secciones admin/auditoria son EXCLUSIVAS del administrador y se ignoran.
 */
function normalizePermissions(rawPermissions = []) {
  const validSections = new Set(SYSTEM_SECTIONS.map((s) => s.key));
  const seen = new Set();
  const result = [];

  for (const p of rawPermissions) {
    if (!validSections.has(p.section)) continue; // sección inválida o restringida
    if (seen.has(p.section)) continue;           // duplicado
    seen.add(p.section);
    result.push({
      section:   p.section,
      canView:   Boolean(p.canView),
      canAction: Boolean(p.canAction),
    });
  }

  // Rellenar secciones faltantes con false/false
  for (const s of SYSTEM_SECTIONS) {
    if (!seen.has(s.key)) {
      result.push({ section: s.key, canView: false, canAction: false });
    }
  }

  return result;
}

// ─── Controladores ────────────────────────────────────────────────────────────

const RoleController = {

  /**
   * GET /api/roles
   * Lista todos los roles (dinámicos + info de cuántos usuarios los tienen)
   */
  async getAll(req, res) {
    try {
      console.log('📋 [RoleController] getAll - solicitado por:', req.user?.usuario);

      const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();

      // Contar usuarios por rol
      const userCounts = await User.aggregate([
        { $group: { _id: '$rol', count: { $sum: 1 } } },
      ]);
      const countMap = {};
      userCounts.forEach((u) => { countMap[u._id] = u.count; });

      const rolesWithCounts = roles.map((r) => ({
        ...r,
        userCount: countMap[r.name] || 0,
      }));

      console.log(`✅ [RoleController] getAll - ${roles.length} roles encontrados`);

      return res.json({
        success: true,
        data: rolesWithCounts,
        sections: SYSTEM_SECTIONS,
      });
    } catch (err) {
      console.error('❌ [RoleController] getAll error:', err);
      return res.status(500).json({ success: false, message: 'Error al obtener roles' });
    }
  },

  /**
   * GET /api/roles/:id
   * Detalle de un rol
   */
  async getById(req, res) {
    try {
      const role = await Role.findById(req.params.id).lean();
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }
      return res.json({ success: true, data: role });
    } catch (err) {
      console.error('❌ [RoleController] getById error:', err);
      return res.status(500).json({ success: false, message: 'Error al obtener el rol' });
    }
  },

  /**
   * POST /api/roles
   * Crear un rol nuevo
   */
  async create(req, res) {
    try {
      console.log('➕ [RoleController] create - body:', req.body);

      const { name, description, color, permissions } = req.body;

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Nombre del rol inválido (mínimo 2 caracteres)' });
      }

      // Verificar que el nombre no esté reservado
      const reservedNames = ['administrador', 'desactivado'];
      if (reservedNames.includes(name.trim().toLowerCase())) {
        return res.status(400).json({ success: false, message: `El nombre "${name}" está reservado para el sistema` });
      }

      // Verificar duplicado
      const existing = await Role.findOne({ name: name.trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: `Ya existe un rol con el nombre "${name}"` });
      }

      const role = await Role.create({
        name:        name.trim(),
        description: description?.trim() || '',
        color:       color || '#6b7280',
        permissions: normalizePermissions(permissions),
        isSystem:    false,
        createdBy:   req.user._id,
      });

      console.log(`✅ [RoleController] create - Rol "${role.name}" creado`);

      return res.status(201).json({
        success: true,
        message: `Rol "${role.name}" creado exitosamente`,
        data: role,
      });
    } catch (err) {
      console.error('❌ [RoleController] create error:', err);
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'Ya existe un rol con ese nombre' });
      }
      return res.status(500).json({ success: false, message: 'Error al crear el rol' });
    }
  },

  /**
   * PUT /api/roles/:id
   * Actualizar un rol existente
   */
  async update(req, res) {
    try {
      console.log('✏️ [RoleController] update - id:', req.params.id, 'body:', req.body);

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      if (role.isSystem) {
        return res.status(403).json({ success: false, message: 'No se pueden editar roles del sistema' });
      }

      const { name, description, color, permissions } = req.body;

      // Verificar nombre duplicado (ignorando el propio rol)
      if (name && name.trim() !== role.name) {
        const reservedNames = ['administrador', 'desactivado'];
        if (reservedNames.includes(name.trim().toLowerCase())) {
          return res.status(400).json({ success: false, message: `El nombre "${name}" está reservado` });
        }
        const existing = await Role.findOne({ name: name.trim(), _id: { $ne: role._id } });
        if (existing) {
          return res.status(400).json({ success: false, message: `Ya existe un rol con el nombre "${name}"` });
        }
      }

      // Guardar nombre anterior para actualizar usuarios
      const oldName = role.name;

      if (name)        role.name        = name.trim();
      if (description !== undefined) role.description = description.trim();
      if (color)       role.color       = color;
      if (permissions) role.permissions = normalizePermissions(permissions);

      await role.save();

      // Si cambió el nombre del rol, actualizar todos los usuarios que lo tenían
      if (name && name.trim() !== oldName) {
        const updated = await User.updateMany({ rol: oldName }, { $set: { rol: role.name } });
        console.log(`🔄 [RoleController] update - ${updated.modifiedCount} usuarios actualizados de "${oldName}" a "${role.name}"`);
      }

      console.log(`✅ [RoleController] update - Rol "${role.name}" actualizado`);

      return res.json({
        success: true,
        message: `Rol "${role.name}" actualizado exitosamente`,
        data: role,
      });
    } catch (err) {
      console.error('❌ [RoleController] update error:', err);
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'Ya existe un rol con ese nombre' });
      }
      return res.status(500).json({ success: false, message: 'Error al actualizar el rol' });
    }
  },

  /**
   * DELETE /api/roles/:id
   * Eliminar un rol (solo si no está en uso)
   */
  async delete(req, res) {
    try {
      console.log('🗑️ [RoleController] delete - id:', req.params.id);

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      if (role.isSystem) {
        return res.status(403).json({ success: false, message: 'No se pueden eliminar roles del sistema' });
      }

      // Verificar si hay usuarios con este rol
      const usersWithRole = await User.countDocuments({ rol: role.name });
      if (usersWithRole > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el rol "${role.name}" porque tiene ${usersWithRole} usuario(s) asignado(s). Reasigna los usuarios primero.`,
          userCount: usersWithRole,
        });
      }

      await role.deleteOne();

      console.log(`✅ [RoleController] delete - Rol "${role.name}" eliminado`);

      return res.json({
        success: true,
        message: `Rol "${role.name}" eliminado exitosamente`,
      });
    } catch (err) {
      console.error('❌ [RoleController] delete error:', err);
      return res.status(500).json({ success: false, message: 'Error al eliminar el rol' });
    }
  },

  /**
   * GET /api/roles/sections
   * Devuelve las secciones disponibles para configurar permisos
   */
  async getSections(req, res) {
    try {
      return res.json({ success: true, data: SYSTEM_SECTIONS });
    } catch (err) {
      console.error('❌ [RoleController] getSections error:', err);
      return res.status(500).json({ success: false, message: 'Error al obtener secciones' });
    }
  },

  /**
   * GET /api/roles/permissions/:roleName
   * Devuelve el mapa de permisos para un nombre de rol específico.
   * Usado por el middleware de autenticación para verificar accesos.
   */
  async getPermissionsByName(req, res) {
    try {
      const { roleName } = req.params;
      const map = await Role.getPermissionsForRole(roleName);
      return res.json({ success: true, data: map });
    } catch (err) {
      console.error('❌ [RoleController] getPermissionsByName error:', err);
      return res.status(500).json({ success: false, message: 'Error al obtener permisos' });
    }
  },
};

export default RoleController;
