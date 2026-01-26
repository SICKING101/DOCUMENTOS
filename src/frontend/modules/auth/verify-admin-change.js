// Obtener token de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        let requestData = null;
        let countdownInterval = null;
        
        // Elementos del DOM
        const requestDetails = document.getElementById('requestDetails');
        const countdownElement = document.getElementById('countdown');
        const acceptBtn = document.getElementById('acceptBtn');
        const rejectBtn = document.getElementById('rejectBtn');
        const passwordConfirmation = document.getElementById('passwordConfirmation');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const resultModal = document.getElementById('resultModal');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');
        const resultActions = document.getElementById('resultActions');
        
        // =========================================================================
        // 1. FUNCIONES AUXILIARES
        // =========================================================================
        
        function togglePasswordConfirmation() {
            const toggleBtn = document.querySelector('.password-toggle i');
            if (passwordConfirmation.type === 'text') {
                passwordConfirmation.type = 'password';
                toggleBtn.classList.remove('fa-eye-slash');
                toggleBtn.classList.add('fa-eye');
            } else {
                passwordConfirmation.type = 'text';
                toggleBtn.classList.remove('fa-eye');
                toggleBtn.classList.add('fa-eye-slash');
            }
        }
        
        function showLoading() {
            loadingOverlay.style.display = 'flex';
        }
        
        function hideLoading() {
            loadingOverlay.style.display = 'none';
        }
        
        function showResult(type, title, message, actionsHTML = '') {
            resultIcon.className = `fas result-icon ${type}`;
            resultIcon.classList.add(type === 'success' ? 'fa-check-circle' : 'fa-times-circle');
            resultTitle.textContent = title;
            resultMessage.textContent = message;
            resultActions.innerHTML = actionsHTML;
            resultModal.style.display = 'flex';
        }
        
        function updateCountdown(expiresAt) {
            const now = new Date().getTime();
            const expires = new Date(expiresAt).getTime();
            const distance = expires - now;
            
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownElement.textContent = 'EXPIRADO';
                acceptBtn.disabled = true;
                acceptBtn.innerHTML = '<i class="fas fa-ban"></i> Expirado';
                return;
            }
            
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            countdownElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // =========================================================================
        // 2. CARGAR INFORMACIÓN DE LA SOLICITUD
        // =========================================================================
        
        async function loadRequestInfo() {
            if (!token) {
                showResult('error', 'Error', 'No se proporcionó token de verificación');
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetch(`/api/admin/verify-token/${token}`);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Error al verificar token');
                }
                
                requestData = data.requestData;
                
                // Actualizar UI con información
                requestDetails.innerHTML = `
                    <div class="info-row">
                        <span class="info-label">Administrador actual:</span>
                        <span class="info-value">${requestData.currentAdmin.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Correo actual:</span>
                        <span class="info-value">${requestData.currentAdmin.email}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Nuevo administrador:</span>
                        <span class="info-value">${requestData.newAdmin.name}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Correo nuevo:</span>
                        <span class="info-value">${requestData.newAdmin.email}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Solicitado el:</span>
                        <span class="info-value">${new Date(requestData.requestedAt).toLocaleString('es-MX')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Expira el:</span>
                        <span class="info-value">${new Date(requestData.expiresAt).toLocaleString('es-MX')}</span>
                    </div>
                `;
                
                // Iniciar contador
                updateCountdown(requestData.expiresAt);
                countdownInterval = setInterval(() => updateCountdown(requestData.expiresAt), 1000);
                
                // Habilitar validación de campo de confirmación
                passwordConfirmation.addEventListener('input', validateConfirmation);
                
            } catch (error) {
                showResult('error', 'Error', error.message);
            } finally {
                hideLoading();
            }
        }
        
        // =========================================================================
        // 3. VALIDACIÓN DE CONFIRMACIÓN
        // =========================================================================
        
        function validateConfirmation() {
            const isValid = passwordConfirmation.value.toUpperCase() === 'ACEPTO';
            acceptBtn.disabled = !isValid;
            
            if (isValid) {
                passwordConfirmation.style.borderColor = '#10b981';
                passwordConfirmation.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            } else {
                passwordConfirmation.style.borderColor = '';
                passwordConfirmation.style.boxShadow = '';
            }
        }
        
        // =========================================================================
        // 4. MANEJAR ACEPTACIÓN
        // =========================================================================
        
        async function handleAccept() {
            if (!token || !requestData) {
                showResult('error', 'Error', 'Datos de solicitud no disponibles');
                return;
            }
            
            // Confirmación final
            const finalConfirmation = confirm(
                '⚠️ CONFIRMACIÓN FINAL\n\n' +
                '¿Estás completamente seguro de que deseas aceptar la administración?\n\n' +
                'Esta acción:\n' +
                '1. Desactivará permanentemente al administrador actual\n' +
                '2. Te dará control total del sistema\n' +
                '3. NO se puede deshacer automáticamente\n\n' +
                '¿Continuar?'
            );
            
            if (!finalConfirmation) {
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetch('/api/admin/confirm-change', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: token,
                        passwordConfirmation: 'ACEPTO'
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Error al confirmar cambio');
                }
                
                // Éxito
                showResult('success', 
                    '¡Éxito!', 
                    `Has sido confirmado como nuevo administrador del sistema CBTIS051. 
                    Tus credenciales han sido enviadas a tu correo electrónico.`,
                    `
                        <div style="margin-top: 30px;">
                            <a href="/login.html" class="btn btn--primary btn--lg" style="width: 100%;">
                                <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                            </a>
                            <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                                <i class="fas fa-lightbulb"></i> Recomendación: Cambia tu contraseña después del primer inicio de sesión.
                            </p>
                        </div>
                    `
                );
                
                clearInterval(countdownInterval);
                
            } catch (error) {
                showResult('error', 'Error', error.message);
            } finally {
                hideLoading();
            }
        }
        
        // =========================================================================
        // 5. MANEJAR RECHAZO
        // =========================================================================
        
        function handleReject() {
            const confirmation = confirm(
                '¿Estás seguro de que deseas rechazar la administración?\n\n' +
                'Esta acción notificará al administrador actual que has rechazado la solicitud.'
            );
            
            if (confirmation) {
                showResult('info',
                    'Solicitud Rechazada',
                    'Has rechazado la administración del sistema. El administrador actual será notificado.',
                    `
                        <div style="margin-top: 30px;">
                            <button class="btn btn--outline" onclick="window.location.href = '/'">
                                <i class="fas fa-home"></i> Volver al inicio
                            </button>
                        </div>
                    `
                );
            }
        }
        
        // =========================================================================
        // 6. EVENT LISTENERS
        // =========================================================================
        
        acceptBtn.addEventListener('click', handleAccept);
        rejectBtn.addEventListener('click', handleReject);
        
        // Cerrar modal de resultado al hacer clic fuera
        resultModal.addEventListener('click', (e) => {
            if (e.target === resultModal) {
                resultModal.style.display = 'none';
            }
        });
        
        // =========================================================================
        // 7. INICIALIZACIÓN
        // =========================================================================
        
        document.addEventListener('DOMContentLoaded', () => {
            if (!token) {
                showResult('error', 'Token no encontrado', 'El enlace de verificación no contiene un token válido.');
                return;
            }
            
            loadRequestInfo();
        });
        
        // Debug en consola
        console.log('🔐 Página de verificación de cambio de administrador cargada');
        console.log('🔑 Token:', token ? `${token.substring(0, 10)}...` : 'No encontrado');