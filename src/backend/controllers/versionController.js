// src/backend/controllers/versionController.js
// Controlador para el Panel de Versiones.
//
// Operaciones de escritura (crear, editar, eliminar) → solo superadmin.
// Operaciones de lectura (listar, detalle) → cualquier usuario autenticado.

import Version from '../models/Version.js';

// =============================================================================
// LECTURA — Disponible para todos los usuarios autenticados
// =============================================================================

/**
 * GET /api/versions
 * Lista todas las versiones ordenadas de más reciente a más antigua.
 */
export async function getAllVersions(req, res) {
  try {
    const versions = await Version.find()
      .sort({ fechaLanzamiento: -1 })
      .lean();

    res.json({
      success: true,
      versions,
      total: versions.length,
    });
  } catch (err) {
    console.error('❌ [Version] Error obteniendo versiones:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las versiones del sistema.',
    });
  }
}

/**
 * GET /api/versions/current
 * Devuelve la versión marcada como actual.
 */
export async function getCurrentVersion(req, res) {
  try {
    const version = await Version.findOne({ esActual: true }).lean();

    if (!version) {
      // Si no hay ninguna marcada, devolver la más reciente
      const latest = await Version.findOne()
        .sort({ fechaLanzamiento: -1 })
        .lean();

      return res.json({
        success: true,
        version: latest || null,
      });
    }

    res.json({ success: true, version });
  } catch (err) {
    console.error('❌ [Version] Error obteniendo versión actual:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la versión actual.',
    });
  }
}

/**
 * GET /api/versions/:id
 * Detalle de una versión específica.
 */
export async function getVersionById(req, res) {
  try {
    const { id } = req.params;
    const version = await Version.findById(id).lean();

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Versión no encontrada.',
      });
    }

    res.json({ success: true, version });
  } catch (err) {
    console.error('❌ [Version] Error obteniendo versión:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la versión.',
    });
  }
}

// =============================================================================
// ESCRITURA — Solo superadmin (protegerSuperAdmin middleware aplicado en ruta)
// =============================================================================

/**
 * POST /api/superadmin/versions
 * Crear una nueva versión.
 */
export async function createVersion(req, res) {
  try {
    const {
      numero,
      titulo,
      descripcion,
      cambios,
      estado,
      esActual,
      fechaLanzamiento,
    } = req.body;

    // Validación básica
    if (!numero || !titulo) {
      return res.status(400).json({
        success: false,
        message: 'El número y el título de la versión son obligatorios.',
      });
    }

    // Verificar que el número no exista ya
    const existe = await Version.findOne({ numero: numero.trim() });
    if (existe) {
      return res.status(400).json({
        success: false,
        message: `Ya existe la versión ${numero}.`,
      });
    }

    const nuevaVersion = new Version({
      numero: numero.trim(),
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || '',
      cambios: Array.isArray(cambios) ? cambios : [],
      estado: estado || 'estable',
      esActual: Boolean(esActual),
      fechaLanzamiento: fechaLanzamiento ? new Date(fechaLanzamiento) : new Date(),
      creadoPor: 'superadmin',
    });

    await nuevaVersion.save();

    console.log(`✅ [SuperAdmin] Nueva versión creada: v${numero}`);

    res.status(201).json({
      success: true,
      message: `Versión ${numero} creada exitosamente.`,
      version: nuevaVersion,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: mensajes.join('. '),
      });
    }

    console.error('❌ [Version] Error creando versión:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al crear la versión.',
    });
  }
}

/**
 * PUT /api/superadmin/versions/:id
 * Actualizar una versión existente.
 */
export async function updateVersion(req, res) {
  try {
    const { id } = req.params;
    const {
      numero,
      titulo,
      descripcion,
      cambios,
      estado,
      esActual,
      fechaLanzamiento,
    } = req.body;

    const version = await Version.findById(id);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Versión no encontrada.',
      });
    }

    // Si cambia el número, verificar que no exista en otra versión
    if (numero && numero.trim() !== version.numero) {
      const existe = await Version.findOne({
        numero: numero.trim(),
        _id: { $ne: id },
      });
      if (existe) {
        return res.status(400).json({
          success: false,
          message: `Ya existe una versión con el número ${numero}.`,
        });
      }
      version.numero = numero.trim();
    }

    if (titulo !== undefined)            version.titulo           = titulo.trim();
    if (descripcion !== undefined)       version.descripcion      = descripcion.trim();
    if (cambios !== undefined)           version.cambios          = Array.isArray(cambios) ? cambios : [];
    if (estado !== undefined)            version.estado           = estado;
    if (esActual !== undefined)          version.esActual         = Boolean(esActual);
    if (fechaLanzamiento !== undefined)  version.fechaLanzamiento = new Date(fechaLanzamiento);

    await version.save();

    console.log(`✅ [SuperAdmin] Versión actualizada: v${version.numero}`);

    res.json({
      success: true,
      message: `Versión ${version.numero} actualizada exitosamente.`,
      version,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const mensajes = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: mensajes.join('. '),
      });
    }

    console.error('❌ [Version] Error actualizando versión:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar la versión.',
    });
  }
}

/**
 * DELETE /api/superadmin/versions/:id
 * Eliminar una versión permanentemente.
 */
export async function deleteVersion(req, res) {
  try {
    const { id } = req.params;

    const version = await Version.findByIdAndDelete(id);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Versión no encontrada.',
      });
    }

    console.log(`🗑️ [SuperAdmin] Versión eliminada: v${version.numero}`);

    res.json({
      success: true,
      message: `Versión ${version.numero} eliminada permanentemente.`,
    });
  } catch (err) {
    console.error('❌ [Version] Error eliminando versión:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la versión.',
    });
  }
}

/**
 * PATCH /api/superadmin/versions/:id/set-current
 * Marcar una versión como la actual del sistema.
 */
export async function setCurrentVersion(req, res) {
  try {
    const { id } = req.params;

    const version = await Version.findById(id);
    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Versión no encontrada.',
      });
    }

    version.esActual = true;
    await version.save(); // El pre-save hook limpia las otras

    console.log(`✅ [SuperAdmin] Versión actual definida: v${version.numero}`);

    res.json({
      success: true,
      message: `v${version.numero} ahora es la versión actual del sistema.`,
      version,
    });
  } catch (err) {
    console.error('❌ [Version] Error definiendo versión actual:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al definir la versión actual.',
    });
  }
}