// src/backend/models/Notification.js
import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE NOTIFICACIONES
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar el sistema de
// notificaciones. Maneja eventos del sistema, alertas para usuarios,
// seguimiento de lecturas, prioridades y estadísticas de actividad del sistema.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE NOTIFICACIÓN
// ********************************************************************
// Descripción: Establece la estructura completa para notificaciones del
// sistema, incluyendo tipos predefinidos, contenido, prioridades, estado
// de lectura, relaciones con otros modelos y metadatos extendidos.
// ********************************************************************
const notificationSchema = new mongoose.Schema({
  // ----------------------------------------------------------------
  // BLOQUE 1.1: Tipo de notificación predefinida
  // ----------------------------------------------------------------
  // Categoría principal que define el evento o acción que generó
  // la notificación. Utiliza un conjunto predefinido de valores
  // para mantener consistencia en el sistema y permitir filtrados.
  tipo: {
    type: String,
    required: true,
    enum: [
      'documento_subido',
      'documento_eliminado',
      'documento_restaurado',
      'documento_proximo_vencer',
      'documento_vencido',
      'persona_agregada',
      'persona_eliminada',
      'categoria_agregada',
      'categoria_eliminada',
      'reporte_generado',
      'sistema_iniciado',
      'error_sistema'
    ]
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.2: Título descriptivo de la notificación
  // ----------------------------------------------------------------
  // Resumen breve que aparece como encabezado de la notificación
  // en interfaces de usuario. Debe ser claro y descriptivo para
  // identificación rápida del evento.
  titulo: {
    type: String,
    required: true,
    maxlength: 200
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.3: Mensaje detallado de la notificación
  // ----------------------------------------------------------------
  // Contenido completo que describe el evento con más detalle.
  // Puede incluir información específica, contexto o instrucciones
  // relacionadas con la acción notificada.
  mensaje: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.4: Icono representativo visual
  // ----------------------------------------------------------------
  // Nombre del icono que acompaña visualmente a la notificación
  // en interfaces de usuario. Ayuda a identificación rápida por
  // tipo de evento mediante representación visual.
  icono: {
    type: String,
    default: 'bell'
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.5: Nivel de prioridad del evento
  // ----------------------------------------------------------------
  // Define la importancia o urgencia de la notificación para
  // determinar su presentación visual y comportamiento en el
  // sistema (colores, orden, sonidos, etc.).
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media'
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.6: Estado de lectura por el usuario
  // ----------------------------------------------------------------
  // Indica si el usuario destinatario ha visto o interactuado
  // con la notificación. Utilizado para calcular badges de
  // notificaciones no leídas y limpieza automática.
  leida: {
    type: Boolean,
    default: false
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.7: Referencia a documento relacionado
  // ----------------------------------------------------------------
  // Enlace opcional al documento asociado con la notificación
  // (cuando el evento está relacionado con un documento).
  // Permite navegación directa al recurso desde la notificación.
  documento_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.8: Referencia a persona relacionada
  // ----------------------------------------------------------------
  // Enlace opcional a la persona asociada con la notificación
  // (cuando el evento está relacionado con una persona).
  documento_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    default: null
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.9: Referencia a categoría relacionada
  // ----------------------------------------------------------------
  // Enlace opcional a la categoría asociada con la notificación
  // (cuando el evento está relacionado con una categoría).
  categoria_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.10: Metadatos adicionales flexibles
  // ----------------------------------------------------------------
  // Objeto flexible para almacenar información adicional específica
  // de cada tipo de notificación. Puede incluir URLs, IDs adicionales,
  // valores numéricos o cualquier dato necesario para el contexto.
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.11: Fecha de creación explícita
  // ----------------------------------------------------------------
  // Marca de tiempo específica para la creación de la notificación,
  // independiente de los timestamps automáticos. Utilizada para
  // consultas específicas por fecha de evento.
  fecha_creacion: {
    type: Date,
    default: Date.now
  }
}, {
  // ----------------------------------------------------------------
  // BLOQUE 1.12: Habilitación de timestamps automáticos
  // ----------------------------------------------------------------
  // Activa campos createdAt y updatedAt gestionados automáticamente
  // por Mongoose para auditoría y seguimiento de modificaciones.
  timestamps: true
});

// ********************************************************************
// MÓDULO 2: CONFIGURACIÓN DE ÍNDICES PARA OPTIMIZACIÓN
// ********************************************************************
// Descripción: Define índices de base de datos para acelerar las
// consultas más frecuentes en el sistema de notificaciones, mejorando
// el rendimiento en operaciones de listado, filtrado y estadísticas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Índice para ordenamiento por fecha descendente
// ----------------------------------------------------------------
// Optimiza consultas que necesitan mostrar notificaciones ordenadas
// de más reciente a más antigua, como en listados principales.
notificationSchema.index({ fecha_creacion: -1 });

// ----------------------------------------------------------------
// BLOQUE 2.2: Índice combinado para notificaciones no leídas recientes
// ----------------------------------------------------------------
// Mejora rendimiento al buscar notificaciones pendientes de lectura
// ordenadas por fecha, operación común para badges y alertas.
notificationSchema.index({ leida: 1, fecha_creacion: -1 });

// ----------------------------------------------------------------
// BLOQUE 2.3: Índice combinado para filtrado por tipo y fecha
// ----------------------------------------------------------------
// Acelera consultas que filtran notificaciones por categoría específica
// y las ordenan cronológicamente, útil para reportes y análisis.
notificationSchema.index({ tipo: 1, fecha_creacion: -1 });

// ----------------------------------------------------------------
// BLOQUE 2.4: Índice combinado para prioridad y estado de lectura
// ----------------------------------------------------------------
// Optimiza búsqueda de notificaciones urgentes no leídas, importante
// para sistemas de alerta y dashboards de supervisión.
notificationSchema.index({ prioridad: 1, leida: 1 });

// ********************************************************************
// MÓDULO 3: MÉTODOS DE INSTANCIA PARA OPERACIONES INDIVIDUALES
// ********************************************************************
// Descripción: Métodos asociados a documentos individuales que realizan
// operaciones específicas como marcar como leída una notificación
// específica.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Marcar notificación individual como leída
// ----------------------------------------------------------------
// Cambia el estado de lectura de una notificación específica a true
// y guarda el cambio en la base de datos. Retorna la promesa del
// guardado para manejo asíncrono.
notificationSchema.methods.marcarLeida = async function() {
  this.leida = true;
  return await this.save();
};

// ********************************************************************
// MÓDULO 4: MÉTODOS ESTÁTICOS PARA OPERACIONES GLOBALES
// ********************************************************************
// Descripción: Funciones a nivel de modelo que realizan operaciones
// masivas o de sistema como limpieza automática y cálculo de
// estadísticas agregadas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 4.1: Limpieza automática de notificaciones antiguas
// ----------------------------------------------------------------
// Elimina notificaciones leídas que son más antiguas que el número
// especificado de días. Previene crecimiento excesivo de la base
// de datos y mejora el rendimiento del sistema.
notificationSchema.statics.limpiarAntiguas = async function(dias = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);
  
  const resultado = await this.deleteMany({
    fecha_creacion: { $lt: fechaLimite },
    leida: true
  });
  
  return resultado.deletedCount;
};

// ----------------------------------------------------------------
// BLOQUE 4.2: Obtención de estadísticas agregadas
// ----------------------------------------------------------------
// Calcula métricas generales sobre las notificaciones: totales,
// distribución por estado de lectura y conteo por tipo de notificación.
// Utilizado para dashboards de administración y reportes.
notificationSchema.statics.obtenerEstadisticas = async function() {
  const total = await this.countDocuments();
  const noLeidas = await this.countDocuments({ leida: false });
  const porTipo = await this.aggregate([
    {
      $group: {
        _id: '$tipo',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    total,
    leidas: total - noLeidas,
    noLeidas,
    porTipo
  };
};

// ********************************************************************
// MÓDULO 5: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios y
// cualquier otra parte de la aplicación que necesite gestionar
// notificaciones del sistema.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 5.1: Instanciación del modelo Notification
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Notification' que se mapea a la colección
// 'notifications' en MongoDB, siguiendo la convención de
// pluralización automática de Mongoose.
const Notification = mongoose.model('Notification', notificationSchema);

// ----------------------------------------------------------------
// BLOQUE 5.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules.
export default Notification;