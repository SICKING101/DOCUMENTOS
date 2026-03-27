// ============================================================
// chatbotController.js — Motor IA del Asistente ARIA - CBTIS051
// VERSIÓN MEJORADA - Más interacciones, estadísticas detalladas,
// búsqueda avanzada, análisis de documentos, gestión de tareas
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
    log: (...a) => console.log('🤖 [ARIA]', ...a),
    warn: (...a) => console.warn('⚠️ [ARIA]', ...a),
    error: (...a) => console.error('❌ [ARIA]', ...a),
    info: (...a) => console.info('ℹ️ [ARIA]', ...a),
};

// ──────────────────────────────────────────────────────────────
// CLIENTE GROQ
// ──────────────────────────────────────────────────────────────
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_TIMEOUT = 15000;

async function callGroq(systemPrompt, messages, maxTokens = 900) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT);

    try {
        const body = {
            model: GROQ_MODEL,
            max_tokens: maxTokens,
            temperature: 0.65,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages,
            ],
        };

        debug.log(`Llamando a Groq (${messages.length} msgs en contexto)...`);

        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timer);

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Groq HTTP ${res.status}: ${errText.substring(0, 200)}`);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content ?? '';
        const usage = data.usage ?? {};

        debug.log(`Groq OK — tokens in=${usage.prompt_tokens} out=${usage.completion_tokens}`);
        return { text, usage };

    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') throw new Error('Groq timeout (15s)');
        throw err;
    }
}

// ──────────────────────────────────────────────────────────────
// CONTEXTO COMPLETO DEL SISTEMA (MEJORADO)
// ──────────────────────────────────────────────────────────────
async function buildSystemContext(userId) {
    debug.log('Construyendo contexto completo para userId:', userId);
    const ctx = { stats: {}, tareas: {}, docs: {}, personas: {}, categorias: [], departamentos: [] };

    try {
        const ahora = new Date();
        const en7d = new Date(ahora.getTime() + 7 * 86400000);
        const en15d = new Date(ahora.getTime() + 15 * 86400000);
        const en30d = new Date(ahora.getTime() + 30 * 86400000);
        const hace7d = new Date(ahora.getTime() - 7 * 86400000);
        const hace30d = new Date(ahora.getTime() - 30 * 86400000);

        // Estadísticas globales
        const [
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer7, docsPorVencer15, docsPorVencer30, docsVencidos, docsRecientes,
            docsSubidosHoy, docsSubidosEsteMes
        ] = await Promise.all([
            Document.countDocuments({ activo: true }),
            Person.countDocuments({ activo: true }),
            Category.countDocuments({ activo: true }),
            Department.countDocuments({ activo: true }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en7d } }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en15d } }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en30d } }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $lt: ahora } }),
            Document.countDocuments({ activo: true, fecha_subida: { $gte: hace7d } }),
            Document.countDocuments({ activo: true, fecha_subida: { $gte: new Date(ahora.setHours(0,0,0,0)) } }),
            Document.countDocuments({ activo: true, fecha_subida: { $gte: hace30d } }),
        ]);

        ctx.stats = {
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer7, docsPorVencer15, docsPorVencer30, docsVencidos, docsRecientes,
            docsSubidosHoy, docsSubidosEsteMes
        };

        // Tareas del usuario (más detalladas)
        try {
            const f = { $or: [{ asignadoA: userId }, { creador: userId }] };
            const [tPend, tProg, tComp, tVenc, tHoy, tSemana] = await Promise.all([
                Task.countDocuments({ ...f, estado: 'pendiente' }),
                Task.countDocuments({ ...f, estado: 'en-progreso' }),
                Task.countDocuments({ ...f, estado: 'completada' }),
                Task.countDocuments({ ...f, estado: { $in: ['pendiente', 'en-progreso'] }, fechaLimite: { $lt: ahora } }),
                Task.countDocuments({ ...f, fechaLimite: { $gte: new Date(ahora.setHours(0,0,0,0)), $lte: new Date(ahora.setHours(23,59,59,999)) } }),
                Task.countDocuments({ ...f, fechaLimite: { $gte: ahora, $lte: en7d } }),
            ]);
            
            const lista = await Task.find({ ...f, estado: { $in: ['pendiente', 'en-progreso'] } })
                .sort({ prioridad: -1, fechaLimite: 1 }).limit(5).lean();
            
            const completadasRecientes = await Task.find({ ...f, estado: 'completada' })
                .sort({ fecha_completada: -1 }).limit(5).lean();

            ctx.tareas = {
                pendientes: tPend, enProgreso: tProg, completadas: tComp, vencidas: tVenc,
                paraHoy: tHoy, paraEstaSemana: tSemana,
                lista: lista.map(t => ({
                    titulo: t.titulo,
                    descripcion: t.descripcion,
                    prioridad: t.prioridad,
                    estado: t.estado,
                    fechaLimite: t.fechaLimite ? new Date(t.fechaLimite).toLocaleDateString('es-MX') : null,
                })),
                completadasRecientes: completadasRecientes.map(t => ({
                    titulo: t.titulo,
                    fechaCompletada: t.fecha_completada ? new Date(t.fecha_completada).toLocaleDateString('es-MX') : null,
                })),
            };
        } catch (e) {
            debug.warn('Módulo Task no disponible:', e.message);
            ctx.tareas = { pendientes: 0, enProgreso: 0, completadas: 0, vencidas: 0, paraHoy: 0, paraEstaSemana: 0, lista: [], completadasRecientes: [] };
        }

        // Documentos (más detallados)
        const [ultimosDocs, docsUrgentes, docsVencidosLista, docsPorCategoria] = await Promise.all([
            Document.find({ activo: true }).sort({ fecha_subida: -1 }).limit(10)
                .populate('categoria', 'nombre').lean(),
            Document.find({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en7d } })
                .sort({ fecha_vencimiento: 1 }).limit(10).lean(),
            Document.find({ activo: true, fecha_vencimiento: { $lt: ahora } })
                .sort({ fecha_vencimiento: -1 }).limit(10).lean(),
            Document.aggregate([
                { $match: { activo: true } },
                { $group: { _id: "$categoria", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]).limit(10),
        ]);

        ctx.docs = {
            recientes: ultimosDocs.map(d => ({
                nombre: d.nombre_original,
                categoria: d.categoria?.nombre || 'Sin categoría',
                fecha: new Date(d.fecha_subida).toLocaleDateString('es-MX'),
                vencimiento: d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-MX') : null,
            })),
            urgentes: docsUrgentes.map(d => ({
                nombre: d.nombre_original,
                vence: new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasRestantes: Math.ceil((new Date(d.fecha_vencimiento) - ahora) / 86400000),
            })),
            vencidos: docsVencidosLista.map(d => ({
                nombre: d.nombre_original,
                vencimiento: new Date(d.fecha_vencimiento).toLocaleDateString('es-MX'),
                diasVencidos: Math.ceil((ahora - new Date(d.fecha_vencimiento)) / 86400000),
            })),
            porCategoria: docsPorCategoria.map(c => ({ categoria: c._id || 'Sin categoría', cantidad: c.count })),
        };

        // Personas (más detalladas)
        const personas = await Person.find({ activo: true }).limit(20).lean();
        const personasPorDepto = await Person.aggregate([
            { $match: { activo: true } },
            { $group: { _id: "$departamento", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]).limit(10);

        ctx.personas = {
            total: totalPersonas,
            lista: personas.map(p => ({
                nombre: p.nombre,
                email: p.email,
                departamento: p.departamento,
                puesto: p.puesto,
                telefono: p.telefono,
            })),
            porDepartamento: personasPorDepto.map(d => ({ departamento: d._id || 'Sin departamento', cantidad: d.count })),
        };

        // Categorías y Departamentos
        const categorias = await Category.find({ activo: true }).lean();
        const departamentos = await Department.find({ activo: true }).lean();
        ctx.categorias = categorias.map(c => c.nombre);
        ctx.departamentos = departamentos.map(d => d.nombre);

        debug.log('Contexto completo listo');
    } catch (err) {
        debug.error('Error construyendo contexto:', err.message);
    }

    return ctx;
}

// ──────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES PARA ANÁLISIS
// ──────────────────────────────────────────────────────────────

function obtenerDocumentoMasReciente(ctx) {
    return ctx.docs?.recientes?.[0] || null;
}

function obtenerCategoriaMasUsada(ctx) {
    return ctx.docs?.porCategoria?.[0] || null;
}

function obtenerDepartamentoConMasPersonas(ctx) {
    return ctx.personas?.porDepartamento?.[0] || null;
}

function obtenerResumenSemanal(ctx) {
    const s = ctx.stats || {};
    return {
        documentosSubidos: s.docsRecientes || 0,
        documentosPorVencer: s.docsPorVencer7 || 0,
        tareasParaHoy: ctx.tareas?.paraHoy || 0,
        tareasParaSemana: ctx.tareas?.paraEstaSemana || 0,
    };
}

// ──────────────────────────────────────────────────────────────
// SYSTEM PROMPT COMPLETO (MEJORADO)
// ──────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx, userInfo) {
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const d = ctx.docs || {};
    const p = ctx.personas || {};
    const resumenSemanal = obtenerResumenSemanal(ctx);
    const docMasReciente = obtenerDocumentoMasReciente(ctx);
    const categoriaMasUsada = obtenerCategoriaMasUsada(ctx);
    const deptoMasPersonas = obtenerDepartamentoConMasPersonas(ctx);

    const alertas = [];
    if (s.docsPorVencer7 > 0) alertas.push(`- 🚨 URGENTE: ${s.docsPorVencer7} documento(s) vencen en menos de 7 días`);
    if (s.docsVencidos > 0) alertas.push(`- ❌ CRÍTICO: ${s.docsVencidos} documento(s) ya están vencidos`);
    if (t.vencidas > 0) alertas.push(`- ⏰ ATENCIÓN: ${t.vencidas} tarea(s) vencidas sin resolver`);
    if (t.pendientes > 5) alertas.push(`- 📋 ${t.pendientes} tareas pendientes, revisa tus prioridades`);
    if (s.docsRecientes === 0 && s.totalDocs > 0) alertas.push(`- 📭 No se han subido documentos esta semana`);

    const tareasLista = t.lista?.length
        ? t.lista.map(x =>
            `  • [${(x.prioridad || 'media').toUpperCase()}] ${x.titulo}` +
            (x.fechaLimite ? ` — vence ${x.fechaLimite}` : '')
        ).join('\n')
        : '  ✨ Sin tareas pendientes. ¡Todo al día!';

    const docsRecientes = d.recientes?.length
        ? d.recientes.slice(0, 5).map(x => `  • 📄 ${x.nombre} (${x.categoria}) — ${x.fecha}`).join('\n')
        : '  📭 No hay documentos recientes';

    const docsUrgentes = d.urgentes?.length
        ? d.urgentes.slice(0, 5).map(x => `  • ⚠️ ${x.nombre} — vence en ${x.diasRestantes} día(s) (${x.vence})`).join('\n')
        : '  ✅ Ningún documento crítico por vencer';

    const docsVencidos = d.vencidos?.length
        ? d.vencidos.slice(0, 3).map(x => `  • ❌ ${x.nombre} — vencido hace ${x.diasVencidos} día(s) (${x.vencimiento})`).join('\n')
        : '  ✅ No hay documentos vencidos';

    const personasLista = p.lista?.length
        ? p.lista.slice(0, 5).map(x => `  • 👤 ${x.nombre} - ${x.email || 'sin email'} (${x.departamento || 'sin departamento'})`).join('\n')
        : '  📭 No hay personas registradas';

    const docsPorCategoria = d.porCategoria?.length
        ? d.porCategoria.slice(0, 5).map(x => `  • 📁 ${x.categoria}: ${x.cantidad} documento(s)`).join('\n')
        : '  📭 Sin datos de categorías';

    return `Eres ARIA, el asistente virtual inteligente del Sistema de Gestión Documental del CBTIS 051.

## 🧠 TU IDENTIDAD
- **Nombre:** ARIA (Asistente de Registro e Información Automatizado)
- **Institución:** CBTIS 051 (Centro de Bachillerato Tecnológico Industrial y de Servicios No. 51)
- **Especialidad:** Gestión documental, tareas administrativas, orientación institucional
- **Personalidad:** Profesional, cercana, directa, con sentido del humor sutil. Usas español mexicano natural. Tuteas al usuario.

## 📊 DATOS REALES DEL SISTEMA (en tiempo real)

### 📈 Estadísticas Generales
- 📄 Documentos activos: ${s.totalDocs || 0}
- 📤 Subidos esta semana: ${s.docsRecientes || 0}
- 📤 Subidos hoy: ${s.docsSubidosHoy || 0}
- 📤 Subidos este mes: ${s.docsSubidosEsteMes || 0}
- ⚠️ Por vencer (7 días): ${s.docsPorVencer7 || 0}
- ⚠️ Por vencer (15 días): ${s.docsPorVencer15 || 0}
- 📅 Por vencer (30 días): ${s.docsPorVencer30 || 0}
- ❌ Vencidos: ${s.docsVencidos || 0}
- 👥 Personas registradas: ${s.totalPersonas || 0}
- 📁 Categorías: ${s.totalCategorias || 0}
- 🏢 Departamentos: ${s.totalDeptos || 0}

### 📊 Resumen de la Semana
- Documentos subidos: ${resumenSemanal.documentosSubidos}
- Documentos por vencer: ${resumenSemanal.documentosPorVencer}
- Tareas para hoy: ${resumenSemanal.tareasParaHoy}
- Tareas para esta semana: ${resumenSemanal.tareasParaSemana}

### 🏆 Insights del Sistema
- 📄 Documento más reciente: ${docMasReciente ? docMasReciente.nombre : 'No hay documentos'}
- 📁 Categoría más usada: ${categoriaMasUsada ? `${categoriaMasUsada.categoria} (${categoriaMasUsada.cantidad} docs)` : 'Sin datos'}
- 🏢 Departamento con más personas: ${deptoMasPersonas ? `${deptoMasPersonas.departamento} (${deptoMasPersonas.cantidad} personas)` : 'Sin datos'}

### ✅ TAREAS DEL USUARIO "${userInfo?.nombre || 'Usuario'}"
- Pendientes: ${t.pendientes || 0}
- En progreso: ${t.enProgreso || 0}
- Completadas: ${t.completadas || 0}
- Vencidas: ${t.vencidas || 0}
- Para hoy: ${t.paraHoy || 0}
- Para esta semana: ${t.paraEstaSemana || 0}

**Tareas urgentes:**
${tareasLista}

**Tareas completadas recientemente:**
${t.completadasRecientes?.length ? t.completadasRecientes.map(x => `  • ✅ ${x.titulo} (${x.fechaCompletada})`).join('\n') : '  ✨ No hay tareas completadas recientemente'}

### 📄 DOCUMENTOS RECIENTES
${docsRecientes}

### 🚨 DOCUMENTOS URGENTES (vencen pronto)
${docsUrgentes}

### ❌ DOCUMENTOS VENCIDOS
${docsVencidos}

### 📁 DOCUMENTOS POR CATEGORÍA
${docsPorCategoria}

### 👥 PERSONAS REGISTRADAS (primeras 5)
${personasLista}

### 👥 PERSONAS POR DEPARTAMENTO
${p.porDepartamento?.length ? p.porDepartamento.slice(0, 5).map(x => `  • 🏢 ${x.departamento}: ${x.cantidad} persona(s)`).join('\n') : '  📭 Sin datos'}

### 📁 CATEGORÍAS DISPONIBLES
${ctx.categorias?.length ? ctx.categorias.join(', ') : 'Ninguna'}

### 🏢 DEPARTAMENTOS
${ctx.departamentos?.length ? ctx.departamentos.join(', ') : 'Ninguno'}

${alertas.length ? `\n## 🔔 ALERTAS ACTIVAS\n${alertas.join('\n')}` : ''}

## 🎯 ACCIONES QUE PUEDES EJECUTAR

Cuando el usuario quiera REALIZAR UNA ACCIÓN, incluye ESTE BLOQUE JSON AL FINAL de tu respuesta:

### Para navegar:
\`\`\`json
{"action": "navigate", "target": "documentos"}
\`\`\`
Secciones: dashboard, documentos, personas, tareas, reportes, papelera, notificaciones, ajustes, soporte

### Para abrir modales:
\`\`\`json
{"action": "openModal", "target": "upload"}
\`\`\`
Modales: upload, addPerson, addTask, addCategory, addDepartment, search

### Para buscar:
\`\`\`json
{"action": "search", "query": "término", "section": "documentos"}
\`\`\`

## 💡 REGLAS IMPORTANTES
1. **USA SIEMPRE LOS DATOS REALES** del sistema. Nunca inventes cifras.
2. **RESPONDE PREGUNTAS ESPECÍFICAS:**
   - "¿Cuántos documentos hay?" → usa ${s.totalDocs || 0}
   - "¿Qué tareas tengo para hoy?" → usa ${t.paraHoy || 0}
   - "¿Cuál es la categoría más usada?" → ${categoriaMasUsada ? categoriaMasUsada.categoria : 'No hay datos'}
   - "¿Qué documentos se subieron esta semana?" → muestra lista
   - "¿Cuántas personas hay en el departamento de X?" → busca en personas por departamento
   - "¿Cuándo vence el documento X?" → busca en documentos urgentes
3. **SI HAY ALERTAS**, menciónalas aunque no te pregunten.
4. **RESPUESTAS CONCISAS** pero completas. Usa negritas para datos clave.
5. **SIEMPRE SUGIERE** una siguiente acción relevante basada en el contexto.
6. **PARA ACCIONES**, incluye el JSON correspondiente.
7. **RESPONDE SOLO EN ESPAÑOL MEXICANO**.

## 📋 PREGUNTAS QUE PUEDES RESPONDER
- "¿Cuántos documentos se subieron esta semana?"
- "¿Qué tareas tengo para hoy?"
- "¿Cuál es el documento más reciente?"
- "¿Cuántas personas hay en el departamento de Sistemas?"
- "¿Qué categoría tiene más documentos?"
- "¿Cuántos documentos vencen esta semana?"
- "¿Qué documentos están vencidos?"
- "Resumen de la semana"
- "¿Cuántas tareas completé esta semana?"
- "¿Qué tareas están vencidas?"
- "¿Cuál es la categoría menos usada?"
- "¿Cuántos documentos hay por categoría?"
- "¿Qué personas están en el departamento X?"`;
}

// ──────────────────────────────────────────────────────────────
// EXTRACTOR DE ACCIONES
// ──────────────────────────────────────────────────────────────
function extractActions(text) {
    const actions = [];
    const re = /```json\s*(\{[\s\S]*?\})\s*```/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        try {
            const parsed = JSON.parse(m[1]);
            if (parsed.action) {
                actions.push(parsed);
                debug.log('Acción extraída:', parsed);
            }
        } catch (e) {
            debug.warn('JSON inválido en acción:', m[1].substring(0, 60));
        }
    }
    return actions;
}

function cleanText(text) {
    return text.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim();
}

// ──────────────────────────────────────────────────────────────
// HISTORIAL
// ──────────────────────────────────────────────────────────────
async function getConvHistory(userId, limit = 6) {
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
        const conv = await Conversation.create({
            usuario: userId,
            mensajeUsuario: userMsg,
            respuestaBot: botMsg,
            fuente: extra.fuente ?? 'groq',
            latencia: extra.latencia ?? null,
        });
        return conv;
    } catch (e) {
        debug.warn('Error guardando conversación:', e.message);
        return null;
    }
}

// ──────────────────────────────────────────────────────────────
// FALLBACK INTELIGENTE CON MÁS INTERACCIONES
// ──────────────────────────────────────────────────────────────
function ruleBasedResponse(message, ctx) {
    const q = message.toLowerCase().trim();
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const d = ctx.docs || {};
    const p = ctx.personas || {};
    const resumenSemanal = obtenerResumenSemanal(ctx);
    const docMasReciente = obtenerDocumentoMasReciente(ctx);
    const categoriaMasUsada = obtenerCategoriaMasUsada(ctx);
    const deptoMasPersonas = obtenerDepartamentoConMasPersonas(ctx);

    // ========== PREGUNTAS SOBRE CANTIDADES ==========
    if (q.includes('cuántos') || q.includes('cuantos') || q.includes('cuantas')) {
        if (q.includes('documento')) {
            return {
                message: `📊 **Documentos en el sistema:**\n\n• **${s.totalDocs || 0}** documentos activos\n• **${s.docsRecientes || 0}** subidos esta semana\n• **${s.docsSubidosHoy || 0}** subidos hoy\n• **${s.docsPorVencer7 || 0}** por vencer en 7 días\n• **${s.docsPorVencer15 || 0}** por vencer en 15 días\n• **${s.docsVencidos || 0}** documentos vencidos\n\n¿Quieres ver la lista de documentos por vencer?`,
                suggestions: ['Ver documentos por vencer', 'Subir documento', 'Ir a Documentos', '¿Qué documentos se subieron esta semana?'],
                actions: []
            };
        }
        if (q.includes('persona') || q.includes('usuario')) {
            return {
                message: `👥 **Personas registradas:** ${s.totalPersonas || 0} personas en el sistema.\n\n${p.porDepartamento?.length ? `📊 **Distribución por departamento:**\n${p.porDepartamento.slice(0, 5).map(d => `• ${d.departamento}: ${d.cantidad} persona(s)`).join('\n')}` : ''}`,
                suggestions: ['Listar personas', 'Agregar persona', 'Ver departamentos', '¿Quién está en el departamento de Sistemas?'],
                actions: []
            };
        }
        if (q.includes('tarea')) {
            return {
                message: `✅ **Tareas:**\n• Pendientes: ${t.pendientes || 0}\n• En progreso: ${t.enProgreso || 0}\n• Completadas: ${t.completadas || 0}\n• Vencidas: ${t.vencidas || 0}\n• Para hoy: ${t.paraHoy || 0}\n• Para esta semana: ${t.paraEstaSemana || 0}`,
                suggestions: ['Ver mis tareas', 'Crear tarea', 'Ir a Tareas', '¿Qué tareas tengo para hoy?'],
                actions: []
            };
        }
    }

    // ========== PREGUNTAS DE RESUMEN SEMANAL ==========
    if (q.includes('resumen de la semana') || q.includes('resumen semanal') || q.includes('qué pasó esta semana')) {
        return {
            message: `📊 **RESUMEN DE LA SEMANA**\n\n📄 **Documentos:**\n• Subidos: ${resumenSemanal.documentosSubidos}\n• Por vencer: ${resumenSemanal.documentosPorVencer}\n\n✅ **Tareas:**\n• Para hoy: ${resumenSemanal.tareasParaHoy}\n• Para esta semana: ${resumenSemanal.tareasParaSemana}\n\n${s.docsRecientes > 0 ? `📌 **Documento más reciente:** ${docMasReciente?.nombre || 'N/A'}` : ''}\n\n¿Quieres más detalles sobre algún aspecto?`,
            suggestions: ['Documentos por vencer', 'Mis tareas', 'Estadísticas completas', '¿Qué documentos se subieron?'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE DOCUMENTOS RECIENTES ==========
    if (q.includes('documentos se subieron') || q.includes('qué documentos se subieron') || q.includes('documentos nuevos')) {
        const recientes = d.recientes || [];
        if (!recientes.length) {
            return {
                message: `📭 **No hay documentos subidos recientemente.**\n\n¿Quieres subir tu primer documento?`,
                suggestions: ['Subir documento', 'Ir a Documentos'],
                actions: [{ action: 'openModal', target: 'upload' }]
            };
        }
        const lista = recientes.map((x, i) =>
            `${i + 1}. **${x.nombre}** (${x.categoria}) — ${x.fecha}`
        ).join('\n');
        return {
            message: `📄 **Documentos subidos recientemente:**\n\n${lista}\n\n¿Quieres ver más detalles o subir uno nuevo?`,
            suggestions: ['Subir documento', 'Ver documentos por vencer', 'Buscar documento'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE TAREAS PARA HOY ==========
    if (q.includes('tareas para hoy') || q.includes('qué tengo que hacer hoy') || q.includes('tareas de hoy')) {
        if (t.paraHoy === 0) {
            return {
                message: `✨ **¡No tienes tareas para hoy!**\n\nExcelente, puedes aprovechar para:\n• Revisar documentos pendientes\n• Organizar tu semana\n• Crear nuevas tareas\n\n¿Quieres crear una tarea para hoy?`,
                suggestions: ['Crear tarea', 'Ver tareas pendientes', 'Documentos por vencer'],
                actions: [{ action: 'openModal', target: 'addTask' }]
            };
        }
        const tareasHoy = t.lista?.filter(x => x.fechaLimite === new Date().toLocaleDateString('es-MX')) || [];
        const lista = tareasHoy.map((x, i) =>
            `${i + 1}. **${x.titulo}** [${x.prioridad || 'media'}]`
        ).join('\n');
        return {
            message: `📅 **Tareas para hoy (${t.paraHoy}):**\n\n${lista}\n\n¿Quieres marcar alguna como completada?`,
            suggestions: ['Marcar como completada', 'Crear tarea', 'Ir a Tareas'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE CATEGORÍA MÁS USADA ==========
    if (q.includes('categoría más usada') || q.includes('categoría más popular') || q.includes('qué categoría tiene más documentos')) {
        if (!categoriaMasUsada) {
            return {
                message: `📁 **No hay suficientes datos** para determinar la categoría más usada.\n\n¿Quieres crear una categoría?`,
                suggestions: ['Crear categoría', 'Subir documento', 'Ver todas las categorías'],
                actions: [{ action: 'openModal', target: 'addCategory' }]
            };
        }
        return {
            message: `🏆 **Categoría más usada:** "${categoriaMasUsada.categoria}" con **${categoriaMasUsada.cantidad} documento(s)**.\n\n${d.porCategoria?.length > 1 ? `📊 **Otras categorías populares:**\n${d.porCategoria.slice(1, 4).map(c => `• ${c.categoria}: ${c.cantidad} documento(s)`).join('\n')}` : ''}`,
            suggestions: ['Ver documentos de esta categoría', 'Crear categoría', 'Subir documento'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE DEPARTAMENTO CON MÁS PERSONAS ==========
    if (q.includes('departamento con más personas') || q.includes('departamento más grande') || q.includes('dónde hay más gente')) {
        if (!deptoMasPersonas) {
            return {
                message: `🏢 **No hay suficientes datos** para determinar el departamento con más personas.\n\n¿Quieres agregar personas?`,
                suggestions: ['Agregar persona', 'Ver departamentos', 'Listar personas'],
                actions: [{ action: 'openModal', target: 'addPerson' }]
            };
        }
        return {
            message: `🏆 **Departamento con más personas:** "${deptoMasPersonas.departamento}" con **${deptoMasPersonas.cantidad} persona(s)**.\n\n${p.porDepartamento?.length > 1 ? `📊 **Otros departamentos:**\n${p.porDepartamento.slice(1, 4).map(d => `• ${d.departamento}: ${d.cantidad} persona(s)`).join('\n')}` : ''}`,
            suggestions: ['Ver personas de este departamento', 'Agregar persona', 'Ver todos los departamentos'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE DOCUMENTOS POR CATEGORÍA ==========
    if (q.includes('documentos por categoría') || q.includes('cómo están distribuidos los documentos')) {
        if (!d.porCategoria?.length) {
            return {
                message: `📁 **No hay documentos** para mostrar distribución por categoría.\n\n¿Quieres subir tu primer documento?`,
                suggestions: ['Subir documento', 'Crear categoría'],
                actions: [{ action: 'openModal', target: 'upload' }]
            };
        }
        const lista = d.porCategoria.map((c, i) =>
            `${i + 1}. 📁 **${c.categoria}**: ${c.cantidad} documento(s)`
        ).join('\n');
        return {
            message: `📊 **Distribución de documentos por categoría:**\n\n${lista}\n\n¿Quieres ver los documentos de alguna categoría específica?`,
            suggestions: ['Ver documentos de la categoría más usada', 'Subir documento', 'Crear categoría'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE PERSONAS POR DEPARTAMENTO ==========
    if (q.includes('personas por departamento') || q.includes('distribución de personas')) {
        if (!p.porDepartamento?.length) {
            return {
                message: `👥 **No hay personas registradas** para mostrar distribución.\n\n¿Quieres agregar la primera persona?`,
                suggestions: ['Agregar persona', 'Ver departamentos'],
                actions: [{ action: 'openModal', target: 'addPerson' }]
            };
        }
        const lista = p.porDepartamento.map((d, i) =>
            `${i + 1}. 🏢 **${d.departamento}**: ${d.cantidad} persona(s)`
        ).join('\n');
        return {
            message: `👥 **Distribución de personas por departamento:**\n\n${lista}\n\n¿Quieres ver la lista de personas de algún departamento?`,
            suggestions: ['Listar personas', 'Agregar persona', 'Ver departamentos'],
            actions: []
        };
    }

    // ========== PREGUNTAS SOBRE TAREAS COMPLETADAS ==========
    if (q.includes('tareas completé') || q.includes('tareas completadas') || q.includes('qué terminé')) {
        const completadas = t.completadasRecientes || [];
        if (completadas.length === 0) {
            return {
                message: `📝 **No tienes tareas completadas aún.**\n\n¡Es momento de empezar a completar tareas! 🎯\n\n¿Quieres crear una nueva tarea?`,
                suggestions: ['Crear tarea', 'Ver tareas pendientes', 'Ir a Tareas'],
                actions: [{ action: 'openModal', target: 'addTask' }]
            };
        }
        const lista = completadas.map((x, i) =>
            `${i + 1}. ✅ **${x.titulo}** — Completada el ${x.fechaCompletada}`
        ).join('\n');
        return {
            message: `🎉 **Tareas completadas recientemente (${completadas.length}):**\n\n${lista}\n\n¡Buen trabajo! ¿Quieres crear una nueva tarea?`,
            suggestions: ['Crear tarea', 'Ver tareas pendientes', 'Resumen de la semana'],
            actions: [{ action: 'openModal', target: 'addTask' }]
        };
    }

    // ========== PREGUNTAS SOBRE ESTADÍSTICAS COMPLETAS ==========
    if (q.includes('estadísticas completas') || q.includes('reporte completo') || q.includes('todo el sistema')) {
        return {
            message: `**📊 REPORTE COMPLETO DEL SISTEMA CBTIS 051**\n\n` +
                `📄 **DOCUMENTOS:** ${s.totalDocs || 0} totales\n` +
                `   • Subidos esta semana: ${s.docsRecientes || 0}\n` +
                `   • Subidos hoy: ${s.docsSubidosHoy || 0}\n` +
                `   • Subidos este mes: ${s.docsSubidosEsteMes || 0}\n` +
                `   • Por vencer (7 días): ${s.docsPorVencer7 || 0}\n` +
                `   • Por vencer (15 días): ${s.docsPorVencer15 || 0}\n` +
                `   • Por vencer (30 días): ${s.docsPorVencer30 || 0}\n` +
                `   • Vencidos: ${s.docsVencidos || 0}\n\n` +
                `👥 **PERSONAS:** ${s.totalPersonas || 0} registradas\n` +
                `   • Departamentos: ${s.totalDeptos || 0}\n\n` +
                `✅ **TAREAS:**\n` +
                `   • Pendientes: ${t.pendientes || 0}\n` +
                `   • En progreso: ${t.enProgreso || 0}\n` +
                `   • Completadas: ${t.completadas || 0}\n` +
                `   • Vencidas: ${t.vencidas || 0}\n` +
                `   • Para hoy: ${t.paraHoy || 0}\n` +
                `   • Para esta semana: ${t.paraEstaSemana || 0}\n\n` +
                `📁 **CATEGORÍAS:** ${s.totalCategorias || 0}\n\n` +
                `🏆 **INSIGHTS:**\n` +
                `   • Categoría más usada: ${categoriaMasUsada ? `${categoriaMasUsada.categoria} (${categoriaMasUsada.cantidad} docs)` : 'N/A'}\n` +
                `   • Departamento con más personas: ${deptoMasPersonas ? `${deptoMasPersonas.departamento} (${deptoMasPersonas.cantidad} personas)` : 'N/A'}\n` +
                `   • Documento más reciente: ${docMasReciente ? docMasReciente.nombre : 'N/A'}\n\n` +
                `📅 **Fecha:** ${new Date().toLocaleString('es-MX')}\n\n` +
                `¿Quieres generar un reporte en Excel o ver más detalles?`,
            suggestions: ['Generar reporte Excel', 'Ver documentos por vencer', 'Mis tareas', 'Resumen de la semana'],
            actions: [{ action: 'navigate', target: 'reportes' }]
        };
    }

    // ========== ACCIONES EXPLÍCITAS ==========
    if (q.includes('subir') && (q.includes('documento') || q.includes('archivo'))) {
        return {
            message: `📤 **Abriendo el modal para subir documento**\n\nPuedes arrastrar tu archivo o seleccionarlo.\n\n✅ Formatos: PDF, Word, Excel, imágenes\n📦 Máximo: 1 GB\n\n¿Qué tipo de documento vas a subir?`,
            suggestions: ['¿Cómo busco documentos?', 'Ver documentos recientes', 'Formatos permitidos'],
            actions: [{ action: 'openModal', target: 'upload' }]
        };
    }

    if ((q.includes('agregar') || q.includes('crear') || q.includes('nueva')) && (q.includes('persona') || q.includes('usuario'))) {
        return {
            message: `👤 **Abriendo el formulario para agregar una persona**\n\nCompleta los datos para registrar a un nuevo usuario.\n\n📋 Campos: Nombre, Email, Teléfono, Departamento, Puesto`,
            suggestions: ['Ver lista de personas', 'Ver departamentos', '¿Cómo asignar departamento?'],
            actions: [{ action: 'openModal', target: 'addPerson' }]
        };
    }

    if ((q.includes('crear') || q.includes('nueva')) && q.includes('tarea')) {
        return {
            message: `✅ **Abriendo el formulario para crear una nueva tarea**\n\nAsigna título, descripción, prioridad y fecha límite.\n\n💡 Tip: Las tareas de alta prioridad aparecen destacadas en el Dashboard.`,
            suggestions: ['Ver mis tareas', 'Ver tareas vencidas', '¿Cómo asignar tareas a otros?'],
            actions: [{ action: 'openModal', target: 'addTask' }]
        };
    }

    if ((q.includes('crear') || q.includes('nueva')) && (q.includes('categoría') || q.includes('carpeta'))) {
        return {
            message: `📁 **Abriendo el formulario para crear una nueva categoría**\n\nPuedes asignar un nombre, descripción, color e ícono.\n\n🎨 El color ayudará a identificar fácilmente los documentos.`,
            suggestions: ['Ver todas las categorías', 'Subir documento', '¿Cuál es la categoría más usada?'],
            actions: [{ action: 'openModal', target: 'addCategory' }]
        };
    }

    // ========== AYUDA ==========
    if (q.includes('ayuda') || q.includes('help') || q.includes('qué puedes') || q.includes('comandos')) {
        return {
            message: `**🎯 COMANDOS Y PREGUNTAS QUE PUEDO RESPONDER**\n\n` +
                `**📊 PREGUNTAS DE ESTADÍSTICAS:**\n` +
                `• "¿Cuántos documentos hay?"\n` +
                `• "Estadísticas del sistema"\n` +
                `• "Resumen de la semana"\n` +
                `• "¿Cuántos documentos se subieron esta semana?"\n` +
                `• "¿Qué documentos se subieron hoy?"\n\n` +
                `**✅ TAREAS:**\n` +
                `• "Mis tareas pendientes"\n` +
                `• "¿Qué tareas tengo para hoy?"\n` +
                `• "Tareas vencidas"\n` +
                `• "¿Qué tareas completé esta semana?"\n` +
                `• "Crear nueva tarea"\n\n` +
                `**📄 DOCUMENTOS:**\n` +
                `• "Documentos recientes"\n` +
                `• "Documentos por vencer"\n` +
                `• "Documentos vencidos"\n` +
                `• "¿Cuál es la categoría más usada?"\n` +
                `• "Documentos por categoría"\n` +
                `• "Subir documento"\n` +
                `• "Buscar [término]"\n\n` +
                `**👥 PERSONAS:**\n` +
                `• "Listar personas"\n` +
                `• "Buscar [nombre]"\n` +
                `• "¿Cuántas personas hay en el departamento X?"\n` +
                `• "Personas por departamento"\n` +
                `• "Agregar persona"\n\n` +
                `**📁 CATEGORÍAS Y DEPARTAMENTOS:**\n` +
                `• "Listar categorías"\n` +
                `• "Listar departamentos"\n` +
                `• "Documentos de [categoría]"\n` +
                `• "Personas de [departamento]"\n` +
                `• "Crear categoría"\n\n` +
                `**🗺️ NAVEGACIÓN:**\n` +
                `• "Ir a documentos"\n` +
                `• "Ir a tareas"\n` +
                `• "Ir a reportes"\n\n` +
                `¿Qué quieres hacer?`,
            suggestions: ['Resumen de la semana', 'Mis tareas', 'Documentos por vencer', '¿Cuál es la categoría más usada?'],
            actions: []
        };
    }

    // ========== SALUDO ==========
    if (q.includes('hola') || q.includes('buenos días') || q.includes('buenas tardes') || q.includes('buenas noches')) {
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const alertaMensaje = s.docsPorVencer7 > 0 ? `\n\n⚠️ **Alerta:** Tienes ${s.docsPorVencer7} documento(s) por vencer en 7 días.` : '';
        
        return {
            message: `${saludo} 👋\n\nSoy **ARIA**, tu asistente virtual. Puedo ayudarte con:\n\n• 📊 **Estadísticas** del sistema\n• 📄 **Documentos** (subir, buscar, por vencer)\n• ✅ **Tareas** (pendientes, crear, vencidas)\n• 👥 **Personas** (listar, buscar, agregar)\n• 🗺️ **Navegación** (ir a cualquier sección)\n• 🏆 **Insights** (categorías más usadas, departamentos)${alertaMensaje}\n\n¿En qué te ayudo hoy?`,
            suggestions: ['Resumen de la semana', 'Mis tareas', 'Documentos por vencer', '¿Cuál es la categoría más usada?'],
            actions: []
        };
    }

    // ========== RESPUESTA POR DEFECTO ==========
    return {
        message: `🤔 No estoy segura de entender "${message}".\n\n` +
            `Puedo ayudarte con:\n\n` +
            `• **Preguntas:** "¿Cuántos documentos hay?", "Resumen de la semana", "¿Qué tareas tengo para hoy?"\n` +
            `• **Listar:** "Listar personas", "Documentos por categoría", "Personas por departamento"\n` +
            `• **Acciones:** "Subir documento", "Crear tarea", "Agregar persona"\n` +
            `• **Navegación:** "Ir a documentos", "Ir a tareas"\n` +
            `• **Insights:** "¿Cuál es la categoría más usada?", "¿Qué departamento tiene más personas?"\n` +
            `• **Ayuda:** "¿Qué puedes hacer?"\n\n` +
            `¿En qué te ayudo?`,
        suggestions: ['Resumen de la semana', 'Mis tareas', 'Documentos por vencer', '¿Cuál es la categoría más usada?', 'Ir a Documentos'],
        actions: []
    };
}

// ──────────────────────────────────────────────────────────────
// SUGERENCIAS CONTEXTUALES MEJORADAS
// ──────────────────────────────────────────────────────────────
function buildSuggestions(message, ctx) {
    const q = message.toLowerCase();
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const out = [];

    if (s.docsPorVencer7 > 0 && !q.includes('vencer'))
        out.push(`Ver ${s.docsPorVencer7} documento(s) por vencer`);
    if (t.vencidas > 0 && !q.includes('tarea'))
        out.push(`Atender ${t.vencidas} tarea(s) vencida(s)`);
    if (t.pendientes > 0 && !q.includes('tarea') && !q.includes('pendiente'))
        out.push(`Mis ${t.pendientes} tarea(s) pendiente(s)`);
    if (t.paraHoy > 0 && !q.includes('hoy'))
        out.push(`Tareas para hoy (${t.paraHoy})`);
    if (s.docsRecientes > 0 && !q.includes('reciente'))
        out.push(`Documentos recientes`);

    if (q.includes('documento')) out.push('Subir documento', 'Documentos por vencer');
    else if (q.includes('tarea')) out.push('Crear nueva tarea', 'Tareas para hoy');
    else if (q.includes('persona')) out.push('Agregar persona', 'Personas por departamento');
    else if (q.includes('categoría')) out.push('Crear categoría', 'Documentos por categoría');
    else if (q.includes('departamento')) out.push('Ver departamentos', 'Personas por departamento');
    else if (q.includes('reporte')) out.push('Reporte completo', 'Resumen de la semana');
    else if (out.length === 0)
        out.push('Resumen de la semana', 'Mis tareas', 'Documentos por vencer', '¿Cuál es la categoría más usada?', 'Subir documento');

    return [...new Set(out)].slice(0, 5);
}

// ──────────────────────────────────────────────────────────────
// CONTROLLER PRINCIPAL
// ──────────────────────────────────────────────────────────────
class ChatbotController {

    async processMessage(req, res) {
        const t0 = Date.now();
        const userId = req.user?.id || req.user?._id;
        const { message } = req.body;

        if (!message || typeof message !== 'string' || !message.trim())
            return res.status(400).json({ success: false, message: 'Mensaje vacío.' });
        if (message.trim().length > 1000)
            return res.status(400).json({ success: false, message: 'Mensaje demasiado largo (máx. 1000 caracteres).' });

        const msg = message.trim();
        debug.log(`Mensaje: "${msg.substring(0, 80)}"`);

        try {
            const [ctx, history] = await Promise.all([
                buildSystemContext(userId),
                getConvHistory(userId, 6),
            ]);

            const userInfo = {
                nombre: req.user?.nombre || req.user?.usuario || req.user?.name || 'Usuario',
                rol: req.user?.rol || req.user?.role || 'usuario',
                id: userId,
            };

            // Intentar con Groq
            if (process.env.GROQ_API_KEY) {
                try {
                    const systemPrompt = buildSystemPrompt(ctx, userInfo);
                    const { text: raw } = await callGroq(systemPrompt, [
                        ...history,
                        { role: 'user', content: msg },
                    ]);

                    const actions = extractActions(raw);
                    const cleanMsg = cleanText(raw);
                    const latency = Date.now() - t0;
                    const suggestions = buildSuggestions(msg, ctx);

                    debug.info(`Groq OK en ${latency}ms`);
                    const conversation = await saveConv(userId, msg, cleanMsg, { fuente: 'groq', latencia: latency });
                    const conversationId = conversation?._id;

                    return res.json({
                        success: true,
                        data: {
                            message: cleanMsg,
                            actions,
                            suggestions,
                            source: 'groq',
                            latency,
                            conversationId,
                        },
                    });

                } catch (groqErr) {
                    debug.warn('Groq falló:', groqErr.message);
                }
            }

            // Fallback
            const fb = ruleBasedResponse(msg, ctx);
            const latency = Date.now() - t0;
            const actions = fb.actions ?? extractActions(fb.message ?? '');
            const cleanMsg = cleanText(fb.message ?? '');
            const suggestions = fb.suggestions ?? buildSuggestions(msg, ctx);

            const conversation = await saveConv(userId, msg, cleanMsg, { fuente: 'rule-based', latencia: latency });
            const conversationId = conversation?._id;

            return res.json({
                success: true,
                data: {
                    message: cleanMsg,
                    actions,
                    suggestions,
                    source: 'rule-based',
                    latency,
                    conversationId,
                },
            });

        } catch (err) {
            debug.error('Error:', err);
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
                    tareas: ctx.tareas,
                    documentosUrgentes: ctx.docs.urgentes,
                    ultimosDocumentos: ctx.docs.recientes,
                    documentosVencidos: ctx.docs.vencidos,
                    documentosPorCategoria: ctx.docs.porCategoria,
                    personas: ctx.personas,
                    personasPorDepartamento: ctx.personas.porDepartamento,
                    categorias: ctx.categorias,
                    departamentos: ctx.departamentos,
                    insights: {
                        categoriaMasUsada: obtenerCategoriaMasUsada(ctx),
                        departamentoConMasPersonas: obtenerDepartamentoConMasPersonas(ctx),
                        documentoMasReciente: obtenerDocumentoMasReciente(ctx),
                        resumenSemanal: obtenerResumenSemanal(ctx),
                    },
                },
            });
        } catch (err) {
            debug.error('Error en getSystemStats:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener estadísticas.' });
        }
    }

    async getHistory(req, res) {
        const userId = req.user?.id || req.user?._id;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        try {
            const rows = await Conversation.find({ usuario: userId })
                .sort({ timestamp: -1 }).limit(limit).lean();
            return res.json({
                success: true,
                data: rows.reverse().map(r => ({
                    _id: r._id,
                    userMessage: r.mensajeUsuario,
                    botResponse: r.respuestaBot,
                    timestamp: r.timestamp,
                    util: r.util,
                    source: r.fuente,
                })),
            });
        } catch (err) {
            debug.error('Error en getHistory:', err);
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
            debug.error('Error en clearHistory:', err);
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
            if (!result) {
                return res.status(404).json({ success: false, message: 'Conversación no encontrada.' });
            }
            return res.json({ success: true, message: 'Feedback registrado. ¡Gracias!' });
        } catch (err) {
            debug.error('Error en submitFeedback:', err);
            return res.status(500).json({ success: false });
        }
    }
}

export default new ChatbotController();