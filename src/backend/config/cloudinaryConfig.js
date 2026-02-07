import cloudinary from 'cloudinary';

// ============================================================================
// SECCIÓN: CONFIGURACIÓN DE CLOUDINARY
// ============================================================================
// Este archivo configura y exporta la instancia de Cloudinary para la gestión
// de archivos multimedia en la nube. Proporciona acceso a operaciones de
// almacenamiento, transformación y entrega de imágenes y videos.
// ============================================================================

// ********************************************************************
// MÓDULO 1: CONFIGURACIÓN DE CREDENCIALES DE CLOUDINARY
// ********************************************************************
// Descripción: Establece las credenciales de conexión a la cuenta de
// Cloudinary usando variables de entorno para seguridad o valores por
// defecto para desarrollo. Esta configuración permite todas las operaciones
// de la API de Cloudinary.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 1.1: Aplicación de credenciales a la instancia de Cloudinary
// ----------------------------------------------------------------
// Configura el SDK de Cloudinary con tres parámetros esenciales:
// - cloud_name: Identificador único de la cuenta en Cloudinary
// - api_key: Clave pública para autenticación de API
// - api_secret: Clave privada para operaciones seguras
// 
// Nota de seguridad: Los valores por defecto son solo para desarrollo.
// En producción, siempre deben usarse variables de entorno.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dn9ts84q6',
  api_key: process.env.CLOUDINARY_API_KEY || '797652563747974',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'raOkraliwEKlBFTRL7Cr9kEyHOA'
});

export default cloudinary;