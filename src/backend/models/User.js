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
        enum: [        'administrador', 
        'gerente',        // NUEVO
        'supervisor',     // NUEVO
        'editor', 
        'revisor', 
        'lector', 
        'moderador', 
        'desactivado', 
        'usuario'], 
        default: 'usuario'
    },
    activo: {
        type: Boolean,
        default: true
    },
    // Para código de 6 dígitos
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Para token de cambio de contraseña (después de verificar código)
    changePasswordToken: String,
    changePasswordExpires: Date,
    
    changeAdminToken: String,
    changeAdminExpires: Date,
    ultimoAcceso: {
        type: Date,
        default: Date.now
    },
    // Campos para respaldo de desactivación
    deactivationBackup: {
        originalEmail: String,
        originalUsername: String,
        deactivatedAt: Date
    },
    deactivatedAt: Date
}, {
    timestamps: true
});

// ¡¡¡SOLUCIÓN RADICAL: DESACTIVAR ENCRIPTACIÓN AUTOMÁTICA PARA ADMIN CHANGE!!!
userSchema.pre('save', async function(next) {
    // NO hacer nada si es una contraseña ya encriptada (viene de admin change)
    // Las contraseñas bcrypt tienen este patrón: $2a$10$... o $2b$10$...
    const bcryptPattern = /^\$2[abxy]\$\d{1,2}\$[A-Za-z0-9./]{53}$/;
    
    if (this.password && bcryptPattern.test(this.password)) {
        console.log('🔐 Contraseña ya encriptada (de admin change), omitiendo encriptación automática');
        return next();
    }
    
    // Solo hashear si la contraseña ha sido modificada y NO es de admin change
    if (!this.isModified('password') || this.password.startsWith('$2')) {
        return next();
    }

    try {
        console.log('🔐 Encriptando contraseña nueva...');
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

// Método para generar token de recuperación de 6 dígitos
userSchema.methods.generarCodigoRecuperacion = function() {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(codigo)
        .digest('hex');
    
    // Código expira en 15 minutos
    this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    
    return codigo;
};

// Método para generar token de cambio de contraseña (después de verificar código)
userSchema.methods.generarTokenCambioPassword = function() {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.changePasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    // Token expira en 30 minutos
    this.changePasswordExpires = Date.now() + 30 * 60 * 1000;
    
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