// =============================================================================
// src/frontend/modules/documentos/modals/personAutocomplete.js
// Selector de personas con autocompletado y búsqueda
// =============================================================================

/**
 * Clase que gestiona el selector de personas con autocompletado.
 * Reemplaza el select tradicional por búsqueda predictiva con dropdown.
 */
export class PersonAutocomplete {
    /**
     * @param {object} options - Configuración
     * @param {string} options.containerId - ID del contenedor principal
     * @param {string} options.searchInputId - ID del input de búsqueda
     * @param {string} options.dropdownId - ID del dropdown de resultados
     * @param {string} options.selectedContainerId - ID del contenedor de persona seleccionada
     * @param {string} options.clearBtnId - ID del botón de limpiar
     * @param {string} options.hiddenInputId - ID del input hidden
     */
    constructor(options) {
        this.container = document.getElementById(options.containerId);
        this.searchInput = document.getElementById(options.searchInputId);
        this.dropdown = document.getElementById(options.dropdownId);
        this.selectedContainer = document.getElementById(options.selectedContainerId);
        this.clearBtn = document.getElementById(options.clearBtnId);
        this.hiddenInput = document.getElementById(options.hiddenInputId);
        
        this.persons = [];
        this.selectedPerson = null;
        this.activeIndex = -1;
        this.onChangeCallback = null;
        this.debounceTimeout = null;
        
        this.init();
    }

    /**
     * Inicializa el autocompletado
     */
    init() {
        this.loadPersons();
        this.setupEventListeners();
    }

    /**
     * Carga las personas desde el estado global o API
     */
    async loadPersons() {
        try {
            // Intentar cargar del estado global
            if (window.appState && window.appState.persons && window.appState.persons.length > 0) {
                this.persons = window.appState.persons.map(p => ({
                    id: p._id || p.id,
                    nombre: p.nombre || p.name || 'Sin nombre',
                    email: p.email || '',
                    departamento: p.departamento || p.department || '',
                    cargo: p.cargo || p.position || ''
                }));
                console.log(`👥 ${this.persons.length} personas cargadas del estado global`);
                return;
            }

            // Cargar de la API
            const { CONFIG } = await import('../../../config.js');
            const response = await fetch(`${CONFIG.API_BASE_URL}/persons`);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.persons) {
                    this.persons = data.persons.map(p => ({
                        id: p._id || p.id,
                        nombre: p.nombre || p.name || 'Sin nombre',
                        email: p.email || '',
                        departamento: p.departamento || p.department || '',
                        cargo: p.cargo || p.position || ''
                    }));
                    
                    // Guardar en estado global
                    if (!window.appState) window.appState = {};
                    window.appState.persons = data.persons;
                    
                    console.log(`👥 ${this.persons.length} personas cargadas desde API`);
                }
            }
        } catch (error) {
            console.error('❌ Error cargando personas:', error);
            this.persons = [];
        }
    }

    /**
     * Configura los event listeners
     */
setupEventListeners() {
    if (!this.searchInput) return;

    // Input de búsqueda con debounce
    this.searchInput.addEventListener('input', () => {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(() => {
            this.searchPersons(this.searchInput.value);
            
            // ✅ Mostrar/ocultar botón X según haya texto
            if (this.clearBtn) {
                this.clearBtn.style.display = this.searchInput.value.trim() ? 'flex' : 'none';
            }
        }, 250);
    });

    // Navegación con teclado
    this.searchInput.addEventListener('keydown', (e) => {
        const items = this.dropdown.querySelectorAll('.person-item');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
                this.updateActiveItem(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.activeIndex = Math.max(this.activeIndex - 1, -1);
                this.updateActiveItem(items);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.activeIndex >= 0 && items[this.activeIndex]) {
                    items[this.activeIndex].click();
                }
                break;
                
            case 'Escape':
                this.closeDropdown();
                this.searchInput.blur();
                // ✅ Ocultar botón X al presionar Escape
                if (this.clearBtn) {
                    this.clearBtn.style.display = 'none';
                }
                break;
        }
    });

    // Mostrar dropdown al hacer focus si hay texto
    this.searchInput.addEventListener('focus', () => {
        if (this.searchInput.value.trim()) {
            this.searchPersons(this.searchInput.value);
            // ✅ Mostrar botón X si hay texto
            if (this.clearBtn) {
                this.clearBtn.style.display = 'flex';
            }
        }
    });

    // ✅ Ocultar botón X cuando el input pierde el foco (si no hay texto)
    this.searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (!this.searchInput.value.trim() && this.clearBtn) {
                this.clearBtn.style.display = 'none';
            }
        }, 200);
    });

    // Click fuera cierra el dropdown
    document.addEventListener('click', (e) => {
        if (this.container && !this.container.contains(e.target)) {
            this.closeDropdown();
        }
    });

    // Botón de limpiar - al hacer clic limpia y oculta
    if (this.clearBtn) {
        this.clearBtn.addEventListener('click', () => {
            this.clearSelection();
        });
    }

    // Botón de quitar en persona seleccionada
    if (this.selectedContainer) {
        const removeBtn = this.selectedContainer.querySelector('.person-selected__remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }
    }
}

    /**
     * Busca personas y muestra resultados
     */
    searchPersons(query) {
        const searchText = query.toLowerCase().trim();
        
        if (!searchText) {
            this.closeDropdown();
            return;
        }
        
        // Filtrar personas
        const filtered = this.persons.filter(person => {
            const nombre = (person.nombre || '').toLowerCase();
            const email = (person.email || '').toLowerCase();
            const departamento = (person.departamento || '').toLowerCase();
            
            return nombre.includes(searchText) || 
                   email.includes(searchText) || 
                   departamento.includes(searchText);
        });
        
        this.renderDropdown(filtered, searchText);
        this.activeIndex = -1;
    }

    /**
     * Renderiza el dropdown con los resultados
     */
    renderDropdown(persons, searchText) {
        if (!this.dropdown) return;
        
        if (persons.length === 0) {
            this.dropdown.innerHTML = `
                <div class="person-no-results">
                    <i class="fas fa-user-slash"></i>
                    <p>No se encontraron personas</p>
                    <small>Intenta con otro nombre</small>
                </div>
            `;
        } else {
            this.dropdown.innerHTML = persons.map(person => {
                const highlightedName = this.highlightMatch(person.nombre, searchText);
                const initials = this.getInitials(person.nombre);
                
                return `
                    <div class="person-item" data-person-id="${person.id}">
                        <div class="person-item__avatar">${initials}</div>
                        <div class="person-item__info">
                            <div class="person-item__name">${highlightedName}</div>
                            <div class="person-item__detail">
                                ${person.email ? `<i class="fas fa-envelope"></i> ${person.email}` : ''}
                                ${person.departamento ? ` · ${person.departamento}` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Agregar eventos a los items
            this.dropdown.querySelectorAll('.person-item').forEach(item => {
                item.addEventListener('click', () => {
                    const personId = item.dataset.personId;
                    const person = persons.find(p => p.id === personId);
                    if (person) {
                        this.selectPerson(person);
                    }
                });
            });
        }
        
        this.dropdown.classList.add('person-dropdown--active');
    }

    /**
     * Resalta el texto que coincide con la búsqueda
     */
    highlightMatch(text, search) {
        if (!search) return text;
        const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong style="color: #dc2626;">$1</strong>');
    }

    /**
     * Obtiene las iniciales de un nombre
     */
    getInitials(nombre) {
        if (!nombre) return '?';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    }

    /**
     * Actualiza el item activo en la navegación con teclado
     */
    updateActiveItem(items) {
        items.forEach((item, index) => {
            if (index === this.activeIndex) {
                item.classList.add('person-item--active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('person-item--active');
            }
        });
    }

    /**
     * Selecciona una persona
     */
    selectPerson(person) {
        console.log(`👤 Persona seleccionada: ${person.nombre} (${person.id})`);
        
        this.selectedPerson = person;
        
        // Actualizar input hidden
        if (this.hiddenInput) {
            this.hiddenInput.value = person.id;
            const event = new Event('change', { bubbles: true });
            this.hiddenInput.dispatchEvent(event);
        }
        
        // Mostrar persona seleccionada
        this.showSelectedPerson(person);
        
        // Cerrar dropdown
        this.closeDropdown();
        
        // Limpiar input de búsqueda
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        
        // Ejecutar callback
        if (this.onChangeCallback) {
            this.onChangeCallback(person);
        }
    }

/**
 * Muestra la persona seleccionada
 */
showSelectedPerson(person) {
    if (!this.selectedContainer) return;
    
    const initials = this.getInitials(person.nombre);
    
    this.selectedContainer.innerHTML = `
        <div class="person-selected__avatar">
            <span>${initials}</span>
        </div>
        <div class="person-selected__info">
            <span class="person-selected__name">${person.nombre}</span>
            <span class="person-selected__detail">
                ${person.email || ''}
                ${person.departamento ? ` · ${person.departamento}` : ''}
            </span>
        </div>
        <button type="button" class="person-selected__remove" title="Quitar persona">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    this.selectedContainer.style.display = 'flex';
    
    // Evento para quitar persona
    const removeBtn = this.selectedContainer.querySelector('.person-selected__remove');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            this.clearSelection();
        });
    }
    
    // ✅ CORRECCIÓN: Ocultar el input de búsqueda
    if (this.searchInput) {
        this.searchInput.style.display = 'none';
    }
    
    // ✅ CORRECCIÓN: Ocultar el icono de lupa (hermano del input)
    const searchIcon = this.container.querySelector('.person-input-wrapper > i.fa-search');
    if (searchIcon) {
        searchIcon.style.display = 'none';
    }
    
    // ✅ CORRECCIÓN: Ocultar el botón de limpiar (X)
    if (this.clearBtn) {
        this.clearBtn.style.display = 'none';
    }
}

/**
 * Limpia la selección actual
 */
clearSelection() {
    console.log('🗑️ Limpiando selección de persona');
    
    this.selectedPerson = null;
    
    if (this.hiddenInput) {
        this.hiddenInput.value = '';
        const event = new Event('change', { bubbles: true });
        this.hiddenInput.dispatchEvent(event);
    }
    
    // Ocultar persona seleccionada
    if (this.selectedContainer) {
        this.selectedContainer.style.display = 'none';
    }
    
    // ✅ CORRECCIÓN: Mostrar input de búsqueda
    if (this.searchInput) {
        this.searchInput.style.display = 'block';
        this.searchInput.value = '';
        this.searchInput.focus();
    }
    
    // ✅ CORRECCIÓN: Mostrar icono de lupa
    const searchIcon = this.container.querySelector('.person-input-wrapper > i.fa-search');
    if (searchIcon) {
        searchIcon.style.display = '';
    }
    
    // ✅ CORRECCIÓN: Ocultar botón de limpiar (X) porque no hay selección
    if (this.clearBtn) {
        this.clearBtn.style.display = 'none';
    }
    
    if (this.onChangeCallback) {
        this.onChangeCallback(null);
    }
}

    /**
     * Cierra el dropdown
     */
    closeDropdown() {
        if (this.dropdown) {
            this.dropdown.classList.remove('person-dropdown--active');
        }
        this.activeIndex = -1;
    }

    /**
     * Establece una persona programáticamente
     */
    setPerson(personId) {
        if (!personId) {
            this.clearSelection();
            return;
        }
        
        const person = this.persons.find(p => p.id === personId);
        if (person) {
            this.selectPerson(person);
        }
    }

    /**
     * Obtiene la persona seleccionada
     */
    getSelectedPerson() {
        return this.selectedPerson;
    }

    /**
     * Registra un callback para cuando cambia la selección
     */
    onChange(callback) {
        this.onChangeCallback = callback;
    }

/**
 * Habilita o deshabilita el selector completo
 */
setEnabled(enabled) {
    if (this.searchInput) {
        this.searchInput.disabled = !enabled;
        this.searchInput.style.pointerEvents = enabled ? 'auto' : 'none';
        this.searchInput.style.opacity = enabled ? '1' : '0.5';
        this.searchInput.style.cursor = enabled ? 'text' : 'not-allowed';
        this.searchInput.placeholder = enabled ? 
            'Buscar persona por nombre...' : 
            'Selecciona una categoría primero';
        
        // Si se deshabilita, cerrar dropdown y limpiar
        if (!enabled) {
            this.closeDropdown();
            this.searchInput.value = '';
        }
    }
    
    // ✅ También ocultar/mostrar el icono de búsqueda
    const searchIcon = this.container?.querySelector('.person-input-wrapper > i.fa-search');
    if (searchIcon) {
        searchIcon.style.opacity = enabled ? '1' : '0.4';
        searchIcon.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    
    // ✅ Ocultar botón de limpiar si se deshabilita
    if (this.clearBtn && !enabled) {
        this.clearBtn.style.display = 'none';
    }
    
    // ✅ Si se deshabilita y hay una persona seleccionada, limpiar
    if (!enabled && this.selectedPerson) {
        this.clearSelection();
    }
}
}

export default PersonAutocomplete;