// modules/tasks.js

import { DOM } from '../dom.js'; // Importamos el objeto DOM
import { showAlert } from '../utils.js'; // Asumiendo que esta utilidad existe

/**
 * Función para abrir el modal de Agregar/Editar Tarea.
 * @param {Object} task - Datos de la tarea para edición (opcional).
 */
function openAddTaskModal(task = {}) {
    console.log('📝 Abriendo modal de Tarea');
    
    // 1. Limpiar/Resetear el formulario (asumiendo DOM.taskForm está definido)
    DOM.taskForm?.reset();

    // 2. Configurar el modal para "Agregar"
    DOM.taskModalTitle.textContent = 'Agregar Tarea/Recordatorio';
    DOM.saveTaskBtn.textContent = 'Guardar Tarea';
    DOM.taskId.value = '';

    // Si pasamos una tarea, la llenamos (modo edición)
    if (Object.keys(task).length > 0) {
        DOM.taskModalTitle.textContent = 'Editar Tarea';
        DOM.taskId.value = task.id || '';
        DOM.taskTitle.value = task.title || '';
        DOM.taskDescription.value = task.description || '';
        // Asegúrate de que taskDueDate tenga el valor en formato YYYY-MM-DD
        DOM.taskDueDate.value = task.dueDate || ''; 
        DOM.saveTaskBtn.textContent = 'Actualizar Tarea';
    }

    // 3. Mostrar el modal
    DOM.addTaskModal?.showModal();
}

/**
 * Función para cerrar el modal de Agregar/Editar Tarea.
 */
function closeAddTaskModal() {
    console.log('❌ Cerrando modal de Tarea');
    DOM.addTaskModal?.close();
    // Limpiar el formulario
    DOM.taskForm?.reset();
}

/**
 * Función para manejar el guardado/actualización de tareas.
 */
async function handleSaveTask() {
    // 1. Validar inputs
    if (!DOM.taskTitle.value || !DOM.taskDueDate.value) {
        showAlert('El Título y la Fecha Límite son requeridos.', 'warning');
        return;
    }

    // 2. Recolectar datos
    const taskData = {
        id: DOM.taskId.value, // ID para identificar si es edición
        title: DOM.taskTitle.value,
        description: DOM.taskDescription.value,
        dueDate: DOM.taskDueDate.value,
    };

    try {
        console.log('💾 Intentando guardar/actualizar tarea:', taskData);
        // **AQUÍ IRÍA LA LÓGICA DE FETCH/API PARA EL BACKEND**
        // const endpoint = taskData.id ? `/tasks/${taskData.id}` : '/tasks';
        // const method = taskData.id ? 'PUT' : 'POST';
        // const response = await fetch(CONFIG.API_BASE_URL + endpoint, { method, ... });

        showAlert(`Tarea "${taskData.title}" guardada/actualizada correctamente.`, 'success');
        
        // 3. Cerrar modal y posiblemente refrescar lista
        closeAddTaskModal();
        // loadTasks(); // Si tienes una función para recargar la lista de tareas
        
    } catch (error) {
        console.error('❌ Error al guardar la tarea:', error);
        showAlert('Error al guardar la tarea.', 'error');
    }
}

// Exportar las funciones
export {
    openAddTaskModal,
    closeAddTaskModal,
    handleSaveTask,
    // Puedes añadir loadTasks, editTask, deleteTask aquí
};