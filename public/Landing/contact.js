/**
 * Contact Form Handler
 * Handles form submission and sends data via FormSubmit service
 * 
 * IMPORTANTE: Cambia 'tu-email@ejemplo.com' por tu correo real en la línea 15
 */

document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    const statusMessage = document.getElementById('statusMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // 🔴 CAMBIAR ESTO: Reemplaza 'contacto@gestacks.com' con tu correo
            const RECIPIENT_EMAIL = 'contacto@gestacks.com';

            // Get form data
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const phone = formData.get('phone');
            const message = formData.get('message');

            // Show loading state
            statusMessage.className = 'status-message loading';
            statusMessage.textContent = 'Enviando...';

            try {
                // Send data to FormSubmit (free service)
                const response = await fetch(`https://formsubmit.co/ajax/${RECIPIENT_EMAIL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        phone: phone,
                        message: message || 'Sin mensaje adicional',
                        _subject: `Nuevo contacto de ${name}`,
                        _captcha: false
                    })
                });

                if (response.ok) {
                    // Success
                    statusMessage.className = 'status-message success';
                    statusMessage.textContent = '✓ ¡Gracias! Hemos recibido tu información. Te contactaremos pronto.';
                    
                    // Reset form
                    contactForm.reset();
                    
                    // Clear message after 5 seconds
                    setTimeout(() => {
                        statusMessage.className = 'status-message';
                        statusMessage.textContent = '';
                    }, 5000);
                } else {
                    throw new Error('Error al enviar el formulario');
                }
            } catch (error) {
                console.error('Error:', error);
                statusMessage.className = 'status-message error';
                statusMessage.textContent = '✗ Hubo un error al enviar tu información. Por favor, intenta de nuevo.';
                
                // Clear message after 5 seconds
                setTimeout(() => {
                    statusMessage.className = 'status-message';
                    statusMessage.textContent = '';
                }, 5000);
            }
        });
    }
});
