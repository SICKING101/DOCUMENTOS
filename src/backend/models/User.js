// src/backend/models/User.js
// Modelo de usuario.
//
// CAMBIO CLAVE vs versión anterior:
//   • El campo `rol` ya NO tiene `enum`. Acepta cualquier String.
//   • Solo se valida en el controller/middleware que sea un rol existente
//     (administrador, desactivado, o cualquier nombre de rol dinámico).
//   • Esto permite asignar roles creados dinámicamente desde el panel de Admin.

import mongoose from 'mongoose';
import bcrypt   from 'bcryptjs';

const DEBUG = true;
function ulog(...args) { if (DEBUG) console.log('👤 [User]', ...args); }

const userSchema = new mongoose.Schema(
  {
    // ─── Identidad ─────────────────────────────────────────────────────────
    usuario: {
      type:      String,
      required:  [true, 'El usuario es requerido'],
      unique:    true,
      trim:      true,
      minlength: [3,  'El usuario debe tener al menos 3 caracteres'],
      maxlength: [30, 'El usuario no puede superar 30 caracteres'],
    },
    correo: {
      type:     String,
      required: [true, 'El correo es requerido'],
      unique:   true,
      trim:     true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Formato de correo inválido'],
    },
    password: {
      type:     String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select:   false, // No se devuelve en queries por defecto
    },

    // ─── Rol ───────────────────────────────────────────────────────────────
    //
    // SIN enum — permite roles dinámicos creados desde el panel de Admin.
    // Valores especiales:
    //   "administrador" → acceso total, protegido en controller
    //   "desactivado"   → sin acceso, usuario bloqueado
    //   cualquier otro  → rol dinámico, permisos en colección roles
    //
    rol: {
      type:    String,
      default: 'desactivado',
      trim:    true,
    },

    // ─── Estado ────────────────────────────────────────────────────────────
    activo: {
      type:    Boolean,
      default: true,
    },

    // ─── Metadatos ─────────────────────────────────────────────────────────
    ultimoAcceso: {
      type:    Date,
      default: null,
    },
    createdBy: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     'User',
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automáticos
  }
);

// =============================================================================
// ÍNDICES
// =============================================================================

userSchema.index({ usuario: 1 });
userSchema.index({ correo:  1 });
userSchema.index({ rol:     1 }); // útil para aggregate de conteo por rol

// =============================================================================
// MIDDLEWARE — Hash de contraseña antes de guardar
// =============================================================================

userSchema.pre('save', async function (next) {
  // Solo hashear si la contraseña fue modificada
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    ulog(`pre-save: contraseña hasheada para usuario "${this.usuario}"`);
    next();
  } catch (e) {
    next(e);
  }
});

// =============================================================================
// MÉTODOS DE INSTANCIA
// =============================================================================

/**
 * Compara una contraseña en texto plano con el hash almacenado.
 */
userSchema.methods.comparePassword = async function (plainPassword) {
  try {
    return await bcrypt.compare(plainPassword, this.password);
  } catch (e) {
    console.error('❌ [User] comparePassword error:', e);
    return false;
  }
};

/**
 * Verifica si el usuario está activo y no está desactivado.
 */
userSchema.methods.isActiveUser = function () {
  return this.activo === true && this.rol !== 'desactivado';
};

/**
 * Registra el último acceso del usuario.
 */
userSchema.methods.registrarAcceso = async function () {
  this.ultimoAcceso = new Date();
  await this.save({ validateBeforeSave: false });
};

/**
 * Serializa el usuario para devolver en respuestas JSON (sin password).
 */
userSchema.methods.toPublicJSON = function () {
  return {
    id:           this._id,
    usuario:      this.usuario,
    correo:       this.correo,
    rol:          this.rol,
    activo:       this.activo,
    ultimoAcceso: this.ultimoAcceso,
    createdAt:    this.createdAt,
    updatedAt:    this.updatedAt,
  };
};

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Busca un usuario por credenciales para login.
 * Devuelve null si no existe o las credenciales son incorrectas.
 */
userSchema.statics.findByCredentials = async function (usuarioOCorreo, password) {
  try {
    // Buscar por usuario o correo
    const user = await this.findOne({
      $or: [
        { usuario: usuarioOCorreo.trim() },
        { correo:  usuarioOCorreo.trim().toLowerCase() },
      ],
    }).select('+password'); // Incluir password para la comparación

    if (!user) {
      ulog('findByCredentials: usuario no encontrado');
      return null;
    }

    const match = await user.comparePassword(password);
    if (!match) {
      ulog('findByCredentials: contraseña incorrecta');
      return null;
    }

    ulog(`findByCredentials: login exitoso para "${user.usuario}" (rol: ${user.rol})`);
    return user;

  } catch (e) {
    console.error('❌ [User] findByCredentials error:', e);
    return null;
  }
};

/**
 * Cuenta usuarios agrupados por rol.
 * Útil para estadísticas en el panel de Admin.
 */
userSchema.statics.countByRole = async function () {
  const result = await this.aggregate([
    { $group: { _id: '$rol', count: { $sum: 1 } } },
    { $sort:  { count: -1 } },
  ]);
  const map = {};
  result.forEach(r => { map[r._id] = r.count; });
  return map;
};

const User = mongoose.model('User', userSchema);

export default User;
