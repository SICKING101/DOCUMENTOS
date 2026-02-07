import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE CATEGORÍAS
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar categorías en el
// sistema. Las categorías sirven para organizar y clasificar recursos como
// tickets, artículos o cualquier otro contenido que requiera agrupación lógica.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE CATEGORÍA
// ********************************************************************
// Descripción: Crea la estructura base de datos para las categorías,
// incluyendo propiedades esenciales como nombre, descripción, color
// identificativo, icono representativo y estado de actividad.
// ********************************************************************
const categorySchema = new mongoose.Schema({
  // ----------------------------------------------------------------
  // BLOQUE 1.1: Nombre identificativo de la categoría
  // ----------------------------------------------------------------
  // Nombre único y descriptivo de la categoría, obligatorio para
  // identificar claramente el propósito o contenido agrupado.
  // Se utiliza en interfaces de usuario, filtros y navegación.
  nombre: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.2: Descripción detallada de la categoría
  // ----------------------------------------------------------------
  // Explicación opcional que define el alcance, criterios o
  // propósito de la categoría. Ayuda a usuarios y administradores
  // a entender cuándo y cómo usar esta clasificación.
  descripcion: String,
  
  // ----------------------------------------------------------------
  // BLOQUE 1.3: Color distintivo para identificación visual
  // ----------------------------------------------------------------
  // Código hexadecimal que representa el color asociado a la
  // categoría. Se utiliza en interfaces gráficas para diferenciar
  // visualmente entre categorías mediante badges, etiquetas o
  // indicadores de color.
  // Valor por defecto: #4f46e5 (tono azul/violeta).
  color: { 
    type: String, 
    default: '#4f46e5' 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.4: Icono representativo para interfaces
  // ----------------------------------------------------------------
  // Identificador del icono que representa visualmente la categoría.
  // Debe corresponder a un icono disponible en la librería de
  // iconos del frontend (FontAwesome, Material Icons, etc.).
  // Valor por defecto: 'folder' (icono de carpeta genérica).
  icon: { 
    type: String, 
    default: 'folder' 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.5: Estado de actividad de la categoría
  // ----------------------------------------------------------------
  // Controla si la categoría está disponible para su uso o
  // temporalmente deshabilitada. Las categorías inactivas no
  // aparecen en listados desplegables pero mantienen sus
  // relaciones existentes para integridad referencial.
  activo: { 
    type: Boolean, 
    default: true 
  }
}, { 
  // ----------------------------------------------------------------
  // BLOQUE 1.6: Habilitación de timestamps automáticos
  // ----------------------------------------------------------------
  // Activa la creación automática de campos createdAt y updatedAt
  // que registran cuándo se creó la categoría y cuándo se modificó
  // por última vez, útil para auditoría y seguimiento de cambios.
  timestamps: true 
});

// ********************************************************************
// MÓDULO 2: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios
// y cualquier otra parte de la aplicación que necesite interactuar
// con las categorías en la base de datos.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Instanciación del modelo Category
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Category' que mapea a la colección
// 'categories' en MongoDB (Mongoose pluraliza automáticamente
// el nombre del modelo para nombrar la colección).
const Category = mongoose.model('Category', categorySchema);

// ----------------------------------------------------------------
// BLOQUE 2.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para poder importarlo en otros archivos
// usando la sintaxis: import Category from './models/Category.js'
export default Category;