// src/frontend/modules/sugerencias.js
let suggestionModal = null;
let selectedFiles = [];

export function initSugerenciasModule() {
    console.log('💡 Inicializando módulo de sugerencias...');
    
    if (!document.getElementById('suggestionModal')) {
        createSuggestionModal();
    }
    
    setupTopbarButton();
    setupEventListeners();
}

function setupTopbarButton() {
    const suggestionsBtn = document.getElementById('suggestionsBtn');
    if (suggestionsBtn) {
        // Limpiar listener anterior
        const newBtn = suggestionsBtn.cloneNode(true);
        suggestionsBtn.parentNode.replaceChild(newBtn, suggestionsBtn);
        newBtn.addEventListener('click', openSuggestionModal);
    }
}

function createSuggestionModal() {
    const modalHTML = `
        <div id="suggestionModal" class="modal" style="display: none;">
            <div class="modal__overlay"></div>
            <div class="modal__content modal__content--lg">
                <div class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-lightbulb" style="color: #f59e0b;"></i> 
                        Enviar Sugerencia
                    </h3>
                    <button class="modal__close">&times;</button>
                </div>
                <div class="modal__body">
                    <form id="suggestionForm">
                        <div class="form__group">
                            <label for="suggestionTitulo" class="form__label">
                                Título <span class="required">*</span>
                            </label>
                            <input type="text" id="suggestionTitulo" class="form__input" 
                                   placeholder="Ej: Mejorar el buscador de documentos" maxlength="200" required>
                        </div>
                        
                        <div class="form__group">
                            <label for="suggestionCategoria" class="form__label">
                                Categoría <span class="required">*</span>
                            </label>
                            <select id="suggestionCategoria" class="form__select" required>
                                <option value="" disabled selected>Selecciona una categoría</option>
                                <option value="mejora">✨ Mejora de funcionalidad existente</option>
                                <option value="nueva_funcionalidad">🚀 Nueva funcionalidad</option>
                                <option value="reporte_error">🐛 Reporte de error</option>
                                <option value="experiencia_usuario">🎨 Experiencia de usuario</option>
                                <option value="rendimiento">⚡ Rendimiento</option>
                                <option value="seguridad">🔒 Seguridad</option>
                                <option value="otros">📌 Otros</option>
                            </select>
                        </div>
                        
                        <div class="form__group">
                            <label for="suggestionDescripcion" class="form__label">
                                Descripción <span class="required">*</span>
                            </label>
                            <textarea id="suggestionDescripcion" class="form__textarea" rows="6" 
                                      placeholder="Describe tu sugerencia en detalle..." maxlength="5000" required></textarea>
                            <div class="form__char-count">
                                <span id="suggestionCharCount">0</span> / 5000
                            </div>
                        </div>
                        
                        <div class="form__group">
                            <label class="form__label">📎 Adjuntar imágenes (opcional)</label>
                            <div class="suggestion-file-upload" id="suggestionFileUpload">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
                                <p class="suggestion-file-hint">Formatos: JPG, PNG, GIF, WEBP (máx. 10MB por archivo)</p>
                            </div>
                            <input type="file" id="suggestionFileInput" multiple 
                                   accept="image/jpeg,image/png,image/gif,image/webp" style="display: none;">
                            <div class="suggestion-file-list" id="suggestionFileList"></div>
                        </div>
                        
                        <div class="alert alert--info">
                            <i class="fas fa-info-circle"></i>
                            <div>Tu sugerencia será revisada por el equipo administrativo. ¡Gracias por contribuir!</div>
                        </div>
                    </form>
                </div>
                <div class="modal__footer">
                    <button class="btn btn--outline" id="cancelSuggestionBtn">Cancelar</button>
                    <button class="btn btn--primary" id="submitSuggestionBtn">
                        <i class="fas fa-paper-plane"></i> Enviar Sugerencia
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    suggestionModal = document.getElementById('suggestionModal');
    
    // Configurar cierre del modal
    const closeBtn = suggestionModal.querySelector('.modal__close');
    const cancelBtn = document.getElementById('cancelSuggestionBtn');
    const overlay = suggestionModal.querySelector('.modal__overlay');
    
    closeBtn.addEventListener('click', closeSuggestionModal);
    cancelBtn.addEventListener('click', closeSuggestionModal);
    overlay.addEventListener('click', closeSuggestionModal);
    
    // Contador de caracteres
    const descripcionInput = document.getElementById('suggestionDescripcion');
    const charCount = document.getElementById('suggestionCharCount');
    if (descripcionInput && charCount) {
        descripcionInput.addEventListener('input', () => {
            charCount.textContent = descripcionInput.value.length;
        });
    }
}

function setupEventListeners() {
    const fileUploadArea = document.getElementById('suggestionFileUpload');
    const fileInput = document.getElementById('suggestionFileInput');
    const submitBtn = document.getElementById('submitSuggestionBtn');
    
    if (fileUploadArea && fileInput) {
        fileUploadArea.addEventListener('click', () => fileInput.click());
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('drag-over');
        });
        
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('drag-over');
        });
        
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-over');
            handleFiles(Array.from(e.dataTransfer.files));
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFiles(Array.from(e.target.files));
            fileInput.value = '';
        });
    }
    
    if (submitBtn) {
        submitBtn.addEventListener('click', submitSuggestion);
    }
}

function handleFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    for (const file of imageFiles) {
        if (file.size > 10 * 1024 * 1024) {
            showToast(`El archivo ${file.name} excede 10MB`, 'error');
            continue;
        }
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    }
    
    renderFileList();
}

function renderFileList() {
    const container = document.getElementById('suggestionFileList');
    if (!container) return;
    
    if (selectedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = selectedFiles.map((file, index) => `
        <div class="suggestion-file-item">
            <i class="fas fa-image"></i>
            <span>${escapeHtml(file.name)}</span>
            <small>(${(file.size / 1024).toFixed(1)} KB)</small>
            <button class="suggestion-file-remove" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    container.querySelectorAll('.suggestion-file-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            selectedFiles.splice(index, 1);
            renderFileList();
        });
    });
}

export function openSuggestionModal() {
    if (!suggestionModal) {
        createSuggestionModal();
        suggestionModal = document.getElementById('suggestionModal');
        setupEventListeners();
    }
    
    const form = document.getElementById('suggestionForm');
    if (form) form.reset();
    selectedFiles = [];
    renderFileList();
    
    // Resetear contador de caracteres
    const charCount = document.getElementById('suggestionCharCount');
    if (charCount) charCount.textContent = '0';
    
    suggestionModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeSuggestionModal() {
    if (suggestionModal) {
        suggestionModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function submitSuggestion() {
    const titulo = document.getElementById('suggestionTitulo')?.value?.trim();
    const categoria = document.getElementById('suggestionCategoria')?.value;
    const descripcion = document.getElementById('suggestionDescripcion')?.value?.trim();
    
    if (!titulo) {
        showToast('Por favor ingresa un título', 'error');
        return;
    }
    if (!categoria) {
        showToast('Por favor selecciona una categoría', 'error');
        return;
    }
    if (!descripcion) {
        showToast('Por favor ingresa una descripción', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submitSuggestionBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('categoria', categoria);
    formData.append('descripcion', descripcion);
    
    for (const file of selectedFiles) {
        formData.append('attachments', file);
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ ¡Sugerencia enviada correctamente!`, 'success');
            closeSuggestionModal();
        } else {
            showToast(data.message || 'Error al enviar sugerencia', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión al servidor', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white; padding: 12px 24px; border-radius: 10px;
        z-index: 10001; box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        display: flex; align-items: center; gap: 10px;
        font-weight: 500;
    `;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Exponer globalmente
window.openSuggestionModal = openSuggestionModal;
window.closeSuggestionModal = closeSuggestionModal;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSugerenciasModule);
} else {
    initSugerenciasModule();
}