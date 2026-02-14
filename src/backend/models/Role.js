import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    descripcion: String,
    permisos: [{
        type: String,
        enum: [
            'ver_dashboard',
            'ver_personas',
            // ... todos los permisos
        ]
    }],
    esPredeterminado: {
        type: Boolean,
        default: false
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

export default mongoose.model('Role', roleSchema);