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
    if (!track) return;

    // Define all slides (original 8 + 46 new photos)
    const carouselImages = [
      { img: 'assets/images/relentless-work-mafia.jpg', caption: 'Mafia Layout' },
      { img: 'assets/images/relentless-work-yoda.jpg', caption: 'Green Pop' },
      { img: 'assets/images/relentless-work-destroyer.jpg', caption: 'Destroyer Blue' },
      { img: 'assets/images/relentless-work-teeth.jpg', caption: 'Fang Layout' },
      { img: 'assets/images/relentless-work-pink.jpg', caption: 'Pink Custom' },
      { img: 'assets/images/relentless-work-yellow.jpg', caption: 'Yellow Strike' },
      { img: 'assets/images/relentless-work-usa-red.jpg', caption: 'Team Red' },
      { img: 'assets/images/relentless-work-usa-blue.jpg', caption: 'Team Blue' },
      // New PXL files from Downloads
      { img: 'assets/images/PXL_20260307_060544010~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260308_223837548~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260314_060744112~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260314_184727924~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260314_184801156~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260319_235501283~3.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260319_235906081.NIGHT~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260320_233112459~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260324_232619160~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260331_203015407~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260331_203307532~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260402_201739699~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260402_202349695~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260404_201826622~3.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260404_201939673~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260406_181947191~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260411_184249063~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260413_000041363~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260413_020614985~3.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260413_020708223~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260414_192234593~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260414_192540272~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260416_031854203~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260416_031945561~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260417_001629629~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260417_174639123~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260417_181143079~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260418_031101202~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260418_204801333~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260420_181407452.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260420_181455019~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260425_182437686~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260428_230555279~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260428_230922254~3.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260428_234820591~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260428_235020529~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260502_165301986~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260502_165411447~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260502_165430752~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260502_165542330~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260502_165648568~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260502_165727571~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260512_014753501~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260512_185346453~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260512_214341140~2.jpg', caption: 'Custom Build' },
      { img: 'assets/images/PXL_20260514_020241546~2.jpg', caption: 'Custom Build' }
    ];

    // Clear existing track HTML and rebuild dynamically
    track.innerHTML = '';
    carouselImages.forEach(slide => {
      const slideLink = document.createElement('a');
      slideLink.className = 'carousel-slide';
      slideLink.href = 'gallery.html';

      const imgEl = document.createElement('img');
      imgEl.src = slide.img;
      imgEl.alt = `${slide.caption} RELENTLESS custom mouthguard`;

      const spanEl = document.createElement('span');
      spanEl.className = 'gallery-caption';
      spanEl.textContent = slide.caption;

      slideLink.appendChild(imgEl);
      slideLink.appendChild(spanEl);
      track.appendChild(slideLink);
    });

    // Populate dots container dynamically if few slides, otherwise hide it
    const dotsContainer = carousel.querySelector('[data-carousel-dots]');
    if (dotsContainer) {
      if (carouselImages.length <= 15) {
        dotsContainer.innerHTML = '';
        carouselImages.forEach((_, index) => {
          const dotBtn = document.createElement('button');
          dotBtn.type = 'button';
          if (index === 0) dotBtn.className = 'active';
          dotBtn.setAttribute('aria-label', `Show design ${index + 1}`);
          dotsContainer.appendChild(dotBtn);
        });
      } else {
        dotsContainer.style.display = 'none';
      }
    }

    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const dots = Array.from(carousel.querySelectorAll('[data-carousel-dots] button'));
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');

    if (slides.length === 0) return;

    const autoplayDelay = 2800;
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
    }, { root: track, threshold: 0.2, rootMargin: '0px -35% 0px -35%' });

    slides.forEach(slide => slideObserver.observe(slide));
    setActiveDot(0);
    startAutoplay();
  });

  // --- Homepage package picker ---
  document.querySelectorAll('[data-package-picker]').forEach(picker => {
    const stage = picker.querySelector('.package-stage');
    const image = picker.querySelector('[data-package-image]');
    const name = picker.querySelector('[data-package-name]');
    const kicker = picker.querySelector('[data-package-kicker]');
    const price = picker.querySelector('[data-package-price]');
    const desc = picker.querySelector('[data-package-desc]');
    const choices = Array.from(picker.querySelectorAll('.package-choice'));

    if (!image || !name || !kicker || !price || !desc || choices.length === 0) return;

    const selectPackage = choice => {
      choices.forEach(btn => {
        const isActive = btn === choice;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      if (stage) stage.classList.add('is-switching');
      window.setTimeout(() => {
        image.src = choice.dataset.image;
        image.alt = choice.dataset.alt || `${choice.dataset.name} custom mouthguard package`;
        name.textContent = choice.dataset.name;
        kicker.textContent = choice.dataset.kicker;
        price.textContent = choice.dataset.price;
        desc.textContent = choice.dataset.desc;
        if (stage) stage.classList.remove('is-switching');
      }, 140);
    };

    choices.forEach(choice => {
      choice.addEventListener('click', () => selectPackage(choice));
      choice.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (choices.indexOf(choice) + direction + choices.length) % choices.length;
        choices[nextIndex].focus();
        selectPackage(choices[nextIndex]);
      });
    });
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
