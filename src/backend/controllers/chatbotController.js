// ============================================================
// chatbotController.js — Motor IA ARIA v3.0
// Gestacks — NLP avanzado, conversación natural, validaciones
// ============================================================

import mongoose from 'mongoose';
import Document from '../models/Document.js';
import Task from '../models/Task.js';
import Category from '../models/Category.js';
import Person from '../models/Person.js';
import Conversation from '../models/Conversation.js';
import Department from '../models/Department.js';
import SystemState from '../models/SystemState.js'; // 🆕 Para modo oscuro y ajustes

// ──────────────────────────────────────────────────────────────
// DEBUG LOGGER
// ──────────────────────────────────────────────────────────────
const debug = {
    log: (...a) => console.log('\x1b[36m🤖 [ARIA v3]\x1b[0m', ...a),
    warn: (...a) => console.warn('\x1b[33m⚠️  [ARIA v3]\x1b[0m', ...a),
    error: (...a) => console.error('\x1b[31m❌ [ARIA v3]\x1b[0m', ...a),
    info: (...a) => console.info('\x1b[32mℹ️  [ARIA v3]\x1b[0m', ...a),
    action: (...a) => console.log('\x1b[35m🎯 [ARIA-ACTION]\x1b[0m', ...a),
    db: (...a) => console.log('\x1b[34m🗄️  [ARIA-DB]\x1b[0m', ...a),
    nlp: (...a) => console.log('\x1b[93m🧠 [ARIA-NLP]\x1b[0m', ...a),
    perf: (...a) => console.log('\x1b[96m⚡ [ARIA-PERF]\x1b[0m', ...a),
    conv: (...a) => console.log('\x1b[95m💬 [ARIA-CONV]\x1b[0m', ...a),
};

// ──────────────────────────────────────────────────────────────
// CLIENTE GROQ — con retry y backoff
// ──────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_TIMEOUT = 25000;

async function callGroq(systemPrompt, messages, maxTokens = 1200, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);
        try {
            const res = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    max_tokens: maxTokens,
                    temperature: 0.5,
                    top_p: 0.9,
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
                debug.warn(`Rate limit Groq, esperando ${wait}ms (intento ${attempt + 1})`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Groq HTTP ${res.status}: ${err.substring(0, 200)}`);
            }
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content ?? '';
            const usage = data.usage ?? {};
            debug.info(`Groq OK (intento ${attempt + 1}) — in=${usage.prompt_tokens} out=${usage.completion_tokens}`);
            return { text, usage };
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                if (attempt < retries) { debug.warn('Groq timeout, reintentando...'); continue; }
                throw new Error('Groq timeout (25s)');
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
// SCHEMA DE TASK (confirmado del modelo)
// ──────────────────────────────────────────────────────────────
const TASK_SCHEMA = {
    assignedField: 'asignado_a',
    createdByField: 'creado_por',
    dueDateField: 'fecha_limite',
    completedField: 'fecha_completada',
    statusField: 'estado',
    priorityField: 'prioridad',
    titleField: 'titulo',
    statuses: ['pendiente', 'en-progreso', 'completada', 'cancelada'],
    priorities: ['baja', 'media', 'alta', 'critica'],
    highPriorities: ['alta', 'critica'],
};

// ──────────────────────────────────────────────────────────────
// QUERY DE TAREAS
// ──────────────────────────────────────────────────────────────
async function buildTaskQuery(userId, schoolId = null) {
    let userObjectId = userId;
    try {
        if (typeof userId === 'string' && /^[a-f\d]{24}$/i.test(userId)) {
            const { default: mongoose } = await import('mongoose');
            userObjectId = new mongoose.Types.ObjectId(userId);
        }
    } catch (_) {}
    const query = {
        activo: true,
        $or: [
            { asignado_a: userObjectId },
            { asignado_a: String(userId) },
            { creado_por: userObjectId },
            { creado_por: String(userId) },
        ],
    };
    if (schoolId) query.schoolId = schoolId;
    return { query, schema: TASK_SCHEMA };
}

// ──────────────────────────────────────────────────────────────
// CONTEXTO DEL SISTEMA (incluye carpetas/subcarpetas)
// ──────────────────────────────────────────────────────────────
async function buildSystemContext(userId, schoolId = null) {
    const t0 = Date.now();
    const ctx = {
        stats: {}, tareas: {}, docs: {},
        personas: {}, categorias: [], categoriasObj: [], // 🆕 categoriasObj con estructura completa
        departamentos: [], analytics: {}, sistema: {},
    };
    try {
        const ahora = new Date();
        const en3d = new Date(ahora.getTime() + 3 * 86400000);
        const en7d = new Date(ahora.getTime() + 7 * 86400000);
        const en15d = new Date(ahora.getTime() + 15 * 86400000);
        const en30d = new Date(ahora.getTime() + 30 * 86400000);
        const hace7d = new Date(ahora.getTime() - 7 * 86400000);
        const hace30d = new Date(ahora.getTime() - 30 * 86400000);
        const hoy0 = new Date(ahora); hoy0.setHours(0, 0, 0, 0);
        const hoy23 = new Date(ahora); hoy23.setHours(23, 59, 59, 999);

        const docQuery = { activo: true, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };
        const personFilter = { activo: true };
        const catFilter = { activo: true };
        const deptFilter = { activo: true };
        if (schoolId) {
            docQuery.schoolId = schoolId;
            personFilter.schoolId = schoolId;
            catFilter.schoolId = schoolId;
            deptFilter.schoolId = schoolId;
        }

        // Estadísticas generales
        const [
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer3, docsPorVencer7, docsPorVencer15, docsPorVencer30,
            docsVencidos, docsRecientes, docsHoy, docsEstesMes,
        ] = await Promise.all([
            Document.countDocuments(docQuery),
            Person.countDocuments(personFilter),
            Category.countDocuments(catFilter),
            Department.countDocuments(deptFilter),
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

        // Tareas
        try {
            const { query: tareasQuery, schema } = await buildTaskQuery(userId, schoolId);
            const [tPend, tProg, tComp, tCancel, tVenc, tHoy, tSem, tTotal] = await Promise.all([
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'pendiente' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'en-progreso' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'completada' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: 'cancelada' }),
                Task.countDocuments({ ...tareasQuery, [schema.statusField]: { $in: ['pendiente', 'en-progreso'] }, [schema.dueDateField]: { $lt: ahora, $ne: null } }),
                Task.countDocuments({ ...tareasQuery, [schema.dueDateField]: { $gte: hoy0, $lte: hoy23 } }),
                Task.countDocuments({ ...tareasQuery, [schema.dueDateField]: { $gte: ahora, $lte: en7d } }),
                Task.countDocuments(tareasQuery),
            ]);
            const lista = await Task.find({ ...tareasQuery, [schema.statusField]: { $in: ['pendiente', 'en-progreso'] } })
                .sort({ [schema.priorityField]: -1, [schema.dueDateField]: 1 }).limit(10).lean();
            const completadas = await Task.find({ ...tareasQuery, [schema.statusField]: 'completada' })
                .sort({ [schema.completedField]: -1 }).limit(5).lean();
            const altaPrioridad = await Task.find({ ...tareasQuery, [schema.priorityField]: { $in: TASK_SCHEMA.highPriorities }, [schema.statusField]: { $in: ['pendiente', 'en-progreso'] } })
                .sort({ [schema.dueDateField]: 1 }).limit(5).lean();

            ctx.tareas = {
                total: tTotal, pendientes: tPend, enProgreso: tProg,
                completadas: tComp, canceladas: tCancel,
                vencidas: tVenc, paraHoy: tHoy, paraSemana: tSem,
                porcentajeCompletado: tTotal > 0 ? Math.round((tComp / tTotal) * 100) : 0,
                lista: lista.map(t => ({
                    id: String(t._id),
                    titulo: t[schema.titleField] || t.titulo || 'Sin título',
                    descripcion: t.descripcion || '',
                    prioridad: t[schema.priorityField] || 'media',
                    estado: t[schema.statusField] || 'pendiente',
                    fechaLimite: t[schema.dueDateField] ? new Date(t[schema.dueDateField]).toLocaleDateString('es-MX') : null,
                    diasRestantes: t[schema.dueDateField] ? Math.ceil((new Date(t[schema.dueDateField]) - ahora) / 86400000) : null,
                })),
                altaPrioridad: altaPrioridad.map(t => ({
                    titulo: t[schema.titleField] || t.titulo || 'Sin título',
                    prioridad: t[schema.priorityField] || 'alta',
                    fechaLimite: t[schema.dueDateField] ? new Date(t[schema.dueDateField]).toLocaleDateString('es-MX') : null,
                })),
                completadasRecientes: completadas.map(t => ({
                    titulo: t[schema.titleField] || t.titulo || 'Sin título',
                    fechaCompletada: t[schema.completedField] ? new Date(t[schema.completedField]).toLocaleDateString('es-MX') : null,
                })),
                _schema: schema,
            };
        } catch (e) {
            debug.error('Error cargando tareas:', e.message);
            ctx.tareas = { total: 0, pendientes: 0, enProgreso: 0, completadas: 0, canceladas: 0, vencidas: 0, paraHoy: 0, paraSemana: 0, porcentajeCompletado: 0, lista: [], altaPrioridad: [], completadasRecientes: [], _error: e.message };
        }

        // Documentos
        const [recientes, urgentes, vencidos, porCategoria, sinCategoria, aprobados] = await Promise.all([
            Document.find(docQuery).sort({ fecha_subida: -1 }).limit(10).populate('categoria', 'nombre').lean(),
            Document.find({ ...docQuery, fecha_vencimiento: { $gte: ahora, $lte: en7d } }).sort({ fecha_vencimiento: 1 }).limit(10).lean(),
            Document.find({ ...docQuery, fecha_vencimiento: { $lt: ahora } }).sort({ fecha_vencimiento: -1 }).limit(10).lean(),
            Document.aggregate([{ $match: docQuery }, { $group: { _id: '$categoria', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
            Document.countDocuments({ ...docQuery, categoria: { $exists: false } }),
            Document.countDocuments({ ...docQuery, aprobado: true }).catch(() => 0),
        ]);
        ctx.docs = {
            recientes: recientes.map(d => ({
                nombre: d.nombre_original || d.nombre || 'Sin nombre',
                categoria: d.categoria?.nombre || 'Sin categoría',
                fecha: new Date(d.fecha_subida).toLocaleDateString('es-MX'),
                vencimiento: d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-MX') : null,
            })),
            urgentes: urgentes.map(d => ({
                nombre: d.nombre_original || d.nombre || 'Sin nombre',
                vence: new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasRestantes: Math.ceil((new Date(d.fecha_vencimiento) - ahora) / 86400000),
            })),
            vencidos: vencidos.map(d => ({
                nombre: d.nombre_original || d.nombre || 'Sin nombre',
                vencimiento: new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasVencidos: Math.ceil((ahora - new Date(d.fecha_vencimiento)) / 86400000),
            })),
            porCategoria: porCategoria.map(c => ({ categoria: c._id || 'Sin categoría', cantidad: c.count })),
            sinCategoria, aprobados,
        };

        // Personas
        const [personas, porDepto] = await Promise.all([
            Person.find(personFilter).limit(30).lean(),
            Person.aggregate([{ $match: personFilter }, { $group: { _id: '$departamento', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        ]);
        ctx.personas = {
            total: totalPersonas,
            lista: personas.map(p => ({ nombre: p.nombre, email: p.email, departamento: p.departamento, puesto: p.puesto, telefono: p.telefono })),
            porDepartamento: porDepto.map(d => ({ departamento: d._id || 'Sin departamento', cantidad: d.count })),
        };

        // 🆕 Categorías con estructura completa (para carpetas/subcarpetas)
        const [cats, deptos] = await Promise.all([
            Category.find(catFilter).lean(),
            Department.find(deptFilter).lean(),
        ]);
        
        // Estructura plana de nombres para compatibilidad
        ctx.categorias = cats.map(c => c.nombre);
        
        // 🆕 Estructura completa con IDs y parent_id para carpetas
        ctx.categoriasObj = cats.map(c => ({
            id: c._id,
            nombre: c.nombre,
            descripcion: c.descripcion || '',
            color: c.color || '#4f46e5',
            icon: c.icon || 'folder',
            parent_id: c.parent_id || null,
        }));
        
        ctx.departamentos = deptos.map(d => d.nombre);

        // Analytics
        try {
            const [docsLastMonth, convCount] = await Promise.all([
                Document.countDocuments({ ...docQuery, fecha_subida: { $gte: hace30d } }),
                Conversation.countDocuments({ usuario: userId }).catch(() => 0),
            ]);
            ctx.analytics = {
                docsUltimos30d: docsLastMonth,
                interaccionesIA: convCount,
                tasaCompletado: ctx.tareas.porcentajeCompletado,
                saludSistema: _calcularSaludSistema(ctx.stats, ctx.tareas),
            };
        } catch (e) {
            debug.warn('Analytics parciales:', e.message);
            ctx.analytics = { saludSistema: 'desconocido' };
        }

        // Info del sistema
        ctx.sistema = {
            fechaActual: new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            horaActual: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            año: new Date().getFullYear(),
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
function prioridadLabel(p) {
    const MAP = { baja: '🟢 Baja', media: '🟡 Media', alta: '🟠 Alta', critica: '🔴 Crítica' };
    return MAP[p?.toLowerCase()] || (p || 'Media');
}
function estadoLabel(e) {
    const MAP = { 'pendiente': '⏳ Pendiente', 'en-progreso': '🔄 En progreso', 'completada': '✅ Completada', 'cancelada': '❌ Cancelada' };
    return MAP[e] || (e || 'Pendiente');
}
function _calcularSaludSistema(stats, tareas) {
    let score = 100;
    if (stats.docsVencidos > 0) score -= Math.min(stats.docsVencidos * 5, 30);
    if (stats.docsPorVencer7 > 0) score -= Math.min(stats.docsPorVencer7 * 2, 15);
    if (tareas.vencidas > 0) score -= Math.min(tareas.vencidas * 3, 20);
    const nivel = score >= 80 ? '🟢 Excelente' : score >= 60 ? '🟡 Regular' : '🔴 Crítico';
    return `${nivel} (${score}/100)`;
}

// ──────────────────────────────────────────────────────────────
// 🆕 VALIDACIONES POR SECCIÓN
// ──────────────────────────────────────────────────────────────

/** Valida campos obligatorios para crear una persona */
function validarPersona(data) {
    const errores = [];
    if (!data.nombre || data.nombre.trim().length < 2) errores.push('El nombre es obligatorio (mín. 2 caracteres)');
    if (!data.email || !data.email.includes('@')) errores.push('El email es obligatorio y debe ser válido');
    if (data.telefono && !/^\d{8,10}$/.test(data.telefono.replace(/[+\s\-()]/g, ''))) errores.push('El teléfono debe tener entre 8 y 10 dígitos');
    if (data.nombre && data.nombre.trim().length > 100) errores.push('El nombre no puede exceder 100 caracteres');
    return { valido: errores.length === 0, errores };
}

/** Valida campos para crear/editar una categoría/carpeta */
function validarCategoria(data) {
    const errores = [];
    if (!data.nombre || data.nombre.trim().length < 2) errores.push('El nombre de la carpeta es obligatorio (mín. 2 caracteres)');
    if (data.nombre && data.nombre.trim().length > 50) errores.push('El nombre no puede exceder 50 caracteres');
    return { valido: errores.length === 0, errores };
}

/** Valida campos para crear una subcarpeta */
function validarSubcategoria(data) {
    const errores = [];
    if (!data.nombre || data.nombre.trim().length < 2) errores.push('El nombre de la subcarpeta es obligatorio');
    if (!data.parent_id) errores.push('Debes especificar la carpeta padre (parent_id)');
    if (data.parent_id && !mongoose.Types.ObjectId.isValid(data.parent_id)) errores.push('El ID de la carpeta padre no es válido');
    return { valido: errores.length === 0, errores };
}

/** Valida campos para crear una tarea */
function validarTarea(data) {
    const errores = [];
    if (!data.titulo || data.titulo.trim().length < 2) errores.push('El título es obligatorio (mín. 2 caracteres)');
    if (data.titulo && data.titulo.trim().length > 200) errores.push('El título no puede exceder 200 caracteres');
    if (data.fecha_limite && isNaN(new Date(data.fecha_limite).getTime())) errores.push('La fecha límite no es válida');
    return { valido: errores.length === 0, errores };
}

// ──────────────────────────────────────────────────────────────
// SYSTEM PROMPT v3.0 — Conversación natural + datos reales
// ──────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx, userInfo) {
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const d = ctx.docs || {};
    const a = ctx.analytics || {};
    const si = ctx.sistema || {};

    const tareasVencidas = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes < 0) || [];
    const tareasUrgentes = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes >= 0 && x.diasRestantes <= 2) || [];
    let alertaTareasTexto = tareasVencidas.length > 0 ? `🚨 ${tareasVencidas.length} tarea(s) VENCIDA(S)`
        : tareasUrgentes.length > 0 ? `⚠️ ${tareasUrgentes.length} tarea(s) URGENTE(S) (≤2 días)` : '✅ Sin tareas urgentes';

    const tareasStr = t.lista?.length
        ? t.lista.map(x => {
            let etiqueta = x.diasRestantes !== null && x.diasRestantes < 0 ? ' 🔴 VENCIDA'
                : x.diasRestantes !== null && x.diasRestantes <= 2 ? ' ⚠️ URGENTE'
                : x.diasRestantes !== null && x.diasRestantes <= 7 ? ' 📅 Próxima' : '';
            return `  • [${(x.prioridad || 'media').toUpperCase()}] ${x.titulo}${etiqueta} → ${x.fechaLimite || 'sin fecha'} (${x.estado})`;
        }).join('\n') : '  • (sin tareas activas)';

    const docsUrgStr = d.urgentes?.length
        ? d.urgentes.slice(0, 5).map(x => `  • ${x.nombre} — ⚠️ ${x.diasRestantes}d (${x.vence})`).join('\n') : '  • (ninguno)';

    // 🆕 Lista de carpetas disponibles
    const carpetasStr = ctx.categoriasObj?.length
        ? ctx.categoriasObj.filter(c => !c.parent_id).map(c => `  • 📁 ${c.nombre}`).join('\n')
        : '  • (sin carpetas)';

    return `Eres ARIA v1.0, asistente IA del Sistema de Gestión Documental de Gestacks.

════════════════════════════════════════════
🧠 PERSONALIDAD Y MODO DE RESPUESTA
════════════════════════════════════════════

Eres amigable, profesional y puedes mantener conversaciones naturales.
Respondes en ESPAÑOL MEXICANO, de forma concisa y clara.

TIPOS DE INTERACCIÓN:
1. CONVERSACIÓN NATURAL: Si el usuario saluda, pregunta quién eres, cómo estás, te da las gracias, etc. → Responde de forma natural y amigable.
2. CONSULTAS DE DATOS: Si pregunta sobre documentos, tareas, personas → USA los datos reales abajo.
3. COMANDOS: Si dice "navega a X", "ir a X", "crea una carpeta...", "sube un documento..." → indica la acción con JSON.

⚠️ REGLA CRÍTICA: USA EXACTAMENTE LOS DATOS REALES. NUNCA INVENTES NÚMEROS.
⚠️ REGLA CRÍTICA: Si preguntan "¿quién eres?" → Responde que eres ARIA v1.0, asistente de Gestacks.
⚠️ REGLA CRÍTICA: NO DIGAS que no puedes tener conversaciones. SÍ PUEDES.

Usuario: ${userInfo?.nombre || 'Usuario'} | Rol: ${userInfo?.rol || 'usuario'}
Fecha/Hora: ${si.fechaActual} — ${si.horaActual}

════════════════════════════════════════════
📊 DATOS REALES DEL SISTEMA
════════════════════════════════════════════

📄 DOCUMENTOS: ${s.totalDocs || 0} activos | ${s.docsHoy || 0} hoy | Vencidos: ${s.docsVencidos || 0}
   Por vencer (<3d): ${s.docsPorVencer3 || 0} | (<7d): ${s.docsPorVencer7 || 0}

✅ TAREAS DE ${userInfo?.nombre?.toUpperCase() || 'USUARIO'}:
   Total: ${t.total || 0} | Pendientes: ${t.pendientes || 0} | En progreso: ${t.enProgreso || 0}
   Completadas: ${t.completadas || 0} | Vencidas: ${t.vencidas || 0}
   Estado urgente: ${alertaTareasTexto}

📋 LISTA ACTIVA:
${tareasStr}

🚨 DOCS URGENTES:
${docsUrgStr}

📁 CARPETAS DISPONIBLES:
${carpetasStr}

👥 PERSONAS: ${s.totalPersonas || 0} | CATEGORÍAS: ${s.totalCategorias || 0} | DEPARTAMENTOS: ${s.totalDeptos || 0}

Salud del sistema: ${a.saludSistema || 'N/A'} | Progreso tareas: ${t.porcentajeCompletado || 0}%

════════════════════════════════════════════
📋 INSTRUCCIONES DE RESPUESTA
════════════════════════════════════════════

• RESPONDE SIEMPRE EN ESPAÑOL MEXICANO
• Sé conciso — no más de 10 líneas salvo que pidan detalles
• Para navegación, incluye JSON al final: {"action":"navigate","target":"SECCION"}
  Secciones: dashboard, documentos, personas, tareas, reportes, papelera, notificaciones, ajustes, soporte, categorias, departamentos
• Para abrir modal: {"action":"openModal","target":"MODAL"}
  Modales: upload, addPerson, addTask, addCategory, addDepartment
• Para crear carpeta: {"action":"createCategory","nombre":"NOMBRE","descripcion":"...","color":"#hex","icon":"folder"}
• Para crear subcarpeta: {"action":"createSubcategory","nombre":"NOMBRE","parent_id":"ID_PADRE"}
• Para modo oscuro: {"action":"setTheme","theme":"dark"} o {"action":"setTheme","theme":"light"}
• NUNCA inventes datos — solo usa los números de arriba
• Si el usuario tiene tareas con etiqueta 🔴 VENCIDA, MENCIÓNALO
• Puedes tener conversación natural: saludar, bromear levemente, ser empático`;
}

// ──────────────────────────────────────────────────────────────
// 🆕 RESPUESTAS CONVERSACIONALES NATURALES
// ──────────────────────────────────────────────────────────────
const CONVERSATIONAL_PATTERNS = [
    { test: /^(hola|buenos?|buenas?|hey|hi|qué hay|que hay|saludos?)(\s.*)?$/i, type: 'greeting' },
    { test: /\b(quién eres|que eres|cuál es tu nombre|cómo te llamas|presentat[e]|quién soy|quién habla)/i, type: 'identity' },
    { test: /\b(cómo estás|como estas|cómo te encuentras|qué tal estás|te encuentras bien)/i, type: 'howAreYou' },
    { test: /^(gracias|muchas gracias|te lo agradezco|thanks|te agradezco|mil gracias)(\s.*)?$/i, type: 'thanks' },
    { test: /^(adiós|adios|hasta luego|bye|chao|nos vemos|hasta pronto|me voy)(\s.*)?$/i, type: 'goodbye' },
    { test: /\b(qué puedes|que puedes|qué haces|para qué sirves|cuáles son tus funciones|tus capacidades|qué sabes hacer)/i, type: 'capabilities' },
    { test: /\b(me ayudas|puedes ayudar|necesito ayuda|necesito apoyo|ayúdame)\b/i, type: 'helpRequest' },
];

function detectNaturalConversation(message) {
    const q = message.trim();
    for (const p of CONVERSATIONAL_PATTERNS) {
        if (p.test.test(q)) {
            debug.conv(`Conversación natural detectada: tipo=${p.type}`);
            return { detected: true, type: p.type };
        }
    }
    return { detected: false };
}

function buildConversationalResponse(type, ctx, userInfo) {
    const nombre = userInfo?.nombre || 'usuario';
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const hora = new Date().getHours();
    const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

    switch (type) {
        case 'greeting': {
            const alertCount = (s.docsPorVencer7 || 0) + (s.docsVencidos || 0) + (t.vencidas || 0);
            return {
                message: `${saludo} 👋 ¡Hola, **${nombre}**! Soy **ARIA v1.0**, tu asistente inteligente.\n\n📊 **Estado rápido:**\n• **${s.totalDocs || 0}** documentos | **${t.pendientes || 0}** tareas pendientes\n${alertCount > 0 ? `\n🔔 Tienes **${alertCount} alertas** que requieren atención.` : '\n✅ Todo en orden, sin alertas urgentes.'}\n\n¿En qué te puedo ayudar hoy?`,
                suggestions: ['Mis tareas', 'Resumen del sistema', 'Documentos urgentes', '¿Qué puedes hacer?'],
            };
        }
        case 'identity':
            return {
                message: `¡Claro! Soy **ARIA v1.0** 🤖 — Asistente de Recursos e Inteligencia Administrativa del **Gestacks**.\n\nEstoy aquí para ayudarte con:\n• 📋 Gestión de tareas y documentos\n• 📊 Estadísticas y reportes del sistema\n• 🗺️ Navegación rápida entre secciones\n• 👤 Alta y gestión de personas\n• 📁 Creación de carpetas y subcarpetas\n• ⚙️ Ajustes de la interfaz\n\n...y también puedo tener una conversación normal 😊 ¿En qué te ayudo?`,
                suggestions: ['¿Qué puedes hacer?', 'Mis tareas', 'Resumen del sistema'],
            };
        case 'howAreYou':
            return {
                message: `¡Muy bien, gracias por preguntar! 😊 Siempre lista para ayudarte.\n\n¿Y tú cómo estás, **${nombre}**? ¿Hay algo en lo que pueda asistirte hoy?`,
                suggestions: ['Mis tareas', 'Documentos urgentes', 'Resumen del sistema'],
            };
        case 'thanks':
            return {
                message: `¡Con mucho gusto, **${nombre}**! 😊 Para eso estoy.\n\n¿Hay algo más en lo que pueda ayudarte?`,
                suggestions: ['Mis tareas', 'Dashboard', 'Crear tarea'],
            };
        case 'goodbye':
            return {
                message: `¡Hasta pronto, **${nombre}**! 👋 Fue un placer ayudarte.\n\nEstaré aquí cuando me necesites. ¡Que tengas un excelente día!`,
                suggestions: ['Dashboard', 'Mis tareas'],
            };
        case 'capabilities':
            return {
                message: `🎯 **Mis capacidades:**\n\n**📊 Análisis:** Resumen del sistema, mis tareas, documentos urgentes, productividad\n\n**🗺️ Navegación:** "Ir a tareas", "Ve a documentos", "Abre reportes"\n\n**⚡ Acciones rápidas:**\n• "Crea una tarea: [título] para el [fecha]"\n• "Crea una persona llamada [nombre]"\n• "Crea una carpeta llamada [nombre]"\n• "Genera reporte en Excel"\n• "Activa el modo oscuro"\n\n**🔍 Consultas:** "¿Cuántos documentos hay?", "¿Mis tareas vencidas?"\n\n**💬 Conversación:** También puedo charlar contigo 😊`,
                suggestions: ['Resumen del sistema', 'Mis tareas', 'Ir a Documentos'],
            };
        case 'helpRequest':
            return {
                message: `¡Por supuesto, **${nombre}**! Aquí estoy para ayudarte 🤝\n\nDime qué necesitas. Puedo ayudarte con:\n• Tareas y documentos del sistema\n• Navegar a cualquier sección\n• Crear o gestionar registros\n• Generar reportes\n• Ajustes de la interfaz\n\n¿Qué necesitas?`,
                suggestions: ['Mis tareas', 'Documentos urgentes', 'Ir a Dashboard', 'Crear tarea'],
            };
        default:
            return { message: `Hola **${nombre}**! ¿En qué puedo ayudarte?`, suggestions: ['Mis tareas', 'Resumen del sistema'] };
    }
}

// ──────────────────────────────────────────────────────────────
// EXTRACTOR DE ACCIONES
// ──────────────────────────────────────────────────────────────
function extractActions(text) {
    const actions = [];
    if (!text) return actions;
    const jsonMatches = text.match(/\{[^{}]*"action"\s*:\s*"[^"]+"[^{}]*\}/g) || [];
    for (const m of jsonMatches) {
        try {
            const parsed = JSON.parse(m);
            if (parsed.action && !actions.find(a => a.action === parsed.action && a.target === parsed.target)) {
                actions.push(parsed);
            }
        } catch (_) {}
    }
    return actions;
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '')
        .replace(/\{[^{}]*"action"\s*:\s*"[^"]+"[^{}]*\}/g, '')
        .trim()
        .replace(/\n{3,}/g, '\n\n');
}

// ──────────────────────────────────────────────────────────────
// 🆕 DETECCIÓN DE INTENCIÓN MEJORADA
// ──────────────────────────────────────────────────────────────
function detectIntent(message) {
    const q = message.toLowerCase().trim();

    const SECTIONS = {
        dashboard: /\b(dashboard|inicio|principal|home|resumen general)\b/,
        documentos: /\b(documentos?|archivos?|expedientes?|docs?)\b/,
        tareas: /\b(tareas?|tasks?|pendientes?|actividades?)\b/,
        personas: /\b(personas?|usuarios?|empleados?|personal|gente)\b/,
        reportes: /\b(reportes?|informes?|estadísticas?|análisis)\b/,
        papelera: /\b(papelera|eliminados?|trash|basura)\b/,
        notificaciones: /\b(notificaciones?|alertas?|avisos?)\b/,
        ajustes: /\b(ajustes?|configuraci[oó]n|settings?)\b/,
        soporte: /\b(soporte|ayuda|help|asistencia)\b/,
        categorias: /\b(categor[ií]as?|carpetas?)\b/,
        departamentos: /\b(departamentos?|áreas?)\b/,
    };

    const NAV_TRIGGERS = /\b(ir a|ve a|navegar|abrir|mostrar|llévame|switch a|cambiar a)\b/i;
    const CREATE_TRIGGERS = /\b(crear?|nueva?|nuevo?|agregar?|añadir?|registrar?|subir|upload)\b/i;
    const SEARCH_TRIGGERS = /\b(buscar?|search|encontrar?|localizar?|hallar?|dónde está)\b/i;

    // 🆕 Detección específica de crear carpeta/subcarpeta
    if (CREATE_TRIGGERS.test(q) && /\b(carpeta|categor[ií]a|folder)\b/i.test(q)) {
        // Verificar si es subcarpeta
        if (/\b(subcarpeta|subcategor[ií]a|sub-carpeta|dentro de)\b/i.test(q)) {
            return { type: 'createSubcategory', detected: true };
        }
        return { type: 'createCategory', detected: true };
    }

    // Navegación
    if (NAV_TRIGGERS.test(q)) {
        for (const [section, pattern] of Object.entries(SECTIONS)) {
            if (pattern.test(q)) return { type: 'navigate', target: section };
        }
    }

    // Creación/Apertura de modales
    if (CREATE_TRIGGERS.test(q)) {
        if (/documento|archivo|expediente/.test(q)) return { type: 'openModal', target: 'upload' };
        if (/tarea|task|actividad/.test(q)) return { type: 'openModal', target: 'addTask' };
        if (/persona|usuario|empleado/.test(q)) return { type: 'openModal', target: 'addPerson' };
        if (/categor[ií]a|carpeta/.test(q)) return { type: 'openModal', target: 'addCategory' };
        if (/departamento|área/.test(q)) return { type: 'openModal', target: 'addDepartment' };
    }

    // Búsqueda
    if (SEARCH_TRIGGERS.test(q)) {
        const queryClean = q.replace(/buscar?|search|encontrar?|localizar?|documento|archivo/g, '').trim();
        return { type: 'search', query: queryClean, section: 'documentos' };
    }

    // 🆕 Detección de tema oscuro/claro
    if (/\b(tema|modo)\s+(oscuro|dark|noche|claro|light|d[ií]a)\b|\b(oscuro|dark|claro|light)\s+(tema|modo)\b|\b(activar?|poner?|cambiar?\s+a)\s+(tema|modo)\s+(oscuro|dark|claro|light)\b/i.test(q)) {
        const isDark = /\b(oscuro|dark|noche)\b/i.test(q);
        return { type: 'setTheme', theme: isDark ? 'dark' : 'light' };
    }

    return { type: 'query' };
}

// ──────────────────────────────────────────────────────────────
// 🆕 MOTOR RULE-BASED v3.0 — Con conversación natural + carpetas
// ──────────────────────────────────────────────────────────────
function ruleBasedResponse(message, ctx, userInfo) {
    const q = message.toLowerCase().trim();
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const d = ctx.docs || {};
    const p = ctx.personas || {};
    const a = ctx.analytics || {};

    // ── Conversación natural ─────────────────────────────────
    const natConv = detectNaturalConversation(message);
    if (natConv.detected) {
        return buildConversationalResponse(natConv.type, ctx, userInfo);
    }

    const intent = detectIntent(message);

    // ── Navegación ───────────────────────────────────────────
    if (intent.type === 'navigate') {
        const labels = {
            documentos: 'Documentos', tareas: 'Tareas', personas: 'Personas',
            dashboard: 'Dashboard', reportes: 'Reportes', papelera: 'Papelera',
            notificaciones: 'Notificaciones', ajustes: 'Ajustes', soporte: 'Soporte',
            categorias: 'Categorías', departamentos: 'Departamentos',
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
            upload: `📤 Abriendo formulario para **subir documento**.\n\nArrastra el archivo o selecciónalo desde tu equipo.`,
            addTask: `✅ Abriendo formulario para **crear tarea**.\n\nCompleta el título, descripción, prioridad y fecha límite.`,
            addPerson: `👤 Abriendo formulario para **agregar persona**.\n\nRecuerda que **nombre y email son obligatorios**.`,
            addCategory: `📁 Abriendo formulario para **crear carpeta**.\n\nPuedes crear carpetas principales o subcarpetas dentro de una existente.`,
            addDepartment: `🏢 Abriendo formulario para **crear departamento**.`,
        };
        return {
            message: msgs[intent.target] || `Abriendo ${intent.target}...`,
            suggestions: ['Ir a Tareas', 'Ver mis tareas', 'Dashboard'],
            actions: [{ action: 'openModal', target: intent.target }],
        };
    }

    // 🆕 ── Crear carpeta ─────────────────────────────────────
    if (intent.type === 'createCategory' || intent.type === 'createSubcategory') {
        return {
            message: `📁 Para crear una ${intent.type === 'createSubcategory' ? 'subcarpeta' : 'carpeta'}, necesito que me digas:\n\n• **Nombre** de la ${intent.type === 'createSubcategory' ? 'subcarpeta' : 'carpeta'}${intent.type === 'createSubcategory' ? '\n• **Carpeta padre** donde irá' : ''}\n\nEjemplo: "${intent.type === 'createSubcategory' ? 'Crea una subcarpeta llamada 2024 dentro de Reconocimientos' : 'Crea una carpeta llamada Reconocimientos'}"`,
            suggestions: ['Ver carpetas existentes', 'Ir a Categorías'],
            actions: intent.type === 'createSubcategory' ? [] : [{ action: 'openModal', target: 'addCategory' }],
        };
    }

    // 🆕 ── Tema oscuro/claro ─────────────────────────────────
    if (intent.type === 'setTheme') {
        const theme = intent.theme;
        return {
            message: theme === 'dark'
                ? `🌙 **Modo oscuro activado.**\n\nLa interfaz ahora usa el tema oscuro.`
                : `☀️ **Modo claro activado.**\n\nLa interfaz ahora usa el tema claro.`,
            suggestions: ['Ver ajustes actuales', 'Ir a Ajustes'],
            actions: [{ action: 'setTheme', theme }],
        };
    }

    // ── Mis Tareas ───────────────────────────────────────────
    if (/mis tareas|tareas? m[ií]as?|qu[eé] tareas|cuántas? tareas/i.test(q)) {
        if (t.total === 0) {
            return {
                message: `✅ No encontré tareas asignadas a **${userInfo?.nombre || 'ti'}**.\n\n¿Quieres crear una nueva tarea?`,
                suggestions: ['Crear nueva tarea', 'Ir a Tareas'],
                actions: [],
            };
        }
        const urgentesReales = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes >= 0 && x.diasRestantes <= 2) || [];
        const vencidasReales = t.lista?.filter(x => x.diasRestantes !== null && x.diasRestantes < 0) || [];
        let msg = `📊 **Tus tareas, ${userInfo?.nombre || 'usuario'}:**\n\n📌 **Resumen:** ${t.total} tarea(s) totales\n   • ${t.pendientes} pendientes | ${t.enProgreso} en progreso | ${t.completadas} completadas\n`;
        if (vencidasReales.length > 0) msg += `\n🚨 **¡ALERTA!** Tienes **${vencidasReales.length}** tarea(s) VENCIDA(S).\n`;
        else if (urgentesReales.length > 0) msg += `\n⚠️ **¡ATENCIÓN!** Tienes **${urgentesReales.length}** tarea(s) URGENTE(S) (≤2 días).\n`;
        else msg += `\n✅ **Sin tareas urgentes ni vencidas.**\n`;
        if (t.lista?.length > 0) {
            msg += `\n📋 **Tareas activas:**\n`;
            t.lista.slice(0, 8).forEach(x => {
                const ico = x.estado === 'pendiente' ? '⏳' : '🔄';
                const tag = x.diasRestantes !== null && x.diasRestantes < 0 ? ' 🔴 VENCIDA'
                    : x.diasRestantes !== null && x.diasRestantes <= 2 ? ' ⚠️ URGENTE'
                    : x.diasRestantes !== null && x.diasRestantes <= 7 ? ' 📅 Próxima' : '';
                msg += `   ${ico} **${x.titulo}**${tag}\n      📅 ${x.fechaLimite || 'sin fecha'} | 🎯 ${prioridadLabel(x.prioridad)}\n`;
            });
        }
        msg += `\n📈 **Progreso:** ${t.porcentajeCompletado}% completado`;
        return { message: msg, suggestions: ['Tarea más urgente', 'Crear nueva tarea', 'Ir a Tareas'], actions: [] };
    }

    // ── Tarea más urgente ────────────────────────────────────
    if (/tarea.*(m[aá]s? urg|priorid|primero)|qu[eé] (hago|debo hacer)/i.test(q)) {
        if (!t.lista?.length) return { message: `✅ No tienes tareas activas. ¡Todo al día!`, suggestions: ['Dashboard', 'Crear tarea'], actions: [] };
        const vencidas = t.lista.filter(x => x.diasRestantes !== null && x.diasRestantes < 0);
        const urgentes = t.lista.filter(x => x.diasRestantes !== null && x.diasRestantes >= 0 && x.diasRestantes <= 2);
        const alta = t.lista.filter(x => TASK_SCHEMA.highPriorities.includes(x.prioridad?.toLowerCase()));
        let tp = null, razon = '';
        if (vencidas.length) { tp = vencidas[0]; razon = `🚨 **VENCIDA hace ${Math.abs(tp.diasRestantes)} día(s)**`; }
        else if (urgentes.length) { tp = urgentes[0]; razon = `⚠️ **URGENTE — Vence en ${tp.diasRestantes} día(s)**`; }
        else if (alta.length) { tp = alta[0]; razon = `🔴 **ALTA PRIORIDAD**`; }
        else { tp = t.lista[0]; razon = `📋 **Siguiente recomendada**`; }
        return {
            message: `${razon}\n\n📌 **${tp.titulo}**\n• Estado: ${estadoLabel(tp.estado)}\n• Prioridad: ${prioridadLabel(tp.prioridad)}\n• Fecha: ${tp.fechaLimite || 'sin fecha'}`,
            suggestions: ['Ver todas mis tareas', 'Ir a Tareas'], actions: [],
        };
    }

    // ── Resumen / Dashboard ──────────────────────────────────
    if (/resumen|dashboard|estado del sistema|panorama|overview/i.test(q)) {
        return {
            message: `**📊 RESUMEN — Gestacks** | ${ctx.sistema?.fechaActual || 'Hoy'}\n\n` +
                `**📄 Documentos:** ${s.totalDocs || 0} activos | ${s.docsHoy || 0} hoy | ${s.docsVencidos || 0} vencidos\n` +
                `**✅ Tareas:** ${t.pendientes || 0} pendientes | ${t.enProgreso || 0} en progreso | ${t.vencidas || 0} vencidas | ${t.porcentajeCompletado || 0}% completado\n` +
                `**👥 Personal:** ${s.totalPersonas || 0} personas | ${s.totalCategorias || 0} carpetas | ${s.totalDeptos || 0} deptos\n` +
                `**🔍 Salud:** ${a.saludSistema || 'N/A'}`,
            suggestions: ['Mis tareas', 'Documentos urgentes', 'Ir a Reportes'], actions: [],
        };
    }

    // ── Documentos urgentes ──────────────────────────────────
    if (/documento.*(vencen|urgentes?|pr[oó]ximos?|crít)/i.test(q)) {
        if (!d.urgentes?.length) return { message: `✅ No hay documentos por vencer en los próximos 7 días.`, suggestions: ['Ir a Documentos'], actions: [{ action: 'navigate', target: 'documentos' }] };
        const lista = d.urgentes.slice(0, 7).map(x => {
            const e = x.diasRestantes <= 1 ? '🚨' : x.diasRestantes <= 3 ? '⚠️' : '📅';
            return `${e} **${x.nombre}** — ${x.diasRestantes}d (${x.vence})`;
        }).join('\n');
        return { message: `🚨 **Documentos por vencer (${d.urgentes.length}):**\n\n${lista}`, suggestions: ['Ir a Documentos', 'Subir documento'], actions: [{ action: 'navigate', target: 'documentos' }] };
    }

    // ── Documentos vencidos ──────────────────────────────────
    if (/vencidos?|expirados?|caducados?/i.test(q)) {
        if (!d.vencidos?.length) return { message: `✅ No hay documentos vencidos.`, suggestions: ['Ir a Documentos'], actions: [] };
        const lista = d.vencidos.slice(0, 5).map(x => `❌ **${x.nombre}** — hace ${x.diasVencidos}d (${x.vencimiento})`).join('\n');
        return { message: `❌ **Documentos Vencidos (${d.vencidos.length}):**\n\n${lista}`, suggestions: ['Ir a Documentos'], actions: [{ action: 'navigate', target: 'documentos' }] };
    }

    // ── Productividad ────────────────────────────────────────
    if (/productividad|rendimiento|c[oó]mo voy|progreso|análisis/i.test(q)) {
        const pct = t.porcentajeCompletado || 0;
        const nivel = pct >= 80 ? '🌟 Excelente' : pct >= 60 ? '✅ Bueno' : pct >= 40 ? '⚠️ Regular' : '🔴 Necesita mejora';
        return {
            message: `📈 **Productividad — ${userInfo?.nombre || 'Usuario'}**\n\n**Tareas:** ${nivel} (${pct}%)\n• Completadas: ${t.completadas || 0}/${t.total || 0} | Vencidas: ${t.vencidas || 0}\n\n**Salud:** ${a.saludSistema || 'N/A'}`,
            suggestions: ['Tarea más urgente', 'Ir a Reportes'], actions: [],
        };
    }

    // ── Personas ─────────────────────────────────────────────
    if (/cu[aá]ntas? personas?|personal|empleados?/i.test(q)) {
        return {
            message: `👥 **Personal de Gestacks:**\n\n• **${s.totalPersonas || 0}** personas activas\n\n**Por departamento:**\n${p.porDepartamento?.slice(0, 5).map(x => `• **${x.departamento}:** ${x.cantidad}`).join('\n') || '  (sin datos)'}`,
            suggestions: ['Agregar persona', 'Ir a Personas'], actions: [],
        };
    }

    // ── Cuántos documentos ───────────────────────────────────
    if (/cu[aá]ntos? documento|estadística.*doc|total.*doc/i.test(q)) {
        return {
            message: `📄 **Estadísticas de Documentos:**\n\n• **${s.totalDocs || 0}** activos | **${s.docsHoy || 0}** hoy | **${s.docsEstesMes || 0}** este mes\n\n**Vencimientos:**\n• **${s.docsPorVencer3 || 0}** en <3 días 🚨 | **${s.docsPorVencer7 || 0}** en <7 días ⚠️\n• **${s.docsVencidos || 0}** ya vencidos ❌`,
            suggestions: ['Documentos urgentes', 'Subir documento', 'Ir a Documentos'], actions: [],
        };
    }

    // ── Fallback inteligente ─────────────────────────────────
    return {
        message: `🤔 Puedo ayudarte con eso, **${userInfo?.nombre || 'usuario'}**.\n\n¿Qué necesitas específicamente?\n• 📊 **Datos:** tareas, documentos, personas\n• 🗺️ **Navegar:** "ir a tareas"\n• ⚡ **Crear:** "crea una tarea...", "crea una carpeta..."\n• 📈 **Reportes:** "genera reporte en Excel"`,
        suggestions: ['Resumen del sistema', 'Mis tareas', 'Documentos urgentes', '¿Qué puedes hacer?'],
        actions: [],
    };
}

// ──────────────────────────────────────────────────────────────
// SUGERENCIAS CONTEXTUALES
// ──────────────────────────────────────────────────────────────
function buildSuggestions(message, ctx) {
    const q = message.toLowerCase();
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const out = new Set();
    if (s.docsPorVencer3 > 0) out.add(`🚨 ${s.docsPorVencer3} doc(s) <3 días`);
    else if (s.docsPorVencer7 > 0) out.add(`⚠️ Documentos por vencer`);
    if (t.vencidas > 0) out.add(`🚨 ${t.vencidas} tarea(s) vencidas`);
    if (/documento/.test(q)) { out.add('Documentos urgentes'); out.add('Subir documento'); }
    else if (/tarea/.test(q)) { out.add('Tarea más urgente'); out.add('Crear nueva tarea'); }
    else if (/persona/.test(q)) { out.add('Ir a Personas'); }
    else if (/carpeta|categor[ií]a/.test(q)) { out.add('Crear carpeta'); out.add('Ir a Categorías'); }
    else if (/reporte/.test(q)) { out.add('Ir a Reportes'); }
    else { out.add('Resumen del sistema'); out.add('Mis tareas'); out.add('Productividad'); }
    return [...out].slice(0, 5);
}

// ──────────────────────────────────────────────────────────────
// HISTORIAL DE CONVERSACIÓN (con paginación)
// ──────────────────────────────────────────────────────────────
async function getConvHistory(userId, limit = 10) {
    try {
        const rows = await Conversation.find({ usuario: userId })
            .sort({ timestamp: -1 }).limit(limit).lean();
        return rows.reverse().flatMap(r => [
            { role: 'user', content: r.mensajeUsuario },
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
            usuario: userId,
            mensajeUsuario: userMsg.substring(0, 1000),
            respuestaBot: botMsg.substring(0, 5000),
            fuente: extra.fuente ?? 'rule-based',
            latencia: extra.latencia ?? null,
        });
    } catch (e) {
        debug.warn('Error guardando conversación:', e.message);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────
// 🆕 VALIDACIÓN DE ACCIONES (incluye nuevas acciones)
// ──────────────────────────────────────────────────────────────
const VALID_NAV = ['dashboard', 'documentos', 'personas', 'tareas', 'reportes', 'papelera', 'notificaciones', 'ajustes', 'soporte', 'categorias', 'departamentos'];
const VALID_MODAL = ['upload', 'addPerson', 'addTask', 'addCategory', 'addDepartment', 'search'];

function validateAndFixActions(actions, originalMessage) {
    if (!actions.length) {
        const intent = detectIntent(originalMessage);
        if (intent.type === 'navigate' && VALID_NAV.includes(intent.target)) {
            return [{ action: 'navigate', target: intent.target }];
        }
        if (intent.type === 'openModal' && VALID_MODAL.includes(intent.target)) {
            return [{ action: 'openModal', target: intent.target }];
        }
        if (intent.type === 'setTheme') {
            return [{ action: 'setTheme', theme: intent.theme }];
        }
        if (intent.type === 'search') {
            return [{ action: 'search', query: intent.query, section: intent.section }];
        }
        return [];
    }
    return actions.filter(a => {
        if (a.action === 'navigate') return VALID_NAV.includes(a.target?.toLowerCase());
        if (a.action === 'openModal') return VALID_MODAL.includes(a.target);
        if (a.action === 'setTheme') return ['dark', 'light'].includes(a.theme);
        if (a.action === 'search') return !!a.query;
        return false;
    });
}

// ──────────────────────────────────────────────────────────────
// CONTROLLER PRINCIPAL v3.0
// ──────────────────────────────────────────────────────────────
class ChatbotController {

    async processMessage(req, res) {
        const t0 = Date.now();
        const userId = req.user?.id || req.user?._id;
        const { message } = req.body;

        if (!message?.trim())
            return res.status(400).json({ success: false, message: 'Mensaje vacío.' });
        if (message.trim().length > 2000)
            return res.status(400).json({ success: false, message: 'Mensaje demasiado largo (máx. 2000 caracteres).' });

        const msg = message.trim();
        debug.log(`Mensaje [${userId}]: "${msg.substring(0, 100)}"`);

        const userInfo = {
            nombre: req.user?.nombre || req.user?.usuario || req.user?.name || 'Usuario',
            rol: req.user?.rol || req.user?.role || 'usuario',
            id: String(userId),
        };

        try {
            const schoolId = req.schoolId || req.user?.schoolId || null;
            const [ctx, history] = await Promise.all([
                buildSystemContext(userId, schoolId),
                getConvHistory(userId, 10),
            ]);

            // ── 1. Groq (LLM principal) ───────────────────────
            if (process.env.GROQ_API_KEY) {
                try {
                    const systemPrompt = buildSystemPrompt(ctx, userInfo);
                    const { text: raw } = await callGroq(systemPrompt, [
                        ...history,
                        { role: 'user', content: msg },
                    ], 1200);

                    let actions = extractActions(raw);
                    actions = validateAndFixActions(actions, msg);
                    const cleanMsg = cleanText(raw);
                    const latency = Date.now() - t0;
                    const suggestions = buildSuggestions(msg, ctx);

                    debug.info(`✅ Groq OK en ${latency}ms | acciones: ${actions.length}`);
                    const conv = await saveConv(userId, msg, cleanMsg, { fuente: 'groq', latencia: latency });

                    return res.json({
                        success: true,
                        data: {
                            message: cleanMsg,
                            actions,
                            suggestions,
                            source: 'groq',
                            latency,
                            conversationId: conv?._id,
                        },
                    });
                } catch (groqErr) {
                    debug.warn(`Groq falló (${groqErr.message}), usando fallback`);
                }
            }

            // ── 2. Fallback rule-based ────────────────────────
            const fb = ruleBasedResponse(msg, ctx, userInfo);
            const latency = Date.now() - t0;
            const cleanMsg = cleanText(fb.message ?? '');
            let actions = fb.actions ?? [];
            actions = validateAndFixActions(actions, msg);

            const conv = await saveConv(userId, msg, cleanMsg, { fuente: 'rule-based', latencia: latency });
            debug.info(`✅ Fallback OK en ${latency}ms`);

            return res.json({
                success: true,
                data: {
                    message: cleanMsg,
                    actions,
                    suggestions: fb.suggestions ?? buildSuggestions(msg, ctx),
                    source: 'rule-based',
                    latency,
                    conversationId: conv?._id,
                },
            });

        } catch (err) {
            debug.error('Error crítico en processMessage:', err.message, err.stack);
            return res.status(500).json({
                success: false,
                message: 'Error procesando tu consulta. Intenta de nuevo.',
            });
        }
    }

    async getSystemStats(req, res) {
        const t0 = Date.now();
        const userId = req.user?.id || req.user?._id;
        const schoolId = req.schoolId || req.user?.schoolId || null;
        try {
            const ctx = await buildSystemContext(userId, schoolId);
            debug.info(`getSystemStats en ${Date.now() - t0}ms`);
            return res.json({
                success: true,
                data: {
                    stats: ctx.stats,
                    tareas: ctx.tareas,
                    analytics: ctx.analytics,
                    sistema: ctx.sistema,
                    documentosUrgentes: ctx.docs.urgentes,
                    ultimosDocumentos: ctx.docs.recientes,
                    documentosVencidos: ctx.docs.vencidos,
                    documentosPorCategoria: ctx.docs.porCategoria,
                    personas: ctx.personas,
                    personasPorDepartamento: ctx.personas.porDepartamento,
                    categorias: ctx.categorias,
                    categoriasObj: ctx.categoriasObj, // 🆕
                    departamentos: ctx.departamentos,
                    totalDocs: ctx.stats.totalDocs,
                    totalPersonas: ctx.stats.totalPersonas,
                    docsPorVencer7: ctx.stats.docsPorVencer7,
                    docsVencidos: ctx.stats.docsVencidos,
                },
            });
        } catch (err) {
            debug.error('getSystemStats error:', err.message);
            return res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
        }
    }

    async getHistory(req, res) {
        const userId = req.user?.id || req.user?._id;
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);
        const skip = Math.max(parseInt(req.query.skip) || 0, 0);
        try {
            const [rows, total] = await Promise.all([
                Conversation.find({ usuario: userId })
                    .sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
                Conversation.countDocuments({ usuario: userId }),
            ]);
            return res.json({
                success: true,
                total,
                data: rows.map(r => ({
                    _id: r._id,
                    userMessage: r.mensajeUsuario,
                    botResponse: r.respuestaBot,
                    timestamp: r.timestamp,
                    util: r.util,
                    source: r.fuente,
                    latency: r.latencia,
                })),
            });
        } catch (err) {
            debug.error('getHistory error:', err.message);
            return res.status(500).json({ success: false, message: 'Error al obtener historial.' });
        }
    }

    async clearHistory(req, res) {
        const userId = req.user?.id || req.user?._id;
        try {
            const result = await Conversation.deleteMany({ usuario: userId });
            debug.log(`Historial borrado: ${result.deletedCount} registros`);
            return res.json({ success: true, message: `${result.deletedCount} mensajes eliminados.`, deletedCount: result.deletedCount });
        } catch (err) {
            debug.error('clearHistory error:', err.message);
            return res.status(500).json({ success: false, message: 'Error al borrar historial.' });
        }
    }

    async submitFeedback(req, res) {
        const userId = req.user?.id || req.user?._id;
        const { conversationId, util } = req.body;
        try {
            if (!conversationId) return res.status(400).json({ success: false, message: 'conversationId requerido.' });
            const result = await Conversation.findOneAndUpdate(
                { _id: conversationId, usuario: userId },
                { util: Boolean(util) },
                { new: true }
            );
            if (!result) return res.status(404).json({ success: false, message: 'Conversación no encontrada.' });
            return res.json({ success: true, message: 'Feedback registrado.' });
        } catch (err) {
            debug.error('submitFeedback error:', err.message);
            return res.status(500).json({ success: false });
        }
    }

    // 🆕 ─── Sincronizar ajuste de tema ───────────────────────
    async setTheme(req, res) {
        const { theme } = req.body;
        if (!theme || !['dark', 'light'].includes(theme)) {
            return res.status(400).json({ success: false, message: 'Tema inválido. Usa "dark" o "light".' });
        }
        try {
            // Guardar en SystemState para que persista
            const instance = await SystemState.getInstance();
            if (!instance.settings) instance.settings = {};
            if (!instance.settings.appearance) instance.settings.appearance = {};
            instance.settings.appearance.theme = theme;
            instance.settings.appearance.currentTheme = theme;
            await instance.save();
            
            debug.info(`✅ Tema cambiado a: ${theme}`);
            return res.json({ success: true, message: `Tema cambiado a ${theme}`, theme });
        } catch (err) {
            debug.error('setTheme error:', err.message);
            return res.status(500).json({ success: false, message: 'Error al cambiar tema.' });
        }
    }

    async getDiagnostics(req, res) {
        const userId = req.user?.id || req.user?._id;
        if (process.env.NODE_ENV !== 'development') {
            return res.status(403).json({ success: false, message: 'Solo disponible en desarrollo.' });
        }
        try {
            const { query } = await buildTaskQuery(userId);
            const totalTasks = await Task.countDocuments({});
            const totalTasksForUser = await Task.countDocuments(query);
            const sample = await Task.findOne({}).lean();
            const sampleFields = sample ? Object.keys(sample).sort() : [];
            const byStatus = {};
            for (const st of TASK_SCHEMA.statuses) {
                byStatus[st] = await Task.countDocuments({ ...query, estado: st });
            }
            return res.json({
                success: true,
                data: {
                    confirmedSchema: TASK_SCHEMA,
                    userId: String(userId),
                    totalTasksInDB: totalTasks,
                    tasksForThisUser: totalTasksForUser,
                    tasksByStatus: byStatus,
                    sampleDocFields: sampleFields,
                    env: process.env.NODE_ENV,
                    groqEnabled: !!process.env.GROQ_API_KEY,
                    queryUsed: query,
                },
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
}

export default new ChatbotController();