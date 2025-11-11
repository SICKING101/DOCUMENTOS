// Attach simple handlers for "Ver Perfil" buttons
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.people__btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.people__item');
      if (!item) return;
      const nameEl = item.querySelector('.people__name');
      const name = nameEl ? nameEl.textContent.trim() : 'Persona';
      alert('Ver perfil: ' + name);
      // aquí puedes redirigir a la página de detalles, por ejemplo:
      // window.location.href = `persona.html?name=${encodeURIComponent(name)}`;
    });
  });
});