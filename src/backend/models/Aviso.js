// src/backend/models/Aviso.js
import mongoose from 'mongoose';

const AvisoSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, 'El título es obligatorio'],
        trim: true,
        maxlength: [200, 'El título no puede exceder 200 caracteres']
    },
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true,
        maxlength: [5000, 'La descripción no puede exceder 5000 caracteres']
    },
    tipo: {
        type: String,
        enum: ['general', 'mantenimiento', 'importante', 'actualizacion', 'evento'],
        default: 'general'
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta', 'critica'],
        default: 'media'
    },
    fechaInicio: {
        type: Date,
        required: true,
        default: Date.now
    },
    fechaFin: {
        type: Date,
        required: true
    },
    activo: {
        type: Boolean,
        default: true
    },
    vistoPor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    creadoPor: {
        type: String,
        required: true
    },
    creadoPorNombre: {
        type: String,
        required: true
    }
}, { timestamps: true });

AvisoSchema.index({ activo: 1, fechaInicio: 1, fechaFin: 1 });

AvisoSchema.methods.estaVigente = function() {
    const ahora = new Date();
    return this.activo && this.fechaInicio <= ahora && this.fechaFin >= ahora;
};

AvisoSchema.methods.marcarVisto = async function(userId) {
    if (!this.vistoPor.includes(userId)) {
        this.vistoPor.push(userId);
        await this.save();
    }
    return this;
};

const Aviso = mongoose.model('Aviso', AvisoSchema);
export default Aviso;