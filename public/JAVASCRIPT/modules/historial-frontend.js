// =============================================================================
// MÓDULO DE HISTORIAL - Frontend
// =============================================================================

import { CONFIG } from '../config.js';

// =============================================================================
// ESTADO DE HISTORIAL
// =============================================================================
let historial = [];
let isDropdownOpen = false;

// =============================================================================
// INICIALIZACIÓN
// =============================================================================
export function initHistorial() {
    console.log('📜 Inicializando módulo de historial...');
    
    const historialBtn = document.getElementById('historialBtn');
    if (!historialBtn) {
        console.error('❌ No se encontró botón de historial');
        return;
    }

    // Event listener para abrir/cerrar dropdown
    historialBtn.addEventListener('click', toggleHistorialDropdown);

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('historialDropdown');
        if (dropdown && isDropdownOpen && !historialBtn.contains(e.target) && !dropdown.contains(e.target)) {
            closeHistorialDropdown();
        }
    });

    console.log('✅ Módulo de historial inicializado');
}

// =============================================================================
// FUNCIONES DE API
// =============================================================================

async function fetchHistorial() {
    try {
        console.log('🔄 Fetching historial desde:', `${CONFIG.API_BASE_URL}/historial`);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/historial?limite=50`);
        
        if (!response.ok) {
            console.error('❌ Response not ok:', response.status, response.statusText);
            throw new Error('Error al obtener historial');
        }

        const data = await response.json();
        console.log('📦 Historial recibido:', data);
        
        if (data.success && data.data) {
            historial = data.data.entradas || [];
            console.log(`✅ ${historial.length} entradas de historial cargadas`);
            renderHistorialList();
        }
    } catch (error) {
        console.error('❌ Error fetching historial:', error);
    }
}

function toggleHistorialDropdown() {
    if (isDropdownOpen) {
        closeHistorialDropdown();
    } else {
        openHistorialDropdown();
    }
}

function openHistorialDropdown() {
    let dropdown = document.getElementById('historialDropdown');
    
    if (!dropdown) {
        dropdown = createDropdownElement();
        document.body.appendChild(dropdown);
    }

    positionDropdown(dropdown);
    fetchHistorial();
    dropdown.classList.add('show');
    isDropdownOpen = true;
}

function closeHistorialDropdown() {
    const dropdown = document.getElementById('historialDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }
    isDropdownOpen = false;
}

function createDropdownElement() {
    const dropdown = document.createElement('div');
    dropdown.id = 'historialDropdown';
    dropdown.className = 'historial-dropdown';
    
    dropdown.innerHTML = `
        <div class="historial-header">
            <h3 class="historial-title">📜 Historial de Acciones</h3>
            <select id="historialModuloFilter" class="historial-filter-select">
                <option value="">Todos los módulos</option>
                <option value="documentos">Documentos</option>
                <option value="personas">Personas</option>
                <option value="categorias">Categorías</option>
                <option value="reportes">Reportes</option>
                <option value="tareas">Tareas</option>
                <option value="papelera">Papelera</option>
                <option value="busqueda">Búsqueda</option>
                <option value="sistema">Sistema</option>
            </select>
        </div>
        <div class="historial-list" id="historialList">
            <!-- Historial dinámico -->
        </div>
    `;

    dropdown.querySelector('#historialModuloFilter').addEventListener('change', async (e) => {
        const modulo = e.target.value;
        try {
            const url = modulo ? 
                `${CONFIG.API_BASE_URL}/historial?modulo=${modulo}&limite=50` : 
                `${CONFIG.API_BASE_URL}/historial?limite=50`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && data.data) {
                historial = data.data.entradas || [];
                renderHistorialList();
            }
        } catch (error) {
            console.error('❌ Error fetching historial filtrado:', error);
        }
    });

    return dropdown;
}

function positionDropdown(dropdown) {
    const btn = document.getElementById('historialBtn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 8}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
}

function renderHistorialList() {
    const lista = document.getElementById('historialList');
    if (!lista) return;

    if (historial.length === 0) {
        lista.innerHTML = `
            <div class="historial-empty">
                <i class="fas fa-history"></i>
                <p>No hay historial</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = historial.map(entrada => {
        const fecha = new Date(entrada.fecha);
        const fechaFormato = fecha.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const icono = getIconoAccion(entrada.accion);
        const colorModulo = getColorModulo(entrada.modulo);
        
        return `
            <div class="historial-item">
                <div class="historial-icon" style="background: ${colorModulo}20; color: ${colorModulo}">
                    <i class="fas fa-${icono}"></i>
                </div>
                <div class="historial-content">
                    <div class="historial-item-header">
                        <span class="historial-modulo" style="background: ${colorModulo}20; color: ${colorModulo}">
                            ${entrada.modulo}
                        </span>
                        <span class="historial-time">${fechaFormato}</span>
                    </div>
                    <p class="historial-description">${entrada.descripcion}</p>
                    <span class="historial-usuario">
                        <i class="fas fa-user"></i> ${entrada.usuario}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function getIconoAccion(accion) {
    const iconos = {
        'documento_subido': 'file-upload',
        'documento_eliminado': 'trash',
        'documento_restaurado': 'undo',
        'documento_eliminado_definitivo': 'trash-alt',
        'documento_descargado': 'download',
        'documento_previsualizacion': 'eye',
        'persona_agregada': 'user-plus',
        'persona_editada': 'user-edit',
        'persona_eliminada': 'user-minus',
        'categoria_agregada': 'tag',
        'categoria_editada': 'edit',
        'categoria_eliminada': 'times',
        'reporte_excel_generado': 'file-excel',
        'reporte_pdf_generado': 'file-pdf',
        'reporte_csv_generado': 'file-csv',
        'tarea_creada': 'plus-circle',
        'tarea_editada': 'edit',
        'tarea_completada': 'check-circle',
        'tarea_eliminada': 'times-circle',
        'sistema_iniciado': 'power-off',
        'papelera_vaciada': 'dumpster',
        'busqueda_realizada': 'search',
        'filtro_aplicado': 'filter'
    };
    
    return iconos[accion] || 'circle';
}

function getColorModulo(modulo) {
    const colores = {
        'documentos': '#3b82f6',
        'personas': '#8b5cf6',
        'categorias': '#f59e0b',
        'reportes': '#10b981',
        'tareas': '#ec4899',
        'papelera': '#ef4444',
        'busqueda': '#06b6d4',
        'sistema': '#6b7280'
    };
    
    return colores[modulo] || '#6b7280';
}

export {
    fetchHistorial,
    openHistorialDropdown,
    closeHistorialDropdown
};
