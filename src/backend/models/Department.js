import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE DEPARTAMENTOS
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar departamentos en
// el sistema. Los departamentos representan unidades organizacionales o
// áreas funcionales que agrupan usuarios y recursos relacionados, facilitando
// la asignación de responsabilidades y la organización jerárquica.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE DEPARTAMENTO
// ********************************************************************
// Descripción: Establece la estructura base de datos para los departamentos,
// incluyendo propiedades clave como nombre, descripción, color identificativo,
// icono representativo y estado de actividad para gestión organizacional.
// ********************************************************************
const departmentSchema = new mongoose.Schema({
  // ----------------------------------------------------------------
  // BLOQUE 1.1: Nombre identificativo del departamento
  // ----------------------------------------------------------------
  // Nombre oficial de la unidad organizacional, obligatorio para
  // identificar claramente el departamento en listados, asignaciones
  // y reportes. Ejemplos: "Soporte Técnico", "Ventas", "Recursos Humanos".
  nombre: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.2: Descripción detallada del departamento
  // ----------------------------------------------------------------
  // Explicación opcional que define el propósito, responsabilidades,
  // funciones y alcance del departamento. Ayuda a nuevos usuarios
  // a entender la estructura organizacional y a quién contactar.
  descripcion: String,
  
  // ----------------------------------------------------------------
  // BLOQUE 1.3: Color distintivo para identificación visual
  // ----------------------------------------------------------------
  // Código hexadecimal que representa el color asociado al departamento
  // en interfaces gráficas. Se utiliza en gráficos organizacionales,
  // dashboards y etiquetas para diferenciación visual rápida.
  // Valor por defecto: #3b82f6 (tono azul corporativo estándar).
  color: { 
    type: String, 
    default: '#3b82f6' 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.4: Icono representativo para interfaces
  // ----------------------------------------------------------------
  // Identificador del icono que representa visualmente el departamento
  // en menús, tarjetas y listados. Debe corresponder a un icono
  // disponible en la librería de iconos del frontend.
  // Valor por defecto: 'building' (icono de edificio/empresa).
  icon: { 
    type: String, 
    default: 'building' 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.5: Estado de actividad del departamento
  // ----------------------------------------------------------------
  // Controla si el departamento está operativo y visible en el sistema.
  // Los departamentos inactivos no aparecen en listados de selección
  // para nuevas asignaciones pero mantienen relaciones históricas
  // para preservar la integridad de datos existentes.
  activo: { 
    type: Boolean, 
    default: true 
  }
}, { 
  // ----------------------------------------------------------------
  // BLOQUE 1.6: Habilitación de timestamps automáticos
  // ----------------------------------------------------------------
  // Activa la creación automática de campos createdAt y updatedAt
  // que registran la fecha de creación y última modificación del
  // departamento, esencial para auditoría organizacional y
  // seguimiento de cambios estructurales.
  timestamps: true 
});

// ********************************************************************
// MÓDULO 2: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios
// y cualquier otra parte de la aplicación que necesite gestionar
// la estructura departamental de la organización.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Instanciación del modelo Department
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Department' que se mapea a la colección
// 'departments' en MongoDB. El nombre se pluraliza automáticamente
// siguiendo las convenciones de Mongoose para nombres de colecciones.
const Department = mongoose.model('Department', departmentSchema);

// ----------------------------------------------------------------
// BLOQUE 2.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules:
// import Department from './models/Department.js'
export default Department;