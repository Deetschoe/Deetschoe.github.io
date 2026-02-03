/**
 * MobileHandler - Mobile/Touch handler for a Three.js castle-themed personal website.
 * Handles all mobile-specific behavior: touch, orientation, performance, viewport, scroll, menu.
 * Vanilla JS, no imports.
 */

class MobileHandler {
  constructor(callbacks = {}) {
    // Callbacks
    this.onParallax = callbacks.onParallax || null;
    this.onSwipe = callbacks.onSwipe || null;

    // Device detection properties
    this.isMobile = false;
    this.isTablet = false;
    this.hasTouch = false;
    this.hasOrientation = false;

    // Parallax state
    this._parallax = { x: 0, y: 0 };
    this._targetParallax = { x: 0, y: 0 };
    this._lerpFactor = 0.08;

    // Touch tracking
    this._touchStart = { x: 0, y: 0, time: 0 };
    this._swipeThreshold = 50;
    this._swipeTimeLimit = 300;

    // Orientation state
    this._orientationPermission = false;
    this._orientationData = { alpha: 0, beta: 0, gamma: 0 };

    // Menu state
    this._menuOpen = false;
    this._menuEl = null;
    this._menuToggleEl = null;
    this._edgeSwipeZone = 30; // px from left edge to trigger menu swipe
    this._bodyScrollTop = 0;

    // Scroll snap
    this._snapEnabled = false;
    this._snapSections = [];

    // Performance tier cache
    this._performanceTier = null;

    // Bound handlers (for cleanup)
    this._bound = {};

    // Animation frame id for parallax lerp
    this._rafId = null;

    // Reduced motion preference
    this.prefersReducedMotion = false;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Initialize all mobile handling. Call once after DOM is ready.
   */
  init() {
    this._detectDevice();
    this._detectReducedMotion();
    this._setupViewport();
    this._setupTouchHandling();
    this._setupOrientation();
    this._setupScrollHandling();
    // Menu handling is delegated to UIController to avoid conflicts
    // this._setupMenuHandling();
    this._setupAccessibility();
    this._startParallaxLoop();
  }

  /**
   * Returns current parallax values normalized to -1..1.
   */
  getParallaxValues() {
    return { x: this._parallax.x, y: this._parallax.y };
  }

  /**
   * Returns recommended performance settings based on device capability.
   */
  getPerformanceSettings() {
    if (this._performanceTier) {
      return this._performanceTier;
    }
    this._performanceTier = this._detectPerformanceTier();
    return this._performanceTier;
  }

  /**
   * Request device orientation permission (needed on iOS 13+).
   * Returns a promise that resolves to true if granted.
   */
  async requestOrientationPermission() {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        var result = await DeviceOrientationEvent.requestPermission();
        this._orientationPermission = result === 'granted';
        if (this._orientationPermission) {
          this._bindOrientationListener();
        }
        return this._orientationPermission;
      } catch (e) {
        console.warn('MobileHandler: Orientation permission denied.', e);
        return false;
      }
    }
    // Non-iOS or older — permission not needed
    return true;
  }

  /**
   * Enable or disable scroll snap for sections.
   * @param {boolean} enabled
   * @param {string} sectionSelector - CSS selector for snap sections
   */
  setScrollSnap(enabled, sectionSelector) {
    this._snapEnabled = enabled;
    if (enabled && sectionSelector) {
      this._snapSections = Array.from(document.querySelectorAll(sectionSelector));
      document.documentElement.style.scrollSnapType = 'y mandatory';
      this._snapSections.forEach(function (section) {
        section.style.scrollSnapAlign = 'start';
      });
    } else {
      document.documentElement.style.scrollSnapType = '';
      this._snapSections.forEach(function (section) {
        section.style.scrollSnapAlign = '';
      });
      this._snapSections = [];
    }
  }

  /**
   * Clean up all event listeners and state.
   */
  destroy() {
    // Cancel animation frame
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Remove touch listeners
    if (this._bound.touchStart) {
      document.removeEventListener('touchstart', this._bound.touchStart, { passive: false });
    }
    if (this._bound.touchMove) {
      document.removeEventListener('touchmove', this._bound.touchMove, { passive: false });
    }
    if (this._bound.touchEnd) {
      document.removeEventListener('touchend', this._bound.touchEnd);
    }

    // Remove orientation listener
    if (this._bound.orientation) {
      window.removeEventListener('deviceorientation', this._bound.orientation);
    }

    // Remove resize / orientation change
    if (this._bound.resize) {
      window.removeEventListener('resize', this._bound.resize);
    }
    if (this._bound.orientationChange) {
      window.removeEventListener('orientationchange', this._bound.orientationChange);
    }

    // Remove reduced motion listener
    if (this._bound.reducedMotionQuery) {
      this._bound.reducedMotionQuery.removeEventListener('change', this._bound.reducedMotionChange);
    }

    // Remove menu listeners
    if (this._bound.menuToggle && this._menuToggleEl) {
      this._menuToggleEl.removeEventListener('click', this._bound.menuToggle);
    }
    if (this._bound.menuOverlayClick) {
      document.removeEventListener('click', this._bound.menuOverlayClick);
    }

    // Remove double-tap prevention
    if (this._bound.preventDoubleTapZoom) {
      document.removeEventListener('touchend', this._bound.preventDoubleTapZoom);
    }

    // Reset scroll snap
    this.setScrollSnap(false);

    // Unlock body scroll if locked
    this._unlockBodyScroll();

    // Remove CSS custom properties
    document.documentElement.style.removeProperty('--vh');
    document.documentElement.style.removeProperty('--safe-area-top');
    document.documentElement.style.removeProperty('--safe-area-bottom');
  }

  // ---------------------------------------------------------------------------
  // Device Detection
  // ---------------------------------------------------------------------------

  _detectDevice() {
    var ua = navigator.userAgent || '';

    // Touch capability
    this.hasTouch = 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;

    // Mobile detection via UA and screen
    var mobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    var smallScreen = window.innerWidth <= 768;
    this.isMobile = mobileUA || (this.hasTouch && smallScreen);

    // Tablet detection
    var tabletUA = /iPad|Android(?!.*Mobile)/i.test(ua);
    var midScreen = window.innerWidth > 768 && window.innerWidth <= 1024;
    this.isTablet = tabletUA || (this.hasTouch && midScreen);

    // Also treat iPads reporting as desktop Safari (iPadOS 13+)
    if (!this.isTablet && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
      this.isTablet = true;
    }

    // Orientation support
    this.hasOrientation = 'DeviceOrientationEvent' in window;
  }

  _detectReducedMotion() {
    var query = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion = query.matches;
    this._bound.reducedMotionQuery = query;
    this._bound.reducedMotionChange = function (e) {
      this.prefersReducedMotion = e.matches;
    }.bind(this);
    query.addEventListener('change', this._bound.reducedMotionChange);
  }

  // ---------------------------------------------------------------------------
  // Performance Detection
  // ---------------------------------------------------------------------------

  _detectPerformanceTier() {
    var score = 0;

    // Device memory (GB) — Chrome only
    var mem = navigator.deviceMemory || 4;
    if (mem >= 8) score += 3;
    else if (mem >= 4) score += 2;
    else score += 1;

    // Hardware concurrency (logical cores)
    var cores = navigator.hardwareConcurrency || 4;
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;

    // Connection type — Navigator.connection (Chrome only)
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      var effectiveType = conn.effectiveType || '4g';
      if (effectiveType === '4g') score += 2;
      else if (effectiveType === '3g') score += 1;
      else score += 0;
    } else {
      score += 2; // assume decent connection
    }

    // Desktop bonus
    if (!this.isMobile && !this.isTablet) {
      score += 2;
    }

    // Tier thresholds
    if (score <= 4) {
      // Low-end mobile
      return {
        tier: 'low',
        pixelRatio: 1,
        particles: 50,
        shadows: false,
        antialias: false
      };
    } else if (score <= 7) {
      // Mid-range
      return {
        tier: 'mid',
        pixelRatio: 1.5,
        particles: 100,
        shadows: false,
        antialias: true
      };
    } else {
      // High-end / desktop
      return {
        tier: 'high',
        pixelRatio: window.devicePixelRatio || 1,
        particles: 200,
        shadows: true,
        antialias: true
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Viewport Handling
  // ---------------------------------------------------------------------------

  _setupViewport() {
    this._updateViewportHeight();
    this._updateSafeAreaInsets();

    this._bound.resize = this._onResize.bind(this);
    this._bound.orientationChange = this._onOrientationChange.bind(this);

    window.addEventListener('resize', this._bound.resize);
    window.addEventListener('orientationchange', this._bound.orientationChange);
  }

  _updateViewportHeight() {
    // Fix the iOS 100vh problem: use innerHeight for the true visible viewport
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }

  _updateSafeAreaInsets() {
    // Expose safe area insets as CSS custom properties for notched phones.
    // These rely on env() in CSS; we set fallback properties that JS-driven
    // layouts can read. The actual env() values must be consumed in CSS directly,
    // but we provide helpers.
    document.documentElement.style.setProperty(
      '--safe-area-top',
      'env(safe-area-inset-top, 0px)'
    );
    document.documentElement.style.setProperty(
      '--safe-area-bottom',
      'env(safe-area-inset-bottom, 0px)'
    );
  }

  _onResize() {
    this._updateViewportHeight();
    // Re-detect mobile/tablet on resize
    var wasMobile = this.isMobile;
    var wasTablet = this.isTablet;
    this._detectDevice();
    if (wasMobile !== this.isMobile || wasTablet !== this.isTablet) {
      this._performanceTier = null; // re-evaluate on next call
    }
  }

  _onOrientationChange() {
    // Small delay to let the browser settle the new dimensions
    var self = this;
    setTimeout(function () {
      self._updateViewportHeight();
    }, 150);
  }

  // ---------------------------------------------------------------------------
  // Touch Handling
  // ---------------------------------------------------------------------------

  _setupTouchHandling() {
    if (!this.hasTouch) return;

    this._bound.touchStart = this._onTouchStart.bind(this);
    this._bound.touchMove = this._onTouchMove.bind(this);
    this._bound.touchEnd = this._onTouchEnd.bind(this);

    document.addEventListener('touchstart', this._bound.touchStart, { passive: true });
    document.addEventListener('touchmove', this._bound.touchMove, { passive: true });
    document.addEventListener('touchend', this._bound.touchEnd);

    // Prevent double-tap zoom but allow pinch zoom
    this._setupDoubleTapPrevention();
  }

  _onTouchStart(e) {
    if (e.touches.length !== 1) return; // ignore multi-touch (allow pinch)

    var touch = e.touches[0];
    this._touchStart.x = touch.clientX;
    this._touchStart.y = touch.clientY;
    this._touchStart.time = Date.now();

    // Check for edge swipe (menu open gesture)
    if (touch.clientX < this._edgeSwipeZone && !this._menuOpen) {
      this._touchStart.isEdgeSwipe = true;
    } else {
      this._touchStart.isEdgeSwipe = false;
    }
  }

  _onTouchMove(e) {
    if (e.touches.length !== 1) return;

    var touch = e.touches[0];

    // Touch-based parallax: compute normalized position (-1 to 1)
    var nx = (touch.clientX / window.innerWidth) * 2 - 1;
    var ny = (touch.clientY / window.innerHeight) * 2 - 1;
    this._targetParallax.x = nx;
    this._targetParallax.y = ny;
  }

  _onTouchEnd(e) {
    if (e.changedTouches.length === 0) return;

    var touch = e.changedTouches[0];
    var dx = touch.clientX - this._touchStart.x;
    var dy = touch.clientY - this._touchStart.y;
    var dt = Date.now() - this._touchStart.time;

    // Swipe detection
    if (dt < this._swipeTimeLimit && Math.abs(dx) > this._swipeThreshold && Math.abs(dx) > Math.abs(dy)) {
      var direction = dx > 0 ? 'right' : 'left';

      // Menu edge swipe open
      if (this._touchStart.isEdgeSwipe && direction === 'right') {
        this._openMenu();
        return;
      }

      // Menu swipe close
      if (this._menuOpen && direction === 'right') {
        this._closeMenu();
        return;
      }

      // General swipe callback
      if (this.onSwipe) {
        this.onSwipe(direction);
      }
    }
  }

  _setupDoubleTapPrevention() {
    var lastTap = 0;
    this._bound.preventDoubleTapZoom = function (e) {
      var now = Date.now();
      var delta = now - lastTap;
      if (delta < 300 && delta > 0 && e.touches && e.touches.length === 0) {
        e.preventDefault();
      }
      lastTap = now;
    };
    document.addEventListener('touchend', this._bound.preventDoubleTapZoom, { passive: false });
  }

  // ---------------------------------------------------------------------------
  // Device Orientation Parallax
  // ---------------------------------------------------------------------------

  _setupOrientation() {
    if (!this.hasOrientation) return;
    if (this.prefersReducedMotion) return;

    // On iOS 13+, we need explicit permission — defer to requestOrientationPermission().
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // Permission must be requested from a user gesture; do not auto-bind.
      this._orientationPermission = false;
      return;
    }

    // Non-iOS: bind directly
    this._orientationPermission = true;
    this._bindOrientationListener();
  }

  _bindOrientationListener() {
    this._bound.orientation = this._onDeviceOrientation.bind(this);
    window.addEventListener('deviceorientation', this._bound.orientation);
  }

  _onDeviceOrientation(e) {
    if (this.prefersReducedMotion) return;

    this._orientationData.alpha = e.alpha || 0;
    this._orientationData.beta = e.beta || 0;
    this._orientationData.gamma = e.gamma || 0;

    // Normalize beta (-180..180) and gamma (-90..90) to -1..1
    // Beta: device tilt front-to-back. Resting portrait ~ 0-90.
    // Gamma: device tilt left-to-right. Resting ~ 0.
    // We use a comfortable range: beta 0..90 => -1..1, gamma -45..45 => -1..1
    var normalizedX = this._clamp(this._orientationData.gamma / 45, -1, 1);
    var normalizedY = this._clamp((this._orientationData.beta - 45) / 45, -1, 1);

    this._targetParallax.x = normalizedX;
    this._targetParallax.y = normalizedY;
  }

  // ---------------------------------------------------------------------------
  // Parallax Lerp Loop
  // ---------------------------------------------------------------------------

  _startParallaxLoop() {
    var self = this;
    function loop() {
      self._rafId = requestAnimationFrame(loop);
      if (self.prefersReducedMotion) {
        self._parallax.x = 0;
        self._parallax.y = 0;
        return;
      }
      self._parallax.x = self._lerp(self._parallax.x, self._targetParallax.x, self._lerpFactor);
      self._parallax.y = self._lerp(self._parallax.y, self._targetParallax.y, self._lerpFactor);

      if (self.onParallax) {
        self.onParallax(self._parallax.x, self._parallax.y);
      }
    }
    loop();
  }

  // ---------------------------------------------------------------------------
  // Scroll Handling
  // ---------------------------------------------------------------------------

  _setupScrollHandling() {
    // Overscroll behavior: prevent pull-to-refresh / bounce on mobile
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';

    // Smooth scroll polyfill for older mobile browsers
    this._polyfillSmoothScroll();
  }

  _polyfillSmoothScroll() {
    // If native smooth scroll is supported, do nothing
    if ('scrollBehavior' in document.documentElement.style) return;

    // Minimal polyfill: override window.scrollTo and Element.prototype.scrollTo
    var self = this;

    var originalScrollTo = window.scrollTo.bind(window);

    window.scrollTo = function (optionsOrX, y) {
      if (typeof optionsOrX === 'object' && optionsOrX.behavior === 'smooth') {
        self._smoothScrollTo(optionsOrX.top || 0, optionsOrX.left || 0, originalScrollTo);
      } else {
        originalScrollTo(optionsOrX, y);
      }
    };

    // Also patch Element.prototype.scrollIntoView
    var originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (optionsOrAlignToTop) {
      if (typeof optionsOrAlignToTop === 'object' && optionsOrAlignToTop.behavior === 'smooth') {
        var rect = this.getBoundingClientRect();
        var targetY = window.pageYOffset + rect.top;
        self._smoothScrollTo(targetY, 0, originalScrollTo);
      } else {
        originalScrollIntoView.call(this, optionsOrAlignToTop);
      }
    };
  }

  _smoothScrollTo(targetY, targetX, fallbackScrollTo) {
    var startY = window.pageYOffset;
    var startX = window.pageXOffset;
    var diffY = targetY - startY;
    var diffX = targetX - startX;
    var duration = 500;
    var startTime = null;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var ease = easeInOutCubic(progress);

      fallbackScrollTo(startX + diffX * ease, startY + diffY * ease);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------------------
  // Hamburger Menu Touch Handling
  // ---------------------------------------------------------------------------

  _setupMenuHandling() {
    // Look for common menu elements in the DOM
    this._menuEl = document.querySelector('.mobile-menu, .nav-menu, #mobile-menu, nav');
    this._menuToggleEl = document.querySelector('.hamburger, .menu-toggle, #menu-toggle, [data-menu-toggle]');

    if (this._menuToggleEl) {
      this._bound.menuToggle = this._onMenuToggleClick.bind(this);
      this._menuToggleEl.addEventListener('click', this._bound.menuToggle);
    }

    // Tap outside to close
    this._bound.menuOverlayClick = this._onMenuOverlayClick.bind(this);
    document.addEventListener('click', this._bound.menuOverlayClick);
  }

  _onMenuToggleClick(e) {
    e.preventDefault();
    if (this._menuOpen) {
      this._closeMenu();
    } else {
      this._openMenu();
    }
  }

  _onMenuOverlayClick(e) {
    if (!this._menuOpen) return;
    if (!this._menuEl) return;

    var clickedInsideMenu = this._menuEl.contains(e.target);
    var clickedToggle = this._menuToggleEl && this._menuToggleEl.contains(e.target);

    if (!clickedInsideMenu && !clickedToggle) {
      this._closeMenu();
    }
  }

  _openMenu() {
    this._menuOpen = true;
    this._lockBodyScroll();
    if (this._menuEl) {
      this._menuEl.classList.add('is-open');
      this._menuEl.setAttribute('aria-hidden', 'false');
    }
    if (this._menuToggleEl) {
      this._menuToggleEl.classList.add('is-active');
      this._menuToggleEl.setAttribute('aria-expanded', 'true');
    }
  }

  _closeMenu() {
    this._menuOpen = false;
    this._unlockBodyScroll();
    if (this._menuEl) {
      this._menuEl.classList.remove('is-open');
      this._menuEl.setAttribute('aria-hidden', 'true');
    }
    if (this._menuToggleEl) {
      this._menuToggleEl.classList.remove('is-active');
      this._menuToggleEl.setAttribute('aria-expanded', 'false');
    }
  }

  _lockBodyScroll() {
    this._bodyScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    document.body.style.position = 'fixed';
    document.body.style.top = -this._bodyScrollTop + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
  }

  _unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, this._bodyScrollTop);
  }

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  _setupAccessibility() {
    this._ensureTouchTargetSizes();
    this._setupFocusManagement();
  }

  _ensureTouchTargetSizes() {
    // Inject a style rule that ensures common interactive elements meet 44px minimum
    var styleId = 'mobile-handler-a11y-styles';
    if (document.getElementById(styleId)) return;

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      '@media (pointer: coarse) {',
      '  a, button, [role="button"], input[type="submit"], input[type="button"],',
      '  select, summary, [tabindex]:not([tabindex="-1"]) {',
      '    min-width: 44px;',
      '    min-height: 44px;',
      '  }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  _setupFocusManagement() {
    // On touch devices, remove :focus outlines on touch but keep for keyboard
    if (!this.hasTouch) return;

    var styleId = 'mobile-handler-focus-styles';
    if (document.getElementById(styleId)) return;

    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = [
      // Remove focus ring for mouse/touch, keep for keyboard (focus-visible)
      ':focus:not(:focus-visible) {',
      '  outline: none;',
      '}',
      ':focus-visible {',
      '  outline: 2px solid #4A90D9;',
      '  outline-offset: 2px;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  _lerp(a, b, t) {
    return a + (b - a) * t;
  }

  _clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }
}

// Export to global scope
window.MobileHandler = MobileHandler;
