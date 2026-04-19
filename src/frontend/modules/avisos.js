// src/frontend/modules/avisos.js
import avisoService from '../services/avisoService.js';

let avisosModal = null;
let avisosVigentes = [];      // TODOS los avisos vigentes (vistos + no vistos)
let avisosNoVistos = [];      // Solo los NO vistos
let badgeElement = null;

const prioridadColor = { baja: '#10b981', media: '#f59e0b', alta: '#f97316', critica: '#ef4444' };
const tipoIcon = { general: '📢', mantenimiento: '🔧', importante: '⭐', actualizacion: '🔄', evento: '📅' };

function formatDate(d) { return d ? new Date(d).toLocaleDateString('es-MX') : ''; }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

export async function initAvisosModule() {
    console.log('📢 Inicializando módulo de avisos...');
    createAvisosModal();
    setupTopbarButton();
    
    await cargarAvisos();
    
    // Mostrar modal automático SOLO si hay NO VISTOS
    if (avisosNoVistos.length > 0) {
        console.log(`📢 Mostrando modal con ${avisosNoVistos.length} avisos no vistos`);
        setTimeout(() => showAvisosModal(), 800);
    }
}

async function cargarAvisos() {
    const r = await avisoService.getAvisosVigentes();
    if (r.success) {
        // El backend ya devuelve solo los NO VISTOS en "avisos"
        avisosNoVistos = r.avisos || [];
        
        // Para la sección, necesitamos TODOS los vigentes
        // Podemos obtenerlos con otro endpoint o filtrar del total
        await cargarTodosLosVigentes();
        
        updateBadge(avisosNoVistos.length);
        console.log(`📢 Avisos no vistos: ${avisosNoVistos.length}, Total vigentes: ${avisosVigentes.length}`);
    }
}

async function cargarTodosLosVigentes() {
    try {
        // Podemos usar el mismo endpoint pero sin filtrar por visto
        // O crear un endpoint nuevo: /avisos/todos
        const r = await avisoService.getTodosVigentes();
        if (r.success) {
            avisosVigentes = r.avisos || [];
        }
    } catch (e) {
        console.warn('No se pudo cargar todos los vigentes, usando solo no vistos');
        avisosVigentes = [...avisosNoVistos];
    }
}

function createAvisosModal() {
    if (document.getElementById('avisosModal')) return;
    const html = `
        <div id="avisosModal" class="modal" style="display: none;">
            <div class="modal__overlay"></div>
            <div class="modal__content modal__content--lg">
                <div class="modal__header">
                    <h3 class="modal__title"><i class="fas fa-bullhorn"></i> Avisos del Sistema</h3>
                    <button class="modal__close">&times;</button>
                </div>
                <div class="modal__body" id="avisosModalBody"></div>
                <div class="modal__footer">
                    <button class="btn btn--outline" id="marcarTodosVistosBtn">
                        <i class="fas fa-check-double"></i> Marcar todos como vistos
                    </button>
                    <button class="btn btn--primary" id="cerrarAvisosBtn">Cerrar</button>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    avisosModal = document.getElementById('avisosModal');
    avisosModal.querySelector('.modal__close').addEventListener('click', closeAvisosModal);
    document.getElementById('cerrarAvisosBtn').addEventListener('click', closeAvisosModal);
    avisosModal.querySelector('.modal__overlay').addEventListener('click', closeAvisosModal);
    document.getElementById('marcarTodosVistosBtn')?.addEventListener('click', marcarTodosVistos);
}

function setupTopbarButton() {
    const topbar = document.querySelector('.topbar__actions');
    if (!topbar || document.getElementById('avisosBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'avisosBtn'; 
    btn.className = 'topbar__action'; 
    btn.title = 'Avisos';
    btn.innerHTML = `<i class="fas fa-bullhorn"></i><span class="topbar__badge" id="avisosBadge" style="display:none;">0</span>`;
    const suggestions = document.getElementById('suggestionsBtn');
    suggestions ? topbar.insertBefore(btn, suggestions) : topbar.appendChild(btn);
    
    // CAMBIAR: Redirigir a la sección de avisos en lugar de abrir modal
    btn.addEventListener('click', () => {
        if (typeof window.switchTab === 'function') {
            window.switchTab('avisos');
        }
    });
    
    badgeElement = document.getElementById('avisosBadge');
}

function updateBadge(count) {
    if (badgeElement) {
        if (count > 0) { 
            badgeElement.textContent = count > 99 ? '99+' : count; 
            badgeElement.style.display = 'flex'; 
        } else {
            badgeElement.style.display = 'none';
        }
    }
}

export async function showAvisosModal() {
    if (!avisosModal) createAvisosModal();
    await cargarAvisos(); // Recargar antes de mostrar
    renderAvisosInModal();
    avisosModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeAvisosModal() {
    if (avisosModal) { 
        avisosModal.style.display = 'none'; 
        document.body.style.overflow = ''; 
    }
}

function renderAvisosInModal() {
    const body = document.getElementById('avisosModalBody');
    
    // Mostrar TODOS los vigentes (vistos + no vistos) en la sección
    const avisosAMostrar = avisosVigentes.length > 0 ? avisosVigentes : avisosNoVistos;
    
    if (!avisosAMostrar.length) {
        body.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <i class="fas fa-check-circle" style="font-size:48px;color:#10b981;"></i>
                <h4>¡Todo al día!</h4>
                <p>No hay avisos vigentes en este momento.</p>
            </div>`;
        return;
    }
    
    body.innerHTML = avisosAMostrar.map(a => {
        const estaVisto = !avisosNoVistos.some(nv => nv._id === a._id);
        
        return `
        <div class="aviso-card ${estaVisto ? 'aviso-card--visto' : ''}" style="
            border:1px solid var(--border);
            border-radius:12px;
            padding:16px;
            margin-bottom:12px;
            background:var(--bg-secondary);
            opacity: ${estaVisto ? '0.85' : '1'};
        ">
            <div style="display:flex;gap:12px;">
                <div style="width:40px;height:40px;border-radius:10px;background:${prioridadColor[a.prioridad]};display:flex;align-items:center;justify-content:center;font-size:18px;">
                    ${tipoIcon[a.tipo]||'📢'}
                </div>
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                        <h4 style="margin:0;">${escapeHtml(a.titulo)}</h4>
                        <span style="background:${prioridadColor[a.prioridad]};color:white;padding:2px 8px;border-radius:20px;font-size:11px;">
                            ${a.prioridad.toUpperCase()}
                        </span>
                        ${estaVisto ? '<span style="color:#10b981;font-size:12px;"><i class="fas fa-check-circle"></i> Visto</span>' : ''}
                    </div>
                    <p style="margin:8px 0;line-height:1.5;">${escapeHtml(a.descripcion)}</p>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-tertiary);">
                        <span><i class="far fa-calendar"></i> ${formatDate(a.fechaInicio)} - ${formatDate(a.fechaFin)}</span>
                        ${!estaVisto ? `
                            <button class="marcar-visto-btn" data-id="${a._id}" style="background:none;border:none;color:var(--primary);cursor:pointer;">
                                <i class="fas fa-check"></i> Marcar como visto
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
    
    // Event listeners para marcar como visto
    body.querySelectorAll('.marcar-visto-btn').forEach(b => {
        b.addEventListener('click', async () => {
            await avisoService.marcarVisto(b.dataset.id);
            await cargarAvisos();
            renderAvisosInModal();
            // No cerramos el modal, solo actualizamos la vista
        });
    });
}

async function marcarTodosVistos() {
    await avisoService.marcarTodosVistos();
    await cargarAvisos();
    renderAvisosInModal();
    // No cerramos el modal para que el usuario vea que todos están marcados
}

/**
 * Renderiza la sección completa de avisos (vista de página)
 */
export async function renderAvisosSection() {
    const container = document.getElementById('avisosContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-spinner">Cargando avisos...</div>';
    
    await cargarAvisos();
    
    const avisosAMostrar = avisosVigentes.length > 0 ? avisosVigentes : avisosNoVistos;
    
    if (!avisosAMostrar.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-check-circle" style="font-size: 64px; color: #10b981; margin-bottom: 16px;"></i>
                <h3>¡Todo al día!</h3>
                <p>No hay avisos vigentes en este momento.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="avisos-grid">
            ${avisosAMostrar.map(a => renderAvisoCard(a)).join('')}
        </div>
    `;
    
    // Event listeners para marcar como visto
    container.querySelectorAll('.marcar-visto-btn').forEach(b => {
        b.addEventListener('click', async () => {
            await avisoService.marcarVisto(b.dataset.id);
            await cargarAvisos();
            await renderAvisosSection();
        });
    });
}

function renderAvisoCard(a) {
    const estaVisto = !avisosNoVistos.some(nv => nv._id === a._id);
    
    return `
        <div class="aviso-card ${estaVisto ? 'aviso-card--visto' : ''}">
            <div class="aviso-card__header">
                <div class="aviso-card__icon" style="background: ${prioridadColor[a.prioridad]};">
                    ${tipoIcon[a.tipo] || '📢'}
                </div>
                <div class="aviso-card__title">
                    <h3>${escapeHtml(a.titulo)}</h3>
                    <span class="aviso-card__badge" style="background: ${prioridadColor[a.prioridad]};">
                        ${a.prioridad.toUpperCase()}
                    </span>
                    ${estaVisto ? '<span class="aviso-card__seen"><i class="fas fa-check-circle"></i> Visto</span>' : ''}
                </div>
            </div>
            <div class="aviso-card__body">
                <p>${escapeHtml(a.descripcion)}</p>
            </div>
            <div class="aviso-card__footer">
                <span class="aviso-card__date">
                    <i class="far fa-calendar"></i> ${formatDate(a.fechaInicio)} - ${formatDate(a.fechaFin)}
                </span>
                ${!estaVisto ? `
                    <button class="marcar-visto-btn" data-id="${a._id}">
                        <i class="fas fa-check"></i> Marcar como visto
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Exponer globalmente
window.renderAvisosSection = renderAvisosSection;

// Actualizar el check de avisos periódicamente (cada 5 minutos)
setInterval(async () => {
    await cargarAvisos();
}, 5 * 60 * 1000);