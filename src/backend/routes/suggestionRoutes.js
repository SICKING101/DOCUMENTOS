// src/backend/routes/suggestionRoutes.js
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import {
    createSuggestion,
    getAllSuggestions,
    getSuggestionById,
    markSuggestionAsViewed,
    updateSuggestionStatus,
    deleteSuggestion,
    getSuggestionsStats
} from '../controllers/suggestionController.js';
import { protegerRuta } from '../middleware/auth.js';
import { protegerSuperAdmin } from '../middleware/superAdminAuth.js';

const router = express.Router();

// Crear directorio uploads si no existe
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'), false);
        }
    }
});

// Rutas para clientes
router.post('/', protegerRuta, upload.array('attachments', 5), createSuggestion);

// Rutas para superadmin
router.get('/admin/all', protegerSuperAdmin, getAllSuggestions);
router.get('/admin/stats', protegerSuperAdmin, getSuggestionsStats);
router.get('/admin/:id', protegerSuperAdmin, getSuggestionById);
router.patch('/admin/:id/view', protegerSuperAdmin, markSuggestionAsViewed);
router.patch('/admin/:id/status', protegerSuperAdmin, updateSuggestionStatus);
router.delete('/admin/:id', protegerSuperAdmin, deleteSuggestion);

export default router;