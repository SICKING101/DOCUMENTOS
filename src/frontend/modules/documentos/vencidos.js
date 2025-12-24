// src/frontend/modules/documentos/vencidos.js

import { renderDocumentsTable } from './table/tableRenderer.js';

/**
 * Renderiza la lista de documentos vencidos en la sección correspondiente.
 * @param {Array} documentos - Lista de documentos (window.appState.documents)
 */
export function renderVencidosList(documentos) {
  const vencidosList = document.getElementById('vencidosList');
  if (!vencidosList) return;

  // Filtrar documentos vencidos
  const vencidos = (documentos || []).filter(doc => {
    if (!doc.fecha_vencimiento) return false;
    const fechaVencimiento = new Date(doc.fecha_vencimiento);
    const hoy = new Date();
    return fechaVencimiento < hoy;
  });

  if (vencidos.length === 0) {
    vencidosList.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i> No hay documentos vencidos.</div>`;
    return;
  }

  vencidosList.innerHTML = vencidos.map(doc => {
    return `
      <div class="vencido-card">
        <div class="vencido-info">
          <div style="display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.2rem;">
            <span class="vencido-icon"><i class='fas fa-exclamation-triangle'></i></span>
            <span class="vencido-nombre">${doc.nombre_original || 'Sin nombre'}</span>
          </div>
          <div class="vencido-meta" style="color: var(--text-secondary); font-size: 0.93rem;">
            ${doc.categoria || 'Sin categoría'} • ${doc.fecha_vencimiento ? new Date(doc.fecha_vencimiento).toLocaleDateString() : ''} • ${doc.tamano ? (doc.tamano/1024).toFixed(1) + ' KB' : ''} • ${doc.tipo || ''} • ${doc.estado ? doc.estado : ''}
          </div>
        </div>
        <div class="vencido-actions">
          <button class="btn btn--success" onclick="window.renovarDocumento && window.renovarDocumento('${doc._id || doc.id}')"><i class='fas fa-redo'></i> Renovar</button>
          <button class="btn btn--danger" onclick="window.eliminarDocumento && window.eliminarDocumento('${doc._id || doc.id}')"><i class='fas fa-trash'></i> Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// Funciones globales para acciones

window.renovarDocumento = function(id) {
  // Buscar el documento y abrir el modal de edición
  const doc = (window.appState.documents || []).find(d => d._id === id || d.id === id);
  if (doc && window.editDocument) {
    window.editDocument(id);
  } else {
    alert('No se encontró el documento para renovar: ' + id);
  }
};

window.eliminarDocumento = function(id) {
  // Buscar el documento y ejecutar la función de eliminar
  const doc = (window.appState.documents || []).find(d => d._id === id || d.id === id);
  if (doc && window.deleteDocument) {
    window.deleteDocument(id);
  } else {
    alert('No se encontró el documento para eliminar: ' + id);
  }
};

// Botón Ver todos para mostrar todos los vencidos
window.addEventListener('DOMContentLoaded', function() {
  const verTodosBtn = document.getElementById('verTodosVencidosBtn');
  if (verTodosBtn) {
    verTodosBtn.addEventListener('click', function() {
      window.showVencidosSection();
    });
  }
  const vencidosDropdown = document.getElementById('vencidosDropdown');
  if (vencidosDropdown) {
    vencidosDropdown.addEventListener('change', function() {
      // Puedes agregar lógica para cambiar el filtro de vencidos aquí
      window.showVencidosSection();
    });
  }
});

// Mostrar la sección de vencidos (puedes mejorar la lógica de visibilidad)
window.showVencidosSection = function() {
  document.querySelectorAll('.tab-content').forEach(sec => sec.style.display = 'none');
  document.getElementById('documentos-vencidos').style.display = 'block';
  renderVencidosList(window.appState.documents || []);
};
