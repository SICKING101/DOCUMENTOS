// ============================================================
// chatbotController.js — Motor IA del Asistente ARIA - CBTIS051
// Con inteligencia completa para responder preguntas y ejecutar acciones
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
// CONTEXTO COMPLETO DEL SISTEMA
// ──────────────────────────────────────────────────────────────
async function buildSystemContext(userId) {
    debug.log('Construyendo contexto completo para userId:', userId);
    const ctx = { stats: {}, tareas: {}, docs: {}, personas: {}, categorias: [], departamentos: [] };

    try {
        const ahora = new Date();
        const en7d = new Date(ahora.getTime() + 7 * 86400000);
        const en30d = new Date(ahora.getTime() + 30 * 86400000);
        const hace7d = new Date(ahora.getTime() - 7 * 86400000);

        // Estadísticas globales
        const [
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer7, docsPorVencer30, docsVencidos, docsRecientes,
        ] = await Promise.all([
            Document.countDocuments({ activo: true }),
            Person.countDocuments({ activo: true }),
            Category.countDocuments({ activo: true }),
            Department.countDocuments({ activo: true }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en7d } }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en30d } }),
            Document.countDocuments({ activo: true, fecha_vencimiento: { $lt: ahora } }),
            Document.countDocuments({ activo: true, fecha_subida: { $gte: hace7d } }),
        ]);

        ctx.stats = {
            totalDocs, totalPersonas, totalCategorias, totalDeptos,
            docsPorVencer7, docsPorVencer30, docsVencidos, docsRecientes
        };

        // Tareas del usuario
        try {
            const f = { $or: [{ asignadoA: userId }, { creador: userId }] };
            const [tPend, tProg, tComp, tVenc] = await Promise.all([
                Task.countDocuments({ ...f, estado: 'pendiente' }),
                Task.countDocuments({ ...f, estado: 'en-progreso' }),
                Task.countDocuments({ ...f, estado: 'completada' }),
                Task.countDocuments({ ...f, estado: { $in: ['pendiente', 'en-progreso'] }, fechaLimite: { $lt: ahora } }),
            ]);
            const lista = await Task.find({ ...f, estado: { $in: ['pendiente', 'en-progreso'] } })
                .sort({ prioridad: -1, fechaLimite: 1 }).limit(5).lean();

            ctx.tareas = {
                pendientes: tPend, enProgreso: tProg, completadas: tComp, vencidas: tVenc,
                lista: lista.map(t => ({
                    titulo: t.titulo,
                    descripcion: t.descripcion,
                    prioridad: t.prioridad,
                    estado: t.estado,
                    fechaLimite: t.fechaLimite ? new Date(t.fechaLimite).toLocaleDateString('es-MX') : null,
                })),
            };
        } catch (e) {
            debug.warn('Módulo Task no disponible:', e.message);
            ctx.tareas = { pendientes: 0, enProgreso: 0, completadas: 0, vencidas: 0, lista: [] };
        }

        // Documentos
        const [ultimosDocs, docsUrgentes, todosDocs] = await Promise.all([
            Document.find({ activo: true }).sort({ fecha_subida: -1 }).limit(5)
                .populate('categoria', 'nombre').lean(),
            Document.find({ activo: true, fecha_vencimiento: { $gte: ahora, $lte: en7d } })
                .sort({ fecha_vencimiento: 1 }).limit(5).lean(),
            Document.find({ activo: true }).limit(10).lean(),
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
            todos: todosDocs.map(d => ({
                nombre: d.nombre_original,
                categoria: d.categoria?.nombre || 'Sin categoría',
            })),
        };

        // Personas
        const personas = await Person.find({ activo: true }).limit(10).lean();
        ctx.personas = {
            total: totalPersonas,
            lista: personas.map(p => ({
                nombre: p.nombre,
                email: p.email,
                departamento: p.departamento,
                puesto: p.puesto,
            })),
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
// SYSTEM PROMPT COMPLETO
// ──────────────────────────────────────────────────────────────
function buildSystemPrompt(ctx, userInfo) {
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const d = ctx.docs || {};
    const p = ctx.personas || {};

    const alertas = [];
    if (s.docsPorVencer7 > 0) alertas.push(`- 🚨 URGENTE: ${s.docsPorVencer7} documento(s) vencen en menos de 7 días`);
    if (s.docsVencidos > 0) alertas.push(`- ❌ CRÍTICO: ${s.docsVencidos} documento(s) ya están vencidos`);
    if (t.vencidas > 0) alertas.push(`- ⏰ ATENCIÓN: ${t.vencidas} tarea(s) vencidas sin resolver`);
    if (t.pendientes > 0 && t.pendientes > 5) alertas.push(`- 📋 ${t.pendientes} tareas pendientes, revisa tus prioridades`);

    const tareasLista = t.lista?.length
        ? t.lista.map(x =>
            `  • [${(x.prioridad || 'media').toUpperCase()}] ${x.titulo}` +
            (x.fechaLimite ? ` — vence ${x.fechaLimite}` : '')
        ).join('\n')
        : '  ✨ Sin tareas pendientes. ¡Todo al día!';

    const docsRecientes = d.recientes?.length
        ? d.recientes.map(x => `  • 📄 ${x.nombre} (${x.categoria}) — ${x.fecha}`).join('\n')
        : '  📭 No hay documentos recientes';

    const docsUrgentes = d.urgentes?.length
        ? d.urgentes.map(x => `  • ⚠️ ${x.nombre} — vence en ${x.diasRestantes} día(s) (${x.vence})`).join('\n')
        : '  ✅ Ningún documento crítico por vencer';

    const personasLista = p.lista?.length
        ? p.lista.slice(0, 5).map(x => `  • 👤 ${x.nombre} - ${x.email || 'sin email'} (${x.departamento || 'sin departamento'})`).join('\n')
        : '  📭 No hay personas registradas';

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
- ⚠️ Por vencer (7 días): ${s.docsPorVencer7 || 0}
- 📅 Por vencer (30 días): ${s.docsPorVencer30 || 0}
- ❌ Vencidos: ${s.docsVencidos || 0}
- 👥 Personas registradas: ${s.totalPersonas || 0}
- 📁 Categorías: ${s.totalCategorias || 0}
- 🏢 Departamentos: ${s.totalDeptos || 0}

### ✅ TAREAS DEL USUARIO "${userInfo?.nombre || 'Usuario'}"
- Pendientes: ${t.pendientes || 0}
- En progreso: ${t.enProgreso || 0}
- Completadas: ${t.completadas || 0}
- Vencidas: ${t.vencidas || 0}

**Tareas urgentes:**
${tareasLista}

### 📄 DOCUMENTOS RECIENTES
${docsRecientes}

### 🚨 DOCUMENTOS URGENTES (vencen pronto)
${docsUrgentes}

### 👥 PERSONAS REGISTRADAS (primeras 5)
${personasLista}

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
   - "¿Qué tareas tengo?" → muestra lista de tareas
   - "¿Quién es fulano?" → busca en personas
   - "¿Cómo subo un documento?" → da instrucciones + acción openModal
3. **SI HAY ALERTAS**, menciónalas aunque no te pregunten.
4. **RESPUESTAS CONCISAS** pero completas. Usa negritas para datos clave.
5. **SIEMPRE SUGIERE** una siguiente acción relevante.
6. **PARA ACCIONES**, incluye el JSON correspondiente.
7. **RESPONDE SOLO EN ESPAÑOL MEXICANO**.

## 📋 EJEMPLOS DE RESPUESTA IDEAL

Usuario: "¿Cuántos documentos hay?"
Tú: "📊 Actualmente el sistema tiene **${s.totalDocs || 0} documentos activos**. De ellos, **${s.docsPorVencer7 || 0} vencen en los próximos 7 días**. ¿Quieres ver la lista de documentos por vencer?"

Usuario: "¿Qué tareas tengo pendientes?"
Tú: "✅ Tienes **${t.pendientes || 0} tarea(s) pendiente(s)**:
${t.lista?.length ? t.lista.map(x => `- **${x.titulo}** [${x.prioridad}]${x.fechaLimite ? ` - vence ${x.fechaLimite}` : ''}`).join('\n') : '✨ No tienes tareas pendientes. ¡Excelente trabajo!'}
¿Quieres crear una nueva tarea o ir a la sección de Tareas?"

Usuario: "Subir documento"
Tú: "📤 Te ayudo a subir un documento.
\`\`\`json
{"action": "openModal", "target": "upload"}
\`\`\`"`;
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
        await Conversation.create({
            usuario: userId, mensajeUsuario: userMsg,
            respuestaBot: botMsg,
            fuente: extra.fuente ?? 'groq',
            latencia: extra.latencia ?? null,
        });
    } catch (e) {
        debug.warn('Error guardando conversación:', e.message);
    }
}

// ============================================================
// FALLBACK INTELIGENTE (sin IA) - CORREGIDO
// Solo muestra información, NO abre modales automáticamente
// ============================================================
function ruleBasedResponse(message, ctx) {
    const q = message.toLowerCase().trim();
    const s = ctx.stats || {};
    const t = ctx.tareas || {};
    const d = ctx.docs || {};
    const p = ctx.personas || {};

    // ========== PREGUNTAS SOBRE CANTIDADES ==========
    if (q.includes('cuántos') || q.includes('cuantos') || q.includes('cuantas')) {
        if (q.includes('documento')) {
            return {
                message: `📊 **Documentos en el sistema:**\n\n• **${s.totalDocs || 0}** documentos activos\n• **${s.docsRecientes || 0}** subidos esta semana\n• **${s.docsPorVencer7 || 0}** por vencer en 7 días\n• **${s.docsVencidos || 0}** documentos vencidos\n\n¿Quieres ver los documentos por vencer?`,
                suggestions: ['Ver documentos por vencer', 'Subir documento', 'Ir a Documentos'],
                actions: [] // NO abrir modales automáticamente
            };
        }
        if (q.includes('persona') || q.includes('usuario')) {
            return {
                message: `👥 **Personas registradas:** ${s.totalPersonas || 0} personas en el sistema.`,
                suggestions: ['Listar personas', 'Agregar persona', 'Ver departamentos'],
                actions: [] // Solo información, no acción
            };
        }
        if (q.includes('tarea')) {
            return {
                message: `✅ **Tareas:** ${t.pendientes || 0} pendientes, ${t.enProgreso || 0} en progreso, ${t.completadas || 0} completadas, ${t.vencidas || 0} vencidas.`,
                suggestions: ['Ver mis tareas', 'Crear tarea', 'Ir a Tareas'],
                actions: [] // Solo información
            };
        }
        if (q.includes('categoría') || q.includes('categoria')) {
            return {
                message: `📁 **Categorías disponibles:** ${ctx.categorias?.length ? ctx.categorias.join(', ') : 'No hay categorías'}\n\n¿Quieres crear una nueva categoría?`,
                suggestions: ['Crear categoría', 'Ver documentos por categoría'],
                actions: [] // Solo información
            };
        }
        if (q.includes('departamento')) {
            return {
                message: `🏢 **Departamentos disponibles:** ${ctx.departamentos?.length ? ctx.departamentos.join(', ') : 'No hay departamentos'}`,
                suggestions: ['Ver personas por departamento', 'Crear departamento'],
                actions: []
            };
        }
    }

    // ========== LISTAR PERSONAS (SOLO INFORMACIÓN) ==========
    if (q.includes('listar personas') || q.includes('mostrar personas') || q.includes('ver personas') || 
        (q.includes('personas') && !q.includes('agregar') && !q.includes('crear'))) {
        const personas = p.lista || [];
        if (!personas.length) {
            return {
                message: `👥 **No hay personas registradas.**\n\nPuedes agregar la primera persona usando "agregar persona".`,
                suggestions: ['Agregar persona', 'Ver departamentos'],
                actions: [] // NO abrir modal automáticamente
            };
        }
        const lista = personas.slice(0, 10).map((x, i) =>
            `${i + 1}. **${x.nombre}** — ${x.email || 'sin email'} (${x.departamento || 'sin departamento'})${x.puesto ? ` - ${x.puesto}` : ''}`
        ).join('\n');
        return {
            message: `👥 **Personas registradas (${p.total} total):**\n\n${lista}${p.total > 10 ? `\n\n... y ${p.total - 10} más.` : ''}\n\n¿Quieres agregar una nueva persona o buscar a alguien en específico?`,
            suggestions: ['Agregar persona', 'Buscar persona', 'Ver departamentos'],
            actions: [] // Solo información, el usuario decide si quiere agregar
        };
    }

    // ========== BUSCAR PERSONA ESPECÍFICA ==========
    if (q.includes('buscar') && (q.includes('persona') || q.includes('usuario'))) {
        const nombreBuscar = q.replace(/buscar|persona|usuario|a|al/g, '').trim();
        if (nombreBuscar && nombreBuscar.length > 2) {
            const encontrada = p.lista?.find(p => p.nombre.toLowerCase().includes(nombreBuscar));
            if (encontrada) {
                return {
                    message: `👤 **${encontrada.nombre}**\n\n📧 Email: ${encontrada.email || 'No registrado'}\n📞 Teléfono: ${encontrada.telefono || 'No registrado'}\n🏢 Departamento: ${encontrada.departamento || 'Sin asignar'}\n💼 Puesto: ${encontrada.puesto || 'No especificado'}\n\n¿Quieres ver los documentos de esta persona?`,
                    suggestions: [`Documentos de ${encontrada.nombre}`, 'Editar persona', 'Agregar persona'],
                    actions: [] // Solo información
                };
            }
            return {
                message: `🔍 **No encontré a "${nombreBuscar}"** en el sistema.\n\n¿Quieres agregar una nueva persona o ver la lista completa?`,
                suggestions: ['Agregar persona', 'Listar todas las personas'],
                actions: []
            };
        }
    }

    // ========== LISTAR DEPARTAMENTOS ==========
    if (q.includes('listar departamentos') || q.includes('ver departamentos') || (q.includes('departamentos') && !q.includes('crear'))) {
        const deptos = ctx.departamentos || [];
        if (!deptos.length) {
            return {
                message: `🏢 **No hay departamentos registrados.**\n\nPuedes crear el primer departamento desde el panel de administración.`,
                suggestions: ['Crear departamento', 'Ver personas'],
                actions: []
            };
        }
        return {
            message: `🏢 **Departamentos disponibles (${deptos.length}):**\n\n${deptos.map((d, i) => `${i + 1}. ${d}`).join('\n')}\n\n¿Quieres ver las personas de algún departamento?`,
            suggestions: ['Ver personas por departamento', 'Crear departamento'],
            actions: []
        };
    }

    // ========== LISTAR CATEGORÍAS ==========
    if (q.includes('listar categorías') || q.includes('ver categorías') || (q.includes('categorías') && !q.includes('crear'))) {
        const cats = ctx.categorias || [];
        if (!cats.length) {
            return {
                message: `📁 **No hay categorías registradas.**\n\nPuedes crear la primera categoría para organizar tus documentos.`,
                suggestions: ['Crear categoría', 'Subir documento'],
                actions: []
            };
        }
        return {
            message: `📁 **Categorías disponibles (${cats.length}):**\n\n${cats.map((c, i) => `${i + 1}. ${c}`).join('\n')}\n\n¿Quieres ver los documentos de alguna categoría?`,
            suggestions: ['Ver documentos por categoría', 'Crear categoría'],
            actions: []
        };
    }

    // ========== DOCUMENTOS POR CATEGORÍA ==========
    if ((q.includes('documentos de') || q.includes('documentos en')) && (q.includes('categoría') || cats.some(c => q.includes(c.toLowerCase())))) {
        let categoriaBuscada = '';
        for (const cat of cats) {
            if (q.includes(cat.toLowerCase())) {
                categoriaBuscada = cat;
                break;
            }
        }
        if (categoriaBuscada) {
            const docsEnCategoria = d.todos?.filter(doc => doc.categoria === categoriaBuscada) || [];
            if (docsEnCategoria.length === 0) {
                return {
                    message: `📁 **No hay documentos en la categoría "${categoriaBuscada}"**\n\n¿Quieres subir un documento a esta categoría?`,
                    suggestions: ['Subir documento', 'Ver todas las categorías'],
                    actions: []
                };
            }
            const lista = docsEnCategoria.slice(0, 5).map((doc, i) => `${i + 1}. **${doc.nombre}**`).join('\n');
            return {
                message: `📁 **Documentos en "${categoriaBuscada}" (${docsEnCategoria.length}):**\n\n${lista}${docsEnCategoria.length > 5 ? `\n\n... y ${docsEnCategoria.length - 5} más.` : ''}\n\n¿Quieres ver todos los documentos?`,
                suggestions: ['Ver todos los documentos', 'Subir documento', 'Ir a Documentos'],
                actions: [{ action: 'navigate', target: 'documentos' }]
            };
        }
    }

    // ========== TAREAS (SOLO INFORMACIÓN) ==========
    if (q.includes('mis tareas') || (q.includes('tareas') && q.includes('pendientes'))) {
        if (t.pendientes === 0 && t.enProgreso === 0) {
            return {
                message: `✨ **¡No tienes tareas pendientes!**\n\nExcelente trabajo. ¿Quieres crear una nueva tarea?`,
                suggestions: ['Crear nueva tarea', 'Ir a Tareas', 'Ver documentos'],
                actions: [] // NO abrir modal automáticamente
            };
        }
        const lista = t.lista?.length
            ? t.lista.map((x, i) => `${i + 1}. **${x.titulo}** [${x.prioridad || 'media'}]${x.fechaLimite ? ` — vence ${x.fechaLimite}` : ''}`).join('\n')
            : 'No hay tareas pendientes detalladas.';
        return {
            message: `✅ **Tus tareas pendientes (${t.pendientes}):**\n\n${lista}\n\n¿Quieres marcar alguna como completada o crear una nueva?`,
            suggestions: ['Crear nueva tarea', 'Ir a Tareas', 'Marcar como completada'],
            actions: [] // Solo información
        };
    }

    // ========== TAREAS VENCIDAS ==========
    if (q.includes('tareas vencidas') || (q.includes('tareas') && q.includes('atrasadas'))) {
        if (t.vencidas === 0) {
            return {
                message: `✅ **No tienes tareas vencidas.** ¡Todo al día! 🎉`,
                suggestions: ['Ver tareas pendientes', 'Crear tarea'],
                actions: []
            };
        }
        const vencidas = t.lista?.filter(x => new Date(x.fechaLimite) < new Date()) || [];
        const lista = vencidas.map((x, i) => `${i + 1}. ⚠️ **${x.titulo}** — vencía el ${x.fechaLimite}`).join('\n');
        return {
            message: `⚠️ **Tienes ${t.vencidas} tarea(s) vencida(s):**\n\n${lista}\n\nTe recomiendo atenderlas lo antes posible.`,
            suggestions: ['Ir a Tareas', 'Crear nueva tarea'],
            actions: [{ action: 'navigate', target: 'tareas' }]
        };
    }

    // ========== DOCUMENTOS POR VENCER ==========
    if (q.includes('vencer') || q.includes('por vencer') || q.includes('próximos a vencer')) {
        const urgentes = d.urgentes || [];
        if (!urgentes.length) {
            return {
                message: `✅ **No hay documentos por vencer en los próximos 7 días.**\n\nEn los próximos 30 días: **${s.docsPorVencer30 || 0}** documentos.`,
                suggestions: ['Ver todos los documentos', 'Subir documento', 'Ir a Documentos'],
                actions: [{ action: 'navigate', target: 'documentos' }]
            };
        }
        const lista = urgentes.map((x, i) =>
            `${i + 1}. **${x.nombre}** — vence en **${x.diasRestantes}** día(s) (${x.vence})`
        ).join('\n');
        return {
            message: `⚠️ **${urgentes.length} documento(s) por vencer en 7 días:**\n\n${lista}\n\nTe recomiendo revisarlos pronto.`,
            suggestions: ['Ir a Documentos', 'Generar reporte', 'Subir documento'],
            actions: [{ action: 'navigate', target: 'documentos' }]
        };
    }

    // ========== DOCUMENTOS RECIENTES ==========
    if (q.includes('documentos recientes') || q.includes('últimos documentos')) {
        const recientes = d.recientes || [];
        if (!recientes.length) {
            return {
                message: `📭 **No hay documentos recientes.**\n\nSube tu primer documento para comenzar.`,
                suggestions: ['Subir documento', 'Ir a Documentos'],
                actions: [] // Solo información
            };
        }
        const lista = recientes.map((x, i) =>
            `${i + 1}. **${x.nombre}** (${x.categoria}) — ${x.fecha}`
        ).join('\n');
        return {
            message: `📄 **Documentos recientes:**\n\n${lista}\n\n¿Quieres ver más detalles o subir uno nuevo?`,
            suggestions: ['Subir documento', 'Ver todos', 'Buscar documento'],
            actions: [] // Solo información
        };
    }

    // ========== DOCUMENTOS VENCIDOS ==========
    if (q.includes('documentos vencidos') || q.includes('vencidos')) {
        if (s.docsVencidos === 0) {
            return {
                message: `✅ **No hay documentos vencidos.** Todo está en orden.`,
                suggestions: ['Ver documentos por vencer', 'Subir documento'],
                actions: []
            };
        }
        return {
            message: `❌ **Hay ${s.docsVencidos} documento(s) vencido(s).**\n\nTe recomiendo revisarlos y actualizarlos si es necesario.`,
            suggestions: ['Ver documentos vencidos', 'Subir documento', 'Ir a Documentos'],
            actions: [{ action: 'navigate', target: 'documentos' }]
        };
    }

    // ========== ESTADÍSTICAS COMPLETAS ==========
    if (q.includes('estadísticas completas') || q.includes('reporte completo') || (q.includes('estadística') && q.includes('todo'))) {
        return {
            message: `**📊 REPORTE COMPLETO DEL SISTEMA CBTIS 051**\n\n` +
                `📄 **DOCUMENTOS:** ${s.totalDocs || 0} totales\n` +
                `   • Subidos esta semana: ${s.docsRecientes || 0}\n` +
                `   • Por vencer (7 días): ${s.docsPorVencer7 || 0}\n` +
                `   • Por vencer (30 días): ${s.docsPorVencer30 || 0}\n` +
                `   • Vencidos: ${s.docsVencidos || 0}\n\n` +
                `👥 **PERSONAS:** ${s.totalPersonas || 0} registradas\n\n` +
                `✅ **TAREAS:**\n` +
                `   • Pendientes: ${t.pendientes || 0}\n` +
                `   • En progreso: ${t.enProgreso || 0}\n` +
                `   • Completadas: ${t.completadas || 0}\n` +
                `   • Vencidas: ${t.vencidas || 0}\n\n` +
                `📁 **CATEGORÍAS:** ${s.totalCategorias || 0}\n\n` +
                `🏢 **DEPARTAMENTOS:** ${s.totalDeptos || 0}\n\n` +
                `📅 **Fecha:** ${new Date().toLocaleString('es-MX')}\n\n` +
                `¿Quieres generar un reporte en Excel o ver más detalles?`,
            suggestions: ['Generar reporte Excel', 'Ver documentos por vencer', 'Mis tareas'],
            actions: [] // Solo información
        };
    }

    // ========== ESTADÍSTICAS RÁPIDAS ==========
    if (q.includes('estadística') || q.includes('resumen') || q.includes('estado del sistema') || q.includes('dashboard')) {
        return {
            message: `**📊 RESUMEN DEL SISTEMA:**\n\n📄 **Documentos:** ${s.totalDocs || 0}\n👥 **Personas:** ${s.totalPersonas || 0}\n✅ **Tareas pendientes:** ${t.pendientes || 0}\n⚠️ **Por vencer (7d):** ${s.docsPorVencer7 || 0}\n❌ **Vencidos:** ${s.docsVencidos || 0}\n\n¿Quieres más detalles o algún reporte específico?`,
            suggestions: ['Estadísticas completas', 'Documentos por vencer', 'Mis tareas'],
            actions: [] // Solo información
        };
    }

    // ========== NAVEGACIÓN ==========
    const navMap = {
        'dashboard': 'dashboard', 'panel principal': 'dashboard',
        'documentos': 'documentos', 'documento': 'documentos',
        'personas': 'personas', 'persona': 'personas',
        'tareas': 'tareas', 'tarea': 'tareas',
        'reportes': 'reportes', 'reporte': 'reportes',
        'papelera': 'papelera',
        'notificaciones': 'notificaciones', 'notificacion': 'notificaciones',
        'ajustes': 'ajustes', 'configuración': 'ajustes',
        'soporte': 'soporte'
    };
    for (const [kw, target] of Object.entries(navMap)) {
        if ((q.includes('ir a') || q.includes('llevame') || q.includes('muéstrame') || q.includes('abre')) && q.includes(kw)) {
            return {
                message: `📍 Te llevo a la sección de **${target.charAt(0).toUpperCase() + target.slice(1)}**.`,
                suggestions: ['Ver estadísticas', 'Ayuda'],
                actions: [{ action: 'navigate', target }]
            };
        }
    }

    // ========== ACCIONES EXPLÍCITAS (SOLO CUANDO EL USUARIO QUIERE EJECUTAR) ==========
    if (q.includes('subir') && (q.includes('documento') || q.includes('archivo'))) {
        return {
            message: `📤 **Abriendo el modal para subir documento**\n\nPuedes arrastrar tu archivo o seleccionarlo.\n\n✅ Formatos: PDF, Word, Excel, imágenes\n📦 Máximo: 1 GB`,
            suggestions: ['¿Cómo busco documentos?', 'Ver documentos recientes'],
            actions: [{ action: 'openModal', target: 'upload' }]
        };
    }

    if ((q.includes('agregar') || q.includes('crear') || q.includes('nueva')) && (q.includes('persona') || q.includes('usuario'))) {
        return {
            message: `👤 **Abriendo el formulario para agregar una persona**\n\nCompleta los datos para registrar a un nuevo usuario.`,
            suggestions: ['Ver lista de personas', 'Ver departamentos'],
            actions: [{ action: 'openModal', target: 'addPerson' }]
        };
    }

    if ((q.includes('crear') || q.includes('nueva')) && q.includes('tarea')) {
        return {
            message: `✅ **Abriendo el formulario para crear una nueva tarea**\n\nAsigna título, descripción, prioridad y fecha límite.`,
            suggestions: ['Ver mis tareas', 'Ver tareas vencidas'],
            actions: [{ action: 'openModal', target: 'addTask' }]
        };
    }

    if ((q.includes('crear') || q.includes('nueva')) && (q.includes('categoría') || q.includes('carpeta'))) {
        return {
            message: `📁 **Abriendo el formulario para crear una nueva categoría**\n\nPuedes asignar un nombre, descripción, color e ícono.`,
            suggestions: ['Ver todas las categorías', 'Subir documento'],
            actions: [{ action: 'openModal', target: 'addCategory' }]
        };
    }

    if ((q.includes('crear') || q.includes('nuevo')) && q.includes('departamento')) {
        return {
            message: `🏢 **Abriendo el formulario para crear un nuevo departamento**\n\nAsigna nombre, descripción y color.`,
            suggestions: ['Ver departamentos', 'Ver personas'],
            actions: [{ action: 'openModal', target: 'addDepartment' }]
        };
    }

    // ========== BÚSQUEDA ==========
    if (q.includes('buscar') && (q.includes('documento') || q.includes('archivo'))) {
        const term = q.replace(/buscar|documento|archivo|los|las|el|la/g, '').trim();
        if (term && term.length > 2) {
            return {
                message: `🔍 **Buscando documentos que contengan:** "${term}"\n\nTe llevo a la sección de Documentos para ver los resultados.`,
                suggestions: ['Búsqueda avanzada', 'Subir documento'],
                actions: [{ action: 'search', query: term, section: 'documentos' }]
            };
        }
        return {
            message: `🔍 **Búsqueda avanzada**\n\nPuedes filtrar por categoría, fecha, estado o persona.`,
            suggestions: ['Buscar por categoría', 'Buscar por fecha'],
            actions: [{ action: 'openModal', target: 'search' }]
        };
    }

    // ========== AYUDA ==========
    if (q.includes('ayuda') || q.includes('help') || q.includes('qué puedes') || q.includes('comandos')) {
        return {
            message: `**🎯 COMANDOS Y PREGUNTAS QUE PUEDO RESPONDER**\n\n` +
                `**📊 PREGUNTAS DE ESTADÍSTICAS:**\n` +
                `• "¿Cuántos documentos hay?"\n` +
                `• "Estadísticas del sistema"\n` +
                `• "Resumen del sistema"\n\n` +
                `**✅ TAREAS:**\n` +
                `• "Mis tareas pendientes"\n` +
                `• "¿Qué tareas tengo?"\n` +
                `• "Tareas vencidas"\n` +
                `• "Crear nueva tarea"\n\n` +
                `**📄 DOCUMENTOS:**\n` +
                `• "Documentos recientes"\n` +
                `• "Documentos por vencer"\n` +
                `• "Documentos vencidos"\n` +
                `• "Subir documento"\n` +
                `• "Buscar [término]"\n\n` +
                `**👥 PERSONAS:**\n` +
                `• "Listar personas"\n` +
                `• "Buscar [nombre]"\n` +
                `• "Agregar persona"\n\n` +
                `**📁 CATEGORÍAS:**\n` +
                `• "Listar categorías"\n` +
                `• "Documentos de [categoría]"\n` +
                `• "Crear categoría"\n\n` +
                `**🗺️ NAVEGACIÓN:**\n` +
                `• "Ir a documentos"\n` +
                `• "Ir a tareas"\n` +
                `• "Ir a reportes"\n\n` +
                `¿Qué quieres hacer?`,
            suggestions: ['Mis tareas', 'Documentos por vencer', 'Estadísticas', 'Ir a Documentos'],
            actions: []
        };
    }

    // ========== SALUDO ==========
    if (q.includes('hola') || q.includes('buenos días') || q.includes('buenas tardes') || q.includes('buenas noches')) {
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        return {
            message: `${saludo} 👋\n\nSoy **ARIA**, tu asistente virtual. Puedo ayudarte con:\n\n• 📊 **Estadísticas** del sistema\n• 📄 **Documentos** (subir, buscar, por vencer)\n• ✅ **Tareas** (pendientes, crear, vencidas)\n• 👥 **Personas** (listar, buscar, agregar)\n• 🗺️ **Navegación** (ir a cualquier sección)\n\n¿En qué te ayudo hoy?`,
            suggestions: ['Estadísticas', 'Mis tareas', 'Documentos recientes', 'Ayuda'],
            actions: []
        };
    }

    // ========== RESPUESTA POR DEFECTO ==========
    return {
        message: `🤔 No estoy segura de entender "${message}".\n\n` +
            `Puedo ayudarte con:\n\n` +
            `• **Preguntas:** "¿Cuántos documentos hay?", "Mis tareas pendientes"\n` +
            `• **Listar:** "Listar personas", "Ver categorías"\n` +
            `• **Acciones:** "Subir documento", "Crear tarea", "Agregar persona"\n` +
            `• **Navegación:** "Ir a documentos", "Ir a tareas"\n` +
            `• **Ayuda:** "¿Qué puedes hacer?"\n\n` +
            `¿En qué te ayudo?`,
        suggestions: ['Ayuda', 'Mis tareas', 'Documentos por vencer', 'Ir a Documentos'],
        actions: []
    };
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
                    saveConv(userId, msg, cleanMsg, { fuente: 'groq', latencia: latency });

                    return res.json({
                        success: true,
                        data: { message: cleanMsg, actions, suggestions, source: 'groq', latency },
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

            saveConv(userId, msg, cleanMsg, { fuente: 'rule-based', latencia: latency });

            return res.json({
                success: true,
                data: {
                    message: cleanMsg,
                    actions,
                    suggestions: fb.suggestions ?? buildSuggestions(msg, ctx),
                    source: 'rule-based',
                    latency,
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
                    personas: ctx.personas,
                    categorias: ctx.categorias,
                    departamentos: ctx.departamentos,
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
            await Conversation.findOneAndUpdate(
                { _id: conversationId, usuario: userId },
                { util: Boolean(util) }
            );
            return res.json({ success: true });
        } catch (err) {
            debug.error('Error en submitFeedback:', err);
            return res.status(500).json({ success: false });
        }
    }
}

export default new ChatbotController();