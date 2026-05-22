// src/backend/controllers/schoolController.js
// Controlador para obtener la lista de escuelas registradas en el sistema
// Agrupa por schoolId único y devuelve nombre + schoolId

import User from '../models/User.js';

/**
 * GET /api/superadmin/schools
 * Devuelve todas las escuelas únicas registradas en el sistema.
 * Cada escuela incluye: schoolId, nombre, total de usuarios, admin asignado
 */
export async function getSchools(req, res) {
  try {
    // Agregación: agrupar por schoolId, contar usuarios y obtener el admin
    const schools = await User.aggregate([
      // Solo usuarios que tengan schoolId (excluir superadmin y otros sin escuela)
      {
        $match: {
          schoolId: { $ne: null, $exists: true }
        }
      },
      // Agrupar por schoolId
      {
        $group: {
          _id: '$schoolId',
          totalUsuarios: { $sum: 1 },
          // Obtener el admin de la escuela (rol = 'administrador')
          admins: {
            $push: {
              $cond: [
                { $eq: ['$rol', 'administrador'] },
                { usuario: '$usuario', correo: '$correo', activo: '$activo' },
                '$$REMOVE'
              ]
            }
          },
          // También recolectamos todos los usuarios para contar roles
          usuarios: {
            $push: {
              usuario: '$usuario',
              rol: '$rol',
              activo: '$activo'
            }
          }
        }
      },
      // Ordenar por schoolId alfabéticamente
      {
        $sort: { _id: 1 }
      },
      // Dar formato a la salida
      {
        $project: {
          _id: 0,
          schoolId: '$_id',
          totalUsuarios: 1,
          // Filtrar solo admins activos
          admin: {
            $filter: {
              input: '$admins',
              as: 'admin',
              cond: { $eq: ['$$admin.activo', true] }
            }
          },
          // Contar por rol
          totalAdmins: {
            $size: {
              $filter: {
                input: '$usuarios',
                as: 'u',
                cond: { $eq: ['$$u.rol', 'administrador'] }
              }
            }
          },
          totalActivos: {
            $size: {
              $filter: {
                input: '$usuarios',
                as: 'u',
                cond: { $eq: ['$$u.activo', true] }
              }
            }
          }
        }
      }
    ]);

    // Formatear la respuesta
    const formattedSchools = schools.map(s => ({
      schoolId: s.schoolId,
      // Extraer nombre legible del schoolId
      // Ej: "school-cbtis-51-51662544" → "CBTIS 051"
      displayName: formatSchoolName(s.schoolId),
      totalUsuarios: s.totalUsuarios,
      totalAdmins: s.totalAdmins,
      totalActivos: s.totalActivos,
      adminPrincipal: s.admin && s.admin.length > 0 
        ? { usuario: s.admin[0].usuario, correo: s.admin[0].correo }
        : null,
    }));

    res.json({
      success: true,
      total: formattedSchools.length,
      schools: formattedSchools,
    });
  } catch (err) {
    console.error('❌ [Schools] Error obteniendo escuelas:', err.message);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de escuelas.',
      error: err.message,
    });
  }
}

/**
 * Convierte un schoolId en un nombre legible
 * Ejemplos:
 *   "school-cbtis-51-51662544" → "CBTIS 051"
 *   "school-cetis-12-12345678" → "CETIS 012"
 *   "school-conalep-tlalpan-87654321" → "CONALEP Tlalpan"
 */
function formatSchoolName(schoolId) {
  if (!schoolId || !schoolId.startsWith('school-')) {
    return schoolId || 'Sin nombre';
  }

  // Quitar prefijo "school-"
  let name = schoolId.replace(/^school-/, '');

  // Separar el sufijo numérico (último grupo de dígitos)
  const parts = name.split('-');
  
  // El último elemento suele ser un hash/ID numérico
  if (parts.length > 1 && /^\d{6,}$/.test(parts[parts.length - 1])) {
    parts.pop(); // Quitar el hash numérico
  }

  // Formatear: capitalizar cada parte
  const formatted = parts.map(part => {
    // Si es un número, ponerlo con 3 dígitos (ej: "51" → "051")
    if (/^\d+$/.test(part)) {
      return part.padStart(3, '0');
    }
    // Si es texto, capitalizar primera letra
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(' ');

  return formatted;
}

export default { getSchools };