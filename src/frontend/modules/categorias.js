import { DOM } from '../dom.js';
import { api } from '../services/api.js';
import { setLoadingState, showAlert, showConfirmModal, showActionModal, getIconName } from '../utils.js';
import { canView, canAction, showNoPermissionAlert } from '../permissions.js';

// =============================================================================
// 0. FUNCIONES DE PRELOADER MEJORADAS
// =============================================================================

/**
 * 0.1 Mostrar preloader de categorías con timeout mejorado
 */
function showCategoryPreloader(message = 'Cargando categorías...', duration = 1600) {
    if (DOM.categoriesStats) {
        DOM.categoriesStats.innerHTML = `
            <div class="category-preloader">
                <div class="category-preloader__spinner"></div>
                <p class="category-preloader__text">${message}</p>
                <div class="category-preloader__tags">
                    <div class="category-preloader__tag"></div>
                    <div class="category-preloader__tag"></div>
                    <div class="category-preloader__tag"></div>
                </div>
            </div>
        `;
    }
    
    // Retornar una promesa que se resuelve después del tiempo mínimo
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    });
}

/**
 * 0.2 Mostrar preloader overlay para operaciones críticas
 */
function showCategoryOverlayPreloader(title = 'Procesando...', subtitle = 'Por favor, espera un momento') {
    const overlay = document.createElement('div');
    overlay.className = 'category-preloader-overlay';
    overlay.id = 'categoryPreloaderOverlay';
    
    overlay.innerHTML = `
        <div class="category-preloader-overlay__content">
            <div class="category-preloader-overlay__icon">
                <i class="fas fa-tags"></i>
            </div>
            <h3 class="category-preloader-overlay__title">${title}</h3>
            <p class="category-preloader-overlay__subtitle">${subtitle}</p>
            <div class="category-preloader-overlay__status">
                <div class="category-preloader-overlay__status-dot"></div>
                <div class="category-preloader-overlay__status-dot"></div>
                <div class="category-preloader-overlay__status-dot"></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Retornar función para ocultar
    return {
        hide: () => {
            const overlayEl = document.getElementById('categoryPreloaderOverlay');
            if (overlayEl) {
                overlayEl.style.opacity = '0';
                overlayEl.style.visibility = 'hidden';
                setTimeout(() => {
                    if (overlayEl.parentNode) {
                        overlayEl.parentNode.removeChild(overlayEl);
                    }
                }, 300);
            }
        }
    };
}

/**
 * 0.3 Mostrar cards skeleton loading
 */
function showCategorySkeletonCards(count = 4) {
    if (DOM.categoriesStats) {
        let skeletonHTML = '';
        for (let i = 0; i < count; i++) {
            skeletonHTML += `
                <div class="category-card-preloader">
                    <div class="category-card-preloader__icon"></div>
                    <div class="category-card-preloader__name"></div>
                    <div class="category-card-preloader__count"></div>
                </div>
            `;
        }
        DOM.categoriesStats.innerHTML = skeletonHTML;
    }
}

/**
 * 0.4 Mostrar tabla skeleton loading
 */
function showCategorySkeletonTable() {
    if (DOM.categoriasTableBody) {
        let skeletonHTML = '';
        for (let i = 0; i < 3; i++) {
            skeletonHTML += `
                <div class="category-table-preloader__row">
                    <div class="category-table-preloader__cell"></div>
                    <div class="category-table-preloader__cell"></div>
                    <div class="category-table-preloader__cell"></div>
                    <div class="category-table-preloader__cell category-table-preloader__cell--icon"></div>
                    <div class="category-table-preloader__cell"></div>
                    <div class="category-table-preloader__cell category-table-preloader__cell--actions"></div>
                </div>
            `;
        }
        DOM.categoriasTableBody.innerHTML = `
            <tr><td colspan="6">${skeletonHTML}</td></tr>
        `;
    }
}

// =============================================================================
// 1. MANEJO DEL MODAL DE CATEGORÍAS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar categoría
 */
function openCategoryModal(categoryId = null) {
    console.log(`🏷️ Abriendo modal de categoría: ${categoryId || 'Nueva'}`);

    // Verificar permiso de acción
    if (!canAction('categorias')) {
        showNoPermissionAlert('categorias');
        showAlert('No tienes permiso para modificar categorías', 'error');
        return;
    }
    
    // Limpiar errores previos
    clearCategoryFormErrors();
    
    if (categoryId) {
        DOM.categoryModalTitle.textContent = 'Editar Categoría';
        const category = window.appState.categories.find(c => c._id === categoryId);
        if (category) {
            DOM.categoryId.value = category._id;
            DOM.categoryName.value = category.nombre;
            DOM.categoryDescription.value = category.descripcion || '';
            DOM.categoryColor.value = category.color || '#4f46e5';
            DOM.categoryIcon.value = category.icon || 'folder';
        }
    } else {
        DOM.categoryModalTitle.textContent = 'Nueva Categoría';
        DOM.categoryForm.reset();
        DOM.categoryId.value = '';
        DOM.categoryColor.value = '#4f46e5';
        DOM.categoryIcon.value = 'folder';
    }
    
    DOM.categoryModal.style.display = 'flex';
    setTimeout(() => DOM.categoryName.focus(), 100);
}

/**
 * 1.2 Cerrar modal de categorías
 */
function closeCategoryModal() {
    console.log('❌ Cerrando modal de categoría');
    DOM.categoryModal.style.display = 'none';
    clearCategoryFormErrors();
}

/**
 * 1.3 Limpiar errores del formulario
 */
function clearCategoryFormErrors() {
    const errorElements = document.querySelectorAll('.validation-message--error');
    errorElements.forEach(el => el.remove());
    
    const errorFields = document.querySelectorAll('.field--error-highlight');
    errorFields.forEach(el => {
        el.classList.remove('field--error-highlight');
        el.removeAttribute('aria-invalid');
    });
}

/**
 * 1.4 Mostrar error en campo específico
 */
function showCategoryFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Agregar clase de error al campo
    field.classList.add('field--error-highlight');
    field.setAttribute('aria-invalid', 'true');
    
    // Crear mensaje de error
    const errorMessage = document.createElement('div');
    errorMessage.className = 'validation-message validation-message--error';
    errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Insertar después del campo
    field.parentNode.appendChild(errorMessage);
    
    // Enfocar el campo con error
    field.focus();
}

// =============================================================================
// 2. OPERACIONES CRUD DE CATEGORÍAS (CORREGIDAS)
// =============================================================================

/**
 * 2.1 Validar formulario de categoría
 */
function validateCategoryForm() {
    let isValid = true;
    clearCategoryFormErrors();
    
    // Validar nombre
    if (!DOM.categoryName.value.trim()) {
        showCategoryFieldError('categoryName', 'El nombre de la categoría es obligatorio');
        isValid = false;
    } else if (DOM.categoryName.value.trim().length < 2) {
        showCategoryFieldError('categoryName', 'El nombre debe tener al menos 2 caracteres');
        isValid = false;
    } else if (DOM.categoryName.value.trim().length > 50) {
        showCategoryFieldError('categoryName', 'El nombre no puede exceder los 50 caracteres');
        isValid = false;
    }
    
    // Validar descripción
    if (DOM.categoryDescription.value.trim().length > 500) {
        showCategoryFieldError('categoryDescription', 'La descripción no puede exceder los 500 caracteres');
        isValid = false;
    }
    
    return isValid;
}

/**
 * 2.2 Guardar categoría (crear o actualizar) - CORREGIDO
 */
async function saveCategory() {
    if (!canAction('categorias')) {
        showNoPermissionAlert('categorias');
        showAlert('No tienes permiso para guardar categorías', 'error');
        return;
    }

    if (!validateCategoryForm()) {
        return;
    }
    
    let preloader = null;
    
    try {
        // Mostrar overlay preloader con tiempo mínimo garantizado
        preloader = showCategoryOverlayPreloader(
            'Guardando categoría...', 
            'Por favor, espera mientras se procesa la información'
        );
        
        // Tiempo mínimo de preloader: 1.5 segundos
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const categoryData = {
            nombre: DOM.categoryName.value.trim(),
            descripcion: DOM.categoryDescription.value.trim(),
            color: DOM.categoryColor.value,
            icon: DOM.categoryIcon.value
        };
        
        console.log('💾 Guardando categoría:', categoryData);
        
        let data;
        if (DOM.categoryId.value) {
            data = await api.updateCategory(DOM.categoryId.value, categoryData);
        } else {
            data = await api.createCategory(categoryData);
        }
        
        // Tiempo adicional para simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadCategories();
            closeCategoryModal();
        } else {
            throw new Error(data.message || 'Error desconocido al guardar');
        }
        
    } catch (error) {
        console.error('❌ Error guardando categoría:', error);
        showAlert('Error al guardar categoría: ' + error.message, 'error');
    } finally {
        // Ocultar preloader si existe
        if (preloader) {
            preloader.hide();
        }
        setLoadingState(false, DOM.saveCategoryBtn, 'Guardar');
    }
}

/**
 * 2.3 Cargar lista de categorías desde la API - CORREGIDO
 */
async function loadCategories() {
    // Verificar permiso de vista
    if (!canView('categorias')) {
        console.log('🔒 Sin permiso para ver categorías');

        if (DOM.categoriesStats) {
            DOM.categoriesStats.innerHTML = `
                <div class="empty-state error-state">
                    <div class="error-state__icon"><i class="fas fa-lock"></i></div>
                    <h3 class="empty-state__title">Acceso Restringido</h3>
                    <p class="empty-state__description">No tienes permisos para ver las categorías.</p>
                </div>
            `;
        }

        if (DOM.categoriasTableBody) {
            DOM.categoriasTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state error-state">
                        <div class="error-state__icon"><i class="fas fa-lock"></i></div>
                        <h3 class="empty-state__title">Acceso Restringido</h3>
                        <p class="empty-state__description">No tienes permisos para ver la lista de categorías.</p>
                    </td>
                </tr>
            `;
        }

        return;
    }

    try {
        console.log('🏷️ Cargando categorías...');
        
        // Mostrar skeleton cards con tiempo mínimo
        showCategorySkeletonCards(4);
        showCategorySkeletonTable();
        
        // Tiempo mínimo para mostrar skeleton: 1.2 segundos
        await showCategoryPreloader('Cargando categorías...', 1200);
        
        const data = await api.getCategories();
        
        // Tiempo adicional para simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 600));
        
        if (data.success) {
            window.appState.categories = data.categories || [];
            renderCategories();
            populateCategorySelects();
            console.log(`✅ ${window.appState.categories.length} categorías cargadas`);
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error cargando categorías:', error);
        showAlert('Error al cargar categorías: ' + error.message, 'error');
        
        if (DOM.categoriesStats) {
            DOM.categoriesStats.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle empty-state__icon"></i>
                    <h3 class="empty-state__title">Error al cargar categorías</h3>
                    <p class="empty-state__description">${error.message}</p>
                    <button class="btn btn--primary" onclick="loadCategories()">Reintentar</button>
                </div>
            `;
        }
    }
}

/**
 * 2.4 Editar categoría existente
 */
function editCategory(id) {
    console.log('✏️ Editando categoría:', id);

    if (!canAction('categorias')) {
        showNoPermissionAlert('categorias');
        showAlert('No tienes permiso para editar categorías', 'error');
        return;
    }

    openCategoryModal(id);
}

/**
 * 2.5 Eliminar categoría con modal de confirmación - CORREGIDO
 */
async function deleteCategory(id) {
    if (!canAction('categorias')) {
        showNoPermissionAlert('categorias');
        showAlert('No tienes permiso para eliminar categorías', 'error');
        return;
    }

    const category = window.appState.categories.find(c => c._id === id);
    if (!category) return;
    
    // Mostrar modal de confirmación personalizado
    showConfirmModal({
        title: 'Eliminar Categoría',
        message: `¿Estás seguro de eliminar la categoría "${category.nombre}"?<br>
                 <small class="text-warning">Los documentos asociados quedarán sin categoría.</small>`,
        icon: 'trash',
        iconClass: 'fas fa-trash text-danger',
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
            let preloader = null;
            
            try {
                console.log('🗑️ Eliminando categoría:', id);
                
                // Mostrar overlay preloader para eliminación
                preloader = showCategoryOverlayPreloader(
                    'Eliminando categoría...',
                    'Esto puede tomar algunos segundos'
                );
                
                // Tiempo mínimo de preloader: 1.2 segundos
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                const data = await api.deleteCategory(id);
                
                // Tiempo adicional para simular procesamiento
                await new Promise(resolve => setTimeout(resolve, 600));
                
                if (data.success) {
                    // Ocultar preloader
                    if (preloader) preloader.hide();
                    
                    // Mostrar modal de éxito
                    showActionModal({
                        type: 'success',
                        title: '¡Eliminado!',
                        message: data.message,
                        onClose: async () => {
                            await loadCategories();
                        }
                    });
                } else {
                    throw new Error(data.message);
                }
                
            } catch (error) {
                console.error('❌ Error eliminando categoría:', error);
                
                // Ocultar preloader si existe
                if (preloader) preloader.hide();
                
                // Mostrar modal de error
                showActionModal({
                    type: 'error',
                    title: 'Error',
                    message: 'Error al eliminar categoría: ' + error.message
                });
            }
        },
        onCancel: () => {
            console.log('❌ Eliminación cancelada');
        }
    });
}

// =============================================================================
// 3. RENDERIZADO DE INTERFAZ
// =============================================================================

/**
 * 3.1 Renderizar categorías en la interfaz
 */
function renderCategories() {
    const canEdit = canAction('categorias');

    if (DOM.categoriesStats) {
        DOM.categoriesStats.innerHTML = '';
        
        if (window.appState.categories.length === 0) {
            DOM.categoriesStats.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay categorías creadas</h3>
                    <p class="empty-state__description">Crea tu primera categoría para organizar los documentos</p>
                    ${canEdit ? `
                        <button class="btn btn--primary" onclick="openCategoryModal()">
                            <i class="fas fa-plus"></i> Crear Categoría
                        </button>
                    ` : `
                        <p class="empty-state__description">No tienes permisos para crear categorías.</p>
                    `}
                </div>
            `;
            return;
        }
        
        window.appState.categories.forEach(category => {
            const categoryCard = document.createElement('div');
            categoryCard.className = 'compact-category-card';
            categoryCard.style.position = 'relative';
            
            categoryCard.innerHTML = `
                <div class="compact-category-card__icon" style="background: linear-gradient(135deg, ${category.color || '#4f46e5'}, #4338ca);">
                    <i class="fas fa-${category.icon || 'folder'}"></i>
                </div>
                <h4 class="compact-category-card__name">${category.nombre}</h4>
                <span class="compact-category-card__count">${category.documentCount || 0} documentos</span>
                ${canEdit ? `
                    <div class="category-card-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;">
                        <button class="btn-icon btn-icon--sm" onclick="editCategory('${category._id}')" title="Editar" style="width: 28px; height: 28px; padding: 4px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-icon--sm btn-icon--danger" onclick="deleteCategory('${category._id}')" title="Eliminar" style="width: 28px; height: 28px; padding: 4px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            `;
            
            // Mostrar acciones al hover
            categoryCard.addEventListener('mouseenter', () => {
                const actions = categoryCard.querySelector('.category-card-actions');
                if (actions) actions.style.opacity = '1';
            });
            
            categoryCard.addEventListener('mouseleave', () => {
                const actions = categoryCard.querySelector('.category-card-actions');
                if (actions) actions.style.opacity = '0';
            });
            
            DOM.categoriesStats.appendChild(categoryCard);
        });
    }
    
    if (DOM.categoriasTableBody) {
        DOM.categoriasTableBody.innerHTML = '';
        
        if (window.appState.categories.length === 0) {
            DOM.categoriasTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-tags empty-state__icon"></i>
                        <h3 class="empty-state__title">No hay categorías creadas</h3>
                        <p class="empty-state__description">Crea tu primera categoría para organizar los documentos</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        window.appState.categories.forEach(category => {
            const row = document.createElement('tr');
            row.className = 'table__row';
            
            row.innerHTML = `
                <td class="table__cell">${category.nombre}</td>
                <td class="table__cell">${category.descripcion || '-'}</td>
                <td class="table__cell">
                    <span class="color-preview" style="background-color: ${category.color || '#4f46e5'}"></span>
                    ${category.color || '#4f46e5'}
                </td>
                <td class="table__cell">
                    <i class="fas fa-${category.icon || 'folder'}"></i> ${getIconName(category.icon || 'folder')}
                </td>
                <td class="table__cell">${category.documentCount || 0}</td>
                <td class="table__cell">
                    ${canEdit ? `
                        <button class="btn btn--sm btn--outline" onclick="editCategory('${category._id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn--sm btn--danger" onclick="deleteCategory('${category._id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : '<span class="text-muted">-</span>'}
                </td>
            `;
            
            DOM.categoriasTableBody.appendChild(row);
        });
    }
}

// =============================================================================
// 4. MANEJO DE SELECTS/FILTROS
// =============================================================================

/**
 * 4.1 Poblar todos los selects de categorías en filtros y búsqueda
 */
function populateCategorySelects() {
    if (DOM.filterCategory) {
        DOM.filterCategory.innerHTML = '<option value="">Todas las categorías</option>';
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.filterCategory.appendChild(option);
        });
    }
    
    if (DOM.searchCategory) {
        DOM.searchCategory.innerHTML = '<option value="">Todas las categorías</option>';
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.searchCategory.appendChild(option);
        });
    }
}

/**
 * 4.2 Poblar un select de categorías específico
 */
function populateCategorySelect(selectElement) {
    if (!selectElement) return;
    
    selectElement.innerHTML = '<option value="">Seleccionar categoría</option>';
    window.appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.nombre;
        option.textContent = category.nombre;
        selectElement.appendChild(option);
    });
}

// =============================================================================
// 5. HANDLERS/CONTROLADORES
// =============================================================================

/**
 * 5.1 Handler para guardar categoría
 */
function handleSaveCategory(event) {
    if (event) event.preventDefault();
    console.log('💾 Guardando categoría...');
    saveCategory();
}

/**
 * 5.2 Handler para cerrar modal con Escape
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape' && DOM.categoryModal.style.display === 'flex') {
        closeCategoryModal();
    }
}

/**
 * 5.3 Handler para cerrar modal haciendo clic fuera
 */
function handleOutsideClick(event) {
    if (event.target === DOM.categoryModal) {
        closeCategoryModal();
    }
}

// Event Listeners
if (DOM.categoryForm) {
    DOM.categoryForm.addEventListener('submit', handleSaveCategory);
}

if (DOM.categoryModal) {
    DOM.categoryModal.addEventListener('click', handleOutsideClick);
}

document.addEventListener('keydown', handleEscapeKey);

// Exponer funciones globalmente
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.loadCategories = loadCategories;
window.openCategoryModal = openCategoryModal;

export { 
    openCategoryModal, 
    closeCategoryModal, 
    saveCategory, 
    loadCategories, 
    renderCategories, 
    populateCategorySelects, 
    populateCategorySelect, 
    editCategory, 
    deleteCategory, 
    handleSaveCategory,
    showCategoryPreloader,
    showCategoryOverlayPreloader
};