// ============================================================
// chatbotController.js — Motor IA ARIA v4.0
// CBTIS051 — Mejoras masivas: NLP, analytics, auto-diagnóstico
// ============================================================

import Document from '../models/Document.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Person from '../models/Person.js';
import Conversation from '../models/Conversation.js';
import Department from '../models/Department.js';

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER MEJORADO
// ──────────────────────────────────────────────────────────────
const debug = {
    log:    (...a) => console.log ('\x1b[36m🤖 [ARIA v4]\x1b[0m',      ...a),
    warn:   (...a) => console.warn ('\x1b[33m⚠️  [ARIA v4]\x1b[0m',     ...a),
    error:  (...a) => console.error('\x1b[31m❌ [ARIA v4]\x1b[0m',      ...a),
    info:   (...a) => console.info ('\x1b[32mℹ️  [ARIA v4]\x1b[0m',     ...a),
    action: (...a) => console.log ('\x1b[35m🎯 [ARIA-ACTION]\x1b[0m',   ...a),
    db:     (...a) => console.log ('\x1b[34m🗄️  [ARIA-DB]\x1b[0m',      ...a),
    nlp:    (...a) => console.log ('\x1b[93m🧠 [ARIA-NLP]\x1b[0m',      ...a),
    perf:   (...a) => console.log ('\x1b[96m⚡ [ARIA-PERF]\x1b[0m',     ...a),
};

// ──────────────────────────────────────────────────────────────
// CLIENTE GROQ — con retry y backoff
// ──────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.1-8b-instant';
const GROQ_TIMEOUT = 25000;

async function callGroq(systemPrompt, messages, maxTokens = 1200, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
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
                    temperature: 0.4,
                    top_p:       0.9,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages,
                    ],
                }),
                signal: controller.signal,
            });

            clearTimeout(timer);

            if (res.status === 429 && attempt < retries) {
                const wait = (attempt + 1) * 1500;
                debug.warn(`Rate limit Groq, esperando ${wait}ms (intento ${attempt+1}/${retries})`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }

            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Groq HTTP ${res.status}: ${err.substring(0, 300)}`);
            }

            const data  = await res.json();
            const text  = data.choices?.[0]?.message?.content ?? '';
            const usage = data.usage ?? {};
            debug.info(`Groq OK (intento ${attempt+1}) — in=${usage.prompt_tokens} out=${usage.completion_tokens}`);
            return { text, usage };

        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                if (attempt < retries) { debug.warn(`Groq timeout, reintentando...`); continue; }
                throw new Error('Groq timeout (25s) — sin más reintentos');
            }
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
            }
            throw err;
        }
    }
}

// ──────────────────────────────────────────────────────────────
// SCHEMA CONFIRMADO DEL MODELO TASK (Task.js v2.0)
// ──────────────────────────────────────────────────────────────
// Campos verificados directamente del modelo:
//   asignado_a      → Array de ObjectId (ref: 'User')  ← ARRAY, no scalar
//   creado_por      → ObjectId (ref: 'User')
//   fecha_limite    → Date | null
//   fecha_completada→ Date | null
//   estado          → 'pendiente' | 'en-progreso' | 'completada' | 'cancelada'
//   prioridad       → 'baja' | 'media' | 'alta' | 'critica'  ← SIN tilde
//   titulo          → String
//   activo          → Boolean
//   tipo            → 'personal' | 'asignada' | 'grupal' | 'clase'
// ──────────────────────────────────────────────────────────────
const TASK_SCHEMA = {
    assignedField:  'asignado_a',   // Array de ObjectId
    createdByField: 'creado_por',   // ObjectId scalar
    dueDateField:   'fecha_limite',
    completedField: 'fecha_completada',
    statusField:    'estado',
    priorityField:  'prioridad',
    titleField:     'titulo',
    // Valores exactos del enum (sin tildes donde el modelo no las tiene)
    statuses:       ['pendiente', 'en-progreso', 'completada', 'cancelada'],
    priorities:     ['baja', 'media', 'alta', 'critica'],   // 'critica' sin tilde
    highPriorities: ['alta', 'critica'],
};

debug.info('Schema Task cargado:', JSON.stringify(TASK_SCHEMA));

// ──────────────────────────────────────────────────────────────
// QUERY DE TAREAS — HARDCODEADO AL SCHEMA REAL
// asignado_a es Array<ObjectId>, por lo que $elemMatch con ObjectId
// funciona. También incluimos creado_por para tareas propias.
// ──────────────────────────────────────────────────────────────
async function buildTaskQuery(userId) {
    // Asegurarse de tener ObjectId real además del string
    let userObjectId = userId;
    try {
        if (typeof userId === 'string' && /^[a-f\d]{24}$/i.test(userId)) {
            const { default: mongoose } = await import('mongoose');
            userObjectId = new mongoose.Types.ObjectId(userId);
        }
    } catch (_) {
        // Si falla la conversión, usar el valor original — MongoDB lo maneja
    }

    const query = {
        activo: true,
        $or: [
            // asignado_a es array, $in funciona correctamente con arrays en MongoDB:
            // busca documentos donde el array asignado_a contiene userId
            { asignado_a: userObjectId },
            { asignado_a: String(userId) },
            { creado_por:  userObjectId },
            { creado_por:  String(userId) },
        ],
    };

    debug.db(`Task query para userId=${String(userId)}:`, JSON.stringify(query));
    return { query, schema: TASK_SCHEMA };
}

// ──────────────────────────────────────────────────────────────
// CONTEXTO DEL SISTEMA v4.0 — Datos enriquecidos
// ──────────────────────────────────────────────────────────────
async function buildSystemContext(userId) {
    const t0 = Date.now();
    const ctx = {
        stats: {}, tareas: {}, docs: {},
        personas: {}, categorias: [], departamentos: [],
        analytics: {}, sistema: {},
    };

    try {
        const ahora  = new Date();
        const en3d   = new Date(ahora.getTime() + 3  * 86400000);
        const en7d   = new Date(ahora.getTime() + 7  * 86400000);
        const en15d  = new Date(ahora.getTime() + 15 * 86400000);
        const en30d  = new Date(ahora.getTime() + 30 * 86400000);
        const hace7d = new Date(ahora.getTime() - 7  * 86400000);
        const hace30d= new Date(ahora.getTime() - 30 * 86400000);
        const hoy0   = new Date(ahora); hoy0.setHours(0,0,0,0);
        const hoy23  = new Date(ahora); hoy23.setHours(23,59,59,999);

        // Query base para documentos activos (excluye papelera)
        const docQuery = {
            activo: true,
            $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } },
            ],
        };

        // ── Estadísticas generales (paralelo) ────────────────
        const [
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer3, docsPorVencer7, docsPorVencer15, docsPorVencer30,
            docsVencidos, docsRecientes, docsHoy, docsEstesMes,
        ] = await Promise.all([
            Document.countDocuments(docQuery),
            Person.countDocuments({ activo: true }),
            Category.countDocuments({ activo: true }),
            Department.countDocuments({ activo: true }),
            Document.countDocuments({ ...docQuery, fecha_vencimiento: { $gte: ahora, $lte: en3d } }),
            Document.countDocuments({ ...docQuery, fecha_vencimiento: { $gte: ahora, $lte: en7d } }),
            Document.countDocuments({ ...docQuery, fecha_vencimiento: { $gte: ahora, $lte: en15d } }),
            Document.countDocuments({ ...docQuery, fecha_vencimiento: { $gte: ahora, $lte: en30d } }),
            Document.countDocuments({ ...docQuery, fecha_vencimiento: { $lt: ahora } }),
            Document.countDocuments({ ...docQuery, fecha_subida: { $gte: hace7d } }),
            Document.countDocuments({ ...docQuery, fecha_subida: { $gte: hoy0 } }),
            Document.countDocuments({ ...docQuery, fecha_subida: { $gte: new Date(ahora.getFullYear(), ahora.getMonth(), 1) } }),
        ]);

        ctx.stats = {
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer3, docsPorVencer7, docsPorVencer15, docsPorVencer30,
            docsVencidos, docsRecientes, docsHoy, docsEstesMes,
        };

        // ── Tareas — CON AUTO-DIAGNÓSTICO ────────────────────
        try {
            const { query: tareasQuery, schema } = await buildTaskQuery(userId);

            debug.db('Ejecutando queries de tareas...');

            const [tPend, tProg, tComp, tCancel, tVenc, tHoy, tSem, tTotal] = await Promise.all([
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'pendiente' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'en-progreso' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'completada' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'cancelada' }),
                Task.countDocuments({
                    ...tareasQuery,
                    [schema.statusField]: { $in: ['pendiente', 'en-progreso'] },
                    [schema.dueDateField]: { $lt: ahora, $ne: null },
                }),
                Task.countDocuments({
                    ...tareasQuery,
                    [schema.dueDateField]: { $gte: hoy0, $lte: hoy23 },
                }),
                Task.countDocuments({
                    ...tareasQuery,
                    [schema.dueDateField]: { $gte: ahora, $lte: en7d },
                }),
                Task.countDocuments(tareasQuery),
            ]);

            debug.db(`Tareas — total:${tTotal} pend:${tPend} prog:${tProg} comp:${tComp} cancel:${tCancel} venc:${tVenc}`);

            // Verificación: Si todos son 0 pero total > 0, problema con query
            if (tTotal > 0 && tPend + tProg + tComp + tCancel === 0) {
                debug.warn(`⚠️ Tareas encontradas (${tTotal}) pero estados en 0. Posible campo estado incorrecto.`);
            }

            // Lista de tareas activas ordenadas
            const lista = await Task.find({
                ...tareasQuery,
                [schema.statusField]: { $in: ['pendiente', 'en-progreso'] },
            })
                .sort({ [schema.priorityField]: -1, [schema.dueDateField]: 1 })
                .limit(10)
                .lean();

            // Tareas completadas recientes
            const completadas = await Task.find({
                ...tareasQuery,
                [schema.statusField]: 'completada',
            })
                .sort({ [schema.completedField]: -1 })
                .limit(5)
                .lean();

            // Tareas de alta prioridad (enum exacto: 'alta' | 'critica')
            const altaPrioridad = await Task.find({
                ...tareasQuery,
                [schema.priorityField]: { $in: TASK_SCHEMA.highPriorities },
                [schema.statusField]: { $in: ['pendiente', 'en-progreso'] },
            })
                .sort({ [schema.dueDateField]: 1 })
                .limit(5)
                .lean();

            ctx.tareas = {
                total:     tTotal,
                pendientes: tPend,
                enProgreso: tProg,
                completadas: tComp,
                canceladas:  tCancel,
                vencidas:    tVenc,
                paraHoy:     tHoy,
                paraSemana:  tSem,
                porcentajeCompletado: tTotal > 0 ? Math.round((tComp / tTotal) * 100) : 0,
                lista: lista.map(t => ({
                    id:          String(t._id),
                    titulo:      t[schema.titleField] || t.titulo || t.title || 'Sin título',
                    descripcion: t.descripcion || t.description || '',
                    prioridad:   t[schema.priorityField] || 'media',
                    estado:      t[schema.statusField] || 'pendiente',
                    fechaLimite: t[schema.dueDateField]
                        ? new Date(t[schema.dueDateField]).toLocaleDateString('es-MX') : null,
                    diasRestantes: t[schema.dueDateField]
                        ? Math.ceil((new Date(t[schema.dueDateField]) - ahora) / 86400000) : null,
                })),
                altaPrioridad: altaPrioridad.map(t => ({
                    titulo:    t[schema.titleField] || t.titulo || 'Sin título',
                    prioridad: t[schema.priorityField] || 'alta',
                    fechaLimite: t[schema.dueDateField]
                        ? new Date(t[schema.dueDateField]).toLocaleDateString('es-MX') : null,
                })),
                completadasRecientes: completadas.map(t => ({
                    titulo:          t[schema.titleField] || t.titulo || 'Sin título',
                    fechaCompletada: t[schema.completedField]
                        ? new Date(t[schema.completedField]).toLocaleDateString('es-MX') : null,
                })),
                _schema: schema, // Para debugging
            };

        } catch (e) {
            debug.error('Error cargando tareas:', e.message, e.stack);
            ctx.tareas = {
                total:0, pendientes:0, enProgreso:0, completadas:0, canceladas:0,
                vencidas:0, paraHoy:0, paraSemana:0, porcentajeCompletado:0,
                lista:[], altaPrioridad:[], completadasRecientes:[],
                _error: e.message,
            };
        }

        // ── Documentos detallados ─────────────────────────────
        const [recientes, urgentes, vencidos, porCategoria, sinCategoria, aprobados] = await Promise.all([
            Document.find(docQuery)
                .sort({ fecha_subida: -1 }).limit(10)
                .populate('categoria', 'nombre').lean(),
            Document.find({ ...docQuery, fecha_vencimiento: { $gte: ahora, $lte: en7d } })
                .sort({ fecha_vencimiento: 1 }).limit(10).lean(),
            Document.find({ ...docQuery, fecha_vencimiento: { $lt: ahora } })
                .sort({ fecha_vencimiento: -1 }).limit(10).lean(),
            Document.aggregate([
                { $match: docQuery },
                { $group: { _id: '$categoria', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            Document.countDocuments({ ...docQuery, categoria: { $exists: false } }),
            Document.countDocuments({ ...docQuery, aprobado: true }).catch(() => 0),
        ]);

        ctx.docs = {
            recientes: recientes.map(d => ({
                nombre:      d.nombre_original || d.nombre || 'Sin nombre',
                categoria:   d.categoria?.nombre || 'Sin categoría',
                fecha:       new Date(d.fecha_subida).toLocaleDateString('es-MX'),
                vencimiento: d.fecha_vencimiento
                    ? new Date(d.fecha_vencimiento).toLocaleDateString('es-MX') : null,
                tamaño:      d.tamaño || d.size || null,
            })),
            urgentes: urgentes.map(d => ({
                nombre:        d.nombre_original || d.nombre || 'Sin nombre',
                vence:         new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasRestantes: Math.ceil((new Date(d.fecha_vencimiento) - ahora) / 86400000),
            })),
            vencidos: vencidos.map(d => ({
                nombre:       d.nombre_original || d.nombre || 'Sin nombre',
                vencimiento:  new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasVencidos: Math.ceil((ahora - new Date(d.fecha_vencimiento)) / 86400000),
            })),
            porCategoria:  porCategoria.map(c => ({ categoria: c._id || 'Sin categoría', cantidad: c.count })),
            sinCategoria,
            aprobados,
        };

        // ── Personas detalladas ───────────────────────────────
        const [personas, porDepto] = await Promise.all([
            Person.find({ activo: true }).limit(30).lean(),
            Person.aggregate([
                { $match: { activo: true } },
                { $group: { _id: '$departamento', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
        ]);

        ctx.personas = {
            total: totalPersonas,
            lista:  personas.map(p => ({
                nombre:       p.nombre,
                email:        p.email,
                departamento: p.departamento,
                puesto:       p.puesto,
                telefono:     p.telefono,
            })),
            porDepartamento: porDepto.map(d => ({
                departamento: d._id || 'Sin departamento',
                cantidad:     d.count,
            })),
        };

        // ── Categorías y Departamentos ────────────────────────
        const [cats, deptos] = await Promise.all([
            Category.find({ activo: true }).lean(),
            Department.find({ activo: true }).lean(),
        ]);
        ctx.categorias    = cats.map(c => c.nombre);
        ctx.departamentos = deptos.map(d => d.nombre);

        // ── Analytics de actividad ────────────────────────────
        try {
            const [
                docsLastMonth,
                convCount,
                topCategories,
            ] = await Promise.all([
                Document.countDocuments({ ...docQuery, fecha_subida: { $gte: hace30d } }),
                Conversation.countDocuments({ usuario: userId }).catch(() => 0),
                Document.aggregate([
                    { $match: docQuery },
                    { $group: { _id: '$categoria', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 3 },
                ]),
            ]);

            ctx.analytics = {
                docsUltimos30d:   docsLastMonth,
                interaccionesIA:  convCount,
                categoriaTop:     topCategories[0]?._id || 'N/A',
                tasaCompletado:   ctx.tareas.porcentajeCompletado,
                saludSistema:     _calcularSaludSistema(ctx.stats, ctx.tareas),
            };
        } catch (e) {
            debug.warn('Analytics parciales:', e.message);
            ctx.analytics = { saludSistema: 'desconocido' };
        }

        // ── Info del sistema ──────────────────────────────────
        ctx.sistema = {
            fechaActual:  new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            horaActual:   new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            año:          new Date().getFullYear(),
        };

        debug.perf(`Contexto construido en ${Date.now() - t0}ms`);

    } catch (err) {
        debug.error('Error construyendo contexto:', err.message);
    }

    return ctx;
}

// ──────────────────────────────────────────────────────────────
// HELPERS DE FORMATO
// ──────────────────────────────────────────────────────────────

/** Convierte el enum interno de prioridad a label para mostrar al usuario */
/** Convierte el enum interno de prioridad a label para mostrar al usuario */
function prioridadLabel(p) {
    const MAP = { 
        baja: '🟢 Baja', 
        media: '🟡 Media', 
        alta: '🟠 Alta', 
        critica: '🔴 Crítica' 
    };
    return MAP[p?.toLowerCase()] || (p || 'Media');
}

/** Convierte el enum interno de estado a label para mostrar al usuario */
function estadoLabel(e) {
    const MAP = {
        'pendiente':  '⏳ Pendiente',
        'en-progreso': '🔄 En progreso',
        'completada': '✅ Completada',
        'cancelada':  '❌ Cancelada',
    };
    return MAP[e] || (e || 'Pendiente');
}

// ──────────────────────────────────────────────────────────────
// CALCULADORA DE SALUD DEL SISTEMA
// ──────────────────────────────────────────────────────────────
function _calcularSaludSistema(stats, tareas) {
    let score = 100;
    if (stats.docsVencidos > 0)      score -= Math.min(stats.docsVencidos * 5, 30);
    if (stats.docsPorVencer7 > 0)    score -= Math.min(stats.docsPorVencer7 * 2, 15);
    if (tareas.vencidas > 0)         score -= Math.min(tareas.vencidas * 3, 20);
    const nivel = score >= 80 ? '🟢 Excelente' : score >= 60 ? '🟡 Regular' : '🔴 Crítico';
    return `${nivel} (${score}/100)`;
}

// ──────────────────────────────────────────────────────────────
// SYSTEM PROMPT v4.0 — Mucho más inteligente
// ──────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx, userInfo) {
    const s = ctx.stats    || {};
    const t = ctx.tareas   || {};
    const d = ctx.docs     || {};
    const p = ctx.personas || {};
    const a = ctx.analytics || {};
    const si= ctx.sistema  || {};

    // Calcular tareas urgentes y vencidas REALES para el prompt
    const tareasVencidas = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes < 0) || [];
    const tareasUrgentes = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes >= 0 && x.diasRestantes <= 2) || [];
    const hayVencidas = tareasVencidas.length > 0;
    const hayUrgentes = tareasUrgentes.length > 0;
    
    // Construir mensaje de alerta de tareas para el prompt
    let alertaTareasTexto = '';
    if (hayVencidas) {
        alertaTareasTexto = `🚨 ${tareasVencidas.length} tarea(s) VENCIDA(S) — ATENCIÓN INMEDIATA`;
    } else if (hayUrgentes) {
        alertaTareasTexto = `⚠️ ${tareasUrgentes.length} tarea(s) URGENTE(S) (vencen en ≤2 días)`;
    } else {
        alertaTareasTexto = '✅ Sin tareas urgentes ni vencidas';
    }

    // Construir alertas generales
    const alertasGenerales = [];
    if (s.docsPorVencer3 > 0) alertasGenerales.push(`🚨 CRÍTICO: ${s.docsPorVencer3} docs vencen en <3 días`);
    else if (s.docsPorVencer7 > 0) alertasGenerales.push(`⚠️ ${s.docsPorVencer7} docs vencen en <7 días`);
    if (s.docsVencidos > 0) alertasGenerales.push(`❌ ${s.docsVencidos} docs VENCIDOS sin atender`);

    // Formatear lista de tareas
    const tareasStr = t.lista?.length
        ? t.lista.map(x => {
            let etiqueta = '';
            if (x.diasRestantes !== null && x.diasRestantes < 0) {
                etiqueta = ' 🔴 VENCIDA';
            } else if (x.diasRestantes !== null && x.diasRestantes <= 2) {
                etiqueta = ' ⚠️ URGENTE';
            } else if (x.diasRestantes !== null && x.diasRestantes <= 7) {
                etiqueta = ' 📅 Próxima';
            }
            return `  • [${(x.prioridad||'media').toUpperCase()}] ${x.titulo}${etiqueta} → ${x.fechaLimite || 'sin fecha'} (${x.estado})`;
          }).join('\n')
        : '  • (sin tareas activas)';

    const altaPrioStr = t.altaPrioridad?.length
        ? t.altaPrioridad.map(x => `  • 🔴 [${x.prioridad.toUpperCase()}] ${x.titulo} → ${x.fechaLimite || 'sin fecha'}`).join('\n')
        : '  • (ninguna)';

    const docsRecStr = d.recientes?.length
        ? d.recientes.slice(0,5).map(x => `  • ${x.nombre} (${x.categoria}) — ${x.fecha}`).join('\n')
        : '  • (ninguno)';

    const docsUrgStr = d.urgentes?.length
        ? d.urgentes.slice(0,5).map(x => `  • ${x.nombre} — ⚠️ ${x.diasRestantes}d (${x.vence})`).join('\n')
        : '  • (ninguno)';

    const docsVencStr = d.vencidos?.length
        ? d.vencidos.slice(0,5).map(x => `  • ${x.nombre} — VENCIDO hace ${x.diasVencidos}d (${x.vencimiento})`).join('\n')
        : '  • (ninguno)';

    return `Eres ARIA v1.0, asistente IA del Sistema de Gestión Documental del CBTIS 051.

⚠️ **REGLA CRÍTICA #1**: LOS DATOS ABAJO SON REALES. USA EXACTAMENTE ESOS NÚMEROS.
⚠️ **REGLA CRÍTICA #2**: NUNCA DIGAS "No tienes tareas vencidas o urgentes" SI HAY TAREAS CON ETIQUETA "⚠️ URGENTE" o "🔴 VENCIDA".
⚠️ **REGLA CRÍTICA #3**: SI UNA TAREA TIENE LA ETIQUETA "⚠️ URGENTE", DEBES MENCIONAR QUE ES URGENTE.
⚠️ **REGLA CRÍTICA #4**: SI HAY TAREAS CON ETIQUETA "⚠️ URGENTE" O "🔴 VENCIDA", EL MENSAJE DE ALERTA DEBE REFLEJARLO.

Usuario: ${userInfo?.nombre || 'Usuario'} | Rol: ${userInfo?.rol || 'usuario'}
Fecha/Hora: ${si.fechaActual} — ${si.horaActual}

══════════════════════════════════════════════════════
📊 DATOS REALES DEL SISTEMA (MOMENTO ACTUAL)
══════════════════════════════════════════════════════

📄 DOCUMENTOS ACTIVOS:
   Total: ${s.totalDocs || 0}
   Subidos hoy: ${s.docsHoy || 0}
   Esta semana: ${s.docsRecientes || 0}
   Por vencer (<3d): ${s.docsPorVencer3 || 0}
   Por vencer (<7d): ${s.docsPorVencer7 || 0}
   Vencidos: ${s.docsVencidos || 0}

✅ TAREAS DE ${userInfo?.nombre?.toUpperCase()}:
   TOTAL: ${t.total || 0} tareas
   Pendientes: ${t.pendientes || 0}
   En progreso: ${t.enProgreso || 0}
   Completadas: ${t.completadas || 0}
   Canceladas: ${t.canceladas || 0}
   Vencidas: ${t.vencidas || 0} (según fecha límite)
   Para hoy: ${t.paraHoy || 0}
   % Completado: ${t.porcentajeCompletado || 0}%

🔔 **ESTADO DE TAREAS URGENTES/VENCIDAS:**
   ${alertaTareasTexto}

📋 LISTA DE TAREAS ACTIVAS (pendientes + en progreso):
${tareasStr}

🔴 TAREAS DE ALTA PRIORIDAD:
${altaPrioStr}

📄 DOCUMENTOS RECIENTES:
${docsRecStr}

🚨 DOCUMENTOS URGENTES (vencen pronto):
${docsUrgStr}

❌ DOCUMENTOS VENCIDOS:
${docsVencStr}

👥 PERSONAS: ${s.totalPersonas || 0} | CATEGORÍAS: ${s.totalCategorias || 0} | DEPARTAMENTOS: ${s.totalDeptos || 0}

${alertasGenerales.length ? '⚡ ALERTAS GENERALES:\n' + alertasGenerales.map(x=>`  ${x}`).join('\n') : '✅ Sin alertas generales'}

══════════════════════════════════════════════════════
📋 INSTRUCCIONES PARA TU RESPUESTA
══════════════════════════════════════════════════════

1. **CUANDO EL USUARIO PREGUNTE "MIS TAREAS":**
   - Si hay tareas, LÍSTALAS con sus fechas y prioridades.
   - Si alguna tarea tiene "⚠️ URGENTE" en la lista, DILO EXPLÍCITAMENTE.
   - NO DIGAS "No tienes tareas urgentes" si hay tareas con la etiqueta "⚠️ URGENTE".
   - Ejemplo correcto si hay tarea urgente: "Tienes 2 tareas. ¡ATENCIÓN! Una de ellas es URGENTE: Renovacion vence mañana."
   - Ejemplo correcto si NO hay urgentes: "Tienes 2 tareas. Sin tareas urgentes ni vencidas."

2. **PARA "TAREA MÁS URGENTE":**
   - Analiza la lista y encuentra la más prioritaria (vencida > urgente > alta prioridad)
   - Dale el nombre y detalles específicos

3. **RESPONDE EN ESPAÑOL MEXICANO, CONCISO Y DIRECTO.**

4. **ACCIONES:** si corresponde navegar o abrir modal, agrega al final:
   {"action":"navigate","target":"tareas"}
   o {"action":"openModal","target":"addTask"}

5. **NUNCA INVENTES DATOS. USA EXCLUSIVAMENTE LOS NÚMEROS Y TEXTOS DE ARRIBA.**`;
}

// ──────────────────────────────────────────────────────────────
// EXTRACTOR DE ACCIONES — MEJORADO
// ──────────────────────────────────────────────────────────────
function extractActions(text) {
    const actions = [];
    if (!text) return actions;

    // Limpiar el texto de markdown primero
    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Buscar JSON al final de líneas
        const jsonMatches = trimmed.match(/\{[^{}]*"action"\s*:\s*"[^"]+[^{}]*\}/g) || [];
        for (const m of jsonMatches) {
            try {
                const parsed = JSON.parse(m);
                if (parsed.action && !actions.find(a => a.action === parsed.action && a.target === parsed.target)) {
                    actions.push(parsed);
                    debug.action('Acción extraída:', JSON.stringify(parsed));
                }
            } catch (_) {}
        }
    }

    // Búsqueda en bloques de código
    const blockMatches = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/g) || [];
    for (const block of blockMatches) {
        const inner = block.replace(/```(?:json)?/, '').replace(/```$/, '').trim();
        try {
            const parsed = JSON.parse(inner);
            if (parsed.action) actions.push(parsed);
        } catch (_) {}
    }

    return actions;
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
        .replace(/\{[^{}]*"action"\s*:\s*"[^"]+[^{}]*\}/g, '')
        .trim()
        .replace(/\n{3,}/g, '\n\n');
}

// ──────────────────────────────────────────────────────────────
// DETECCIÓN DE INTENCIÓN v4.0 — NLP mejorado
// ──────────────────────────────────────────────────────────────
function detectIntent(message) {
    const q = message.toLowerCase().trim();

    const SECTIONS = {
        dashboard:       /\b(dashboard|inicio|principal|home|resumen general)\b/,
        documentos:      /\b(documentos?|archivos?|expedientes?|docs?)\b/,
        tareas:          /\b(tareas?|tasks?|pendientes?|actividades?)\b/,
        personas:        /\b(personas?|usuarios?|empleados?|personal|gente)\b/,
        reportes:        /\b(reportes?|informes?|estadísticas?|análisis|reporte)\b/,
        papelera:        /\b(papelera|eliminados?|trash|basura)\b/,
        notificaciones:  /\b(notificaciones?|alertas?|avisos?)\b/,
        ajustes:         /\b(ajustes?|configuraci[oó]n|settings?|preferencias?)\b/,
        soporte:         /\b(soporte|ayuda|help|asistencia|problemas?)\b/,
        categorias:      /\b(categor[ií]as?)\b/,
        departamentos:   /\b(departamentos?|áreas?|secciones?)\b/,
    };

    const NAV_TRIGGERS = /\b(ir a|ve a|navegar|abrir|mostrar|llévame|abre|switch a|cambiar a|ver sección|ir al|abre el?)\b/;
    const CREATE_TRIGGERS = /\b(crear?|nueva?|nuevo?|agregar?|añadir?|registrar?|subir|upload)\b/;
    const SEARCH_TRIGGERS = /\b(buscar?|search|encontrar?|localizar?|hallar?|dónde está)\b/;

    // Navegación
    if (NAV_TRIGGERS.test(q)) {
        for (const [section, pattern] of Object.entries(SECTIONS)) {
            if (pattern.test(q)) return { type: 'navigate', target: section };
        }
    }

    // Creación/Apertura de modales
    if (CREATE_TRIGGERS.test(q)) {
        if (/documento|archivo|expediente/.test(q)) return { type: 'openModal', target: 'upload' };
        if (/tarea|task|actividad/.test(q))         return { type: 'openModal', target: 'addTask' };
        if (/persona|usuario|empleado/.test(q))     return { type: 'openModal', target: 'addPerson' };
        if (/categor[ií]a/.test(q))                 return { type: 'openModal', target: 'addCategory' };
        if (/departamento|área/.test(q))            return { type: 'openModal', target: 'addDepartment' };
    }

    // Búsqueda
    if (SEARCH_TRIGGERS.test(q)) {
        const queryClean = q
            .replace(/buscar?|search|encontrar?|localizar?|documento|archivo/g, '')
            .trim();
        return { type: 'search', query: queryClean, section: 'documentos' };
    }

    return { type: 'query' };
}

// ──────────────────────────────────────────────────────────────
// MOTOR DE RESPUESTAS RULE-BASED v4.0 — Mucho más inteligente
// ──────────────────────────────────────────────────────────────
function ruleBasedResponse(message, ctx, userInfo) {
    const q = message.toLowerCase().trim();
    const s = ctx.stats    || {};
    const t = ctx.tareas   || {};
    const d = ctx.docs     || {};
    const p = ctx.personas || {};
    const a = ctx.analytics || {};

    const intent = detectIntent(message);

    // ── Navegación ────────────────────────────────────────────
    if (intent.type === 'navigate') {
        const labels = {
            documentos:'Documentos', tareas:'Tareas', personas:'Personas',
            dashboard:'Dashboard', reportes:'Reportes', papelera:'Papelera',
            notificaciones:'Notificaciones', ajustes:'Ajustes', soporte:'Soporte',
            categorias:'Categorías', departamentos:'Departamentos',
        };
        return {
            message: `📍 Navegando a **${labels[intent.target] || intent.target}**...`,
            suggestions: ['Ver Dashboard', 'Mis tareas', 'Documentos urgentes'],
            actions: [{ action: 'navigate', target: intent.target }],
        };
    }

    // ── Modales ───────────────────────────────────────────────
    if (intent.type === 'openModal') {
        const msgs = {
            upload:        `📤 Abriendo formulario para **subir documento**.\n\nArrastra el archivo o selecciónalo desde tu equipo.`,
            addTask:       `✅ Abriendo formulario para **crear tarea**.\n\nCompleta el título, descripción, prioridad y fecha límite.`,
            addPerson:     `👤 Abriendo formulario para **agregar persona**.`,
            addCategory:   `📁 Abriendo formulario para **crear categoría**.`,
            addDepartment: `🏢 Abriendo formulario para **crear departamento**.`,
        };
        return {
            message: msgs[intent.target] || `Abriendo ${intent.target}...`,
            suggestions: ['Ir a Tareas', 'Ver mis tareas', 'Dashboard'],
            actions: [{ action: 'openModal', target: intent.target }],
        };
    }

    // ── MIS TAREAS (respuesta mejorada) ───────────────────────
if (/mis tareas|tareas? m[ií]as?|qu[eé] tareas|tareas? pendientes|cuántas? tareas/.test(q)) {
    if (t.total === 0) {
        return {
            message: `✅ **Tus tareas:**\n\nNo encontré tareas asignadas a **${userInfo?.nombre || 'ti'}**.\n\n¿Quieres crear una nueva tarea?`,
            suggestions: ['Crear nueva tarea', 'Ir a Tareas'],
            actions: [],
        };
    }

    // Contar tareas urgentes y vencidas REALES
    const urgentesReales = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes >= 0 && x.diasRestantes <= 2) || [];
    const vencidasReales = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes < 0) || [];
    const hayUrgentes = urgentesReales.length > 0;
    const hayVencidas = vencidasReales.length > 0;

    let mensaje = `📊 **Tus tareas, ${userInfo?.nombre || 'usuario'}:**\n\n`;
    mensaje += `📌 **Resumen:** ${t.total} tarea(s) totales\n`;
    mensaje += `   • ${t.pendientes} pendientes\n`;
    mensaje += `   • ${t.enProgreso} en progreso\n`;
    mensaje += `   • ${t.completadas} completadas\n`;
    
    if (hayVencidas) {
        mensaje += `\n⚠️ **¡ALERTA!** Tienes ${vencidasReales.length} tarea(s) VENCIDA(S).\n`;
    } else if (hayUrgentes) {
        mensaje += `\n⚠️ **¡ATENCIÓN!** Tienes ${urgentesReales.length} tarea(s) URGENTE(S) (vencen en 2 días o menos).\n`;
    } else {
        mensaje += `\n✅ **Sin tareas urgentes ni vencidas.**\n`;
    }
    
    if (t.lista?.length > 0) {
        mensaje += `\n📋 **Tareas activas:**\n`;
        t.lista.slice(0, 8).forEach(x => {
            const estado = x.estado === 'pendiente' ? '⏳' : '🔄';
            let etiqueta = '';
            if (x.diasRestantes !== null && x.diasRestantes < 0) {
                etiqueta = ' 🔴 VENCIDA';
            } else if (x.diasRestantes !== null && x.diasRestantes <= 2) {
                etiqueta = ' ⚠️ URGENTE';
            } else if (x.diasRestantes !== null && x.diasRestantes <= 7) {
                etiqueta = ' 📅 Próxima';
            }
            mensaje += `   ${estado} **${x.titulo}**${etiqueta}\n`;
            mensaje += `      📅 ${x.fechaLimite || 'sin fecha'} | 🎯 ${prioridadLabel(x.prioridad)}\n`;
        });
        if (t.lista.length > 8) {
            mensaje += `\n   ... y ${t.lista.length - 8} más.\n`;
        }
    }
    
    mensaje += `\n📈 **Progreso:** ${t.porcentajeCompletado}% completado`;
    
    return {
        message: mensaje,
        suggestions: ['Ver tarea más urgente', 'Crear nueva tarea', 'Ir a Tareas'],
        actions: [],
    };
}

   // ── TAREA MÁS URGENTE ─────────────────────────────────────
if (/tarea.* m[aá]s? urgente|qu[eé] hago primero|prioridad|qu[eé] debería hacer/.test(q)) {
    if (!t.lista?.length) {
        return {
            message: `✅ No tienes tareas activas pendientes. ¡Todo al día!`,
            suggestions: ['Ver dashboard', 'Subir documento', 'Crear tarea'],
            actions: [],
        };
    }

    // Ordenar: primero vencidas, luego urgentes (diasRestantes <=2), luego alta prioridad
    const vencidas = t.lista.filter(x => x.diasRestantes !== null && x.diasRestantes < 0);
    const urgentes = t.lista.filter(x => x.diasRestantes !== null && x.diasRestantes >= 0 && x.diasRestantes <= 2);
    const alta = t.lista.filter(x => TASK_SCHEMA.highPriorities.includes(x.prioridad?.toLowerCase()));
    
    let tareaPrincipal = null;
    let razon = '';

    if (vencidas.length > 0) {
        tareaPrincipal = vencidas[0];
        razon = `🚨 **ESTA TAREA ESTÁ VENCIDA**\n   Vencida hace ${Math.abs(tareaPrincipal.diasRestantes)} día(s)`;
    } else if (urgentes.length > 0) {
        tareaPrincipal = urgentes[0];
        razon = `⚠️ **URGENTE — Vence en ${tareaPrincipal.diasRestantes} día(s)**`;
    } else if (alta.length > 0) {
        tareaPrincipal = alta[0];
        razon = `🔴 **ALTA PRIORIDAD** — Requiere atención pronto`;
    } else {
        tareaPrincipal = t.lista[0];
        razon = `📋 **Siguiente tarea recomendada**`;
    }

    return {
        message: `**${razon}**\n\n📌 **${tareaPrincipal.titulo}**\n• Estado: ${estadoLabel(tareaPrincipal.estado)}\n• Prioridad: ${prioridadLabel(tareaPrincipal.prioridad)}\n• Fecha límite: ${tareaPrincipal.fechaLimite || 'sin fecha'}\n${tareaPrincipal.diasRestantes !== null && tareaPrincipal.diasRestantes >= 0 ? `• ${tareaPrincipal.diasRestantes} día(s) restantes` : tareaPrincipal.diasRestantes !== null && tareaPrincipal.diasRestantes < 0 ? `• Vencida hace ${Math.abs(tareaPrincipal.diasRestantes)} día(s)` : ''}`,
        suggestions: ['Ver todas mis tareas', 'Ir a Tareas', 'Crear nueva tarea'],
        actions: [],
    };
}

    // ── ESTADÍSTICAS / RESUMEN ────────────────────────────────
    if (/resumen|dashboard|estado del sistema|panorama|overview/.test(q)) {
        const salud = a.saludSistema || '🟡 Sin datos';
        return {
            message: `**📊 RESUMEN EJECUTIVO — CBTIS 051**\n**${ctx.sistema?.fechaActual || 'Hoy'}**\n\n` +
                `**📄 Documentos**\n• Activos: **${s.totalDocs||0}** | Hoy: **${s.docsHoy||0}** | Este mes: **${s.docsEstesMes||0}**\n• Vencidos: **${s.docsVencidos||0}** | Por vencer (<7d): **${s.docsPorVencer7||0}**\n\n` +
                `**✅ Tareas**\n• Pendientes: **${t.pendientes||0}** | En progreso: **${t.enProgreso||0}** | Completadas: **${t.completadas||0}**\n• Vencidas: **${t.vencidas||0}** | Progreso: **${t.porcentajeCompletado||0}%**\n\n` +
                `**👥 Personal**\n• Personas: **${s.totalPersonas||0}** | Categorías: **${s.totalCategorias||0}** | Deptos: **${s.totalDeptos||0}**\n\n` +
                `**🔍 Salud del Sistema:** ${salud}` +
                (s.docsPorVencer7 > 0 || s.docsVencidos > 0 || t.vencidas > 0
                    ? `\n\n**⚡ Alertas activas:**\n${[
                        s.docsPorVencer3 > 0 ? `🚨 ${s.docsPorVencer3} doc(s) vencen en <3 días` : null,
                        s.docsPorVencer7 > 0 ? `⚠️ ${s.docsPorVencer7} doc(s) vencen en <7 días` : null,
                        s.docsVencidos   > 0 ? `❌ ${s.docsVencidos} doc(s) vencidos` : null,
                        t.vencidas       > 0 ? `⏰ ${t.vencidas} tarea(s) vencidas` : null,
                      ].filter(Boolean).join('\n')}` : '\n\n✅ **Sin alertas urgentes**'),
            suggestions: ['Documentos urgentes', 'Mis tareas', 'Ir a Reportes', 'Documentos vencidos'],
            actions: [],
        };
    }

    // ── DOCUMENTOS ────────────────────────────────────────────
    if (/cu[aá]ntos? documento|estadística.*doc|cuénta?me.*doc/.test(q)) {
        return {
            message: `📄 **Estadísticas de Documentos (excluye papelera):**\n\n` +
                `• **${s.totalDocs||0}** documentos activos totales\n` +
                `• **${s.docsHoy||0}** subidos hoy\n` +
                `• **${s.docsEstesMes||0}** este mes\n` +
                `• **${s.docsRecientes||0}** esta semana\n\n` +
                `**Vencimientos:**\n` +
                `• **${s.docsPorVencer3||0}** vencen en menos de 3 días 🚨\n` +
                `• **${s.docsPorVencer7||0}** vencen en menos de 7 días ⚠️\n` +
                `• **${s.docsPorVencer15||0}** vencen en menos de 15 días\n` +
                `• **${s.docsPorVencer30||0}** vencen en menos de 30 días\n` +
                `• **${s.docsVencidos||0}** ya vencidos ❌\n\n` +
                `**Categorías con más docs:**\n` +
                (d.porCategoria?.slice(0,3).map(x=>`• ${x.categoria}: **${x.cantidad}**`).join('\n') || '  (sin datos)'),
            suggestions: ['Documentos urgentes', 'Subir documento', 'Ir a Documentos', 'Ver vencidos'],
            actions: [],
        };
    }

    // ── DOCUMENTOS URGENTES/POR VENCER ────────────────────────
    if (/documento.* vencen|vencen.*documento|urgentes?|pr[oó]ximos.*vencer|cr[ií]ticos?/.test(q)) {
        if (!d.urgentes?.length) {
            return {
                message: `✅ **¡Excelente!** No hay documentos por vencer en los próximos 7 días.\n\nTodo está al día en cuanto a vencimientos.`,
                suggestions: ['Ver todos los documentos', 'Ir a Documentos', 'Subir documento'],
                actions: [{ action: 'navigate', target: 'documentos' }],
            };
        }
        const lista = d.urgentes.slice(0,7).map(x => {
            const emoji = x.diasRestantes <= 1 ? '🚨' : x.diasRestantes <= 3 ? '⚠️' : '📅';
            return `${emoji} **${x.nombre}** — vence en **${x.diasRestantes}** día(s) (${x.vence})`;
        }).join('\n');
        return {
            message: `🚨 **Documentos por vencer (${d.urgentes.length} total):**\n\n${lista}`,
            suggestions: ['Ir a Documentos', 'Subir documento', 'Ver vencidos'],
            actions: [{ action: 'navigate', target: 'documentos' }],
        };
    }

    // ── DOCUMENTOS VENCIDOS ───────────────────────────────────
    if (/vencidos?|expirados?|caducados?/.test(q)) {
        if (!d.vencidos?.length) {
            return {
                message: `✅ No hay documentos vencidos en el sistema.`,
                suggestions: ['Ver documentos urgentes', 'Ir a Documentos'],
                actions: [],
            };
        }
        const lista = d.vencidos.slice(0,5).map(x =>
            `❌ **${x.nombre}** — vencido hace **${x.diasVencidos}** día(s) (${x.vencimiento})`
        ).join('\n');
        return {
            message: `❌ **Documentos Vencidos (${d.vencidos.length}):**\n\n${lista}\n\nSe recomienda renovar o archivar estos documentos.`,
            suggestions: ['Ir a Documentos', 'Generar reporte de vencidos', 'Subir documento'],
            actions: [{ action: 'navigate', target: 'documentos' }],
        };
    }

    // ── ANÁLISIS DE PRODUCTIVIDAD ─────────────────────────────
    if (/productividad|rendimiento|progreso|c[oó]mo voy|an[aá]lisis/.test(q)) {
        const completadoPct = t.porcentajeCompletado || 0;
        const nivel = completadoPct >= 80 ? '🌟 Excelente' : completadoPct >= 60 ? '✅ Bueno' : completadoPct >= 40 ? '⚠️ Regular' : '🔴 Necesita mejora';
        return {
            message: `📈 **Análisis de Productividad — ${userInfo?.nombre || 'Usuario'}**\n\n` +
                `**Tareas:** ${nivel} (${completadoPct}%)\n` +
                `• Completadas: ${t.completadas||0} de ${t.total||0}\n` +
                `• En progreso: ${t.enProgreso||0}\n` +
                `• Vencidas: ${t.vencidas||0} ${t.vencidas > 0 ? '⚠️' : '✅'}\n\n` +
                `**Documentos este mes:** ${a.docsUltimos30d||0} nuevos\n` +
                `**Salud del sistema:** ${a.saludSistema||'N/A'}\n\n` +
                (t.vencidas > 0 ? `💡 **Recomendación:** Atiende las ${t.vencidas} tarea(s) vencidas primero.` :
                 t.pendientes > 3 ? `💡 **Recomendación:** Tienes ${t.pendientes} tareas pendientes. Considera priorizarlas.` :
                 `💡 **¡Vas muy bien!** Mantén el ritmo.`),
            suggestions: ['Tarea más urgente', 'Ver mis tareas', 'Ir a Reportes'],
            actions: [],
        };
    }

    // ── PERSONAS ─────────────────────────────────────────────
    if (/cu[aá]ntas? personas?|personal|empleados?|usuarios?/.test(q)) {
        return {
            message: `👥 **Personal del CBTIS 051:**\n\n• **${s.totalPersonas||0}** personas activas\n\n**Por departamento:**\n${p.porDepartamento?.slice(0,5).map(x=>`• **${x.departamento}:** ${x.cantidad}`).join('\n')||'  (sin datos)'}`,
            suggestions: ['Agregar persona', 'Ir a Personas', 'Ver departamentos'],
            actions: [],
        };
    }

    // ── SALUDOS ───────────────────────────────────────────────
    if (/^(hola|buenos\s|buenas\s|hey|buen\s|qué hay|que hay|hi$|buenas$)/.test(q)) {
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const alertCount = (s.docsPorVencer7||0) + (s.docsVencidos||0) + (t.vencidas||0);
        return {
            message: `${saludo} 👋 Soy **ARIA v1.0**, ${userInfo?.nombre || 'usuario'}.\n\n` +
                `📊 **Estado rápido:**\n• **${s.totalDocs||0}** documentos activos\n• **${t.pendientes||0}** tareas pendientes (${t.enProgreso||0} en progreso)\n• **${s.totalPersonas||0}** personas registradas\n` +
                (alertCount > 0 ? `\n🔔 **${alertCount} alertas** requieren atención.` : `\n✅ Sin alertas urgentes.`) +
                `\n\n¿En qué te ayudo hoy?`,
            suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos urgentes', 'Productividad', '¿Qué puedes hacer?'],
            actions: [],
        };
    }

    // ── AYUDA / CAPACIDADES ───────────────────────────────────
    if (/qu[eé] puedes|ayuda|comandos|help|funciones|capacidades/.test(q)) {
        return {
            message: `**🎯 ARIA v1.0 — Capacidades:**\n\n` +
                `**📊 Análisis inteligente:**\n• "Resumen del sistema"\n• "¿Cuál es mi tarea más urgente?"\n• "Análisis de productividad"\n• "¿Cómo va el sistema?"\n• "¿Cuántos documentos vencen pronto?"\n\n` +
                `**🗺️ Navegación:**\n• "Ir a [sección]"\n• "Ir a tareas/documentos/reportes..."\n\n` +
                `**⚡ Acciones rápidas:**\n• "Subir documento"\n• "Crear tarea: [título] para el [fecha]"\n• "Agregar persona"\n• "Generar reporte en Excel"\n\n` +
                `**🔍 Búsqueda:**\n• "Buscar [término] en documentos"\n\n` +
                `**📈 Estadísticas:**\n• "¿Cuántos documentos hay?"\n• "Estado de mis tareas"\n• "¿Cuántas personas hay?"`,
            suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos urgentes', 'Generar reporte'],
            actions: [],
        };
    }

    // ── FALLBACK MEJORADO ─────────────────────────────────────
    return {
        message: `🤔 Entendí: *"${message.substring(0,80)}..."*\n\nPuedo ayudarte con:\n• 📊 **Estadísticas** del sistema\n• 📋 **Mis tareas** y prioridades\n• 📄 **Documentos** urgentes o vencidos\n• 🗺️ **Navegar** a cualquier sección\n• 📈 **Análisis** de productividad`,
        suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos urgentes', '¿Qué puedes hacer?'],
        actions: [],
    };
}

// ──────────────────────────────────────────────────────────────
// SUGERENCIAS CONTEXTUALES v4.0
// ──────────────────────────────────────────────────────────────
function buildSuggestions(message, ctx) {
    const q = message.toLowerCase();
    const s = ctx.stats  || {};
    const t = ctx.tareas || {};
    const out = new Set();

    // Alertas críticas primero
    if (s.docsPorVencer3 > 0) out.add(`🚨 ${s.docsPorVencer3} doc(s) vencen en 3 días`);
    else if (s.docsPorVencer7 > 0) out.add(`⚠️ ${s.docsPorVencer7} doc(s) por vencer`);
    if (t.vencidas  > 0) out.add(`🚨 ${t.vencidas} tarea(s) vencidas`);
    if (t.paraHoy   > 0) out.add(`📅 Tareas para hoy (${t.paraHoy})`);

    // Sugerencias contextuales
    if (q.includes('documento')) {
        out.add('Documentos urgentes'); out.add('Subir documento'); out.add('Ver vencidos');
    } else if (q.includes('tarea')) {
        out.add('Tarea más urgente'); out.add('Crear nueva tarea'); out.add('Ir a Tareas');
    } else if (q.includes('persona')) {
        out.add('Agregar persona'); out.add('Ir a Personas');
    } else if (q.includes('reporte') || q.includes('análisis')) {
        out.add('Ir a Reportes'); out.add('Generar reporte Excel');
    } else {
        out.add('Resumen del sistema'); out.add('Mis tareas'); out.add('Productividad');
    }

    return [...out].slice(0, 5);
}

// ──────────────────────────────────────────────────────────────
// HISTORIAL DE CONVERSACIÓN
// ──────────────────────────────────────────────────────────────
async function getConvHistory(userId, limit = 8) {
    try {
        const rows = await Conversation.find({ usuario: userId })
            .sort({ timestamp: -1 }).limit(limit).lean();
        return rows.reverse().flatMap(r => [
            { role: 'user',      content: r.mensajeUsuario },
            { role: 'assistant', content: r.respuestaBot  },
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
            mensajeUsuario: userMsg.substring(0, 1000),
            respuestaBot:   botMsg.substring(0, 5000),
            fuente:         extra.fuente   ?? 'rule-based',
            latencia:       extra.latencia ?? null,
        });
    } catch (e) {
        debug.warn('Error guardando conversación:', e.message);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────
// VALIDACIÓN DE ACCIONES
// ──────────────────────────────────────────────────────────────
const VALID_NAV = [
    'dashboard','documentos','personas','tareas','reportes',
    'papelera','notificaciones','ajustes','soporte','categorias','departamentos',
];
const VALID_MODAL = [
    'upload','addPerson','addTask','addCategory','addDepartment','search',
];

function validateAndFixActions(actions, originalMessage) {
    if (!actions.length) {
        const intent = detectIntent(originalMessage);
        if (intent.type === 'navigate' && VALID_NAV.includes(intent.target)) {
            return [{ action: 'navigate', target: intent.target }];
        }
        if (intent.type === 'openModal' && VALID_MODAL.includes(intent.target)) {
            return [{ action: 'openModal', target: intent.target }];
        }
        if (intent.type === 'search') {
            return [{ action: 'search', query: intent.query, section: intent.section }];
        }
        return [];
    }

    return actions.filter(a => {
        if (a.action === 'navigate') {
            const ok = VALID_NAV.includes(a.target?.toLowerCase());
            if (!ok) debug.warn(`navigate target inválido: "${a.target}"`);
            return ok;
        }
        if (a.action === 'openModal') return VALID_MODAL.includes(a.target);
        if (a.action === 'search')    return !!a.query;
        return false;
    });
}

// ──────────────────────────────────────────────────────────────
// CONTROLLER PRINCIPAL v4.0
// ──────────────────────────────────────────────────────────────
class ChatbotController {

    async processMessage(req, res) {
        const t0     = Date.now();
        const userId = req.user?.id || req.user?._id;
        const { message } = req.body;

        if (!message?.trim())
            return res.status(400).json({ success: false, message: 'Mensaje vacío.' });
        if (message.trim().length > 2000)
            return res.status(400).json({ success: false, message: 'Mensaje demasiado largo (máx. 2000 caracteres).' });

        const msg = message.trim();
        debug.log(`Mensaje [${userId}]: "${msg.substring(0, 120)}"`);

        const userInfo = {
            nombre: req.user?.nombre || req.user?.usuario || req.user?.name || 'Usuario',
            rol:    req.user?.rol    || req.user?.role    || 'usuario',
            id:     String(userId),
        };

        try {
            const [ctx, history] = await Promise.all([
                buildSystemContext(userId),
                getConvHistory(userId, 8),
            ]);

            // ── Intentar con Groq primero ─────────────────────
            if (process.env.GROQ_API_KEY) {
                try {
                    const systemPrompt = buildSystemPrompt(ctx, userInfo);
                    const { text: raw } = await callGroq(systemPrompt, [
                        ...history,
                        { role: 'user', content: msg },
                    ], 1200);

                    debug.log(`Groq raw (${raw.length} chars): "${raw.substring(0, 150)}..."`);

                    let   actions  = extractActions(raw);
                          actions  = validateAndFixActions(actions, msg);
                    const cleanMsg = cleanText(raw);
                    const latency  = Date.now() - t0;
                    const suggestions = buildSuggestions(msg, ctx);

                    debug.info(`✅ Groq OK en ${latency}ms | acciones: ${JSON.stringify(actions)}`);

                    const conv = await saveConv(userId, msg, cleanMsg, { fuente: 'groq', latencia: latency });

                    return res.json({
                        success: true,
                        data: {
                            message:        cleanMsg,
                            actions,
                            suggestions,
                            source:         'groq',
                            latency,
                            conversationId: conv?._id,
                            debug: process.env.NODE_ENV === 'development' ? {
                                actionsRaw:    extractActions(raw).length,
                                actionsFixed:  actions.length,
                                intentDetected: detectIntent(msg),
                                taskSchema:    ctx.tareas?._schema,
                                stats:         ctx.stats,
                            } : undefined,
                        },
                    });

                } catch (groqErr) {
                    debug.warn(`Groq falló (${groqErr.message}), usando fallback inteligente`);
                }
            }

            // ── Fallback rule-based ───────────────────────────
            const fb      = ruleBasedResponse(msg, ctx, userInfo);
            const latency = Date.now() - t0;
            const cleanMsg= cleanText(fb.message ?? '');
            let   actions = fb.actions ?? [];
                  actions = validateAndFixActions(actions, msg);

            const conv = await saveConv(userId, msg, cleanMsg, { fuente: 'rule-based', latencia: latency });

            debug.info(`✅ Fallback OK en ${latency}ms`);

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
            debug.error('Error crítico en processMessage:', err);
            return res.status(500).json({
                success: false,
                message: 'Error procesando tu consulta. Intenta de nuevo.',
                debug: process.env.NODE_ENV === 'development' ? { error: err.message } : undefined,
            });
        }
    }

    async getSystemStats(req, res) {
        const t0     = Date.now();
        const userId = req.user?.id || req.user?._id;
        try {
            const ctx = await buildSystemContext(userId);
            debug.info(`getSystemStats en ${Date.now()-t0}ms`);
            return res.json({
                success: true,
                data: {
                    stats:                    ctx.stats,
                    tareas:                   ctx.tareas,
                    analytics:                ctx.analytics,
                    sistema:                  ctx.sistema,
                    documentosUrgentes:       ctx.docs.urgentes,
                    ultimosDocumentos:        ctx.docs.recientes,
                    documentosVencidos:       ctx.docs.vencidos,
                    documentosPorCategoria:   ctx.docs.porCategoria,
                    personas:                 ctx.personas,
                    personasPorDepartamento:  ctx.personas.porDepartamento,
                    categorias:               ctx.categorias,
                    departamentos:            ctx.departamentos,
                    // Compatibilidad hacia atrás
                    totalDocs:       ctx.stats.totalDocs,
                    totalPersonas:   ctx.stats.totalPersonas,
                    docsPorVencer7:  ctx.stats.docsPorVencer7,
                    docsVencidos:    ctx.stats.docsVencidos,
                },
            });
        } catch (err) {
            debug.error('getSystemStats error:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
        }
    }

    async getHistory(req, res) {
        const userId = req.user?.id || req.user?._id;
        const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
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
                    latency:     r.latencia,
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

    // ─── NUEVO: Diagnóstico del sistema ───────────────────────
    async getDiagnostics(req, res) {
        const userId = req.user?.id || req.user?._id;
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).json({ success: false, message: 'Solo disponible en desarrollo.' });
        }
        try {
            // Verificar query real contra la BD para confirmar que funciona
            const { query } = await buildTaskQuery(userId);
            const totalTasks         = await Task.countDocuments({});
            const totalTasksForUser  = await Task.countDocuments(query);
            const sample             = await Task.findOne({}).lean();
            const sampleFields       = sample ? Object.keys(sample).sort() : [];

            // Desglose por estado para el usuario actual
            const byStatus = {};
            for (const st of TASK_SCHEMA.statuses) {
                byStatus[st] = await Task.countDocuments({ ...query, estado: st });
            }

            return res.json({
                success: true,
                data: {
                    confirmedSchema:    TASK_SCHEMA,
                    userId:             String(userId),
                    totalTasksInDB:     totalTasks,
                    tasksForThisUser:   totalTasksForUser,
                    tasksByStatus:      byStatus,
                    sampleDocFields:    sampleFields,
                    env:                process.env.NODE_ENV,
                    groqEnabled:        !!process.env.GROQ_API_KEY,
                    queryUsed:          query,
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}

export default new ChatbotController();