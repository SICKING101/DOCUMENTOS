import { DOM } from '../dom.js';
import { apiCall } from '../api.js';
import { setLoadingState, showAlert, getIconName } from '../utils.js';

// =============================================================================
// FUNCIONES DE CATEGORÍAS (CRUD)
// =============================================================================
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

function closeCategoryModal() {
    console.log('❌ Cerrando modal de categoría');
    DOM.categoryModal.style.display = 'none';
}

async function saveCategory() {
    // Validaciones
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
            // Actualizar categoría existente
            data = await apiCall(`/categories/${DOM.categoryId.value}`, {
                method: 'PUT',
                body: JSON.stringify(categoryData)
            });
        } else {
            // Crear nueva categoría
            data = await apiCall('/categories', {
                method: 'POST',
                body: JSON.stringify(categoryData)
            });
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

async function loadCategories() {
    try {
        console.log('🏷️ Cargando categorías...');
        
        const data = await apiCall('/categories');
        
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
        // No mostrar alerta para evitar spam en pestaña no utilizada
    }
}

function renderCategories() {
    // Renderizar tarjetas de estadísticas
    if (DOM.categoriesStats) {
        DOM.categoriesStats.innerHTML = '';
        
        if (window.appState.categories.length === 0) {
            DOM.categoriesStats.innerHTML = `
                <article class="empty-state">
                    <i class="fas fa-tags empty-state__icon"></i>
                    <h3 class="empty-state__title">No hay categorías creadas</h3>
                    <p class="empty-state__description">Crea tu primera categoría para organizar los documentos</p>
                </article>
            `;
            return;
        }
        
        window.appState.categories.forEach(category => {
            const categoryCard = document.createElement('article');
            categoryCard.className = 'stats__card';
            
            categoryCard.innerHTML = `
                <div class="stats__icon" style="background: linear-gradient(135deg, ${category.color || '#4f46e5'}, #4338ca);">
                    <i class="fas fa-${category.icon || 'folder'}"></i>
                </div>
                <div class="stats__info">
                    <h3 class="stats__info-value">${category.documentCount || 0}</h3>
                    <p class="stats__info-label">${category.nombre}</p>
                </div>
            `;
            
            DOM.categoriesStats.appendChild(categoryCard);
        });
    }
    
    // Renderizar tabla de categorías
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

function populateCategorySelects() {
    // Poblar select de categorías en filtros
    if (DOM.filterCategory) {
        DOM.filterCategory.innerHTML = '<option value="">Todas las categorías</option>';
        window.appState.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.nombre;
            option.textContent = category.nombre;
            DOM.filterCategory.appendChild(option);
        });
    }
    
    // Poblar select de categorías en búsqueda avanzada
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

function editCategory(id) {
    console.log('✏️ Editando categoría:', id);
    openCategoryModal(id);
}

async function deleteCategory(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Los documentos asociados quedarán sin categoría.')) {
        return;
    }
    
    try {
        console.log('🗑️ Eliminando categoría:', id);
        
        const data = await apiCall(`/categories/${id}`, {
            method: 'DELETE'
        });
        
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