// src/frontend/userMenu.js
// Gestión del menú de usuario y cambio de administrador

// Elementos del DOM
let userMenuTrigger;
let userMenu;
let changeAdminModal;
let changeAdminForm;
let logoutBtn;
let changeAdminBtn;

// =============================================================================
// FUNCIÓN PARA VERIFICAR SI EL USUARIO ACTUAL ES ADMINISTRADOR
// =============================================================================

function esUsuarioAdministrador() {
    try {
        // Obtener usuario del localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.log('❌ No hay usuario en localStorage');
            return false;
        }
        
        const user = JSON.parse(userStr);
        console.log('👤 Verificando rol de usuario:', user);
        
        // Verificar si el rol es 'administrador'
        const isAdmin = user.rol === 'administrador';
        console.log(`🔑 ¿Es administrador? ${isAdmin ? 'SÍ' : 'NO'}`);
        
        return isAdmin;
    } catch (error) {
        console.error('❌ Error verificando rol de usuario:', error);
        return false;
    }
}

// =============================================================================
// FUNCIÓN PARA ACTUALIZAR LA VISIBILIDAD DEL MENÚ SEGÚN EL ROL
// =============================================================================

function actualizarVisibilidadMenu() {
    const esAdmin = esUsuarioAdministrador();
    const changeAdminBtn = document.getElementById('changeAdminBtn');
    
    if (changeAdminBtn) {
        if (esAdmin) {
            // Mostrar el botón solo para administradores
            changeAdminBtn.style.display = 'flex';
            console.log('✅ Botón de cambio de admin VISIBLE');
        } else {
            // Ocultar el botón para no administradores
            changeAdminBtn.style.display = 'none';
            console.log('🔒 Botón de cambio de admin OCULTO');
        }
    } else {
        console.warn('⚠️ Botón de cambio de admin no encontrado');
    }
}

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
        changeAdminBtn: !!changeAdminBtn,
        changeAdminModal: !!changeAdminModal
    });

    // Verificar que los elementos existen
    if (!userMenuTrigger || !userMenu) {
        console.warn('❌ Elementos del menú de usuario no encontrados');
        return;
    }

    // ACTUALIZAR VISIBILIDAD SEGÚN EL ROL
    actualizarVisibilidadMenu();

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

// =============================================================================
// RE-EVALUAR PERMISOS CUANDO CAMBIA EL USUARIO
// =============================================================================

// Función para forzar la reevaluación de permisos (útil después de login)
export function reevaluarPermisosUsuario() {
    console.log('🔄 Re-evaluando permisos de usuario...');
    actualizarVisibilidadMenu();
}

// Escuchar cambios en localStorage (para cuando otro componente modifica el usuario)
window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        console.log('🔄 Usuario actualizado en localStorage, reevaluando permisos...');
        actualizarVisibilidadMenu();
    }
});

// También podemos exponer la función globalmente
window.reevaluarPermisosUsuario = reevaluarPermisosUsuario;

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
    
    // Verificar nuevamente antes de abrir el modal
    if (!esUsuarioAdministrador()) {
        console.warn('🚫 Usuario no administrador intentó abrir modal de cambio');
        mostrarAlerta('No tienes permisos para realizar esta acción', 'error');
        return;
    }
    
    if (changeAdminModal) {
        changeAdminForm.reset();
        changeAdminModal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll
    }
}

// Configurar modal de cambio de administrador
function setupChangeAdminModal() {
    const closeBtn = document.getElementById('closeChangeAdminModal');
    const cancelBtn = document.getElementById('cancelChangeAdmin');
    const confirmBtn = document.getElementById('confirmChangeAdmin');

    // Cerrar modal
    const closeModal = () => {
        if (changeAdminModal) {
            changeAdminModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Restaurar scroll
        }
        changeAdminForm.reset();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Cerrar al hacer clic en overlay
    const overlay = changeAdminModal?.querySelector('.modal__overlay');
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    // Confirmar cambio de administrador
    confirmBtn?.addEventListener('click', handleChangeAdmin);

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && changeAdminModal.style.display === 'block') {
            closeModal();
        }
    });
}

// Función global para cerrar el modal
window.cerrarModalCambioAdmin = function() {
    const modal = document.getElementById('changeAdminModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    const form = document.getElementById('changeAdminForm');
    if (form) {
        form.reset();
    }
};

// Manejar cambio de administrador
async function handleChangeAdmin(e) {
    e.preventDefault();

    // Verificar nuevamente antes de procesar
    if (!esUsuarioAdministrador()) {
        mostrarAlerta('No tienes permisos para realizar esta acción', 'error');
        return;
    }

    console.log('🔐 DEBUG: Iniciando handleChangeAdmin...');
    
    // Obtener valores del formulario
    const newUser = document.getElementById('newAdminUser');
    const newEmail = document.getElementById('newAdminEmail');
    const newPassword = document.getElementById('newAdminPassword');
    const confirmPassword = document.getElementById('confirmAdminPassword');
    
    // Debug: verificar elementos
    console.log('🔍 Elementos del formulario:', {
        newAdminUser: newUser ? 'EXISTE' : 'NO EXISTE',
        newAdminEmail: newEmail ? 'EXISTE' : 'NO EXISTE',
        newAdminPassword: newPassword ? 'EXISTE' : 'NO EXISTE',
        confirmAdminPassword: confirmPassword ? 'EXISTE' : 'NO EXISTE'
    });
    
    if (!newUser || !newEmail || !newPassword || !confirmPassword) {
        console.error('❌ ERROR: Elementos del formulario no encontrados');
        mostrarAlerta('Error en el formulario. Recarga la página.', 'error');
        return;
    }
    
    const newUserValue = newUser.value.trim();
    const newEmailValue = newEmail.value.trim();
    const newPasswordValue = newPassword.value;
    const confirmPasswordValue = confirmPassword.value;
    
    console.log('📋 Valores obtenidos:', {
        newUser: newUserValue,
        newEmail: newEmailValue,
        newPasswordLength: newPasswordValue.length,
        confirmPasswordLength: confirmPasswordValue.length
    });

    // Validaciones frontend
    if (!newUserValue || !newEmailValue || !newPasswordValue || !confirmPasswordValue) {
        console.error('❌ ERROR: Campos vacíos');
        mostrarAlerta('Por favor completa todos los campos', 'error');
        return;
    }

    if (newPasswordValue !== confirmPasswordValue) {
        console.error('❌ ERROR: Contraseñas no coinciden');
        mostrarAlerta('Las contraseñas no coinciden', 'error');
        return;
    }

    if (newPasswordValue.length < 6) {
        console.error('❌ ERROR: Contraseña muy corta');
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailValue)) {
        console.error('❌ ERROR: Email inválido');
        mostrarAlerta('Por favor ingresa un correo electrónico válido', 'error');
        return;
    }

    // Deshabilitar botón
    const confirmBtn = e.target;
    confirmBtn.disabled = true;
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        // Obtener token
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');
        }

        console.log('📤 Enviando solicitud al servidor...');
        console.log('🔑 Token disponible:', token ? 'SÍ' : 'NO');
        
        const requestBody = {
            nuevoUsuario: newUserValue,
            nuevoCorreo: newEmailValue,
            nuevaPassword: newPasswordValue,
            confirmarPassword: confirmPasswordValue
        };
        
        console.log('📦 Request body a enviar:', requestBody);

        const response = await fetch('/api/admin/request-change', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('📥 Response status:', response.status);
        console.log('📥 Response text:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ No es JSON válido:', responseText);
            throw new Error('Respuesta inválida del servidor');
        }

        if (response.ok) {
            // Cerrar modal
            window.cerrarModalCambioAdmin();
            
            // Mostrar mensaje de éxito
            mostrarAlerta(
                '✅ Solicitud enviada exitosamente. Se ha enviado un correo de verificación al nuevo administrador.',
                'success'
            );
            
            console.log('✅ Solicitud procesada exitosamente:', data);
        } else {
            console.error('❌ Error del servidor:', data);
            mostrarAlerta(data.message || 'Error al solicitar cambio de administrador', 'error');
        }
    } catch (error) {
        console.error('🔥 Error en handleChangeAdmin:', error);
        mostrarAlerta(`Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Función auxiliar para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(mensaje, tipo);
    } else {
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

// Exportar funciones adicionales
export { esUsuarioAdministrador };