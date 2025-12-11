import { DOM } from '../dom.js';
import { api } from '../services/api.js';  // CAMBIADO: importar 'api' en lugar de 'apiCall'
import { setLoadingState, showAlert, getIconName } from '../utils.js';

// =============================================================================
// 1. MANEJO DEL MODAL DE CATEGORÍAS
// =============================================================================

/**
 * 1.1 Abrir modal para crear/editar categoría
 * Sirve para mostrar el formulario de categoría, inicializando los campos
 * con datos existentes si es edición o vacíos si es creación.
 */
function openCategoryModal(categoryId = null) {
    console.log(`🏷️ Abriendo modal de categoría: ${categoryId || 'Nueva'}`);
    
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
}

/**
 * 1.2 Cerrar modal de categorías
 * Oculta el formulario modal para crear/editar categorías.
 */
function closeCategoryModal() {
    console.log('❌ Cerrando modal de categoría');
    DOM.categoryModal.style.display = 'none';
}

// =============================================================================
// 2. OPERACIONES CRUD DE CATEGORÍAS
// =============================================================================

/**
 * 2.1 Guardar categoría (crear o actualizar)
 * Envía los datos del formulario a la API para persistir la categoría,
 * maneja validaciones y actualiza la interfaz tras guardar.
 */
async function saveCategory() {
    if (!DOM.categoryName.value.trim()) {
        showAlert('El nombre de la categoría es obligatorio', 'error');
        return;
    }
    
    try {
        setLoadingState(true, DOM.saveCategoryBtn);
        
        const categoryData = {
            nombre: DOM.categoryName.value.trim(),
            descripcion: DOM.categoryDescription.value.trim(),
            color: DOM.categoryColor.value,
            icon: DOM.categoryIcon.value
        };
        
        console.log('💾 Guardando categoría:', categoryData);
        
        let data;
        if (DOM.categoryId.value) {
            data = await api.updateCategory(DOM.categoryId.value, categoryData);  // CAMBIADO: usar api.updateCategory()
        } else {
            data = await api.createCategory(categoryData);  // CAMBIADO: usar api.createCategory()
        }
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadCategories();
            closeCategoryModal();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error guardando categoría:', error);
        showAlert('Error al guardar categoría: ' + error.message, 'error');
    } finally {
        setLoadingState(false, DOM.saveCategoryBtn);
    }
}

/**
 * 2.2 Cargar lista de categorías desde la API
 * Obtiene todas las categorías del servidor y actualiza el estado global,
 * luego llama a las funciones de renderizado y poblamiento de selects.
 */
async function loadCategories() {
    try {
        console.log('🏷️ Cargando categorías...');
        
        const data = await api.getCategories();  // CAMBIADO: usar api.getCategories()
        
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
    }
}

/**
 * 2.3 Editar categoría existente
 * Prepara el modal para edición cargando los datos de la categoría seleccionada.
 */
function editCategory(id) {
    console.log('✏️ Editando categoría:', id);
    openCategoryModal(id);
}

/**
 * 2.4 Eliminar categoría con confirmación
 * Solicita confirmación al usuario y elimina la categoría mediante API,
 * luego recarga la lista de categorías.
 */
async function deleteCategory(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Los documentos asociados quedarán sin categoría.')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando categoría:', id);
        
        const data = await api.deleteCategory(id);  // CAMBIADO: usar api.deleteCategory()
        
        if (data.success) {
            showAlert(data.message, 'success');
            await loadCategories();
        } else {
            throw new Error(data.message);
        }
        
    } catch (error) {
        console.error('❌ Error eliminando categoría:', error);
        showAlert('Error al eliminar categoría: ' + error.message, 'error');
    }
}

// =============================================================================
// 3. RENDERIZADO DE INTERFAZ
// =============================================================================

/**
 * 3.1 Renderizar categorías en la interfaz
 * Muestra las categorías como tarjetas de estadísticas y en una tabla,
 * incluyendo manejo de estado vacío.
 */
function renderCategories() {
    if (DOM.categoriesStats) {
        DOM.categoriesStats.innerHTML = '';
        
        if (window.appState.categories.length === 0) {
            DOM.categoriesStats.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay categorías creadas</h3>
                    <p class="empty-state__description">Crea tu primera categoría para organizar los documentos</p>
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
                <div class="category-card-actions" style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;">
                    <button class="btn-icon btn-icon--sm" onclick="editCategory('${category._id}')" title="Editar" style="width: 28px; height: 28px; padding: 4px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-icon--sm btn-icon--danger" onclick="deleteCategory('${category._id}')" title="Eliminar" style="width: 28px; height: 28px; padding: 4px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
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
                    <button class="btn btn--sm btn--outline" onclick="editCategory('${category._id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn--sm btn--danger" onclick="deleteCategory('${category._id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
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
 * Llena los elementos <select> con las categorías disponibles para filtrar documentos.
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
 * Utilidad genérica para llenar cualquier elemento <select> con las categorías disponibles.
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
 * Función wrapper para ser usada como event listener en el botón de guardar.
 */
function handleSaveCategory() {
    console.log('💾 Guardando categoría...');
    saveCategory();
}

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
    handleSaveCategory 
};