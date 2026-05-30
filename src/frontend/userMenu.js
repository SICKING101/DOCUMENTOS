// src/frontend/userMenu.js
// Gestión del menú de usuario y cambio de administrador

import { canAction, loadCurrentPermissions, showNoPermissionAlert } from './permissions.js';
import {
    validateUsername,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    displayPasswordStrength
} from './securityValidation.js';

// Elementos del DOM
let userMenuTrigger;
let userMenu;
let changeAdminModal;
let changeAdminForm;
let logoutBtn;
let changeAdminBtn;

// =============================================================================
// FUNCIÓN PARA ACTUALIZAR LA INFORMACIÓN DEL USUARIO EN LA UI
// =============================================================================

function actualizarInfoUsuario() {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            console.log('❌ No hay usuario en localStorage');
            return false;
        }
        
        const user = JSON.parse(userStr);
        console.log('👤 Actualizando UI con datos de usuario:', user);
        
        const userNameElement = document.querySelector('.topbar__user-name');
        const userRoleElement = document.querySelector('.topbar__user-role');
        
        if (userNameElement) {
            userNameElement.textContent = user.usuario || user.correo || 'Usuario';
        }
        
        if (userRoleElement) {
            const rolMostrado = user.rol === 'administrador' ? 'Administrador' : 
                               user.rol === 'desactivado' ? 'Desactivado' :
                               user.rol ? user.rol.charAt(0).toUpperCase() + user.rol.slice(1) : 'Usuario';
            userRoleElement.textContent = rolMostrado;
        }
        
        const menuNameElement = document.querySelector('.user-menu__name');
        const menuEmailElement = document.querySelector('.user-menu__email');
        const menuStatusElement = document.querySelector('.user-menu__status');
        
        if (menuNameElement) {
            menuNameElement.textContent = user.usuario || user.correo || 'Usuario del Sistema';
        }
        
        if (menuEmailElement) {
            menuEmailElement.textContent = user.correo || 'usuario@cbtis051.edu.mx';
        }
        
        if (menuStatusElement) {
            menuStatusElement.textContent = user.activo ? 'En línea' : 'Desconectado';
        }
        
        const avatarIcon = document.querySelector('.topbar__user-avatar i, .user-menu__avatar i');
        if (avatarIcon) {
            if (user.rol === 'administrador') {
                avatarIcon.className = 'fas fa-user-shield';
            } else if (user.rol === 'desactivado') {
                avatarIcon.className = 'fas fa-user-lock';
            } else {
                avatarIcon.className = 'fas fa-user';
            }
        }
        
        console.log('✅ UI de usuario actualizada correctamente');
        return true;
        
    } catch (error) {
        console.error('❌ Error actualizando info de usuario:', error);
        return false;
    }
}

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
    const changeAdminBtn = document.getElementById('changeAdminBtn');
    
    if (changeAdminBtn) {
        if (esAdmin) {
            changeAdminBtn.style.display = 'flex';
            console.log('✅ Botón de cambio de admin VISIBLE');
        } else {
            changeAdminBtn.style.display = 'none';
            console.log('🔒 Botón de cambio de admin OCULTO');
        }
    } else {
        console.warn('⚠️ Botón de cambio de admin no encontrado');
    }
}

// =============================================================================
// INICIALIZAR MENÚ DE USUARIO
// =============================================================================

export function inicializarMenuUsuario() {
    console.log('🔧 Inicializando menú de usuario...');
    
    actualizarInfoUsuario();
    
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

    if (!userMenuTrigger || !userMenu) {
        console.warn('❌ Elementos del menú de usuario no encontrados');
        return;
    }

    actualizarVisibilidadMenu();

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

    document.addEventListener('click', (e) => {
        if (!userMenuTrigger.contains(e.target) && !userMenu.contains(e.target)) {
            closeUserMenu();
        }
    });

    if (changeAdminModal) {
        setupChangeAdminModal();
    }
    
    console.log('✅ Menú de usuario inicializado');
}

// =============================================================================
// RE-EVALUAR PERMISOS CUANDO CAMBIA EL USUARIO
// =============================================================================

export function reevaluarPermisosUsuario() {
    console.log('🔄 Re-evaluando permisos de usuario...');
    actualizarInfoUsuario();
    actualizarVisibilidadMenu();
}

window.addEventListener('storage', (e) => {
    if (e.key === 'user') {
        console.log('🔄 Usuario actualizado en localStorage, reevaluando permisos...');
        actualizarInfoUsuario();
        actualizarVisibilidadMenu();
    }
});

window.reevaluarPermisosUsuario = reevaluarPermisosUsuario;

// =============================================================================
// TOGGLE / CERRAR MENÚ
// =============================================================================

function toggleUserMenu(e) {
    e.stopPropagation();
    console.log('🔄 Toggle menú');
    userMenuTrigger.classList.toggle('active');
    userMenu.classList.toggle('active');
}

function closeUserMenu() {
    userMenuTrigger.classList.remove('active');
    userMenu.classList.remove('active');
}

// =============================================================================
// LOGOUT
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
    
    if (!esUsuarioAdministrador()) {
        console.warn('🚫 Usuario no administrador intentó abrir modal de cambio');
        mostrarAlerta('No tienes permisos para realizar esta acción', 'error');
        return;
    }

    await loadCurrentPermissions();
    if (!canAction('admin')) {
        showNoPermissionAlert('admin');
        mostrarAlerta('Solo lectura: no puedes enviar solicitudes de cambio de administrador', 'warning');
        return;
    }
    
    if (changeAdminModal) {
        changeAdminForm.reset();
        
        // Limpiar validaciones anteriores
        changeAdminForm.querySelectorAll('.error-container, .strength-indicator').forEach(el => el.remove());
        changeAdminForm.querySelectorAll('.input-error, .input-valid').forEach(el => {
            el.classList.remove('input-error', 'input-valid');
        });
        
        changeAdminModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Arreglar los ojos al abrir
        fixPasswordToggles();
    }
}

// =============================================================================
// CONFIGURAR MODAL
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
        changeAdminForm.reset();
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

    // Inicializar validación en tiempo real
    fixPasswordToggles();
    setupAdminChangeValidation();
}

// =============================================================================
// ARREGLAR OJOS DE CONTRASEÑA
// =============================================================================

function fixPasswordToggles() {
    if (!changeAdminForm) return;
    
    // Buscar TODOS los inputs de contraseña
    const passwordInputs = changeAdminForm.querySelectorAll('input[type="password"]');
    
    passwordInputs.forEach(input => {
        // Buscar el botón de toggle asociado
        const wrapper = input.closest('.form__password-wrapper, .password-wrapper');
        if (!wrapper) return;
        
        const btn = wrapper.querySelector('.form__password-toggle, .password-toggle');
        if (!btn) return;
        
        // Eliminar onclick inline
        btn.removeAttribute('onclick');
        
        // Clonar para limpiar listeners
        const newBtn = btn.cloneNode(true);
        btn.replaceWith(newBtn);
        
        // Agregar evento fresco
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Buscar el input de nuevo (por si cambió el DOM)
            const currentWrapper = this.closest('.form__password-wrapper, .password-wrapper');
            const currentInput = currentWrapper?.querySelector('input');
            
            if (!currentInput) return;
            
            const isPassword = currentInput.type === 'password';
            currentInput.type = isPassword ? 'text' : 'password';
            
            const icon = this.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye', !isPassword);
                icon.classList.toggle('fa-eye-slash', isPassword);
            }
        });
    });
    
    console.log('✅ Ojos de contraseña arreglados:', passwordInputs.length);
}

// =============================================================================
// VALIDACIÓN EN TIEMPO REAL PARA EL MODAL
// =============================================================================

function setupAdminChangeValidation() {
    const newUser = document.getElementById('newAdminUser');
    const newEmail = document.getElementById('newAdminEmail');
    const newPassword = document.getElementById('newAdminPassword');
    const confirmPassword = document.getElementById('confirmAdminPassword');
    const confirmBtn = document.getElementById('confirmChangeAdmin');

    function updateBtn() {
        if (!confirmBtn) return;
        const u = newUser?.value.trim() || '';
        const e = newEmail?.value.trim() || '';
        const p = newPassword?.value || '';
        const c = confirmPassword?.value || '';

        const uOk = u && validateUsername(u).isValid;
        const eOk = e && validateEmail(e).isValid;
        const pOk = p && validatePassword(p).isValid;
        const cOk = c && validateConfirmPassword(p, c).isValid;

        const allOk = uOk && eOk && pOk && cOk;
        confirmBtn.disabled = !allOk;
        confirmBtn.classList.toggle('btn-enabled', allOk);
    }

    // Usuario
    newUser?.addEventListener('input', () => {
        const v = validateUsername(newUser.value);
        showFieldError(newUser, v.errors);
        updateBtn();
    });

    // Email
    newEmail?.addEventListener('input', () => {
        const val = newEmail.value.trim();
        const v = val.length > 3 ? validateEmail(val) : { errors: [] };
        showFieldError(newEmail, v.errors);
        updateBtn();
    });

    // Contraseña
    newPassword?.addEventListener('input', () => {
        const v = validatePassword(newPassword.value);
        showFieldError(newPassword, v.errors);
        displayPasswordStrength(newPassword, v.strength);
        updateBtn();
        // Re-validar confirmación
        if (confirmPassword?.value) {
            const cv = validateConfirmPassword(newPassword.value, confirmPassword.value);
            showFieldError(confirmPassword, cv.errors);
        }
    });

    // Confirmar
    confirmPassword?.addEventListener('input', () => {
        const cv = validateConfirmPassword(newPassword?.value || '', confirmPassword.value);
        showFieldError(confirmPassword, cv.errors);
        updateBtn();
    });

    // Estado inicial
    updateBtn();
}

// =============================================================================
// MOSTRAR ERRORES EN CAMPO
// =============================================================================

function showFieldError(input, errors) {
    const wrapper = input.closest('.form__password-wrapper, .password-wrapper') || input.closest('.form-group');
    if (!wrapper) return;

    // Limpiar anteriores
    let fb = wrapper.nextElementSibling;
    while (fb && (fb.classList.contains('error-container') || fb.classList.contains('strength-indicator'))) {
        const next = fb.nextElementSibling;
        fb.remove();
        fb = next;
    }

    input.classList.remove('input-error', 'input-valid');

    if (errors.length > 0) {
        input.classList.add('input-error');
        const div = document.createElement('div');
        div.className = 'error-container';
        div.innerHTML = errors.slice(0, 2).map(e => 
            `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${e}</div>`
        ).join('');
        wrapper.parentNode.insertBefore(div, wrapper.nextSibling);
    } else if (input.value.trim()) {
        input.classList.add('input-valid');
    }
}

// =============================================================================
// CERRAR MODAL (global)
// =============================================================================

window.cerrarModalCambioAdmin = function() {
    const modal = document.getElementById('changeAdminModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    const form = document.getElementById('changeAdminForm');
    if (form) {
        form.reset();
        form.querySelectorAll('.error-container, .strength-indicator').forEach(el => el.remove());
        form.querySelectorAll('.input-error, .input-valid').forEach(el => {
            el.classList.remove('input-error', 'input-valid');
        });
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
    
    if (!newUser || !newEmail || !newPassword || !confirmPassword) {
        console.error('❌ ERROR: Elementos del formulario no encontrados');
        mostrarAlerta('Error en el formulario. Recarga la página.', 'error');
        return;
    }
    
    const newUserValue = newUser.value.trim();
    const newEmailValue = newEmail.value.trim();
    const newPasswordValue = newPassword.value;
    const confirmPasswordValue = confirmPassword.value;

    // ── Validaciones con securityValidation.js ──────────────────────
    let hasErrors = false;

    const userV = validateUsername(newUserValue);
    showFieldError(newUser, userV.errors);
    if (!userV.isValid) hasErrors = true;

    const emailV = validateEmail(newEmailValue);
    showFieldError(newEmail, emailV.errors);
    if (!emailV.isValid) hasErrors = true;

    const passV = validatePassword(newPasswordValue);
    showFieldError(newPassword, passV.errors);
    displayPasswordStrength(newPassword, passV.strength);
    if (!passV.isValid) hasErrors = true;

    const confirmV = validateConfirmPassword(newPasswordValue, confirmPasswordValue);
    showFieldError(confirmPassword, confirmV.errors);
    if (!confirmV.isValid) hasErrors = true;

    if (hasErrors) {
        mostrarAlerta('Por favor corrige los errores en el formulario', 'error');
        return;
    }

    // ── Enviar ─────────────────────────────────────────────────────
    const confirmBtn = e.target;
    confirmBtn.disabled = true;
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');

        const response = await fetch('/api/admin/request-change', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nuevoUsuario: newUserValue,
                nuevoCorreo: newEmailValue,
                nuevaPassword: newPasswordValue,
                confirmarPassword: confirmPasswordValue
            })
        });

        const data = await response.json();

        if (response.ok) {
            window.cerrarModalCambioAdmin();
            mostrarAlerta('✅ Solicitud enviada exitosamente. Se ha enviado un correo de verificación al nuevo administrador.', 'success');
        } else {
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
                    tipo === 'error' ? 'exclamation-circle' : 'info-circle';
        
        alert.innerHTML = `<i class="fas fa-${icon}"></i><div>${mensaje}</div>`;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
}

// =============================================================================
// TOGGLE PASSWORD VISIBILITY (GLOBAL) - ARREGLADO
// =============================================================================

window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const wrapper = input.closest('.form__password-wrapper, .password-wrapper');
    const button = wrapper?.querySelector('.form__password-toggle, .password-toggle');
    const icon = button?.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
};

// =============================================================================
// EXPORTAR
// =============================================================================

export { esUsuarioAdministrador };