// ============================================================================
// src/backend/models/Role.js
// ============================================================================
// MODELO DE ROLES CON PERMISOS COMPLETOS - CORREGIDO (SIN EXPORT DUPLICADO)
// ============================================================================

import mongoose from 'mongoose';

// Lista completa de permisos disponibles
export const PERMISOS_DISPONIBLES = [
    // Dashboard
    { id: 'ver_dashboard', nombre: 'Ver Dashboard', categoria: 'Dashboard', descripcion: 'Acceso al panel principal' },

    // Personas
    { id: 'ver_personas', nombre: 'Ver Personas', categoria: 'Personas', descripcion: 'Listar y ver detalles de personas' },
    { id: 'crear_personas', nombre: 'Crear Personas', categoria: 'Personas', descripcion: 'Registrar nuevas personas' },
    { id: 'editar_personas', nombre: 'Editar Personas', categoria: 'Personas', descripcion: 'Modificar información de personas' },
    { id: 'eliminar_personas', nombre: 'Eliminar Personas', categoria: 'Personas', descripcion: 'Eliminar personas del sistema' },

    // Documentos
    { id: 'ver_documentos', nombre: 'Ver Documentos', categoria: 'Documentos', descripcion: 'Listar y ver documentos' },
    { id: 'subir_documentos', nombre: 'Subir Documentos', categoria: 'Documentos', descripcion: 'Cargar nuevos documentos' },
    { id: 'editar_documentos', nombre: 'Editar Documentos', categoria: 'Documentos', descripcion: 'Modificar metadatos de documentos' },
    { id: 'eliminar_documentos', nombre: 'Eliminar Documentos', categoria: 'Documentos', descripcion: 'Eliminar documentos' },
    { id: 'descargar_documentos', nombre: 'Descargar Documentos', categoria: 'Documentos', descripcion: 'Permite descargar archivos' },

    // Categorías
    { id: 'ver_categorias', nombre: 'Ver Categorías', categoria: 'Categorías', descripcion: 'Listar categorías' },
    { id: 'crear_categorias', nombre: 'Crear Categorías', categoria: 'Categorías', descripcion: 'Crear nuevas categorías' },
    { id: 'editar_categorias', nombre: 'Editar Categorías', categoria: 'Categorías', descripcion: 'Modificar categorías' },
    { id: 'eliminar_categorias', nombre: 'Eliminar Categorías', categoria: 'Categorías', descripcion: 'Eliminar categorías' },

    // Departamentos
    { id: 'ver_departamentos', nombre: 'Ver Departamentos', categoria: 'Departamentos', descripcion: 'Listar departamentos' },
    { id: 'crear_departamentos', nombre: 'Crear Departamentos', categoria: 'Departamentos', descripcion: 'Crear nuevos departamentos' },
    { id: 'editar_departamentos', nombre: 'Editar Departamentos', categoria: 'Departamentos', descripcion: 'Modificar departamentos' },
    { id: 'eliminar_departamentos', nombre: 'Eliminar Departamentos', categoria: 'Departamentos', descripcion: 'Eliminar departamentos' },

    // Tareas
    { id: 'ver_tareas', nombre: 'Ver Tareas', categoria: 'Tareas', descripcion: 'Listar y ver tareas' },
    { id: 'crear_tareas', nombre: 'Crear Tareas', categoria: 'Tareas', descripcion: 'Crear nuevas tareas' },
    { id: 'editar_tareas', nombre: 'Editar Tareas', categoria: 'Tareas', descripcion: 'Modificar tareas' },
    { id: 'eliminar_tareas', nombre: 'Eliminar Tareas', categoria: 'Tareas', descripcion: 'Eliminar tareas' },
    { id: 'asignar_tareas', nombre: 'Asignar Tareas', categoria: 'Tareas', descripcion: 'Asignar tareas a usuarios' },

    // Reportes
    { id: 'ver_reportes', nombre: 'Ver Reportes', categoria: 'Reportes', descripcion: 'Acceder a reportes' },
    { id: 'generar_reportes', nombre: 'Generar Reportes', categoria: 'Reportes', descripcion: 'Crear nuevos reportes' },
    { id: 'exportar_reportes', nombre: 'Exportar Reportes', categoria: 'Reportes', descripcion: 'Exportar a PDF/Excel' },

    // Calendario
    { id: 'ver_calendario', nombre: 'Ver Calendario', categoria: 'Calendario', descripcion: 'Acceder al calendario' },
    { id: 'crear_eventos', nombre: 'Crear Eventos', categoria: 'Calendario', descripcion: 'Crear eventos en calendario' },
    { id: 'editar_eventos', nombre: 'Editar Eventos', categoria: 'Calendario', descripcion: 'Modificar eventos' },
    { id: 'eliminar_eventos', nombre: 'Eliminar Eventos', categoria: 'Calendario', descripcion: 'Eliminar eventos' },

    // Historial
    { id: 'ver_historial', nombre: 'Ver Historial', categoria: 'Historial', descripcion: 'Acceder al historial' },
    { id: 'exportar_historial', nombre: 'Exportar Historial', categoria: 'Historial', descripcion: 'Exportar logs' },

    // Soporte
    { id: 'ver_soporte', nombre: 'Ver Soporte', categoria: 'Soporte', descripcion: 'Acceder al centro de soporte' },
    { id: 'crear_tickets', nombre: 'Crear Tickets', categoria: 'Soporte', descripcion: 'Crear tickets de soporte' },
    { id: 'responder_tickets', nombre: 'Responder Tickets', categoria: 'Soporte', descripcion: 'Responder a tickets' },
    { id: 'cerrar_tickets', nombre: 'Cerrar Tickets', categoria: 'Soporte', descripcion: 'Cerrar tickets' },

    // Papelera
    { id: 'ver_papelera', nombre: 'Ver Papelera', categoria: 'Papelera', descripcion: 'Acceder a elementos eliminados' },
    { id: 'restaurar_documentos', nombre: 'Restaurar Documentos', categoria: 'Papelera', descripcion: 'Restaurar desde papelera' },
    { id: 'vaciar_papelera', nombre: 'Vaciar Papelera', categoria: 'Papelera', descripcion: 'Eliminar permanentemente' },

    // Administración (solo admin puede tener estos)
    { id: 'ver_usuarios', nombre: 'Ver Usuarios', categoria: 'Administración', descripcion: 'Listar usuarios del sistema' },
    { id: 'crear_usuarios', nombre: 'Crear Usuarios', categoria: 'Administración', descripcion: 'Crear nuevos usuarios' },
    { id: 'editar_usuarios', nombre: 'Editar Usuarios', categoria: 'Administración', descripcion: 'Modificar usuarios' },
    { id: 'eliminar_usuarios', nombre: 'Eliminar Usuarios', categoria: 'Administración', descripcion: 'Desactivar/eliminar usuarios' },
    { id: 'ver_roles', nombre: 'Ver Roles', categoria: 'Administración', descripcion: 'Listar roles' },
    { id: 'crear_roles', nombre: 'Crear Roles', categoria: 'Administración', descripcion: 'Crear nuevos roles' },
    { id: 'editar_roles', nombre: 'Editar Roles', categoria: 'Administración', descripcion: 'Modificar roles' },
    { id: 'eliminar_roles', nombre: 'Eliminar Roles', categoria: 'Administración', descripcion: 'Eliminar roles' },

    // Agrega estos al array PERMISOS_DISPONIBLES:
    { id: 'editar_cualquier_documento', nombre: 'Editar Cualquier Documento', categoria: 'Documentos', descripcion: 'Permite editar documentos de otros usuarios' },
    { id: 'editar_cualquier_persona', nombre: 'Editar Cualquier Persona', categoria: 'Personas', descripcion: 'Permite editar personas creadas por otros' },
    { id: 'editar_cualquier_tarea', nombre: 'Editar Cualquier Tarea', categoria: 'Tareas', descripcion: 'Permite editar tareas de otros usuarios' },
    { id: 'ver_notificaciones', nombre: 'Ver Notificaciones', categoria: 'Notificaciones', descripcion: 'Acceso al sistema de notificaciones' }
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