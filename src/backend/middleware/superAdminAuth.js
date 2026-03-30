// src/backend/middleware/superAdminAuth.js
import jwt from 'jsonwebtoken';

const TOKEN_EXPIRY = '8h';

// Getter para variables de entorno (se leen en tiempo real)
const env = {
    get user() { return process.env.SUPER_ADMIN_USER; },
    get pass() { return process.env.SUPER_ADMIN_PASS; },
    get email() { return process.env.SUPER_ADMIN_EMAIL; },
    get secret() {
        return process.env.SUPER_ADMIN_JWT_SECRET || (process.env.JWT_SECRET + '_SUPER');
    },
};

export function validarConfigSuperAdmin() {
    if (!env.user || !env.pass) {
        console.warn('⚠️ [SuperAdmin] SUPER_ADMIN_USER o SUPER_ADMIN_PASS no definidos');
        console.warn('   El superadmin no podrá acceder al sistema');
        return false;
    }
    console.log('✅ [SuperAdmin] Configuración cargada:');
    console.log(`   👤 Usuario: ${env.user}`);
    console.log(`   📧 Email: ${env.email || 'No configurado'}`);
    console.log(`   🔑 Contraseña: ${'*'.repeat(env.pass.length)} caracteres`);
    return true;
}

// =============================================================================
// VERIFICAR SI LAS CREDENCIALES SON DE SUPERADMIN
// =============================================================================
export function loginSuperAdmin(usuario, password) {
    if (!env.user || !env.pass) {
        return { success: false, message: 'Super Admin no configurado.' };
    }

    // Comparación EXACTA
    if (usuario !== env.user || password !== env.pass) {
        return { success: false, message: 'Credenciales inválidas.' };
    }

    // Generar token JWT para superadmin
    const token = jwt.sign(
        { 
            rol: 'superadmin', 
            usuario: env.user,
            email: env.email,
            isSuperAdmin: true,
            // No incluir _id porque NO existe en BD
            type: 'superadmin'
        },
        env.secret,
        { expiresIn: TOKEN_EXPIRY }
    );

    console.log('🛡️ Token de Superadmin generado (no persistido en BD)');
    
    return { success: true, token };
}

// =============================================================================
// MIDDLEWARE: Verificar si el usuario es superadmin (desde token)
// =============================================================================
export function protegerSuperAdmin(req, res, next) {
    try {
        let token;

        // Buscar token en cookies o headers
        if (req.cookies?.superadmin_token) {
            token = req.cookies.superadmin_token;
        } else if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Acceso de Super Administrador requerido.'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, env.secret);
        } catch (jwtErr) {
            if (jwtErr.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Sesión de Super Admin expirada.',
                    expired: true,
                });
            }
            return res.status(401).json({ 
                success: false, 
                message: 'Token de Super Admin inválido.' 
            });
        }

        // Verificar que sea realmente superadmin
        if (decoded.rol !== 'superadmin' || !decoded.isSuperAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso denegado. Se requieren privilegios de Super Administrador.' 
            });
        }

        // =============================================================
        // IMPORTANTE: NO buscar en BD, NO guardar en colección de usuarios
        // =============================================================
        req.superAdmin = {
            usuario: decoded.usuario,
            email: decoded.email,
            rol: 'superadmin',
            isSuperAdmin: true,
            // NO incluir _id porque no existe en BD
        };
        
        // También agregar a req.user para compatibilidad con middlewares existentes
        // pero con una marca especial para saber que NO es de BD
        req.user = {
            id: 'superadmin_' + Date.now(), // ID temporal único
            usuario: decoded.usuario,
            correo: decoded.email || 'superadmin@system.com',
            rol: 'superadmin',
            isSuperAdmin: true,
            fromDatabase: false // Indicador de que NO viene de BD
        };
        
        console.log('🛡️ Superadmin autenticado:', decoded.usuario);
        console.log('   ⚠️  No se registra en auditoría de usuarios');
        
        next();
    } catch (err) {
        console.error('Error en protegerSuperAdmin:', err);
        return res.status(500).json({
            success: false,
            message: 'Error en autenticación de Super Admin.',
        });
    }
}

// =============================================================================
// FUNCIÓN AUXILIAR: Verificar si el usuario actual es superadmin
// =============================================================================
export function isSuperAdmin(req) {
    return req.superAdmin?.isSuperAdmin === true || req.user?.isSuperAdmin === true;
}

// =============================================================================
// HELPERS para cookies
// =============================================================================
export function setSuperAdminCookie(res, token) {
    res.cookie('superadmin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 8 * 60 * 60 * 1000, // 8 horas
        path: '/'
    });
}

export function clearSuperAdminCookie(res) {
    res.cookie('superadmin_token', 'none', {
        httpOnly: true,
        expires: new Date(Date.now() + 5000),
        path: '/'
    });
}

// =============================================================================
// FUNCIÓN DE LOGOUT (limpia solo cookie de superadmin)
// =============================================================================
export function logoutSuperAdmin(res) {
    clearSuperAdminCookie(res);
}