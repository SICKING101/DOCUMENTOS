// modules/tasks.js
import { DOM } from '../dom.js'; 
import { showAlert } from '../utils.js'; 

// =============================================================================
// 1. CONFIGURACIÓN Y DATOS (SIMULACIÓN DB)
// =============================================================================

// Aquí se guardarán tus tareas de mientras (en memoria del navegador)
let taskList = []; 

// Configuración visual de las etiquetas
const TAG_CONFIG = {
    'urgent':   { colorClass: 'taskbar__item--urgent',   icon: 'fa-exclamation-triangle', label: 'Urgente' },
    'work':     { colorClass: 'taskbar__item--work',     icon: 'fa-briefcase',            label: 'Trabajo' },
    'admin': { colorClass: 'taskbar__item--adminis', icon: 'fa-school',                 label: 'Admin.' },
    'study':    { colorClass: 'taskbar__item--study',    icon: 'fa-book',                 label: 'Estudio' },
    'default':  { colorClass: 'taskbar__item--default',  icon: 'fa-sticky-note',          label: 'General' }
};

let selectedTags = new Set(); // Para el modal de creación

// =============================================================================
// 2. MODAL DE CREACIÓN / EDICIÓN
// =============================================================================

function openAddTaskModal(task = {}) {
    console.log('📝 Abriendo editor');
    DOM.taskForm?.reset();
    selectedTags.clear();
    
    // Configuración base (Crear)
    if (DOM.taskModalTitle) DOM.taskModalTitle.textContent = 'Agregar Tarea';
    if (DOM.saveTaskBtn) DOM.saveTaskBtn.textContent = 'Guardar';
    if (DOM.taskId) DOM.taskId.value = '';

    // Si viene una tarea, es modo EDICIÓN
    if (Object.keys(task).length > 0) {
        DOM.taskModalTitle.textContent = 'Editar Tarea';
        DOM.saveTaskBtn.textContent = 'Actualizar';
        
        DOM.taskId.value = task.id;
        DOM.taskTitle.value = task.title;
        DOM.taskDescription.value = task.description;
        DOM.taskDueDate.value = task.dueDate;
        DOM.taskTime.value = task.dueTime;

        if (task.tags) task.tags.forEach(t => selectedTags.add(t));
    }

    renderTagsInForm(); // Dibujar los chips de selección
    DOM.addTaskModal?.showModal();
}

function closeAddTaskModal() {
    DOM.addTaskModal?.close();
}

// =============================================================================
// 3. GUARDAR (SIMULACIÓN BACKEND)
// =============================================================================

async function handleSaveTask(e) {
    if (e) e.preventDefault();

    if (!DOM.taskTitle?.value || !DOM.taskDueDate?.value) {
        showAlert('Faltan datos obligatorios', 'warning');
        return;
    }

    const isEdit = DOM.taskId.value !== '';
    
    const taskData = {
        id: isEdit ? DOM.taskId.value : Date.now().toString(), // ID único basado en tiempo
        title: DOM.taskTitle.value,
        description: DOM.taskDescription?.value || '',
        dueDate: DOM.taskDueDate.value,
        dueTime: DOM.taskTime?.value || '00:00',
        tags: Array.from(selectedTags), // Guardamos los tags seleccionados
        status: 'pending'
    };

    if (isEdit) {
        // Actualizar: buscamos en el array y reemplazamos
        const index = taskList.findIndex(t => t.id === taskData.id);
        if (index !== -1) taskList[index] = taskData;
        showAlert('Tarea actualizada', 'success');
    } else {
        // Crear: empujamos al array
        taskList.push(taskData);
        showAlert('Tarea creada', 'success');
    }

    renderSidebar(); // <--- AQUÍ SE INSERTA EN LA BARRA
    closeAddTaskModal();
}

// =============================================================================
// 4. RENDERIZADO DE LA BARRA LATERAL (LO QUE PEDISTE)
// =============================================================================

function renderSidebar() {
    // 1. Verificación de seguridad
    if (!DOM.taskListContainer) {
        console.error("❌ Error crítico: No encuentro el elemento #task__list en el HTML");
        return;
    }

    // 2. Limpiar la lista actual (para no duplicar al guardar)
    DOM.taskListContainer.innerHTML = '';

    // 3. Crear un botón por cada tarea en el array
    taskList.forEach(task => {
        const btn = document.createElement('button');
        
        // Determinar configuración visual (Icono y Color)
        // Si no tiene etiqueta, usa 'default'
        const mainTag = task.tags[0] || 'default'; 
        const config = TAG_CONFIG[mainTag] || TAG_CONFIG['default'];

        // CLASES CSS:
        // 'taskbar__button' -> Para que tenga la forma y tamaño base
        // 'taskbar__item--[tipo]' -> Para el color específico
        btn.className = `taskbar__button ${config.colorClass}`;
        
        // Tooltip (Nombre al pasar el mouse)
        btn.setAttribute('data-tooltip', task.title);
        
        // Insertar el icono
        btn.innerHTML = `<i class="fas ${config.icon}"></i>`;
        
        // EVENTO CLICK: Abrir el modal de vista
        btn.addEventListener('click', (e) => {
            // Evita que el click se propague si fuera necesario
            e.stopPropagation(); 
            openViewTaskModal(task.id);
        });

        // 4. Insertar el botón en la sección
        DOM.taskListContainer.appendChild(btn);
    });
}

// =============================================================================
// 5. MODAL DE "VISTA" (LECTURA)
// =============================================================================

function openViewTaskModal(taskId) {
    // Buscar la tarea en nuestro array
    const task = taskList.find(t => t.id === taskId);
    if (!task) return;

    // Rellenar los campos del modal de vista
    DOM.viewTaskId.value = task.id;
    DOM.viewTaskTitle.textContent = task.title;
    DOM.viewTaskDate.textContent = task.dueDate;
    DOM.viewTaskTime.textContent = task.dueTime;
    DOM.viewTaskDescription.textContent = task.description || 'Sin descripción detallada.';

    // Renderizar el icono grande en el modal
    const mainTag = task.tags[0] || 'default';
    const style = TAG_CONFIG[mainTag] || TAG_CONFIG['default'];
    DOM.viewTaskTagIcon.className = `view-task__icon ${style.colorClass}`;
    DOM.viewTaskTagIcon.innerHTML = `<i class="fas ${style.icon}"></i> ${style.label}`;

    // CONFIGURAR BOTONES DE ACCIÓN

    // Borrar
    DOM.deleteTaskBtn.onclick = () => {
        if(confirm('¿Eliminar esta tarea?')) {
            taskList = taskList.filter(t => t.id !== taskId); // Borrar del array
            renderSidebar(); // Actualizar barra
            DOM.viewTaskModal.close();
            showAlert('Tarea eliminada', 'info');
        }
    };

    // Editar
    DOM.editTaskActionBtn.onclick = () => {
        DOM.viewTaskModal.close(); // Cerramos vista
        openAddTaskModal(task);    // Abrimos el editor con los datos cargados
    };

    // Completar
    DOM.completeTaskBtn.onclick = () => {
        showAlert('¡Tarea completada! 🎉', 'success');
        taskList = taskList.filter(t => t.id !== taskId); // La sacamos de la lista
        renderSidebar();
        DOM.viewTaskModal.close();
    };

    DOM.viewTaskModal.showModal();
}

// =============================================================================
// AUXILIAR: CHIPS EN EL FORMULARIO
// =============================================================================
function renderTagsInForm() {
    if (!DOM.taskTagsContainer) return;
    DOM.taskTagsContainer.innerHTML = '';

    Object.entries(TAG_CONFIG).forEach(([key, config]) => {
        if (key === 'default') return; // No mostrar "default" en el selector

        const chip = document.createElement('div');
        // Usamos una clase diferente para los chips del form, reciclando colores
        chip.className = `tag-selector__chip ${config.colorClass.replace('taskbar__item', 'tag-selector__chip')}`;
        chip.textContent = config.label;
        
        if (selectedTags.has(key)) chip.classList.add('tag-selector__chip--active');

        chip.addEventListener('click', () => {
            if (selectedTags.has(key)) selectedTags.delete(key);
            else selectedTags.add(key);
            renderTagsInForm(); 
        });
        DOM.taskTagsContainer.appendChild(chip);
    });
}

// Exportar
export { openAddTaskModal, closeAddTaskModal, handleSaveTask };