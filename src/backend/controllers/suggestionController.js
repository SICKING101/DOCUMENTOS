import mongoose from 'mongoose';
import Suggestion from '../models/Suggestion.js';
import AuditService from '../services/auditService.js';
import { transporter } from './authController.js';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const DEBUG = true;
function slog(...args) { if (DEBUG) console.log('💡 [Suggestions]', ...args); }
function serr(...args) { console.error('❌ [Suggestions]', ...args); }

const EMAIL_FROM = 'riosnavarretejared@gmail.com';
const ADMIN_EMAIL = 'riosnavarretejared@gmail.com';

// =============================================================================
// FUNCIÓN PARA ENVIAR EMAIL
// =============================================================================

async function sendSuggestionEmail(suggestion, user) {
    const categoryLabels = {
        'funcionalidad': '🚀 Nueva Funcionalidad',
        'mejora': '⚡ Mejora de Existente',
        'ui': '🎨 Interfaz de Usuario (UI)',
        'rendimiento': '🏃 Rendimiento',
        'seguridad': '🔒 Seguridad',
        'documentos': '📄 Gestión de Documentos',
        'tareas': '✅ Tareas',
        'reportes': '📊 Reportes',
        'otro': '📝 Otro'
    };

    const priorityLabels = {
        'baja': '🟢 Baja',
        'media': '🟡 Media',
        'alta': '🔴 Alta'
    };

    const authorInfo = suggestion.anonymous 
        ? 'Anónimo' 
        : `${user?.usuario || 'Usuario'} (${user?.correo || 'Sin correo'})`;

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; background: #f9fafb; border-radius: 12px; overflow: hidden; }
                .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; }
                .header h1 { color: white; margin: 0; font-size: 24px; }
                .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
                .content { padding: 30px; background: white; }
                .info-card { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
                .info-row { display: flex; margin-bottom: 10px; }
                .info-label { font-weight: bold; width: 120px; color: #6b7280; }
                .info-value { color: #1f2937; flex: 1; }
                .suggestion-text { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
                .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                .badge-high { background: #fee2e2; color: #dc2626; }
                .badge-medium { background: #fef3c7; color: #d97706; }
                .badge-low { background: #dcfce7; color: #10b981; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📬 Nueva Sugerencia Recibida</h1>
                    <p>Sistema de Gestión de Documentos - CBTIS051</p>
                </div>
                
                <div class="content">
                    <div class="info-card">
                        <div class="info-row">
                            <div class="info-label">📝 Título:</div>
                            <div class="info-value"><strong>${escapeHtml(suggestion.title)}</strong></div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">📂 Categoría:</div>
                            <div class="info-value">${categoryLabels[suggestion.category] || suggestion.category}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">⚡ Prioridad:</div>
                            <div class="info-value">
                                <span class="badge ${suggestion.priority === 'alta' ? 'badge-high' : suggestion.priority === 'media' ? 'badge-medium' : 'badge-low'}">
                                    ${priorityLabels[suggestion.priority]}
                                </span>
                            </div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">👤 Autor:</div>
                            <div class="info-value">${authorInfo}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">📅 Fecha:</div>
                            <div class="info-value">${new Date().toLocaleString('es-MX')}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">🌐 IP:</div>
                            <div class="info-value">${suggestion.ipAddress || 'No disponible'}</div>
                        </div>
                    </div>
                    
                    <h3 style="color: #374151; margin-top: 0;">📋 Descripción de la sugerencia:</h3>
                    <div class="suggestion-text">
                        ${escapeHtml(suggestion.description).replace(/\n/g, '<br>')}
                    </div>
                    
                    ${suggestion.benefit ? `
                        <h3 style="color: #374151;">💡 Beneficio esperado:</h3>
                        <div class="suggestion-text" style="background: #f0fdf4;">
                            ${escapeHtml(suggestion.benefit).replace(/\n/g, '<br>')}
                        </div>
                    ` : ''}
                    
                    <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p style="margin: 0; color: #4338ca;">
                            <strong>📌 Nota:</strong> Esta sugerencia ha sido registrada en el sistema con ID: <code>${suggestion._id}</code>
                        </p>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Este es un mensaje automático del Sistema de Gestión de Documentos CBTIS051.</p>
                    <p>© ${new Date().getFullYear()} CBTIS051 - Todos los derechos reservados</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const textContent = `
        NUEVA SUGERENCIA RECIBIDA - CBTIS051
        
        Título: ${suggestion.title}
        Categoría: ${categoryLabels[suggestion.category] || suggestion.category}
        Prioridad: ${priorityLabels[suggestion.priority]}
        Autor: ${authorInfo}
        Fecha: ${new Date().toLocaleString('es-MX')}
        
        DESCRIPCIÓN:
        ${suggestion.description}
        
        ${suggestion.benefit ? `BENEFICIO ESPERADO:\n${suggestion.benefit}` : ''}
        
        ---
        ID de sugerencia: ${suggestion._id}
    `;

    const mailOptions = {
        from: `"Sistema CBTIS051 - Sugerencias" <${EMAIL_FROM}>`,
        to: ADMIN_EMAIL,
        subject: `📬 NUEVA SUGERENCIA: ${suggestion.title.substring(0, 50)}`,
        html: htmlContent,
        text: textContent
    };

    if (!transporter) {
        console.error('❌ Transporter no disponible para enviar email');
        return false;
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email de sugerencia enviado:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error enviando email:', error.message);
        return false;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =============================================================================
// 1. CREAR NUEVA SUGERENCIA (Y ENVIAR EMAIL)
// =============================================================================

export const createSuggestion = async (req, res) => {
    slog('Creando nueva sugerencia...');

    try {
        const {
            title,
            category,
            description,
            benefit,
            priority,
            anonymous
        } = req.body;

        const userId = req.user.id;
        const user = req.user;

        // Validaciones
        if (!title || !category || !description) {
            return res.status(400).json({
                success: false,
                message: 'Título, categoría y descripción son requeridos'
            });
        }

        // Crear sugerencia en BD
        const suggestion = new Suggestion({
            title: title.trim(),
            category,
            description: description.trim(),
            benefit: benefit ? benefit.trim() : '',
            priority: priority || 'media',
            anonymous: anonymous || false,
            author: userId,
            authorName: anonymous ? '' : user.usuario,
            authorEmail: anonymous ? '' : user.correo,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        await suggestion.save();
        slog(`Sugerencia guardada en BD: ${suggestion._id}`);

        // Enviar email al desarrollador
        const emailSent = await sendSuggestionEmail(suggestion, user);

        // Registrar en auditoría
        await AuditService.log(req, {
            action: 'SUGGESTION_CREATE',
            actionType: 'CREATE',
            actionCategory: 'SUGGESTIONS',
            targetId: suggestion._id,
            targetModel: 'Suggestion',
            targetName: title,
            description: `Nueva sugerencia enviada: ${title}`,
            severity: 'INFO',
            status: 'SUCCESS',
            metadata: {
                suggestionId: suggestion._id,
                category,
                priority,
                anonymous,
                emailSent
            }
        }).catch(err => serr('Error registrando auditoría:', err.message));

        res.status(201).json({
            success: true,
            message: emailSent 
                ? '✅ Sugerencia enviada exitosamente. ¡Gracias por tu aporte!'
                : '⚠️ Sugerencia guardada, pero no se pudo enviar el email. El administrador revisará manualmente.',
            suggestion: {
                _id: suggestion._id,
                title: suggestion.title,
                createdAt: suggestion.createdAt
            }
        });

    } catch (error) {
        serr('Error creando sugerencia:', error);

        await AuditService.log(req, {
            action: 'SUGGESTION_CREATE',
            actionType: 'CREATE',
            actionCategory: 'SUGGESTIONS',
            targetId: null,
            targetModel: 'Suggestion',
            targetName: req.body.title || 'Nueva sugerencia',
            description: `Error al crear sugerencia: ${error.message}`,
            severity: 'ERROR',
            status: 'FAILED',
            metadata: { error: error.message }
        }).catch(err => serr('Error registrando auditoría:', err.message));

        res.status(500).json({
            success: false,
            message: 'Error al enviar sugerencia',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// =============================================================================
// 2. LISTAR SUGERENCIAS DEL USUARIO (SOLO PARA VER SUS ENVIADAS)
// =============================================================================

export const getMySuggestions = async (req, res) => {
    slog('Obteniendo mis sugerencias...');

    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [suggestions, total] = await Promise.all([
            Suggestion.find({ author: userId })
                .select('title category description status createdAt')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Suggestion.countDocuments({ author: userId })
        ]);

        res.json({
            success: true,
            suggestions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        serr('Error obteniendo mis sugerencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tus sugerencias'
        });
    }
};

// =============================================================================
// 3. ESTADÍSTICAS SIMPLES
// =============================================================================

export const getSuggestionStats = async (req, res) => {
    try {
        const total = await Suggestion.countDocuments();
        const thisMonth = await Suggestion.countDocuments({
            createdAt: {
                $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            }
        });

        res.json({
            success: true,
            stats: {
                total,
                thisMonth
            }
        });
    } catch (error) {
        serr('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas'
        });
    }
};