const API_URL = window.location.origin;

        // Mostrar alertas
        function showAlert(message, type = 'info') {
            const container = document.getElementById('alertContainer');
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
        }

        // Enviar formulario de solicitud
        document.getElementById('requestCodeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const correo = document.getElementById('correo').value.trim();
            
            if (!correo) {
                showAlert('Por favor ingresa tu correo electrónico', 'error');
                return;
            }
            
            // Validar formato de email básico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(correo)) {
                showAlert('Por favor ingresa un correo electrónico válido', 'error');
                return;
            }
            
            const btn = document.getElementById('requestBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            try {
                const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ correo })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showAlert(data.message, 'success');
                    
                    // Limpiar localStorage anterior
                    localStorage.removeItem('recoveryEmail');
                    localStorage.removeItem('recoveryUserId');
                    localStorage.removeItem('changePasswordToken');
                    
                    // Guardar datos y redirigir
                    if (data.correo && data.userId) {
                        setTimeout(() => {
                            window.location.href = `forgot-password.html?email=${encodeURIComponent(data.correo)}&userId=${data.userId}`;
                        }, 1500);
                    } else if (data.codigo) {
                        // Si estamos en desarrollo y el código viene en la respuesta
                        console.log('🔑 Código de desarrollo:', data.codigo);
                        showAlert(`⚠️ Modo desarrollo: Código ${data.codigo}`, 'info');
                        
                        setTimeout(() => {
                            window.location.href = `forgot-password.html?email=${encodeURIComponent(correo)}`;
                        }, 3000);
                    } else {
                        setTimeout(() => {
                            window.location.href = `forgot-password.html?email=${encodeURIComponent(correo)}`;
                        }, 1500);
                    }
                } else {
                    showAlert(data.message || 'Error al enviar código', 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Código';
                }
            } catch (error) {
                console.error('Error:', error);
                showAlert('Error de conexión. Por favor intenta nuevamente.', 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Código';
            }
        });