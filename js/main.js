/* ============================================
   RELENTLESS — Main JS (Interactions & Animations)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // --- Homepage intro reveal ---
  const intro = document.getElementById('siteIntro');
  const introSkip = document.getElementById('introSkip');
  if (intro) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hideIntro = () => {
      intro.classList.add('is-hidden');
      document.body.classList.remove('intro-active');
      window.setTimeout(() => intro.remove(), 700);
    };

    if (reduceMotion) {
      intro.remove();
    } else {
      document.body.classList.add('intro-active');
      const introTimer = window.setTimeout(hideIntro, 2600);
      introSkip?.addEventListener('click', () => {
        window.clearTimeout(introTimer);
        hideIntro();
      });
    }
  }

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
    const closeNav = () => {
      navLinks.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      if (navOverlay) navOverlay.classList.remove('active');
    };

    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('active');
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (navOverlay) navOverlay.classList.toggle('active', isOpen);
    });

    if (navOverlay) {
      navOverlay.addEventListener('click', closeNav);
    }

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeNav);
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

  // --- Design carousel ---
  document.querySelectorAll('[data-carousel]').forEach(carousel => {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dots] button'));
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');

    if (!track || slides.length === 0) return;

    const autoplayDelay = 6500;
    let activeIndex = 0;
    let autoplayTimer;
    let carouselInView = true;

    const setActiveDot = index => {
      activeIndex = index;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
        dot.setAttribute('aria-current', i === index ? 'true' : 'false');
      });
    };

    const scrollToSlide = index => {
      const nextIndex = (index + slides.length) % slides.length;
      const slide = slides[nextIndex];
      const left = slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2;
      track.scrollTo({ left, behavior: 'smooth' });
      setActiveDot(nextIndex);
    };

    const stopAutoplay = () => {
      if (autoplayTimer) window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    const startAutoplay = () => {
      if (!carouselInView) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(() => {
        scrollToSlide(activeIndex + 1);
      }, autoplayDelay);
    };

    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    prev?.addEventListener('click', () => {
      scrollToSlide(activeIndex - 1);
      restartAutoplay();
    });

    next?.addEventListener('click', () => {
      scrollToSlide(activeIndex + 1);
      restartAutoplay();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        scrollToSlide(index);
        restartAutoplay();
      });
    });

    track.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollToSlide(activeIndex - 1);
        restartAutoplay();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollToSlide(activeIndex + 1);
        restartAutoplay();
      }
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });

    const carouselVisibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        carouselInView = entry.isIntersecting;
        if (carouselInView) {
          startAutoplay();
        } else {
          stopAutoplay();
        }
      });
    }, { threshold: 0.25 });

    carouselVisibility.observe(carousel);

    const slideObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveDot(slides.indexOf(entry.target));
        }
      });
    }, { root: track, threshold: 0.62 });

    slides.forEach(slide => slideObserver.observe(slide));
    setActiveDot(0);
    startAutoplay();
  });

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

  // --- Email list signup (coming soon — not yet connected to a backend) ---
  const emailForms = document.querySelectorAll('.email-form');
  emailForms.forEach(form => {
    const btn = form.querySelector('.btn');
    const input = form.querySelector('input');
    const note = document.createElement('p');
    note.style.cssText = 'font-size:0.78rem;color:var(--chrome);margin-top:8px;';
    note.textContent = 'Email list coming soon. For now, reach us at relentlessmouthgaurds@gmail.com.';
    form.appendChild(note);

    if (btn && input) {
      btn.addEventListener('click', () => {
        if (input.value && input.value.includes('@')) {
          note.textContent = 'Thanks! We\'ll be in touch when the list launches.';
          note.style.color = 'var(--success)';
          input.value = '';
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
