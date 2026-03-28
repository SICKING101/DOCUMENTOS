// ============================================================
// chatbotController.js — Motor IA ARIA v3.1 (CORREGIDO)
// CBTIS051 — Fix: Campos de Task correctos, exclusión de papelera
// ============================================================

import Document from '../models/Document.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Person from '../models/Person.js';
import Conversation from '../models/Conversation.js';
import Department from '../models/Department.js';

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER
// ──────────────────────────────────────────────────────────────
const debug = {
    log:   (...a) => console.log ('\x1b[36m🤖 [ARIA]\x1b[0m', ...a),
    warn:  (...a) => console.warn ('\x1b[33m⚠️  [ARIA]\x1b[0m', ...a),
    error: (...a) => console.error('\x1b[31m❌ [ARIA]\x1b[0m', ...a),
    info:  (...a) => console.info ('\x1b[32mℹ️  [ARIA]\x1b[0m', ...a),
    action:(...a) => console.log ('\x1b[35m🎯 [ARIA-ACTION]\x1b[0m', ...a),
};

// ──────────────────────────────────────────────────────────────
// CLIENTE GROQ
// ──────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.1-8b-instant';
const GROQ_TIMEOUT = 20000;

async function callGroq(systemPrompt, messages, maxTokens = 1000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);

    try {
        const res = await fetch(GROQ_API_URL, {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model:       GROQ_MODEL,
                max_tokens:  maxTokens,
                temperature: 0.5,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages,
                ],
            }),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Groq HTTP ${res.status}: ${err.substring(0, 300)}`);
        }

        const data  = await res.json();
        const text  = data.choices?.[0]?.message?.content ?? '';
        const usage = data.usage ?? {};
        debug.info(`Groq OK — in=${usage.prompt_tokens} out=${usage.completion_tokens}`);
        return { text, usage };

    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') throw new Error('Groq timeout (20s)');
        throw err;
    }
}

// ──────────────────────────────────────────────────────────────
// CONTEXTO DEL SISTEMA - CORREGIDO
// ──────────────────────────────────────────────────────────────
async function buildSystemContext(userId) {
    const ctx = {
        stats: {}, tareas: {}, docs: {},
        personas: {}, categorias: [], departamentos: [],
    };

    try {
        const ahora  = new Date();
        const en7d   = new Date(ahora.getTime() + 7  * 86400000);
        const en15d  = new Date(ahora.getTime() + 15 * 86400000);
        const en30d  = new Date(ahora.getTime() + 30 * 86400000);
        const hace7d = new Date(ahora.getTime() - 7  * 86400000);
        const hoy0   = new Date(ahora); hoy0.setHours(0,0,0,0);
        const hoy23  = new Date(ahora); hoy23.setHours(23,59,59,999);

        // 🔥 CORRECCIÓN: Excluir documentos en papelera (isDeleted: true)
        const documentosActivosQuery = { 
            activo: true,
            $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } }
            ]
        };

        const [
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer7, docsPorVencer15, docsPorVencer30,
            docsVencidos, docsRecientes, docsHoy,
        ] = await Promise.all([
            Document.countDocuments(documentosActivosQuery),
            Person.countDocuments({ activo: true }),
            Category.countDocuments({ activo: true }),
            Department.countDocuments({ activo: true }),
            Document.countDocuments({ 
                ...documentosActivosQuery, 
                fecha_vencimiento: { $gte: ahora, $lte: en7d } 
            }),
            Document.countDocuments({ 
                ...documentosActivosQuery, 
                fecha_vencimiento: { $gte: ahora, $lte: en15d } 
            }),
            Document.countDocuments({ 
                ...documentosActivosQuery, 
                fecha_vencimiento: { $gte: ahora, $lte: en30d } 
            }),
            Document.countDocuments({ 
                ...documentosActivosQuery, 
                fecha_vencimiento: { $lt: ahora } 
            }),
            Document.countDocuments({ 
                ...documentosActivosQuery, 
                fecha_subida: { $gte: hace7d } 
            }),
            Document.countDocuments({ 
                ...documentosActivosQuery, 
                fecha_subida: { $gte: hoy0 } 
            }),
        ]);

        ctx.stats = {
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer7, docsPorVencer15, docsPorVencer30,
            docsVencidos, docsRecientes, docsHoy,
        };

        // 🔥 CORRECCIÓN: Tareas - Usar campos correctos del modelo Task
        try {
            // Query para tareas del usuario (activas y no eliminadas)
            const tareasQuery = { 
                activo: true,
                $or: [
                    { asignado_a: userId },      // 🔥 CORREGIDO: asignado_a (con guión bajo)
                    { creado_por: userId }        // 🔥 CORREGIDO: creado_por
                ]
            };
            
            const [tPend, tProg, tComp, tCancel, tVenc, tHoy, tSem] = await Promise.all([
                Task.countDocuments({ ...tareasQuery, estado: 'pendiente' }),
                Task.countDocuments({ ...tareasQuery, estado: 'en-progreso' }),
                Task.countDocuments({ ...tareasQuery, estado: 'completada' }),
                Task.countDocuments({ ...tareasQuery, estado: 'cancelada' }),
                Task.countDocuments({ 
                    ...tareasQuery, 
                    estado: { $in: ['pendiente', 'en-progreso'] }, 
                    fecha_limite: { $lt: ahora }     // 🔥 CORREGIDO: fecha_limite
                }),
                Task.countDocuments({ 
                    ...tareasQuery, 
                    fecha_limite: { $gte: hoy0, $lte: hoy23 } 
                }),
                Task.countDocuments({ 
                    ...tareasQuery, 
                    fecha_limite: { $gte: ahora, $lte: en7d } 
                }),
            ]);

            const lista = await Task.find({ 
                ...tareasQuery, 
                estado: { $in: ['pendiente', 'en-progreso'] } 
            })
                .sort({ prioridad: -1, fecha_limite: 1 })
                .limit(8)
                .lean();

            const completadas = await Task.find({ 
                ...tareasQuery, 
                estado: 'completada' 
            })
                .sort({ fecha_completada: -1 })
                .limit(5)
                .lean();

            ctx.tareas = {
                pendientes: tPend, 
                enProgreso: tProg,
                completadas: tComp,
                canceladas: tCancel,
                vencidas: tVenc,
                paraHoy: tHoy, 
                paraSemana: tSem,
                lista: lista.map(t => ({
                    id: String(t._id),
                    titulo: t.titulo,
                    descripcion: t.descripcion,
                    prioridad: t.prioridad || 'media',
                    estado: t.estado,
                    fechaLimite: t.fecha_limite
                        ? new Date(t.fecha_limite).toLocaleDateString('es-MX') : null,
                })),
                completadasRecientes: completadas.map(t => ({
                    titulo: t.titulo,
                    fechaCompletada: t.fecha_completada
                        ? new Date(t.fecha_completada).toLocaleDateString('es-MX') : null,
                })),
            };
        } catch (e) {
            debug.warn('Task no disponible:', e.message);
            ctx.tareas = {
                pendientes:0, enProgreso:0, completadas:0, canceladas:0,
                vencidas:0, paraHoy:0, paraSemana:0, 
                lista:[], completadasRecientes:[],
            };
        }

        // Documentos activos (excluyendo papelera) - con detalles
        const [recientes, urgentes, vencidos, porCategoria] = await Promise.all([
            Document.find(documentosActivosQuery)
                .sort({ fecha_subida: -1 }).limit(10)
                .populate('categoria', 'nombre').lean(),
            Document.find({ 
                ...documentosActivosQuery, 
                fecha_vencimiento: { $gte: ahora, $lte: en7d } 
            })
                .sort({ fecha_vencimiento: 1 }).limit(10).lean(),
            Document.find({ 
                ...documentosActivosQuery, 
                fecha_vencimiento: { $lt: ahora } 
            })
                .sort({ fecha_vencimiento: -1 }).limit(10).lean(),
            Document.aggregate([
                { $match: documentosActivosQuery },
                { $group: { _id: '$categoria', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]).limit(10),
        ]);

        ctx.docs = {
            recientes: recientes.map(d => ({
                nombre:     d.nombre_original,
                categoria:  d.categoria?.nombre || 'Sin categoría',
                fecha:      new Date(d.fecha_subida).toLocaleDateString('es-MX'),
                vencimiento: d.fecha_vencimiento
                    ? new Date(d.fecha_vencimiento).toLocaleDateString('es-MX') : null,
            })),
            urgentes: urgentes.map(d => ({
                nombre: d.nombre_original,
                vence:  new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasRestantes: Math.ceil((new Date(d.fecha_vencimiento) - ahora) / 86400000),
            })),
            vencidos: vencidos.map(d => ({
                nombre:    d.nombre_original,
                vencimiento: new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasVencidos: Math.ceil((ahora - new Date(d.fecha_vencimiento)) / 86400000),
            })),
            porCategoria: porCategoria.map(c => ({
                categoria: c._id || 'Sin categoría', 
                cantidad: c.count,
            })),
        };

        // Personas activas
        const [personas, porDepto] = await Promise.all([
            Person.find({ activo: true }).limit(20).lean(),
            Person.aggregate([
                { $match: { activo: true } },
                { $group: { _id: '$departamento', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]).limit(10),
        ]);

        ctx.personas = {
            total: totalPersonas,
            lista: personas.map(p => ({
                nombre:      p.nombre,
                email:       p.email,
                departamento: p.departamento,
                puesto:      p.puesto,
                telefono:    p.telefono,
            })),
            porDepartamento: porDepto.map(d => ({
                departamento: d._id || 'Sin departamento', 
                cantidad: d.count,
            })),
        };

        const [cats, deptos] = await Promise.all([
            Category.find({ activo: true }).lean(),
            Department.find({ activo: true }).lean(),
        ]);
        ctx.categorias   = cats.map(c => c.nombre);
        ctx.departamentos = deptos.map(d => d.nombre);

    } catch (err) {
        debug.error('Error construyendo contexto:', err.message);
    }

    return ctx;
}

// ──────────────────────────────────────────────────────────────
// SYSTEM PROMPT - ACTUALIZADO
// ──────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx, userInfo) {
    const s = ctx.stats  || {};
    const t = ctx.tareas || {};
    const d = ctx.docs   || {};
    const p = ctx.personas || {};

    const alertas = [];
    if (s.docsPorVencer7 > 0) alertas.push(`⚠️ ${s.docsPorVencer7} docs vencen en <7 días`);
    if (s.docsVencidos   > 0) alertas.push(`❌ ${s.docsVencidos} docs VENCIDOS`);
    if (t.vencidas       > 0) alertas.push(`⏰ ${t.vencidas} tareas vencidas`);

    const tareasStr = t.lista?.length
        ? t.lista.map(x =>
            `  [${x.id}] [${(x.prioridad||'media').toUpperCase()}] ${x.titulo}` +
            (x.fechaLimite ? ` → ${x.fechaLimite}` : '')
          ).join('\n')
        : '  (sin tareas activas)';

    const docsRecStr = d.recientes?.length
        ? d.recientes.slice(0,5).map(x => `  • ${x.nombre} (${x.categoria}) — ${x.fecha}`).join('\n')
        : '  (ninguno)';

    const docsUrgStr = d.urgentes?.length
        ? d.urgentes.slice(0,5).map(x => `  • ${x.nombre} — ${x.diasRestantes}d (${x.vence})`).join('\n')
        : '  (ninguno)';

    const catsStr   = ctx.categorias?.join(', ')   || 'ninguna';
    const deptosStr = ctx.departamentos?.join(', ') || 'ninguno';

    return `Eres ARIA, el asistente de IA del Sistema de Gestión Documental del CBTIS 051.
Usuario actual: ${userInfo?.nombre || 'Usuario'} (rol: ${userInfo?.rol || 'usuario'})

═══════════════════════════════════════════════════════════
DATOS REALES DEL SISTEMA (tiempo real)
═══════════════════════════════════════════════════════════
DOCUMENTOS ACTIVOS (excluye papelera): ${s.totalDocs||0} | ${s.docsHoy||0} hoy | ${s.docsRecientes||0} esta semana
  Urgentes (7d): ${s.docsPorVencer7||0} | Vencidos: ${s.docsVencidos||0}
PERSONAS: ${s.totalPersonas||0} | CATEGORÍAS: ${s.totalCategorias||0} | DEPARTAMENTOS: ${s.totalDeptos||0}
TAREAS: ${t.pendientes||0} pendientes | ${t.enProgreso||0} en progreso | ${t.completadas||0} completadas | ${t.vencidas||0} vencidas | ${t.paraHoy||0} para hoy
${alertas.length ? '\nALERTAS: '+alertas.join(' | ') : ''}

Tareas activas:
${tareasStr}

Docs recientes:
${docsRecStr}

Docs urgentes:
${docsUrgStr}

Categorías: ${catsStr}
Departamentos: ${deptosStr}
Personas por departamento:
${p.porDepartamento?.slice(0,5).map(x=>`  ${x.departamento}: ${x.cantidad}`).join('\n')||'  (ninguno)'}

═══════════════════════════════════════════════════════════
ACCIONES DISPONIBLES — INSTRUCCIONES CRÍTICAS
═══════════════════════════════════════════════════════════
Cuando el usuario pida NAVEGAR a una sección, incluye al FINAL de tu respuesta el JSON:
{"action":"navigate","target":"SECCION"}

Cuando el usuario pida CREAR/ABRIR algo, incluye:
{"action":"openModal","target":"MODAL"}

Cuando el usuario pida BUSCAR, incluye:
{"action":"search","query":"término","section":"documentos"}

SECCIONES VÁLIDAS (target para navigate):
  dashboard, documentos, personas, tareas, reportes, papelera,
  notificaciones, ajustes, soporte, categorias, departamentos

MODALES VÁLIDOS (target para openModal):
  upload        → subir documento
  addPerson     → agregar persona
  addTask       → crear tarea
  addCategory   → crear categoría
  addDepartment → crear departamento
  search        → búsqueda avanzada

═══════════════════════════════════════════════════════════
REGLAS ESTRICTAS
═══════════════════════════════════════════════════════════
1. USA SOLO LOS DATOS REALES ANTERIORES. NUNCA inventes cifras.
2. Los documentos en papelera NO se cuentan en estadísticas.
3. El JSON de acción SIEMPRE va en su propia línea al final, SIN backticks.
4. Responde SIEMPRE en español mexicano, de forma concisa y directa.`;
}

// ──────────────────────────────────────────────────────────────
// EXTRACTOR DE ACCIONES
// ──────────────────────────────────────────────────────────────
function extractActions(text) {
    const actions = [];
    if (!text) return actions;

    const rePlain = /\{[^{}]*"action"\s*:\s*"[^"]+[^{}]*\}/g;
    const reBlock = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/g;

    let m;

    while ((m = reBlock.exec(text)) !== null) {
        try {
            const parsed = JSON.parse(m[1]);
            if (parsed.action) {
                actions.push(parsed);
                debug.action('Extraída (bloque):', JSON.stringify(parsed));
            }
        } catch (_) {}
    }

    if (actions.length === 0) {
        while ((m = rePlain.exec(text)) !== null) {
            try {
                const parsed = JSON.parse(m[0]);
                if (parsed.action) {
                    actions.push(parsed);
                    debug.action('Extraída (plano):', JSON.stringify(parsed));
                }
            } catch (_) {}
        }
    }

    return actions;
}

function cleanText(text) {
    if (!text) return '';
    let clean = text
        .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
        .replace(/\{[^{}]*"action"\s*:\s*"[^"]+[^{}]*\}/g, '')
        .trim();
    clean = clean.replace(/\n{3,}/g, '\n\n');
    return clean;
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN DE INTENCIÓN
// ──────────────────────────────────────────────────────────────
function detectIntent(message) {
    const q = message.toLowerCase().trim();

    const navPatterns = [
        { pattern: /ir a |navegar a |abrir |ve a /, check: true },
        { pattern: /\bdocumentos\b/, nav: 'documentos' },
        { pattern: /\btareas\b/, nav: 'tareas' },
        { pattern: /\bpersonas\b/, nav: 'personas' },
        { pattern: /\bdashboard\b|\binicio\b|\bprincipal\b/, nav: 'dashboard' },
        { pattern: /\breportes\b|\binformes\b/, nav: 'reportes' },
        { pattern: /\bpapelera\b|\bpapel\b/, nav: 'papelera' },
        { pattern: /\bnotificaciones\b/, nav: 'notificaciones' },
        { pattern: /\bajustes\b|\bconfiguracion\b/, nav: 'ajustes' },
        { pattern: /\bsoporte\b|\bayuda\b/, nav: 'soporte' },
        { pattern: /\bcategor[ií]as\b/, nav: 'categorias' },
        { pattern: /\bdepartamentos\b/, nav: 'departamentos' },
    ];

    const isNavIntent = /\b(ir a|ve a|navegar|mostrar|abrir la secci[oó]n|llevar a)\b/.test(q);
    if (isNavIntent) {
        for (const p of navPatterns) {
            if (p.nav && p.pattern.test(q)) {
                return { type: 'navigate', target: p.nav };
            }
        }
    }

    if (/subir|cargar|upload/.test(q) && /documento|archivo/.test(q)) {
        return { type: 'openModal', target: 'upload' };
    }
    if (/crear|nueva?|agregar|a[ñn]adir/.test(q) && /tarea/.test(q)) {
        return { type: 'openModal', target: 'addTask' };
    }
    if (/crear|nueva?|agregar|a[ñn]adir/.test(q) && /persona|usuario|empleado/.test(q)) {
        return { type: 'openModal', target: 'addPerson' };
    }
    if (/crear|nueva?|agregar/.test(q) && /categor[ií]a/.test(q)) {
        return { type: 'openModal', target: 'addCategory' };
    }
    if (/crear|nueva?|agregar/.test(q) && /departamento/.test(q)) {
        return { type: 'openModal', target: 'addDepartment' };
    }
    if (/buscar|search|encontrar/.test(q)) {
        const queryMatch = q.replace(/buscar|search|encontrar|documento/g, '').trim();
        return { type: 'search', query: queryMatch, section: 'documentos' };
    }

    return { type: 'query' };
}

// ──────────────────────────────────────────────────────────────
// FALLBACK INTELIGENTE - ACTUALIZADO
// ──────────────────────────────────────────────────────────────
function ruleBasedResponse(message, ctx) {
    const q = message.toLowerCase().trim();
    const s = ctx.stats  || {};
    const t = ctx.tareas || {};
    const d = ctx.docs   || {};

    const intent = detectIntent(message);

    if (intent.type === 'navigate') {
        const labels = {
            documentos:'Documentos', tareas:'Tareas', personas:'Personas',
            dashboard:'Dashboard', reportes:'Reportes', papelera:'Papelera',
            notificaciones:'Notificaciones', ajustes:'Ajustes', soporte:'Soporte',
            categorias:'Categorías', departamentos:'Departamentos',
        };
        return {
            message: `📍 Navegando a **${labels[intent.target] || intent.target}**...`,
            suggestions: ['Ir a Dashboard', 'Ir a Documentos', 'Ir a Tareas'],
            actions: [{ action: 'navigate', target: intent.target }],
        };
    }

    if (intent.type === 'openModal') {
        const msgs = {
            upload:        `📤 Abriendo el formulario para **subir documento**.\n\nArrastra el archivo o selecciónalo desde tu equipo.`,
            addTask:       `✅ Abriendo el formulario para **crear tarea**.\n\nCompleta el título, descripción, prioridad y fecha límite.`,
            addPerson:     `👤 Abriendo el formulario para **agregar persona**.`,
            addCategory:   `📁 Abriendo el formulario para **crear categoría**.`,
            addDepartment: `🏢 Abriendo el formulario para **crear departamento**.`,
        };
        return {
            message: msgs[intent.target] || `Abriendo ${intent.target}...`,
            suggestions: ['Ver mis tareas', 'Subir documento', 'Ir a Dashboard'],
            actions: [{ action: 'openModal', target: intent.target }],
        };
    }

    if (/cu[aá]ntos? documento/.test(q) || /estad[ií]stica/.test(q)) {
        return {
            message: `📊 **Documentos activos (excluye papelera):**\n\n• **${s.totalDocs||0}** activos\n• **${s.docsHoy||0}** subidos hoy\n• **${s.docsRecientes||0}** esta semana\n• **${s.docsPorVencer7||0}** por vencer en 7 días\n• **${s.docsVencidos||0}** vencidos`,
            suggestions: ['Documentos por vencer', 'Subir documento', 'Ir a Documentos'],
            actions: [],
        };
    }

    if (/cu[aá]ntas? tarea/.test(q) || /mis tareas/.test(q)) {
        return {
            message: `✅ **Tus tareas:**\n\n• **${t.pendientes||0}** pendientes\n• **${t.enProgreso||0}** en progreso\n• **${t.completadas||0}** completadas\n• **${t.vencidas||0}** vencidas\n• **${t.paraHoy||0}** para hoy\n\n${t.lista?.length ? '**Próximas:**\n' + t.lista.slice(0,3).map(x=>`• [${x.prioridad?.toUpperCase()||'MEDIA'}] ${x.titulo}`+(x.fechaLimite?` → ${x.fechaLimite}`:'')).join('\n') : ''}`,
            suggestions: ['Crear nueva tarea', 'Ir a Tareas', 'Tareas para hoy'],
            actions: [],
        };
    }

    if (/resumen|dashboard|estado del sistema/.test(q)) {
        return {
            message: `**📊 RESUMEN DEL SISTEMA — CBTIS 051**\n\n📄 Documentos activos: **${s.totalDocs||0}**\n✅ Tareas: **${t.pendientes||0}** pendientes, **${t.paraHoy||0}** para hoy\n👥 Personas: **${s.totalPersonas||0}**\n📁 Categorías: **${s.totalCategorias||0}**\n\n${s.docsPorVencer7>0?`⚠️ **Alerta:** ${s.docsPorVencer7} docs vencen en 7 días`:'✅ Sin alertas urgentes'}`,
            suggestions: ['Ver documentos urgentes', 'Mis tareas para hoy', 'Ir a Dashboard'],
            actions: [],
        };
    }

    if (/documento.* vencen|vencen.*documento|urgentes/.test(q)) {
        if (!d.urgentes?.length) {
            return {
                message: `✅ **No hay documentos por vencer** en los próximos 7 días. ¡Todo al día!`,
                suggestions: ['Ver todos los documentos', 'Ir a Documentos'],
                actions: [{ action: 'navigate', target: 'documentos' }],
            };
        }
        const lista = d.urgentes.slice(0,5).map(x=>
            `• **${x.nombre}** — vence en **${x.diasRestantes}** día(s) (${x.vence})`
        ).join('\n');
        return {
            message: `🚨 **Documentos por vencer (${d.urgentes.length}):**\n\n${lista}`,
            suggestions: ['Ir a Documentos', 'Subir documento'],
            actions: [{ action: 'navigate', target: 'documentos' }],
        };
    }

    if (/hola|buenos d[ií]as|buenas tardes|buenas noches|hey|buen d[ií]a/.test(q)) {
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        return {
            message: `${saludo} 👋 Soy **ARIA**. Datos actuales:\n\n• **${s.totalDocs||0}** documentos activos\n• **${t.pendientes||0}** tareas pendientes\n• **${s.totalPersonas||0}** personas\n${s.docsPorVencer7>0?`\n⚠️ **${s.docsPorVencer7}** documentos vencen esta semana.\n`:''}\n¿En qué te ayudo?`,
            suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos por vencer', '¿Qué puedes hacer?'],
            actions: [],
        };
    }

    if (/qu[eé] puedes|ayuda|comandos|help/.test(q)) {
        return {
            message: `**🎯 Puedo ayudarte con:**\n\n**📊 Consultas:**\n• "¿Cuántos documentos hay?"\n• "Resumen del sistema"\n• "Mis tareas pendientes"\n• "Documentos por vencer"\n\n**🗺️ Navegación:**\n• "Ir a documentos"\n• "Ir a tareas"\n• "Ir a reportes"\n\n**⚡ Acciones:**\n• "Subir documento"\n• "Crear tarea"\n• "Agregar persona"\n• "Crear categoría"`,
            suggestions: ['Resumen del sistema', 'Ir a Documentos', 'Crear tarea', 'Subir documento'],
            actions: [],
        };
    }

    return {
        message: `🤔 No entendí bien "${message.substring(0,60)}". ¿Quieres que te ayude con:\n\n• 📊 **Estadísticas** del sistema\n• 🗺️ **Navegar** a una sección\n• ⚡ **Realizar una acción**\n• 🔍 **Buscar** un documento`,
        suggestions: ['Resumen del sistema', 'Mis tareas', 'Ir a Documentos', '¿Qué puedes hacer?'],
        actions: [],
    };
}

// ──────────────────────────────────────────────────────────────
// SUGERENCIAS CONTEXTUALES
// ──────────────────────────────────────────────────────────────
function buildSuggestions(message, ctx) {
    const q = message.toLowerCase();
    const s = ctx.stats  || {};
    const t = ctx.tareas || {};
    const out = new Set();

    if (s.docsPorVencer7 > 0) out.add(`⚠️ ${s.docsPorVencer7} doc(s) por vencer`);
    if (t.vencidas > 0)        out.add(`🚨 ${t.vencidas} tarea(s) vencida(s)`);
    if (t.paraHoy > 0)         out.add(`📅 Tareas para hoy (${t.paraHoy})`);

    if (q.includes('documento')) {
        out.add('Subir documento'); out.add('Documentos por vencer');
    } else if (q.includes('tarea')) {
        out.add('Crear nueva tarea'); out.add('Ir a Tareas');
    } else if (q.includes('persona')) {
        out.add('Agregar persona'); out.add('Ir a Personas');
    } else {
        out.add('Resumen del sistema'); out.add('Mis tareas');
        out.add('Ir a Documentos'); out.add('Subir documento');
    }

    return [...out].slice(0, 5);
}

// ──────────────────────────────────────────────────────────────
// HISTORIAL
// ──────────────────────────────────────────────────────────────
async function getConvHistory(userId, limit = 6) {
    try {
        const rows = await Conversation.find({ usuario: userId })
            .sort({ timestamp: -1 }).limit(limit).lean();
        return rows.reverse().flatMap(r => [
            { role: 'user',      content: r.mensajeUsuario },
            { role: 'assistant', content: r.respuestaBot },
        ]);
    } catch (e) {
        debug.warn('Error cargando historial:', e.message);
        return [];
    }
}

async function saveConv(userId, userMsg, botMsg, extra = {}) {
    try {
        return await Conversation.create({
            usuario:        userId,
            mensajeUsuario: userMsg,
            respuestaBot:   botMsg,
            fuente:         extra.fuente   ?? 'rule-based',
            latencia:       extra.latencia ?? null,
        });
    } catch (e) {
        debug.warn('Error guardando conversación:', e.message);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────
// VALIDACIÓN DE ACCIÓN
// ──────────────────────────────────────────────────────────────
function validateAndFixActions(actions, originalMessage) {
    if (!actions.length) {
        const intent = detectIntent(originalMessage);
        if (intent.type === 'navigate') {
            debug.action('Acción inferida por intent:', intent);
            return [{ action: 'navigate', target: intent.target }];
        }
        if (intent.type === 'openModal') {
            debug.action('Modal inferido por intent:', intent);
            return [{ action: 'openModal', target: intent.target }];
        }
        if (intent.type === 'search') {
            return [{ action: 'search', query: intent.query, section: intent.section }];
        }
    }

    const VALID_NAV = [
        'dashboard','documentos','personas','tareas','reportes',
        'papelera','notificaciones','ajustes','soporte','categorias','departamentos',
    ];
    const VALID_MODAL = [
        'upload','addPerson','addTask','addCategory','addDepartment','search',
    ];

    return actions.filter(a => {
        if (a.action === 'navigate') {
            const ok = VALID_NAV.includes(a.target?.toLowerCase());
            if (!ok) debug.warn(`navigate target inválido: "${a.target}"`);
            return ok;
        }
        if (a.action === 'openModal') {
            const ok = VALID_MODAL.includes(a.target);
            if (!ok) debug.warn(`openModal target inválido: "${a.target}"`);
            return ok;
        }
        if (a.action === 'search') return !!a.query;
        return false;
    });
}

// ──────────────────────────────────────────────────────────────
// CONTROLLER PRINCIPAL
// ──────────────────────────────────────────────────────────────
class ChatbotController {

    async processMessage(req, res) {
        const t0     = Date.now();
        const userId = req.user?.id || req.user?._id;
        const { message } = req.body;

        if (!message?.trim())
            return res.status(400).json({ success: false, message: 'Mensaje vacío.' });
        if (message.trim().length > 1500)
            return res.status(400).json({ success: false, message: 'Mensaje demasiado largo (máx. 1500 caracteres).' });

        const msg = message.trim();
        debug.log(`Mensaje recibido: "${msg.substring(0, 100)}"`);

        try {
            const [ctx, history] = await Promise.all([
                buildSystemContext(userId),
                getConvHistory(userId, 6),
            ]);

            const userInfo = {
                nombre: req.user?.nombre || req.user?.usuario || req.user?.name || 'Usuario',
                rol:    req.user?.rol    || req.user?.role    || 'usuario',
                id:     userId,
            };

            if (process.env.GROQ_API_KEY) {
                try {
                    const systemPrompt = buildSystemPrompt(ctx, userInfo);
                    const { text: raw } = await callGroq(systemPrompt, [
                        ...history,
                        { role: 'user', content: msg },
                    ]);

                    debug.log(`Groq respuesta cruda: "${raw.substring(0, 200)}"`);

                    let   actions  = extractActions(raw);
                          actions  = validateAndFixActions(actions, msg);
                    const cleanMsg = cleanText(raw);
                    const latency  = Date.now() - t0;
                    const suggestions = buildSuggestions(msg, ctx);

                    debug.info(`Groq OK en ${latency}ms | acciones: ${JSON.stringify(actions)}`);

                    const conv = await saveConv(userId, msg, cleanMsg, {
                        fuente: 'groq', latencia: latency,
                    });

                    return res.json({
                        success: true,
                        data: {
                            message:        cleanMsg,
                            actions,
                            suggestions,
                            source:         'groq',
                            latency,
                            conversationId: conv?._id,
                            debug: {
                                actionsRaw:    extractActions(raw).length,
                                actionsFixed:  actions.length,
                                intentDetected: detectIntent(msg),
                            },
                        },
                    });

                } catch (groqErr) {
                    debug.warn('Groq falló, usando fallback:', groqErr.message);
                }
            }

            const fb      = ruleBasedResponse(msg, ctx);
            const latency = Date.now() - t0;
            const cleanMsg= cleanText(fb.message ?? '');
            let   actions = fb.actions ?? [];
                  actions = validateAndFixActions(actions, msg);

            const conv = await saveConv(userId, msg, cleanMsg, {
                fuente: 'rule-based', latencia: latency,
            });

            debug.info(`Fallback OK en ${latency}ms | acciones: ${JSON.stringify(actions)}`);

            return res.json({
                success: true,
                data: {
                    message:        cleanMsg,
                    actions,
                    suggestions:    fb.suggestions ?? buildSuggestions(msg, ctx),
                    source:         'rule-based',
                    latency,
                    conversationId: conv?._id,
                },
            });

        } catch (err) {
            debug.error('Error crítico:', err);
            return res.status(500).json({
                success: false,
                message: 'Error procesando tu consulta. Intenta de nuevo.',
            });
        }
    }

    async getSystemStats(req, res) {
        const userId = req.user?.id || req.user?._id;
        try {
            const ctx = await buildSystemContext(userId);
            return res.json({
                success: true,
                data: {
                    ...ctx.stats,
                    tareas:                   ctx.tareas,
                    documentosUrgentes:       ctx.docs.urgentes,
                    ultimosDocumentos:        ctx.docs.recientes,
                    documentosVencidos:       ctx.docs.vencidos,
                    documentosPorCategoria:   ctx.docs.porCategoria,
                    personas:                 ctx.personas,
                    personasPorDepartamento:  ctx.personas.porDepartamento,
                    categorias:               ctx.categorias,
                    departamentos:            ctx.departamentos,
                },
            });
        } catch (err) {
            debug.error('getSystemStats error:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
        }
    }

    async getHistory(req, res) {
        const userId = req.user?.id || req.user?._id;
        const limit  = Math.min(parseInt(req.query.limit) || 20, 50);
        try {
            const rows = await Conversation.find({ usuario: userId })
                .sort({ timestamp: -1 }).limit(limit).lean();
            return res.json({
                success: true,
                data: rows.reverse().map(r => ({
                    _id:         r._id,
                    userMessage: r.mensajeUsuario,
                    botResponse: r.respuestaBot,
                    timestamp:   r.timestamp,
                    util:        r.util,
                    source:      r.fuente,
                })),
            });
        } catch (err) {
            debug.error('getHistory error:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener historial.' });
        }
    }

    async clearHistory(req, res) {
        const userId = req.user?.id || req.user?._id;
        try {
            const result = await Conversation.deleteMany({ usuario: userId });
            debug.log(`Historial borrado: ${result.deletedCount} registros`);
            return res.json({ success: true, message: `${result.deletedCount} mensajes eliminados.` });
        } catch (err) {
            debug.error('clearHistory error:', err);
            return res.status(500).json({ success: false, message: 'Error al borrar historial.' });
        }
    }

    async submitFeedback(req, res) {
        const userId = req.user?.id || req.user?._id;
        const { conversationId, util } = req.body;
        try {
            const result = await Conversation.findOneAndUpdate(
                { _id: conversationId, usuario: userId },
                { util: Boolean(util) },
                { new: true }
            );
            if (!result)
                return res.status(404).json({ success: false, message: 'Conversación no encontrada.' });
            return res.json({ success: true, message: 'Feedback registrado.' });
        } catch (err) {
            debug.error('submitFeedback error:', err);
            return res.status(500).json({ success: false });
        }
    }
}

export default new ChatbotController();