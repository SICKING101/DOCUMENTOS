// src/backend/controllers/roleController.js
import Role, { SYSTEM_SECTIONS } from '../models/Role.js';
import User from '../models/User.js';

const DEBUG = process.env.NODE_ENV !== 'production';
function rlog(method, ...args) { if (DEBUG) console.log(`📋 [RoleController.${method}]`, ...args); }
function rwarn(method, ...args) { if (DEBUG) console.warn(`⚠️ [RoleController.${method}]`, ...args); }
function rerr(method, ...args) { console.error(`❌ [RoleController.${method}]`, ...args); }

function normalizePermissions(rawPermissions = []) {
  const validSections = new Set(SYSTEM_SECTIONS.map((s) => s.key));
  const seen = new Set();
  const result = [];

  for (const p of rawPermissions) {
    const section = p.section;
    if (!validSections.has(section)) continue;
    if (seen.has(section)) continue;
    seen.add(section);
    result.push({ section, canView: Boolean(p.canView), canAction: Boolean(p.canAction) });
  }

  for (const s of SYSTEM_SECTIONS) {
    if (!seen.has(s.key)) {
      result.push({ section: s.key, canView: false, canAction: false });
    }
  }

  return result;
}

function buildAdminPermissionsMap() {
  const map = {};
  SYSTEM_SECTIONS.forEach((s) => {
    map[s.key] = { canView: true, canAction: true };
  });
  map['admin']     = { canView: true, canAction: true };
  map['auditoria'] = { canView: true, canAction: true };
  return map;
}

const RoleController = {

  // GET /api/roles — Solo roles de su escuela + roles del sistema
  async getAll(req, res) {
    try {
      rlog('getAll', `Solicitado por: ${req.user?.usuario} (${req.user?.rol}) | schoolId: ${req.schoolId}`);

      // ✅ Filtro: roles del sistema (isSystem) + roles de su escuela
      const filter = {
        $or: [
          { isSystem: true },
          { schoolId: req.schoolId || 'superadmin' }
        ]
      };
      if (!req.schoolId) {
        // Superadmin ve todo
        const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();
        const userCounts = await User.aggregate([{ $group: { _id: '$rol', count: { $sum: 1 } } }]);
        const countMap = {};
        userCounts.forEach((u) => { countMap[u._id] = u.count; });
        const rolesWithCounts = roles.map((r) => ({ ...r, userCount: countMap[r.name] || 0 }));
        return res.json({ success: true, data: rolesWithCounts, sections: SYSTEM_SECTIONS });
      }

      const roles = await Role.find(filter).sort({ isSystem: -1, createdAt: 1 }).lean();
      const userCounts = await User.aggregate([{ $group: { _id: '$rol', count: { $sum: 1 } } }]);
      const countMap = {};
      userCounts.forEach((u) => { countMap[u._id] = u.count; });
      const rolesWithCounts = roles.map((r) => ({ ...r, userCount: countMap[r.name] || 0 }));

      rlog('getAll', `${rolesWithCounts.length} roles encontrados`);
      return res.json({ success: true, data: rolesWithCounts, sections: SYSTEM_SECTIONS });
    } catch (err) {
      rerr('getAll', err);
      return res.status(500).json({ success: false, message: 'Error al obtener roles' });
    }
  },

  // GET /api/roles/:id
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

  // POST /api/roles — Crear rol asignado a su escuela
  async create(req, res) {
    try {
      const { name, description, color, permissions } = req.body;
      rlog('create', `Creando rol "${name}" por: ${req.user?.usuario} | schoolId: ${req.schoolId}`);

      if (!name || name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'El nombre del rol debe tener al menos 2 caracteres' });
      }
      if (name.trim().length > 50) {
        return res.status(400).json({ success: false, message: 'El nombre del rol no puede superar 50 caracteres' });
      }

      const reservedNames = ['administrador', 'desactivado'];
      if (reservedNames.includes(name.trim().toLowerCase())) {
        return res.status(400).json({ success: false, message: `El nombre "${name.trim()}" está reservado para el sistema` });
      }

      // ✅ Verificar duplicado SOLO en su escuela
      const existing = await Role.findOne({ name: name.trim(), schoolId: req.schoolId });
      if (existing) {
        return res.status(409).json({ success: false, message: `Ya existe un rol con el nombre "${name.trim()}" en tu escuela` });
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
        schoolId:    req.schoolId || 'superadmin',
      });

      rlog('create', `Rol "${role.name}" creado con ID: ${role._id}`);
      return res.status(201).json({ success: true, message: `Rol "${role.name}" creado exitosamente`, data: role });
    } catch (err) {
      rerr('create', err);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre en tu escuela' });
      }
      return res.status(500).json({ success: false, message: 'Error al crear el rol' });
    }
  },

  // PUT /api/roles/:id — Solo roles de su escuela
  async update(req, res) {
    try {
      rlog('update', `ID: ${req.params.id} por: ${req.user?.usuario}`);

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      if (role.isSystem) {
        rwarn('update', `Intento de editar rol del sistema: "${role.name}"`);
        return res.status(403).json({ success: false, message: `No se puede editar el rol del sistema "${role.name}"` });
      }

      // ✅ Verificar que pertenece a su escuela
      if (req.schoolId && role.schoolId !== req.schoolId) {
        return res.status(403).json({ success: false, message: 'No puedes editar roles de otra escuela' });
      }

      const { name, description, color, permissions } = req.body;
      const oldName = role.name;

      if (name && name.trim() !== role.name) {
        const trimmedName = name.trim();
        if (trimmedName.length < 2) {
          return res.status(400).json({ success: false, message: 'El nombre debe tener al menos 2 caracteres' });
        }
        const reservedNames = ['administrador', 'desactivado'];
        if (reservedNames.includes(trimmedName.toLowerCase())) {
          return res.status(400).json({ success: false, message: `El nombre "${trimmedName}" está reservado` });
        }
        const existing = await Role.findOne({ name: trimmedName, schoolId: req.schoolId, _id: { $ne: role._id } });
        if (existing) {
          return res.status(409).json({ success: false, message: `Ya existe un rol con el nombre "${trimmedName}" en tu escuela` });
        }
        role.name = trimmedName;
      }

      if (name) role.name = name.trim();
      if (description !== undefined) role.description = description.trim();
      if (color) role.color = color;
      if (permissions) role.permissions = normalizePermissions(permissions);

      await role.save();

      let usersUpdated = 0;
      if (name && name.trim() !== oldName) {
        const updateResult = await User.updateMany(
          { rol: oldName, schoolId: req.schoolId },
          { $set: { rol: role.name } }
        );
        usersUpdated = updateResult.modifiedCount;
        rlog('update', `${usersUpdated} usuario(s) actualizados de "${oldName}" a "${role.name}"`);
      }

      rlog('update', `Rol "${role.name}" actualizado`);
      return res.json({ success: true, message: `Rol "${role.name}" actualizado`, data: role });
    } catch (err) {
      rerr('update', err);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'Ya existe un rol con ese nombre' });
      }
      return res.status(500).json({ success: false, message: 'Error al actualizar el rol' });
    }
  },

  // DELETE /api/roles/:id — Solo roles de su escuela
  async delete(req, res) {
    try {
      rlog('delete', `ID: ${req.params.id} por: ${req.user?.usuario}`);

      const role = await Role.findById(req.params.id);
      if (!role) {
        return res.status(404).json({ success: false, message: 'Rol no encontrado' });
      }

      if (role.isSystem) {
        return res.status(403).json({ success: false, message: `No se puede eliminar el rol del sistema "${role.name}"` });
      }

      // ✅ Verificar que pertenece a su escuela
      if (req.schoolId && role.schoolId !== req.schoolId) {
        return res.status(403).json({ success: false, message: 'No puedes eliminar roles de otra escuela' });
      }

      const usersWithRole = await User.countDocuments({ rol: role.name, schoolId: req.schoolId });
      if (usersWithRole > 0) {
        return res.status(409).json({
          success: false,
          message: `No se puede eliminar: ${usersWithRole} usuario(s) tienen este rol en tu escuela`,
          userCount: usersWithRole,
        });
      }

      const roleName = role.name;
      await role.deleteOne();
      rlog('delete', `Rol "${roleName}" eliminado`);
      return res.json({ success: true, message: `Rol "${roleName}" eliminado` });
    } catch (err) {
      rerr('delete', err);
      return res.status(500).json({ success: false, message: 'Error al eliminar el rol' });
    }
  },

  // GET /api/roles/sections
  async getSections(req, res) {
    try {
      return res.json({ success: true, data: SYSTEM_SECTIONS });
    } catch (err) {
      rerr('getSections', err);
      return res.status(500).json({ success: false, message: 'Error al obtener secciones' });
    }
  },

  // GET /api/roles/permissions/:roleName
  async getPermissionsByName(req, res) {
    try {
      const { roleName } = req.params;
      rlog('getPermissionsByName', `Rol: "${roleName}"`);

      if (!roleName) {
        return res.status(400).json({ success: false, message: 'Nombre de rol requerido' });
      }

      if (roleName === 'administrador') {
        return res.json({ success: true, data: buildAdminPermissionsMap() });
      }

      if (roleName === 'desactivado') {
        return res.json({ success: true, data: {} });
      }

      const role = await Role.findOne({ name: roleName });
      if (!role) {
        return res.json({ success: true, data: {}, warning: `El rol "${roleName}" no existe` });
      }

      return res.json({ success: true, data: role.toPermissionsMap() });
    } catch (err) {
      rerr('getPermissionsByName', err);
      return res.status(500).json({ success: false, message: 'Error al obtener permisos del rol' });
    }
  },

};

export default RoleController;