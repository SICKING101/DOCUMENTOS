// src/backend/controllers/suggestionController.js
import Suggestion from '../models/Suggestion.js';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// =============================================================================
// CLIENTE - Crear nueva sugerencia
// =============================================================================
export const createSuggestion = async (req, res) => {
    try {
        console.log('\n💡 ========== NUEVA SUGERENCIA ==========');
        
        const { titulo, descripcion, categoria } = req.body;
        
        if (!titulo || !descripcion) {
            return res.status(400).json({
                success: false,
                message: 'El título y la descripción son obligatorios'
            });
        }
        
        let usuarioNombre = 'Usuario Anónimo';
        let usuarioEmail = 'anonimo@cbtis051.edu.mx';
        let usuarioId = null;
        let usuarioRol = 'anonimo';
        
        if (req.user && req.user._id) {
            usuarioId = req.user._id;
            usuarioNombre = req.user.usuario || req.user.name || 'Usuario del Sistema';
            usuarioEmail = req.user.correo || req.user.email || 'usuario@cbtis051.edu.mx';
            usuarioRol = req.user.rol || 'usuario';
        }
        
        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'sugerencias',
                        resource_type: 'auto'
                    });
                    
                    attachments.push({
                        filename: file.originalname,
                        originalname: file.originalname,
                        size: file.size,
                        mimetype: file.mimetype,
                        cloudinary_url: result.secure_url,
                        public_id: result.public_id,
                        uploadedAt: new Date()
                    });
                    
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                } catch (uploadError) {
                    console.error(`Error subiendo ${file.originalname}:`, uploadError.message);
                }
            }
        }
        
        const suggestion = new Suggestion({
            titulo: titulo.trim(),
            descripcion: descripcion.trim(),
            categoria: categoria || 'mejora',
            attachments,
            usuario: {
                id: usuarioId,
                nombre: usuarioNombre,
                email: usuarioEmail,
                rol: usuarioRol
            },
            estado: 'pendiente',
            fechaEnvio: new Date(),
            metadata: {
                userAgent: req.headers['user-agent'] || '',
                ipAddress: req.ip || req.connection?.remoteAddress || ''
            }
        });
        
        await suggestion.save();
        
        res.status(201).json({
            success: true,
            message: 'Sugerencia enviada exitosamente',
            suggestion: suggestion.toPublicJSON(),
            suggestionNumber: suggestion.suggestionNumber
        });
        
    } catch (error) {
        console.error('Error creando sugerencia:', error.message);
        if (req.files) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error al enviar la sugerencia'
        });
    }
};

// =============================================================================
// SUPERADMIN - Obtener todas las sugerencias
// =============================================================================
export const getAllSuggestions = async (req, res) => {
    try {
        const { estado, categoria, limit = 50, page = 1 } = req.query;
        
        const query = {};
        if (estado && estado !== 'todos') query.estado = estado;
        if (categoria && categoria !== 'todas') query.categoria = categoria;
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const suggestions = await Suggestion.find(query)
            .sort({ fechaEnvio: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Suggestion.countDocuments(query);
        
        res.json({
            success: true,
            suggestions: suggestions.map(s => s.toPublicJSON()),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Error obteniendo sugerencias:', error.message);
        res.status(500).json({ success: false, message: 'Error al obtener sugerencias' });
    }
};

// =============================================================================
// SUPERADMIN - Obtener sugerencia por ID
// =============================================================================
export const getSuggestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const suggestion = await Suggestion.findById(id);
        
        if (!suggestion) {
            return res.status(404).json({ success: false, message: 'Sugerencia no encontrada' });
        }
        
        res.json({ success: true, suggestion });
        
    } catch (error) {
        console.error('Error obteniendo sugerencia:', error.message);
        res.status(500).json({ success: false, message: 'Error al obtener la sugerencia' });
    }
};

// =============================================================================
// SUPERADMIN - Marcar como vista
// =============================================================================
export const markSuggestionAsViewed = async (req, res) => {
    try {
        const { id } = req.params;
        const suggestion = await Suggestion.findById(id);
        
        if (!suggestion) {
            return res.status(404).json({ success: false, message: 'Sugerencia no encontrada' });
        }
        
        if (suggestion.estado === 'pendiente') {
            suggestion.estado = 'vista';
            suggestion.fechaVista = new Date();
            suggestion.vistaPor = req.superAdmin?.usuario || 'superadmin';
            await suggestion.save();
        }
        
        res.json({ success: true, message: 'Sugerencia marcada como vista' });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
};

// =============================================================================
// SUPERADMIN - Cambiar estado
// =============================================================================
export const updateSuggestionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        const estadosValidos = ['pendiente', 'vista', 'considerando', 'implementada', 'rechazada'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ success: false, message: 'Estado no válido' });
        }
        
        const suggestion = await Suggestion.findById(id);
        if (!suggestion) {
            return res.status(404).json({ success: false, message: 'Sugerencia no encontrada' });
        }
        
        suggestion.estado = estado;
        await suggestion.save();
        
        res.json({ success: true, message: `Estado actualizado a: ${estado}` });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, message: 'Error al actualizar el estado' });
    }
};

// =============================================================================
// SUPERADMIN - Eliminar sugerencia
// =============================================================================
export const deleteSuggestion = async (req, res) => {
    try {
        const { id } = req.params;
        const suggestion = await Suggestion.findById(id);
        
        if (!suggestion) {
            return res.status(404).json({ success: false, message: 'Sugerencia no encontrada' });
        }
        
        if (suggestion.attachments && suggestion.attachments.length > 0) {
            for (const attachment of suggestion.attachments) {
                if (attachment.public_id) {
                    try {
                        await cloudinary.uploader.destroy(attachment.public_id);
                    } catch (cloudError) {
                        console.error('Error eliminando de Cloudinary:', cloudError.message);
                    }
                }
            }
        }
        
        await suggestion.deleteOne();
        
        res.json({ success: true, message: 'Sugerencia eliminada exitosamente' });
        
    } catch (error) {
        console.error('Error eliminando sugerencia:', error.message);
        res.status(500).json({ success: false, message: 'Error al eliminar la sugerencia' });
    }
};

// =============================================================================
// SUPERADMIN - Estadísticas
// =============================================================================
export const getSuggestionsStats = async (req, res) => {
    try {
        const total = await Suggestion.countDocuments();
        const pendientes = await Suggestion.countDocuments({ estado: 'pendiente' });
        const vistas = await Suggestion.countDocuments({ estado: 'vista' });
        const considerando = await Suggestion.countDocuments({ estado: 'considerando' });
        const implementadas = await Suggestion.countDocuments({ estado: 'implementada' });
        const rechazadas = await Suggestion.countDocuments({ estado: 'rechazada' });
        
        const porCategoria = await Suggestion.aggregate([
            { $group: { _id: '$categoria', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        res.json({
            success: true,
            stats: { total, pendientes, vistas, considerando, implementadas, rechazadas },
            porCategoria
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
};