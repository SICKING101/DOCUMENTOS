const mongoose = require('mongoose');

const historialSchema = new mongoose.Schema({
    accion: {
        type: String,
        required: true,
        enum: [
            // Acciones de documentos
            'documento_subido',
            'documento_eliminado',
            'documento_restaurado',
            'documento_eliminado_definitivo',
            'documento_descargado',
            'documento_visualizado',
            
            // Acciones de personas
            'persona_agregada',
            'persona_editada',
            'persona_eliminada',
            
            // Acciones de categorías
            'categoria_agregada',
            'categoria_editada',
            'categoria_eliminada',
            
            // Acciones de reportes
            'reporte_generado',
            'reporte_documentos',
            'reporte_personas',
            
            // Acciones de tareas
            'tarea_creada',
            'tarea_editada',
            'tarea_completada',
            'tarea_eliminada',
            
            // Acciones de sistema
            'sistema_iniciado',
            'papelera_vaciada',
            
            // Acciones de búsqueda
            'busqueda_realizada',
            'filtro_aplicado'
        ]
    },
    descripcion: {
        type: String,
        required: true
    },
    usuario: {
        type: String,
        default: 'Sistema'
    },
    ip: {
        type: String,
        default: 'localhost'
    },
    modulo: {
        type: String,
        required: true,
        enum: ['documentos', 'personas', 'categorias', 'reportes', 'tareas', 'papelera', 'busqueda', 'sistema']
    },
    // Referencias opcionales según el tipo de acción
    documento_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
    },
    persona_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Person'
    },
    categoria_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    // Metadata adicional flexible
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    fecha: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Índices para optimizar consultas
historialSchema.index({ fecha: -1 });
historialSchema.index({ accion: 1 });
historialSchema.index({ modulo: 1 });
historialSchema.index({ usuario: 1 });
historialSchema.index({ modulo: 1, fecha: -1 });

// Método estático para limpiar historial antiguo
historialSchema.statics.limpiarAntiguo = async function(dias = 90) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    const resultado = await this.deleteMany({
        fecha: { $lt: fechaLimite }
    });
    
    return resultado.deletedCount;
};

// Método estático para obtener estadísticas
historialSchema.statics.obtenerEstadisticas = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$modulo',
                total: { $sum: 1 },
                ultimaAccion: { $max: '$fecha' }
            }
        },
        {
            $sort: { total: -1 }
        }
    ]);
    
    return stats;
};

const Historial = mongoose.model('Historial', historialSchema);

module.exports = Historial;
