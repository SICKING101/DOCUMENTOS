/**
 * Módulo de Sugerencias - Versión Simplificada
 * Solo envía sugerencias por email y muestra un toast de confirmación
 */

const DEBUG = true;
function slog(...args) { if (DEBUG) console.log('💡 [Sugerencias]', ...args); }
function serr(...args) { console.error('❌ [Sugerencias]', ...args); }

const API_BASE_URL = window.location.origin + '/api';

// =============================================================================
// INICIALIZACIÓN
// =============================================================================

export async function initSuggestionsModule() {
    slog('Inicializando módulo de sugerencias...');
    
    try {
        setupEventListeners();
        slog('Módulo de sugerencias inicializado ✅');
    } catch (error) {
        serr('Error inicializando módulo:', error);
    }
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
            showToast(data.message || '¡Sugerencia enviada con éxito! Gracias por tu aporte.', 'success');
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
            
            // Deshabilitar botón mientras se envía
            const submitBtn = document.getElementById('suggestSubmitBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            const success = await submitSuggestion({
                title, category, description, benefit, priority, anonymous
            });
            
            // Restaurar botón
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            
            if (success) {
                // Limpiar formulario
                form.reset();
                document.getElementById('suggestPriority').value = 'media';
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
}

// =============================================================================
// TOAST NOTIFICATION
// =============================================================================

function showToast(message, type = 'info') {
    const toast = document.getElementById('suggestToast');
    if (!toast) return;
    
    const iconEl = toast.querySelector('.suggest-toast__icon');
    const messageEl = toast.querySelector('.suggest-toast__message');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    if (iconEl) {
        iconEl.className = `suggest-toast__icon ${type}`;
        iconEl.innerHTML = `<i class="${icons[type] || icons.info}"></i>`;
    }
    
    if (messageEl) messageEl.textContent = message;
    
    // Cambiar color del borde según tipo
    const toastContent = toast.querySelector('.suggest-toast__content');
    if (toastContent) {
        const borderColors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        toastContent.style.borderLeftColor = borderColors[type] || borderColors.info;
    }
    
    toast.style.display = 'block';
    toast.style.opacity = '1';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.opacity = '1';
        }, 300);
    }, 4000);
}

// =============================================================================
// EXPORTACIONES
// =============================================================================

export default {
    init: initSuggestionsModule,
    submitSuggestion
};