// src/backend/controllers/avisoController.js
import Aviso from '../models/Aviso.js';
import mongoose from 'mongoose';

class AvisoController {
    
    // ========== SUPER ADMIN: CRUD ==========
    async getAllAvisos(req, res) {
        try {
            const { page = 1, limit = 20, activo, tipo } = req.query;
            const query = {};
            if (activo !== undefined) query.activo = activo === 'true';
            if (tipo) query.tipo = tipo;
            
            const avisos = await Aviso.find(query)
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .lean();
            
            const total = await Aviso.countDocuments(query);
            
            res.json({ success: true, avisos, pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener avisos' });
        }
    }
    
    async getAvisoById(req, res) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID inválido' });
            const aviso = await Aviso.findById(id).lean();
            if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });
            res.json({ success: true, aviso });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al obtener aviso' });
        }
    }
    
    async createAviso(req, res) {
    try {
        const { titulo, descripcion, tipo, prioridad, fechaInicio, fechaFin } = req.body;
        
        if (!titulo || !descripcion || !fechaInicio || !fechaFin) {
            return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
        }
        
        // Validación con strings YYYY-MM-DD
        const hoy = new Date();
        const hoyStr = hoy.getFullYear() + '-' + 
                      String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(hoy.getDate()).padStart(2, '0');
        
        if (fechaInicio < hoyStr) {
            return res.status(400).json({ 
                success: false, 
                message: 'La fecha de inicio no puede ser anterior a hoy' 
            });
        }
        
        if (fechaFin < fechaInicio) {
            return res.status(400).json({ 
                success: false, 
                message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio' 
            });
        }
        
        // Guardar con mediodía UTC para evitar desplazamiento de zona horaria
        const inicio = new Date(fechaInicio + 'T12:00:00.000Z');
        const fin = new Date(fechaFin + 'T12:00:00.000Z');
        
        const nuevoAviso = new Aviso({
            titulo, descripcion,
            tipo: tipo || 'general',
            prioridad: prioridad || 'media',
            fechaInicio: inicio,
            fechaFin: fin,
            creadoPor: req.superAdmin?.usuario || 'superadmin',
            creadoPorNombre: 'Super Administrador'
        });
        
        await nuevoAviso.save();
        res.status(201).json({ success: true, message: 'Aviso creado', aviso: nuevoAviso });
    } catch (error) {
        console.error('Error al crear aviso:', error);
        res.status(500).json({ success: false, message: 'Error al crear aviso' });
    }
}
    
    async updateAviso(req, res) {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID inválido' });
        }
        
        const aviso = await Aviso.findById(id);
        if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });
        
        const { titulo, descripcion, tipo, prioridad, fechaInicio, fechaFin, activo } = req.body;
        
        if (fechaInicio !== undefined || fechaFin !== undefined) {
            const nuevoInicioStr = fechaInicio !== undefined ? fechaInicio : aviso.fechaInicio.toISOString().split('T')[0];
            const nuevoFinStr = fechaFin !== undefined ? fechaFin : aviso.fechaFin.toISOString().split('T')[0];
            
            if (fechaInicio !== undefined) {
                const hoy = new Date();
                const hoyStr = hoy.getFullYear() + '-' + 
                              String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(hoy.getDate()).padStart(2, '0');
                
                if (fechaInicio < hoyStr) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'La fecha de inicio no puede ser anterior a hoy' 
                    });
                }
            }
            
            if (nuevoFinStr < nuevoInicioStr) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio' 
                });
            }
            
            if (fechaInicio !== undefined) aviso.fechaInicio = new Date(fechaInicio + 'T12:00:00.000Z');
            if (fechaFin !== undefined) aviso.fechaFin = new Date(fechaFin + 'T12:00:00.000Z');
        }
        
        if (titulo !== undefined) aviso.titulo = titulo;
        if (descripcion !== undefined) aviso.descripcion = descripcion;
        if (tipo !== undefined) aviso.tipo = tipo;
        if (prioridad !== undefined) aviso.prioridad = prioridad;
        if (activo !== undefined) aviso.activo = activo;
        
        await aviso.save();
        res.json({ success: true, message: 'Aviso actualizado', aviso });
    } catch (error) {
        console.error('Error al actualizar aviso:', error);
        res.status(500).json({ success: false, message: 'Error al actualizar aviso' });
    }
}
    
    async deleteAviso(req, res) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID inválido' });
            const aviso = await Aviso.findByIdAndDelete(id);
            if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });
            res.json({ success: true, message: 'Aviso eliminado' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al eliminar aviso' });
        }
    }
    
    // ========== CLIENTE ==========
    async getAvisosVigentes(req, res) {
        try {
            const userId = req.user.id || req.user._id;
            const ahora = new Date();
            
            const avisos = await Aviso.find({
                activo: true,
                fechaInicio: { $lte: ahora },
                fechaFin: { $gte: ahora }
            }).sort({ prioridad: -1, fechaInicio: 1 }).lean();
            
            const avisosNoVistos = avisos.filter(a => {
                const visto = a.vistoPor?.some(id => id.toString() === userId.toString());
                return !visto;
            });
            
            res.json({ success: true, avisos: avisosNoVistos, count: avisosNoVistos.length });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener avisos' });
        }
    }

    async getTodosVigentes(req, res) {
        try {
            const ahora = new Date();
            const avisos = await Aviso.find({
                activo: true,
                fechaInicio: { $lte: ahora },
                fechaFin: { $gte: ahora }
            }).sort({ prioridad: -1, fechaInicio: 1 }).lean();
            
            res.json({ success: true, avisos, count: avisos.length });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ success: false, message: 'Error al obtener avisos' });
        }
    }
    
    async marcarVisto(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'ID inválido' });
            
            const aviso = await Aviso.findById(id);
            if (!aviso) return res.status(404).json({ success: false, message: 'Aviso no encontrado' });
            
            await aviso.marcarVisto(userId);
            res.json({ success: true, message: 'Aviso marcado como visto' });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al marcar aviso' });
        }
    }
    
    async marcarTodosVistos(req, res) {
        try {
            const userId = req.user.id;
            const ahora = new Date();
            
            const avisos = await Aviso.find({
                activo: true,
                fechaInicio: { $lte: ahora },
                fechaFin: { $gte: ahora },
                vistoPor: { $ne: userId }
            });
            
            for (const aviso of avisos) await aviso.marcarVisto(userId);
            res.json({ success: true, message: `${avisos.length} avisos marcados como vistos` });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error al marcar avisos' });
        }
    }
}

export default new AvisoController();