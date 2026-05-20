// src/frontend/modules/tasks.js
// =============================================================================
// TASK MANAGER VERSION 3.0 — REDISEÑO COMPLETO
// Apartado 1: Tareas personales (post-it, solo para mí)
// Apartado 2: Asignación de tareas a otros (con permisos)
// =============================================================================

import { canView, canAction, showNoPermissionAlert, loadCurrentPermissions } from './permissions.js';

const DEBUG = true;
function tlog(...args) { if (DEBUG) console.log('📋 [TasksModule v3]', ...args); }

// =============================================================================
// CLASE PRINCIPAL
// =============================================================================

class TaskManager {
    constructor() {
        this.tasks          = [];         // todas las tareas del usuario
        this.personalTasks  = [];         // filtradas: tipo personal (solo yo)
        this.assignedTasks  = [];         // filtradas: tipo asignada/grupal/clase (a otros)
        this.users          = [];         // usuarios asignables
        this.currentUser    = null;
        this.isLoading      = false;
        this.isSaving       = false;
        this.pendingAction  = null;       // { type, taskId }
        this.apiBaseUrl     = '/api';

        // Filtros para el panel de asignación
        this.assignFilter = {
            search:    '',
            estado:    'all',
            prioridad: 'all',
        };

        // Seguimiento de dropdowns abiertos en post-its
        this._openDropdownId = null;

        this.init();
    }

    // =========================================================================
    // INICIALIZACIÓN
    // =========================================================================

    async init() {
        tlog('🚀 Inicializando TaskManager 3.0...');

        try {
            const raw = localStorage.getItem('user');
            if (raw) this.currentUser = JSON.parse(raw);
        } catch (e) {
            console.error('Error al leer usuario:', e);
        }

        await loadCurrentPermissions();

        if (!canView('tareas')) {
            showNoPermissionAlert('tareas');
            this._renderNoPermission();
            return;
        }

        this._bindGlobalEvents();
        await this.loadUsers();
        await this.loadTasks();
    }

    // =========================================================================
    // CARGA DE DATOS
    // =========================================================================

    async loadUsers() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${this.apiBaseUrl}/tasks/assignable-users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (data.success) {
                this.users = data.users;
                tlog(`✅ ${this.users.length} usuarios asignables`);
            }
        } catch (err) {
            console.error('❌ loadUsers:', err);
            this.users = [];
        }
    }

    async loadTasks() {
        if (this.isLoading) return;
        this.isLoading = true;

        this._showPreloaders();

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Sin sesión');

            const res = await fetch(`${this.apiBaseUrl}/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Error al cargar');

            this.tasks = data.tasks || [];

            // Separar en las dos categorías
            const userId = this.currentUser?.id || this.currentUser?._id;
            this.personalTasks = this.tasks.filter(t => t.tipo === 'personal');
            this.assignedTasks = this.tasks.filter(t => t.tipo !== 'personal');

            tlog(`✅ ${this.tasks.length} tareas | ${this.personalTasks.length} personales | ${this.assignedTasks.length} asignadas`);

            this._renderStats();
            this._renderPostitBoard();
            this._renderAssignTable();

        } catch (err) {
            console.error('❌ loadTasks:', err);
            this._renderError(err.message);
        } finally {
            this.isLoading = false;
        }
    }

    async _loadStats() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch(`${this.apiBaseUrl}/tasks/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.stats) return data.stats;
        } catch (_) {}
        return null;
    }

    // =========================================================================
    // RENDERIZADO: ESTADÍSTICAS SUPERIORES
    // =========================================================================

    async _renderStats() {
        const stats = await this._loadStats();
        if (!stats) return;

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val ?? 0;
        };

        set('statTotal',     stats.total);
        set('statPending',   stats.pendientes);
        set('statProgress',  stats.enProgreso);
        set('statCompleted', stats.completadas);
    }

    // =========================================================================
    // RENDERIZADO: BOARD DE POST-ITS (tareas personales)
    // =========================================================================

    _showPreloaders() {
        const postit = document.getElementById('postitBoard');
        const table  = document.getElementById('assignTableBody');

        if (postit) postit.innerHTML = `
            <div class="tasks-preloader tasks-preloader--postit">
                <div class="tasks-preloader__ring"></div>
                <span class="tasks-preloader__text">Cargando mis tareas...</span>
            </div>`;

        if (table) table.innerHTML = `
            <tr><td colspan="7">
                <div class="tasks-preloader">
                    <div class="tasks-preloader__ring"></div>
                    <span class="tasks-preloader__text">Cargando tareas asignadas...</span>
                </div>
            </td></tr>`;
    }

    _renderPostitBoard() {
        const board = document.getElementById('postitBoard');
        if (!board) return;

        const countEl = document.getElementById('personalCount');
        if (countEl) countEl.textContent = `${this.personalTasks.length} notas`;

        if (this.personalTasks.length === 0) {
            board.innerHTML = `
                <div class="postit-grid">
                    ${canAction('tareas') ? this._postitAddCard() : ''}
                    <div class="tasks-empty tasks-empty--postit">
                        <span class="tasks-empty__icon">📝</span>
                        <p class="tasks-empty__title">Sin notas todavía</p>
                        <p class="tasks-empty__subtitle">¡Agrega tu primera tarea personal!</p>
                    </div>
                </div>`;
            this._bindPostitEmptyBtn(board);
            return;
        }

        board.innerHTML = `
            <div class="postit-grid" id="postitGrid">
                ${canAction('tareas') ? this._postitAddCard() : ''}
                ${this.personalTasks.map(t => this._buildPostitCard(t)).join('')}
            </div>`;

        this._bindPostitEvents(board);
    }

    _postitAddCard() {
        return `
            <div class="postit-card postit-card--empty" id="addPostitCard" role="button" tabindex="0" aria-label="Agregar nueva tarea personal">
                <i class="fas fa-plus postit-empty__icon"></i>
                <span class="postit-empty__text">Nueva nota</span>
            </div>`;
    }

    _buildPostitCard(task) {
        const prioridadClass = task.prioridad === 'critica' ? 'critica' : task.prioridad;
        const isDone = task.estado === 'completada';
        const dueDate = task.fecha_limite ? new Date(task.fecha_limite) : null;
        const isOverdue = dueDate && dueDate < new Date() && !isDone;

        const dueDateStr = dueDate
            ? dueDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
            : null;

        const puedeCompletar = task.permisos?.puedeCompletar && !isDone;
        const puedeEditar    = task.permisos?.puedeEditar;
        const puedeEliminar  = task.permisos?.puedeEliminar;

        return `
            <div class="postit-card postit-card--${prioridadClass} ${isDone ? 'postit-card--done' : ''}"
                 data-task-id="${task._id}">
                <div class="postit-card__pin"></div>

                <div class="postit-card__header">
                    <h3 class="postit-card__title">${this._esc(task.titulo)}</h3>
                    ${(puedeCompletar || puedeEditar || puedeEliminar) ? `
                        <button class="postit-card__menu" data-task-id="${task._id}" title="Más opciones">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="postit-card__dropdown" id="dropdown-${task._id}" style="display:none;">
                            ${puedeCompletar ? `<button class="postit-card__dropdown-item postit-card__dropdown-item--complete" data-action="complete" data-task-id="${task._id}"><i class="fas fa-check-circle"></i> Completar</button>` : ''}
                            ${puedeEditar    ? `<button class="postit-card__dropdown-item postit-card__dropdown-item--edit"     data-action="edit"    data-task-id="${task._id}"><i class="fas fa-edit"></i> Editar</button>` : ''}
                            ${puedeEliminar  ? `<button class="postit-card__dropdown-item postit-card__dropdown-item--delete"   data-action="delete"  data-task-id="${task._id}"><i class="fas fa-trash-alt"></i> Eliminar</button>` : ''}
                        </div>
                    ` : ''}
                </div>

                <div class="postit-card__body">
                    ${task.descripcion ? `<p class="postit-card__desc">${this._esc(task.descripcion)}</p>` : ''}
                </div>

                <div class="postit-card__footer">
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                        <span class="postit-card__status-dot postit-card__status-dot--${task.estado}"></span>
                        ${dueDateStr ? `<span class="postit-card__date ${isOverdue ? 'postit-card__date--overdue' : ''}"><i class="fas fa-calendar-alt"></i>${dueDateStr}</span>` : ''}
                    </div>
                    ${task.categoria ? `<span class="postit-card__category">${this._esc(task.categoria)}</span>` : ''}
                </div>
            </div>`;
    }

    _bindPostitEmptyBtn(board) {
        const addCard = board.querySelector('#addPostitCard');
        if (addCard) {
            addCard.addEventListener('click', () => this.openPersonalModal());
            addCard.addEventListener('keypress', e => { if (e.key === 'Enter') this.openPersonalModal(); });
        }
    }

    _bindPostitEvents(board) {
        this._bindPostitEmptyBtn(board);

        // Botones de menú (ellipsis)
        board.querySelectorAll('.postit-card__menu').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const id  = btn.dataset.taskId;
                const dd  = board.querySelector(`#dropdown-${id}`);
                if (!dd) return;

                // Cerrar el anterior si estaba abierto
                if (this._openDropdownId && this._openDropdownId !== id) {
                    const prev = board.querySelector(`#dropdown-${this._openDropdownId}`);
                    if (prev) prev.style.display = 'none';
                }

                const isOpen = dd.style.display !== 'none';
                dd.style.display = isOpen ? 'none' : 'block';
                this._openDropdownId = isOpen ? null : id;
            });
        });

        // Items del dropdown
        board.querySelectorAll('.postit-card__dropdown-item').forEach(item => {
            item.addEventListener('click', e => {
                e.stopPropagation();
                const { action, taskId } = item.dataset;
                // Cerrar dropdown
                const dd = board.querySelector(`#dropdown-${taskId}`);
                if (dd) dd.style.display = 'none';
                this._openDropdownId = null;

                this._handleTaskAction(action, taskId);
            });
        });

        // Cerrar dropdowns al hacer clic fuera
        document.addEventListener('click', this._closeAllDropdowns.bind(this), { once: false });
    }

    _closeAllDropdowns() {
        document.querySelectorAll('.postit-card__dropdown').forEach(dd => {
            dd.style.display = 'none';
        });
        this._openDropdownId = null;
    }

    // =========================================================================
    // RENDERIZADO: TABLA DE TAREAS ASIGNADAS
    // =========================================================================

    _renderAssignTable() {
        const tbody   = document.getElementById('assignTableBody');
        const countEl = document.getElementById('assignCount');

        // Verificar permiso para asignar tareas
        const canAssign = canAction('tareas');

        // Actualizar visibilidad del apartado completo
        const assignBlock = document.getElementById('assignBlock');
        if (assignBlock) {
            assignBlock.style.display = canAssign ? '' : 'none';
            // Si el usuario no puede asignar pero sí puede ver tareas asignadas A ÉL
            // mostramos el bloque igualmente pero con aviso
        }

        if (!tbody) return;

        // Filtrar según barra
        let filtered = this._filterAssignedTasks();

        if (countEl) countEl.textContent = `${filtered.length} tareas`;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7">
                    <div class="tasks-empty" style="padding:2.5rem 1rem;">
                        <i class="fas fa-clipboard-list tasks-empty__icon"></i>
                        <p class="tasks-empty__title">Sin tareas asignadas</p>
                        <p class="tasks-empty__subtitle">Las tareas que asignes a otras personas aparecerán aquí</p>
                    </div>
                </td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(t => this._buildAssignRow(t)).join('');
        this._bindAssignRowEvents(tbody);
    }

    _filterAssignedTasks() {
        let list = [...this.assignedTasks];

        const { search, estado, prioridad } = this.assignFilter;

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                t.titulo.toLowerCase().includes(q) ||
                (t.descripcion || '').toLowerCase().includes(q) ||
                (t.creado_por_nombre || '').toLowerCase().includes(q)
            );
        }
        if (estado !== 'all')    list = list.filter(t => t.estado === estado);
        if (prioridad !== 'all') list = list.filter(t => t.prioridad === prioridad);

        return list;
    }

    _buildAssignRow(task) {
        const dueDate = task.fecha_limite ? new Date(task.fecha_limite) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.estado !== 'completada';

        const dueDateStr = dueDate
            ? dueDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: '2-digit' })
            : '—';

        // Avatares de asignados
        const asignados = task.asignado_a || [];
        const avatarsHtml = asignados.slice(0, 3).map((u, i) => {
            const nombre = u.usuario || '?';
            const initials = nombre.slice(0, 2).toUpperCase();
            return `<span class="assignee-avatar assignee-avatar--${i}" title="${this._esc(nombre)}">${initials}</span>`;
        }).join('');
        const extraHtml = asignados.length > 3
            ? `<span class="assignee-avatar assignee-avatar--more">+${asignados.length - 3}</span>`
            : '';

        const prioridadClass = task.prioridad === 'critica' ? 'critica' : task.prioridad;
        const prioridadLabel = { baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica' }[task.prioridad] || task.prioridad;
        const tipoLabel = { personal: 'Personal', asignada: 'Asignada', grupal: 'Grupal', clase: 'Clase' }[task.tipo] || task.tipo;
        const estadoLabel = { pendiente: 'Pendiente', 'en-progreso': 'En progreso', completada: 'Completada', cancelada: 'Cancelada' }[task.estado] || task.estado;

        const puedeCompletar = task.permisos?.puedeCompletar && task.estado !== 'completada';
        const puedeEditar    = task.permisos?.puedeEditar;
        const puedeEliminar  = task.permisos?.puedeEliminar;

        return `
            <tr data-task-id="${task._id}">
                <td>
                    <div class="atask-title-cell">
                        <span class="atask-title">${this._esc(task.titulo)}</span>
                        ${task.descripcion ? `<span class="atask-desc">${this._esc(task.descripcion.substring(0, 60))}${task.descripcion.length > 60 ? '...' : ''}</span>` : ''}
                    </div>
                </td>
                <td class="col-assignees">
                    <div class="assignees-stack">
                        ${avatarsHtml}${extraHtml}
                        ${asignados.length === 0 ? '<span style="color:var(--text-tertiary);font-size:0.78rem;">Sin asignar</span>' : ''}
                    </div>
                </td>
                <td class="col-type">
                    <span style="font-size:0.78rem;color:var(--text-secondary);">${tipoLabel}</span>
                </td>
                <td>
                    <span class="priority-chip priority-chip--${prioridadClass}">
                        <span class="priority-chip__dot"></span>
                        ${prioridadLabel}
                    </span>
                </td>
                <td>
                    <span class="status-chip status-chip--${task.estado}">${estadoLabel}</span>
                </td>
                <td>
                    <div class="due-cell">
                        <span class="due-date ${isOverdue ? 'due-date--overdue' : ''}">${dueDateStr}</span>
                        ${task.hora_limite ? `<span class="due-time">${task.hora_limite}</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="row-actions">
                        ${puedeCompletar ? `<button class="row-action-btn row-action-btn--complete" data-action="complete" data-task-id="${task._id}" title="Completar"><i class="fas fa-check"></i></button>` : ''}
                        ${puedeEditar    ? `<button class="row-action-btn row-action-btn--edit"     data-action="edit"    data-task-id="${task._id}" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
                        ${puedeEliminar  ? `<button class="row-action-btn row-action-btn--delete"   data-action="delete"  data-task-id="${task._id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                </td>
            </tr>`;
    }

    _bindAssignRowEvents(tbody) {
        tbody.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                const { action, taskId } = btn.dataset;
                this._handleTaskAction(action, taskId);
            });
        });
    }

    // =========================================================================
    // EVENTOS GLOBALES
    // =========================================================================

    _bindGlobalEvents() {
        tlog('🔗 Enlazando eventos globales...');

        // Botón añadir tarea personal
        const addPersonalBtn = document.getElementById('addPersonalTaskBtn');
        if (addPersonalBtn) {
            addPersonalBtn.addEventListener('click', () => this.openPersonalModal());
        }

        // Botón añadir tarea asignada
        const addAssignBtn = document.getElementById('addAssignTaskBtn');
        if (addAssignBtn) {
            addAssignBtn.addEventListener('click', () => {
                if (!canAction('tareas')) { showNoPermissionAlert('tareas'); return; }
                this.openAssignModal();
            });
        }

        // Filtros de asignación
        const assignSearch   = document.getElementById('assignSearch');
        const assignEstado   = document.getElementById('assignEstado');
        const assignPrioridad = document.getElementById('assignPrioridad');

        if (assignSearch) {
            assignSearch.addEventListener('input', e => {
                this.assignFilter.search = e.target.value;
                clearTimeout(this._searchTimeout);
                this._searchTimeout = setTimeout(() => this._renderAssignTable(), 350);
            });
        }
        if (assignEstado) {
            assignEstado.addEventListener('change', e => {
                this.assignFilter.estado = e.target.value;
                this._renderAssignTable();
            });
        }
        if (assignPrioridad) {
            assignPrioridad.addEventListener('change', e => {
                this.assignFilter.prioridad = e.target.value;
                this._renderAssignTable();
            });
        }

        // Modales — cerrar
        ['personalModal', 'assignModal', 'confirmModal'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                // Clic en overlay
                modal.addEventListener('click', e => {
                    if (e.target === modal) this._closeModal(id);
                });
            }
        });

        const closePersonalBtn = document.getElementById('closePersonalModal');
        const cancelPersonalBtn = document.getElementById('cancelPersonalBtn');
        const savePersonalBtn  = document.getElementById('savePersonalBtn');
        const closeAssignBtn   = document.getElementById('closeAssignModal');
        const cancelAssignBtn  = document.getElementById('cancelAssignBtn');
        const saveAssignBtn    = document.getElementById('saveAssignBtn');
        const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
        const confirmActionBtn = document.getElementById('confirmActionBtn');

        if (closePersonalBtn) closePersonalBtn.addEventListener('click', () => this._closeModal('personalModal'));
        if (cancelPersonalBtn) cancelPersonalBtn.addEventListener('click', () => this._closeModal('personalModal'));
        if (savePersonalBtn)  savePersonalBtn.addEventListener('click', () => this._saveTask('personal'));

        if (closeAssignBtn)   closeAssignBtn.addEventListener('click', () => this._closeModal('assignModal'));
        if (cancelAssignBtn)  cancelAssignBtn.addEventListener('click', () => this._closeModal('assignModal'));
        if (saveAssignBtn)    saveAssignBtn.addEventListener('click', () => this._saveTask('assign'));

        if (cancelConfirmBtn) cancelConfirmBtn.addEventListener('click', () => this._closeModal('confirmModal'));
        if (confirmActionBtn) confirmActionBtn.addEventListener('click', () => this._executePendingAction());

        // Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this._closeModal('personalModal');
                this._closeModal('assignModal');
                this._closeModal('confirmModal');
                this._closeAllDropdowns();
            }
        });

        tlog('✅ Eventos enlazados');
    }

    // =========================================================================
    // MODALES
    // =========================================================================

    openPersonalModal(task = null) {
        if (!canAction('tareas')) { showNoPermissionAlert('tareas'); return; }

        const modal = document.getElementById('personalModal');
        if (!modal) { console.error('❌ #personalModal no encontrado'); return; }

        const form = document.getElementById('personalTaskForm');
        const titleEl = document.getElementById('personalModalTitle');

        if (titleEl) titleEl.textContent = task ? '✏️ Editar nota' : '📝 Nueva nota personal';
        this._clearErrors(['personalTitulo', 'personalDueDate', 'personalTime']);

        if (form) form.reset();
        const idInput = document.getElementById('personalTaskId');
        if (idInput) idInput.value = '';

        if (task) {
            this._fillPersonalForm(task);
        } else {
            const today = new Date().toISOString().split('T')[0];
            const dueDateEl = document.getElementById('personalDueDate');
            if (dueDateEl) { dueDateEl.min = today; dueDateEl.value = ''; }
        }

        this._openModal('personalModal');
    }

    openAssignModal(task = null) {
        if (!canAction('tareas')) { showNoPermissionAlert('tareas'); return; }

        const modal = document.getElementById('assignModal');
        if (!modal) { console.error('❌ #assignModal no encontrado'); return; }

        const form = document.getElementById('assignTaskForm');
        const titleEl = document.getElementById('assignModalTitle');

        if (titleEl) titleEl.textContent = task ? '✏️ Editar tarea asignada' : '👥 Asignar nueva tarea';
        this._clearErrors(['assignTitulo', 'assignDueDate', 'assignTime', 'assignAssignees']);

        // Poblar select de usuarios
        const assigneesSelect = document.getElementById('assignAssignees');
        if (assigneesSelect && this.users.length > 0) {
            assigneesSelect.innerHTML = this.users.map(u =>
                `<option value="${u.id}">${this._esc(u.usuario)} — ${u.rol}</option>`
            ).join('');
        }

        if (form) form.reset();
        const idInput = document.getElementById('assignTaskId');
        if (idInput) idInput.value = '';

        if (task) {
            this._fillAssignForm(task);
        } else {
            const today = new Date().toISOString().split('T')[0];
            const dueDateEl = document.getElementById('assignDueDate');
            if (dueDateEl) { dueDateEl.min = today; }
            const estadoEl = document.getElementById('assignEstadoForm');
            if (estadoEl) estadoEl.value = 'pendiente';
            const prioEl = document.getElementById('assignPrioridadForm');
            if (prioEl) prioEl.value = 'media';
            const tipoEl = document.getElementById('assignTipoForm');
            if (tipoEl) tipoEl.value = 'asignada';
        }

        this._openModal('assignModal');
    }

    _openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => modal.classList.add('active'));
    }

    _closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('active');
        setTimeout(() => { modal.style.display = 'none'; }, 300);
    }

    _fillPersonalForm(task) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
        set('personalTaskId', task._id);
        set('personalTitulo', task.titulo);
        set('personalDescripcion', task.descripcion);
        set('personalPrioridad', task.prioridad);
        set('personalCategoria', task.categoria);
        if (task.fecha_limite) {
            // Usar fecha_limite_formateada si existe (ya corregida en backend)
            if (task.fecha_limite_formateada) {
                set('personalDueDate', task.fecha_limite_formateada);
            } else {
                const d = new Date(task.fecha_limite);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                set('personalDueDate', `${year}-${month}-${day}`);
            }
            if (task.hora_limite) set('personalTime', task.hora_limite);
        }
        const rem = document.getElementById('personalReminder');
        if (rem) rem.checked = task.recordatorio || false;
    }

    _fillAssignForm(task) {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
        set('assignTaskId', task._id);
        set('assignTitulo', task.titulo);
        set('assignDescripcion', task.descripcion);
        set('assignPrioridadForm', task.prioridad);
        set('assignEstadoForm', task.estado);
        set('assignTipoForm', task.tipo);
        set('assignCategoria', task.categoria);
        if (task.fecha_limite) {
            // Usar fecha_limite_formateada si existe (ya corregida en backend)
            if (task.fecha_limite_formateada) {
                set('assignDueDate', task.fecha_limite_formateada);
            } else {
                const d = new Date(task.fecha_limite);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                set('assignDueDate', `${year}-${month}-${day}`);
            }
            if (task.hora_limite) set('assignTime', task.hora_limite);
        }
        const rem = document.getElementById('assignReminder');
        if (rem) rem.checked = task.recordatorio || false;

        // Seleccionar asignados
        const sel = document.getElementById('assignAssignees');
        if (sel && task.asignado_a?.length) {
            const ids = task.asignado_a.map(u => u._id || u);
            Array.from(sel.options).forEach(opt => {
                opt.selected = ids.includes(opt.value);
            });
        }
    }

    // =========================================================================
    // GUARDAR TAREA
    // =========================================================================

    async _saveTask(mode) {
        if (!canAction('tareas')) { showNoPermissionAlert('tareas'); return; }
        if (this.isSaving) return;

        const isPersonal = mode === 'personal';
        const prefix     = isPersonal ? 'personal' : 'assign';
        const modalId    = isPersonal ? 'personalModal' : 'assignModal';
        const saveBtnId  = isPersonal ? 'savePersonalBtn' : 'saveAssignBtn';

        if (!this._validateTaskForm(prefix)) return;

        const taskData = isPersonal
            ? this._getPersonalFormData()
            : this._getAssignFormData();

        this.isSaving = true;

        const modal = document.getElementById(modalId);
        const preloader = this._showModalSaving(modal, 'Guardando...');
        const saveBtn = document.getElementById(saveBtnId);
        if (saveBtn) saveBtn.disabled = true;

        try {
            const token = localStorage.getItem('token');
            const id     = taskData._id;
            const url    = id ? `${this.apiBaseUrl}/tasks/${id}` : `${this.apiBaseUrl}/tasks`;
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(taskData)
            });
            const data = await res.json();

            if (!res.ok || !data.success) throw new Error(data.message || 'Error al guardar');

            this._showModalSuccess(preloader, id ? 'Tarea actualizada ✓' : 'Tarea creada ✓');

            await this.loadTasks();

            setTimeout(() => this._closeModal(modalId), 1400);

        } catch (err) {
            console.error('❌ _saveTask:', err);
            this._showModalError(preloader, err.message);
        } finally {
            this.isSaving = false;
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    _getPersonalFormData() {
        const g = id => document.getElementById(id)?.value?.trim() || '';
        const gc = id => document.getElementById(id)?.checked || false;

        const date = g('personalDueDate');
        const time = g('personalTime');
        let fechaLimite = null;
        if (date) fechaLimite = new Date(`${date}T${time || '23:59:59'}`).toISOString();

        return {
            _id: g('personalTaskId') || null,
            titulo: g('personalTitulo'),
            descripcion: g('personalDescripcion'),
            prioridad: g('personalPrioridad') || 'media',
            estado: 'pendiente',
            tipo: 'personal',
            categoria: g('personalCategoria'),
            asignado_a: [],
            fecha_limite: fechaLimite,
            hora_limite: time || null,
            recordatorio: gc('personalReminder'),
        };
    }

    _getAssignFormData() {
        const g = id => document.getElementById(id)?.value?.trim() || '';
        const gc = id => document.getElementById(id)?.checked || false;

        const date = g('assignDueDate');
        const time = g('assignTime');
        let fechaLimite = null;
        if (date) fechaLimite = new Date(`${date}T${time || '23:59:59'}`).toISOString();

        const sel = document.getElementById('assignAssignees');
        const asignados = sel
            ? Array.from(sel.selectedOptions).map(o => o.value).filter(v => v)
            : [];

        return {
            _id: g('assignTaskId') || null,
            titulo: g('assignTitulo'),
            descripcion: g('assignDescripcion'),
            prioridad: g('assignPrioridadForm') || 'media',
            estado: g('assignEstadoForm') || 'pendiente',
            tipo: g('assignTipoForm') || 'asignada',
            categoria: g('assignCategoria'),
            asignado_a: asignados,
            fecha_limite: fechaLimite,
            hora_limite: time || null,
            recordatorio: gc('assignReminder'),
        };
    }

    // =========================================================================
    // VALIDACIÓN
    // =========================================================================

    _validateTaskForm(prefix) {
        let ok = true;
        this._clearErrors([`${prefix}Titulo`, `${prefix}DueDate`, `${prefix}Time`]);

        const titulo = document.getElementById(`${prefix}Titulo`)?.value?.trim();
        if (!titulo) {
            this._showFieldError(`${prefix}Titulo`, 'El título es obligatorio');
            ok = false;
        }

        const dateVal = document.getElementById(`${prefix}DueDate`)?.value;
        if (dateVal) {
            const sel = new Date(dateVal);
            const today = new Date(); today.setHours(0,0,0,0);
            if (sel < today) {
                this._showFieldError(`${prefix}DueDate`, 'La fecha no puede ser anterior a hoy');
                ok = false;
            }
        }

        // Para asignadas: que haya al menos 1 usuario
        if (prefix === 'assign') {
            const sel = document.getElementById('assignAssignees');
            const asignados = sel ? Array.from(sel.selectedOptions).length : 0;
            if (asignados === 0) {
                this._showFieldError('assignAssignees', 'Selecciona al menos un usuario');
                ok = false;
            }
        }

        return ok;
    }

    _showFieldError(fieldId, message) {
        this._clearErrors([fieldId]);
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.style.borderColor = 'var(--danger)';
        const err = document.createElement('div');
        err.className = 'field-error';
        err.id = `err-${fieldId}`;
        err.textContent = message;
        field.parentNode.insertBefore(err, field.nextSibling);
    }

    _clearErrors(ids = []) {
        ids.forEach(id => {
            const el  = document.getElementById(id);
            const err = document.getElementById(`err-${id}`);
            if (el)  el.style.borderColor = '';
            if (err) err.remove();
        });
    }

    // =========================================================================
    // ACCIONES EN TAREAS (completar, editar, eliminar)
    // =========================================================================

    _handleTaskAction(action, taskId) {
        if (!canAction('tareas')) { showNoPermissionAlert('tareas'); return; }

        const task = this.tasks.find(t => t._id === taskId);
        if (!task) { console.error('❌ Tarea no encontrada:', taskId); return; }

        switch (action) {
            case 'edit':
                if (task.tipo === 'personal') this.openPersonalModal(task);
                else this.openAssignModal(task);
                break;
            case 'delete':
                this._showConfirmModal('delete', taskId, task.titulo);
                break;
            case 'complete':
                this._showConfirmModal('complete', taskId, task.titulo);
                break;
            default:
                console.warn('Acción desconocida:', action);
        }
    }

    _showConfirmModal(type, taskId, titulo) {
        const modal = document.getElementById('confirmModal');
        if (!modal) return;

        const iconWrap = document.getElementById('confirmIconWrap');
        const titleEl  = document.getElementById('confirmTitle');
        const msgEl    = document.getElementById('confirmMsg');
        const actionBtn = document.getElementById('confirmActionBtn');

        const configs = {
            delete: {
                iconClass: 'confirm-modal__icon-wrap--delete',
                icon: '<i class="fas fa-trash-alt"></i>',
                title: 'Eliminar tarea',
                msg: `¿Estás seguro de que quieres eliminar "<strong>${this._esc(titulo)}</strong>"? Esta acción no se puede deshacer.`,
                btnClass: 'btn-confirm-delete',
                btnText: '<i class="fas fa-trash-alt"></i> Sí, eliminar',
            },
            complete: {
                iconClass: 'confirm-modal__icon-wrap--complete',
                icon: '<i class="fas fa-check-circle"></i>',
                title: 'Completar tarea',
                msg: `¿Marcar "<strong>${this._esc(titulo)}</strong>" como completada?`,
                btnClass: 'btn-confirm-complete',
                btnText: '<i class="fas fa-check-circle"></i> Sí, completar',
            },
        };

        const cfg = configs[type];
        if (!cfg) return;

        if (iconWrap) { iconWrap.className = `confirm-modal__icon-wrap ${cfg.iconClass}`; iconWrap.innerHTML = cfg.icon; }
        if (titleEl)  titleEl.textContent = cfg.title;
        if (msgEl)    msgEl.innerHTML = cfg.msg;
        if (actionBtn) { actionBtn.className = cfg.btnClass; actionBtn.innerHTML = cfg.btnText; }

        this.pendingAction = { type, taskId };
        this._openModal('confirmModal');
    }

    async _executePendingAction() {
        if (!this.pendingAction || this.isSaving) return;

        const { type, taskId } = this.pendingAction;
        this.isSaving = true;

        const modal      = document.getElementById('confirmModal');
        const preloader  = this._showModalSaving(modal, 'Procesando...');
        const confirmBtn = document.getElementById('confirmActionBtn');
        if (confirmBtn) confirmBtn.disabled = true;

        try {
            const token = localStorage.getItem('token');
            let res;

            if (type === 'delete') {
                res = await fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } else if (type === 'complete') {
                res = await fetch(`${this.apiBaseUrl}/tasks/${taskId}/complete`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
            }

            if (!res) throw new Error('Sin respuesta');
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Error');

            const msg = type === 'delete' ? 'Tarea eliminada ✓' : 'Tarea completada ✓';
            this._showModalSuccess(preloader, msg);

            await this.loadTasks();

            setTimeout(() => {
                this._closeModal('confirmModal');
                this.pendingAction = null;
            }, 1300);

        } catch (err) {
            console.error('❌ _executePendingAction:', err);
            this._showModalError(preloader, err.message);
            this.pendingAction = null;
        } finally {
            this.isSaving = false;
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }

    // =========================================================================
    // PRELOADERS DE MODAL
    // =========================================================================

    _showModalSaving(modal, text = 'Guardando...') {
        if (!modal) return null;
        const content = modal.querySelector('.task-modal, .confirm-modal') || modal;
        const prev = content.querySelector('.modal-saving');
        if (prev) prev.remove();

        content.style.position = 'relative';
        const el = document.createElement('div');
        el.className = 'modal-saving';
        el.innerHTML = `
            <div class="modal-saving__ring"></div>
            <span class="modal-saving__text">${text}</span>`;
        content.appendChild(el);
        return el;
    }

    _showModalSuccess(preloader, text) {
        if (!preloader) return;
        preloader.innerHTML = `
            <div class="modal-saving__success">
                <i class="fas fa-check-circle"></i>
            </div>
            <span class="modal-saving__text" style="color:var(--success);font-weight:600;">${text}</span>`;
        setTimeout(() => { if (preloader.parentNode) preloader.remove(); }, 1500);
    }

    _showModalError(preloader, text) {
        if (!preloader) return;
        preloader.innerHTML = `
            <div class="modal-saving__error">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <span class="modal-saving__text" style="color:var(--danger);font-weight:600;">${text}</span>`;
        setTimeout(() => { if (preloader.parentNode) preloader.remove(); }, 2500);
    }

    // =========================================================================
    // ESTADOS VACÍOS / ERROR
    // =========================================================================

    _renderNoPermission() {
        const postit = document.getElementById('postitBoard');
        const tbody  = document.getElementById('assignTableBody');
        const noPermHtml = `
            <div class="tasks-no-permission">
                <i class="fas fa-lock"></i>
                <p>No tienes permisos para acceder a las tareas</p>
            </div>`;
        if (postit) postit.innerHTML = noPermHtml;
        if (tbody)  tbody.innerHTML  = `<tr><td colspan="7">${noPermHtml}</td></tr>`;
    }

    _renderError(message) {
        const postit = document.getElementById('postitBoard');
        const tbody  = document.getElementById('assignTableBody');
        const errHtml = `
            <div class="tasks-empty">
                <i class="fas fa-exclamation-triangle tasks-empty__icon" style="color:var(--danger);"></i>
                <p class="tasks-empty__title">Error al cargar</p>
                <p class="tasks-empty__subtitle">${this._esc(message)}</p>
                <button style="margin-top:0.75rem;padding:0.5rem 1.2rem;background:var(--primary);color:#fff;border:none;border-radius:var(--radius-md);cursor:pointer;font-weight:600;" onclick="window.taskManager?.loadTasks()">Reintentar</button>
            </div>`;
        if (postit) postit.innerHTML = errHtml;
        if (tbody)  tbody.innerHTML  = `<tr><td colspan="7">${errHtml}</td></tr>`;
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    _esc(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// =============================================================================
// EXPORTACIONES
// =============================================================================

export default TaskManager;

export function initTasksModule() {
    if (!window.taskManager) {
        window.taskManager = new TaskManager();
    }
    return window.taskManager;
}

if (typeof window !== 'undefined') {
    window.TaskManager = TaskManager;
}