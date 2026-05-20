// =============================================================================
// src/frontend/modules/documentos/categoryNavigation.js
// Sistema de navegación por categorías — Rediseño completo
// Soporte completo de subcategorías en árbol N-niveles
// =============================================================================

const LOG_PREFIX = '🗂️ [CategoryNav]';

// ─────────────────────────────────────────────────────────────────────────────
// ESTADO GLOBAL DE NAVEGACIÓN
// ─────────────────────────────────────────────────────────────────────────────
const _navState = {
    /** @type {CategoryNode[]} Árbol completo construido */
    tree: [],
    /** @type {CategoryNode[]} Stack de navegación [raíz → categoría actual] */
    stack: [],
    /** @type {string} Consulta de búsqueda actual */
    searchQuery: '',
    /** @type {boolean} Si el explorador está inicializado */
    initialized: false,
    /** @type {AbortController|null} Para cancelar animaciones pendientes */
    pendingAnimation: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS (documentados como JSDoc para autocompletado sin TypeScript)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} CategoryNode
 * @property {string}         _id
 * @property {string}         nombre
 * @property {string}         [descripcion]
 * @property {string}         [color]
 * @property {string}         [icon]
 * @property {string|null}    [parent_id]
 * @property {number}         [documentCount]
 * @property {CategoryNode[]} children
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCCIÓN DEL ÁRBOL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte un array plano de categorías en un árbol jerárquico.
 * Maneja referencias rotas (parent_id que apunta a un id inexistente).
 * @param {object[]} flatCategories
 * @returns {CategoryNode[]} Raíces del árbol
 */
export function buildCategoryTree(flatCategories) {
    if (!Array.isArray(flatCategories) || flatCategories.length === 0) {
        console.log(`${LOG_PREFIX} buildCategoryTree: Sin categorías`);
        return [];
    }

    /** @type {Map<string, CategoryNode>} */
    const map = new Map();
    const roots = [];

    // 1ª pasada: crear nodos con children vacíos
    flatCategories.forEach(cat => {
        map.set(cat._id, { ...cat, children: [] });
    });

    // 2ª pasada: enlazar hijos con padres
    flatCategories.forEach(cat => {
        const node = map.get(cat._id);
        const parentId = cat.parent_id;

        if (parentId && map.has(parentId)) {
            map.get(parentId).children.push(node);
        } else {
            // Sin parent_id válido → raíz
            roots.push(node);
        }
    });

    console.log(`${LOG_PREFIX} Árbol construido: ${roots.length} raíces, ${flatCategories.length} nodos totales`);
    return roots;
}

/**
 * Busca un nodo en todo el árbol por su _id.
 * @param {CategoryNode[]} tree
 * @param {string}         id
 * @returns {CategoryNode|null}
 */
function findNodeById(tree, id) {
    for (const node of tree) {
        if (node._id === id) return node;
        const found = findNodeById(node.children || [], id);
        if (found) return found;
    }
    return null;
}

/**
 * Obtiene los hijos directos del nivel actual.
 * @returns {CategoryNode[]}
 */
function getCurrentChildren() {
    if (_navState.stack.length === 0) {
        return _navState.tree;
    }
    const current = _navState.stack[_navState.stack.length - 1];
    return current.children || [];
}

/**
 * El nivel actual es un "leaf" si no tiene hijos → mostrar documentos.
 * @returns {boolean}
 */
function isCurrentLeaf() {
    if (_navState.stack.length === 0) return false;
    return getCurrentChildren().length === 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// GESTIÓN DEL DOM
// ─────────────────────────────────────────────────────────────────────────────

/** @returns {HTMLElement|null} */
function getExplorer() { return document.getElementById('categoryExplorer'); }
/** @returns {HTMLElement|null} */
function getDocView() { return document.getElementById('documentView'); }
/** @returns {HTMLElement|null} */
function getGrid() { return document.getElementById('categoryGrid'); }
/** @returns {HTMLElement|null} */
function getBreadcrumb() { return document.getElementById('categoryBreadcrumbList'); }
/** @returns {HTMLElement|null} */
function getEmptyState() { return document.getElementById('categoryEmptyState'); }
/** @returns {HTMLElement|null} */
function getSkeletonGrid() { return document.getElementById('categorySkeletonGrid'); }
/** @returns {HTMLElement|null} */
function getLevelBanner() { return document.getElementById('categoryLevelBanner'); }

// ─────────────────────────────────────────────────────────────────────────────
// RENDERIZADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza el grid de categorías para el nivel actual.
 * @param {CategoryNode[]} [override] - Si se pasa, renderiza este array (para búsqueda).
 */
export function renderCategoryGrid(override) {
    const grid = getGrid();
    if (!grid) {
        console.error(`${LOG_PREFIX} Grid #categoryGrid no encontrado`);
        return;
    }

    const items = Array.isArray(override) ? override : applySearchFilter(getCurrentChildren());
    const emptyState = getEmptyState();

    grid.innerHTML = '';

    if (items.length === 0) {
        grid.style.display = 'none';
        if (emptyState) {
            emptyState.style.display = 'flex';
            _updateEmptyState(override != null);
        }
        return;
    }

    grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    items.forEach((cat, i) => {
        const card = _createCategoryCard(cat, i);
        grid.appendChild(card);
    });

    console.log(`${LOG_PREFIX} Grid renderizado: ${items.length} tarjetas`);
}

/**
 * Actualiza el mensaje del estado vacío según el contexto.
 * @param {boolean} isSearchEmpty
 */
function _updateEmptyState(isSearchEmpty) {
    const title = document.getElementById('categoryEmptyTitle');
    const desc = document.getElementById('categoryEmptyDesc');
    const btn = document.getElementById('categoryEmptyActionBtn');

    if (isSearchEmpty) {
        if (title) title.textContent = 'Sin resultados';
        if (desc) desc.textContent = `No se encontraron carpetas con "${_navState.searchQuery}"`;
        if (btn) btn.style.display = 'none';
    } else if (_navState.stack.length > 0) {
        const current = _navState.stack[_navState.stack.length - 1];
        if (title) title.textContent = 'Carpeta vacía';
        if (desc) desc.textContent = `"${current.nombre}" no tiene subcarpetas. Crea una o agrega documentos directamente.`;
        if (btn) {
            btn.style.display = 'inline-flex';
            btn.textContent = 'Nueva subcarpeta';
            btn.onclick = () => openCategoryModal(null, current._id);
        }
    } else {
        if (title) title.textContent = 'Sin carpetas aún';
        if (desc) desc.textContent = 'Crea la primera carpeta para organizar tus documentos';
        if (btn) {
            btn.style.display = 'inline-flex';
            btn.textContent = 'Crear primera carpeta';
            btn.onclick = () => openCategoryModal();
        }
    }
}

/**
 * Crea el elemento DOM de una tarjeta de categoría.
 * @param {CategoryNode} cat
 * @param {number} index - Para animación escalonada
 * @returns {HTMLElement}
 */
function _createCategoryCard(cat, index = 0) {
    const hasChildren = cat.children && cat.children.length > 0;
    const cardColor = cat.color || 'var(--primary)';
    const cardIcon = cat.icon || 'folder';
    const docCount = typeof cat.documentCount === 'number' ? cat.documentCount : 0;
    const childCount = cat.children ? cat.children.length : 0;

    const canEdit = typeof canAction === 'function' ? canAction('categorias') : true;

    const article = document.createElement('article');
    article.className = `category--card${hasChildren ? ' category--card--has-children' : ''}`;
    article.setAttribute('role', 'listitem');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-label', `Carpeta: ${cat.nombre}`);
    article.setAttribute('data-category-id', cat._id);
    article.setAttribute('data-category-name', cat.nombre);
    article.style.setProperty('--card-color', cardColor);
    article.style.animationDelay = `${index * 0.045}s`;
    article.title = cat.descripcion ? `${cat.nombre} — ${cat.descripcion}` : cat.nombre;

    article.innerHTML = `
        <div class="category--card-folder-icon">
            <i class="fas fa-${cardIcon}"></i>
        </div>
        <div class="category--card-body">
            <h4 class="category--card-name">${_escapeHtml(cat.nombre)}</h4>
            ${cat.descripcion
            ? `<p class="category--card-meta">${_escapeHtml(cat.descripcion)}</p>`
            : ''}
        </div>
        <div class="category--card-footer">
            <span class="category--card-count">
                <i class="fas fa-${hasChildren ? 'folder' : 'file-alt'}"></i>
                ${hasChildren ? `${childCount} subcarpeta${childCount !== 1 ? 's' : ''}` : `${docCount} doc${docCount !== 1 ? 's' : ''}`}
            </span>
            ${hasChildren
            ? `<span class="category--card-sub-badge">
                       <i class="fas fa-chevron-right"></i> Abrir
                   </span>`
            : ''}
        </div>
        ${canEdit ? `
            <div class="category--card-actions" aria-label="Acciones de carpeta">
                <button class="category--card-action-btn category--card-action-btn--edit"
                        data-action="edit"
                        title="Editar carpeta"
                        aria-label="Editar ${cat.nombre}">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="category--card-action-btn category--card-action-btn--delete"
                        data-action="delete"
                        title="Eliminar carpeta"
                        aria-label="Eliminar ${cat.nombre}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        ` : ''}
    `;

    // ── Event listeners ──────────────────────────────────────────────────────
    // Click principal: navegar DENTRO de la carpeta
    article.addEventListener('click', (e) => {
        // No navegar si se hizo clic en botón de acción
        if (e.target.closest('[data-action]')) return;
        navigateInto(cat._id);
    });

    // Teclado: Enter y Espacio
    article.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('[data-action]')) {
            e.preventDefault();
            navigateInto(cat._id);
        }
    });

    // Botones de acción: edit / delete
    article.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.getAttribute('data-action');
            if (action === 'edit') openCategoryModal(cat._id);
            if (action === 'delete') _confirmDeleteCategory(cat);
        });
    });

    return article;
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVEGACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navega dentro de una categoría.
 * Si la categoría no tiene hijos → muestra documentos.
 * Si tiene hijos → muestra subcategorías.
 * @param {string} categoryId
 */
export function navigateInto(categoryId) {
    console.log(`${LOG_PREFIX} navigateInto: ${categoryId}`);

    const node = findNodeById(_navState.tree, categoryId);
    if (!node) {
        console.error(`${LOG_PREFIX} Categoría no encontrada: ${categoryId}`);
        return;
    }

    // Limpiar búsqueda al navegar
    _navState.searchQuery = '';
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) searchInput.value = '';

    _navState.stack.push(node);
    _updateUI();

    console.log(`${LOG_PREFIX} Stack: [${_navState.stack.map(n => n.nombre).join(' › ')}]`);
}

/**
 * Navega de vuelta al nivel anterior.
 */
export function navigateBack() {
    if (_navState.stack.length === 0) return;

    _navState.stack.pop();
    _navState.searchQuery = '';

    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) searchInput.value = '';

    console.log(`${LOG_PREFIX} navigateBack → nivel ${_navState.stack.length}`);
    _updateUI();
}

/**
 * Navega a la raíz.
 */
export function navigateToRoot() {
    console.log(`${LOG_PREFIX} Navegando a raíz - LIMPIANDO TODO`);

    _navState.stack = [];
    _navState.searchQuery = '';

    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) searchInput.value = '';

    // LIMPIAR EL FILTRO DE CATEGORÍA
    const filterCategoryEl = document.getElementById('filterCategory');
    if (filterCategoryEl) {
        filterCategoryEl.value = '';
    }

    // LIMPIAR appState.filters.category
    if (window.appState?.filters) {
        window.appState.filters.category = '';
    }

    // Resetear paginación
    if (window.appState?.documentsPagination) {
        window.appState.documentsPagination.currentPage = 1;
    }

    // Aplicar filtros limpios
    if (typeof window.applyFilters === 'function') {
        window.applyFilters();
    }

    console.log(`${LOG_PREFIX} Navegando a raíz - filtros limpiados`);
    _updateUI();
}

/**
 * Navega a un nivel específico del stack (breadcrumb click).
 * @param {number} level - 0 = raíz, 1 = primer nivel, etc.
 */
export function navigateToLevel(level) {
    if (level === 0) {
        navigateToRoot();
        return;
    }
    if (level >= _navState.stack.length) return;

    _navState.stack = _navState.stack.slice(0, level);
    _navState.searchQuery = '';

    console.log(`${LOG_PREFIX} Navegando al nivel ${level}`);
    _updateUI();
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTUALIZACIÓN DE UI CENTRAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Actualiza TODO el UI según el estado de navegación actual.
 * Decide si mostrar carpetas o documentos.
 */
function _updateUI() {
    const isRoot = _navState.stack.length === 0;
    const isLeaf = !isRoot && isCurrentLeaf();
    const hasDocuments = !isRoot && _navState.stack.length > 0 &&
        (_navState.stack[_navState.stack.length - 1].documentCount > 0);
    const hasChildren = !isRoot && getCurrentChildren().length > 0;
    const explorer = getExplorer();
    const docView = getDocView();

    if (!explorer || !docView) {
        console.error(`${LOG_PREFIX} Elementos #categoryExplorer o #documentView no encontrados`);
        return;
    }

    explorer.style.removeProperty('display');
    docView.style.removeProperty('display');

    if (isRoot) {
        // RAÍZ: solo explorador
        explorer.style.display = 'block';
        docView.style.display = 'none';
        renderCategoryGrid();
    } else if (hasChildren && hasDocuments) {
        // TIENE SUB CARPETAS Y DOCUMENTOS: mostrar ambos
        explorer.style.display = 'block';
        docView.style.display = 'flex';
        docView.style.flexDirection = 'column';
        docView.style.gap = 'var(--spacing-lg)';
        renderCategoryGrid();
        _applyDocumentCategoryFilter();

        // Mover banner al docView
        const banner = getLevelBanner();
        if (banner && banner.parentElement !== docView) {
            banner.remove();
            docView.insertBefore(banner, docView.firstChild);
        }
    } else if (hasChildren) {
        // SOLO SUB CARPETAS: mostrar explorador con subcarpetas
        explorer.style.display = 'block';
        docView.style.display = 'none';
        renderCategoryGrid();
    } else if (hasDocuments) {
        // SOLO DOCUMENTOS: mostrar tabla
        explorer.style.display = 'none';
        docView.style.display = 'flex';
        docView.style.flexDirection = 'column';
        docView.style.gap = 'var(--spacing-lg)';

        const banner = getLevelBanner();
        if (banner && banner.parentElement !== docView) {
            banner.remove();
            docView.insertBefore(banner, docView.firstChild);
        }

        _applyDocumentCategoryFilter();
    } else {
        // VACÍO: mostrar explorador con estado vacío
        explorer.style.display = 'block';
        docView.style.display = 'none';
        renderCategoryGrid();
    }

    _renderBreadcrumb();
    _updateLevelBanner();
    _updateNewCategoryButton();
}

/**
 * Animación de transición entre vistas.
 * @param {Function} callback
 */
function _runPageTransition(callback) {
    const explorer = getExplorer();
    const docView = getDocView();

    // Fade out rápido
    [explorer, docView].forEach(el => {
        if (el && el.style.display !== 'none') {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-8px)';
            el.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
        }
    });

    setTimeout(() => {
        callback();

        // Fade in en el nuevo elemento visible
        [explorer, docView].forEach(el => {
            if (el && el.style.display !== 'none') {
                el.style.opacity = '0';
                el.style.transform = 'translateX(12px)';
                el.style.transition = 'none';

                requestAnimationFrame(() => {
                    el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                    el.style.opacity = '1';
                    el.style.transform = 'translateX(0)';
                });
            }
        });
    }, 140);
}

// ─────────────────────────────────────────────────────────────────────────────
// BREADCRUMB
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-renderiza el breadcrumb según el stack actual.
 */
function _renderBreadcrumb() {
    const list = getBreadcrumb();
    if (!list) return;

    list.innerHTML = '';

    // Item raíz (siempre presente)
    const rootItem = _createBreadcrumbItem({
        label: 'Documentos',
        icon: 'home',
        level: 0,
        isActive: _navState.stack.length === 0,
    });
    list.appendChild(rootItem);

    // Items del stack
    _navState.stack.forEach((node, i) => {
        const item = _createBreadcrumbItem({
            label: node.nombre,
            icon: node.icon || 'folder',
            level: i + 1,
            isActive: i === _navState.stack.length - 1,
            color: node.color,
        });
        list.appendChild(item);
    });
}

/**
 * Crea un <li> de breadcrumb.
 * @param {{ label: string, icon: string, level: number, isActive: boolean, color?: string }} opts
 * @returns {HTMLElement}
 */
function _createBreadcrumbItem({ label, icon, level, isActive, color }) {
    const li = document.createElement('li');
    li.className = `category--breadcrumb-item${isActive ? ' category--breadcrumb-item--active' : ''}`;
    li.setAttribute('data-level', level);

    // IMPORTANTE: Agregar ID al item raíz para que _bindBreadcrumbRoot lo encuentre
    if (level === 0) {
        li.id = 'breadcrumbRoot';
    }

    li.setAttribute('tabindex', isActive ? '-1' : '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', `Ir a ${label}`);

    if (color) {
        li.style.setProperty('--breadcrumb-color', color);
    }

    li.innerHTML = `
        <i class="fas fa-${icon} category--breadcrumb-icon"></i>
        <span class="category--breadcrumb-label" title="${_escapeHtml(label)}">${_escapeHtml(label)}</span>
    `;

    if (!isActive) {
        li.addEventListener('click', () => navigateToLevel(level));
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateToLevel(level);
            }
        });
        li.style.cursor = 'pointer';
    }

    return li;
}

// ─────────────────────────────────────────────────────────────────────────────
// BANNER DE NIVEL Y BOTONES DINÁMICOS
// ─────────────────────────────────────────────────────────────────────────────

function _updateLevelBanner() {
    const banner = getLevelBanner();
    if (!banner) return;

    if (_navState.stack.length === 0) {
        banner.style.display = 'none';
        return;
    }

    const current = _navState.stack[_navState.stack.length - 1];
    const color = current.color || 'var(--primary)';

    banner.style.display = 'flex';
    banner.style.setProperty('--level-banner-color', color);

    const iconEl = document.getElementById('levelBannerIcon');
    const nameEl = document.getElementById('levelBannerName');
    const descEl = document.getElementById('levelBannerDesc');
    const subBtn = document.getElementById('addSubcategoryBtn');

    if (iconEl) {
        iconEl.style.background = `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 70%, black 30%))`;
        iconEl.innerHTML = `<i class="fas fa-${current.icon || 'folder-open'}"></i>`;
    }

    if (nameEl) nameEl.textContent = current.nombre;
    if (descEl) descEl.textContent = current.descripcion || `Carpeta de ${current.nombre}`;

    if (subBtn) {
        subBtn.onclick = () => openCategoryModal(null, current._id);
    }
}

function _updateNewCategoryButton() {
    const rootBtn = document.getElementById('newRootCategoryBtn');
    if (!rootBtn) return;

    if (_navState.stack.length === 0) {
        rootBtn.style.display = 'inline-flex';
        rootBtn.textContent = '';
        rootBtn.innerHTML = '<i class="fas fa-folder-plus"></i><span>Nueva Carpeta</span>';
        rootBtn.onclick = () => openCategoryModal();
    } else {
        // En niveles profundos, el botón de la barra de búsqueda queda oculto
        // El botón de subcarpeta está en el banner
        rootBtn.style.display = 'none';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTRO DE DOCUMENTOS (cuando se está en un leaf)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica el filtro de categoría en el sistema de filtros de tabla.
 * Sincroniza el select #filterCategory con la categoría actual.
 */
function _applyDocumentCategoryFilter() {
    if (_navState.stack.length === 0) return;

    const current = _navState.stack[_navState.stack.length - 1];
    const categoryName = current.nombre;

    console.log(`${LOG_PREFIX} Aplicando filtro para categoría: "${categoryName}"`);

    // 1. LIMPIAR filteredDocuments para forzar re-filtrado
    if (window.appState) {
        window.appState.filteredDocuments = null;
    }

    // 2. Actualizar el select de filterCategory
    const filterCategoryEl = document.getElementById('filterCategory');
    if (filterCategoryEl) {
        // Poblar opciones si está vacío
        if (filterCategoryEl.options.length <= 1) {
            const categories = window.appState?.categories || [];
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.nombre;
                opt.textContent = cat.nombre;
                filterCategoryEl.appendChild(opt);
            });
        }
        filterCategoryEl.value = categoryName;
    }

    // 3. Actualizar appState.filters
    if (window.appState?.filters) {
        window.appState.filters.category = categoryName;
        window.appState.filters.status = '';
    }

    // 4. Limpiar búsqueda
    if (window.appState) {
        window.appState.currentSearchQuery = '';
    }
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    // 5. Resetear paginación
    if (window.appState?.documentsPagination) {
        window.appState.documentsPagination.currentPage = 1;
    }

    // 6. Limpiar filteredDocuments y aplicar filtros
    if (typeof window.applyFilters === 'function') {
        window.applyFilters();
    } else {
        // Fallback: importar y ejecutar
        import('./table/tableFilters.js').then(m => {
            m.applyFilters();
        });
    }

    console.log(`${LOG_PREFIX} Filtro aplicado: ${categoryName}, docs filtrados: ${window.appState?.filteredDocuments?.length || 'pendiente'}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// BÚSQUEDA DE CATEGORÍAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aplica el filtro de búsqueda al nivel actual.
 * @param {CategoryNode[]} items
 * @returns {CategoryNode[]}
 */
function applySearchFilter(items) {
    const q = _navState.searchQuery.toLowerCase().trim();
    if (!q) return items;

    return items.filter(cat => {
        const nameMatch = cat.nombre.toLowerCase().includes(q);
        const descMatch = cat.descripcion?.toLowerCase().includes(q) ?? false;
        return nameMatch || descMatch;
    });
}

/**
 * Inicializa el buscador de categorías con debounce.
 */
function _initCategorySearch() {
    const input = document.getElementById('categorySearchInput');
    const clearBtn = document.getElementById('clearCategorySearch');
    const stats = document.getElementById('categorySearchStats');
    const countEl = document.getElementById('categorySearchCount');

    if (!input) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const q = input.value.trim();
            _navState.searchQuery = q;

            if (clearBtn) clearBtn.style.display = q ? 'flex' : 'none';

            const filtered = applySearchFilter(getCurrentChildren());

            if (stats && countEl) {
                if (q) {
                    stats.style.display = 'inline-flex';
                    countEl.textContent = `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`;
                } else {
                    stats.style.display = 'none';
                }
            }

            renderCategoryGrid(q ? filtered : undefined);
            console.log(`${LOG_PREFIX} Búsqueda "${q}": ${filtered.length} resultados`);
        }, 200);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            _navState.searchQuery = '';
            clearBtn.style.display = 'none';
            if (stats) stats.style.display = 'none';
            renderCategoryGrid();
            input.focus();
        });
    }

    // Navegar con Enter al primer resultado
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const first = getGrid()?.querySelector('.category--card');
            if (first) first.click();
        }
        if (e.key === 'Escape') {
            input.value = '';
            _navState.searchQuery = '';
            if (clearBtn) clearBtn.style.display = 'none';
            if (stats) stats.style.display = 'none';
            renderCategoryGrid();
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL DE CATEGORÍA (Crear / Editar / Subcategoría)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abre el modal de categoría para crear o editar.
 * @param {string|null}  [categoryId]  - Si se pasa, modo edición.
 * @param {string|null}  [parentId]    - Si se pasa, nueva subcategoría con ese padre.
 */
export function openCategoryModal(categoryId = null, parentId = null) {
    console.log(`${LOG_PREFIX} openCategoryModal - categoryId: ${categoryId}, parentId: ${parentId}`);
    
    const modal = document.getElementById('categoryModal');
    if (!modal) {
        console.error(`${LOG_PREFIX} Modal #categoryModal no encontrado en el DOM`);
        return;
    }

    if (typeof canAction === 'function' && !canAction('categorias')) {
        if (typeof showNoPermissionAlert === 'function') showNoPermissionAlert('categorias');
        return;
    }

    const form = document.getElementById('categoryForm');
    if (form) form.reset();

    const idInput = document.getElementById('categoryId');
    const parentInput = document.getElementById('categoryParentId');
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    const colorInput = document.getElementById('categoryColor');
    const iconSelect = document.getElementById('categoryIcon');

    if (idInput) idInput.value = '';
    if (parentInput) parentInput.value = '';
    if (nameInput) {
        nameInput.value = '';
        nameInput.removeAttribute('required');
    }
    if (descInput) descInput.value = '';
    if (colorInput) colorInput.value = '#dc2626';
    if (iconSelect) iconSelect.value = 'folder';

    _clearModalErrors();
    _resetModalPreview();

    const isEdit  = !!categoryId;
    const isSub   = !isEdit && !!parentId;
    const titleEl = document.getElementById('categoryModalTitle');
    const subEl   = document.getElementById('categoryModalSubtitle');
    const btnEl   = document.getElementById('saveCategoryBtnLabel');

    if (isEdit) {
        const cat = _findCategoryInState(categoryId);
        if (!cat) {
            console.error(`${LOG_PREFIX} Categoría no encontrada para editar: ${categoryId}`);
            return;
        }
        if (titleEl) titleEl.textContent = 'Editar carpeta';
        if (subEl)   subEl.textContent   = `Editando "${cat.nombre}"`;
        if (btnEl)   btnEl.textContent   = 'Guardar cambios';
        _populateModalWithCategory(cat);
    } else if (isSub) {
        const parent = _findCategoryInState(parentId);
        if (titleEl) titleEl.textContent = 'Nueva subcarpeta';
        if (subEl)   subEl.textContent   = parent ? `Dentro de "${parent.nombre}"` : 'Nueva subcarpeta';
        if (btnEl)   btnEl.textContent   = 'Crear subcarpeta';
        if (parentInput) parentInput.value = parentId || '';
    } else {
        if (titleEl) titleEl.textContent = 'Nueva carpeta';
        if (subEl)   subEl.textContent   = 'Organiza tus documentos';
        if (btnEl)   btnEl.textContent   = 'Crear carpeta';
    }

    _initModalLivePreview();
    _updateCharCounters();
    _bindModalButtons();
    
    modal.style.display = 'flex';
    _toggleModalLoader(false);

    setTimeout(() => {
        const nameInput = document.getElementById('categoryName');
        if (nameInput) nameInput.focus();
    }, 150);
    
    console.log(`${LOG_PREFIX} Modal abierto correctamente`);
}

/** Cierra el modal de categoría. */
export function closeCategoryModal() {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;
    modal.style.display = 'none';
}

/** Rellena el formulario con los datos de una categoría para edición. */
function _populateModalWithCategory(cat) {
    console.log(`${LOG_PREFIX} Poblando modal con categoría:`, cat.nombre);

    const idInput = document.getElementById('categoryId');
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    const colorInput = document.getElementById('categoryColor');
    const iconSelect = document.getElementById('categoryIcon');
    const parentId = document.getElementById('categoryParentId');

    if (idInput) idInput.value = cat._id || '';
    if (nameInput) nameInput.value = cat.nombre || '';
    if (descInput) descInput.value = cat.descripcion || '';
    if (colorInput) colorInput.value = cat.color || '#dc2626';
    if (iconSelect) iconSelect.value = cat.icon || 'folder';
    if (parentId) parentId.value = cat.parent_id || '';

    _updateCharCounters();
    _syncColorSwatches(cat.color || '#dc2626');
    _updateModalPreview();
}

/** Limpia el formulario del modal. */
function _clearModalForm() {
    const form = document.getElementById('categoryForm');
    if (form) {
        form.reset();
    }

    const idInput = document.getElementById('categoryId');
    const parentId = document.getElementById('categoryParentId');
    const colorInput = document.getElementById('categoryColor');
    const iconSelect = document.getElementById('categoryIcon');
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');

    if (idInput) idInput.value = '';
    if (parentId) parentId.value = '';
    if (colorInput) colorInput.value = '#dc2626';
    if (iconSelect) iconSelect.value = 'folder';
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';

    _updateCharCounters();
    _syncColorSwatches('#dc2626');
}

function _resetModalPreview() {
    const iconDisplay = document.getElementById('categoryModalIconDisplay');
    const headerIcon = document.getElementById('categoryModalIconPreview');
    const previewIcon = document.getElementById('categoryIconPreview');

    if (iconDisplay) iconDisplay.className = 'fas fa-folder';
    if (headerIcon) {
        headerIcon.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';
    }
    if (previewIcon) {
        previewIcon.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';
        previewIcon.innerHTML = '<i class="fas fa-folder"></i>';
    }

    const previewName = document.getElementById('previewCardName');
    const previewDesc = document.getElementById('previewCardDesc');
    const previewBg = document.getElementById('previewCardIcon');

    if (previewName) previewName.textContent = 'Nombre carpeta';
    if (previewDesc) previewDesc.textContent = 'Sin descripción';
    if (previewBg) previewBg.style.background = 'linear-gradient(135deg, #dc2626, #991b1b)';
}

function _clearModalErrors() {
    document.querySelectorAll('.category--form-error').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('.category--form-input.is-error, .category--form-textarea.is-error').forEach(el => {
        el.classList.remove('is-error');
    });
}

/**
 * Actualiza la vista previa en vivo del modal.
 */
function _updateModalPreview() {
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    const colorInput = document.getElementById('categoryColor');
    const iconSelect = document.getElementById('categoryIcon');

    const previewName = document.getElementById('previewCardName');
    const previewDesc = document.getElementById('previewCardDesc');
    const previewIcon = document.getElementById('previewIcon');
    const previewBg = document.getElementById('previewCardIcon');
    const iconPreview = document.getElementById('categoryIconPreview');
    const headerIconEl = document.getElementById('categoryModalIconDisplay');
    const headerIconWrap = document.getElementById('categoryModalIconPreview');

    const name = nameInput?.value?.trim() || 'Nombre carpeta';
    const desc = descInput?.value?.trim() || 'Sin descripción';
    const color = colorInput?.value || '#dc2626';
    const icon = iconSelect?.value || 'folder';

    // Calcular color oscuro para gradiente
    const darkColor = _darkenColor(color, 30);

    if (previewName) previewName.textContent = name;
    if (previewDesc) previewDesc.textContent = desc;
    if (previewIcon) previewIcon.className = `fas fa-${icon}`;
    if (previewBg) previewBg.style.background = `linear-gradient(135deg, ${color}, ${darkColor})`;

    if (iconPreview) {
        iconPreview.style.background = `linear-gradient(135deg, ${color}, ${darkColor})`;
        iconPreview.innerHTML = `<i class="fas fa-${icon}"></i>`;
    }

    if (headerIconEl) headerIconEl.className = `fas fa-${icon}`;
    if (headerIconWrap) headerIconWrap.style.background = `linear-gradient(135deg, ${color}, ${darkColor})`;
}

/** Inicializa el preview en vivo del modal. */
function _initModalLivePreview() {
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    const colorInput = document.getElementById('categoryColor');
    const iconSelect = document.getElementById('categoryIcon');

    const nameCounter = document.getElementById('categoryNameCounter');
    const descCounter = document.getElementById('categoryDescCounter');

    // Remover listeners anteriores
    [nameInput, descInput, colorInput, iconSelect].forEach(el => {
        if (el) {
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        }
    });

    // Re-obtener referencias después de clonar
    const newNameInput = document.getElementById('categoryName');
    const newDescInput = document.getElementById('categoryDescription');
    const newColorInput = document.getElementById('categoryColor');
    const newIconSelect = document.getElementById('categoryIcon');

    // Agregar listeners
    const updateAll = () => {
        _updateModalPreview();
        _updateCharCounters();
    };

    if (newNameInput) {
        newNameInput.addEventListener('input', updateAll);
        newNameInput.addEventListener('change', updateAll);
    }
    if (newDescInput) {
        newDescInput.addEventListener('input', updateAll);
        newDescInput.addEventListener('change', updateAll);
    }
    if (newColorInput) {
        newColorInput.addEventListener('input', () => {
            _updateModalPreview();
            _syncColorSwatches(newColorInput.value);
        });
        newColorInput.addEventListener('change', () => {
            _updateModalPreview();
            _syncColorSwatches(newColorInput.value);
        });
    }
    if (newIconSelect) {
        newIconSelect.addEventListener('change', updateAll);
    }

    // Color swatches
    _bindColorSwatches();

    // Counter
    if (newNameInput) newNameInput.addEventListener('input', _updateCharCounters);
    if (newDescInput) newDescInput.addEventListener('input', _updateCharCounters);

    // Actualizar preview inicial
    _updateModalPreview();
    _updateCharCounters();
}

function _bindColorSwatches() {
    const colorInput = document.getElementById('categoryColor');
    const swatches = document.querySelectorAll('.category--color-swatch');

    swatches.forEach(swatch => {
        // Remover listeners anteriores
        const newSwatch = swatch.cloneNode(true);
        swatch.parentNode.replaceChild(newSwatch, swatch);
    });

    // Re-obtener y vincular
    document.querySelectorAll('.category--color-swatch').forEach(swatch => {
        swatch.addEventListener('click', function (e) {
            e.preventDefault();
            const color = this.getAttribute('data-color');
            console.log(`${LOG_PREFIX} Color swatch clicked: ${color}`);

            const colorInput = document.getElementById('categoryColor');
            if (colorInput && color) {
                colorInput.value = color;
                _updateModalPreview();
                _syncColorSwatches(color);
            }
        });
    });
}

function _syncColorSwatches(activeColor) {
    document.querySelectorAll('.category--color-swatch').forEach(swatch => {
        const swatchColor = swatch.getAttribute('data-color');
        if (swatchColor === activeColor) {
            swatch.classList.add('is-selected');
        } else {
            swatch.classList.remove('is-selected');
        }
    });
}

function _updateCharCounters() {
    const nameInput = document.getElementById('categoryName');
    const descInput = document.getElementById('categoryDescription');
    const nameCounter = document.getElementById('categoryNameCounter');
    const descCounter = document.getElementById('categoryDescCounter');

    if (nameCounter && nameInput) {
        nameCounter.textContent = (nameInput.value || '').length;
    }
    if (descCounter && descInput) {
        descCounter.textContent = (descInput.value || '').length;
    }
}

/**
 * Oscurece un color hexadecimal.
 */
function _darkenColor(hex, percent) {
    // Si el color no es hexadecimal válido, devolver un fallback
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
        return '#991b1b'; // Rojo oscuro por defecto
    }

    try {
        // Remover el #
        hex = hex.replace('#', '');

        // Convertir shorthand (3 dígitos) a 6 dígitos
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        // Parsear RGB
        const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - Math.floor(255 * percent / 100));
        const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - Math.floor(255 * percent / 100));
        const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - Math.floor(255 * percent / 100));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        return '#991b1b';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GUARDAR CATEGORÍA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida y guarda la categoría (crear o editar).
 */
export async function saveCategory() {
    console.log(`${LOG_PREFIX} saveCategory iniciado`);

    const catId = document.getElementById('categoryId')?.value?.trim() || null;
    const parentId = document.getElementById('categoryParentId')?.value?.trim() || null;
    const nombre = document.getElementById('categoryName')?.value?.trim() || '';
    const desc = document.getElementById('categoryDescription')?.value?.trim() || '';
    const color = document.getElementById('categoryColor')?.value || '#dc2626';
    const icon = document.getElementById('categoryIcon')?.value || 'folder';

    console.log(`${LOG_PREFIX} Datos del formulario:`, { catId, parentId, nombre, desc, color, icon });

    _clearModalErrors();

    if (!nombre) {
        _showFieldError('categoryName', 'categoryNameError', 'El nombre de la carpeta es obligatorio');
        return;
    }
    if (nombre.length < 2) {
        _showFieldError('categoryName', 'categoryNameError', 'El nombre debe tener al menos 2 caracteres');
        return;
    }
    if (nombre.length > 50) {
        _showFieldError('categoryName', 'categoryNameError', 'El nombre no puede exceder los 50 caracteres');
        return;
    }

    // Mostrar loader DENTRO del modal, NO cerrarlo aún
    _toggleModalLoader(true, catId ? 'Actualizando carpeta...' : 'Creando carpeta...');

    try {
        const payload = {
            nombre,
            descripcion: desc,
            color,
            icon,
        };

        if (parentId && parentId.trim() !== '') {
            payload.parent_id = parentId;
        }

        console.log(`${LOG_PREFIX} Enviando payload:`, payload);

        let result;
        if (catId) {
            result = await (window.api?.updateCategory || _fallbackUpdateApi)(catId, payload);
        } else {
            result = await (window.api?.createCategory || _fallbackCreateApi)(payload);
        }

        console.log(`${LOG_PREFIX} Resultado:`, result);

        if (!result || !result.success) {
            throw new Error(result?.message || 'Error desconocido al guardar');
        }

        // ÉXITO: cerrar modal y mostrar preloader
        closeCategoryModal();
        _showPreloaderOverlay('Actualizando vista...');

        if (typeof window.loadCategories === 'function') {
            await window.loadCategories();
        }

        refreshCategoryTree();

        if (parentId && parentId.trim() !== '') {
            navigateToRoot();
            setTimeout(() => {
                navigateInto(parentId);
            }, 500);
        }

        await _hidePreloaderOverlay();

        if (typeof window.showAlert === 'function') {
            window.showAlert(result.message || 'Carpeta guardada correctamente', 'success');
        }

        console.log(`${LOG_PREFIX} Categoría guardada exitosamente`);

    } catch (err) {
        _toggleModalLoader(false);
        console.error(`${LOG_PREFIX} Error guardando categoría:`, err);

        // Extraer solo el mensaje del JSON
        let errorMsg = err.message || 'Error al guardar la carpeta';
        try {
            const match = err.message.match(/\{.*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.message) errorMsg = parsed.message;
            }
        } catch (e) { }

        _showFieldError('categoryName', 'categoryNameError', errorMsg);
    }
}

let _preloaderStartTime = 0;

function _showPreloaderOverlay(text = 'Procesando...') {
    _hidePreloaderOverlay();
    _preloaderStartTime = Date.now();

    const overlay = document.createElement('div');
    overlay.id = 'categoryNavPreloader';
    overlay.className = 'preloader-overlay';
    overlay.innerHTML = `
        <div class="preloader-overlay__content">
            <div class="preloader__spinner"></div>
            <h3 class="preloader-overlay__title">${text}</h3>
            <p class="preloader-overlay__subtitle">Por favor, espera un momento</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function _hidePreloaderOverlay() {
    const elapsed = Date.now() - _preloaderStartTime;
    const minDuration = 800;
    if (elapsed < minDuration) {
        await new Promise(r => setTimeout(r, minDuration - elapsed));
    }

    const overlay = document.getElementById('categoryNavPreloader');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

/**
 * Confirma y elimina una categoría.
 * @param {CategoryNode} cat
 */
function _confirmDeleteCategory(cat) {
    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.id = 'confirmDeleteModal';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10000';

    overlay.innerHTML = `
        <div class="modal__content modal__content--sm">
            <div class="modal__header">
                <h3 class="modal__title">Eliminar carpeta</h3>
                <button class="modal__close" id="closeConfirmDeleteModal" aria-label="Cerrar">&times;</button>
            </div>
            <div class="modal__body">
                <div class="action-modal__content" id="confirmDeleteContent">
                    <div class="action-modal__icon action-modal__icon--warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <p class="action-modal__message">
                        ¿Eliminar la carpeta <strong>"${cat.nombre}"</strong>?<br>
                        <small>Los documentos y subcarpetas asociados podrían verse afectados.</small>
                    </p>
                </div>
                <!-- Preloader oculto inicialmente -->
                <div id="confirmDeletePreloader" style="display:none; text-align:center; padding:20px;">
                    <div class="preloader__spinner"></div>
                    <p class="preloader__text" style="margin-top:12px;">Eliminando carpeta...</p>
                </div>
            </div>
            <div class="modal__footer modal__footer--centered" id="confirmDeleteFooter">
                <button class="btn btn--outline" id="cancelConfirmDeleteBtn">Cancelar</button>
                <button class="btn btn--danger" id="confirmDeleteBtn">Eliminar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeOverlay = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.2s ease';
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('#closeConfirmDeleteModal').addEventListener('click', closeOverlay);
    overlay.querySelector('#cancelConfirmDeleteBtn').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
    });

    overlay.querySelector('#confirmDeleteBtn').addEventListener('click', async () => {
        const content = overlay.querySelector('#confirmDeleteContent');
        const footer = overlay.querySelector('#confirmDeleteFooter');
        const preloader = overlay.querySelector('#confirmDeletePreloader');
        const closeBtn = overlay.querySelector('#closeConfirmDeleteModal');
        const cancelBtn = overlay.querySelector('#cancelConfirmDeleteBtn');

        content.style.display = 'none';
        footer.style.display = 'none';
        preloader.style.display = 'block';
        closeBtn.style.display = 'none';
        cancelBtn.style.display = 'none';

        // Pequeña pausa para que el preloader se renderice
        await new Promise(r => setTimeout(r, 100));

        try {
            const result = await (window.api?.deleteCategory || _fallbackApiCallDelete)(`/categories/${cat._id}`);

            if (!result.success) {
                closeOverlay();
                setTimeout(() => {
                    window.showActionModal({
                        type: 'error',
                        title: 'No se pudo eliminar',
                        message: result.message || 'Error desconocido'
                    });
                }, 300);
                return;
            }

            if (typeof window.loadCategories === 'function') {
                await window.loadCategories();
            }

            refreshCategoryTree();
            navigateToRoot();

            closeOverlay();

            setTimeout(() => {
                window.showActionModal({
                    type: 'success',
                    title: 'Eliminado',
                    message: 'Carpeta eliminada correctamente'
                });
            }, 300);

        } catch (err) {
            closeOverlay();
            console.error(`${LOG_PREFIX} Error eliminando categoría:`, err);

            let errorMsg = 'Error al eliminar la carpeta';
            try {
                const jsonMatch = err.message?.match(/\{.*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (parsed.message) errorMsg = parsed.message;
                }
            } catch (e) {
                errorMsg = err.message || errorMsg;
            }

            setTimeout(() => {
                window.showActionModal({
                    type: 'error',
                    title: 'No se pudo eliminar',
                    message: errorMsg
                });
            }, 300);
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON / PRELOADER
// ─────────────────────────────────────────────────────────────────────────────

/** Muestra el skeleton de carga en el grid. */
export function showCategorySkeletonLoader(count = 6) {
    const grid = getGrid();
    const skeleton = getSkeletonGrid();
    const empty = getEmptyState();

    if (grid) { grid.style.display = 'none'; grid.innerHTML = ''; }
    if (empty) { empty.style.display = 'none'; }
    if (skeleton) {
        skeleton.style.display = 'grid';
        skeleton.innerHTML = Array.from({ length: count }, () => `
            <div class="category--skeleton-card">
                <div class="category--skeleton-icon"></div>
                <div class="category--skeleton-line category--skeleton-line--name"></div>
                <div class="category--skeleton-line category--skeleton-line--meta"></div>
            </div>
        `).join('');
    }
}

/** Oculta el skeleton. */
export function hideCategorySkeletonLoader() {
    const skeleton = getSkeletonGrid();
    const grid = getGrid();
    if (skeleton) skeleton.style.display = 'none';
    if (grid) grid.style.display = 'grid';
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZACIÓN PÚBLICA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inicializa el navegador de categorías.
 * Debe llamarse después de que el DOM esté listo y las categorías cargadas.
 */
export function initCategoryNavigation() {
    console.log(`${LOG_PREFIX} Inicializando navegador de categorías...`);

    if (_navState.initialized) {
        console.log(`${LOG_PREFIX} Ya inicializado, solo refreshing`);
        _refreshFromAppState();
        return;
    }

    _bindModalButtons();
    _initCategorySearch();
    _bindBreadcrumbRoot();
    _refreshFromAppState();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('categoryModal');
            if (m && m.style.display === 'flex') closeCategoryModal();
        }
    });

    _navState.initialized = true;
    console.log(`${LOG_PREFIX} ✅ Navegador de categorías inicializado`);
}

/**
 * Reconstruye el árbol desde appState.categories y re-renderiza.
 */
export function refreshCategoryTree() {
    _refreshFromAppState();
}

function _refreshFromAppState() {
    const categories = window.appState?.categories || [];
    
    const currentStack = [..._navState.stack];
    
    _navState.tree = buildCategoryTree(categories);
    
    _navState.stack = [];
    currentStack.forEach(oldNode => {
        const freshNode = findNodeById(_navState.tree, oldNode._id);
        if (freshNode) {
            _navState.stack.push(freshNode);
        }
    });
    
    console.log(`${LOG_PREFIX} Árbol refrescado: ${_navState.tree.length} raíces, stack: [${_navState.stack.map(n => n.nombre).join(' › ')}]`);
    
    // Forzar re-render del grid SIEMPRE
    if (_navState.stack.length === 0 || getCurrentChildren().length > 0) {
        renderCategoryGrid();
    }
    
    _updateUI();
}

function _bindModalButtons() {
    const closeBtn = document.getElementById('closeCategoryModalBtn');
    const cancelBtn = document.getElementById('cancelCategoryBtn');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const modal = document.getElementById('categoryModal');

    if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); closeCategoryModal(); };
    if (cancelBtn) cancelBtn.onclick = (e) => { e.preventDefault(); closeCategoryModal(); };
    if (saveBtn) saveBtn.onclick = (e) => { e.preventDefault(); saveCategory(); };
    if (modal) modal.onclick = (e) => { if (e.target === modal) closeCategoryModal(); };
}

function _bindBreadcrumbRoot() {
    const rootItem = document.getElementById('breadcrumbRoot');
    if (rootItem && !rootItem.dataset.bound) {
        rootItem.dataset.bound = '1';
        rootItem.addEventListener('click', navigateToRoot);
        rootItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigateToRoot();
            }
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────────────────

function _findCategoryInState(id) {
    return findNodeById(_navState.tree, id)
        || (window.appState?.categories || []).find(c => c._id === id)
        || null;
}

function _escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function _showFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    
    if (field) {
        field.classList.add('is-error');
        field.setAttribute('aria-invalid', 'true');
    }
    if (error) {
        error.textContent = message;
        error.style.display = 'flex';
        error.style.alignItems = 'center';
        error.style.gap = '5px';
    }
    if (field) {
        field.focus();
        field.select();
    }
}

function _toggleModalLoader(show, text = 'Procesando...') {
    const loader = document.getElementById('categoryModalLoader');
    const loaderTxt = document.getElementById('categoryModalLoaderText');
    const saveBtn = document.getElementById('saveCategoryBtn');
    const cancelBtn = document.getElementById('cancelCategoryBtn');
    const closeBtn = document.getElementById('closeCategoryModalBtn');

    if (loader) loader.style.display = show ? 'flex' : 'none';
    if (loaderTxt && show) loaderTxt.textContent = text;
    if (saveBtn) saveBtn.disabled = show;
    if (cancelBtn) cancelBtn.disabled = show;
    if (closeBtn) closeBtn.disabled = show;
}

// ─────────────────────────────────────────────────────────────
// FALLBACKS DE API
// ─────────────────────────────────────────────────────────────

async function _fallbackCreateApi(payload) {
    console.log(`${LOG_PREFIX} Usando fallback create API`);
    try {
        const { api } = await import('../../services/api.js');
        return await api.createCategory(payload);
    } catch (err) {
        console.error(`${LOG_PREFIX} Error en fallback create:`, err);
        throw err;
    }
}

async function _fallbackUpdateApi(id, payload) {
    console.log(`${LOG_PREFIX} Usando fallback update API`);
    try {
        const { api } = await import('../../services/api.js');
        return await api.updateCategory(id, payload);
    } catch (err) {
        console.error(`${LOG_PREFIX} Error en fallback update:`, err);
        throw err;
    }
}

async function _fallbackApiCallDelete(endpoint) {
    console.log(`${LOG_PREFIX} Usando fallback delete API`);
    try {
        const { api } = await import('../../services/api.js');
        return await api.deleteCategory(endpoint.split('/').pop());
    } catch (err) {
        console.error(`${LOG_PREFIX} Error en fallback delete:`, err);
        throw err;
    }
}

// Fallback de API para cuando window.api no está disponible
async function _fallbackApiCall(endpoint, method, body) {
    const { api } = await import('../services/api.js');
    if (method === 'POST') return api.createCategory(body);
    if (method === 'PUT') return api.updateCategory(endpoint.split('/').pop(), body);
    throw new Error('Método no soportado en fallback');
}

// ─────────────────────────────────────────────────────────────────────────────
// DEBUGGING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Función de debug global para inspeccionar el estado del navegador.
 */
export function debugCategoryNav() {
    console.group(`${LOG_PREFIX} DEBUG`);
    console.log('Estado actual:', {
        stackDepth: _navState.stack.length,
        stackPath: _navState.stack.map(n => n.nombre),
        searchQuery: _navState.searchQuery,
        isLeaf: isCurrentLeaf(),
        treeRoots: _navState.tree.length,
        totalCategories: window.appState?.categories?.length || 0,
    });
    console.log('Árbol completo:', _navState.tree);
    console.log('Hijos actuales:', getCurrentChildren().map(c => ({
        id: c._id, nombre: c.nombre, hijos: c.children.length
    })));
    console.groupEnd();
}

// Exponer globalmente para debugging
if (typeof window !== 'undefined') {
    window.categoryNavDebug = debugCategoryNav;
    window.categoryNavState = _navState;
    window.navigateCategoryInto = navigateInto;
    window.navigateCategoryBack = navigateBack;
    window.navigateCategoryRoot = navigateToRoot;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export {
    getCurrentChildren,
    isCurrentLeaf,
    applySearchFilter,
    _navState as categoryNavState,
};

export default {
    init: initCategoryNavigation,
    navigateInto,
    navigateBack,
    navigateToRoot,
    navigateToLevel,
    refreshCategoryTree,
    buildCategoryTree,
    openCategoryModal,
    closeCategoryModal,
    saveCategory,
    renderCategoryGrid,
    showCategorySkeletonLoader,
    hideCategorySkeletonLoader,
    debugCategoryNav,
};