// ============================================================
// Conversation.js — Modelo de historial de conversaciones
// ============================================================

import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
    {
        usuario: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: true,
            index:    true,
        },
        mensajeUsuario: {
            type:     String,
            required: true,
            trim:     true,
            maxlength: 1000,
        },
        respuestaBot: {
            type:     String,
            required: true,
            trim:     true,
        },
        util: {
            type:    Boolean,
            default: null,   // null = sin feedback, true = útil, false = no útil
        },
        fuente: {
            type:    String,
            enum:    ['claude-ai', 'groq', 'fallback', 'rule-based'],
            default: 'rule-based',
        },
        latencia: {
            type: Number,  // milisegundos
        },
        timestamp: {
            type:    Date,
            default: Date.now,
            // ELIMINADO index: true para evitar duplicado
        },
    },
    {
        timestamps: false,  // usamos timestamp custom
        versionKey: false,
    }
);

// Índice compuesto para queries rápidas por usuario + fecha
conversationSchema.index({ usuario: 1, timestamp: -1 });

// TTL index: borrar automáticamente conversaciones > 90 días
// Este índice también cubre consultas por timestamp
conversationSchema.index(
    { timestamp: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;