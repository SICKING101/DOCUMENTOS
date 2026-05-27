// Mobile menu
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const navbarMenu = document.getElementById('navbarMenu');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => navbarMenu.classList.toggle('active'));
  }
  document.querySelectorAll('.navbar-menu a').forEach(link => {
    link.addEventListener('click', () => navbarMenu.classList.remove('active'));
  });

  // Scroll animations
  const fadeElements = document.querySelectorAll('.fade-up');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  fadeElements.forEach(el => observer.observe(el));

  // Initial check
  setTimeout(() => {
    fadeElements.forEach(el => {
      if (el.getBoundingClientRect().top < window.innerHeight - 50) {
        el.classList.add('visible');
      }
    });
  }, 100);