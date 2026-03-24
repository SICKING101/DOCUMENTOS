// src/frontend/userMenu.js
// Gestión del menú de usuario y cambio de administrador (VERSIÓN TOPBAR)

import { canAction, loadCurrentPermissions, showNoPermissionAlert } from './permissions.js';

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
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.log('❌ No hay usuario en localStorage');
            return false;
        }
        
        const user = JSON.parse(userStr);
        console.log('👤 Verificando rol de usuario:', user);
        
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
    const changeAdminBtnTopbar = document.getElementById('changeAdminBtnTopbar');
    
    if (changeAdminBtnTopbar) {
        if (esAdmin) {
            changeAdminBtnTopbar.style.display = 'flex';
            console.log('✅ Botón de cambio de admin VISIBLE en topbar');
        } else {
            changeAdminBtnTopbar.style.display = 'none';
            console.log('🔒 Botón de cambio de admin OCULTO en topbar');
        }
    } else {
        console.log('ℹ️ Botón de cambio de admin en topbar no encontrado aún');
    }
}

// =============================================================================
// ACTUALIZAR INFORMACIÓN DEL USUARIO EN LA TOPBAR
// =============================================================================

function actualizarInfoUsuarioTopbar() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        
        const user = JSON.parse(userStr);
        
        // Actualizar en la topbar
        const userNameEl = document.querySelector('.topbar__user-name');
        const userRoleEl = document.querySelector('.topbar__user-role');
        const userEmailEl = document.getElementById('userEmailTopbar');
        const menuNameEl = document.querySelector('.topbar-user-menu__name');
        const menuEmailEl = document.querySelector('.topbar-user-menu__email');
        
        const roleNames = {
            'administrador': 'Administrador',
            'editor': 'Editor',
            'revisor': 'Revisor',
            'lector': 'Lector',
            'usuario': 'Usuario',
            'desactivado': 'Desactivado'
        };
        
        if (userNameEl && user.usuario) userNameEl.textContent = user.usuario;
        if (userRoleEl && user.rol) userRoleEl.textContent = roleNames[user.rol] || user.rol;
        if (userEmailEl && user.correo) userEmailEl.textContent = user.correo;
        if (menuNameEl && user.usuario) menuNameEl.textContent = user.usuario;
        if (menuEmailEl && user.correo) menuEmailEl.textContent = user.correo;
        
        console.log('✅ Info de usuario actualizada en topbar');
    } catch (error) {
        console.error('❌ Error actualizando info de usuario:', error);
    }
}

// =============================================================================
// INICIALIZAR MENÚ DE USUARIO EN LA TOPBAR
// =============================================================================

export function inicializarMenuUsuario() {
    console.log('🔧 Inicializando menú de usuario en topbar...');
    
    // Obtener elementos del DOM (topbar)
    userMenuTrigger = document.getElementById('topbarUserMenuTrigger');
    userMenu = document.getElementById('topbarUserMenu');
    changeAdminModal = document.getElementById('changeAdminModal');
    changeAdminForm = document.getElementById('changeAdminForm');
    logoutBtn = document.getElementById('logoutBtnTopbar');
    changeAdminBtn = document.getElementById('changeAdminBtnTopbar');

    console.log('Elementos encontrados:', {
        userMenuTrigger: !!userMenuTrigger,
        userMenu: !!userMenu,
        logoutBtn: !!logoutBtn,
        changeAdminBtn: !!changeAdminBtn,
        changeAdminModal: !!changeAdminModal
    });

    // Actualizar información del usuario
    actualizarInfoUsuarioTopbar();

    // Actualizar visibilidad según rol
    actualizarVisibilidadMenu();

    // Verificar que los elementos existen
    if (!userMenuTrigger || !userMenu) {
        console.warn('❌ Elementos del menú de usuario no encontrados');
        return;
    }

    // Event listeners para el menú de usuario
    userMenuTrigger.addEventListener('click', (e) => {
        console.log('👆 Click en menú de usuario topbar');
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
        if (userMenuTrigger && userMenu && 
            !userMenuTrigger.contains(e.target) && 
            !userMenu.contains(e.target)) {
            closeUserMenu();
        }
    });

    // Configurar modal de cambio de administrador
    if (changeAdminModal) {
        setupChangeAdminModal();
    }
    
    console.log('✅ Menú de usuario en topbar inicializado');
}

// =============================================================================
// RE-EVALUAR PERMISOS CUANDO CAMBIA EL USUARIO
// =============================================================================

export function reevaluarPermisosUsuario() {
    console.log('🔄 Re-evaluando permisos de usuario...');
    actualizarVisibilidadMenu();
    actualizarInfoUsuarioTopbar();
}

// Escuchar cambios en localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        console.log('🔄 Usuario actualizado en localStorage, reevaluando permisos...');
        reevaluarPermisosUsuario();
    }
});

// Exponer función globalmente
window.reevaluarPermisosUsuario = reevaluarPermisosUsuario;

// =============================================================================
// FUNCIONES DEL MENÚ
// =============================================================================

function toggleUserMenu(e) {
    e.stopPropagation();
    console.log('🔄 Toggle menú topbar');
    const isActive = userMenu.classList.contains('active');
    
    userMenuTrigger.classList.toggle('active');
    userMenu.classList.toggle('active');
    
    console.log('Nuevo estado:', userMenu.classList.contains('active') ? 'abierto' : 'cerrado');
}

function closeUserMenu() {
    userMenuTrigger.classList.remove('active');
    userMenu.classList.remove('active');
}

// =============================================================================
// MANEJAR LOGOUT
// =============================================================================

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

// =============================================================================
// ABRIR MODAL DE CAMBIO DE ADMINISTRADOR
// =============================================================================

async function openChangeAdminModal(e) {
    e.preventDefault();
    closeUserMenu();
    
    // Verificar nuevamente antes de abrir el modal
    if (!esUsuarioAdministrador()) {
        console.warn('🚫 Usuario no administrador intentó abrir modal de cambio');
        mostrarAlerta('No tienes permisos para realizar esta acción', 'error');
        return;
    }

    // Verificar permiso de ACCIÓN
    await loadCurrentPermissions();
    if (!canAction('admin')) {
        showNoPermissionAlert('admin');
        mostrarAlerta('Solo lectura: no puedes enviar solicitudes de cambio de administrador', 'warning');
        return;
    }
    
    if (changeAdminModal) {
        if (changeAdminForm) changeAdminForm.reset();
        changeAdminModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// =============================================================================
// CONFIGURAR MODAL DE CAMBIO DE ADMINISTRADOR
// =============================================================================

function setupChangeAdminModal() {
    const closeBtn = document.getElementById('closeChangeAdminModal');
    const cancelBtn = document.getElementById('cancelChangeAdmin');
    const confirmBtn = document.getElementById('confirmChangeAdmin');

    const closeModal = () => {
        if (changeAdminModal) {
            changeAdminModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (changeAdminForm) changeAdminForm.reset();
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    const overlay = changeAdminModal?.querySelector('.modal__overlay');
    if (overlay) {
        overlay.addEventListener('click', closeModal);
    }

    confirmBtn?.addEventListener('click', handleChangeAdmin);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && changeAdminModal?.style.display === 'block') {
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

// =============================================================================
// MANEJAR CAMBIO DE ADMINISTRADOR
// =============================================================================

async function handleChangeAdmin(e) {
    e.preventDefault();

    if (!esUsuarioAdministrador()) {
        mostrarAlerta('No tienes permisos para realizar esta acción', 'error');
        return;
    }

    await loadCurrentPermissions();
    if (!canAction('admin')) {
        showNoPermissionAlert('admin');
        mostrarAlerta('Solo lectura: no puedes enviar solicitudes de cambio de administrador', 'warning');
        return;
    }

    console.log('🔐 DEBUG: Iniciando handleChangeAdmin...');
    
    const newUser = document.getElementById('newAdminUser');
    const newEmail = document.getElementById('newAdminEmail');
    const newPassword = document.getElementById('newAdminPassword');
    const confirmPassword = document.getElementById('confirmAdminPassword');
    
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

    if (!newUserValue || !newEmailValue || !newPasswordValue || !confirmPasswordValue) {
        mostrarAlerta('Por favor completa todos los campos', 'error');
        return;
    }

    if (newPasswordValue !== confirmPasswordValue) {
        mostrarAlerta('Las contraseñas no coinciden', 'error');
        return;
    }

    if (newPasswordValue.length < 6) {
        mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailValue)) {
        mostrarAlerta('Por favor ingresa un correo electrónico válido', 'error');
        return;
    }

    const confirmBtn = e.target;
    confirmBtn.disabled = true;
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');
        }

        console.log('📤 Enviando solicitud al servidor...');
        
        const requestBody = {
            nuevoUsuario: newUserValue,
            nuevoCorreo: newEmailValue,
            nuevaPassword: newPasswordValue,
            confirmarPassword: confirmPasswordValue
        };

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

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ No es JSON válido:', responseText);
            throw new Error('Respuesta inválida del servidor');
        }

        if (response.ok) {
            window.cerrarModalCambioAdmin();
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
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// =============================================================================
// MOSTRAR ALERTA
// =============================================================================

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

// =============================================================================
// FUNCIÓN GLOBAL PARA TOGGLE DE CONTRASEÑAS
// =============================================================================

window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input?.parentElement?.querySelector('.password-toggle');
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

// =============================================================================
// EXPORTACIONES
// =============================================================================

export { esUsuarioAdministrador };