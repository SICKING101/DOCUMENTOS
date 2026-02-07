import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE TAREAS
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar tareas en el
// sistema. Maneja organización de actividades personales o de equipo,
// incluyendo prioridades, estados, plazos, categorización y seguimiento
// de progreso con funcionalidades de recordatorios y gestión temporal.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE TAREA
// ********************************************************************
// Descripción: Establece la estructura completa de datos para tareas,
// incluyendo información descriptiva, clasificación, temporalidad,
// estado, relaciones con usuarios y metadatos de gestión.
// ********************************************************************
const taskSchema = new mongoose.Schema({
  // ----------------------------------------------------------------
  // BLOQUE 1.1: Título descriptivo de la tarea
  // ----------------------------------------------------------------
  // Nombre breve pero descriptivo que resume la actividad a realizar.
  // Debe ser claro y específico para identificación rápida en listados
  // y dashboards. Se aplica trim automático para eliminar espacios
  // innecesarios al principio y final.
  titulo: {
    type: String,
    required: true,
    trim: true
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.2: Descripción detallada de la tarea
  // ----------------------------------------------------------------
  // Explicación opcional que amplía la información sobre la tarea.
  // Puede incluir instrucciones específicas, contexto, recursos
  // necesarios o cualquier detalle relevante para su ejecución.
  descripcion: {
    type: String,
    default: ''
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.3: Nivel de prioridad predefinido
  // ----------------------------------------------------------------
  // Define la importancia relativa de la tarea para determinar
  // orden de ejecución y atención visual en interfaces.
  // Los valores permitidos representan una escala de urgencia
  // con comportamiento predecible en el sistema.
  prioridad: {
    type: String,
    enum: ['baja', 'media', 'alta', 'critica'],
    default: 'media'
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.4: Estado actual del flujo de trabajo
  // ----------------------------------------------------------------
  // Representa la fase en la que se encuentra la tarea dentro del
  // proceso de ejecución. Controla qué acciones están disponibles
  // y cómo se visualiza la tarea en diferentes vistas del sistema.
  estado: {
    type: String,
    enum: ['pendiente', 'en-progreso', 'completada'],
    default: 'pendiente'
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.5: Categoría para agrupamiento lógico
  // ----------------------------------------------------------------
  // Etiqueta opcional para clasificar tareas por tipo, proyecto,
  // área o cualquier criterio organizacional. Facilita filtrado
  // y generación de reportes agrupados por categoría.
  categoria: {
    type: String,
    default: ''
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.6: Indicador de recordatorio activo
  // ----------------------------------------------------------------
  // Bandera que activa notificaciones o alertas para esta tarea.
  // Cuando es true, el sistema puede generar recordatorios por
  // email, notificaciones push o alertas visuales según configuración.
  recordatorio: {
    type: Boolean,
    default: false
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.7: Fecha límite para completar la tarea
  // ----------------------------------------------------------------
  // Fecha objetivo opcional para finalización de la tarea.
  // Se utiliza para calcular plazos, generar alertas de vencimiento
  // y priorización automática basada en proximidad a la fecha límite.
  fecha_limite: {
    type: Date,
    default: null
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.8: Hora específica para el plazo
  // ----------------------------------------------------------------
  // Hora exacta del día asociada a la fecha límite (formato HH:mm).
  // Permite especificar no solo el día sino la hora concreta para
  // tareas que tienen un horario específico de entrega o ejecución.
  hora_limite: {
    type: String,
    default: null
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.9: Referencia al usuario creador
  // ----------------------------------------------------------------
  // Enlace al modelo User que representa a la persona que creó
  // la tarea. Permite auditoría, asignación de responsabilidades
  // y filtrado de tareas por creador.
  creado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.10: Fecha de creación explícita
  // ----------------------------------------------------------------
  // Marca de tiempo específica para la creación de la tarea,
  // independiente de los timestamps automáticos. Utilizada para
  // consultas específicas por fecha de creación real.
  fecha_creacion: {
    type: Date,
    default: Date.now
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.11: Fecha de última actualización manual
  // ----------------------------------------------------------------
  // Campo gestionado manualmente (además del updatedAt automático)
  // para mayor control sobre el seguimiento de modificaciones.
  // Actualizado automáticamente por middleware pre-save.
  fecha_actualizacion: {
    type: Date,
    default: Date.now
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.12: Estado de actividad de la tarea
  // ----------------------------------------------------------------
  // Controla si la tarea está visible y activa en el sistema.
  // Las tareas inactivas pueden archivarse o ocultarse sin
  // eliminarlas permanentemente, preservando historial y referencias.
  activo: {
    type: Boolean,
    default: true
  }
}, {
  // ----------------------------------------------------------------
  // BLOQUE 1.13: Habilitación de timestamps automáticos
  // ----------------------------------------------------------------
  // Activa campos createdAt y updatedAt gestionados automáticamente
  // por Mongoose. Proporciona trazabilidad básica de creación
  // y modificación sin lógica adicional.
  timestamps: true
});

// ********************************************************************
// MÓDULO 2: MIDDLEWARE PRE-SAVE PARA ACTUALIZACIÓN AUTOMÁTICA
// ********************************************************************
// Descripción: Función que se ejecuta automáticamente antes de guardar
// cualquier documento de tarea para mantener actualizado el campo
// fecha_actualizacion con la fecha/hora actual.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Actualización automática de fecha de modificación
// ----------------------------------------------------------------
// Intercepta cada operación de guardado (creación y actualización)
// para establecer fecha_actualizacion a la fecha/hora actual.
// Garantiza que este campo refleje siempre la última modificación
// incluso cuando el updatedAt automático no sea suficiente.
taskSchema.pre('save', function(next) {
  this.fecha_actualizacion = new Date();
  next();
});

// ********************************************************************
// MÓDULO 3: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios y
// cualquier otra parte de la aplicación que necesite gestionar tareas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Instanciación del modelo Task
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Task' que se mapea a la colección
// 'tasks' en MongoDB. Sigue la convención de pluralización
// automática de Mongoose para nombres de colecciones.
const Task = mongoose.model('Task', taskSchema);

// ----------------------------------------------------------------
// BLOQUE 3.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules:
// import Task from './models/Task.js'
export default Task;