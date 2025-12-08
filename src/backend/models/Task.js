import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    descripcion: String,
    prioridad: { 
        type: String, 
        enum: ['baja', 'media', 'alta'], 
        default: 'media' 
    },
    estado: { 
        type: String, 
        enum: ['pendiente', 'en-progreso', 'completada'], 
        default: 'pendiente' 
    },
    categoria: String,
    recordatorio: { type: Boolean, default: false },
    fecha_limite: Date,
    hora_limite: String,
    fecha_creacion: { type: Date, default: Date.now },
    fecha_actualizacion: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true }
}, { timestamps: true });

// Usar export default
const Task = mongoose.model('Task', taskSchema);
export default Task;