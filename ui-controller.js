/**
 *
 * Coordinates CabinScene (3D background), AsciiOverlay, and MobileHandler.
 * Manages loading, typing, scroll, navigation, parallax, brain toggle,
 * sound, idle detection, time-of-day theming, and a handful of easter eggs.
 *
 * Globals expected: window.CabinScene, window.AsciiOverlay, window.MobileHandler
 * Self-initializes on DOMContentLoaded. Exports as window.UIController.
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  function throttle(fn, wait) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // -------------------------------------------------------------------------
  // Main controller
  // -------------------------------------------------------------------------

  const UI = {
    // State
    cabinScene: null,
    asciiOverlay: null,
    mobileHandler: null,
    brainActive: false,
    soundMuted: false,
    audioCtx: null,
    ambientNode: null,
    ambientGain: null,
    idleTimer: null,
    idle: false,
    scrollIndicatorClicks: 0,
    logoClicks: 0,
    konamiIndex: 0,
    japanBuffer: '',
    hasInteracted: false,
    isInsideCabin: false,
    isLaptopZoom: false,
    bottomTimer: null,

    // Typing state
    typingPhrases: ['hardware hacker', 'brain grower', 'entrepreneur'],
    brainPhrases: ['neurons', 'synapses', 'cortex', 'consciousness'],
    typingIndex: 0,
    typingCharIndex: 0,
    typingDeleting: false,
    typingTimeout: null,

    // Narration
    narrationMessages: [
      { lo: 0, hi: 0.05, text: '\u2193' },
      { lo: 0.15, hi: 0.20, text: 'approaching the cabin...' },
      { lo: 0.40, hi: 0.45, text: 'stepping inside...' },
      { lo: 0.70, hi: 0.75, text: 'take a seat.' },
    ],
    lastNarration: '',

    // Konami code
    konamiSequence: [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a',
    ],

    // -------------------------------------------------------------------
    // Init
    // -------------------------------------------------------------------

    init() {
      this.applyTimeOfDay();
      this.initAgeDisplay();
      this.initLoading();
      this.initScene();
      this.initAsciiOverlay();
      this.initMobileHandler();
      this.initTypingEffect();
      this.initScroll();
      this.initNavigation();
      this.initMouseParallax();
      this.initBrainToggle();
      this.initProjectItems();
      this.initFunFacts();
      this.initContact();
      this.initEasterEggs();
      this.initSound();
      this.initIdleDetection();
      this.initInteractiveObjects();
      this.initTerminal();
    },

    // -------------------------------------------------------------------
    // 14. Time of day
    // -------------------------------------------------------------------

    initAgeDisplay() {
      const ageEl = document.getElementById('age-display');
      if (!ageEl) return;

      const birthday = new Date(2005, 5, 9); // June 9, 2005 (month is 0-indexed)
      const updateAge = () => {
        const now = new Date();
        const diff = now - birthday;
        const years = diff / (365.25 * 24 * 60 * 60 * 1000);
        ageEl.textContent = years.toFixed(1);
      };
      updateAge();
      setInterval(updateAge, 86400000); // Update daily
    },

    applyTimeOfDay() {
      const hour = new Date().getHours();
      const isNight = hour >= 18 || hour < 6;
      document.body.classList.toggle('night-mode', isNight);
      document.body.classList.toggle('day-mode', !isNight);
    },

    // -------------------------------------------------------------------
    // 1. Loading sequence
    // -------------------------------------------------------------------

    initLoading() {
      const screen = $('#loading-screen');
      if (!screen) return;

      // Show the loop.gif loading animation, then fade out after 2.5s
      setTimeout(() => {
        screen.classList.add('loaded');
        const content = $('#main-content');
        if (content) content.style.visibility = 'visible';
      }, 2500);
    },

    // -------------------------------------------------------------------
    // Scene init
    // -------------------------------------------------------------------

    initScene() {
      if (typeof window.CabinScene === 'function') {
        try {
          this.cabinScene = new window.CabinScene();
          window.cabinScene = this.cabinScene; // expose for console / Three.js editor export
        } catch (e) {
          console.warn('CabinScene failed to initialize:', e);
        }
      }
    },

    _updateAsciiVisibility() {
      // Hide matrix rain and weather when inside the cabin
      const matrixCanvas = document.getElementById('ascii-matrix-canvas');
      const weatherCanvas = document.getElementById('ascii-weather-canvas');
      if (matrixCanvas) {
        matrixCanvas.style.opacity = this.isInsideCabin ? '0' : '0.07';
        matrixCanvas.style.transition = 'opacity 1s ease';
      }
      if (weatherCanvas) {
        weatherCanvas.style.opacity = this.isInsideCabin ? '0' : '0.04';
        weatherCanvas.style.transition = 'opacity 1s ease';
      }
    },

    laptopTerminalOpen: false,
    _laptopRAF: null,

    openLaptopTerminal() {
      const el = $('#laptop-screen-overlay');
      const input = $('#laptop-screen-input');
      const output = $('#laptop-screen-output');
      if (!el) return;

      this.laptopTerminalOpen = true;
      el.classList.add('active');

      // Welcome message
      if (output && output.children.length === 0) {
        this._laptopPrint('  dieter@cabin — terminal', 'accent-line');
        this._laptopPrint('  type "help" for commands', 'info-line');
        this._laptopPrint('', '');
      }

      // Start tracking position
      this._trackLaptopScreen();

      setTimeout(() => { if (input) input.focus(); }, 100);

      // Input handler
      if (input && !input._bound) {
        input._bound = true;
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const cmd = input.value.trim();
            input.value = '';
            if (cmd) {
              this._laptopPrint('> ' + cmd, 'cmd-line');
              this.processCommand(cmd);
            }
          }
          e.stopPropagation();
        });
      }
    },

    closeLaptopTerminal() {
      const el = $('#laptop-screen-overlay');
      if (!el) return;
      this.laptopTerminalOpen = false;
      el.classList.remove('active');
      if (this._laptopRAF) {
        cancelAnimationFrame(this._laptopRAF);
        this._laptopRAF = null;
      }
    },

    _laptopPrint(text, className) {
      const output = $('#laptop-screen-output');
      if (!output) return;
      const line = document.createElement('div');
      if (className) line.className = className;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    },

    _trackLaptopScreen() {
      const el = $('#laptop-screen-overlay');
      if (!el || !this.cabinScene) return;

      const update = () => {
        if (!this.laptopTerminalOpen) return;

        const rect = this.cabinScene.getLaptopScreenRect();
        if (rect && rect.width > 20 && rect.height > 15) {
          el.style.left = rect.left + 'px';
          el.style.top = rect.top + 'px';
          el.style.width = rect.width + 'px';
          el.style.height = rect.height + 'px';
          const fs = Math.max(6, Math.min(13, rect.height / 20));
          el.style.fontSize = fs + 'px';
        }

        this._laptopRAF = requestAnimationFrame(update);
      };
      this._laptopRAF = requestAnimationFrame(update);
    },

    initAsciiOverlay() {
      if (typeof window.AsciiOverlay === 'function') {
        try {
          this.asciiOverlay = new window.AsciiOverlay();
          this.asciiOverlay.init();
          const tick = () => {
            this.asciiOverlay.update();
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        } catch (e) {
          console.warn('AsciiOverlay failed:', e);
        }
      }
    },

    initMobileHandler() {
      if (typeof window.MobileHandler === 'function') {
        try {
          const isMobile = 'ontouchstart' in window;
          this.mobileHandler = new window.MobileHandler({
            onParallax: isMobile ? (x, y) => {
              if (this.cabinScene) this.cabinScene.onMouseMove(x, y);
            } : () => {},
            onSwipe: () => {},
          });
          this.mobileHandler.init();
        } catch (e) {
          console.warn('MobileHandler failed:', e);
        }
      }
    },

    // -------------------------------------------------------------------
    // 2. Typing effect
    // -------------------------------------------------------------------

    initTypingEffect() {
      this.typedEl = $('#typed-text');
      if (!this.typedEl) return;
      this.typeNext();
    },

    getCurrentPhrases() {
      return this.brainActive ? this.brainPhrases : this.typingPhrases;
    },

    typeNext() {
      const phrases = this.getCurrentPhrases();
      const word = phrases[this.typingIndex % phrases.length];

      if (!this.typingDeleting) {
        // Typing forward
        this.typedEl.textContent = word.slice(0, this.typingCharIndex + 1);
        this.typingCharIndex++;

        if (this.typingCharIndex >= word.length) {
          // Pause longer then delete
          this.typingTimeout = setTimeout(() => {
            this.typingDeleting = true;
            this.typeNext();
          }, 4000);
          return;
        }
        this.typingTimeout = setTimeout(() => this.typeNext(), 120);
      } else {
        // Deleting
        this.typingCharIndex--;
        this.typedEl.textContent = word.slice(0, this.typingCharIndex);

        if (this.typingCharIndex <= 0) {
          this.typingDeleting = false;
          this.typingIndex++;
          this.typingTimeout = setTimeout(() => this.typeNext(), 600);
          return;
        }
        this.typingTimeout = setTimeout(() => this.typeNext(), 50);
      }
    },

    // -------------------------------------------------------------------
    // 3. Scroll handling
    // -------------------------------------------------------------------

    initScroll() {
      const handler = throttle(() => this.onScroll(), 16);
      window.addEventListener('scroll', handler, { passive: true });
      this.initSectionObserver();
      // Run once
      this.onScroll();
    },

    onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? clamp(scrollTop / docHeight, 0, 1) : 0;

      // Track if user is inside the cabin (roughly scroll > 0.4)
      const wasInside = this.isInsideCabin;
      this.isInsideCabin = progress > 0.4;
      if (wasInside !== this.isInsideCabin) {
        document.body.classList.toggle('inside-cabin', this.isInsideCabin);
        this._updateAsciiVisibility();
      }

      // Track laptop zoom state (scroll > 0.75 = zooming into laptop)
      const wasLaptopZoom = this.isLaptopZoom;
      this.isLaptopZoom = progress > 0.75;
      if (wasLaptopZoom !== this.isLaptopZoom) {
        document.body.classList.toggle('laptop-zoom', this.isLaptopZoom);
        // Auto-open laptop terminal when zooming in, close when scrolling away
        if (this.isLaptopZoom && progress > 0.9) {
          this.openLaptopTerminal();
        } else if (!this.isLaptopZoom && this.laptopTerminalOpen) {
          this.closeLaptopTerminal();
        }
      }

      // Forward to scene
      if (this.cabinScene) this.cabinScene.onScroll(progress);

      // Active nav link
      this.updateActiveNav();

      // Depth blur + grey fog effect - starts very blurry/grey, clears as you scroll
      const blurAmount = progress < 0.3 ? (1 - progress / 0.3) * 6 : 0;
      document.documentElement.style.setProperty('--scene-blur', blurAmount.toFixed(2) + 'px');
      // Grey overlay that fades out as you scroll
      const greyOpacity = progress < 0.25 ? (1 - progress / 0.25) * 0.55 : 0;
      document.documentElement.style.setProperty('--intro-grey', greyOpacity.toFixed(3));

      // CSS variable for parallax
      $$('.section').forEach((sec) => {
        const rect = sec.getBoundingClientRect();
        const ratio = clamp(rect.top / window.innerHeight, -1, 1);
        sec.style.setProperty('--scroll-y', ratio.toFixed(3));
      });

      // Scroll narration
      this.updateNarration(progress);

      // Bottom detection
      this.checkBottomReached(progress);
    },

    updateActiveNav() {
      const sections = $$('#hero, #about, #projects, #contact');
      let currentId = '';

      for (const sec of sections) {
        const rect = sec.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.4) {
          currentId = sec.id;
        }
      }

      $$('.nav-link').forEach((link) => {
        link.classList.toggle('active', link.dataset.section === currentId);
      });
    },

    initSectionObserver() {
      if (prefersReducedMotion()) {
        // Just show everything immediately
        $$('.section-inner').forEach((el) => el.classList.add('visible'));
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              // Stagger children
              const children = entry.target.querySelectorAll(
                '.project-row, .fun-fact, .note-item, .social-link'
              );
              children.forEach((child, i) => {
                setTimeout(() => child.classList.add('revealed'), i * 80);
              });
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      $$('.section-inner').forEach((el) => observer.observe(el));
    },

    // -------------------------------------------------------------------
    // 12. Scroll narration
    // -------------------------------------------------------------------

    updateNarration(progress) {
      let narrationEl = $('#scroll-narration');
      if (!narrationEl) {
        narrationEl = document.createElement('div');
        narrationEl.id = 'scroll-narration';
        narrationEl.setAttribute('aria-hidden', 'true');
        Object.assign(narrationEl.style, {
          position: 'fixed',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          opacity: '0',
          transition: 'opacity 0.6s',
          pointerEvents: 'none',
          color: 'var(--color-text-muted, #888)',
          zIndex: '10',
          fontFamily: 'inherit',
        });
        document.body.appendChild(narrationEl);
      }

      let msg = '';
      for (const n of this.narrationMessages) {
        if (progress >= n.lo && progress <= n.hi) {
          msg = n.text;
          break;
        }
      }

      if (msg && msg !== this.lastNarration) {
        narrationEl.textContent = msg;
        narrationEl.style.opacity = '1';
        this.lastNarration = msg;
        clearTimeout(this._narrationFade);
        this._narrationFade = setTimeout(() => {
          narrationEl.style.opacity = '0';
        }, 2500);
      } else if (!msg && this.lastNarration) {
        narrationEl.style.opacity = '0';
        this.lastNarration = '';
      }
    },

    // -------------------------------------------------------------------
    // Bottom detection (easter egg 5)
    // -------------------------------------------------------------------

    checkBottomReached(progress) {
      if (progress >= 0.99) {
        if (!this.bottomTimer) {
          this.bottomTimer = setTimeout(() => {
            this.showBottomMessage();
          }, 5000);
        }
      } else {
        clearTimeout(this.bottomTimer);
        this.bottomTimer = null;
      }
    },

    showBottomMessage() {
      // Disabled - no bottom message
      return;
      if ($('#bottom-secret')) return;
      const el = document.createElement('div');
      el.id = 'bottom-secret';
      el.textContent = "thanks for scrolling all the way down. you're cool.";
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '0.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '0.65rem',
        color: 'var(--color-text-muted, #777)',
        opacity: '0',
        transition: 'opacity 1s',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      });
      document.body.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 1200);
      }, 5000);
    },

    // -------------------------------------------------------------------
    // 4. Navigation
    // -------------------------------------------------------------------

    initNavigation() {
      // Nav links smooth scroll
      $$('.nav-link').forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = link.dataset.section;
          const el = document.getElementById(target);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            this.playClickSound();
          }
        });
      });

      // Hamburger
      const hamburger = $('#hamburger-btn');
      const mobileMenu = $('#mobile-menu-overlay');

      if (hamburger && mobileMenu) {
        hamburger.addEventListener('click', () => {
          const open = mobileMenu.classList.toggle('open');
          hamburger.classList.toggle('open', open);
          document.body.classList.toggle('menu-open', open);
        });

        $$('.mobile-nav-link', mobileMenu).forEach((link) => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.section;
            const el = document.getElementById(target);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            this.playClickSound();
            // Keep menu open so user can tap multiple links
          });
        });
      }
    },

    // -------------------------------------------------------------------
    // 5. Mouse parallax
    // -------------------------------------------------------------------

    initMouseParallax() {
      window.addEventListener('mousemove', throttle((e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        if (this.cabinScene) this.cabinScene.onMouseMove(x, y);
        document.documentElement.style.setProperty('--cursor-x', x.toFixed(3));
        document.documentElement.style.setProperty('--cursor-y', y.toFixed(3));
      }, 16), { passive: true });
    },

    // -------------------------------------------------------------------
    // 6. Brain toggle
    // -------------------------------------------------------------------

    initBrainToggle() {
      const btn = $('#brain-toggle');
      if (!btn) return;

      btn.addEventListener('click', () => {
        this.brainActive = !this.brainActive;
        document.body.classList.toggle('brain-active', this.brainActive);
        if (this.cabinScene) this.cabinScene.toggleBrain(this.brainActive);

        // Reset typing to start fresh with new phrases
        clearTimeout(this.typingTimeout);
        this.typingIndex = 0;
        this.typingCharIndex = 0;
        this.typingDeleting = false;
        if (this.typedEl) {
          this.typedEl.textContent = '';
          this.typeNext();
        }
      });
    },

    // -------------------------------------------------------------------
    // 7. Project items
    // -------------------------------------------------------------------

    initProjectItems() {
      const isMobile = 'ontouchstart' in window;

      $$('.project-row').forEach((item) => {
        if (isMobile) {
          item.addEventListener('click', () => {
            // Toggle expand on mobile
            const wasExpanded = item.classList.contains('expanded');
            $$('.project-row.expanded').forEach((el) => el.classList.remove('expanded'));
            if (!wasExpanded) item.classList.add('expanded');
          });
        } else {
          item.addEventListener('mouseenter', () => item.classList.add('hovered'));
          item.addEventListener('mouseleave', () => item.classList.remove('hovered'));
        }
      });
    },

    // -------------------------------------------------------------------
    // 8. Fun facts
    // -------------------------------------------------------------------

    initFunFacts() {
      $$('.fun-fact').forEach((fact) => {
        fact.addEventListener('click', () => {
          // Show tooltip with data-detail attribute if present
          const detail = fact.dataset.detail;
          if (!detail) return;

          // Remove any existing tooltip
          const existing = fact.querySelector('.fact-tooltip');
          if (existing) { existing.remove(); return; }

          const tip = document.createElement('span');
          tip.className = 'fact-tooltip';
          tip.textContent = detail;
          Object.assign(tip.style, {
            display: 'block',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted, #999)',
            marginTop: '0.25rem',
            opacity: '0',
            transition: 'opacity 0.3s',
          });
          fact.appendChild(tip);
          requestAnimationFrame(() => { tip.style.opacity = '1'; });

          setTimeout(() => {
            tip.style.opacity = '0';
            setTimeout(() => tip.remove(), 300);
          }, 3000);
        });
      });
    },

    // -------------------------------------------------------------------
    // 9. Contact
    // -------------------------------------------------------------------

    initContact() {
      const emailLink = $('.contact-email a');
      if (!emailLink) return;

      emailLink.addEventListener('click', (e) => {
        e.preventDefault();
        const email = emailLink.href.replace('mailto:', '');
        navigator.clipboard.writeText(email).then(() => {
          const original = emailLink.textContent;
          emailLink.textContent = 'copied!';
          emailLink.classList.add('copied');
          setTimeout(() => {
            emailLink.textContent = original;
            emailLink.classList.remove('copied');
          }, 1500);
        }).catch(() => {
          window.location.href = emailLink.href;
        });
      });
    },

    // -------------------------------------------------------------------
    // 10. Easter eggs
    // -------------------------------------------------------------------

    initEasterEggs() {
      // Konami code
      window.addEventListener('keydown', (e) => {
        if (e.key === this.konamiSequence[this.konamiIndex]) {
          this.konamiIndex++;
          if (this.konamiIndex >= this.konamiSequence.length) {
            this.konamiIndex = 0;
            this.triggerBrain();
          }
        } else {
          this.konamiIndex = 0;
        }
      });

      // Logo click 5 times
      const logo = $('.hero-name');
      if (logo) {
        logo.addEventListener('click', () => {
          this.logoClicks++;
          if (this.logoClicks >= 5) {
            this.logoClicks = 0;
            this.invertColors();
          }
        });
      }

      // Type "japan" anywhere
      window.addEventListener('keypress', (e) => {
        this.japanBuffer += e.key.toLowerCase();
        if (this.japanBuffer.length > 10) {
          this.japanBuffer = this.japanBuffer.slice(-10);
        }
        if (this.japanBuffer.includes('japan')) {
          this.japanBuffer = '';
          this.emojiRain('\ud83c\uddef\ud83c\uddf5');
        }
      });

      // Scroll indicator click 3 times
      const scrollIndicator = $('.scroll-indicator');
      if (scrollIndicator) {
        scrollIndicator.addEventListener('click', () => {
          this.scrollIndicatorClicks++;
          if (this.scrollIndicatorClicks >= 3) {
            this.scrollIndicatorClicks = 0;
            this.showSecret("you found a secret. here's a cookie: \ud83c\udf6a");
          }
        });
      }
    },

    triggerBrain() {
      if (!this.brainActive) {
        this.brainActive = true;
        document.body.classList.add('brain-active');
        if (this.cabinScene) this.cabinScene.toggleBrain(true);
        clearTimeout(this.typingTimeout);
        this.typingIndex = 0;
        this.typingCharIndex = 0;
        this.typingDeleting = false;
        if (this.typedEl) {
          this.typedEl.textContent = '';
          this.typeNext();
        }
      }
    },

    invertColors() {
      document.body.style.filter = 'invert(1)';
      setTimeout(() => {
        document.body.style.filter = '';
      }, 1500);
    },

    emojiRain(emoji) {
      const count = 30;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.textContent = emoji;
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
          position: 'fixed',
          left: Math.random() * 100 + 'vw',
          top: '-2rem',
          fontSize: (1 + Math.random()) + 'rem',
          pointerEvents: 'none',
          zIndex: '9999',
          transition: 'none',
          animation: 'none',
        });
        document.body.appendChild(el);

        const delay = Math.random() * 1000;
        const duration = 2000 + Math.random() * 1500;

        setTimeout(() => {
          el.style.transition = `top ${duration}ms linear, opacity 0.5s`;
          el.style.top = '110vh';
        }, delay);

        setTimeout(() => {
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 600);
        }, delay + duration - 400);
      }
    },

    showSecret(msg) {
      const el = document.createElement('div');
      el.textContent = msg;
      Object.assign(el.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        padding: '1rem 2rem',
        background: 'var(--color-bg-dark, #111a16)',
        color: 'var(--color-text-primary, #e8e4df)',
        borderRadius: '0.5rem',
        fontSize: '0.9rem',
        zIndex: '9999',
        opacity: '0',
        transition: 'opacity 0.5s',
        pointerEvents: 'none',
        fontFamily: 'inherit',
      });
      document.body.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; });
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 600);
      }, 3000);
    },

    // -------------------------------------------------------------------
    // 11. Sound
    // -------------------------------------------------------------------

    initSound() {
      if (prefersReducedMotion()) return;

      // Create mute toggle
      this.createMuteButton();

      // Start ambient on first interaction
      const startAudio = () => {
        if (this.hasInteracted) return;
        this.hasInteracted = true;
        this.initAudioContext();
        window.removeEventListener('click', startAudio);
        window.removeEventListener('keydown', startAudio);
        window.removeEventListener('touchstart', startAudio);
      };
      window.addEventListener('click', startAudio, { once: false });
      window.addEventListener('keydown', startAudio, { once: false });
      window.addEventListener('touchstart', startAudio, { once: false });
    },

    createMuteButton() {
      // Only create if one doesn't already exist in the HTML
      if ($('#sound-toggle')) {
        $('#sound-toggle').addEventListener('click', () => this.toggleMute());
        return;
      }

      const btn = document.createElement('button');
      btn.id = 'sound-toggle';
      btn.setAttribute('aria-label', 'Toggle sound');
      btn.textContent = '\u266a';
      Object.assign(btn.style, {
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        width: '2rem',
        height: '2rem',
        border: 'none',
        background: 'transparent',
        color: 'var(--color-text-muted, #888)',
        fontSize: '1rem',
        cursor: 'pointer',
        opacity: '0.5',
        transition: 'opacity 0.3s',
        zIndex: '50',
        fontFamily: 'inherit',
      });
      btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9'; });
      btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.5'; });
      btn.addEventListener('click', () => this.toggleMute());
      document.body.appendChild(btn);
    },

    toggleMute() {
      this.soundMuted = !this.soundMuted;
      const btn = $('#sound-toggle');
      if (btn) btn.style.opacity = this.soundMuted ? '0.2' : '0.5';
      if (this.ambientGain) {
        this.ambientGain.gain.setTargetAtTime(
          this.soundMuted ? 0 : 0.015,
          this.audioCtx.currentTime,
          0.3
        );
      }
    },

    initAudioContext() {
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.startAmbient();
      } catch (e) {
        console.warn('AudioContext unavailable:', e);
      }
    },

    startAmbient() {
      if (!this.audioCtx || this.soundMuted) return;

      // Ambient wind/forest: filtered noise
      const bufferSize = this.audioCtx.sampleRate * 4;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 0.5;

      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.value = 0;

      noise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.audioCtx.destination);
      noise.start();

      // Fade in gently
      this.ambientGain.gain.setTargetAtTime(0.015, this.audioCtx.currentTime, 1.0);
      this.ambientNode = noise;
    },

    playClickSound() {
      if (!this.audioCtx || this.soundMuted) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 800;
        gain.gain.value = 0.02;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.setTargetAtTime(0, this.audioCtx.currentTime + 0.03, 0.01);
        osc.stop(this.audioCtx.currentTime + 0.05);
      } catch (e) {
        // Silently fail
      }
    },

    // -------------------------------------------------------------------
    // 13. Idle detection
    // -------------------------------------------------------------------

    initIdleDetection() {
      const resetIdle = () => {
        if (this.idle) {
          this.idle = false;
          document.body.classList.remove('idle');
        }
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
          this.idle = true;
          document.body.classList.add('idle');
        }, 30000);
      };

      ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'].forEach((evt) => {
        window.addEventListener(evt, throttle(resetIdle, 1000), { passive: true });
      });

      resetIdle();
    },

    // -------------------------------------------------------------------
    // 15. Interactive 3D objects (TV + laptop click)
    // -------------------------------------------------------------------

    initInteractiveObjects() {
      const canvas = document.getElementById('cabin-canvas');
      if (!canvas) return;

      this._hoverHint = null;

      // Hover: show tooltip + cursor change
      canvas.addEventListener('mousemove', (e) => {
        if (!this.cabinScene) return;
        const hit = this.cabinScene.getInteractiveAt(e.clientX, e.clientY);

        if (hit) {
          canvas.style.cursor = 'pointer';
          this._showHoverHint(e.clientX, e.clientY, hit === 'tv' ? 'watch kodan' : 'open terminal');
        } else {
          canvas.style.cursor = '';
          this._hideHoverHint();
        }
      });

      // Click: open link or terminal
      canvas.addEventListener('click', (e) => {
        if (!this.cabinScene) return;
        const hit = this.cabinScene.getInteractiveAt(e.clientX, e.clientY);

        if (hit === 'tv') {
          window.open('https://serenityux.github.io/kodan-desktop-site/', '_blank');
          this.playClickSound();
        } else if (hit === 'laptop') {
          this.openLaptopTerminal();
          this.playClickSound();
        }
      });
    },

    _showHoverHint(x, y, text) {
      if (!this._hoverHint) {
        this._hoverHint = document.createElement('div');
        this._hoverHint.className = 'tv-hover-hint';
        document.body.appendChild(this._hoverHint);
      }
      this._hoverHint.textContent = text;
      this._hoverHint.style.left = (x + 14) + 'px';
      this._hoverHint.style.top = (y - 10) + 'px';
      this._hoverHint.style.display = 'block';
    },

    _hideHoverHint() {
      if (this._hoverHint) {
        this._hoverHint.style.display = 'none';
      }
    },

    // -------------------------------------------------------------------
    // 16. Terminal
    // -------------------------------------------------------------------

    terminalOpen: false,
    _terminalManualClose: false,
    terminalHistory: [],

    initTerminal() {
      const overlay = $('#terminal-overlay');
      const closeBtn = $('#terminal-close');
      const input = $('#terminal-input');
      if (!overlay) return;

      // Close handlers
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeTerminal());
      }
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeTerminal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.laptopTerminalOpen) this.closeLaptopTerminal();
          else if (this.terminalOpen) this.closeTerminal();
        }
      });

      // Input handler
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const cmd = input.value.trim();
            input.value = '';
            if (cmd) this.processCommand(cmd);
          }
        });
      }
    },

    openTerminal() {
      const overlay = $('#terminal-overlay');
      const input = $('#terminal-input');
      const output = $('#terminal-output');
      if (!overlay) return;

      this.terminalOpen = true;
      overlay.style.display = 'flex';

      // Show welcome message
      if (output && output.children.length === 0) {
        this.terminalPrint('', 'info-line');
        this.terminalPrint('  dieter@cabin — personal terminal', 'accent-line');
        this.terminalPrint('  type "help" for commands', 'info-line');
        this.terminalPrint('', '');
      }

      setTimeout(() => { if (input) input.focus(); }, 100);
    },

    closeTerminal() {
      const overlay = $('#terminal-overlay');
      if (!overlay) return;
      this.terminalOpen = false;
      this._terminalManualClose = true;
      overlay.style.display = 'none';
      this._hideHoverHint();
    },

    terminalPrint(text, className) {
      const output = $('#terminal-output');
      if (!output) return;
      const line = document.createElement('div');
      if (className) line.className = className;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    },

    terminalPrintHTML(html) {
      const output = $('#terminal-output');
      if (!output) return;
      const line = document.createElement('div');
      line.innerHTML = html;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    },

    // Route print to whichever terminal is active
    _print(text, className) {
      if (this.laptopTerminalOpen) {
        this._laptopPrint(text, className);
      } else {
        this.terminalPrint(text, className);
      }
    },

    _printHTML(html) {
      if (this.laptopTerminalOpen) {
        // For laptop terminal, use innerHTML too
        const output = $('#laptop-screen-output');
        if (!output) return;
        const line = document.createElement('div');
        line.innerHTML = html;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
      } else {
        this.terminalPrintHTML(html);
      }
    },

    processCommand(cmd) {
      // Echo the command
      this._print('dieter@cabin ~ % ' + cmd, 'cmd-line');

      const args = cmd.toLowerCase().split(/\s+/);
      const command = args[0];

      switch (command) {
        case 'help':
          this._print('', '');
          this._print('  available commands:', 'info-line');
          this._print('  help        — show this menu', '');
          this._print('  about       — who is dieter?', '');
          this._print('  projects    — things i\'ve built', '');
          this._print('  socials     — find me online', '');
          this._print('  kodan       — learn about kodan', '');
          this._print('  brain       — toggle brain viz', '');
          this._print('  facts       — fun facts', '');
          this._print('  ls          — list files', '');
          this._print('  cat <file>  — read a file', '');
          this._print('  clear       — clear terminal', '');
          this._print('  exit        — close terminal', '');
          this._print('', '');
          break;

        case 'about':
          this._print('', '');
          this._print('  dieter schoening', 'accent-line');
          this._print('  20 · builder · filmer · creative', 'info-line');
          this._print('', '');
          this._print('  i build things, film things, and', '');
          this._print('  occasionally break things.', '');
          this._print('  building in stealth. interested in software + science.', '');
          this._print('  dieter@serenidad.app', '');
          this._print('', '');
          break;

        case 'projects':
          this._print('', '');
          this._print('  things i\'ve built:', 'info-line');
          this._print('  ├── kodan         — ai anime platform', '');
          this._print('  ├── serendiad     — podcast + community (170+ eps)', '');
          this._print('  ├── minimalmaru   — anime clothing (7 figures)', '');
          this._print('  ├── laser speaker — audio through lasers', '');
          this._print('  ├── giant microwave — exactly what it sounds like', '');
          this._print('  ├── life of chai  — VR puzzle game', '');
          this._print('  └── japan build   — 2 months in rural japan', '');
          this._print('', '');
          this._print('  type a project name for more info', 'info-line');
          this._print('', '');
          break;

        case 'kodan':
          this._print('', '');
          this._print('  kōdan', 'accent-line');
          this._print('  AI anime platform. built over 2 months in rural japan.', '');
          this._print('', '');
          this._printHTML('  <span class="link-line" onclick="window.open(\'https://serenityux.github.io/kodan-desktop-site/\',\'_blank\')">→ visit kodan</span>');
          this._print('', '');
          break;

        case 'socials':
          this._print('', '');
          this._print('  find me:', 'info-line');
          this._printHTML('  <span class="link-line" onclick="window.open(\'https://twitter.com/dieterzsh\',\'_blank\')">twitter  @dieterzsh</span>');
          this._printHTML('  <span class="link-line" onclick="window.open(\'https://youtube.com/@dieterschoe\',\'_blank\')">youtube  @dieterschoe</span>');
          this._printHTML('  <span class="link-line" onclick="window.open(\'https://github.com/deetschoe\',\'_blank\')">github   deetschoe</span>');
          this._print('', '');
          break;

        case 'brain':
          this.brainActive = !this.brainActive;
          document.body.classList.toggle('brain-active', this.brainActive);
          if (this.cabinScene) this.cabinScene.toggleBrain(this.brainActive);
          this._print('  brain visualization ' + (this.brainActive ? 'activated' : 'deactivated'), 'accent-line');
          break;

        case 'facts':
          this._print('', '');
          this._print('  fun facts:', 'info-line');
          this._print('  · ran a 7-figure clothing brand in high school', '');
          this._print('  · 170+ podcast episodes with my friend thomas', '');
          this._print('  · spent 2 months in rural japan building software', '');
          this._print('  · currently trying to build a human brain', '');
          this._print('', '');
          break;

        case 'ls':
          this._print('', '');
          this._print('  about.txt    projects/    socials.txt', 'info-line');
          this._print('  brain.sh     kodan/       readme.md', 'info-line');
          this._print('', '');
          break;

        case 'cat':
          if (args[1] === 'readme.md' || args[1] === 'readme') {
            this._print('', '');
            this._print('  # dieter', 'accent-line');
            this._print('  builder of weird things.', '');
            this._print('  filmmaker. creative. 20.', '');
            this._print('  currently in japan.', '');
            this._print('', '');
          } else if (args[1] === 'about.txt' || args[1] === 'about') {
            this.processCommand('about');
          } else if (args[1] === 'socials.txt' || args[1] === 'socials') {
            this.processCommand('socials');
          } else {
            this._print('  cat: ' + (args[1] || '???') + ': no such file', '');
          }
          break;

        case 'clear':
          if (this.laptopTerminalOpen) {
            const lOutput = $('#laptop-screen-output');
            if (lOutput) lOutput.innerHTML = '';
          } else {
            const output = $('#terminal-output');
            if (output) output.innerHTML = '';
          }
          break;

        case 'exit':
        case 'quit':
        case 'q':
          if (this.laptopTerminalOpen) this.closeLaptopTerminal();
          else this.closeTerminal();
          break;

        case 'sudo':
          this._print('  nice try.', 'accent-line');
          break;

        case 'neofetch':
          this._print('', '');
          this._print('       /\\        dieter@cabin', 'accent-line');
          this._print('      /  \\       -----------', 'accent-line');
          this._print('     / /\\ \\      OS: macOS (in a cabin)', '');
          this._print('    / /  \\ \\     Shell: dieter-terminal 1.0', '');
          this._print('   /________\\    Host: rural japan', '');
          this._print('   |  _  _  |    Uptime: 20 years', '');
          this._print('   | |_||_| |    Projects: 8+', '');
          this._print('   |________|    Coffee: always', '');
          this._print('', '');
          break;

        default:
          this._print('  command not found: ' + command, '');
          this._print('  type "help" for available commands', 'info-line');
          break;
      }
    },

  };

  // -------------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------------

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
  } else {
    UI.init();
  }

  window.UIController = UI;
})();
