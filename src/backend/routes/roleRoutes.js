// src/backend/routes/roleRoutes.js
import express from 'express';
import RoleController from '../controllers/roleController.js';
import { protegerRuta, soloAdministrador, inyectarSchoolId } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protegerRuta);

// GET /api/roles/sections — Secciones disponibles (cualquier usuario autenticado)
router.get('/sections', RoleController.getSections);

// GET /api/roles/permissions/:roleName — Permisos de un rol por nombre
router.get('/permissions/:roleName', RoleController.getPermissionsByName);

// Las siguientes rutas son solo para administradores Y aisladas por escuela
router.get('/', inyectarSchoolId, soloAdministrador, RoleController.getAll);
router.get('/:id', soloAdministrador, RoleController.getById);
router.post('/', inyectarSchoolId, soloAdministrador, RoleController.create);
router.put('/:id', inyectarSchoolId, soloAdministrador, RoleController.update);
router.delete('/:id', inyectarSchoolId, soloAdministrador, RoleController.delete);

export default router;