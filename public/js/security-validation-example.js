/**
 * Inicialización de Validación de Seguridad - Ejemplo
 * Formularios de Registro e Inicio de Sesión
 */

document.addEventListener('DOMContentLoaded', function() {
    // ═══════════════════════════════════════════════════════════════════
    // INICIALIZAR VALIDACIÓN - FORMULARIO DE REGISTRO
    // ═══════════════════════════════════════════════════════════════════
    initSecurityValidation('#registerForm', {
        onValidationSuccess: function() {
            console.log('✓ Formulario de registro válido');
        },
        onValidationFail: function() {
            console.log('✗ Por favor corrige los errores');
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // INICIALIZAR VALIDACIÓN - FORMULARIO DE LOGIN
    // ═══════════════════════════════════════════════════════════════════
    initSecurityValidation('#loginFormElement', {
        onValidationSuccess: function() {
            console.log('✓ Formulario de login válido');
        },
        onValidationFail: function() {
            console.log('✗ Por favor corrige los errores');
        }
    });

    // ═══════════════════════════════════════════════════════════════════
    // MANEJO DEL ENVÍO - FORMULARIO DE REGISTRO
    // ═══════════════════════════════════════════════════════════════════
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('regUsername').value;
            const password = document.getElementById('regPassword').value;
            
            console.log('Formulario de registro enviado:');
            console.log('- Usuario:', username);
            console.log('- Contraseña: [OCULTADA]');
            
            // Aquí iría la lógica para enviar al servidor
            // Ejemplo:
            // fetch('/api/auth/register', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ username, password })
            // })
            // .then(response => response.json())
            // .then(data => { ... })
            // .catch(error => console.error('Error:', error));
            
            alert('✓ Registro exitoso (Este es un ejemplo)');
            registerForm.reset();
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // MANEJO DEL ENVÍO - FORMULARIO DE LOGIN
    // ═══════════════════════════════════════════════════════════════════
    const loginForm = document.getElementById('loginFormElement');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;
            
            console.log('Formulario de login enviado:');
            console.log('- Usuario:', username);
            console.log('- Contraseña: [OCULTADA]');
            
            // Aquí iría la lógica para enviar al servidor
            // Ejemplo:
            // fetch('/api/auth/login', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ username, password })
            // })
            // .then(response => response.json())
            // .then(data => { ... })
            // .catch(error => console.error('Error:', error));
            
            alert('✓ Inicio de sesión exitoso (Este es un ejemplo)');
            loginForm.reset();
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // NAVEGACIÓN SUAVE ENTRE FORMULARIOS
    // ═══════════════════════════════════════════════════════════════════
    document.querySelectorAll('a[href*="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
                // Pequeño delay para que se vea la transición
                setTimeout(() => {
                    target.querySelector('input')?.focus();
                }, 300);
            }
        });
    });

    console.log('✓ Inicialización completada');
});
