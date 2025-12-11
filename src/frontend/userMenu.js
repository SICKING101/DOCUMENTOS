// Gestión del menú de usuario y cambio de administrador

// Elementos del DOM
let userMenuTrigger;
let userMenu;
let changeAdminModal;
let changeAdminForm;
let logoutBtn;
let changeAdminBtn;

// Inicializar el menú de usuario
export function inicializarMenuUsuario() {
    console.log('🔧 Inicializando menú de usuario...');
    
    // Obtener elementos del DOM
    userMenuTrigger = document.getElementById('userMenuTrigger');
    userMenu = document.querySelector('.user-menu');
    changeAdminModal = document.getElementById('changeAdminModal');
    changeAdminForm = document.getElementById('changeAdminForm');
    logoutBtn = document.getElementById('logoutBtn');
    changeAdminBtn = document.getElementById('changeAdminBtn');

    console.log('Elementos encontrados:', {
        userMenuTrigger: !!userMenuTrigger,
        userMenu: !!userMenu,
        logoutBtn: !!logoutBtn,
        changeAdminBtn: !!changeAdminBtn
    });

    // Verificar que los elementos existen
    if (!userMenuTrigger || !userMenu) {
        console.warn('❌ Elementos del menú de usuario no encontrados');
        return;
    }

    // Event listeners
    userMenuTrigger.addEventListener('click', (e) => {
        console.log('👆 Click en menú de usuario');
        toggleUserMenu(e);
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (changeAdminBtn) {
        changeAdminBtn.addEventListener('click', openChangeAdminModal);
    }

    // Cerrar menú al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!userMenuTrigger.contains(e.target) && !userMenu.contains(e.target)) {
            closeUserMenu();
        }
    });

    // Configurar modal de cambio de administrador
    if (changeAdminModal) {
        setupChangeAdminModal();
    }
    
    console.log('✅ Menú de usuario inicializado');
}

// Toggle del menú de usuario
function toggleUserMenu(e) {
    e.stopPropagation();
    console.log('🔄 Toggle menú');
    const isActive = userMenu.classList.contains('active');
    console.log('Estado actual:', isActive ? 'abierto' : 'cerrado');
    
    userMenuTrigger.classList.toggle('active');
    userMenu.classList.toggle('active');
    
    console.log('Nuevo estado:', userMenu.classList.contains('active') ? 'abierto' : 'cerrado');
}

// Cerrar menú de usuario
function closeUserMenu() {
    userMenuTrigger.classList.remove('active');
    userMenu.classList.remove('active');
}

// Manejar logout
async function handleLogout(e) {
    e.preventDefault();
    closeUserMenu();
    
    if (typeof window.cerrarSesion === 'function') {
        await window.cerrarSesion();
    } else {
        console.error('Función cerrarSesion no disponible');
        window.location.href = '/login.html';
    }
}

// Abrir modal de cambio de administrador
function openChangeAdminModal(e) {
    e.preventDefault();
    closeUserMenu();
    
    if (changeAdminModal) {
        changeAdminForm.reset();
        changeAdminModal.showModal();
    }
}

// Configurar modal de cambio de administrador
function setupChangeAdminModal() {
    const closeBtn = document.getElementById('closeChangeAdminModal');
    const cancelBtn = document.getElementById('cancelChangeAdmin');
    const confirmBtn = document.getElementById('confirmChangeAdmin');

    // Cerrar modal
    const closeModal = () => {
        changeAdminModal.close();
        changeAdminForm.reset();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Confirmar cambio de administrador
    confirmBtn?.addEventListener('click', handleChangeAdmin);

    // Cerrar con ESC
    changeAdminModal.addEventListener('cancel', (e) => {
        e.preventDefault();
        closeModal();
    });
}

// Manejar cambio de administrador
async function handleChangeAdmin(e) {
    e.preventDefault();

    // Obtener valores del formulario
    const newUser = document.getElementById('newAdminUser').value.trim();
    const newEmail = document.getElementById('newAdminEmail').value.trim();
    const newPassword = document.getElementById('newAdminPassword').value;
    const confirmPassword = document.getElementById('confirmAdminPassword').value;

    // Validaciones
    if (!newUser || !newEmail || !newPassword || !confirmPassword) {
        mostrarAlerta('Por favor completa todos los campos', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        mostrarAlerta('Las contraseñas no coinciden', 'error');
        return;
    }

    if (newPassword.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        mostrarAlerta('Por favor ingresa un correo electrónico válido', 'error');
        return;
    }

    // Deshabilitar botón
    const confirmBtn = e.target;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const response = await fetch('/api/auth/request-admin-change', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nuevoUsuario: newUser,
                nuevoCorreo: newEmail,
                nuevaPassword: newPassword
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Cerrar modal
            changeAdminModal.close();
            changeAdminForm.reset();
            
            // Mostrar mensaje de éxito
            mostrarAlerta(
                'Se ha enviado un correo de verificación. Por favor revisa tu bandeja de entrada y confirma el cambio.',
                'success'
            );
        } else {
            mostrarAlerta(data.mensaje || 'Error al solicitar cambio de administrador', 'error');
        }
    } catch (error) {
        console.error('Error al solicitar cambio de administrador:', error);
        mostrarAlerta('Error de conexión. Por favor intenta nuevamente.', 'error');
    } finally {
        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Solicitud';
    }
}

// Función auxiliar para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
    // Intentar usar el sistema de notificaciones existente
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(mensaje, tipo);
    } else {
        // Fallback: crear alerta temporal
        const alert = document.createElement('div');
        alert.className = `alert alert--${tipo}`;
        alert.style.position = 'fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '10000';
        alert.style.maxWidth = '400px';
        alert.style.animation = 'slideIn 0.3s ease';
        
        const icon = tipo === 'success' ? 'check-circle' :
                    tipo === 'error' ? 'exclamation-circle' :
                    'info-circle';
        
        alert.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <div>${mensaje}</div>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
}

// Función global para toggle de visibilidad de contraseñas
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input?.parentElement.querySelector('.form__password-toggle');
    const icon = button?.querySelector('i');
    
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }
};
