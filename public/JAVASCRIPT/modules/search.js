import { DOM } from '../dom.js';
import { showAlert, formatFileSize, getFileIcon, formatDate } from '../utils.js';

// =============================================================================
// FUNCIONES DE BÚSQUEDA DE DOCUMENTOS
// =============================================================================
function searchDocuments(query) {
    console.log('🔍 Buscando documentos con query:', query);
    
    window.appState.currentSearchQuery = query;
    window.renderDocumentsTable();
    
    showAlert(`Se encontraron ${getFilteredDocuments().length} documentos para "${query}"`, 'success');
}

function getFilteredDocuments() {
    let documents = window.appState.documents;
    
    // Aplicar búsqueda si existe
    if (window.appState.currentSearchQuery) {
        const query = window.appState.currentSearchQuery.toLowerCase();
        documents = documents.filter(doc => 
            doc.nombre_original.toLowerCase().includes(query) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(query)) ||
            doc.categoria.toLowerCase().includes(query)
        );
    }
    
    // Aplicar filtros
    if (window.appState.filters.category) {
        documents = documents.filter(doc => doc.categoria === window.appState.filters.category);
    }
    
    if (window.appState.filters.type) {
        documents = documents.filter(doc => doc.tipo_archivo.toLowerCase() === window.appState.filters.type.toLowerCase());
    }
    
    if (window.appState.filters.date) {
        const now = new Date();
        let startDate;
        
        switch(window.appState.filters.date) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }
        
        documents = documents.filter(doc => {
            const docDate = new Date(doc.fecha_subida);
            return docDate >= startDate;
        });
    }
    
    if (window.appState.filters.status) {
        const now = new Date();
        documents = documents.filter(doc => {
            if (!doc.fecha_vencimiento) return window.appState.filters.status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(window.appState.filters.status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    return documents;
}

function showAdvancedSearch() {
    console.log('🔍 Abriendo búsqueda avanzada...');
    
    DOM.searchModal.style.display = 'flex';
}

function closeSearchModal() {
    console.log('❌ Cerrando modal de búsqueda avanzada');
    DOM.searchModal.style.display = 'none';
}

function performAdvancedSearch() {
    console.log('🔍 Realizando búsqueda avanzada...');
    
    const keyword = DOM.searchKeyword.value.trim();
    const category = DOM.searchCategory.value;
    const dateFrom = DOM.searchDateFrom.value;
    const dateTo = DOM.searchDateTo.value;
    const person = DOM.searchPerson.value;
    const status = DOM.searchStatus.value;
    
    // Construir objeto de búsqueda
    const searchCriteria = {
        keyword,
        category,
        dateFrom,
        dateTo,
        person,
        status
    };
    
    console.log('Criterios de búsqueda:', searchCriteria);
    
    // Realizar búsqueda
    let results = window.appState.documents;
    
    if (keyword) {
        results = results.filter(doc => 
            doc.nombre_original.toLowerCase().includes(keyword.toLowerCase()) ||
            (doc.descripcion && doc.descripcion.toLowerCase().includes(keyword.toLowerCase()))
        );
    }
    
    if (category) {
        results = results.filter(doc => doc.categoria === category);
    }
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        results = results.filter(doc => new Date(doc.fecha_subida) >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Fin del día
        results = results.filter(doc => new Date(doc.fecha_subida) <= toDate);
    }
    
    if (person) {
        results = results.filter(doc => doc.persona_id && doc.persona_id._id === person);
    }
    
    if (status) {
        const now = new Date();
        results = results.filter(doc => {
            if (!doc.fecha_vencimiento) return status === 'active';
            
            const fechaVencimiento = new Date(doc.fecha_vencimiento);
            const diferenciaDias = Math.ceil((fechaVencimiento - now) / (1000 * 60 * 60 * 24));
            
            switch(status) {
                case 'active':
                    return diferenciaDias > 7;
                case 'expiring':
                    return diferenciaDias <= 7 && diferenciaDias > 0;
                case 'expired':
                    return diferenciaDias <= 0;
                default:
                    return true;
            }
        });
    }
    
    // Mostrar resultados
    displaySearchResults(results);
    
    showAlert(`Se encontraron ${results.length} documentos con los criterios especificados`, 'success');
}

function displaySearchResults(results) {
    if (!DOM.searchResultsList) return;
    
    DOM.searchResultsList.innerHTML = '';
    
    if (results.length === 0) {
        DOM.searchResultsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search empty-state__icon"></i>
                <h3 class="empty-state__title">No se encontraron documentos</h3>
                <p class="empty-state__description">Intenta con otros criterios de búsqueda</p>
            </div>
        `;
        return;
    }
    
    results.forEach(doc => {
        const person = doc.persona_id ? doc.persona_id : { nombre: 'No asignado' };
        const fileSize = formatFileSize(doc.tamano_archivo);
        const uploadDate = formatDate(doc.fecha_subida);
        
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <div class="search-result-item__icon">
                <i class="fas fa-file-${getFileIcon(doc.tipo_archivo)}"></i>
            </div>
            <div class="search-result-item__content">
                <h4 class="search-result-item__title">${doc.nombre_original}</h4>
                <p class="search-result-item__meta">
                    <span class="badge badge--info">${doc.tipo_archivo.toUpperCase()}</span>
                    <span>${fileSize}</span>
                    <span>${person.nombre}</span>
                    <span>${doc.categoria}</span>
                    <span>${uploadDate}</span>
                </p>
                ${doc.descripcion ? `<p class="search-result-item__description">${doc.descripcion}</p>` : ''}
            </div>
            <div class="search-result-item__actions">
                <button class="btn btn--sm btn--outline" onclick="downloadDocument('${doc._id}')" title="Descargar">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn btn--sm btn--outline" onclick="previewDocument('${doc._id}')" title="Vista previa">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        
        DOM.searchResultsList.appendChild(resultItem);
    });
}

function handleDocumentSearch() {
    const query = DOM.documentSearch.value.trim();
    console.log('🔍 Buscando documentos:', query);
    
    if (query) {
        searchDocuments(query);
    } else {
        showAlert('Por favor ingresa un término de búsqueda', 'warning');
    }
}

function handleClearSearch() {
    console.log('🧹 Limpiando búsqueda...');
    DOM.documentSearch.value = '';
    window.appState.currentSearchQuery = '';
    window.renderDocumentsTable();
}

function handleFilterChange() {
    const filterType = this.id.replace('filter', '').toLowerCase();
    const value = this.value;
    
    console.log(`🔍 Filtro ${filterType} cambiado a: ${value}`);
    window.appState.filters[filterType] = value;
    applyFilters();
}

function applyFilters() {
    console.log('🔍 Aplicando filtros...', window.appState.filters);
    window.renderDocumentsTable();
}

function handleAdvancedSearch() {
    console.log('🔍 Realizando búsqueda avanzada...');
    performAdvancedSearch();
}

export { 
    searchDocuments, 
    getFilteredDocuments, 
    showAdvancedSearch, 
    closeSearchModal, 
    performAdvancedSearch, 
    displaySearchResults, 
    handleDocumentSearch, 
    handleClearSearch, 
    handleFilterChange, 
    applyFilters, 
    handleAdvancedSearch 
};