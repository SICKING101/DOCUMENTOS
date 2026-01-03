// src/frontend/modules/auth/resetPassword.js

/**
 * Módulo para restablecimiento de contraseña
 * Versión compatible con navegadores (sin módulos ES6)
 */

const resetPasswordModule = (function() {
    'use strict';
    
    const API_URL = window.location.origin;
    let token = null;
    
    // Exponer funciones públicamente
    const publicAPI = {
        togglePassword,
        init: initialize
    };
    
    // Inicialización
    function initialize() {
        // Obtener token de la URL o localStorage
        const urlParams = new URLSearchParams(window.location.search);
        token = urlParams.get('token') || localStorage.getItem('changePasswordToken');
        
        // Iniciar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initModule);
        } else {
            initModule();
        }
    }
    
    async function initModule() {
        if (!token || token === 'reset-password.html') {
            showAlert('Enlace inválido o expirado', 'error');
            disableForm();
            return;
        }
        
        await verifyToken();
        setupPasswordToggles(); // <-- AÑADIR ESTA LÍNEA
        bindEvents();
    }
    
    async function verifyToken() {
        try {
            const response = await fetch(`${API_URL}/api/auth/verify-change-token/${token}`);
            const data = await response.json();
            
            if (!response.ok) {
                showAlert(data.message || 'Token inválido o expirado', 'error');
                disableForm();
            }
        } catch (error) {
            console.error('Error al verificar token:', error);
            showAlert('Error de conexión', 'error');
        }
    }
    
    function disableForm() {
        const form = document.getElementById('resetPasswordForm');
        const btn = document.getElementById('resetBtn');
        
        if (form) form.style.display = 'none';
        if (btn) btn.disabled = true;
    }
    
    // NUEVA FUNCIÓN: Configurar toggles de contraseña (igual que en auth.js)
    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                // Encontrar el input correspondiente (hermano anterior)
                const inputWrapper = this.closest('.input-wrapper');
                if (!inputWrapper) return;
                
                // Buscar el input dentro del wrapper
                const input = inputWrapper.querySelector('input[type="password"], input[type="text"]');
                if (!input) return;
                
                // Alternar tipo de input
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                
                // Alternar icono
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        });
    }
    
    // Toggle password visibility (mantener por compatibilidad)
    function togglePassword(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        // Encontrar el icono del ojo correspondiente
        const inputWrapper = input.closest('.input-wrapper');
        if (!inputWrapper) return;
        
        const button = inputWrapper.querySelector('.password-toggle');
        if (!button) return;
        
        if (input.type === 'password') {
            input.type = 'text';
            button.classList.remove('fa-eye');
            button.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            button.classList.remove('fa-eye-slash');
            button.classList.add('fa-eye');
        }
    }
    
    // Mostrar alertas
    function showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        if (!container) return;
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle'
        };
        
        container.innerHTML = `
            <div class="alert alert-${type}">
                <i class="fas fa-${iconMap[type]}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Auto-remover después de 5 segundos (excepto success)
        if (type !== 'success') {
            setTimeout(() => {
                if (container.firstChild) {
                    container.firstChild.style.opacity = '0';
                    setTimeout(() => {
                        container.innerHTML = '';
                    }, 300);
                }
            }, 5000);
        }
    }
    
    // Verificar fortaleza de contraseña
    function checkPasswordStrength(password) {
        const strengthSpan = document.getElementById('passwordStrength');
        if (!strengthSpan) return;
        
        if (!password) {
            strengthSpan.textContent = '';
            strengthSpan.className = 'password-strength';
            return;
        }
        
        let strength = 0;
        let message = '';
        let className = '';
        
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/\d/.test(password)) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        switch (true) {
            case (strength <= 1):
                message = 'Muy débil';
                className = 'strength-weak';
                break;
            case (strength <= 3):
                message = 'Moderada';
                className = 'strength-medium';
                break;
            default:
                message = 'Fuerte';
                className = 'strength-strong';
        }
        
        strengthSpan.textContent = `Fortaleza: ${message}`;
        strengthSpan.className = `password-strength ${className}`;
    }
    
    // Verificar coincidencia de contraseñas
    function checkPasswordMatch() {
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('confirmPassword');
        const matchSpan = document.getElementById('passwordMatch');
        
        if (!passwordInput || !confirmInput || !matchSpan) return;
        
        const password = passwordInput.value;
        const confirmPassword = confirmInput.value;
        
        if (!confirmPassword) {
            matchSpan.textContent = '';
            matchSpan.className = 'password-strength';
            return;
        }
        
        if (password === confirmPassword) {
            matchSpan.textContent = '✓ Las contraseñas coinciden';
            matchSpan.className = 'password-strength strength-strong';
        } else {
            matchSpan.textContent = '✗ Las contraseñas no coinciden';
            matchSpan.className = 'password-strength strength-weak';
        }
    }
    
    // Vincular eventos
    function bindEvents() {
        // Eventos para verificar en tiempo real
        const passwordInput = document.getElementById('password');
        const confirmInput = document.getElementById('confirmPassword');
        const form = document.getElementById('resetPasswordForm');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                checkPasswordStrength(this.value);
                checkPasswordMatch();
            });
        }
        
        if (confirmInput) {
            confirmInput.addEventListener('input', checkPasswordMatch);
        }
        
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
    }
    
    // Manejar envío del formulario
    async function handleSubmit(e) {
        e.preventDefault();
        
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const btn = document.getElementById('resetBtn');
        
        // Validaciones
        if (password !== confirmPassword) {
            showAlert('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (password.length < 6) {
            showAlert('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (!btn) return;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        
        try {
            const response = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showAlert('✅ ¡Contraseña cambiada exitosamente! Redirigiendo...', 'success');
                
                // Limpiar localStorage
                localStorage.removeItem('recoveryEmail');
                localStorage.removeItem('recoveryUserId');
                localStorage.removeItem('changePasswordToken');
                localStorage.removeItem('recoveryCode');
                
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                showAlert(data.message || 'Error al cambiar la contraseña', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> Cambiar Contraseña';
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error de conexión. Por favor intenta nuevamente.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Cambiar Contraseña';
            }
        }
    }
    
    return publicAPI;
})();

// Inicializar automáticamente
resetPasswordModule.init();