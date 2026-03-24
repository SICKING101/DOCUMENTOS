/**
 * Módulo de Sugerencias
 * Permite a los usuarios enviar sugerencias y ver el estado de las mismas
 */

// =============================================================================
// CONFIGURACIÓN Y ESTADO
// =============================================================================

const DEBUG = true;
function slog(...args) { if (DEBUG) console.log('💡 [Sugerencias]', ...args); }
function serr(...args) { console.error('❌ [Sugerencias]', ...args); }

// Estado del módulo
let suggestions = [];
let currentFilters = {
    category: 'all',
    status: 'all',
    sort: 'recent'
};
let currentUser = null;

// API base URL
const API_BASE_URL = window.location.origin + '/api';

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

export async function initSuggestionsModule() {
    slog('Inicializando módulo de sugerencias...');
    
    try {
        // Obtener usuario actual
        currentUser = await getCurrentUser();
        slog('Usuario actual:', currentUser?.usuario || 'No autenticado');
        
        // Cargar sugerencias
        await loadSuggestions();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Actualizar estadísticas
        updateStats();
        
        slog('Módulo de sugerencias inicializado ✅');
    } catch (error) {
        serr('Error inicializando módulo:', error);
    }
}

// =============================================================================
// OBTENER USUARIO ACTUAL
// =============================================================================

async function getCurrentUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.user;
        }
        return null;
    } catch (error) {
        serr('Error obteniendo usuario:', error);
        return null;
    }
}

// =============================================================================
// CARGAR SUGERENCIAS DESDE EL BACKEND
// =============================================================================

async function loadSuggestions() {
    slog('Cargando sugerencias...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            slog('No hay token, cargando sugerencias públicas');
            // Cargar solo sugerencias públicas/implementadas
            const response = await fetch(`${API_BASE_URL}/suggestions/public`);
            if (response.ok) {
                const data = await response.json();
                suggestions = data.suggestions || [];
            }
        } else {
            const response = await fetch(`${API_BASE_URL}/suggestions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                suggestions = data.suggestions || [];
            } else {
                // Fallback a sugerencias públicas
                const publicResponse = await fetch(`${API_BASE_URL}/suggestions/public`);
                if (publicResponse.ok) {
                    const data = await publicResponse.json();
                    suggestions = data.suggestions || [];
                }
            }
        }
        
        slog(`${suggestions.length} sugerencias cargadas`);
        
        // Renderizar lista
        renderSuggestionsList();
        
        // Actualizar contador
        const countEl = document.getElementById('suggestionsCount');
        if (countEl) countEl.textContent = suggestions.length;
        
        return suggestions;
    } catch (error) {
        serr('Error cargando sugerencias:', error);
        return [];
    }
}

// =============================================================================
// RENDERIZAR LISTA DE SUGERENCIAS
// =============================================================================

function renderSuggestionsList() {
    const container = document.getElementById('suggestionsList');
    if (!container) return;
    
    // Aplicar filtros
    let filteredSuggestions = [...suggestions];
    
    if (currentFilters.category !== 'all') {
        filteredSuggestions = filteredSuggestions.filter(s => s.category === currentFilters.category);
    }
    
    if (currentFilters.status !== 'all') {
        filteredSuggestions = filteredSuggestions.filter(s => s.status === currentFilters.status);
    }
    
    // Ordenar
    filteredSuggestions.sort((a, b) => {
        switch (currentFilters.sort) {
            case 'recent':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'oldest':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'votes':
                return (b.votes || 0) - (a.votes || 0);
            default:
                return 0;
        }
    });
    
    if (filteredSuggestions.length === 0) {
        container.innerHTML = `
            <div class="suggest-empty">
                <i class="fas fa-lightbulb suggest-empty__icon"></i>
                <p class="suggest-empty__text">No hay sugerencias que coincidan con los filtros</p>
                <p class="suggest-empty__subtext">Prueba con otros filtros o envía una nueva sugerencia</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredSuggestions.map(suggestion => `
        <div class="suggest-item" data-id="${suggestion._id}">
            <div class="suggest-item__header">
                <h4 class="suggest-item__title">${escapeHtml(suggestion.title)}</h4>
                <span class="suggest-item__category">
                    <i class="fas fa-tag"></i>
                    ${getCategoryLabel(suggestion.category)}
                </span>
            </div>
            <p class="suggest-item__description">${escapeHtml(suggestion.description.substring(0, 100))}${suggestion.description.length > 100 ? '...' : ''}</p>
            <div class="suggest-item__footer">
                <span class="suggest-item__status ${suggestion.status}">
                    <i class="fas ${getStatusIcon(suggestion.status)}"></i>
                    ${getStatusLabel(suggestion.status)}
                </span>
                <div class="suggest-item__meta">
                    <span><i class="fas fa-thumbs-up"></i> ${suggestion.votes || 0}</span>
                    <span><i class="fas fa-comment"></i> ${suggestion.comments?.length || 0}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(suggestion.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Agregar event listeners a los items
    document.querySelectorAll('.suggest-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const suggestion = suggestions.find(s => s._id === id);
            if (suggestion) {
                openSuggestionDetail(suggestion);
            }
        });
    });
}

// =============================================================================
// RENDERIZAR ESTADÍSTICAS
// =============================================================================

function updateStats() {
    const total = suggestions.length;
    const pending = suggestions.filter(s => s.status === 'pending').length;
    const implemented = suggestions.filter(s => s.status === 'implemented').length;
    
    // Sugerencias de este mes
    const now = new Date();
    const thisMonth = suggestions.filter(s => {
        const date = new Date(s.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    
    const totalEl = document.getElementById('totalSuggestions');
    const pendingEl = document.getElementById('pendingSuggestions');
    const implementedEl = document.getElementById('implementedSuggestions');
    const thisMonthEl = document.getElementById('thisMonthSuggestions');
    
    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (implementedEl) implementedEl.textContent = implemented;
    if (thisMonthEl) thisMonthEl.textContent = thisMonth;
}

// =============================================================================
// ENVIAR SUGERENCIA
// =============================================================================

async function submitSuggestion(formData) {
    slog('Enviando sugerencia...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Debes iniciar sesión para enviar sugerencias', 'error');
            return false;
        }
        
        const payload = {
            title: formData.title,
            category: formData.category,
            description: formData.description,
            benefit: formData.benefit || '',
            priority: formData.priority,
            anonymous: formData.anonymous || false
        };
        
        const response = await fetch(`${API_BASE_URL}/suggestions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('¡Sugerencia enviada con éxito!', 'success');
            // Recargar sugerencias
            await loadSuggestions();
            updateStats();
            return true;
        } else {
            showToast(data.message || 'Error al enviar sugerencia', 'error');
            return false;
        }
    } catch (error) {
        serr('Error enviando sugerencia:', error);
        showToast('Error de conexión al servidor', 'error');
        return false;
    }
}

// =============================================================================
// ABRIR DETALLE DE SUGERENCIA
// =============================================================================

function openSuggestionDetail(suggestion) {
    const modal = document.getElementById('suggestDetailModal');
    const body = document.getElementById('suggestDetailBody');
    
    if (!modal || !body) return;
    
    body.innerHTML = `
        <div class="suggest-detail">
            <h3 class="suggest-detail__title">${escapeHtml(suggestion.title)}</h3>
            <div class="suggest-detail__meta">
                <span class="suggest-detail__category">
                    <i class="fas fa-tag"></i>
                    ${getCategoryLabel(suggestion.category)}
                </span>
                <span class="suggest-detail__status ${suggestion.status}">
                    <i class="fas ${getStatusIcon(suggestion.status)}"></i>
                    ${getStatusLabel(suggestion.status)}
                </span>
                <span class="suggest-detail__date">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(suggestion.createdAt)}
                </span>
                ${!suggestion.anonymous && suggestion.author ? `
                    <span class="suggest-detail__author">
                        <i class="fas fa-user"></i>
                        ${escapeHtml(suggestion.author.usuario || suggestion.author.name || 'Usuario')}
                    </span>
                ` : `
                    <span class="suggest-detail__author">
                        <i class="fas fa-user-secret"></i>
                        Anónimo
                    </span>
                `}
            </div>
            
            <div class="suggest-detail__description">
                <h4><i class="fas fa-align-left"></i> Descripción</h4>
                <p>${escapeHtml(suggestion.description)}</p>
            </div>
            
            ${suggestion.benefit ? `
                <div class="suggest-detail__benefit">
                    <h4><i class="fas fa-chart-line"></i> Beneficio esperado</h4>
                    <p>${escapeHtml(suggestion.benefit)}</p>
                </div>
            ` : ''}
            
            ${suggestion.adminResponse ? `
                <div class="suggest-detail__response">
                    <h4><i class="fas fa-reply"></i> Respuesta del administrador</h4>
                    <p>${escapeHtml(suggestion.adminResponse)}</p>
                </div>
            ` : ''}
            
            <div class="suggest-detail__votes" style="margin-top: var(--spacing-lg);">
                <button class="suggest-btn suggest-btn--outline suggest-btn--sm" id="voteSuggestionBtn" data-id="${suggestion._id}">
                    <i class="fas fa-thumbs-up"></i>
                    Votar (${suggestion.votes || 0})
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Configurar voto
    const voteBtn = document.getElementById('voteSuggestionBtn');
    if (voteBtn) {
        voteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await voteSuggestion(suggestion._id);
        });
    }
}

// =============================================================================
// VOTAR SUGERENCIA
// =============================================================================

async function voteSuggestion(suggestionId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Inicia sesión para votar', 'warning');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/suggestions/${suggestionId}/vote`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('¡Voto registrado!', 'success');
            await loadSuggestions();
            updateStats();
            // Cerrar modal si estaba abierto
            const modal = document.getElementById('suggestDetailModal');
            if (modal) modal.classList.remove('active');
        } else {
            showToast(data.message || 'Error al votar', 'error');
        }
    } catch (error) {
        serr('Error votando:', error);
        showToast('Error de conexión', 'error');
    }
}

// =============================================================================
// CONFIGURAR EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
    // Formulario de sugerencias
    const form = document.getElementById('suggestForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('suggestTitle')?.value.trim();
            const category = document.getElementById('suggestCategory')?.value;
            const description = document.getElementById('suggestDescription')?.value.trim();
            const benefit = document.getElementById('suggestBenefit')?.value.trim();
            const priority = document.getElementById('suggestPriority')?.value;
            const anonymous = document.getElementById('suggestAnonymous')?.checked;
            
            // Validaciones
            if (!title || title.length < 5) {
                showToast('El título debe tener al menos 5 caracteres', 'warning');
                return;
            }
            
            if (!category) {
                showToast('Selecciona una categoría', 'warning');
                return;
            }
            
            if (!description || description.length < 10) {
                showToast('La descripción debe tener al menos 10 caracteres', 'warning');
                return;
            }
            
            const success = await submitSuggestion({
                title, category, description, benefit, priority, anonymous
            });
            
            if (success) {
                form.reset();
                document.getElementById('suggestPriority').value = 'media';
                // Reset priority buttons
                document.querySelectorAll('.suggest-priority-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.priority === 'media') btn.classList.add('active');
                });
            }
        });
    }
    
    // Botón limpiar
    const clearBtn = document.getElementById('suggestClearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const form = document.getElementById('suggestForm');
            if (form) form.reset();
            document.getElementById('suggestPriority').value = 'media';
            document.querySelectorAll('.suggest-priority-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.priority === 'media') btn.classList.add('active');
            });
        });
    }
    
    // Priority buttons
    document.querySelectorAll('.suggest-priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const priority = btn.dataset.priority;
            document.querySelectorAll('.suggest-priority-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('suggestPriority').value = priority;
        });
    });
    
    // Filtros
    const categoryFilter = document.getElementById('suggestFilterCategory');
    const statusFilter = document.getElementById('suggestFilterStatus');
    const sortFilter = document.getElementById('suggestFilterSort');
    const refreshBtn = document.getElementById('suggestRefreshBtn');
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            currentFilters.category = categoryFilter.value;
            renderSuggestionsList();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentFilters.status = statusFilter.value;
            renderSuggestionsList();
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            currentFilters.sort = sortFilter.value;
            renderSuggestionsList();
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
            await loadSuggestions();
            updateStats();
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
        });
    }
    
    // Modal close
    const closeModalBtn = document.getElementById('closeSuggestDetailModal');
    const closeDetailBtn = document.getElementById('closeDetailModalBtn');
    const modalOverlay = document.querySelector('.suggest-modal__overlay');
    
    const closeModal = () => {
        const modal = document.getElementById('suggestDetailModal');
        if (modal) modal.classList.remove('active');
    };
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
    
    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('suggestDetailModal');
            if (modal && modal.classList.contains('active')) {
                closeModal();
            }
        }
    });
}

// =============================================================================
// UTILIDADES
// =============================================================================

function getCategoryLabel(category) {
    const labels = {
        'funcionalidad': 'Nueva funcionalidad',
        'mejora': 'Mejora',
        'ui': 'Interfaz (UI)',
        'rendimiento': 'Rendimiento',
        'seguridad': 'Seguridad',
        'documentos': 'Documentos',
        'tareas': 'Tareas',
        'reportes': 'Reportes',
        'otro': 'Otro'
    };
    return labels[category] || category;
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Pendiente',
        'reviewing': 'En revisión',
        'approved': 'Aprobada',
        'implemented': 'Implementada',
        'rejected': 'Rechazada'
    };
    return labels[status] || status;
}

function getStatusIcon(status) {
    const icons = {
        'pending': 'fa-clock',
        'reviewing': 'fa-eye',
        'approved': 'fa-check-circle',
        'implemented': 'fa-check-double',
        'rejected': 'fa-times-circle'
    };
    return icons[status] || 'fa-question-circle';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('suggestToast');
    if (!toast) return;
    
    const iconEl = toast.querySelector('.suggest-toast__icon');
    const messageEl = toast.querySelector('.suggest-toast__message');
    
    if (iconEl) {
        iconEl.className = `suggest-toast__icon ${type}`;
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        iconEl.className = `suggest-toast__icon ${type}`;
        iconEl.innerHTML = `<i class="${icons[type] || icons.info}"></i>`;
    }
    
    if (messageEl) messageEl.textContent = message;
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.opacity = '1';
        }, 300);
    }, 3000);
}

// =============================================================================
// EXPORTACIONES
// =============================================================================

export default {
    init: initSuggestionsModule,
    loadSuggestions,
    submitSuggestion
};