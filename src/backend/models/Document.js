import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE DOCUMENTOS
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar documentos en el
// sistema. Maneja información de archivos subidos a Cloudinary, incluyendo
// metadatos, categorización, asociación con personas y funcionalidad de
// papelera para eliminación temporal antes de borrado definitivo.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE DOCUMENTO
// ********************************************************************
// Descripción: Establece la estructura completa de datos para documentos
// almacenados, incluyendo propiedades de archivo original, metadatos de
// Cloudinary, relaciones con personas, categorización y gestión de estado
// con funcionalidad de papelera (soft delete).
// ********************************************************************
const documentSchema = new mongoose.Schema({
  // =========================================================================
  // INFORMACIÓN DEL ARCHIVO ORIGINAL
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.1: Nombre original del archivo
  // ----------------------------------------------------------------
  // Nombre exacto del archivo cuando fue subido por el usuario,
  // incluyendo extensión. Preserva la identificación original para
  // referencia del usuario al descargar o buscar documentos.
  nombre_original: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.2: Tipo de archivo (extensión)
  // ----------------------------------------------------------------
  // Extensión del archivo (pdf, docx, jpg, etc.) sin el punto.
  // Utilizado para determinar el icono a mostrar, validaciones y
  // comportamientos específicos por tipo de documento.
  tipo_archivo: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.3: Tamaño del archivo en bytes
  // ----------------------------------------------------------------
  // Peso del archivo original en bytes. Permite calcular y mostrar
  // tamaños en formatos legibles (KB, MB) y aplicar políticas de
  // límites de almacenamiento.
  tamano_archivo: { 
    type: Number, 
    required: true 
  },
  
  // =========================================================================
  // METADATOS DESCRIPTIVOS Y DE ORGANIZACIÓN
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.4: Descripción opcional del documento
  // ----------------------------------------------------------------
  // Explicación escrita opcional sobre el contenido, propósito o
  // contexto del documento. Facilita la búsqueda y comprensión
  // del documento sin necesidad de abrirlo.
  descripcion: String,
  
  // ----------------------------------------------------------------
  // BLOQUE 1.5: Categoría para clasificación
  // ----------------------------------------------------------------
  // Etiqueta o categoría personalizable para agrupar documentos
  // por tipo, departamento, proyecto o cualquier criterio que
  // facilite la organización y filtrado.
  categoria: String,
  
  // =========================================================================
  // INFORMACIÓN TEMPORAL Y DE VIGENCIA
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.6: Fecha de subida automática
  // ----------------------------------------------------------------
  // Marca de tiempo que registra cuándo fue subido el documento.
  // Se establece automáticamente al crear el registro, no puede
  // ser modificada manualmente para mantener trazabilidad.
  fecha_subida: { 
    type: Date, 
    default: Date.now 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.7: Fecha de vencimiento opcional
  // ----------------------------------------------------------------
  // Fecha límite de validez o vigencia del documento. Útil para
  // certificados, contratos, licencias u otros documentos con
  // fecha de expiración. Permite generar alertas de renovación.
  fecha_vencimiento: Date,
  
  // =========================================================================
  // RELACIONES CON OTRAS ENTIDADES
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.8: Referencia a la persona asociada
  // ----------------------------------------------------------------
  // Enlace al modelo Person que representa al individuo, cliente,
  // empleado o contacto al que pertenece o está asociado este
  // documento. Permite organizar documentos por persona.
  persona_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Person' 
  },
  
  // =========================================================================
  // DATOS DE CLOUDINARY (ALMACENAMIENTO EXTERNO)
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.9: URL pública del archivo en Cloudinary
  // ----------------------------------------------------------------
  // Enlace directo para acceder y descargar el archivo desde
  // Cloudinary. Incluye transformaciones y optimizaciones
  // aplicadas por el servicio de CDN.
  cloudinary_url: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.10: Identificador único en Cloudinary
  // ----------------------------------------------------------------
  // ID único que Cloudinary asigna a cada archivo subido.
  // Esencial para realizar operaciones como actualización,
  // eliminación o aplicación de transformaciones específicas.
  public_id: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.11: Tipo de recurso en Cloudinary
  // ----------------------------------------------------------------
  // Categoría principal del archivo según Cloudinary:
  // 'image', 'video', 'raw' (documentos), o 'auto'.
  // Determina las transformaciones disponibles y cómo se
  // procesa el archivo en el CDN.
  resource_type: { 
    type: String, 
    required: true 
  },
  
  // =========================================================================
  // ESTADO DEL DOCUMENTO EN EL SISTEMA
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.12: Estado activo/inactivo
  // ----------------------------------------------------------------
  // Controla si el documento está disponible en el sistema.
  // Los documentos inactivos no aparecen en búsquedas ni listados
  // pero permanecen en la base de datos para referencias históricas.
  activo: { 
    type: Boolean, 
    default: true 
  },
  
  // =========================================================================
  // FUNCIONALIDAD DE PAPELERA (SOFT DELETE)
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.13: Marcador de eliminación temporal
  // ----------------------------------------------------------------
  // Indica si el documento ha sido "eliminado" (enviado a la papelera)
  // pero no borrado físicamente de la base de datos. Los documentos
  // con isDeleted=true no aparecen en consultas normales pero pueden
  // ser restaurados desde la interfaz de papelera.
  isDeleted: { 
    type: Boolean, 
    default: false 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.14: Fecha de envío a papelera
  // ----------------------------------------------------------------
  // Registra cuándo el documento fue marcado como eliminado.
  // Permite implementar políticas de retención (ej: borrar
  // automáticamente después de 30 días en papelera).
  deletedAt: { 
    type: Date, 
    default: null 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.15: Identificador del usuario que eliminó
  // ----------------------------------------------------------------
  // Almacena el identificador (usuario, correo o ID) de la persona
  // que envió el documento a la papelera. Para auditoría y posible
  // reversión de acciones.
  deletedBy: { 
    type: String, 
    default: null 
  }
}, { 
  // =========================================================================
  // CONFIGURACIÓN ADICIONAL DEL ESQUEMA
  // =========================================================================
  
  // ----------------------------------------------------------------
  // BLOQUE 1.16: Habilitación de timestamps automáticos
  // ----------------------------------------------------------------
  // Activa la creación automática de campos createdAt y updatedAt
  // que Mongoose gestiona automáticamente. Estos campos son
  // esenciales para auditoría, ordenamiento y seguimiento de
  // modificaciones en los documentos.
  timestamps: true 
});

// ********************************************************************
// MÓDULO 2: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios y
// cualquier otra parte de la aplicación que necesite gestionar
// documentos en el sistema.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Instanciación del modelo Document
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Document' que se mapea a la colección
// 'documents' en MongoDB. Sigue la convención de pluralización
// automática de Mongoose para nombres de colecciones.
const Document = mongoose.model('Document', documentSchema);

// ----------------------------------------------------------------
// BLOQUE 2.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules:
// import Document from './models/Document.js'
export default Document;