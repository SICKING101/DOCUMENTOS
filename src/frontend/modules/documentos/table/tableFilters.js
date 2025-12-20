import { DOM } from '../../../dom.js';
import { renderDocumentsTable } from './tableRenderer.js';

/**
 * Inicializa todos los filtros de la tabla de documentos.
 */
export function initializeTableFilters() {
    console.log('🔧 Inicializando filtros de tabla...');
    
    // Inicializar el estado de la aplicación si no existe
    if (!window.appState) {
        console.log('⚠️  window.appState no existe, inicializando...');
        window.appState = {
            documents: [],
            filters: {
                category: '',
                status: ''
            },
            currentSearchQuery: ''
        };
    }
    
    // Verificar que tenemos documentos
    if (!window.appState.documents) {
        console.log('⚠️  window.appState.documents no existe, inicializando array vacío');
        window.appState.documents = [];
    }
    
    console.log(`📊 Estado actual: ${window.appState.documents.length} documentos cargados`);
    
    // Inicializar filtros individuales
    initializeCategoryFilter();
    initializeStatusFilter();
    initializeSearchFilter();
    
    // Botón para limpiar todos los filtros
    const clearAllBtn = document.getElementById('clearAllFilters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllFilters);
    }
    
    // Cargar estado guardado
    loadFilterState();
    
    console.log('✅ Filtros de tabla inicializados');
}

/**
 * Inicializa el filtro por categoría.
 * ¡CORREGIDO! - Ahora maneja correctamente mayúsculas/minúsculas
 */
function initializeCategoryFilter() {
    console.log('📊 Inicializando filtro por categoría...');
    
    if (!DOM.filterCategory) {
        console.warn('❌ Elemento filterCategory no encontrado en el DOM');
        return;
    }
    
    // Limpiar opciones existentes
    DOM.filterCategory.innerHTML = '<option value="">Todas las categorías</option>';
    
    // Verificar que hay documentos
    if (!window.appState || !window.appState.documents || window.appState.documents.length === 0) {
        console.warn('⚠️  No hay documentos para inicializar filtro por categoría');
        
        // Agregar algunas categorías por defecto
        const defaultCategories = ['General', 'Legal', 'Finanzas', 'Recursos Humanos', 'Marketing', 'Técnico'];
        defaultCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category; // Guardar el valor original (con mayúsculas)
            option.textContent = category;
            DOM.filterCategory.appendChild(option);
        });
    } else {
        try {
            // Obtener categorías únicas de los documentos
            const categories = window.appState.documents
                .map(doc => {
                    if (!doc) return null;
                    // Buscar categoría en diferentes propiedades posibles
                    return doc.categoria || doc.categoria_id?.nombre || doc.category || '';
                })
                .filter(categoria => categoria && categoria.trim() !== '')
                .map(cat => cat.trim())
                .filter((categoria, index, array) => {
                    // Comparación case-sensitive para mantener formato original
                    return array.findIndex(item => item.toLowerCase() === categoria.toLowerCase()) === index;
                })
                .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
            
            console.log('📊 Categorías encontradas en documentos:', categories);
            
            // Agregar opciones
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category; // Guardar el valor original
                option.textContent = category;
                DOM.filterCategory.appendChild(option);
            });
            
            console.log(`✅ Agregadas ${categories.length} categorías al filtro`);
        } catch (error) {
            console.error('❌ Error procesando categorías:', error);
        }
    }
    
    // Event listener para cambios
    DOM.filterCategory.addEventListener('change', function() {
        console.log(`🎯 Filtro categoría cambiado a: "${this.value}"`);
        if (window.appState && window.appState.filters) {
            window.appState.filters.category = this.value;
            applyFilters();
        }
    });
}

/**
 * Inicializa el filtro por estado (vencimiento).
 */
function initializeStatusFilter() {
    console.log('📊 Inicializando filtro por estado...');
    
    if (!DOM.filterStatus) {
        console.warn('❌ Elemento filterStatus no encontrado en el DOM');
        return;
    }
    
    // Opciones predefinidas
    const statusOptions = [
        { value: '', label: 'Todos los estados' },
        { value: 'active', label: 'Activos' },
        { value: 'expiring', label: 'Por vencer (≤7 días)' },
        { value: 'expired', label: 'Vencidos' },
        { value: 'no_expiration', label: 'Sin vencimiento' }
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
        console.log(`🎯 Filtro estado cambiado a: "${this.value}"`);
        if (window.appState && window.appState.filters) {
            window.appState.filters.status = this.value;
            applyFilters();
        }
    });
}

/**
 * Inicializa el filtro de búsqueda avanzado.
 */
function initializeSearchFilter() {
    console.log('🔍 Inicializando filtro de búsqueda avanzado...');
    
    if (!DOM.searchInput) {
        console.warn('❌ Elemento searchInput no encontrado en el DOM');
        return;
    }
    
    // Configurar búsqueda con debounce
    let searchTimeout;
    DOM.searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        
        searchTimeout = setTimeout(() => {
            const searchTerm = this.value.trim();
            console.log(`🔍 Buscando: "${searchTerm}"`);
            
            if (window.appState) {
                window.appState.currentSearchQuery = searchTerm;
                applyFilters();
            }
        }, 300); // 300ms de delay
    });
    
    // Botón de limpiar búsqueda
    const clearButton = document.getElementById('clearSearch');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            console.log('🧹 Limpiando búsqueda...');
            DOM.searchInput.value = '';
            
            if (window.appState) {
                window.appState.currentSearchQuery = '';
                applyFilters();
            }
        });
    }
    
    // Permitir búsqueda con Enter
    DOM.searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.trim();
            console.log(`🔍 Buscando (Enter): "${searchTerm}"`);
            
            if (window.appState) {
                window.appState.currentSearchQuery = searchTerm;
                applyFilters();
            }
        }
    });
}

/**
 * Aplica todos los filtros y renderiza la tabla.
 */
export function applyFilters() {
    console.log('🔍 Aplicando filtros...');
    
    try {
        if (!window.appState) {
            console.error('❌ window.appState no está definido');
            return;
        }
        
        if (!window.appState.documents || window.appState.documents.length === 0) {
            console.warn('⚠️  No hay documentos para filtrar');
            return;
        }
        
        console.log('📊 Filtros activos:', window.appState.filters);
        console.log('🔍 Término de búsqueda:', window.appState.currentSearchQuery || '(vacío)');
        
        // Guardar estado de filtros en localStorage
        saveFilterState();
        
        // Obtener documentos filtrados
        const filteredDocuments = filterDocuments();
        
        // Actualizar appState con documentos filtrados
        window.appState.filteredDocuments = filteredDocuments;
        
        // Renderizar tabla con filtros aplicados
        if (typeof renderDocumentsTable === 'function') {
            renderDocumentsTable(filteredDocuments);
        } else {
            console.error('❌ renderDocumentsTable no es una función');
        }
        
        // Actualizar contador de resultados
        updateResultsCount(filteredDocuments);
        
        console.log(`✅ Filtros aplicados: ${filteredDocuments.length} de ${window.appState.documents.length} Documentos`);
        
    } catch (error) {
        console.error('❌ Error aplicando filtros:', error);
    }
}

/**
 * Filtra los documentos según los criterios activos.
 * ¡CORREGIDO! - Comparación de categorías mejorada
 */
function filterDocuments() {
    const { documents, filters, currentSearchQuery } = window.appState;
    
    return documents.filter(doc => {
        // Filtro por categoría (¡CORREGIDO!)
        if (filters.category && filters.category !== '') {
            // Obtener categoría del documento
            const docCategory = doc.categoria || doc.categoria_id?.nombre || '';
            
            // Comparar ignorando mayúsculas/minúsculas y espacios
            const normalizedDocCategory = docCategory.toString().toLowerCase().trim();
            const normalizedFilterCategory = filters.category.toString().toLowerCase().trim();
            
            console.log(`📊 Comparando categorías - Documento: "${docCategory}" (normalizado: "${normalizedDocCategory}") vs Filtro: "${filters.category}" (normalizado: "${normalizedFilterCategory}")`);
            
            if (normalizedDocCategory !== normalizedFilterCategory) {
                console.log(`❌ Categoría no coincide: ${docCategory} != ${filters.category}`);
                return false;
            }
            
            console.log(`✅ Categoría coincide: ${docCategory} == ${filters.category}`);
        }
        
        // Filtro por estado
        if (filters.status && filters.status !== '') {
            if (doc.fecha_vencimiento) {
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const hoy = new Date();
                const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                
                switch (filters.status) {
                    case 'active':
                        if (diferenciaDias <= 0 || diferenciaDias <= 7) {
                            console.log(`❌ Estado no coincide (active): diferencia días = ${diferenciaDias}`);
                            return false;
                        }
                        break;
                    case 'expiring':
                        if (diferenciaDias > 7 || diferenciaDias <= 0) {
                            console.log(`❌ Estado no coincide (expiring): diferencia días = ${diferenciaDias}`);
                            return false;
                        }
                        break;
                    case 'expired':
                        if (diferenciaDias > 0) {
                            console.log(`❌ Estado no coincide (expired): diferencia días = ${diferenciaDias}`);
                            return false;
                        }
                        break;
                    case 'no_expiration':
                        console.log(`❌ Estado no coincide (no_expiration): documento tiene fecha de vencimiento`);
                        return false; // Si tiene fecha, no es "sin vencimiento"
                }
            } else {
                // Documento sin fecha de vencimiento
                if (filters.status !== 'no_expiration') {
                    console.log(`❌ Estado no coincide: documento sin fecha pero filtro es ${filters.status}`);
                    return false;
                }
            }
        }
        
        // Filtro por búsqueda avanzada
        if (currentSearchQuery && currentSearchQuery.trim() !== '') {
            const searchTerm = currentSearchQuery.toLowerCase().trim();
            
            // Campos donde buscar
            const searchFields = [
                doc.nombre_original,
                doc.nombre,
                doc.descripcion,
                doc.categoria,
                doc.categoria_id?.nombre,
                doc.tipo_archivo,
                doc.extension
            ].filter(Boolean).map(field => field.toString().toLowerCase());
            
            // Buscar en múltiples campos
            const found = searchFields.some(field => field.includes(searchTerm));
            
            if (!found) {
                console.log(`❌ Búsqueda no coincide: "${searchTerm}" no encontrado en campos del documento`);
                return false;
            }
            
            console.log(`✅ Búsqueda coincide: "${searchTerm}" encontrado en el documento`);
        }
        
        return true;
    });
}

/**
 * Guarda el estado de los filtros en localStorage.
 */
function saveFilterState() {
    try {
        if (window.appState && window.appState.filters) {
            localStorage.setItem('documentFilters', JSON.stringify(window.appState.filters));
        }
        if (window.appState && window.appState.currentSearchQuery !== undefined) {
            localStorage.setItem('documentSearchQuery', window.appState.currentSearchQuery || '');
        }
    } catch (error) {
        console.warn('⚠️  No se pudo guardar el estado de filtros:', error);
    }
}

/**
 * Carga el estado de los filtros desde localStorage.
 */
export function loadFilterState() {
    console.log('📥 Cargando estado de filtros desde localStorage...');
    
    try {
        const savedFilters = localStorage.getItem('documentFilters');
        const savedSearch = localStorage.getItem('documentSearchQuery');
        
        console.log('📥 Filtros guardados en localStorage:', savedFilters);
        console.log('📥 Búsqueda guardada en localStorage:', savedSearch);
        
        if (savedFilters) {
            if (!window.appState) {
                window.appState = {
                    documents: [],
                    filters: {
                        category: '',
                        status: ''
                    },
                    currentSearchQuery: ''
                };
            }
            
            if (!window.appState.filters) {
                window.appState.filters = {
                    category: '',
                    status: ''
                };
            }
            
            const parsedFilters = JSON.parse(savedFilters);
            console.log('📥 Filtros parseados:', parsedFilters);
            
            // Actualizar filtros
            if (parsedFilters.category !== undefined) {
                window.appState.filters.category = parsedFilters.category;
            }
            if (parsedFilters.status !== undefined) {
                window.appState.filters.status = parsedFilters.status;
            }
            
            // Restaurar valores en los inputs
            restoreFilterInputs();
        }
        
        if (savedSearch !== null) {
            if (!window.appState) {
                window.appState = {
                    documents: [],
                    filters: {
                        category: '',
                        status: ''
                    },
                    currentSearchQuery: ''
                };
            }
            
            window.appState.currentSearchQuery = savedSearch;
            if (DOM.searchInput) {
                DOM.searchInput.value = savedSearch;
                console.log(`🔍 Búsqueda restaurada: "${savedSearch}"`);
            }
        }
        
        console.log('📥 Estado final de filtros:', window.appState.filters);
        
    } catch (error) {
        console.warn('⚠️  No se pudo cargar el estado de filtros:', error);
    }
}

/**
 * Restaura los valores de los inputs de filtro desde el estado.
 * ¡CORREGIDO! - Busca opción por texto si no encuentra por value
 */
function restoreFilterInputs() {
    if (!window.appState || !window.appState.filters) {
        console.warn('⚠️  No hay filtros para restaurar');
        return;
    }
    
    const { filters } = window.appState;
    console.log('🔄 Restaurando valores de filtros:', filters);
    
    try {
        // Restaurar categoría
        if (DOM.filterCategory && filters.category !== undefined && filters.category !== '') {
            // Primero intentar por valor exacto
            const exactMatch = Array.from(DOM.filterCategory.options).find(
                option => option.value.toLowerCase() === filters.category.toLowerCase()
            );
            
            if (exactMatch) {
                DOM.filterCategory.value = exactMatch.value;
                console.log(`🔄 Categoría restaurada por valor exacto: "${filters.category}"`);
            } else {
                // Si no hay match exacto, buscar por texto
                const textMatch = Array.from(DOM.filterCategory.options).find(
                    option => option.textContent.toLowerCase() === filters.category.toLowerCase()
                );
                
                if (textMatch) {
                    DOM.filterCategory.value = textMatch.value;
                    console.log(`🔄 Categoría restaurada por texto: "${filters.category}" -> "${textMatch.value}"`);
                } else {
                    console.warn(`⚠️  No se encontró la categoría "${filters.category}" en las opciones disponibles`);
                    DOM.filterCategory.value = '';
                    window.appState.filters.category = '';
                }
            }
        } else if (DOM.filterCategory) {
            DOM.filterCategory.value = '';
        }
        
        // Restaurar estado (más simple)
        if (DOM.filterStatus && filters.status !== undefined) {
            DOM.filterStatus.value = filters.status || '';
            console.log(`🔄 Estado restaurado: "${filters.status}"`);
        }
        
    } catch (error) {
        console.error('❌ Error restaurando filtros:', error);
    }
}

/**
 * Limpia todos los filtros.
 */
export function clearAllFilters() {
    console.log('🧹 Limpiando todos los filtros...');
    
    try {
        // Resetear estado
        if (window.appState) {
            window.appState.filters = {
                category: '',
                status: ''
            };
            window.appState.currentSearchQuery = '';
        }
        
        // Resetear inputs
        if (DOM.filterCategory) {
            DOM.filterCategory.value = '';
            console.log('🧹 Categoría limpiada');
        }
        if (DOM.filterStatus) {
            DOM.filterStatus.value = '';
            console.log('🧹 Estado limpiado');
        }
        if (DOM.searchInput) {
            DOM.searchInput.value = '';
            console.log('🧹 Búsqueda limpiada');
        }
        
        // Aplicar cambios
        applyFilters();
        
        console.log('✅ Filtros limpiados');
    } catch (error) {
        console.error('❌ Error limpiando filtros:', error);
    }
}

/**
 * Actualiza el contador de resultados.
 */
function updateResultsCount(filteredDocuments) {
    const countElement = document.getElementById('resultsCount');
    if (!countElement) {
        console.warn('⚠️  Elemento resultsCount no encontrado');
        return;
    }
    
    const totalDocuments = window.appState?.documents?.length || 0;
    const filteredCount = filteredDocuments?.length || 0;
    
    console.log(`📊 Resultados: ${filteredCount} de ${totalDocuments} documentos`);
    
    countElement.textContent = filteredCount === totalDocuments ? 
        `${totalDocuments} documentos` : 
        `${filteredCount} de ${totalDocuments} documentos`;
    
}

/**
 * Obtiene estadísticas de los documentos filtrados.
 * @returns {object} - Estadísticas de los documentos
 */
export function getFilteredDocumentStats() {
    console.log('📈 Obteniendo estadísticas de documentos filtrados...');
    
    if (!window.appState?.documents || !window.appState?.filteredDocuments) {
        console.warn('⚠️  No hay documentos para calcular estadísticas');
        return null;
    }
    
    try {
        const filteredDocuments = window.appState.filteredDocuments;
        
        const stats = {
            total: filteredDocuments.length,
            byCategory: {},
            byStatus: {},
            totalSize: 0
        };
        
        // Calcular estadísticas
        filteredDocuments.forEach(doc => {
            // Por categoría
            const category = doc.categoria || doc.categoria_id?.nombre || 'Sin categoría';
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
            
            // Tamaño total
            stats.totalSize += doc.tamano_archivo || 0;
            
            // Estado de vencimiento
            if (doc.fecha_vencimiento) {
                const fechaVencimiento = new Date(doc.fecha_vencimiento);
                const hoy = new Date();
                const diferenciaDias = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                
                if (diferenciaDias <= 0) {
                    stats.byStatus['vencido'] = (stats.byStatus['vencido'] || 0) + 1;
                } else if (diferenciaDias <= 7) {
                    stats.byStatus['por vencer'] = (stats.byStatus['por vencer'] || 0) + 1;
                } else {
                    stats.byStatus['activo'] = (stats.byStatus['activo'] || 0) + 1;
                }
            } else {
                stats.byStatus['sin vencimiento'] = (stats.byStatus['sin vencimiento'] || 0) + 1;
            }
        });
        
        console.log('📈 Estadísticas calculadas:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        return null;
    }
}

/**
 * Exporta los documentos filtrados a CSV.
 */
export function exportFilteredToCSV() {
    console.log('📤 Exportando documentos a CSV...');
    
    if (!window.appState?.filteredDocuments || window.appState.filteredDocuments.length === 0) {
        alert('No hay documentos para exportar');
        return;
    }
    
    try {
        const documentsToExport = window.appState.filteredDocuments;
        
        console.log(`📤 Exportando ${documentsToExport.length} documentos`);
        
        // Crear CSV
        const headers = ['Nombre', 'Categoría', 'Fecha Subida', 'Fecha Vencimiento', 'Tamaño', 'Descripción'];
        const csvRows = [
            headers.join(','),
            ...documentsToExport.map(doc => [
                `"${(doc.nombre_original || '').replace(/"/g, '""')}"`,
                `"${doc.categoria || doc.categoria_id?.nombre || ''}"`,
                doc.fecha_subida ? new Date(doc.fecha_subida).toLocaleDateString() : '',
                doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento).toLocaleDateString() : '',
                doc.tamano_archivo || 0,
                `"${(doc.descripcion || '').replace(/"/g, '""')}"`
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Descargar
        const link = document.createElement('a');
        link.href = url;
        const fecha = new Date().toISOString().split('T')[0];
        link.download = `documentos_${fecha}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log('✅ Exportación completada');
    } catch (error) {
        console.error('❌ Error exportando CSV:', error);
        alert('Error al exportar los documentos');
    }
}

/**
 * Actualiza los filtros con nuevos documentos.
 * @param {Array} documents - Array de documentos
 */
export function updateFilters(documents) {
    console.log('🔄 Actualizando filtros con nuevos documentos...');
    
    if (!window.appState) {
        window.appState = {
            documents: [],
            filters: {
                category: '',
                status: ''
            },
            currentSearchQuery: ''
        };
    }
    
    window.appState.documents = documents || [];
    
    // Re-inicializar filtro de categorías con los nuevos documentos
    initializeCategoryFilter();
    
    // Restaurar el valor seleccionado anteriormente si existe
    const currentCategory = window.appState.filters.category;
    if (currentCategory && DOM.filterCategory) {
        const optionExists = Array.from(DOM.filterCategory.options).some(
            option => option.value.toLowerCase() === currentCategory.toLowerCase()
        );
        
        if (optionExists) {
            DOM.filterCategory.value = currentCategory;
            console.log(`🔄 Categoría preservada: "${currentCategory}"`);
        } else {
            window.appState.filters.category = '';
            DOM.filterCategory.value = '';
            console.log(`⚠️  Categoría anterior "${currentCategory}" ya no existe, limpiando filtro`);
        }
    }
    
    // Aplicar filtros actuales a los nuevos documentos
    applyFilters();
}

/**
 * Función para debuggear el estado actual
 */
export function debugFilters() {
    console.log('=== DEBUG DE FILTROS ===');
    console.log('Total documentos:', window.appState?.documents?.length);
    console.log('Documentos filtrados:', window.appState?.filteredDocuments?.length);
    console.log('Filtros activos:', window.appState?.filters);
    console.log('Búsqueda actual:', window.appState?.currentSearchQuery);
    
    if (window.appState?.documents?.length > 0) {
        console.log('Primeros 3 documentos (categorías):');
        window.appState.documents.slice(0, 3).forEach((doc, i) => {
            console.log(`  ${i + 1}: ${doc.nombre_original} - Categoría: "${doc.categoria}" (tipo: ${typeof doc.categoria})`);
        });
    }
    
    if (DOM.filterCategory) {
        console.log('Opciones en filtro de categoría:');
        Array.from(DOM.filterCategory.options).forEach((opt, i) => {
            console.log(`  ${i}: value="${opt.value}" text="${opt.textContent}"`);
        });
    }
    
    console.log('=== FIN DEBUG ===');
}

// Asegurar que el objeto DOM tenga los elementos necesarios
if (!DOM.filterCategory) {
    DOM.filterCategory = document.getElementById('filterCategory');
}

if (!DOM.filterStatus) {
    DOM.filterStatus = document.getElementById('filterStatus');
}

if (!DOM.searchInput) {
    DOM.searchInput = document.getElementById('searchInput');
}

// Función para diagnosticar problemas de categorías
export function diagnoseCategoryFilter() {
    console.log('=== DIAGNÓSTICO DE FILTRO CATEGORÍA ===');
    
    if (!window.appState?.documents) {
        console.log('❌ No hay documentos en appState');
        return;
    }
    
    // Analizar todas las categorías en los documentos
    const allCategories = window.appState.documents
        .map(doc => ({
            nombre: doc.nombre_original,
            categoria: doc.categoria,
            categoria_id_nombre: doc.categoria_id?.nombre,
            categoria_raw: doc.categoria,
            categoria_type: typeof doc.categoria
        }))
        .filter(item => item.categoria || item.categoria_id_nombre);
    
    console.log('📊 Análisis de categorías en documentos:');
    console.table(allCategories);
    
    // Verificar opciones en el select
    if (DOM.filterCategory) {
        const selectOptions = Array.from(DOM.filterCategory.options).map(opt => ({
            value: opt.value,
            text: opt.textContent,
            selected: opt.selected
        }));
        
        console.log('📊 Opciones en el select:');
        console.table(selectOptions);
    }
    
    console.log('=== FIN DIAGNÓSTICO ===');
}