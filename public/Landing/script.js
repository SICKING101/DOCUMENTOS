/**
 * Scroll Animation Handler
 * Uses Intersection Observer API to efficiently trigger animations when elements come into view
 * Replaces Framer Motion's whileInView functionality with vanilla JavaScript
 */

// Initialize animations when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeScrollAnimations);

/**
 * Set up Intersection Observer for scroll-triggered animations
 */
function initializeScrollAnimations() {
  // Configuration for Intersection Observer
  const observerOptions = {
    root: null, // viewport
    rootMargin: '0px 0px -50px 0px', // Trigger when element is 50px from bottom of viewport
    threshold: 0 // Trigger as soon as any part is visible
  };

  // Create the observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // When element enters viewport, add 'visible' class to trigger animation
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Stop observing once animated (optional optimization)
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Find all elements that need scroll animations
  const fadeInElements = document.querySelectorAll('.fade-in-on-scroll');
  const scaleInElements = document.querySelectorAll('.scale-in-on-scroll');

  // Observe all animatable elements
  fadeInElements.forEach(element => observer.observe(element));
  scaleInElements.forEach(element => observer.observe(element));
}

/**
 * Smooth scroll support for internal links (fallback for browsers)
 * Modern browsers handle this via CSS scroll-behavior: smooth
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    
    // Only prevent default for actual anchor links
    if (href !== '#' && document.querySelector(href)) {
      e.preventDefault();
      document.querySelector(href).scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

/**
 * Optional: Add subtle parallax effect to hero background
 * This creates depth perception as user scrolls
 */
window.addEventListener('scroll', () => {
  const heroBackground = document.querySelector('.hero-background');
  if (heroBackground) {
    const scrollProgress = window.scrollY;
    // Move background at 50% of scroll speed for parallax effect
    heroBackground.style.transform = `translateY(${scrollProgress * 0.5}px)`;
  }
}, { passive: true }); // passive: true for better scroll performance
