// src/backend/routes/roleRoutes.js
// Rutas REST para gestión de roles personalizados

import express from 'express';
import RoleController from '../controllers/roleController.js';
import { protegerRuta, soloAdministrador } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protegerRuta);

// GET /api/roles/sections — Secciones disponibles (cualquier usuario autenticado)
router.get('/sections', RoleController.getSections);

// GET /api/roles/permissions/:roleName — Permisos de un rol por nombre
router.get('/permissions/:roleName', RoleController.getPermissionsByName);

// Las siguientes rutas son solo para administradores
router.use(soloAdministrador);

// GET    /api/roles        — Listar todos los roles
router.get('/', RoleController.getAll);

// GET    /api/roles/:id    — Detalle de un rol
router.get('/:id', RoleController.getById);

// POST   /api/roles        — Crear rol
router.post('/', RoleController.create);

// PUT    /api/roles/:id    — Actualizar rol
router.put('/:id', RoleController.update);

// DELETE /api/roles/:id    — Eliminar rol
router.delete('/:id', RoleController.delete);

export default router;
