import { DOM } from '../../../dom.js';
import { renderDocumentsTable } from './tableRenderer.js';

/**
 * Inicializa todos los filtros de la tabla de documentos.
 */
export function initializeTableFilters() {
    console.log('🔧 Inicializando filtros de tabla...');
    
    // Inicializar filtros individuales
    initializeCategoryFilter();
    initializeTypeFilter();
    initializeDateFilter();
    initializeStatusFilter();
    initializeSearchFilter();
    
    console.log('✅ Filtros de tabla inicializados');
}

/**
 * Inicializa el filtro por categoría.
 */
function initializeCategoryFilter() {
    if (!DOM.filterCategory) return;
    
    // Limpiar opciones existentes
    DOM.filterCategory.innerHTML = '<option value="">Todas las categorías</option>';
    
    // Obtener categorías únicas de los documentos
    const categories = [...new Set(window.appState.documents.map(doc => doc.categoria))].sort();
    
    // Agregar opciones
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        DOM.filterCategory.appendChild(option);
    });
    
    // Event listener para cambios
    DOM.filterCategory.addEventListener('change', function() {
        window.appState.filters.category = this.value;
        applyFilters();
    });
}

/**
 * Inicializa el filtro por tipo de archivo.
 */
function initializeTypeFilter() {
    if (!DOM.filterType) return;
    
    // Limpiar opciones existentes
    DOM.filterType.innerHTML = '<option value="">Todos los tipos</option>';
    
    // Obtener tipos únicos de archivos
    const fileTypes = [...new Set(window.appState.documents.map(doc => doc.tipo_archivo.toLowerCase()))].sort();
    
    // Agregar opciones
    fileTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.toUpperCase();
        DOM.filterType.appendChild(option);
    });
    
    // Event listener para cambios
    DOM.filterType.addEventListener('change', function() {
        window.appState.filters.type = this.value;
        applyFilters();
    });
}

/**
 * Inicializa el filtro por fecha.
 */
function initializeDateFilter() {
    if (!DOM.filterDate) return;
    
    // Opciones predefinidas
    const dateOptions = [
        { value: '', label: 'Todas las fechas' },
        { value: 'today', label: 'Hoy' },
        { value: 'week', label: 'Última semana' },
        { value: 'month', label: 'Último mes' },
        { value: 'quarter', label: 'Último trimestre' },
        { value: 'year', label: 'Último año' },
        { value: 'custom', label: 'Rango personalizado' }
    ];
    
    // Limpiar y poblar opciones
    DOM.filterDate.innerHTML = '';
    dateOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        DOM.filterDate.appendChild(optElement);
    });
    
    // Event listener para cambios
    DOM.filterDate.addEventListener('change', function() {
        window.appState.filters.date = this.value;
        
        // Si es personalizado, mostrar selector de fechas
        if (this.value === 'custom') {
            showCustomDateRangeSelector();
        } else {
            applyFilters();
        }
    });
}

/**
 * Inicializa el filtro por estado (vencimiento).
 */
function initializeStatusFilter() {
    if (!DOM.filterStatus) return;
    
    // Opciones predefinidas
    const statusOptions = [
        { value: '', label: 'Todos los estados' },
        { value: 'active', label: 'Activos' },
        { value: 'expiring', label: 'Por vencer (≤7 días)' },
        { value: 'expired', label: 'Vencidos' },
        { value: 'no-expiration', label: 'Sin fecha de vencimiento' }
    ];
    
    // Limpiar y poblar opciones
    DOM.filterStatus.innerHTML = '';
    statusOptions.forEach(option => {
        const optElement = document.createElement('option');
        optElement.value = option.value;
        optElement.textContent = option.label;
        DOM.filterStatus.appendChild(optElement);
    });
    
    // Event listener para cambios
    DOM.filterStatus.addEventListener('change', function() {
        window.appState.filters.status = this.value;
        applyFilters();
    });
}

/**
 * Inicializa el filtro de búsqueda.
 */
function initializeSearchFilter() {
    if (!DOM.searchInput) return;
    
    // Configurar búsqueda con debounce
    let searchTimeout;
    DOM.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.trim().toLowerCase();
            window.appState.currentSearchQuery = searchTerm;
            applyFilters();
        }, 300); // 300ms de delay
    });
    
    // Botón de limpiar búsqueda
    const clearButton = DOM.searchInput.parentElement?.querySelector('.search-clear');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            DOM.searchInput.value = '';
            window.appState.currentSearchQuery = '';
            applyFilters();
        });
    }
}

/**
 * Muestra el selector de rango de fechas personalizado.
 */
function showCustomDateRangeSelector() {
    // Crear modal para selector de fechas
    const modal = document.createElement('div');
    modal.className = 'modal modal--date-range';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div class="modal__content" style="
            background: white;
            padding: 2rem;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
        ">
            <h3 style="margin-top: 0;">Seleccionar rango de fechas</h3>
            
            <div class="form__group" style="margin-bottom: 1rem;">
                <label>Fecha de inicio</label>
                <input type="date" id="customDateStart" class="form__input" style="width: 100%;">
            </div>
            
            <div class="form__group" style="margin-bottom: 1.5rem;">
                <label>Fecha de fin</label>
                <input type="date" id="customDateEnd" class="form__input" style="width: 100%;">
            </div>
            
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                <button id="cancelCustomDate" class="btn btn--outline" style="padding: 0.5rem 1rem;">
                    Cancelar
                </button>
                <button id="applyCustomDate" class="btn btn--primary" style="padding: 0.5rem 1rem;">
                    Aplicar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setear fechas por defecto (últimos 30 días)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('customDateStart').valueAsDate = startDate;
    document.getElementById('customDateEnd').valueAsDate = endDate;
    
    // Event listeners
    document.getElementById('cancelCustomDate').addEventListener('click', () => {
        document.body.removeChild(modal);
        DOM.filterDate.value = '';
        window.appState.filters.date = '';
        applyFilters();
    });
    
    document.getElementById('applyCustomDate').addEventListener('click', () => {
        const start = document.getElementById('customDateStart').value;
        const end = document.getElementById('customDateEnd').value;
        
        if (!start || !end) {
            alert('Por favor selecciona ambas fechas');
            return;
        }
        
        window.appState.filters.customDateRange = {
            start: new Date(start),
            end: new Date(end)
        };
        
        document.body.removeChild(modal);
        applyFilters();
    });
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            DOM.filterDate.value = '';
            window.appState.filters.date = '';
            applyFilters();
        }
    });
}

/**
 * Aplica todos los filtros y renderiza la tabla.
 */
export function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    // Guardar estado de filtros en localStorage
    saveFilterState();
    
    // Renderizar tabla con filtros aplicados
    renderDocumentsTable();
    
    // Actualizar contador de resultados
    updateResultsCount();
    
    console.log('✅ Filtros aplicados');
}

/**
 * Guarda el estado de los filtros en localStorage.
 */
function saveFilterState() {
    try {
        localStorage.setItem('documentFilters', JSON.stringify(window.appState.filters));
        localStorage.setItem('documentSearchQuery', window.appState.currentSearchQuery || '');
    } catch (error) {
        console.warn('No se pudo guardar el estado de filtros:', error);
    }
}

/**
 * Carga el estado de los filtros desde localStorage.
 */
export function loadFilterState() {
    try {
        const savedFilters = localStorage.getItem('documentFilters');
        const savedSearch = localStorage.getItem('documentSearchQuery');
        
        if (savedFilters) {
            window.appState.filters = JSON.parse(savedFilters);
            restoreFilterInputs();
        }
        
        if (savedSearch) {
            window.appState.currentSearchQuery = savedSearch;
            if (DOM.searchInput) {
                DOM.searchInput.value = savedSearch;
            }
        }
        
        console.log('📥 Estado de filtros cargado desde localStorage');
    } catch (error) {
        console.warn('No se pudo cargar el estado de filtros:', error);
    }
}

/**
 * Restaura los valores de los inputs de filtro desde el estado.
 */
function restoreFilterInputs() {
    const { filters } = window.appState;
    
    if (DOM.filterCategory && filters.category) {
        DOM.filterCategory.value = filters.category;
    }
    
    if (DOM.filterType && filters.type) {
        DOM.filterType.value = filters.type;
    }
    
    if (DOM.filterDate && filters.date) {
        DOM.filterDate.value = filters.date;
    }
    
    if (DOM.filterStatus && filters.status) {
        DOM.filterStatus.value = filters.status;
    }
}

/**
 * Limpia todos los filtros.
 */
export function clearAllFilters() {
    console.log('🧹 Limpiando todos los filtros...');
    
    // Resetear estado
    window.appState.filters = {
        category: '',
        type: '',
        date: '',
        status: '',
        customDateRange: null
    };
    window.appState.currentSearchQuery = '';
    
    // Resetear inputs
    if (DOM.filterCategory) DOM.filterCategory.value = '';
    if (DOM.filterType) DOM.filterType.value = '';
    if (DOM.filterDate) DOM.filterDate.value = '';
    if (DOM.filterStatus) DOM.filterStatus.value = '';
    if (DOM.searchInput) DOM.searchInput.value = '';
    
    // Aplicar cambios
    applyFilters();
    
    console.log('✅ Filtros limpiados');
}

/**
 * Actualiza el contador de resultados.
 */
function updateResultsCount() {
    const countElement = document.getElementById('resultsCount');
    if (!countElement) return;
    
    const tableBody = DOM.documentosTableBody;
    if (!tableBody) return;
    
    // Contar filas visibles (excluyendo el mensaje de vacío)
    const visibleRows = Array.from(tableBody.querySelectorAll('tr'))
        .filter(row => !row.classList.contains('empty-state') && row.style.display !== 'none');
    
    const totalDocuments = window.appState.documents.length;
    const filteredCount = visibleRows.length;
    
    countElement.textContent = filteredCount === totalDocuments ? 
        `${totalDocuments} documentos` : 
        `${filteredCount} de ${totalDocuments} documentos`;
    
    // Mostrar/ocultar badge de filtros activos
    const activeFiltersBadge = document.getElementById('activeFiltersBadge');
    if (activeFiltersBadge) {
        const hasActiveFilters = filteredCount !== totalDocuments || 
                                Object.values(window.appState.filters).some(val => val) ||
                                window.appState.currentSearchQuery;
        
        if (hasActiveFilters) {
            activeFiltersBadge.style.display = 'inline-flex';
            
            // Contar filtros activos
            const activeFilterCount = Object.values(window.appState.filters)
                .filter(val => val && val !== '' && val !== null).length + 
                (window.appState.currentSearchQuery ? 1 : 0);
            
            activeFiltersBadge.textContent = activeFilterCount;
        } else {
            activeFiltersBadge.style.display = 'none';
        }
    }
}

/**
 * Obtiene estadísticas de los documentos filtrados.
 * @returns {object} - Estadísticas de los documentos
 */
export function getFilteredDocumentStats() {
    const tableBody = DOM.documentosTableBody;
    if (!tableBody) return null;
    
    const visibleRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-state)'))
        .filter(row => row.style.display !== 'none');
    
    const stats = {
        total: visibleRows.length,
        byType: {},
        byCategory: {},
        byStatus: {},
        totalSize: 0,
        expiringSoon: 0,
        expired: 0
    };
    
    // Obtener documentos visibles
    const visibleDocuments = window.appState.documents.filter(doc => {
        // Esta es una simplificación - en realidad deberíamos usar la misma lógica de filtro
        const row = tableBody.querySelector(`tr[data-document-id="${doc._id}"]`);
        return row && row.style.display !== 'none';
    });
    
    // Calcular estadísticas
    visibleDocuments.forEach(doc => {
        // Por tipo
        stats.byType[doc.tipo_archivo] = (stats.byType[doc.tipo_archivo] || 0) + 1;
        
        // Por categoría
        stats.byCategory[doc.categoria] = (stats.byCategory[doc.categoria] || 0) + 1;
        
        // Tamaño total
        stats.totalSize += doc.tamano_archivo || 0;
        
        // Estado de vencimiento
        if (doc.fecha_vencimiento) {
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const hoy = new Date();
            const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            
            if (diferenciaDias <= 0) {
                stats.expired++;
                stats.byStatus['vencido'] = (stats.byStatus['vencido'] || 0) + 1;
            } else if (diferenciaDias <= 7) {
                stats.expiringSoon++;
                stats.byStatus['por vencer'] = (stats.byStatus['por vencer'] || 0) + 1;
            } else {
                stats.byStatus['activo'] = (stats.byStatus['activo'] || 0) + 1;
            }
        } else {
            stats.byStatus['sin vencimiento'] = (stats.byStatus['sin vencimiento'] || 0) + 1;
        }
    });
    
    return stats;
}

/**
 * Exporta los documentos filtrados a CSV.
 */
export function exportFilteredToCSV() {
    const tableBody = DOM.documentosTableBody;
    if (!tableBody) return;
    
    const visibleRows = Array.from(tableBody.querySelectorAll('tr:not(.empty-state)'))
        .filter(row => row.style.display !== 'none');
    
    if (visibleRows.length === 0) {
        alert('No hay documentos para exportar');
        return;
    }
    
    // Obtener documentos visibles
    const visibleDocumentIds = visibleRows
        .map(row => row.dataset.documentId)
        .filter(id => id);
    
    const documentsToExport = window.appState.documents
        .filter(doc => visibleDocumentIds.includes(doc._id));
    
    // Crear CSV
    const headers = ['Nombre', 'Tipo', 'Tamaño', 'Categoría', 'Persona', 'Fecha Subida', 'Fecha Vencimiento', 'Descripción'];
    const csvRows = [
        headers.join(','),
        ...documentsToExport.map(doc => [
            `"${doc.nombre_original.replace(/"/g, '""')}"`,
            doc.tipo_archivo,
            doc.tamano_archivo,
            `"${doc.categoria}"`,
            `"${doc.persona_id?.nombre || 'No asignado'}"`,
            new Date(doc.fecha_subida).toLocaleDateString(),
            doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento).toLocaleDateString() : '',
            `"${(doc.descripcion || '').replace(/"/g, '""')}"`
        ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Descargar
    const link = document.createElement('a');
    link.href = url;
    link.download = `documentos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    // Limpiar
    setTimeout(() => URL.revokeObjectURL(url), 100);
}