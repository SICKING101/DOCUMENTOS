// =============================================================================
// src/frontend/modules/documentos/modals/categoriesChips.js
// Sistema de selección de categorías con chips interactivos
// =============================================================================

/**
 * Clase que gestiona el selector de categorías con chips.
 * Reemplaza el select tradicional por chips visuales con búsqueda.
 */
export class CategoriesChipsSelector {
    /**
     * @param {object} options - Configuración
     * @param {string} options.containerId - ID del contenedor principal
     * @param {string} options.searchInputId - ID del input de búsqueda
     * @param {string} options.chipsContainerId - ID del contenedor de chips
     * @param {string} options.hiddenInputId - ID del input hidden donde se guarda el valor
     * @param {string} options.noResultsId - ID del mensaje de "sin resultados"
     * @param {string} [options.placeholder] - Placeholder del input
     */
    constructor(options) {
        this.container = document.getElementById(options.containerId);
        this.searchInput = document.getElementById(options.searchInputId);
        this.chipsContainer = document.getElementById(options.chipsContainerId);
        this.hiddenInput = document.getElementById(options.hiddenInputId);
        this.noResultsEl = document.getElementById(options.noResultsId);
        this.placeholder = options.placeholder || 'Buscar categoría...';
        
        this.categories = [];
        this.selectedCategory = '';
        this.onChangeCallback = null;
        
        if (this.searchInput) {
            this.searchInput.placeholder = this.placeholder;
        }
        
        this.init();
    }

    /**
     * Inicializa el selector
     */
    init() {
        this.loadCategories();
        this.setupEventListeners();
    }

    /**
     * Carga las categorías desde el estado global
     */
    loadCategories() {
        if (window.appState && window.appState.categories && window.appState.categories.length > 0) {
            this.categories = window.appState.categories.map(cat => ({
                nombre: cat.nombre || cat.name,
                icono: this.getCategoryIcon(cat.nombre || cat.name),
                color: this.getCategoryColor(cat.nombre || cat.name)
            }));
        } else {
            // Categorías de ejemplo si no hay datos
            this.categories = [
                { nombre: 'Finanzas', icono: 'fa-coins', color: '#10b981' },
                { nombre: 'Recursos Humanos', icono: 'fa-users', color: '#6366f1' },
                { nombre: 'Legal', icono: 'fa-gavel', color: '#f59e0b' },
                { nombre: 'Marketing', icono: 'fa-bullhorn', color: '#ec4899' },
                { nombre: 'Operaciones', icono: 'fa-cogs', color: '#06b6d4' },
                { nombre: 'Ventas', icono: 'fa-chart-line', color: '#8b5cf6' },
                { nombre: 'TI', icono: 'fa-laptop-code', color: '#3b82f6' },
                { nombre: 'Administración', icono: 'fa-building', color: '#64748b' }
            ];
        }
        
        this.renderChips();
    }

    /**
     * Obtiene el icono según el nombre de la categoría
     */
    getCategoryIcon(nombre) {
        const nombreLower = (nombre || '').toLowerCase();
        const iconMap = {
            'finanzas': 'fa-coins',
            'financiero': 'fa-coins',
            'contabilidad': 'fa-calculator',
            'recursos humanos': 'fa-users',
            'rh': 'fa-users',
            'personal': 'fa-user-tie',
            'legal': 'fa-gavel',
            'jurídico': 'fa-balance-scale',
            'marketing': 'fa-bullhorn',
            'publicidad': 'fa-ad',
            'operaciones': 'fa-cogs',
            'operativo': 'fa-gear',
            'ventas': 'fa-chart-line',
            'comercial': 'fa-handshake',
            'ti': 'fa-laptop-code',
            'tecnología': 'fa-microchip',
            'sistemas': 'fa-server',
            'administración': 'fa-building',
            'admin': 'fa-building',
            'general': 'fa-folder',
            'documentos': 'fa-file-alt',
            'reportes': 'fa-chart-bar',
            'informes': 'fa-file-lines'
        };
        
        return iconMap[nombreLower] || 'fa-folder';
    }

    /**
     * Obtiene el color según el nombre de la categoría
     */
    getCategoryColor(nombre) {
        const nombreLower = (nombre || '').toLowerCase();
        const colorMap = {
            'finanzas': '#10b981',
            'financiero': '#10b981',
            'contabilidad': '#059669',
            'recursos humanos': '#6366f1',
            'rh': '#6366f1',
            'personal': '#4f46e5',
            'legal': '#f59e0b',
            'jurídico': '#d97706',
            'marketing': '#ec4899',
            'publicidad': '#db2777',
            'operaciones': '#06b6d4',
            'operativo': '#0891b2',
            'ventas': '#8b5cf6',
            'comercial': '#7c3aed',
            'ti': '#3b82f6',
            'tecnología': '#2563eb',
            'sistemas': '#1d4ed8',
            'administración': '#64748b',
            'admin': '#475569'
        };
        
        return colorMap[nombreLower] || '#dc2626';
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Búsqueda con debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterChips(this.searchInput.value);
            }, 200);
        });

        // Tecla Escape limpia búsqueda
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.searchInput.value = '';
                this.filterChips('');
                this.searchInput.blur();
            }
        });

        // Click fuera cierra búsqueda activa
        document.addEventListener('click', (e) => {
            if (this.container && !this.container.contains(e.target)) {
                this.searchInput.value = '';
                this.filterChips('');
            }
        });
    }

    /**
     * Renderiza todos los chips de categorías
     */
    renderChips() {
        if (!this.chipsContainer) return;
        
        this.chipsContainer.innerHTML = '';
        
        this.categories.forEach(category => {
            const chip = this.createChip(category);
            this.chipsContainer.appendChild(chip);
        });
    }

    /**
     * Crea un chip individual
     */
    createChip(category) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'category-chip';
        chip.dataset.category = category.nombre;
        chip.innerHTML = `
            <i class="fas ${category.icono}" style="color: ${category.color};"></i>
            <span>${category.nombre}</span>
        `;
        
        // Marcar como seleccionado si es la categoría actual
        if (this.selectedCategory === category.nombre) {
            chip.classList.add('category-chip--selected');
            chip.style.background = category.color;
            chip.style.borderColor = category.color;
            chip.style.color = 'white';
            const icon = chip.querySelector('i');
            if (icon) icon.style.color = 'white';
        }
        
        // Evento de click
        chip.addEventListener('click', () => {
            this.selectCategory(category.nombre, chip);
        });
        
        return chip;
    }

    /**
     * Filtra los chips según el texto de búsqueda
     */
    filterChips(searchText) {
        const chips = this.chipsContainer.querySelectorAll('.category-chip');
        let visibleCount = 0;
        const searchLower = searchText.toLowerCase().trim();
        
        chips.forEach(chip => {
            const categoryName = (chip.dataset.category || '').toLowerCase();
            
            if (searchLower === '' || categoryName.includes(searchLower)) {
                chip.classList.remove('category-chip--hidden');
                visibleCount++;
            } else {
                chip.classList.add('category-chip--hidden');
            }
        });
        
        // Mostrar/ocultar mensaje de "sin resultados"
        if (this.noResultsEl) {
            this.noResultsEl.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    /**
     * Selecciona una categoría
     */
    selectCategory(categoryName, chipElement) {
        console.log(`🏷️ Categoría seleccionada: "${categoryName}"`);
        
        // Si ya está seleccionada, deseleccionar
        if (this.selectedCategory === categoryName) {
            this.clearSelection();
            return;
        }
        
        // Limpiar selección anterior
        this.clearSelectionVisual();
        
        // Establecer nueva selección
        this.selectedCategory = categoryName;
        
        // Actualizar chip visualmente
        if (chipElement) {
            const category = this.categories.find(c => c.nombre === categoryName);
            const color = category ? category.color : '#dc2626';
            
            chipElement.classList.add('category-chip--selected');
            chipElement.style.background = color;
            chipElement.style.borderColor = color;
            chipElement.style.color = 'white';
            
            const icon = chipElement.querySelector('i');
            if (icon) icon.style.color = 'white';
        }
        
        // Actualizar input hidden
        if (this.hiddenInput) {
            this.hiddenInput.value = categoryName;
            
            // Disparar evento change para compatibilidad
            const event = new Event('change', { bubbles: true });
            this.hiddenInput.dispatchEvent(event);
        }
        
        // Limpiar búsqueda
        this.searchInput.value = '';
        this.filterChips('');
        
        // Ejecutar callback
        if (this.onChangeCallback) {
            this.onChangeCallback(categoryName);
        }
        
        // Scroll al chip seleccionado
        if (chipElement) {
            chipElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Limpia la selección visual de todos los chips
     */
    clearSelectionVisual() {
        const chips = this.chipsContainer.querySelectorAll('.category-chip');
        chips.forEach(chip => {
            chip.classList.remove('category-chip--selected');
            chip.style.background = '';
            chip.style.borderColor = '';
            chip.style.color = '';
            
            const icon = chip.querySelector('i');
            if (icon) {
                icon.style.color = '';
            }
        });
    }

    /**
     * Limpia la selección actual
     */
    clearSelection() {
        console.log('🗑️ Limpiando selección de categoría');
        this.selectedCategory = '';
        this.clearSelectionVisual();
        
        if (this.hiddenInput) {
            this.hiddenInput.value = '';
            const event = new Event('change', { bubbles: true });
            this.hiddenInput.dispatchEvent(event);
        }
        
        if (this.onChangeCallback) {
            this.onChangeCallback('');
        }
    }

    /**
     * Establece una categoría programáticamente
     */
    setCategory(categoryName) {
        if (!categoryName) {
            this.clearSelection();
            return;
        }
        
        const chip = this.chipsContainer.querySelector(`[data-category="${categoryName}"]`);
        if (chip) {
            this.selectCategory(categoryName, chip);
        }
    }

    /**
     * Obtiene la categoría seleccionada
     */
    getSelectedCategory() {
        return this.selectedCategory;
    }

    /**
     * Registra un callback para cuando cambia la selección
     */
    onChange(callback) {
        this.onChangeCallback = callback;
    }

    /**
     * Habilita o deshabilita el selector
     */
    setEnabled(enabled) {
        if (this.searchInput) {
            this.searchInput.disabled = !enabled;
            this.searchInput.style.opacity = enabled ? '1' : '0.5';
            this.searchInput.style.cursor = enabled ? 'text' : 'not-allowed';
        }
        
        const chips = this.chipsContainer.querySelectorAll('.category-chip');
        chips.forEach(chip => {
            chip.style.pointerEvents = enabled ? 'auto' : 'none';
            chip.style.opacity = enabled ? '1' : '0.5';
        });
    }
}

export default CategoriesChipsSelector;