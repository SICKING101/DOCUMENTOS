// =============================================================================
// 1. IMPORTACIONES Y CONFIGURACIÓN
// =============================================================================

/**
 * 1.1 Importar configuraciones y utilidades
 * Carga la configuración de la API y funciones de utilidad para mostrar alertas.
 */
import { CONFIG } from '../config.js';
import { showAlert } from '../utils.js';

// =============================================================================
// 2. ESTADO GLOBAL DEL MÓDULO
// =============================================================================

/**
 * 2.1 Estado de las notificaciones
 * Almacena las notificaciones recibidas, contador de no leídas y estado del dropdown.
 */
let notificaciones = [];
let notificacionesNoLeidas = 0;
let isDropdownOpen = false;

// =============================================================================
// 3. INICIALIZACIÓN DEL MÓDULO
// =============================================================================

/**
 * 3.1 Inicializar sistema de notificaciones
 * Configura event listeners y carga notificaciones iniciales.
 * Se ejecuta al cargar la aplicación para activar el sistema de notificaciones.
 */
export function initNotificaciones() {
    console.log('🔔 Inicializando módulo de notificaciones...');
    
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (!notificationsBtn) {
        console.error('❌ No se encontró botón de notificaciones');
        return;
    }

    // Event listener para abrir/cerrar dropdown
    notificationsBtn.addEventListener('click', toggleNotificationsDropdown);

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationsDropdown');
        if (dropdown && isDropdownOpen && !notificationsBtn.contains(e.target) && !dropdown.contains(e.target)) {
            closeNotificationsDropdown();
        }
    });

    // Cargar notificaciones iniciales
    fetchNotificaciones();

    // Actualizar cada 5 segundos (para testing)
    setInterval(fetchNotificaciones, 5000);

    console.log('✅ Módulo de notificaciones inicializado');
}

// =============================================================================
// 4. FUNCIONES DE API Y COMUNICACIÓN CON BACKEND
// =============================================================================

/**
 * 4.1 Obtener notificaciones desde el servidor
 * Realiza petición GET a la API para obtener las notificaciones más recientes
 * y actualiza el estado local del módulo.
 */
async function fetchNotificaciones() {
    try {
        console.log('🔄 Fetching notificaciones desde:', `${CONFIG.API_BASE_URL}/notifications`);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications?limite=20`);
        
        if (!response.ok) {
            console.error('❌ Response not ok:', response.status, response.statusText);
            throw new Error('Error al obtener notificaciones');
        }

        const data = await response.json();
        console.log('📦 Notificaciones recibidas:', data);
        
        if (data.success && data.data) {
            notificaciones = data.data.notificaciones || [];
            notificacionesNoLeidas = data.data.noLeidas || 0;
            
            console.log(`✅ ${notificaciones.length} notificaciones cargadas, ${notificacionesNoLeidas} no leídas`);
            
            updateBadge();
            
            // Si el dropdown está abierto, actualizar la lista
            if (isDropdownOpen) {
                renderNotificacionesList();
            }
        }
    } catch (error) {
        console.error('❌ Error fetching notificaciones:', error);
    }
}

/**
 * 4.2 Marcar notificación individual como leída
 * Envía petición PATCH para marcar una notificación específica como leída
 * y actualiza el estado local.
 */
async function marcarComoLeida(notificacionId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/${notificacionId}/read`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            throw new Error('Error al marcar como leída');
        }

        const data = await response.json();
        
        if (data.success) {
            // Actualizar notificación local
            const notificacion = notificaciones.find(n => n._id === notificacionId);
            if (notificacion && !notificacion.leida) {
                notificacion.leida = true;
                notificacionesNoLeidas = Math.max(0, notificacionesNoLeidas - 1);
                updateBadge();
                renderNotificacionesList();
            }
        }
    } catch (error) {
        console.error('❌ Error marcando como leída:', error);
        showAlert('Error al marcar notificación', 'error');
    }
}

/**
 * 4.3 Marcar todas las notificaciones como leídas
 * Envía petición PATCH para marcar todas las notificaciones como leídas de una vez.
 */
async function marcarTodasLeidas() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/notifications/read-all`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            throw new Error('Error al marcar todas como leídas');
        }

        const data = await response.json();
        
        if (data.success) {
            // Actualizar todas las notificaciones locales
            notificaciones.forEach(n => n.leida = true);
            notificacionesNoLeidas = 0;
            updateBadge();
            renderNotificacionesList();
            showAlert('Todas las notificaciones marcadas como leídas', 'success');
        }
    } catch (error) {
        console.error('❌ Error marcando todas como leídas:', error);
        showAlert('Error al marcar todas las notificaciones', 'error');
    }
}

// =============================================================================
// 5. FUNCIONES DE INTERFAZ DE USUARIO
// =============================================================================

/**
 * 5.1 Actualizar badge de contador de notificaciones
 * Muestra/oculta el contador de notificaciones no leídas en el botón del navbar.
 */
function updateBadge() {
    const badge = document.querySelector('#notificationsBtn .topbar__badge');
    if (!badge) {
        console.warn('⚠️ No se encontró badge element');
        return;
    }

    console.log('🔄 Actualizando badge:', notificacionesNoLeidas);
    
    if (notificacionesNoLeidas > 0) {
        badge.textContent = notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

/**
 * 5.2 Alternar visibilidad del dropdown de notificaciones
 * Controla la apertura y cierre del menú desplegable de notificaciones.
 */
function toggleNotificationsDropdown() {
    if (isDropdownOpen) {
        closeNotificationsDropdown();
    } else {
        openNotificationsDropdown();
    }
}

/**
 * 5.3 Abrir dropdown de notificaciones
 * Crea y muestra el contenedor de notificaciones con posicionamiento dinámico.
 */
function openNotificationsDropdown() {
    let dropdown = document.getElementById('notificationsDropdown');
    
    // Si no existe, crear el dropdown
    if (!dropdown) {
        dropdown = createDropdownElement();
        document.body.appendChild(dropdown);
    }

    // Posicionar dropdown
    positionDropdown(dropdown);

    // Renderizar notificaciones
    renderNotificacionesList();

    // Mostrar dropdown
    dropdown.classList.add('notifications-dropdown--active');
    isDropdownOpen = true;
}

/**
 * 5.4 Cerrar dropdown de notificaciones
 * Oculta el menú desplegable de notificaciones.
 */
function closeNotificationsDropdown() {
    const dropdown = document.getElementById('notificationsDropdown');
    if (dropdown) {
        dropdown.classList.remove('notifications-dropdown--active');
    }
    isDropdownOpen = false;
}

/**
 * 5.5 Crear elemento HTML del dropdown
 * Genera la estructura DOM del contenedor de notificaciones con botón de "marcar todas leídas".
 */
function createDropdownElement() {
    const dropdown = document.createElement('div');
    dropdown.id = 'notificationsDropdown';
    dropdown.className = 'notifications-dropdown';
    
    dropdown.innerHTML = `
        <div class="notifications-header">
            <h3 class="notifications-title">Notificaciones</h3>
            <button class="btn btn--text btn--small" id="markAllReadBtn">
                Marcar todas leídas
            </button>
        </div>
        <div class="notifications-list" id="notificationsList">
            <!-- Notificaciones dinámicas -->
        </div>
    `;

    // Event listener para marcar todas como leídas
    dropdown.querySelector('#markAllReadBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        marcarTodasLeidas();
    });

    return dropdown;
}

/**
 * 5.6 Posicionar dropdown relativo al botón
 * Calcula la posición óptima para mostrar el dropdown debajo del botón de notificaciones.
 */
function positionDropdown(dropdown) {
    const btn = document.getElementById('notificationsBtn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    
    // Posicionar debajo del botón, alineado a la derecha
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 8}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;
}

/**
 * 5.7 Renderizar lista de notificaciones en el dropdown
 * Genera la lista HTML de notificaciones con estados visuales diferenciados (leída/no leída).
 */
function renderNotificacionesList() {
    const lista = document.getElementById('notificationsList');
    if (!lista) return;

    if (notificaciones.length === 0) {
        lista.innerHTML = `
            <div class="notifications-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = notificaciones.map(notif => {
        const fecha = new Date(notif.fecha_creacion || notif.createdAt);
        const fechaRelativa = getRelativeTime(fecha);
        
        return `
            <div class="notification-item ${notif.leida ? 'notification-item--read' : ''}" 
                 data-id="${notif._id}"
                 onclick="window.handleNotificationClick('${notif._id}')">
                <div class="notification-icon notification-icon--${notif.prioridad}">
                    <i class="fas fa-${notif.icono}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4 class="notification-title">${notif.titulo}</h4>
                        <span class="notification-time">${fechaRelativa}</span>
                    </div>
                    <p class="notification-message">${notif.mensaje}</p>
                    ${notif.metadata && notif.metadata.detalles ? `
                        <p class="notification-details">${notif.metadata.detalles}</p>
                    ` : ''}
                </div>
                ${!notif.leida ? '<div class="notification-unread-dot"></div>' : ''}
            </div>
        `;
    }).join('');
}

// =============================================================================
// 6. MANEJO DE INTERACCIÓN CON NOTIFICACIONES
// =============================================================================

/**
 * 6.1 Manejar click en notificación (función global)
 * Marca como leída y navega según el tipo de notificación.
 * Se expone globalmente para ser accesible desde los elementos HTML generados.
 */
window.handleNotificationClick = function(notificacionId) {
    const notificacion = notificaciones.find(n => n._id === notificacionId);
    if (!notificacion) return;

    // Marcar como leída si no lo está
    if (!notificacion.leida) {
        marcarComoLeida(notificacionId);
    }

    // Cerrar dropdown
    closeNotificationsDropdown();

    // Navegar según el tipo de notificación
    navigateFromNotification(notificacion);
};

/**
 * 6.2 Navegar según tipo de notificación
 * Redirige al usuario a la sección correspondiente de la aplicación
 * basándose en el tipo de notificación recibida.
 */
function navigateFromNotification(notificacion) {
    switch(notificacion.tipo) {
        case 'documento_subido':
        case 'documento_eliminado':
        case 'documento_por_vencer':
            if (window.switchTab) {
                window.switchTab('documentos');
            }
            break;
        
        case 'persona_agregada':
        case 'persona_eliminada':
            if (window.switchTab) {
                window.switchTab('personas');
            }
            break;
        
        case 'categoria_agregada':
            if (window.switchTab) {
                window.switchTab('categorias');
            }
            break;
        
        case 'reporte_excel':
        case 'reporte_pdf':
        case 'reporte_csv':
            // No navegar, ya se descargó el reporte
            showAlert('Reporte generado exitosamente', 'success');
            break;
        
        default:
            // Dashboard por defecto
            if (window.switchTab) {
                window.switchTab('dashboard');
            }
    }
}

// =============================================================================
// 7. FUNCIONES AUXILIARES
// =============================================================================

/**
 * 7.1 Obtener tiempo relativo formateado
 * Convierte fechas a formato humano (ej: "hace 5 minutos", "hace 2 días").
 */
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Justo ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    
    // Formato de fecha para notificaciones antiguas
    return date.toLocaleDateString('es-MX', { 
        day: 'numeric', 
        month: 'short' 
    });
}

// =============================================================================
// 8. EXPORTACIÓN DE FUNCIONES PÚBLICAS
// =============================================================================

/**
 * 8.1 Exportar funciones principales del módulo
 * Hace disponibles las funciones clave para uso externo en la aplicación.
 */
export {
    fetchNotificaciones,
    marcarComoLeida,
    marcarTodasLeidas,
    updateBadge,
    openNotificationsDropdown,
    closeNotificationsDropdown
};