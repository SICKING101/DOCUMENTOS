// src/backend/models/Invitation.js
// Modelo de invitaciones para nuevos administradores.
// El SuperAdmin genera una invitación con token de 8 chars que se envía por email.
// El usuario debe validar ese token antes de poder registrarse como administrador.

import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema({
  // ── Email del invitado ──────────────────────────────────────────────────────
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Formato de email inválido'],
  },

  // ── Identificador único de la escuela ──────────────────────────────────────
  schoolId: {
    type: String,
    required: [true, 'El schoolId es requerido'],
    unique: true,
    index: true,
  },

  // ── Nombre descriptivo de la escuela ───────────────────────────────────────
  schoolName: {
    type: String,
    required: [true, 'El nombre de escuela es requerido'],
    trim: true,
    maxlength: [200, 'Nombre demasiado largo'],
  },

  // ── Token corto de 8 caracteres alfanuméricos (MAYÚSCULAS) ─────────────────
  // Ejemplo: "A3B7K9X2"
  // Este es el que se muestra/envía al usuario por email.
  token: {
    type: String,
    required: [true, 'El token es requerido'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 8,
    maxlength: 8,
  },

  // ── Fecha de expiración (48h desde creación) ───────────────────────────────
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },

  // ── Estado de la invitación ────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'used', 'expired', 'revoked'],
    default: 'pending',
    index: true,
  },

  // ── Quién la creó ──────────────────────────────────────────────────────────
  createdBy: {
    type: String,
    default: 'superadmin',
  },

  // ── Cuándo fue usada ───────────────────────────────────────────────────────
  usedAt: {
    type: Date,
    default: null,
  },

  // ── Usuario creado a partir de esta invitación ─────────────────────────────
  createdUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // ── Intentos de validación ────────────────────────────────────────────────
  // Máximo 5 intentos fallidos antes de revocar automáticamente
  attempts: {
    type: Number,
    default: 0,
    max: [5, 'Demasiados intentos'],
  },

  lastAttemptAt: {
    type: Date,
    default: null,
  },

}, {
  timestamps: true,
});

// =============================================================================
// ÍNDICES ADICIONALES
// =============================================================================
invitationSchema.index({ email: 1, status: 1 });
invitationSchema.index({ expiresAt: 1, status: 1 });

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Auto-expirar tokens vencidos al guardar
invitationSchema.pre('save', function (next) {
  if (this.status === 'pending' && this.expiresAt < new Date()) {
    this.status = 'expired';
    console.log(`🔄 [Invitation] Token ${this.token} marcado como expirado`);
  }
  next();
});

// =============================================================================
// MÉTODOS DE INSTANCIA
// =============================================================================

/**
 * Verifica si la invitación es válida para ser usada.
 */
invitationSchema.methods.isValid = function () {
  return (
    this.status === 'pending' &&
    this.expiresAt > new Date() &&
    this.attempts < 5
  );
};

/**
 * Registra un intento fallido de validación.
 * Si supera 5 intentos, revoca automáticamente.
 */
invitationSchema.methods.registerFailedAttempt = async function () {
  this.attempts += 1;
  this.lastAttemptAt = new Date();
  if (this.attempts >= 5) {
    this.status = 'revoked';
    console.warn(`⚠️ [Invitation] Token ${this.token} revocado por exceso de intentos`);
  }
  return this.save();
};

/**
 * Tiempo restante en horas (virtual).
 */
invitationSchema.virtual('hoursRemaining').get(function () {
  if (!this.expiresAt) return 0;
  const diff = this.expiresAt - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
});

// =============================================================================
// MÉTODOS ESTÁTICOS
// =============================================================================

/**
 * Genera un token corto de 8 caracteres alfanuméricos en MAYÚSCULAS.
 * Excluye caracteres ambiguos (0, O, I, L, 1) para mejor legibilidad.
 * Ejemplo: "A3B7K9X2"
 */
invitationSchema.statics.generateShortToken = function () {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Sin 0,O,I,L,1 para evitar confusión
  let token = '';
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    token += chars[randomBytes[i] % chars.length];
  }
  return token;
};

/**
 * Genera un schoolId único basado en el nombre de la escuela + random hex.
 * Ejemplo: "school-cbtis-051-a1b2c3d4"
 */
invitationSchema.statics.generateSchoolId = function (schoolName) {
  const slug = schoolName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  const random = crypto.randomBytes(4).toString('hex');
  return `school-${slug}-${random}`;
};

/**
 * Busca una invitación por token (case-insensitive, trimmed).
 */
invitationSchema.statics.findByToken = function (token) {
  return this.findOne({
    token: token.trim().toUpperCase(),
    status: 'pending',
  });
};

/**
 * Limpia invitaciones expiradas (para tarea programada).
 */
invitationSchema.statics.cleanupExpired = function () {
  return this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: new Date() },
    },
    { $set: { status: 'expired' } }
  );
};

const Invitation = mongoose.model('Invitation', invitationSchema);
export default Invitation;