// =============================================================================
// src/frontend/modules/documentos/modals/bulkMoveModal.js
// Modal para mover múltiples documentos con filtros y selección múltiple
// =============================================================================

import { api } from '../../../services/api.js';
import { showAlert, getFileIcon, formatFileSize } from '../../../utils.js';
import { bulkMoveState } from '../core/BulkMoveState.js';
import wsManager from '../../../services/websocket-manager.js';

class BulkMoveModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.isInitialized = false;
        this.documents = [];
        this.filteredDocs = [];
        this.categories = [];
        this.categoryTree = [];
        this.currentPath = [];
        this.filteredCategories = [];
        
        this.docFilter = {
            search: '',
            category: '',
            type: ''
        };
    }

    init() {
        if (this.isInitialized) return;
        console.log('🚀 Inicializando BulkMoveModal...');
        this.createModalHTML();
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('✅ BulkMoveModal inicializado');
    }

    createModalHTML() {
        if (document.getElementById('bulkMoveModal')) {
            this.modal = document.getElementById('bulkMoveModal');
            return;
        }

        const modalHTML = `
        <div class="modal" id="bulkMoveModal" style="display:none;">
            <div class="modal__content modal__content--lg">
                <div class="modal__header">
                    <h3 class="modal__title">
                        <i class="fas fa-folder-open"></i> 
                        <span id="bulkMoveTitle">Mover Documentos</span>
                    </h3>
                    <button class="modal__close" id="closeBulkMoveModal" aria-label="Cerrar">&times;</button>
                </div>
                
                <div class="modal__body" style="display:flex; gap:24px; max-height:60vh;">
                    <!-- Panel Izquierdo: Documentos con filtros -->
                    <div style="flex:1; min-width:0; display:flex; flex-direction:column;">
                        <div class="bulk-move-section" style="flex:1; display:flex; flex-direction:column;">
                            <h4 class="bulk-move-section__title">
                                <i class="fas fa-check-square"></i> 
                                Documentos 
                                <span id="bulkMoveSelectedCount" class="badge badge--primary">0</span>
                            </h4>
                            
                            <!-- Filtros rápidos -->
                            <div class="bulk-move-doc-filters">
                                <div class="bulk-move-doc-search">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="bulkMoveDocSearch" 
                                           placeholder="Buscar documento..." 
                                           class="form__input">
                                    <button id="clearBulkMoveDocSearch" class="input-clear-btn" 
                                            style="display:none;" title="Limpiar">&times;</button>
                                </div>
                                <select id="bulkMoveDocCategory" class="form__select form__select--sm">
                                    <option value="">Todas las categorías</option>
                                </select>
                                <select id="bulkMoveDocType" class="form__select form__select--sm">
                                    <option value="">Todos los tipos</option>
                                    <option value="pdf">PDF</option>
                                    <option value="jpg">JPG</option>
                                    <option value="jpeg">JPEG</option>
                                    <option value="png">PNG</option>
                                    <option value="txt">TXT</option>
                                </select>
                            </div>
                            
                            <!-- Botones de selección -->
                            <div class="bulk-move-doc-actions">
                                <button class="btn btn--sm btn--ghost" id="bulkMoveSelectAllBtn">
                                    <i class="far fa-check-square"></i> Seleccionar todos
                                </button>
                                <button class="btn btn--sm btn--ghost" id="bulkMoveDeselectAllBtn">
                                    <i class="far fa-square"></i> Deseleccionar todos
                                </button>
                                <span class="bulk-move-doc-count" id="bulkMoveFilteredCount">0 docs</span>
                            </div>

                            <!-- Lista de documentos -->
                            <div id="bulkMoveSelectedDocs" class="bulk-move-docs-list" style="flex:1; overflow-y:auto; max-height:300px;">
                                <div class="no-documents">
                                    <i class="fas fa-file-alt"></i>
                                    <p>Cargando documentos...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Panel Derecho: Selector de carpeta -->
                    <div style="flex:1.5; min-width:0;">
                        <div class="bulk-move-section">
                            <h4 class="bulk-move-section__title">
                                <i class="fas fa-folder-tree"></i> 
                                Carpeta destino
                            </h4>
                            
                            <!-- Breadcrumb: ÚNICO indicador de dónde estás -->
                            <div id="bulkMoveBreadcrumb" class="category--breadcrumb" style="margin-bottom:12px; flex-wrap:wrap;">
                                <ul class="category--breadcrumb-list" id="bulkMoveBreadcrumbList">
                                    <li class="category--breadcrumb-item category--breadcrumb-item--active" 
                                        data-level="0" data-folder-id="" role="button" tabindex="0">
                                        <i class="fas fa-home category--breadcrumb-icon"></i>
                                        <span class="category--breadcrumb-label">Raíz</span>
                                    </li>
                                </ul>
                            </div>

                            <div class="input-with-icon" style="margin-bottom:12px;">
                                <i class="fas fa-search"></i>
                                <input type="text" id="bulkMoveSearchFolder" 
                                       placeholder="Buscar carpeta..." 
                                       class="form__input" style="padding-left:35px;">
                                <button id="clearBulkMoveSearch" class="input-clear-btn" 
                                        style="display:none;" title="Limpiar">&times;</button>
                            </div>

                            <div id="bulkMoveFolderGrid" class="category--grid" 
                                 style="grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); 
                                        gap: 10px; max-height: 350px; overflow-y: auto;">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal__footer modal__footer--centered">
                    <label class="checkbox-label" style="margin-right:auto;">
                        <input type="checkbox" id="confirmBulkMoveCheckbox">
                        <span>Confirmo que deseo mover estos documentos</span>
                    </label>
                    <button class="btn btn--outline" id="cancelBulkMoveBtn">Cancelar</button>
                    <button class="btn btn--primary" id="executeBulkMoveBtn" disabled>
                        <i class="fas fa-arrows-alt"></i> Mover documentos
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('bulkMoveModal');
        console.log('✅ Modal HTML creado en el DOM');
    }

    setupEventListeners() {
        document.getElementById('closeBulkMoveModal')?.addEventListener('click', () => this.close());
        document.getElementById('cancelBulkMoveBtn')?.addEventListener('click', () => this.close());
        
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.getElementById('confirmBulkMoveCheckbox')?.addEventListener('change', (e) => {
            const btn = document.getElementById('executeBulkMoveBtn');
            const count = bulkMoveState.getSelectedCount();
            if (btn) btn.disabled = !e.target.checked || count === 0;
        });

        document.getElementById('executeBulkMoveBtn')?.addEventListener('click', () => this.executeMove());

        // Filtros de documentos
        const docSearch = document.getElementById('bulkMoveDocSearch');
        const clearDocSearch = document.getElementById('clearBulkMoveDocSearch');
        const docCategory = document.getElementById('bulkMoveDocCategory');
        const docType = document.getElementById('bulkMoveDocType');

        docSearch?.addEventListener('input', () => {
            this.docFilter.search = docSearch.value.trim().toLowerCase();
            clearDocSearch.style.display = this.docFilter.search ? 'flex' : 'none';
            this.applyDocFilters();
        });

        clearDocSearch?.addEventListener('click', () => {
            docSearch.value = '';
            this.docFilter.search = '';
            clearDocSearch.style.display = 'none';
            this.applyDocFilters();
        });

        docCategory?.addEventListener('change', () => {
            this.docFilter.category = docCategory.value;
            this.applyDocFilters();
        });

        docType?.addEventListener('change', () => {
            this.docFilter.type = docType.value;
            this.applyDocFilters();
        });

        // Botones seleccionar/deseleccionar todos
        document.getElementById('bulkMoveSelectAllBtn')?.addEventListener('click', () => {
            this.filteredDocs.forEach(doc => {
                const docId = doc._id || doc.id;
                if (docId) bulkMoveState.addDocument(docId);
            });
            this.renderDocList();
            this.updateUI();
        });

        document.getElementById('bulkMoveDeselectAllBtn')?.addEventListener('click', () => {
            this.filteredDocs.forEach(doc => {
                const docId = doc._id || doc.id;
                if (docId) bulkMoveState.removeDocument(docId);
            });
            this.renderDocList();
            this.updateUI();
        });

        // Búsqueda de carpetas
        const searchInput = document.getElementById('bulkMoveSearchFolder');
        const clearSearch = document.getElementById('clearBulkMoveSearch');
        
        searchInput?.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            clearSearch.style.display = query ? 'flex' : 'none';
            this.filterCategories(query);
        });

        clearSearch?.addEventListener('click', () => {
            searchInput.value = '';
            clearSearch.style.display = 'none';
            this.filterCategories('');
            searchInput.focus();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }

    async open() {
        console.group('📦 ABRIENDO MODAL DE MOVIMIENTO MÚLTIPLE');
        
        if (!this.isInitialized) this.init();
        
        this.showModalPreloader();
        this.resetModalState();
        
        const loadStart = performance.now();
        
        await Promise.all([
            this.loadDocuments(),
            this.loadCategories()
        ]);
        
        const loadTime = performance.now() - loadStart;
        const minWait = 400;
        if (loadTime < minWait) {
            await new Promise(resolve => setTimeout(resolve, minWait - loadTime));
        }
        
        this.populateDocFilters();
        this.applyDocFilters();
        this.hideModalPreloader();
        
        this.renderBreadcrumb();
        this.renderFolderGrid();
        this.updateUI();
        this.showModal();
        
        console.log(`✅ Modal abierto en ${Math.round(performance.now() - loadStart)}ms`);
        console.groupEnd();
    }

    resetModalState() {
        this.currentPath = [];
        this.docFilter = { search: '', category: '', type: '' };
        bulkMoveState.clearTargetFolder();
        bulkMoveState.deselectAll();
        
        const confirmCheckbox = document.getElementById('confirmBulkMoveCheckbox');
        if (confirmCheckbox) confirmCheckbox.checked = false;
        
        const executeBtn = document.getElementById('executeBulkMoveBtn');
        if (executeBtn) executeBtn.disabled = true;
        
        const docSearch = document.getElementById('bulkMoveDocSearch');
        if (docSearch) docSearch.value = '';
        
        const docCategory = document.getElementById('bulkMoveDocCategory');
        if (docCategory) docCategory.value = '';
        
        const docType = document.getElementById('bulkMoveDocType');
        if (docType) docType.value = '';
        
        const searchInput = document.getElementById('bulkMoveSearchFolder');
        if (searchInput) searchInput.value = '';
        
        const clearSearch = document.getElementById('clearBulkMoveSearch');
        if (clearSearch) clearSearch.style.display = 'none';
        
        const clearDocSearch = document.getElementById('clearBulkMoveDocSearch');
        if (clearDocSearch) clearDocSearch.style.display = 'none';
    }

    async loadDocuments() {
        try {
            const response = await api.call('/documents');
            if (response.success) {
                this.documents = response.documents || [];
            }
        } catch (error) {
            console.error('❌ Error cargando documentos:', error);
            this.documents = window.appState?.documents || [];
        }
    }

    async loadCategories() {
        try {
            const response = await api.getCategories();
            if (response.success) {
                this.categories = response.categories || [];
            }
        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
            this.categories = window.appState?.categories || [];
        }
        this.categoryTree = this.buildCategoryTree(this.categories);
    }

    buildCategoryTree(flatCategories) {
        if (!Array.isArray(flatCategories) || flatCategories.length === 0) return [];
        
        const map = new Map();
        const roots = [];
        
        flatCategories.forEach(cat => {
            map.set(cat._id, { ...cat, children: [] });
        });
        
        flatCategories.forEach(cat => {
            const node = map.get(cat._id);
            const parentId = cat.parent_id;
            
            if (parentId && map.has(parentId)) {
                map.get(parentId).children.push(node);
            } else {
                roots.push(node);
            }
        });
        
        return roots;
    }

    populateDocFilters() {
        const catSelect = document.getElementById('bulkMoveDocCategory');
        if (catSelect) {
            catSelect.innerHTML = '<option value="">Todas las categorías</option>';
            const uniqueCategories = [...new Set(this.documents.map(d => d.categoria).filter(Boolean))].sort();
            uniqueCategories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                catSelect.appendChild(opt);
            });
        }
    }

    applyDocFilters() {
        const { search, category, type } = this.docFilter;
        
        this.filteredDocs = this.documents.filter(doc => {
            if (search) {
                const query = search;
                const nameMatch = (doc.nombre_original || '').toLowerCase().includes(query);
                const descMatch = (doc.descripcion || '').toLowerCase().includes(query);
                const catMatch = (doc.categoria || '').toLowerCase().includes(query);
                if (!nameMatch && !descMatch && !catMatch) return false;
            }
            
            if (category && doc.categoria !== category) return false;
            
            if (type) {
                const docType = (doc.tipo_archivo || '').toLowerCase();
                if (docType !== type.toLowerCase()) return false;
            }
            
            return true;
        });
        
        this.renderDocList();
        
        const countEl = document.getElementById('bulkMoveFilteredCount');
        if (countEl) {
            countEl.textContent = `${this.filteredDocs.length} doc${this.filteredDocs.length !== 1 ? 's' : ''}`;
        }
    }

    renderDocList() {
        const container = document.getElementById('bulkMoveSelectedDocs');
        if (!container) return;

        if (this.filteredDocs.length === 0) {
            container.innerHTML = `
                <div class="no-documents">
                    <i class="fas fa-file-search"></i>
                    <p>No se encontraron documentos</p>
                    <small>Ajusta los filtros para ver más resultados</small>
                </div>`;
            return;
        }

        let html = '';
        this.filteredDocs.forEach(doc => {
            const docId = doc._id || doc.id;
            const isSelected = bulkMoveState.isSelected(docId);
            const fileIcon = getFileIcon(doc.tipo_archivo);
            
            html += `
                <div class="bulk-move-doc-item ${isSelected ? 'selected' : ''}" 
                     data-doc-id="${docId}">
                    <input type="checkbox" 
                           class="bulk-move-checkbox"
                           data-document-id="${docId}"
                           ${isSelected ? 'checked' : ''}>
                    <div class="bulk-move-doc-item__icon">
                        <i class="fas fa-file-${fileIcon}"></i>
                    </div>
                    <div class="bulk-move-doc-item__info">
                        <span class="bulk-move-doc-item__name" title="${doc.nombre_original || ''}">${doc.nombre_original || 'Sin nombre'}</span>
                        <span class="bulk-move-doc-item__meta">${doc.categoria || 'Sin categoría'} · ${formatFileSize(doc.tamano_archivo)}</span>
                    </div>
                    ${isSelected ? '<span class="bulk-move-doc-check">✓</span>' : ''}
                </div>`;
        });

        container.innerHTML = html;
        
        container.querySelectorAll('.bulk-move-doc-item').forEach(item => {
            const checkbox = item.querySelector('.bulk-move-checkbox');
            const docId = item.getAttribute('data-doc-id');
            
            checkbox?.addEventListener('change', (e) => {
                e.stopPropagation();
                if (checkbox.checked) {
                    bulkMoveState.addDocument(docId);
                } else {
                    bulkMoveState.removeDocument(docId);
                }
                this.renderDocList();
                this.updateUI();
            });
            
            item.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                const newState = !bulkMoveState.isSelected(docId);
                if (newState) {
                    bulkMoveState.addDocument(docId);
                } else {
                    bulkMoveState.removeDocument(docId);
                }
                this.renderDocList();
                this.updateUI();
            });
        });
    }

    getCurrentFolderChildren() {
        if (this.currentPath.length === 0) return this.categoryTree;
        return this.currentPath[this.currentPath.length - 1].children || [];
    }

    navigateIntoFolder(folder) {
        this.currentPath.push(folder);
        
        const searchInput = document.getElementById('bulkMoveSearchFolder');
        if (searchInput) searchInput.value = '';
        const clearSearch = document.getElementById('clearBulkMoveSearch');
        if (clearSearch) clearSearch.style.display = 'none';
        
        this.filteredCategories = [];
        bulkMoveState.setTargetFolder(folder._id, folder.nombre);
        this.renderBreadcrumb();
        this.renderFolderGrid();
    }

    navigateToRoot() {
        this.currentPath = [];
        this.filteredCategories = [];
        
        const searchInput = document.getElementById('bulkMoveSearchFolder');
        if (searchInput) searchInput.value = '';
        const clearSearch = document.getElementById('clearBulkMoveSearch');
        if (clearSearch) clearSearch.style.display = 'none';
        
        bulkMoveState.setTargetFolder(null, 'Raíz');
        this.renderBreadcrumb();
        this.renderFolderGrid();
    }

    navigateToLevel(level) {
        if (level === 0) { this.navigateToRoot(); return; }
        if (level > this.currentPath.length) return;
        
        this.currentPath = this.currentPath.slice(0, level);
        
        if (this.currentPath.length > 0) {
            const current = this.currentPath[this.currentPath.length - 1];
            bulkMoveState.setTargetFolder(current._id, current.nombre);
        } else {
            bulkMoveState.setTargetFolder(null, 'Raíz');
        }
        
        this.filteredCategories = [];
        this.renderBreadcrumb();
        this.renderFolderGrid();
    }

    filterCategories(query) {
        if (!query) {
            this.filteredCategories = [];
        } else {
            const children = this.getCurrentFolderChildren();
            this.filteredCategories = children.filter(cat => {
                const nameMatch = cat.nombre.toLowerCase().includes(query);
                const descMatch = (cat.descripcion || '').toLowerCase().includes(query);
                return nameMatch || descMatch;
            });
        }
        this.renderFolderGrid();
    }

    renderBreadcrumb() {
        const list = document.getElementById('bulkMoveBreadcrumbList');
        if (!list) return;

        list.innerHTML = '';

        const rootItem = this.createBreadcrumbItem('Raíz', 'home', 0, this.currentPath.length === 0);
        list.appendChild(rootItem);

        this.currentPath.forEach((folder, i) => {
            const item = this.createBreadcrumbItem(
                folder.nombre, folder.icon || 'folder', i + 1,
                i === this.currentPath.length - 1
            );
            list.appendChild(item);
        });
    }

    createBreadcrumbItem(label, icon, level, isActive) {
        const li = document.createElement('li');
        li.className = `category--breadcrumb-item${isActive ? ' category--breadcrumb-item--active' : ''}`;
        li.setAttribute('data-level', level);
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', isActive ? '-1' : '0');
        
        li.innerHTML = `
            <i class="fas fa-${icon} category--breadcrumb-icon"></i>
            <span class="category--breadcrumb-label" title="${this.escapeHtml(label)}">${this.escapeHtml(label)}</span>
        `;

        if (!isActive) {
            li.addEventListener('click', () => this.navigateToLevel(level));
            li.style.cursor = 'pointer';
        }

        return li;
    }

    renderFolderGrid() {
        const grid = document.getElementById('bulkMoveFolderGrid');
        if (!grid) return;

        const items = this.filteredCategories.length > 0 
            ? this.filteredCategories 
            : this.getCurrentFolderChildren();

        grid.innerHTML = '';

        if (items.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">
                    <i class="fas fa-folder-open" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
                    <p style="margin:0;">No hay subcarpetas aquí</p>
                    <small>Los documentos se moverán a esta carpeta</small>
                </div>`;
            return;
        }

        items.forEach(cat => {
            const card = this.createFolderCard(cat);
            grid.appendChild(card);
        });
    }

    createFolderCard(folder) {
        const color = folder.color || 'var(--primary)';
        const hasChildren = folder.children && folder.children.length > 0;
        
        const card = document.createElement('div');
        card.className = 'category--card';
        card.style.setProperty('--card-color', color);
        card.setAttribute('tabindex', '0');
        card.title = folder.descripcion ? `${folder.nombre} — ${folder.descripcion}` : folder.nombre;

        card.innerHTML = `
            <div class="category--card-folder-icon">
                <i class="fas fa-${folder.icon || 'folder'}"></i>
            </div>
            <div class="category--card-body">
                <h4 class="category--card-name">${this.escapeHtml(folder.nombre)}</h4>
                ${folder.descripcion ? `<p class="category--card-meta">${this.escapeHtml(folder.descripcion)}</p>` : ''}
            </div>
            <div class="category--card-footer">
                <span class="category--card-count">
                    <i class="fas fa-file-alt"></i> ${folder.documentCount || 0} docs
                </span>
                ${hasChildren ? `<span class="category--card-sub-badge">
                    <i class="fas fa-chevron-right"></i> Abrir
                </span>` : ''}
            </div>
        `;

        card.addEventListener('click', () => this.navigateIntoFolder(folder));
        return card;
    }

    updateUI() {
        const selectedCount = bulkMoveState.getSelectedCount();
        
        const countEl = document.getElementById('bulkMoveSelectedCount');
        if (countEl) countEl.textContent = selectedCount;
        
        const titleEl = document.getElementById('bulkMoveTitle');
        if (titleEl) {
            titleEl.textContent = selectedCount > 0 
                ? `Mover ${selectedCount} documento${selectedCount !== 1 ? 's' : ''}`
                : 'Mover Documentos';
        }
        
        const executeBtn = document.getElementById('executeBulkMoveBtn');
        const confirmCheckbox = document.getElementById('confirmBulkMoveCheckbox');
        if (executeBtn) {
            executeBtn.disabled = selectedCount === 0 || !confirmCheckbox?.checked;
        }
    }

    async executeMove() {
        const selectedIds = bulkMoveState.getSelectedIds();
        const targetFolderId = bulkMoveState.targetFolderId;
        
        if (selectedIds.length === 0) {
            showAlert('No hay documentos seleccionados', 'warning');
            return;
        }

        const confirmCheckbox = document.getElementById('confirmBulkMoveCheckbox');
        if (!confirmCheckbox?.checked) {
            showAlert('Debes confirmar la acción marcando la casilla', 'warning');
            return;
        }

        console.group('📦 EJECUTANDO MOVIMIENTO MÚLTIPLE');
        console.log('📋 IDs:', selectedIds);
        console.log('📁 Destino:', targetFolderId || 'Raíz');

        this.showPreloader(selectedIds.length);

        try {
            const response = await api.call('/documents/bulk-move', {
                method: 'PATCH',
                body: JSON.stringify({
                    document_ids: selectedIds,
                    folder_id: targetFolderId || null
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.success) {
                await this.handleSuccess(response);
            } else {
                throw new Error(response.message || 'Error en el movimiento múltiple');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.hidePreloader();
            showAlert('Error al mover documentos: ' + error.message, 'error');
        }

        console.groupEnd();
    }

    showModalPreloader() {
        if (!this.modal) return;
        this.modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        let preloader = document.getElementById('bulkMoveLoadingOverlay');
        if (!preloader) {
            preloader = document.createElement('div');
            preloader.id = 'bulkMoveLoadingOverlay';
            preloader.className = 'bulk-move-loading-overlay';
            preloader.innerHTML = `
                <div class="bulk-move-loading-content">
                    <div class="bulk-move-loading-spinner">
                        <div class="bulk-move-spinner-dot"></div>
                        <div class="bulk-move-spinner-dot"></div>
                        <div class="bulk-move-spinner-dot"></div>
                    </div>
                    <h3 class="bulk-move-loading-title">Cargando documentos</h3>
                    <p class="bulk-move-loading-subtitle">Preparando el selector de carpetas...</p>
                    <div class="bulk-move-loading-progress">
                        <div class="bulk-move-loading-bar"></div>
                    </div>
                </div>`;
            const modalContent = this.modal.querySelector('.modal__content--lg');
            if (modalContent) modalContent.appendChild(preloader);
        }
        preloader.style.display = 'flex';
        setTimeout(() => {
            const bar = preloader.querySelector('.bulk-move-loading-bar');
            if (bar) bar.style.width = '70%';
        }, 100);
    }

    hideModalPreloader() {
        const preloader = document.getElementById('bulkMoveLoadingOverlay');
        if (!preloader) return;
        const bar = preloader.querySelector('.bulk-move-loading-bar');
        if (bar) bar.style.width = '100%';
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.style.transition = 'opacity 0.25s ease';
            setTimeout(() => {
                preloader.style.display = 'none';
                preloader.style.opacity = '1';
                if (bar) bar.style.width = '0%';
            }, 250);
        }, 200);
    }

    showPreloader(count) {
        let preloader = document.getElementById('bulkMovePreloader');
        if (!preloader) {
            preloader = document.createElement('div');
            preloader.id = 'bulkMovePreloader';
            preloader.className = 'bulk-delete-preloader';
            preloader.innerHTML = `
                <div class="preloader-container">
                    <div class="preloader-spinner">
                        <div class="spinner-circle"></div>
                        <div class="spinner-circle"></div>
                        <div class="spinner-circle"></div>
                        <div class="spinner-circle"></div>
                    </div>
                    <div class="preloader-content">
                        <h3 class="preloader-title">Moviendo documentos</h3>
                        <p class="preloader-message">
                            Procesando <span class="count-highlight">${count}</span> documento${count !== 1 ? 's' : ''}...
                        </p>
                        <p class="preloader-hint">
                            <i class="fas fa-info-circle"></i>
                            Esta acción puede tomar algunos segundos
                        </p>
                    </div>
                </div>`;
            document.body.appendChild(preloader);
        } else {
            const countEl = preloader.querySelector('.count-highlight');
            if (countEl) countEl.textContent = count;
            preloader.style.display = 'flex';
        }
        setTimeout(() => preloader.classList.add('active'), 10);
    }

    hidePreloader() {
        const preloader = document.getElementById('bulkMovePreloader');
        if (preloader) {
            preloader.classList.remove('active');
            setTimeout(() => { preloader.style.display = 'none'; }, 300);
        }
    }

    async handleSuccess(response) {
        this.hidePreloader();
        
        const count = response.moved || bulkMoveState.getSelectedCount();
        const folderName = response.target?.folder_name || bulkMoveState.targetFolderName || 'Raíz';
        
        showAlert(`${count} documentos movidos a "${folderName}"`, 'success');
        
        this.close();
        bulkMoveState.clear();
        
        if (window.loadDocuments) await window.loadDocuments();
        if (window.loadCategories) await window.loadCategories();
        if (window.refreshCategoryTree) window.refreshCategoryTree();
        if (typeof window.renderDocumentsTable === 'function') window.renderDocumentsTable();
        
        console.log(`✅ ${count} documentos movidos exitosamente`);
    }

    showModal() {
        this.modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        setTimeout(() => {
            this.modal.classList.add('show');
            this.isOpen = true;
        }, 10);
    }

    close() {
        if (!this.modal || !this.isOpen) return;
        this.modal.classList.remove('show');
        setTimeout(() => {
            this.modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            this.isOpen = false;
        }, 300);
    }

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

export const bulkMoveModal = new BulkMoveModal();

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => bulkMoveModal.init(), 1000);
    });
}

if (typeof window !== 'undefined') {
    window.bulkMoveModal = bulkMoveModal;
}