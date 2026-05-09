/* ============================================
   RELENTLESS — Main JS (Interactions & Animations)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // --- Header scroll effect ---
  const header = document.getElementById('siteHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // --- Mobile nav ---
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const navOverlay = document.getElementById('navOverlay');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      if (navOverlay) navOverlay.classList.toggle('active');
    });

    if (navOverlay) {
      navOverlay.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navOverlay.classList.remove('active');
      });
    }

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
      });
    });
  }

  // --- Scroll reveal animations ---
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 100);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

  revealElements.forEach(el => revealObserver.observe(el));

  // --- Hero particles ---
  const particlesContainer = document.getElementById('heroParticles');
  if (particlesContainer) {
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.classList.add('particle');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 8 + 's';
      particle.style.animationDuration = (6 + Math.random() * 6) + 's';
      particle.style.width = particle.style.height = (1 + Math.random() * 3) + 'px';
      particlesContainer.appendChild(particle);
    }
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80;
        window.scrollTo({
          top: target.offsetTop - headerH - 20,
          behavior: 'smooth'
        });
      }
    });
  });

  // --- Email form submission (demo) ---
  const emailForms = document.querySelectorAll('.email-form');
  emailForms.forEach(form => {
    const btn = form.querySelector('.btn');
    const input = form.querySelector('input');
    if (btn && input) {
      btn.addEventListener('click', () => {
        if (input.value && input.value.includes('@')) {
          btn.textContent = '✓ Joined!';
          btn.style.background = '#22C55E';
          input.value = '';
          setTimeout(() => {
            btn.textContent = 'Join List';
            btn.style.background = '';
          }, 3000);
        } else {
          input.style.borderColor = '#C1121F';
          input.setAttribute('placeholder', 'Enter a valid email');
          setTimeout(() => {
            input.style.borderColor = '';
            input.setAttribute('placeholder', 'Enter your email');
          }, 2000);
        }
      });
    }
  });
});
