import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ============================================================================
// SECCIÓN: MODELO DE USUARIOS
// ============================================================================
// Este archivo define el esquema de Mongoose para gestionar usuarios en el
// sistema. Incluye autenticación segura con encriptación de contraseñas,
// gestión de roles, recuperación de acceso, tokens de seguridad y
// funcionalidades especiales para transferencia de privilegios administrativos.
// ============================================================================

// ********************************************************************
// MÓDULO 1: DEFINICIÓN DEL ESQUEMA DE USUARIO
// ********************************************************************
// Descripción: Establece la estructura completa de datos para usuarios,
// incluyendo credenciales de autenticación, roles, estado, tokens de
// seguridad y metadatos para gestión avanzada de cuentas y recuperación.
// ********************************************************************
const userSchema = new mongoose.Schema({
    // ----------------------------------------------------------------
    // BLOQUE 1.1: Nombre de usuario único
    // ----------------------------------------------------------------
    // Identificador único para inicio de sesión y referencia interna.
    // Debe ser único en todo el sistema, con validaciones de longitud
    // y formato para prevenir problemas de autenticación.
    usuario: {
        type: String,
        required: [true, 'El usuario es requerido'],
        unique: true,
        trim: true,
        minlength: [3, 'El usuario debe tener al menos 3 caracteres']
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.2: Correo electrónico único
    // ----------------------------------------------------------------
    // Dirección de email principal para comunicación, notificaciones
    // y recuperación de cuenta. Se valida con expresión regular para
    // formato correcto y se normaliza a minúsculas para consistencia.
    correo: {
        type: String,
        required: [true, 'El correo es requerido'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un correo válido']
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.3: Contraseña encriptada
    // ----------------------------------------------------------------
    // Hash seguro de la contraseña del usuario usando bcrypt.
    // La encriptación real se maneja en middleware pre-save con
    // lógica especial para distinguir entre contraseñas nuevas y
    // hashes ya encriptados provenientes de transferencias administrativas.
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.4: Rol o nivel de privilegios
    // ----------------------------------------------------------------
    // Define los permisos y acceso del usuario en el sistema.
    // 'administrador': Acceso completo a todas las funcionalidades.
    // 'usuario': Acceso limitado a funciones básicas.
    // 'desactivado': Cuenta temporalmente inhabilitada sin acceso.
    rol: {
        type: String,
        enum: ['administrador', 'desactivado', 'usuario'], 
        default: 'administrador'
    },

    // Agregar después del campo 'rol' (línea ~65)
permisos: {
    type: [String],
    default: [], // Array de permisos específicos
    enum: [
        'ver_dashboard',
        'ver_personas',
        'crear_personas', 
        'editar_personas',
        'eliminar_personas',
        'ver_documentos',
        'subir_documentos',
        'editar_documentos',
        'eliminar_documentos',
        'ver_categorias',
        'crear_categorias',
        'editar_categorias',
        'eliminar_categorias',
        'ver_departamentos',
        'crear_departamentos',
        'editar_departamentos',
        'eliminar_departamentos',
        'ver_tareas',
        'crear_tareas',
        'editar_tareas',
        'eliminar_tareas',
        'ver_reportes',
        'generar_reportes',
        'ver_calendario',
        'crear_eventos',
        'ver_historial',
        'ver_soporte',
        'crear_tickets',
        'ver_papelera',
        'restaurar_documentos',
        'vaciar_papelera'
    ]
},
esAdminUnico: {
    type: Boolean,
    default: false
}, 
    
    // ----------------------------------------------------------------
    // BLOQUE 1.5: Estado activo/inactivo de la cuenta
    // ----------------------------------------------------------------
    // Controla si la cuenta está habilitada para autenticarse.
    // Las cuentas inactivas no pueden iniciar sesión pero mantienen
    // sus datos para posibles reactivaciones o auditoría histórica.
    activo: {
        type: Boolean,
        default: true
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.6: Token para recuperación de contraseña (6 dígitos)
    // ----------------------------------------------------------------
    // Hash SHA-256 de un código numérico de 6 dígitos enviado por email
    // para verificar identidad antes de permitir cambio de contraseña.
    resetPasswordToken: String,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.7: Fecha de expiración del código de recuperación
    // ----------------------------------------------------------------
    // Límite de tiempo (15 minutos) para usar el código de 6 dígitos
    // antes de que se considere inválido por seguridad.
    resetPasswordExpires: Date,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.8: Token para cambio de contraseña (post-verificación)
    // ----------------------------------------------------------------
    // Hash SHA-256 de un token aleatorio generado después de verificar
    // exitosamente el código de 6 dígitos. Permite el cambio real de
    // contraseña en un paso posterior.
    changePasswordToken: String,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.9: Fecha de expiración del token de cambio
    // ----------------------------------------------------------------
    // Límite de tiempo (30 minutos) para usar el token de cambio de
    // contraseña después de verificar el código inicial.
    changePasswordExpires: Date,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.10: Token para transferencia de privilegios administrativos
    // ----------------------------------------------------------------
    // Hash SHA-256 de un token especial utilizado exclusivamente en el
    // proceso de transferencia de administrador a administrador.
    changeAdminToken: String,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.11: Fecha de expiración del token de transferencia
    // ----------------------------------------------------------------
    // Límite de tiempo (24 horas) para completar la transferencia de
    // privilegios administrativos usando el token correspondiente.
    changeAdminExpires: Date,
    
    // ----------------------------------------------------------------
    // BLOQUE 1.12: Último acceso registrado
    // ----------------------------------------------------------------
    // Marca de tiempo del último inicio de sesión exitoso. Utilizado
    // para calcular inactividad, generar reportes de uso y detectar
    // cuentas abandonadas.
    ultimoAcceso: {
        type: Date,
        default: Date.now
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.13: Copia de seguridad para desactivación
    // ----------------------------------------------------------------
    // Almacena temporalmente información original del usuario cuando
    // se desactiva una cuenta durante transferencias administrativas,
    // permitiendo posibles restauraciones o auditoría de cambios.
    deactivationBackup: {
        originalEmail: String,
        originalUsername: String,
        deactivatedAt: Date
    },
    
    // ----------------------------------------------------------------
    // BLOQUE 1.14: Fecha de desactivación explícita
    // ----------------------------------------------------------------
    // Marca de tiempo específica para cuando la cuenta fue desactivada
    // (independiente del campo activo). Útil para reportes y políticas
    // de retención de cuentas desactivadas.
    deactivatedAt: Date
}, {
    // ----------------------------------------------------------------
    // BLOQUE 1.15: Habilitación de timestamps automáticos
    // ----------------------------------------------------------------
    // Activa campos createdAt y updatedAt gestionados automáticamente
    // por Mongoose para auditoría completa del ciclo de vida del usuario.
    timestamps: true
});

// ********************************************************************
// MÓDULO 2: MIDDLEWARE PRE-SAVE PARA ENCRIPTACIÓN INTELIGENTE
// ********************************************************************
// Descripción: Función que se ejecuta automáticamente antes de guardar
// cualquier documento de usuario para aplicar lógica condicional de
// encriptación. Detecta si una contraseña ya está encriptada (proveniente
// de transferencia administrativa) para evitar re-encriptación que
// invalidaría el hash original.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 2.1: Encriptación condicional basada en origen de contraseña
// ----------------------------------------------------------------
// Intercepta cada operación de guardado para determinar si debe
// encriptar la contraseña. Distingue entre contraseñas nuevas que
// necesitan encriptación y hashes bcrypt existentes que deben
// preservarse intactos (especialmente en transferencias de admin).
userSchema.pre('save', async function(next) {
    // Expresión regular para identificar hashes bcrypt típicos
    // Formato: $2[abxy]$\d{1,2}\$[A-Za-z0-9./]{53}
    const bcryptPattern = /^\$2[abxy]\$\d{1,2}\$[A-Za-z0-9./]{53}$/;
    
    // ------------------------------------------------------------
    // SUB-BLOQUE 2.1.1: Detección de contraseñas ya encriptadas
    // ------------------------------------------------------------
    // Si la contraseña ya tiene formato bcrypt (probablemente de una
    // transferencia administrativa), omitir completamente la encriptación
    // para preservar el hash original que ya es válido.
    if (this.password && bcryptPattern.test(this.password)) {
        console.log('🔐 Contraseña ya encriptada (de admin change), omitiendo encriptación automática');
        return next();
    }
    
    // ------------------------------------------------------------
    // SUB-BLOQUE 2.1.2: Validación de necesidad de encriptación
    // ------------------------------------------------------------
    // Solo proceder con encriptación si:
    // 1. El campo password fue modificado (nueva contraseña)
    // 2. NO comienza con '$2' (ya sería un hash bcrypt)
    if (!this.isModified('password') || this.password.startsWith('$2')) {
        return next();
    }

    try {
        // --------------------------------------------------------
        // SUB-BLOQUE 2.1.3: Proceso de encriptación estándar
        // --------------------------------------------------------
        // Para contraseñas nuevas de usuario (no provenientes de
        // transferencias), aplicar encriptación bcrypt estándar
        // con factor de costo 10 (equilibrio entre seguridad y rendimiento).
        console.log('🔐 Encriptando contraseña nueva...');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// ********************************************************************
// MÓDULO 3: MÉTODOS DE INSTANCIA PARA AUTENTICACIÓN
// ********************************************************************
// Descripción: Métodos asociados a documentos individuales de usuario
// que realizan operaciones de verificación de credenciales y generación
// de tokens de seguridad para diferentes flujos de recuperación.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 3.1: Comparación segura de contraseñas
// ----------------------------------------------------------------
// Valida si una contraseña en texto plano coincide con el hash
// almacenado usando comparación segura de bcrypt que previene
// ataques de timing y fuerza bruta.
userSchema.methods.compararPassword = async function(passwordIngresada) {
    return await bcrypt.compare(passwordIngresada, this.password);
};

// ----------------------------------------------------------------
// BLOQUE 3.2: Generación de código de recuperación de 6 dígitos
// ----------------------------------------------------------------
// Crea un código numérico aleatorio de 6 dígitos para verificación
// inicial en el proceso de recuperación de contraseña. Almacena el
// hash (no el código en claro) y establece expiración de 15 minutos.
userSchema.methods.generarCodigoRecuperacion = function() {
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(codigo)
        .digest('hex');
    
    this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    
    return codigo;
};

// ----------------------------------------------------------------
// BLOQUE 3.3: Generación de token de cambio de contraseña
// ----------------------------------------------------------------
// Crea un token criptográficamente seguro de 32 bytes (hex)
// para autorizar el cambio real de contraseña después de verificar
// exitosamente el código de 6 dígitos. Expira en 30 minutos.
userSchema.methods.generarTokenCambioPassword = function() {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.changePasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    this.changePasswordExpires = Date.now() + 30 * 60 * 1000;
    
    return token;
};

// ----------------------------------------------------------------
// BLOQUE 3.4: Generación de token para transferencia administrativa
// ----------------------------------------------------------------
// Crea un token especial de 32 bytes exclusivo para el proceso
// de transferencia de privilegios de administrador. Tiene mayor
// tiempo de expiración (24 horas) debido a la complejidad del proceso.
userSchema.methods.generarTokenCambioAdmin = function() {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.changeAdminToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
    
    this.changeAdminExpires = Date.now() + 86400000;
    
    return token;
};

// ********************************************************************
// MÓDULO 4: CREACIÓN Y EXPORTACIÓN DEL MODELO
// ********************************************************************
// Descripción: Instancia el modelo de Mongoose basado en el esquema
// definido y lo exporta para su uso en controladores, servicios y
// cualquier otra parte de la aplicación que necesite gestionar usuarios.
// ********************************************************************

// ----------------------------------------------------------------
// BLOQUE 4.1: Instanciación del modelo User
// ----------------------------------------------------------------
// Crea el modelo Mongoose 'User' que se mapea a la colección
// 'users' en MongoDB. Sigue la convención de pluralización
// automática de Mongoose para nombres de colecciones.
const User = mongoose.model('User', userSchema);

// ----------------------------------------------------------------
// BLOQUE 4.2: Exportación como módulo por defecto
// ----------------------------------------------------------------
// Exporta el modelo para permitir su importación en otros archivos
// del sistema usando la sintaxis estándar de ES Modules:
// import User from './models/User.js'
export default User;