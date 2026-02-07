import mongoose from 'mongoose';

// ============================================================================
// SECCIÓN: MODELO DE PERSONAS
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar personas en el
// sistema. Representa contactos, empleados, clientes o cualquier individuo
// registrado, almacenando información básica de contacto y datos laborales
// para organización y gestión de relaciones.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE PERSONA
// ********************************************************************
// Descripción: Establece la estructura base de datos para personas,
// incluyendo información personal básica, datos de contacto, detalles
// laborales, estado de actividad y marcas de tiempo para seguimiento.
// ********************************************************************
const personSchema = new mongoose.Schema({
  // ----------------------------------------------------------------
  // BLOQUE 1.1: Nombre completo de la persona
  // ----------------------------------------------------------------
  // Nombre y apellido(s) completos de la persona, obligatorio para
  // identificación básica. Debe incluir tanto nombre como apellidos
  // para búsquedas y referencia clara en listados y documentos.
  nombre: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.2: Correo electrónico principal
  // ----------------------------------------------------------------
  // Dirección de email única para contacto y comunicación. Se utiliza
  // para notificaciones automáticas, envío de documentos y como
  // identificador principal en algunos flujos del sistema.
  email: { 
    type: String, 
    required: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.3: Número de teléfono de contacto
  // ----------------------------------------------------------------
  // Teléfono móvil o fijo para contacto directo. Formato libre para
  // acomodar diferentes convenciones internacionales. Puede incluir
  // extensiones o códigos de país según necesidades.
  telefono: String,
  
  // ----------------------------------------------------------------
  // BLOQUE 1.4: Departamento u área organizacional
  // ----------------------------------------------------------------
  // Unidad organizacional a la que pertenece la persona dentro de
  // la estructura de la empresa o sistema. Facilita filtrado y
  // organización jerárquica de contactos.
  departamento: String,
  
  // ----------------------------------------------------------------
  // BLOQUE 1.5: Puesto o cargo ocupado
  // ----------------------------------------------------------------
  // Rol, posición o título profesional que describe las
  // responsabilidades de la persona. Utilizado para identificar
  // jerarquía, especialización y contactos apropiados para
  // diferentes tipos de comunicación.
  puesto: String,
  
  // ----------------------------------------------------------------
  // BLOQUE 1.6: Estado de actividad de la persona
  // ----------------------------------------------------------------
  // Indica si la persona está activa y disponible en el sistema.
  // Personas inactivas pueden mantenerse en la base de datos por
  // razones históricas o de auditoría pero no aparecen en listados
  // de selección para nuevas operaciones.
  activo: { 
    type: Boolean, 
    default: true 
  },
  
  // ----------------------------------------------------------------
  // BLOQUE 1.7: Fecha de creación explícita
  // ----------------------------------------------------------------
  // Marca de tiempo que registra cuándo se creó el registro de la
  // persona en el sistema. Diferente de los timestamps automáticos,
  // útil para reportes de crecimiento y análisis temporal específicos.
  fecha_creacion: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  // ----------------------------------------------------------------
  // BLOQUE 1.8: Habilitación de timestamps automáticos
  // ----------------------------------------------------------------
  // Activa la creación automática de campos createdAt y updatedAt
  // gestionados por Mongoose. Estos campos proporcionan trazabilidad
  // completa de cuándo se creó y modificó por última vez cada registro.
  timestamps: true 
});

// ********************************************************************
// MÓDULO 2: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios y
// cualquier otra parte de la aplicación que necesite gestionar
// información de personas.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Instanciación del modelo Person
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'Person' que se mapea a la colección
// 'people' en MongoDB (Mongoose pluraliza 'Person' como 'people'
// siguiendo reglas gramaticales en inglés).
const Person = mongoose.model('Person', personSchema);

// ----------------------------------------------------------------
// BLOQUE 2.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules:
// import Person from './models/Person.js'
export default Person;