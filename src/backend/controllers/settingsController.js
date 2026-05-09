import User from '../models/User.js';

const DEBUG = true;
function log(...args) { if (DEBUG) console.log('⚙️ [Settings]', ...args); }

// Ajustes por defecto
const DEFAULT_SETTINGS = {
  appearance: {
    theme: 'auto',
    interfaceDensity: 'comfortable',
    autoDarkTime: '18:00',
    autoLightTime: '06:00',
    currentTheme: null
  },
  preferences: {
    language: 'es',
    timezone: 'America/Mexico_City',
    dateFormat: 'dd/mm/yyyy',
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    documentAlerts: true,
  },
  accessibility: {
    highContrast: false,
    largeFont: false,
    reducedMotion: false,
    fontSize: 16,
  },
  privacy: {
    autoLogout: true,
    autoLogoutTime: 30,
    cookieConsent: false
  }
};

/**
 * GET /api/user/settings
 * Obtiene los ajustes del usuario autenticado
 */
export const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Si no tiene ajustes, devolver los por defecto
    const settings = user.settings || DEFAULT_SETTINGS;
    
    log(`Ajustes obtenidos para: ${user.usuario}`);
    
    return res.json({
      success: true,
      settings
    });
    
  } catch (error) {
    log('Error obteniendo ajustes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al obtener ajustes' 
    });
  }
};

/**
 * PUT /api/user/settings
 * Guarda/actualiza TODOS los ajustes del usuario
 */
export const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Validar que settings sea un objeto
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de ajustes inválido' 
      });
    }

    // Merge con defaults para asegurar estructura completa
    const mergedSettings = mergeDeep(DEFAULT_SETTINGS, settings);
    
    // Guardar en el modelo
    user.settings = mergedSettings;
    
    // Si viene el tema, actualizar también el campo theme
    if (settings.appearance?.currentTheme) {
      user.theme = settings.appearance.currentTheme;
    }
    
    await user.save();
    
    log(`Ajustes guardados para: ${user.usuario}`);
    
    return res.json({
      success: true,
      settings: user.settings,
      message: 'Ajustes guardados correctamente'
    });
    
  } catch (error) {
    log('Error guardando ajustes:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al guardar ajustes' 
    });
  }
};

/**
 * PATCH /api/user/settings/:key
 * Actualiza un ajuste específico
 */
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, category } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }

    // Inicializar settings si no existen
    if (!user.settings) {
      user.settings = { ...DEFAULT_SETTINGS };
    }

    // Actualizar según categoría
    if (category && user.settings[category]) {
      user.settings[category][key] = value;
    } else {
      // Buscar en todas las categorías
      let found = false;
      for (const cat of Object.keys(user.settings)) {
        if (user.settings[cat] && user.settings[cat][key] !== undefined) {
          user.settings[cat][key] = value;
          found = true;
          break;
        }
      }
      
      if (!found) {
        return res.status(400).json({ 
          success: false, 
          message: `Clave "${key}" no encontrada en ajustes` 
        });
      }
    }

    // Si es el tema, actualizar campo theme
    if (key === 'currentTheme' || key === 'theme') {
      user.theme = value;
    }

    await user.save();
    
    log(`Ajuste actualizado: ${key} = ${value} para ${user.usuario}`);
    
    return res.json({
      success: true,
      settings: user.settings,
      message: 'Ajuste actualizado correctamente'
    });
    
  } catch (error) {
    log('Error actualizando ajuste:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar ajuste' 
    });
  }
};

// Helper: Merge profundo de objetos
function mergeDeep(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}