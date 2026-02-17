// ============================================================================
// src/backend/models/Role.js
// ============================================================================
// MODELO DE ROLES CON PERMISOS COMPLETOS - CORREGIDO (SIN EXPORT DUPLICADO)
// ============================================================================

import mongoose from 'mongoose';

// Lista completa de permisos disponibles
export const PERMISOS_DISPONIBLES = [
    // Dashboard
    { id: 'ver_dashboard', nombre: 'Ver Dashboard', categoria: 'Dashboard' },
    { id: 'acciones_dashboard', nombre: 'Actualizar/Refrescar Dashboard', categoria: 'Dashboard' },
    
    // Personas
    { id: 'ver_personas', nombre: 'Ver Personas', categoria: 'Personas' },
    { id: 'acciones_personas', nombre: 'Gestionar Personas (Crear/Editar/Eliminar)', categoria: 'Personas' },
    
    // Documentos
    { id: 'ver_documentos', nombre: 'Ver Documentos', categoria: 'Documentos' },
    { id: 'acciones_documentos', nombre: 'Gestionar Documentos (Subir/Editar/Eliminar/Descargar)', categoria: 'Documentos' },
    
    // Categorías
    { id: 'ver_categorias', nombre: 'Ver Categorías', categoria: 'Categorías' },
    { id: 'acciones_categorias', nombre: 'Gestionar Categorías', categoria: 'Categorías' },
    
    // Departamentos
    { id: 'ver_departamentos', nombre: 'Ver Departamentos', categoria: 'Departamentos' },
    { id: 'acciones_departamentos', nombre: 'Gestionar Departamentos', categoria: 'Departamentos' },
    
    // Tareas
    { id: 'ver_tareas', nombre: 'Ver Tareas', categoria: 'Tareas' },
    { id: 'acciones_tareas', nombre: 'Gestionar Tareas (Crear/Editar/Eliminar/Asignar)', categoria: 'Tareas' },
    
    // Reportes
    { id: 'ver_reportes', nombre: 'Ver Reportes', categoria: 'Reportes' },
    { id: 'acciones_reportes', nombre: 'Generar/Exportar Reportes', categoria: 'Reportes' },
    
    // Calendario
    { id: 'ver_calendario', nombre: 'Ver Calendario', categoria: 'Calendario' },
    { id: 'acciones_calendario', nombre: 'Gestionar Eventos', categoria: 'Calendario' },
    
    // Soporte
    { id: 'ver_soporte', nombre: 'Ver Soporte', categoria: 'Soporte' },
    { id: 'acciones_soporte', nombre: 'Gestionar Tickets', categoria: 'Soporte' },
    
    // Papelera
    { id: 'ver_papelera', nombre: 'Ver Papelera', categoria: 'Papelera' },
    { id: 'acciones_papelera', nombre: 'Gestionar Papelera (Restaurar/Vaciar)', categoria: 'Papelera' },
    
    // Administración
    { id: 'ver_administracion', nombre: 'Ver Administración', categoria: 'Administración' },
    { id: 'acciones_administracion', nombre: 'Gestionar Usuarios/Roles', categoria: 'Administración' }
];

// SECCIONES SIEMPRE VISIBLES (no requieren permiso)
export const SECCIONES_PUBLICAS = [
    'historial',
    'notificaciones',
    'ajustes',
    'perfil'
];

// Solo los IDs para el enum del schema
export const PERMISOS_IDS = PERMISOS_DISPONIBLES.map(p => p.id);

const roleSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: [true, 'El nombre del rol es requerido'],
        unique: true,
        trim: true,
        minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
        maxlength: [50, 'El nombre no puede exceder 50 caracteres']
    },
    descripcion: {
        type: String,
        maxlength: [200, 'La descripción no puede exceder 200 caracteres']
    },
    permisos: [{
        type: String,
        enum: PERMISOS_IDS
    }],
    esPredeterminado: {
        type: Boolean,
        default: false
    },
    esProtegido: {
        type: Boolean,
        default: false // Roles como 'usuario' no pueden ser eliminados
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    editadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Índices
roleSchema.index({ nombre: 1 });
roleSchema.index({ esPredeterminado: 1 });

// Middleware pre-save
roleSchema.pre('save', async function (next) {
    // Sanitizar nombre
    this.nombre = this.nombre.toLowerCase().trim();
    next();
});

// Método para verificar si un rol tiene un permiso específico
roleSchema.methods.tienePermiso = function (permisoId) {
    return this.permisos.includes(permisoId);
};

// Método para obtener permisos agrupados por categoría
roleSchema.methods.getPermisosAgrupados = function () {
    const agrupados = {};

    PERMISOS_DISPONIBLES.forEach(permiso => {
        if (!agrupados[permiso.categoria]) {
            agrupados[permiso.categoria] = [];
        }

        agrupados[permiso.categoria].push({
            ...permiso,
            asignado: this.permisos.includes(permiso.id)
        });
    });

    return agrupados;
};

// Método estático para crear roles por defecto
roleSchema.statics.crearRolesPorDefecto = async function () {
    const rolesPorDefecto = [
        {
            nombre: 'usuario',
            descripcion: 'Usuario básico con acceso limitado',
            esPredeterminado: true,
            esProtegido: true,
            permisos: [
                'ver_dashboard',
                'ver_documentos',
                'subir_documentos',
                'descargar_documentos',
                'ver_categorias',
                'ver_departamentos',
                'ver_tareas',
                'crear_tareas',
                'editar_tareas'
            ]
        },
        {
            nombre: 'editor',
            descripcion: 'Puede editar documentos y gestionar contenido',
            esPredeterminado: false,
            esProtegido: false,
            permisos: [
                'ver_dashboard',
                'ver_documentos',
                'subir_documentos',
                'editar_documentos',
                'descargar_documentos',
                'ver_categorias',
                'crear_categorias',
                'editar_categorias',
                'ver_departamentos',
                'ver_tareas',
                'crear_tareas',
                'editar_tareas'
            ]
        },
        {
            nombre: 'supervisor',
            descripcion: 'Supervisa actividades sin permisos de administración',
            esPredeterminado: false,
            esProtegido: false,
            permisos: [
                'ver_dashboard',
                'ver_personas',
                'ver_documentos',
                'descargar_documentos',
                'ver_categorias',
                'ver_departamentos',
                'ver_tareas',
                'ver_reportes',
                'generar_reportes',
                'exportar_reportes',
                'ver_calendario',
                'ver_historial'
            ]
        }
    ];

    for (const rolData of rolesPorDefecto) {
        await this.findOneAndUpdate(
            { nombre: rolData.nombre },
            rolData,
            { upsert: true, new: true }
        );
    }

    console.log('✅ Roles por defecto creados/actualizados');
};

// No incluir 'administrador' aquí porque se maneja aparte como único

const Role = mongoose.model('Role', roleSchema);

export default Role;