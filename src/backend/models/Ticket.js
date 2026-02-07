import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE TICKETS DE SOPORTE
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar tickets de soporte
// o incidencias en el sistema. Maneja el ciclo completo de vida de un ticket
// desde su creación hasta su resolución, incluyendo seguimiento, asignación,
// adjuntos, actualizaciones y comunicación con usuarios y administradores.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE TICKET
// ********************************************************************
// Descripción: Establece la estructura completa de datos para tickets
// de soporte, incluyendo identificación única, descripción del problema,
// clasificación, estado, relaciones con usuarios, adjuntos, historial
// de actualizaciones y metadatos de gestión del ciclo de vida.
// ********************************************************************
const ticketSchema = new mongoose.Schema({
    // =========================================================================
    // IDENTIFICACIÓN ÚNICA Y NUMERACIÓN
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.1: Número de ticket único y generado automáticamente
    // ----------------------------------------------------------------
    // Identificador único legible para referencia externa y seguimiento.
    // Se genera automáticamente combinando prefijo, timestamp y código
    // aleatorio para garantizar unicidad y trazabilidad temporal.
    ticketNumber: {
        type: String,
        unique: true,
        default: function() {
            return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        }
    },
    
    // =========================================================================
    // CONTENIDO Y DESCRIPCIÓN DEL TICKET
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.2: Asunto o título descriptivo del problema
    // ----------------------------------------------------------------
    // Resumen breve del problema o solicitud, esencial para identificación
    // rápida en listados y búsquedas. Incluye validaciones de longitud
    // y mensajes de error personalizados para mejor experiencia de usuario.
    subject: {
        type: String,
        required: [true, 'El asunto es obligatorio'],
        trim: true,
        maxlength: [200, 'El asunto no puede exceder 200 caracteres']
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.3: Descripción detallada del problema
    // ----------------------------------------------------------------
    // Explicación completa del incidente, solicitud o problema técnico.
    // Debe incluir todos los detalles relevantes para que el equipo de
    // soporte pueda entender y reproducir el problema si es necesario.
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true
    },
    
    // =========================================================================
    // CLASIFICACIÓN Y CATEGORIZACIÓN
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.4: Categoría temática del ticket
    // ----------------------------------------------------------------
    // Clasificación principal que determina el tipo de problema o área
    // afectada (ej: "software", "hardware", "facturación", "cuenta").
    // Facilita enrutamiento a equipos especializados y análisis de tendencias.
    category: {
        type: String,
        required: [true, 'La categoría es obligatoria'],
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.5: Nivel de urgencia del problema
    // ----------------------------------------------------------------
    // Define la prioridad de atención basada en impacto y urgencia.
    // Controla tiempos de respuesta esperados y notificaciones a soporte.
    priority: {
        type: String,
        required: [true, 'La prioridad es obligatoria'],
        enum: ['baja', 'media', 'alta', 'critica'],
        default: 'media'
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.6: Estado actual en el flujo de trabajo
    // ----------------------------------------------------------------
    // Representa la fase en la que se encuentra el ticket dentro del
    // proceso de resolución. Determina qué acciones están disponibles
    // y cómo se visualiza en diferentes vistas del sistema.
    status: {
        type: String,
        enum: ['abierto', 'en_proceso', 'resuelto', 'cerrado'],
        default: 'abierto'
    },
    
    // =========================================================================
    // INFORMACIÓN DEL USUARIO CREADOR
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.7: Referencia al usuario creador (opcional)
    // ----------------------------------------------------------------
    // Enlace al modelo User que representa al creador del ticket.
    // Es opcional para permitir tickets creados sin usuario autenticado
    // (ej: formularios públicos de contacto).
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.8: Nombre del creador para mostrar
    // ----------------------------------------------------------------
    // Nombre completo del usuario que creó el ticket, almacenado como
    // texto plano para facilitar visualización incluso si el usuario
    // es eliminado posteriormente del sistema.
    createdByName: {
        type: String,
        required: true
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.9: Email del creador para comunicación
    // ----------------------------------------------------------------
    // Dirección de correo del creador, esencial para notificaciones
    // y seguimiento por email. Se normaliza a minúsculas y se limpian
    // espacios para consistencia en búsquedas.
    createdByEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    
    // =========================================================================
    // INFORMACIÓN DEL ADMINISTRADOR PARA COMUNICACIÓN
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.10: Email del administrador responsable
    // ----------------------------------------------------------------
    // Dirección de correo del administrador o equipo asignado para
    // manejar la comunicación relacionada con este ticket. Proporciona
    // un fallback cuando no hay un usuario específico asignado.
    adminEmail: {
        type: String,
        required: true,
        default: 'riosnavarretejared@gmail.com'
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.11: Nombre del administrador para mostrar
    // ----------------------------------------------------------------
    // Nombre amigable del administrador o equipo que aparecerá en
    // comunicaciones con el usuario. Mejora la experiencia personalizada.
    adminName: {
        type: String,
        default: 'Administrador del Sistema'
    },
    
    // =========================================================================
    // ARCHIVOS ADJUNTOS AL TICKET
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.12: Colección de archivos adjuntos iniciales
    // ----------------------------------------------------------------
    // Array de archivos subidos al crear el ticket (capturas de pantalla,
    // logs, documentos, etc.). Incluye metadatos completos de Cloudinary
    // para gestión del almacenamiento externo.
    attachments: [{
        filename: String,
        originalname: String,
        size: Number,
        cloudinary_url: String,
        public_id: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // =========================================================================
    // HISTORIAL DE ACTUALIZACIONES Y SEGUIMIENTO
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.13: Registro detallado de todas las actualizaciones
    // ----------------------------------------------------------------
    // Historial cronológico completo de interacciones con el ticket,
    // incluyendo comentarios de usuarios, notas del sistema, cambios
    // de estado y archivos adicionales subidos durante el seguimiento.
    updates: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        },
        userName: String,
        message: String,
        type: {
            type: String,
            enum: ['user_update', 'system', 'status_change', 'admin_note'],
            default: 'user_update'
        },
        statusChange: {
            from: String,
            to: String
        },
        attachments: [{
            filename: String,
            url: String
        }],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // =========================================================================
    // ASIGNACIÓN Y GESTIÓN DEL CICLO DE VIDA
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.14: Usuario o agente asignado al ticket
    // ----------------------------------------------------------------
    // Referencia al miembro del equipo de soporte responsable de
    // gestionar y resolver este ticket específico. Permite distribución
    // de carga y especialización por tipo de problema.
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.15: Fecha de asignación a un agente
    // ----------------------------------------------------------------
    // Marca de tiempo que registra cuándo el ticket fue asignado a
    // un miembro específico del equipo. Utilizado para métricas de
    // tiempo de respuesta inicial.
    assignedAt: Date,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.16: Fecha de resolución del problema
    // ----------------------------------------------------------------
    // Marca de tiempo que registra cuándo se consideró resuelto el
    // problema técnico, antes del cierre formal y confirmación del usuario.
    resolvedAt: Date,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.17: Fecha de cierre formal del ticket
    // ----------------------------------------------------------------
    // Marca de tiempo que registra cuándo se cerró definitivamente
    // el ticket después de confirmación o tiempo de espera. Diferenciado
    // de resolvedAt para separar resolución técnica de cierre administrativo.
    closedAt: Date,
    
    // =========================================================================
    // CONFIGURACIÓN DE COMUNICACIÓN Y ESTADO
    // =========================================================================
    
    // ----------------------------------------------------------------
    // BLOQUE 1.18: Control de notificaciones por email
    // ----------------------------------------------------------------
    // Permite al usuario optar por no recibir notificaciones por email
    // sobre actualizaciones de este ticket específico, útil para tickets
    // muy activos o usuarios que prefieren solo notificaciones en app.
    emailNotifications: {
        type: Boolean,
        default: true
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.19: Marcador de eliminación temporal (soft delete)
    // ----------------------------------------------------------------
    // Indica si el ticket ha sido "eliminado" pero permanece en la
    // base de datos por razones históricas o de auditoría. Los tickets
    // marcados como eliminados no aparecen en consultas normales.
    isDeleted: {
        type: Boolean,
        default: false
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.20: Fecha de eliminación temporal
    // ----------------------------------------------------------------
    // Registra cuándo el ticket fue marcado como eliminado, permitiendo
    // implementar políticas de retención y limpieza automática después
    // de períodos específicos.
    deletedAt: Date
}, {
    // ----------------------------------------------------------------
    // BLOQUE 1.21: Habilitación de timestamps automáticos
    // ----------------------------------------------------------------
    // Activa campos createdAt y updatedAt gestionados automáticamente
    // por Mongoose. Proporcionan trazabilidad básica de creación y
    // modificación sin lógica adicional en la aplicación.
    timestamps: true
});

// ********************************************************************
// MÓDULO 2: CONFIGURACIÓN DE ÍNDICES PARA OPTIMIZACIÓN
// ********************************************************************
// Descripción: Define índices de base de datos para acelerar las
// consultas más frecuentes en el sistema de tickets, mejorando
// el rendimiento en operaciones de búsqueda, filtrado y reportes.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Índice único para número de ticket
// ----------------------------------------------------------------
// Garantiza búsquedas rápidas por número de ticket, operación
// común cuando usuarios y soporte referencian tickets por su ID legible.
ticketSchema.index({ ticketNumber: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.2: Índice para filtrado por estado
// ----------------------------------------------------------------
// Optimiza consultas que listan tickets por estado actual (abiertos,
// en proceso, resueltos), esencial para dashboards y gestión de carga.
ticketSchema.index({ status: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.3: Índice para filtrado por prioridad
// ----------------------------------------------------------------
// Acelera búsqueda de tickets críticos o de alta prioridad para
// atención urgente y gestión de niveles de servicio.
ticketSchema.index({ priority: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.4: Índice para filtrado por categoría
// ----------------------------------------------------------------
// Mejora rendimiento al agrupar tickets por tipo de problema,
// útil para reportes especializados y asignación por especialidad.
ticketSchema.index({ category: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.5: Índice para ordenamiento por fecha de creación
// ----------------------------------------------------------------
// Optimiza listados ordenados cronológicamente (más recientes primero),
// vista predeterminada en la mayoría de interfaces de ticket.
ticketSchema.index({ createdAt: -1 });

// ----------------------------------------------------------------
// BLOQUE 2.6: Índice para búsqueda por creador
// ----------------------------------------------------------------
// Acelera consultas para encontrar todos los tickets de un usuario
// específico, útil para historiales y autoservicio.
ticketSchema.index({ createdBy: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.7: Índice combinado para tickets de usuario por estado
// ----------------------------------------------------------------
// Optimiza consultas que buscan tickets específicos de un usuario
// filtrados por estado (ej: "tickets abiertos del usuario X").
ticketSchema.index({ createdBy: 1, status: 1 });

// ----------------------------------------------------------------
// BLOQUE 2.8: Índice para búsqueda por email de administrador
// ----------------------------------------------------------------
// Mejora rendimiento al filtrar tickets por administrador asignado,
// importante para distribución de carga y reportes por equipo.
ticketSchema.index({ adminEmail: 1 });

// ********************************************************************
// MÓDULO 3: MIDDLEWARE PRE-SAVE PARA VALIDACIÓN Y NORMALIZACIÓN
// ********************************************************************
// Descripción: Función que se ejecuta automáticamente antes de guardar
// cualquier documento de ticket para garantizar consistencia de datos,
// generación de identificadores únicos y normalización de referencias.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Validación y normalización automática pre-guardado
// ----------------------------------------------------------------
// Intercepta cada operación de guardado para aplicar lógica de
// normalización que garantice la integridad de los datos antes
// de persistirlos en la base de datos.
ticketSchema.pre('save', function(next) {
    // ------------------------------------------------------------
    // SUB-BLOQUE 3.1.1: Generación de número de ticket si falta
    // ------------------------------------------------------------
    // Asegura que cada ticket tenga un número único incluso si
    // se crea sin especificar uno (fallback del default function).
    if (!this.ticketNumber) {
        this.ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }
    
    // ------------------------------------------------------------
    // SUB-BLOQUE 3.1.2: Conversión de createdBy a ObjectId válido
    // ------------------------------------------------------------
    // Normaliza la referencia al usuario creador a formato ObjectId
    // de Mongoose, manejando tanto strings como objetos existentes.
    if (this.createdBy && typeof this.createdBy !== 'object') {
        try {
            this.createdBy = mongoose.Types.ObjectId(this.createdBy);
        } catch (error) {
            console.error('Error convirtiendo createdBy a ObjectId:', error);
        }
    }
    
    // ------------------------------------------------------------
    // SUB-BLOQUE 3.1.3: Asignación de valores por defecto para admin
    // ------------------------------------------------------------
    // Proporciona valores de respaldo para campos de administrador
    // cuando no se especifican explícitamente, garantizando que
    // siempre haya información de contacto disponible.
    if (!this.adminEmail) {
        this.adminEmail = 'riosnavarretejared@gmail.com';
    }
    
    if (!this.adminName) {
        this.adminName = 'Administrador del Sistema';
    }
    
    next();
});

// ********************************************************************
// MÓDULO 4: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios y
// cualquier otra parte de la aplicación que necesite gestionar tickets.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 4.1: Instanciación del modelo Ticket
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Ticket' que se mapea a la colección
// 'tickets' en MongoDB. Sigue la convención de pluralización
// automática de Mongoose para nombres de colecciones.
const Ticket = mongoose.model('Ticket', ticketSchema);

// ----------------------------------------------------------------
// BLOQUE 4.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules:
// import Ticket from './models/Ticket.js'
export default Ticket;