// ============================================================================
// src/backend/models/User.js (ACTUALIZADO)
// ============================================================================
// MODELO DE USUARIOS CON SOPORTE PARA ÚNICO ADMINISTRADOR
// ============================================================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PERMISOS_IDS } from './Role.js';

const userSchema = new mongoose.Schema({
    usuario: {
        type: String,
        required: [true, 'El usuario es requerido'],
        unique: true,
        trim: true,
        minlength: [3, 'El usuario debe tener al menos 3 caracteres'],
        maxlength: [30, 'El usuario no puede exceder 30 caracteres']
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
    
    // Rol del usuario (referencia a Role)
    rol: {
        type: String,
        required: true,
        default: 'usuario'
        // No ponemos enum fijo porque los roles pueden ser dinámicos
    },
    
    // Permisos específicos (adicionales al rol)
    permisos: [{
        type: String,
        enum: PERMISOS_IDS
    }],
    
    // Indicador de único administrador
    esAdminUnico: {
        type: Boolean,
        default: false
    },
    
    activo: {
        type: Boolean,
        default: true
    },
    
    // Tokens de recuperación
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    changePasswordToken: String,
    changePasswordExpires: Date,
    changeAdminToken: String,
    changeAdminExpires: Date,
    
    ultimoAcceso: {
        type: Date,
        default: Date.now
    },
    
    deactivationBackup: {
        originalEmail: String,
        originalUsername: String,
        deactivatedAt: Date
    },
    
    deactivatedAt: Date,
    
    // Metadatos
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    editadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Índices
userSchema.index({ usuario: 1 });
userSchema.index({ correo: 1 });
userSchema.index({ rol: 1 });
userSchema.index({ activo: 1 });
userSchema.index({ esAdminUnico: 1 });

// Middleware pre-save para hashear contraseña
userSchema.pre('save', async function(next) {
    // Si la contraseña ya es un hash bcrypt, no la hasheamos de nuevo
    const bcryptPattern = /^\$2[abxy]\$\d{1,2}\$[A-Za-z0-9./]{53}$/;
    
    if (this.password && bcryptPattern.test(this.password)) {
        console.log('🔐 Contraseña ya encriptada, omitiendo hasheo');
        return next();
    }
    
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

// Métodos de instancia
userSchema.methods.compararPassword = async function(passwordIngresada) {
    return await bcrypt.compare(passwordIngresada, this.password);
};

userSchema.methods.generarCodigoRecuperacion = function() {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(codigo)
        .digest('hex');
    
    this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    
    return codigo;
};

userSchema.methods.generarTokenCambioPassword = function() {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.changePasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    this.changePasswordExpires = Date.now() + 30 * 60 * 1000;
    
    return token;
};

userSchema.methods.generarTokenCambioAdmin = function() {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.changeAdminToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    this.changeAdminExpires = Date.now() + 86400000;
    
    return token;
};

// Método para obtener permisos efectivos (rol + específicos)
userSchema.methods.obtenerPermisosEfectivos = async function() {
    // Si es admin único, tiene todos los permisos
    if (this.esAdminUnico) {
        return PERMISOS_IDS;
    }
    
    // Buscar el rol
    const Role = mongoose.model('Role');
    const rol = await Role.findOne({ nombre: this.rol });
    
    const permisosRol = rol?.permisos || [];
    const permisosEspecificos = this.permisos || [];
    
    // Combinar (específicos sobrescriben a rol)
    return [...new Set([...permisosRol, ...permisosEspecificos])];
};

// Método para verificar si tiene un permiso específico
userSchema.methods.tienePermiso = async function(permisoId) {
    if (this.esAdminUnico) return true;
    
    const permisos = await this.obtenerPermisosEfectivos();
    return permisos.includes(permisoId);
};

// Método estático para asegurar único administrador
userSchema.statics.asegurarUnicoAdmin = async function() {
    const admins = await this.find({ 
        rol: 'administrador', 
        activo: true 
    });
    
    if (admins.length === 0) {
        console.log('⚠️ No hay administradores activos');
        return;
    }
    
    if (admins.length === 1) {
        // Marcar como único
        if (!admins[0].esAdminUnico) {
            admins[0].esAdminUnico = true;
            await admins[0].save();
            console.log(`✅ ${admins[0].usuario} marcado como único administrador`);
        }
        return;
    }
    
    // Si hay múltiples, desactivar todos menos el primero
    console.log(`⚠️ Detectados ${admins.length} administradores. Corrigiendo...`);
    
    for (let i = 1; i < admins.length; i++) {
        admins[i].rol = 'usuario';
        admins[i].esAdminUnico = false;
        await admins[i].save();
        console.log(`➡️ ${admins[i].usuario} convertido a usuario normal`);
    }
    
    // Marcar el primero como único
    admins[0].esAdminUnico = true;
    await admins[0].save();
    console.log(`✅ ${admins[0].usuario} es ahora el único administrador`);
};

const User = mongoose.model('User', userSchema);

export default User;