/**
 * Módulo de Responsive - Maneja el comportamiento mobile/tablet
 * Controla sidebar, overlay, y menú hamburguesa
 */

class ResponsiveManager {
    constructor() {
        this.sidebar = document.querySelector('.sidebar');
        this.toggleBtn = document.querySelector('.topbar__menu-toggle');
        this.overlay = null;
        this.isOpen = false;
        this.breakpoint = 768;
        
        this.init();
    }
    
    init() {
        if (!this.sidebar || !this.toggleBtn) {
            console.warn('ResponsiveManager: Elementos no encontrados');
            return;
        }
        
        this.createOverlay();
        this.bindEvents();
        this.handleResize();
    }
    
    /**
     * Crear overlay para el sidebar
     */
    createOverlay() {
        // Verificar si ya existe
        this.overlay = document.querySelector('.sidebar-overlay');
        
        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'sidebar-overlay';
            this.overlay.setAttribute('aria-hidden', 'true');
            this.overlay.setAttribute('aria-label', 'Cerrar menú de navegación');
            
            // Insertar después del sidebar
            this.sidebar.parentNode.insertBefore(this.overlay, this.sidebar.nextSibling);
        }
    }
    
    /**
     * Vincular eventos
     */
    bindEvents() {
        // Toggle del sidebar
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSidebar();
        });
        
        // Cerrar con overlay
        this.overlay.addEventListener('click', () => {
            this.closeSidebar();
        });
        
        // Cerrar con tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeSidebar();
            }
        });
        
        // Cerrar sidebar al hacer clic en un enlace (mobile)
        if (window.innerWidth <= this.breakpoint) {
            this.sidebar.querySelectorAll('.sidebar__nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    this.closeSidebar();
                });
            });
        }
        
        // Manejar resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.handleResize(), 250);
        });
        
        // Cerrar menú de usuario si está abierto al abrir sidebar
        this.toggleBtn.addEventListener('click', () => {
            const userMenu = document.getElementById('userMenu');
            if (userMenu && userMenu.classList.contains('active')) {
                userMenu.classList.remove('active');
            }
        });
    }
    
    /**
     * Toggle del sidebar
     */
    toggleSidebar() {
        if (this.isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }
    
    /**
     * Abrir sidebar
     */
    openSidebar() {
        this.sidebar.classList.add('active');
        this.overlay.classList.add('active');
        this.overlay.setAttribute('aria-hidden', 'false');
        this.isOpen = true;
        
        // Prevenir scroll del body
        document.body.classList.add('sidebar-open');
        
        // Actualizar ARIA
        this.toggleBtn.setAttribute('aria-expanded', 'true');
        this.toggleBtn.setAttribute('aria-label', 'Cerrar menú');
        
        // Animar icono hamburguesa (opcional)
        this.animateToggleIcon(true);
        
        // Disparar evento personalizado
        this.dispatchEvent('sidebarOpened');
    }
    
    /**
     * Cerrar sidebar
     */
    closeSidebar() {
        this.sidebar.classList.remove('active');
        this.overlay.classList.remove('active');
        this.overlay.setAttribute('aria-hidden', 'true');
        this.isOpen = false;
        
        // Restaurar scroll del body
        document.body.classList.remove('sidebar-open');
        
        // Actualizar ARIA
        this.toggleBtn.setAttribute('aria-expanded', 'false');
        this.toggleBtn.setAttribute('aria-label', 'Abrir menú');
        
        // Animar icono hamburguesa
        this.animateToggleIcon(false);
        
        // Disparar evento personalizado
        this.dispatchEvent('sidebarClosed');
    }
    
    /**
     * Manejar cambio de tamaño de ventana
     */
    handleResize() {
        const isMobile = window.innerWidth <= this.breakpoint;
        
        if (!isMobile && this.isOpen) {
            // Si pasamos a desktop, cerrar el sidebar
            this.closeSidebar();
        }
        
        // Mostrar/ocultar toggle según breakpoint
        if (this.toggleBtn) {
            this.toggleBtn.style.display = isMobile ? 'flex' : 'none';
        }
        
        // Actualizar ARIA del sidebar
        this.sidebar.setAttribute('aria-hidden', isMobile && !this.isOpen ? 'true' : 'false');
    }
    
    /**
     * Animar icono del toggle (hamburguesa ↔ X)
     */
    animateToggleIcon(isOpen) {
        const icon = this.toggleBtn.querySelector('i');
        if (!icon) return;
        
        if (isOpen) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
    
    /**
     * Disparar evento personalizado
     */
    dispatchEvent(eventName) {
        const event = new CustomEvent(eventName, {
            detail: { isOpen: this.isOpen },
            bubbles: true
        });
        document.dispatchEvent(event);
    }
    
    /**
     * Verificar si es mobile
     */
    isMobile() {
        return window.innerWidth <= this.breakpoint;
    }
}

// Exportar para uso global
window.ResponsiveManager = ResponsiveManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.responsiveManager = new ResponsiveManager();
});

export default ResponsiveManager;