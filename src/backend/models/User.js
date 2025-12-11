import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: [true, 'El usuario es requerido'],
        unique: true,
        trim: true,
        minlength: [3, 'El usuario debe tener al menos 3 caracteres']
    },
    correo: {
        type: String,
        required: [true, 'El correo es requerido'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un correo válido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    rol: {
        type: String,
        enum: ['administrador'],
        default: 'administrador'
    },
    activo: {
        type: Boolean,
        default: true
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    changeAdminToken: String,
    changeAdminExpires: Date,
    ultimoAcceso: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function(next) {
    // Solo hashear si la contraseña ha sido modificada
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Método para comparar contraseñas
userSchema.methods.compararPassword = async function(passwordIngresada) {
    return await bcrypt.compare(passwordIngresada, this.password);
};

// Método para generar token de recuperación
userSchema.methods.generarTokenRecuperacion = function() {
    const token = crypto.randomBytes(20).toString('hex');
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    // Token expira en 1 hora
    this.resetPasswordExpires = Date.now() + 3600000;
    
    return token;
};

// Método para generar token de cambio de administrador
userSchema.methods.generarTokenCambioAdmin = function() {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.changeAdminToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    // Token expira en 24 horas
    this.changeAdminExpires = Date.now() + 86400000;
    
    return token;
};

const User = mongoose.model('User', userSchema);

export default User;
