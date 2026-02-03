/**
 * AsciiOverlay - ASCII Art Overlay System for Three.js Castle-Themed Website
 *
 * Creates ASCII art elements that overlay on and blend with a 3D scene,
 * producing a unique mixed aesthetic of retro text art and modern WebGL.
 *
 * Usage:
 *   const ascii = new AsciiOverlay();
 *   ascii.init();
 *   // In your render loop:
 *   ascii.update();
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Block-letter font definition (figlet "small" inspired)
  // Each glyph is 5 lines tall. Variable width.
  // ---------------------------------------------------------------------------
  var FONT = {
    A: [
      ' __ ',
      '|__|',
      '|  |',
    ],
    B: [
      '__ ',
      '|_)',
      '|_)',
    ],
    C: [
      ' __',
      '|  ',
      '|__',
    ],
    D: [
      '__ ',
      '|  \\',
      '|__/',
    ],
    E: [
      '___',
      '|_ ',
      '|__',
    ],
    F: [
      '___',
      '|_ ',
      '|  ',
    ],
    G: [
      ' __',
      '| _',
      '|_|',
    ],
    H: [
      '   ',
      '|__|',
      '|  |',
    ],
    I: [
      '_',
      '|',
      '|',
    ],
    J: [
      '  _',
      '  |',
      '|_|',
    ],
    K: [
      '   ',
      '|/ ',
      '|\\ ',
    ],
    L: [
      '   ',
      '|  ',
      '|__',
    ],
    M: [
      '    ',
      '|\\/|',
      '|  |',
    ],
    N: [
      '    ',
      '|\\ |',
      '| \\|',
    ],
    O: [
      ' __ ',
      '|  |',
      '|__|',
    ],
    P: [
      '__ ',
      '|_)',
      '|  ',
    ],
    Q: [
      ' __ ',
      '|  |',
      '|_\\|',
    ],
    R: [
      '__ ',
      '|_)',
      '| \\',
    ],
    S: [
      ' __',
      '|_ ',
      ' _|',
    ],
    T: [
      '___',
      ' | ',
      ' | ',
    ],
    U: [
      '    ',
      '|  |',
      '|__|',
    ],
    V: [
      '    ',
      '\\  /',
      ' \\/ ',
    ],
    W: [
      '      ',
      '\\    /',
      ' \\/\\/ ',
    ],
    X: [
      '   ',
      '\\ /',
      '/ \\',
    ],
    Y: [
      '   ',
      '\\_/',
      ' | ',
    ],
    Z: [
      '___',
      ' / ',
      '/_ ',
    ],
    '0': [
      ' _ ',
      '| |',
      '|_|',
    ],
    '1': [
      '  ',
      ' |',
      ' |',
    ],
    '2': [
      ' _ ',
      ' _|',
      '|_ ',
    ],
    '3': [
      '__ ',
      ' _)',
      '__)',
    ],
    '4': [
      '   ',
      '|_|',
      '  |',
    ],
    '5': [
      ' __',
      '|_ ',
      ' _|',
    ],
    '6': [
      ' _ ',
      '|_ ',
      '|_)',
    ],
    '7': [
      '___',
      '  /',
      ' / ',
    ],
    '8': [
      ' _ ',
      '(_)',
      '(_)',
    ],
    '9': [
      ' _ ',
      '(_|',
      '  |',
    ],
    ' ': [
      '  ',
      '  ',
      '  ',
    ],
    '.': [
      ' ',
      ' ',
      '.',
    ],
    ',': [
      ' ',
      ' ',
      ',',
    ],
    '!': [
      '|',
      '|',
      '.',
    ],
    '?': [
      '__ ',
      ' _)',
      ' . ',
    ],
    '-': [
      '   ',
      '---',
      '   ',
    ],
    '_': [
      '   ',
      '   ',
      '___',
    ],
    ':': [
      ' ',
      '.',
      '.',
    ],
    ';': [
      ' ',
      '.',
      ',',
    ],
    "'": [
      '|',
      ' ',
      ' ',
    ],
    '"': [
      '||',
      '  ',
      '  ',
    ],
    '(': [
      ' /',
      '| ',
      ' \\',
    ],
    ')': [
      '\\ ',
      ' |',
      '/ ',
    ],
    '/': [
      '  /',
      ' / ',
      '/  ',
    ],
    '@': [
      ' __ ',
      '|@ |',
      '|__|',
    ],
    '#': [
      ' # ',
      '###',
      ' # ',
    ],
    '&': [
      ' _ ',
      '(&)',
      '&/ ',
    ],
    '+': [
      '   ',
      '-+-',
      '   ',
    ],
    '=': [
      '   ',
      '===',
      '===',
    ],
  };

  // ---------------------------------------------------------------------------
  // ASCII Art Pieces - Castle Theme
  // ---------------------------------------------------------------------------
  var ART = {};

  ART.castle = [
    '                    |>>>                        ',
    '                    |                           ',
    '               _  _/|  __                       ',
    '              |  \\/ | |__|                      ',
    '              |_   _|/  |                       ',
    '                | | \\   |                       ',
    '   _ _ _ _ _ _ _| |_ \\  | _ _ _ _ _ _ _ _ _    ',
    '  |_|_|_|_|_|_|_|_|_|\\ | |_|_|_|_|_|_|_|_|_|  ',
    '  |  _    _    _   | \\|| _    _    _    _  |   ',
    '  | |_|  |_|  |_|  |  || |_|  |_|  |_|  |_| |  ',
    '  |  _    _    _   |  || _    _    _    _  |   ',
    '  | |_|  |_|  |_|  |  || |_|  |_|  |_|  |_| |  ',
    '  |                |  ||                     |  ',
    '  |  __         __ |  ||  __          __     |  ',
    '  | |  |       |  || /|| |  |        |  |    |  ',
    '  | |  |  ___  |  ||/ || |  |  ___   |  |    |  ',
    '  | |  | |   | |  |/  || |  | |   |  |  |    |  ',
    '__|_|__|_|___|_|__|____|_|__|_|___|__|__|____|__',
  ];

  ART.castleLoading = [
    '                                                                ',
    '         .                 .       .            .               ',
    '              *                          *                      ',
    '     .                                               .         ',
    '                    |>>>                                        ',
    '                    |                                           ',
    '               _  _/|  __                                       ',
    '              |  \\/ | |__|             .                        ',
    '    .         |_   _|/  |                                       ',
    '                | | \\   |      *                                ',
    '   _ _ _ _ _ _ _| |_ \\  | _ _ _ _ _ _ _ _ _                    ',
    '  |_|_|_|_|_|_|_|_|_|\\ | |_|_|_|_|_|_|_|_|_|                  ',
    '  |  _    _    _   | \\|| _    _    _    _  |                   ',
    '  | |_|  |_|  |_|  |  || |_|  |_|  |_|  |_| |                  ',
    '  |  _    _    _   |  || _    _    _    _  |                   ',
    '  | |_|  |_|  |_|  |  || |_|  |_|  |_|  |_| |                  ',
    '  |                |  ||                     |                  ',
    '  |  __         __ |  ||  __          __     |                  ',
    '  | |  |       |  || /|| |  |        |  |    |                  ',
    '  | |  |  ___  |  ||/ || |  |  ___   |  |    |                  ',
    '  | |  | |   | |  |/  || |  | |   |  |  |    |                  ',
    '__|_|__|_|___|_|__|____|_|__|_|___|__|__|____|__________________',
    '                                                                ',
    '      ====  ENTERING THE REALM  ====                            ',
    '                                                                ',
  ];

  ART.tower = [
    '    /\\    ',
    '   /  \\   ',
    '  /    \\  ',
    ' |[]  []| ',
    ' |      | ',
    ' |  __  | ',
    ' |_|  |_| ',
  ];

  ART.sword = [
    '     /| ',
    '    / | ',
    '   /  | ',
    '  /   | ',
    ' /    | ',
    '|-----|',
    '  ||| ',
    '  ||| ',
    '  |||  ',
    '   V  ',
  ];

  ART.shield = [
    ' .-------. ',
    '/ ======= \\',
    '| ======= |',
    '| ======= |',
    '\\  =====  /',
    ' \\  ===  / ',
    '  \\  =  /  ',
    '   \\   /   ',
    '    \\ /    ',
    '     V     ',
  ];

  ART.dragon = [
    '                 __        _  ',
    '                /  \\      / | ',
    '   _ _  _   __/    \\____/ /  ',
    '  / / \\/ \\_/    \\       _/   ',
    ' /  \\__  /  __   \\__/\\/      ',
    ' \\     \\/  /  \\             ',
    '  \\___/\\__/    |    (\\       ',
    '        |     /    / _\\      ',
    '        |____/    | / \\\\     ',
    '                  |/   \\\\    ',
    '                        \\)   ',
  ];

  ART.scroll = [
    '  ______________________________ ',
    ' /                              \\',
    '|    ________________________    |',
    '|   |                        |   |',
    '|   |    {TITLE}             |   |',
    '|   |________________________|   |',
    '|                                |',
    ' \\______________________________/',
  ];

  // Torch frames for animation (4 frames)
  ART.torchFrames = [
    [
      '   (  ',
      '  (   ',
      '   )  ',
      '  ||  ',
      '  ||  ',
      ' _||_ ',
      '|    |',
      '|    |',
      '|____|',
    ],
    [
      '  )   ',
      '   (  ',
      '  (   ',
      '  ||  ',
      '  ||  ',
      ' _||_ ',
      '|    |',
      '|    |',
      '|____|',
    ],
    [
      '   )  ',
      '  )   ',
      '   (  ',
      '  ||  ',
      '  ||  ',
      ' _||_ ',
      '|    |',
      '|    |',
      '|____|',
    ],
    [
      '  (   ',
      '   )  ',
      '  )   ',
      '  ||  ',
      '  ||  ',
      ' _||_ ',
      '|    |',
      '|    |',
      '|____|',
    ],
  ];

  // ---------------------------------------------------------------------------
  // Matrix / Raining Code Characters
  // ---------------------------------------------------------------------------
  var MATRIX_CHARS = '\u2694\u2666\u25CA\u2588\u2593\u2591\u256C\u256B\u2551\u2550\u2560\u2563\u2569\u2566\u2554\u2557\u255A\u255D\u2591\u2593';

  // ---------------------------------------------------------------------------
  // AsciiOverlay Class
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Loading Phrases (used by enhanced loading screen)
  // ---------------------------------------------------------------------------
  var LOADING_PHRASES = [
    'Constructing dungeon...',
    'Lighting torches...',
    'Summoning ravens...',
    'Forging pixels...',
    'Opening the gates...',
  ];

  // ---------------------------------------------------------------------------
  // Weather ASCII symbols
  // ---------------------------------------------------------------------------
  var WEATHER_CHARS = ['\u00B7', '.', '\u00B0', '\u2234', '\u2058'];

  // ---------------------------------------------------------------------------
  // Explosion ASCII symbols
  // ---------------------------------------------------------------------------
  var EXPLOSION_CHARS = ['\u2591', '\u2592', '\u2593', '\u2588', '\u256C', '\u256B'];

  function AsciiOverlay() {
    this._torches = [];
    this._torchFrame = 0;
    this._torchTimer = 0;
    this._matrixCanvas = null;
    this._matrixCtx = null;
    this._matrixDrops = [];
    this._matrixChars = MATRIX_CHARS.split('');
    this._observers = [];
    this._revealElements = [];
    this._skillBars = [];
    this._animationActive = false;
    this._lastTimestamp = 0;
    this._loadingDone = false;
    this._frameCount = 0;
    // Weather overlay state
    this._weatherCanvas = null;
    this._weatherCtx = null;
    this._weatherDrops = [];
    this._weatherActive = false;
    // Mini-map state
    this._miniMapEl = null;
    this._miniMapSections = [];
    // Tooltip state
    this._tooltips = [];
    // Typewriter observer
    this._typewriterObserver = null;
  }

  // ---------------------------------------------------------------------------
  // init() - Set up all ASCII elements after DOM is ready
  // ---------------------------------------------------------------------------
  AsciiOverlay.prototype.init = function () {
    this._injectStyles();
    this._initMatrixCanvas();
    this._setupIntersectionObserver();
    this._setupTypewriterObserver();
    this._animationActive = true;
    this._lastTimestamp = performance.now();
  };

  // ---------------------------------------------------------------------------
  // Inject required CSS styles
  // ---------------------------------------------------------------------------
  AsciiOverlay.prototype._injectStyles = function () {
    var style = document.createElement('style');
    style.textContent = [
      '.ascii-overlay { font-family: "Courier New", Courier, monospace; white-space: pre; line-height: 1.2; }',
      '.ascii-border { position: relative; padding: 1.5em 2em; }',
      '.ascii-border-text { position: absolute; pointer-events: none; color: #c8a86e; opacity: 0.85; font-size: 14px; z-index: 2; }',
      '.ascii-border-text.top { top: 0; left: 0; }',
      '.ascii-border-text.bottom { bottom: 0; left: 0; }',
      '.ascii-decoration { font-family: "Courier New", Courier, monospace; white-space: pre; line-height: 1.15; color: #c8a86e; text-shadow: 0 0 4px rgba(200,168,110,0.3); }',
      '.ascii-torch { display: inline-block; font-family: "Courier New", Courier, monospace; white-space: pre; line-height: 1.1; color: #f0a030; text-shadow: 0 0 8px rgba(240,160,48,0.6), 0 0 16px rgba(255,100,0,0.3); }',
      '.ascii-title { font-family: "Courier New", Courier, monospace; white-space: pre; line-height: 1.1; color: #e8d5a3; text-shadow: 0 0 6px rgba(232,213,163,0.4); letter-spacing: 2px; }',
      '.ascii-skill-bar { font-family: "Courier New", Courier, monospace; white-space: pre; color: #c8a86e; font-size: 14px; margin: 6px 0; }',
      '.ascii-skill-label { color: #e8d5a3; display: inline-block; min-width: 120px; }',
      '.ascii-skill-track { color: #c8a86e; }',
      '.ascii-skill-pct { color: #f0a030; margin-left: 8px; }',
      '.ascii-reveal { opacity: 0; transition: none; }',
      '.ascii-reveal.visible { opacity: 1; }',
      '.ascii-loading-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0a0a12; display: flex; align-items: center; justify-content: center; z-index: 10000; flex-direction: column; }',
      '.ascii-loading-art { font-family: "Courier New", Courier, monospace; white-space: pre; line-height: 1.2; color: #c8a86e; text-shadow: 0 0 6px rgba(200,168,110,0.3); font-size: clamp(6px, 1.2vw, 14px); }',
      '.ascii-loading-progress { margin-top: 20px; font-family: "Courier New", Courier, monospace; color: #f0a030; font-size: 14px; }',
      '#ascii-matrix-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; opacity: 0.07; }',
      '.ascii-scroll-decoration { font-family: "Courier New", Courier, monospace; white-space: pre; line-height: 1.15; color: #c8a86e; text-align: center; }',
      // Explosion particles
      '.ascii-explosion-particle { position: absolute; pointer-events: none; font-family: "Courier New", Courier, monospace; color: #f0a030; text-shadow: 0 0 6px rgba(240,160,48,0.6); font-size: 18px; z-index: 9999; will-change: transform, opacity; }',
      // Weather overlay canvas
      '#ascii-weather-canvas { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; opacity: 0.04; }',
      // Typewriter
      '.ascii-typewriter-cursor { display: inline; animation: ascii-blink 0.6s step-end infinite; }',
      '@keyframes ascii-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }',
      // Wipe transition
      '.ascii-wipe-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; pointer-events: none; display: flex; font-family: "Courier New", Courier, monospace; color: #c8a86e; background: transparent; overflow: hidden; }',
      '.ascii-wipe-col { display: flex; flex-direction: column; flex: 1; overflow: hidden; }',
      '.ascii-wipe-cell { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 20px; opacity: 0; transition: opacity 30ms ease; }',
      '.ascii-wipe-cell.active { opacity: 1; background: #0a0a12; }',
      // Mini-map
      '.ascii-minimap { position: fixed; left: 8px; top: 50%; transform: translateY(-50%); z-index: 100; font-family: "Courier New", Courier, monospace; font-size: 12px; line-height: 1.4; color: #c8a86e; pointer-events: auto; user-select: none; text-shadow: 0 0 4px rgba(200,168,110,0.3); }',
      '.ascii-minimap-row { cursor: pointer; white-space: pre; }',
      '.ascii-minimap-row:hover { color: #f0a030; }',
      '@media (max-width: 768px) { .ascii-minimap { display: none; } }',
      // Tooltip
      '.ascii-tooltip { position: absolute; z-index: 10000; pointer-events: none; font-family: "Courier New", Courier, monospace; font-size: 13px; color: #e8d5a3; white-space: pre; line-height: 1.2; text-shadow: 0 0 4px rgba(232,213,163,0.4); opacity: 0; transition: opacity 0.15s ease; }',
      '.ascii-tooltip.visible { opacity: 1; }',
      // Loading phrase
      '.ascii-loading-phrase { margin-top: 10px; font-family: "Courier New", Courier, monospace; color: #c8a86e; font-size: 13px; opacity: 0.8; letter-spacing: 1px; }',
    ].join('\n');
    document.head.appendChild(style);
  };

  // ---------------------------------------------------------------------------
  // Matrix / Raining Code Canvas
  // ---------------------------------------------------------------------------
  AsciiOverlay.prototype._initMatrixCanvas = function () {
    var canvas = document.createElement('canvas');
    canvas.id = 'ascii-matrix-canvas';
    document.body.appendChild(canvas);

    this._matrixCanvas = canvas;
    this._matrixCtx = canvas.getContext('2d');

    this._resizeMatrix();

    var self = this;
    window.addEventListener('resize', function () {
      self._resizeMatrix();
    });
  };

  AsciiOverlay.prototype._resizeMatrix = function () {
    var canvas = this._matrixCanvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var columns = Math.floor(canvas.width / 18);
    this._matrixDrops = [];
    for (var i = 0; i < columns; i++) {
      this._matrixDrops.push({
        y: Math.random() * -100,
        speed: 0.3 + Math.random() * 0.7,
        chars: [],
        len: 4 + Math.floor(Math.random() * 12),
      });
    }
  };

  AsciiOverlay.prototype._updateMatrix = function () {
    var ctx = this._matrixCtx;
    var canvas = this._matrixCanvas;
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '14px "Courier New", monospace';

    var chars = this._matrixChars;
    var colWidth = 18;

    for (var i = 0; i < this._matrixDrops.length; i++) {
      var drop = this._matrixDrops[i];
      var x = i * colWidth;

      // Draw trail
      for (var j = 0; j < drop.len; j++) {
        var yPos = (drop.y - j) * 18;
        if (yPos < 0 || yPos > canvas.height) continue;

        var alpha = 1 - j / drop.len;
        if (j === 0) {
          ctx.fillStyle = 'rgba(240, 200, 100, ' + alpha + ')';
        } else {
          ctx.fillStyle = 'rgba(200, 168, 110, ' + (alpha * 0.6) + ')';
        }

        var ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, x, yPos);
      }

      drop.y += drop.speed;

      if ((drop.y - drop.len) * 18 > canvas.height) {
        drop.y = Math.random() * -20;
        drop.speed = 0.3 + Math.random() * 0.7;
        drop.len = 4 + Math.floor(Math.random() * 12);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // IntersectionObserver for scroll-triggered reveals
  // ---------------------------------------------------------------------------
  AsciiOverlay.prototype._setupIntersectionObserver = function () {
    if (!('IntersectionObserver' in window)) return;

    var self = this;
    this._observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          self._typeReveal(entry.target);
          self._observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
  };

  /**
   * Register an element for scroll-triggered ASCII reveal.
   * The element should have its full text stored in data-ascii-text.
   */
  AsciiOverlay.prototype.registerReveal = function (element) {
    if (!this._observer) return;
    element.classList.add('ascii-reveal');
    this._observer.observe(element);
    this._revealElements.push(element);
  };

  AsciiOverlay.prototype._typeReveal = function (el) {
    var fullText = el.getAttribute('data-ascii-text') || el.textContent;
    el.textContent = '';
    el.classList.add('visible');

    var idx = 0;
    var speed = 12; // ms per character
    var length = fullText.length;

    function tick() {
      if (idx < length) {
        var chunk = Math.min(3, length - idx); // type 3 chars at a time for speed
        el.textContent += fullText.substring(idx, idx + chunk);
        idx += chunk;
        setTimeout(tick, speed);
      }
    }
    tick();
  };

  // ---------------------------------------------------------------------------
  // update() - Called each frame for animations
  // ---------------------------------------------------------------------------
  AsciiOverlay.prototype.update = function () {
    if (!this._animationActive) return;

    var now = performance.now();
    var delta = now - this._lastTimestamp;
    this._lastTimestamp = now;
    this._frameCount++;

    // Update torch animation (~200ms per frame)
    this._torchTimer += delta;
    if (this._torchTimer > 200) {
      this._torchTimer = 0;
      this._torchFrame = (this._torchFrame + 1) % ART.torchFrames.length;
      this._updateTorches();
    }

    // Update matrix rain (every frame)
    this._updateMatrix();

    // Update weather overlay (every frame, if active)
    if (this._weatherActive) {
      this._updateWeather();
    }

    // Update mini-map current section
    if (this._miniMapEl) {
      this._updateMiniMap();
    }

    // Update animated skill bars
    this._updateSkillBars();
  };

  // ---------------------------------------------------------------------------
  // Torch management
  // ---------------------------------------------------------------------------
  AsciiOverlay.prototype._updateTorches = function () {
    var frame = ART.torchFrames[this._torchFrame];
    var text = frame.join('\n');
    for (var i = 0; i < this._torches.length; i++) {
      this._torches[i].textContent = text;
    }
  };

  /**
   * Create a torch DOM element. Append it wherever you like.
   * @returns {HTMLElement}
   */
  AsciiOverlay.prototype.createTorch = function () {
    var el = document.createElement('div');
    el.className = 'ascii-torch';
    el.textContent = ART.torchFrames[0].join('\n');
    this._torches.push(el);
    return el;
  };

  // ---------------------------------------------------------------------------
  // ASCII Section Borders
  // ---------------------------------------------------------------------------

  /**
   * Generate an ASCII box border string around content.
   * @param {number} width  - inner width in characters
   * @param {number} height - inner height in lines
   * @returns {object} { top: string, bottom: string, left: string, right: string, full: string }
   */
  AsciiOverlay.prototype.generateBorder = function (width, height) {
    var w = Math.max(width, 2);
    var h = Math.max(height, 1);

    var topLine = '\u2554' + repeat('\u2550', w) + '\u2557';
    var bottomLine = '\u255A' + repeat('\u2550', w) + '\u255D';
    var midLine = '\u2551' + repeat(' ', w) + '\u2551';

    var lines = [topLine];
    for (var i = 0; i < h; i++) {
      lines.push(midLine);
    }
    lines.push(bottomLine);

    return {
      top: topLine,
      bottom: bottomLine,
      left: '\u2551',
      right: '\u2551',
      full: lines.join('\n'),
    };
  };

  /**
   * Wrap an existing DOM element with ASCII box-border overlays.
   * @param {HTMLElement} element
   * @param {object} [options]
   * @param {number} [options.padding=2] extra chars of padding
   */
  AsciiOverlay.prototype.wrapWithBorder = function (element, options) {
    var opts = options || {};
    var padding = opts.padding !== undefined ? opts.padding : 2;

    element.classList.add('ascii-border');

    // Measure approximate character width
    var rect = element.getBoundingClientRect();
    var charW = 8.4; // approximate px per monospace char at 14px
    var charH = 16.8;
    var innerCols = Math.floor(rect.width / charW) + padding * 2;
    var innerRows = Math.floor(rect.height / charH);

    var border = this.generateBorder(innerCols, innerRows);

    var topEl = document.createElement('pre');
    topEl.className = 'ascii-border-text top';
    topEl.textContent = border.top;
    element.appendChild(topEl);

    var bottomEl = document.createElement('pre');
    bottomEl.className = 'ascii-border-text bottom';
    bottomEl.textContent = border.bottom;
    element.appendChild(bottomEl);
  };

  // ---------------------------------------------------------------------------
  // ASCII Art Decorations
  // ---------------------------------------------------------------------------

  /**
   * Get an ASCII art piece as a string.
   * @param {'castle'|'tower'|'sword'|'shield'|'dragon'|'scroll'} name
   * @param {object} [options]
   * @param {string} [options.title] - for scroll, replaces {TITLE}
   * @returns {string}
   */
  AsciiOverlay.prototype.getArt = function (name, options) {
    var opts = options || {};
    var art = ART[name];
    if (!art) return '';

    var lines = art.slice();
    if (name === 'scroll' && opts.title) {
      for (var i = 0; i < lines.length; i++) {
        lines[i] = lines[i].replace('{TITLE}', opts.title);
      }
    }
    return lines.join('\n');
  };

  /**
   * Create a DOM element with an ASCII art decoration.
   * @param {'castle'|'tower'|'sword'|'shield'|'dragon'|'scroll'} name
   * @param {object} [options]
   * @returns {HTMLElement}
   */
  AsciiOverlay.prototype.createDecoration = function (name, options) {
    var el = document.createElement('pre');
    el.className = 'ascii-decoration';
    el.textContent = this.getArt(name, options);
    return el;
  };

  /**
   * Create a scroll/banner decoration for a section title.
   * @param {string} title
   * @returns {HTMLElement}
   */
  AsciiOverlay.prototype.createScrollBanner = function (title) {
    var padTitle = title;
    // Pad title to fill scroll width
    var innerWidth = 24;
    if (padTitle.length < innerWidth) {
      padTitle = padTitle + repeat(' ', innerWidth - padTitle.length);
    }
    return this.createDecoration('scroll', { title: padTitle });
  };

  // ---------------------------------------------------------------------------
  // ASCII Section Headers (Block Letters)
  // ---------------------------------------------------------------------------

  /**
   * Render a title string as large ASCII block letters.
   * @param {string} text
   * @returns {string} HTML string (wrapped in a <pre> with class ascii-title)
   */
  AsciiOverlay.prototype.renderTitle = function (text) {
    var upper = text.toUpperCase();
    var lineCount = 3; // each glyph is 3 lines tall
    var outputLines = [];
    for (var row = 0; row < lineCount; row++) {
      outputLines.push('');
    }

    for (var c = 0; c < upper.length; c++) {
      var ch = upper[c];
      var glyph = FONT[ch] || FONT[' '];
      for (var row = 0; row < lineCount; row++) {
        outputLines[row] += (glyph[row] || '') + ' ';
      }
    }

    var artText = outputLines.join('\n');
    return '<pre class="ascii-title">' + escapeHtml(artText) + '</pre>';
  };

  // ---------------------------------------------------------------------------
  // ASCII Skill Bars
  // ---------------------------------------------------------------------------

  /**
   * Create an ASCII skill bar.
   * @param {number} percent 0-100
   * @param {string} label
   * @returns {string} HTML string
   */
  AsciiOverlay.prototype.createSkillBar = function (percent, label) {
    var pct = Math.max(0, Math.min(100, percent));
    var barWidth = 20;
    var filled = Math.round(barWidth * pct / 100);
    var remaining = barWidth - filled;

    // Gradient effect: last 2 filled chars use medium shade
    var fullBlocks = Math.max(0, filled - 2);
    var medBlocks = Math.min(2, filled);
    var emptyBlocks = remaining;

    var bar = '[' +
      repeat('\u2588', fullBlocks) +
      repeat('\u2593', medBlocks) +
      repeat('\u2591', emptyBlocks) +
      ']';

    var id = 'skill-' + label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-' + Math.random().toString(36).substring(2, 7);

    return '<div class="ascii-skill-bar" id="' + id + '" data-target-percent="' + pct + '" data-current-percent="0">' +
      '<span class="ascii-skill-label">' + escapeHtml(label) + '</span> ' +
      '<span class="ascii-skill-track" data-bar="true">[' + repeat('\u2591', barWidth) + ']</span>' +
      '<span class="ascii-skill-pct" data-pct="true"> 0%</span>' +
      '</div>';
  };

  /**
   * Activate skill bar animation. Call after inserting the skill bar HTML into the DOM.
   * @param {HTMLElement} container - the element that contains the skill bar(s)
   */
  AsciiOverlay.prototype.activateSkillBars = function (container) {
    var bars = container.querySelectorAll('.ascii-skill-bar');
    var self = this;
    for (var i = 0; i < bars.length; i++) {
      (function (bar) {
        self._skillBars.push({
          el: bar,
          target: parseInt(bar.getAttribute('data-target-percent'), 10) || 0,
          current: 0,
          active: false,
        });
        // Use IntersectionObserver to trigger
        if (self._observer) {
          self._observer.observe(bar);
          // Override reveal: skill bars animate differently
          bar._isSkillBar = true;
        }
      })(bars[i]);
    }
  };

  AsciiOverlay.prototype._updateSkillBars = function () {
    var barWidth = 20;
    for (var i = 0; i < this._skillBars.length; i++) {
      var sb = this._skillBars[i];
      if (!sb.active) {
        // Check visibility
        var rect = sb.el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          sb.active = true;
        }
      }
      if (sb.active && sb.current < sb.target) {
        sb.current = Math.min(sb.target, sb.current + 1.5);
        var pct = Math.round(sb.current);
        var filled = Math.round(barWidth * pct / 100);
        var remaining = barWidth - filled;

        var fullBlocks = Math.max(0, filled - 2);
        var medBlocks = Math.min(2, filled);

        var bar = '[' +
          repeat('\u2588', fullBlocks) +
          repeat('\u2593', medBlocks) +
          repeat('\u2591', remaining) +
          ']';

        var trackEl = sb.el.querySelector('[data-bar]');
        var pctEl = sb.el.querySelector('[data-pct]');
        if (trackEl) trackEl.textContent = bar;
        if (pctEl) pctEl.textContent = ' ' + pct + '%';
      }
    }
  };

  // ---------------------------------------------------------------------------
  // ASCII Loading Screen
  // ---------------------------------------------------------------------------

  /**
   * Start the loading screen animation.
   * Displays a large castle ASCII art character-by-character, then calls callback.
   * @param {function} callback - called when the animation completes
   */
  AsciiOverlay.prototype.startLoadingAnimation = function (callback) {
    var self = this;

    // Create loading screen overlay
    var screen = document.createElement('div');
    screen.className = 'ascii-loading-screen';
    screen.id = 'ascii-loading-screen';

    var artEl = document.createElement('pre');
    artEl.className = 'ascii-loading-art';
    screen.appendChild(artEl);

    var progressEl = document.createElement('div');
    progressEl.className = 'ascii-loading-progress';
    progressEl.textContent = '[' + repeat('\u2591', 30) + '] 0%';
    screen.appendChild(progressEl);

    var phraseEl = document.createElement('div');
    phraseEl.className = 'ascii-loading-phrase';
    phraseEl.textContent = LOADING_PHRASES[0];
    screen.appendChild(phraseEl);

    document.body.appendChild(screen);

    var fullText = ART.castleLoading.join('\n');
    var totalChars = fullText.length;
    var idx = 0;
    var charsPerTick = 6;
    var tickInterval = 8; // ms
    var lastPhraseIndex = 0;

    function tick() {
      if (idx < totalChars) {
        var end = Math.min(idx + charsPerTick, totalChars);
        artEl.textContent += fullText.substring(idx, end);
        idx = end;

        // Update progress bar
        var pct = Math.round((idx / totalChars) * 100);
        var filled = Math.round(30 * pct / 100);
        progressEl.textContent = '[' + repeat('\u2588', filled) + repeat('\u2591', 30 - filled) + '] ' + pct + '%';

        // Update loading phrase every 20% of progress
        var phraseIndex = Math.min(Math.floor(pct / 20), LOADING_PHRASES.length - 1);
        if (phraseIndex !== lastPhraseIndex) {
          lastPhraseIndex = phraseIndex;
          phraseEl.textContent = LOADING_PHRASES[phraseIndex];
        }

        setTimeout(tick, tickInterval);
      } else {
        // Done - pause briefly then fade out
        setTimeout(function () {
          screen.style.transition = 'opacity 0.8s ease';
          screen.style.opacity = '0';
          setTimeout(function () {
            if (screen.parentNode) {
              screen.parentNode.removeChild(screen);
            }
            self._loadingDone = true;
            if (typeof callback === 'function') {
              callback();
            }
          }, 800);
        }, 600);
      }
    }

    tick();
  };

  // ---------------------------------------------------------------------------
  // Utility: Create a full decorated section
  // ---------------------------------------------------------------------------

  /**
   * Create a fully decorated section with torches, border, and title.
   * @param {string} title
   * @param {HTMLElement} content
   * @returns {HTMLElement}
   */
  AsciiOverlay.prototype.createDecoratedSection = function (title, content) {
    var section = document.createElement('div');
    section.style.position = 'relative';
    section.style.padding = '20px';

    // Title
    var titleEl = document.createElement('div');
    titleEl.innerHTML = this.renderTitle(title);
    titleEl.style.textAlign = 'center';
    titleEl.style.marginBottom = '10px';
    section.appendChild(titleEl);

    // Torch left
    var torchLeft = this.createTorch();
    torchLeft.style.position = 'absolute';
    torchLeft.style.top = '10px';
    torchLeft.style.left = '10px';
    torchLeft.style.fontSize = '10px';
    section.appendChild(torchLeft);

    // Torch right
    var torchRight = this.createTorch();
    torchRight.style.position = 'absolute';
    torchRight.style.top = '10px';
    torchRight.style.right = '10px';
    torchRight.style.fontSize = '10px';
    torchRight.style.transform = 'scaleX(-1)';
    section.appendChild(torchRight);

    // Content
    section.appendChild(content);

    // Register for scroll reveal
    this.registerReveal(titleEl.querySelector('.ascii-title'));

    return section;
  };

  // ---------------------------------------------------------------------------
  // Utility: Render an art piece to a canvas texture (for Three.js integration)
  // ---------------------------------------------------------------------------

  /**
   * Render an ASCII art piece to a canvas element (usable as a Three.js texture source).
   * @param {'castle'|'tower'|'sword'|'shield'|'dragon'|'scroll'} name
   * @param {object} [options]
   * @param {string} [options.color='#c8a86e']
   * @param {string} [options.bgColor='transparent']
   * @param {number} [options.fontSize=14]
   * @param {string} [options.title]
   * @returns {HTMLCanvasElement}
   */
  AsciiOverlay.prototype.renderToCanvas = function (name, options) {
    var opts = options || {};
    var color = opts.color || '#c8a86e';
    var bgColor = opts.bgColor || 'transparent';
    var fontSize = opts.fontSize || 14;

    var artText = this.getArt(name, { title: opts.title });
    var lines = artText.split('\n');

    var maxLen = 0;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLen) maxLen = lines[i].length;
    }

    var charWidth = fontSize * 0.6;
    var lineHeight = fontSize * 1.2;

    var canvas = document.createElement('canvas');
    canvas.width = Math.ceil(maxLen * charWidth) + 20;
    canvas.height = Math.ceil(lines.length * lineHeight) + 20;

    var ctx = canvas.getContext('2d');

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = fontSize + 'px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';

    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 10, 10 + i * lineHeight);
    }

    return canvas;
  };

  // ---------------------------------------------------------------------------
  // Utility: Get the matrix canvas (for custom positioning)
  // ---------------------------------------------------------------------------

  /**
   * @returns {HTMLCanvasElement|null}
   */
  AsciiOverlay.prototype.getMatrixCanvas = function () {
    return this._matrixCanvas;
  };

  /**
   * Set the opacity of the matrix rain effect.
   * @param {number} opacity 0-1
   */
  AsciiOverlay.prototype.setMatrixOpacity = function (opacity) {
    if (this._matrixCanvas) {
      this._matrixCanvas.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    }
  };

  // ---------------------------------------------------------------------------
  // Utility: Divider / Separator lines
  // ---------------------------------------------------------------------------

  /**
   * Generate an ASCII divider line.
   * @param {number} [width=60]
   * @param {'single'|'double'|'ornate'} [style='ornate']
   * @returns {string}
   */
  AsciiOverlay.prototype.createDivider = function (width, style) {
    var w = width || 60;
    var s = style || 'ornate';

    if (s === 'single') {
      return '\u2500'.repeat ? repeat('\u2500', w) : repeat('-', w);
    }
    if (s === 'double') {
      return repeat('\u2550', w);
    }
    // ornate
    var half = Math.floor((w - 10) / 2);
    return repeat('\u2550', half) + ' \u2666 \u2694\uFE0F \u2666 ' + repeat('\u2550', half);
  };

  // ---------------------------------------------------------------------------
  // Feature 1: ASCII Particle Explosion
  // ---------------------------------------------------------------------------

  /**
   * Create an ASCII particle explosion at the given page coordinates.
   * Spawns 20-30 random ASCII characters that burst outward and fade out.
   * @param {number} x - page X coordinate (px)
   * @param {number} y - page Y coordinate (px)
   */
  AsciiOverlay.prototype.createExplosion = function (x, y) {
    var count = 20 + Math.floor(Math.random() * 11); // 20-30 particles
    for (var i = 0; i < count; i++) {
      var span = document.createElement('span');
      span.className = 'ascii-explosion-particle';
      span.textContent = EXPLOSION_CHARS[Math.floor(Math.random() * EXPLOSION_CHARS.length)];
      span.style.left = x + 'px';
      span.style.top = y + 'px';

      // Random direction
      var angle = Math.random() * Math.PI * 2;
      var distance = 60 + Math.random() * 120;
      var tx = Math.cos(angle) * distance;
      var ty = Math.sin(angle) * distance;
      var rotation = (Math.random() - 0.5) * 720;

      span.style.transition = 'transform 500ms cubic-bezier(0.2, 0.8, 0.3, 1), opacity 500ms ease-out';
      span.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
      span.style.opacity = '1';

      document.body.appendChild(span);

      // Force reflow then animate
      /* jshint -W030 */
      span.offsetWidth;
      /* jshint +W030 */

      span.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) rotate(' + rotation + 'deg) scale(0.2)';
      span.style.opacity = '0';

      // Remove after animation
      (function (el) {
        setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 520);
      })(span);
    }
  };

  // ---------------------------------------------------------------------------
  // Feature 2: ASCII Weather Overlay
  // ---------------------------------------------------------------------------

  /**
   * Create a subtle weather overlay with gently falling ASCII snow characters.
   * Very low opacity (0.04), slow drift. Different from matrix rain.
   */
  AsciiOverlay.prototype.createWeatherOverlay = function () {
    if (this._weatherCanvas) return; // already created

    var canvas = document.createElement('canvas');
    canvas.id = 'ascii-weather-canvas';
    document.body.appendChild(canvas);

    this._weatherCanvas = canvas;
    this._weatherCtx = canvas.getContext('2d');

    this._resizeWeather();
    this._weatherActive = true;

    var self = this;
    window.addEventListener('resize', function () {
      self._resizeWeather();
    });
  };

  AsciiOverlay.prototype._resizeWeather = function () {
    var canvas = this._weatherCanvas;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create snow-like drops
    var count = Math.floor(canvas.width / 12);
    this._weatherDrops = [];
    for (var i = 0; i < count; i++) {
      this._weatherDrops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.15 + Math.random() * 0.35,
        drift: (Math.random() - 0.5) * 0.3,
        char: WEATHER_CHARS[Math.floor(Math.random() * WEATHER_CHARS.length)],
        size: 10 + Math.random() * 6,
      });
    }
  };

  AsciiOverlay.prototype._updateWeather = function () {
    var ctx = this._weatherCtx;
    var canvas = this._weatherCanvas;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(200, 168, 110, 1)';

    for (var i = 0; i < this._weatherDrops.length; i++) {
      var drop = this._weatherDrops[i];
      ctx.font = drop.size + 'px "Courier New", monospace';
      ctx.fillText(drop.char, drop.x, drop.y);

      drop.y += drop.speed;
      drop.x += drop.drift;

      // Wrap around
      if (drop.y > canvas.height + 10) {
        drop.y = -10;
        drop.x = Math.random() * canvas.width;
      }
      if (drop.x < -10) drop.x = canvas.width + 10;
      if (drop.x > canvas.width + 10) drop.x = -10;
    }
  };

  // ---------------------------------------------------------------------------
  // Feature 3: Typewriter Class (character-by-character on viewport entry)
  // ---------------------------------------------------------------------------

  /**
   * Set up the IntersectionObserver for typewriter elements.
   * Called internally during init().
   */
  AsciiOverlay.prototype._setupTypewriterObserver = function () {
    if (!('IntersectionObserver' in window)) return;

    var self = this;
    this._typewriterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          self._animateTypewriter(entry.target);
          self._typewriterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  };

  /**
   * Mark an element for character-by-character typewriter reveal when it
   * enters the viewport. Each character appears with a 20ms delay.
   * Automatically applied to `.about-description` paragraphs if present.
   * @param {HTMLElement} element
   */
  AsciiOverlay.prototype.addTypewriterClass = function (element) {
    if (!this._typewriterObserver) return;
    // Store original text
    element.setAttribute('data-typewriter-text', element.textContent);
    element.textContent = '';
    this._typewriterObserver.observe(element);
  };

  AsciiOverlay.prototype._animateTypewriter = function (el) {
    var fullText = el.getAttribute('data-typewriter-text') || '';
    el.textContent = '';
    var idx = 0;
    var length = fullText.length;
    var cursor = document.createElement('span');
    cursor.className = 'ascii-typewriter-cursor';
    cursor.textContent = '\u2588';
    el.appendChild(cursor);

    function tick() {
      if (idx < length) {
        // Insert character before the cursor
        var charNode = document.createTextNode(fullText[idx]);
        el.insertBefore(charNode, cursor);
        idx++;
        setTimeout(tick, 20);
      } else {
        // Remove cursor after a short delay
        setTimeout(function () {
          if (cursor.parentNode) cursor.parentNode.removeChild(cursor);
        }, 600);
      }
    }
    tick();
  };

  // ---------------------------------------------------------------------------
  // Feature 4: ASCII Transition Wipes
  // ---------------------------------------------------------------------------

  /**
   * Fill the screen with ASCII block characters column-by-column ('left') or
   * row-by-row ('down'), hold briefly, then remove them in the same order.
   * Total duration ~400ms. The callback fires at the midpoint (screen fully covered).
   * @param {'left'|'down'} direction
   * @param {function} [callback] - fired at the midpoint when screen is fully covered
   */
  AsciiOverlay.prototype.createWipeTransition = function (direction, callback) {
    var dir = direction || 'left';
    var overlay = document.createElement('div');
    overlay.className = 'ascii-wipe-overlay';

    var cols = 20;
    var rows = 12;
    var cells = [];

    if (dir === 'left') {
      overlay.style.flexDirection = 'row';
      for (var c = 0; c < cols; c++) {
        var col = document.createElement('div');
        col.className = 'ascii-wipe-col';
        var colCells = [];
        for (var r = 0; r < rows; r++) {
          var cell = document.createElement('div');
          cell.className = 'ascii-wipe-cell';
          cell.textContent = '\u2588';
          col.appendChild(cell);
          colCells.push(cell);
        }
        cells.push(colCells);
      }
      // Append columns
      for (var i = 0; i < cols; i++) {
        overlay.appendChild(cells[i][0].parentNode);
      }
    } else {
      // 'down' - row by row
      overlay.style.flexDirection = 'column';
      for (var r = 0; r < rows; r++) {
        var row = document.createElement('div');
        row.className = 'ascii-wipe-col';
        row.style.flexDirection = 'row';
        row.style.display = 'flex';
        var rowCells = [];
        for (var c = 0; c < cols; c++) {
          var cell = document.createElement('div');
          cell.className = 'ascii-wipe-cell';
          cell.textContent = '\u2588';
          row.appendChild(cell);
          rowCells.push(cell);
        }
        cells.push(rowCells);
      }
      for (var i = 0; i < rows; i++) {
        overlay.appendChild(cells[i][0].parentNode);
      }
    }

    document.body.appendChild(overlay);

    var totalSteps = (dir === 'left') ? cols : rows;
    var fillDelay = Math.floor(150 / totalSteps); // ~150ms to fill
    var holdTime = 100;
    var unfillDelay = fillDelay;

    // Phase 1: fill in
    function fillStep(step) {
      if (step >= totalSteps) {
        // Midpoint: screen is fully covered
        if (typeof callback === 'function') callback();
        // Hold, then start removing
        setTimeout(function () { unfillStep(0); }, holdTime);
        return;
      }
      var group = cells[step];
      for (var j = 0; j < group.length; j++) {
        group[j].classList.add('active');
      }
      setTimeout(function () { fillStep(step + 1); }, fillDelay);
    }

    // Phase 2: unfill
    function unfillStep(step) {
      if (step >= totalSteps) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        return;
      }
      var group = cells[step];
      for (var j = 0; j < group.length; j++) {
        group[j].classList.remove('active');
      }
      setTimeout(function () { unfillStep(step + 1); }, unfillDelay);
    }

    fillStep(0);
  };

  // ---------------------------------------------------------------------------
  // Feature 5: Interactive ASCII Mini-Map
  // ---------------------------------------------------------------------------

  /**
   * Create a tiny fixed ASCII map showing page sections. The current section
   * is highlighted. Hidden on mobile (<768px via CSS). Updates on scroll.
   * @param {Array<{id: string, label: string}>} [sections] - override default sections
   * @returns {HTMLElement}
   */
  AsciiOverlay.prototype.createMiniMap = function (sections) {
    var defaultSections = [
      { id: 'home', label: 'Home' },
      { id: 'about', label: 'About' },
      { id: 'projects', label: 'Projects' },
      { id: 'skills', label: 'Skills' },
      { id: 'contact', label: 'Contact' },
    ];
    this._miniMapSections = sections || defaultSections;

    var container = document.createElement('div');
    container.className = 'ascii-minimap';

    // Top border
    var topRow = document.createElement('div');
    topRow.className = 'ascii-minimap-row';
    topRow.textContent = '\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2510';
    container.appendChild(topRow);

    var self = this;
    for (var i = 0; i < this._miniMapSections.length; i++) {
      (function (index, sec) {
        var row = document.createElement('div');
        row.className = 'ascii-minimap-row';
        row.setAttribute('data-minimap-index', String(index));
        row.textContent = '\u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2502 ' + sec.label;
        row.addEventListener('click', function () {
          var target = document.getElementById(sec.id);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
        container.appendChild(row);
      })(i, this._miniMapSections[i]);
    }

    // Bottom border
    var bottomRow = document.createElement('div');
    bottomRow.className = 'ascii-minimap-row';
    bottomRow.textContent = '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2518';
    container.appendChild(bottomRow);

    this._miniMapEl = container;
    document.body.appendChild(container);
    this._updateMiniMap();

    return container;
  };

  AsciiOverlay.prototype._updateMiniMap = function () {
    if (!this._miniMapEl || !this._miniMapSections.length) return;

    var scrollY = window.scrollY || window.pageYOffset;
    var viewH = window.innerHeight;
    var currentIndex = 0;

    // Determine which section is most visible
    for (var i = 0; i < this._miniMapSections.length; i++) {
      var el = document.getElementById(this._miniMapSections[i].id);
      if (el) {
        var rect = el.getBoundingClientRect();
        if (rect.top <= viewH * 0.5) {
          currentIndex = i;
        }
      }
    }

    // Update rows
    var rows = this._miniMapEl.querySelectorAll('[data-minimap-index]');
    for (var i = 0; i < rows.length; i++) {
      var idx = parseInt(rows[i].getAttribute('data-minimap-index'), 10);
      var sec = this._miniMapSections[idx];
      if (idx === currentIndex) {
        rows[i].textContent = '\u2502\u2593\u2593\u2593\u2593\u2593\u2593\u2502 ' + sec.label;
      } else {
        rows[i].textContent = '\u2502\u2591\u2591\u2591\u2591\u2591\u2591\u2502 ' + sec.label;
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Feature 7: ASCII Tooltip System
  // ---------------------------------------------------------------------------

  /**
   * Attach an ASCII-bordered tooltip to an element. Shown on hover above
   * the element.
   * @param {HTMLElement} element
   * @param {string} text
   */
  AsciiOverlay.prototype.createTooltip = function (element, text) {
    var tooltipEl = document.createElement('div');
    tooltipEl.className = 'ascii-tooltip';

    // Build box
    var innerWidth = text.length + 2; // 1 space padding each side
    var top    = '\u2554' + repeat('\u2550', innerWidth) + '\u2557';
    var middle = '\u2551 ' + text + ' \u2551';
    var bottom = '\u255A' + repeat('\u2550', innerWidth) + '\u255D';
    // Pointer centered
    var pointerPad = Math.floor(innerWidth / 2);
    var pointer = repeat(' ', pointerPad) + '\u25BC';

    tooltipEl.textContent = top + '\n' + middle + '\n' + bottom + '\n' + pointer;

    document.body.appendChild(tooltipEl);

    function show() {
      var rect = element.getBoundingClientRect();
      var scrollX = window.scrollX || window.pageXOffset;
      var scrollY = window.scrollY || window.pageYOffset;

      // Measure tooltip
      tooltipEl.style.visibility = 'hidden';
      tooltipEl.classList.add('visible');
      var tipRect = tooltipEl.getBoundingClientRect();
      tooltipEl.style.visibility = '';

      var left = rect.left + scrollX + (rect.width / 2) - (tipRect.width / 2);
      var topPos = rect.top + scrollY - tipRect.height - 4;

      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top = topPos + 'px';
      tooltipEl.classList.add('visible');
    }

    function hide() {
      tooltipEl.classList.remove('visible');
    }

    element.addEventListener('mouseenter', show);
    element.addEventListener('mouseleave', hide);

    this._tooltips.push({
      el: tooltipEl,
      target: element,
      show: show,
      hide: hide,
    });
  };

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  AsciiOverlay.prototype.destroy = function () {
    this._animationActive = false;
    this._weatherActive = false;

    if (this._observer) {
      this._observer.disconnect();
    }

    if (this._typewriterObserver) {
      this._typewriterObserver.disconnect();
    }

    if (this._matrixCanvas && this._matrixCanvas.parentNode) {
      this._matrixCanvas.parentNode.removeChild(this._matrixCanvas);
    }

    if (this._weatherCanvas && this._weatherCanvas.parentNode) {
      this._weatherCanvas.parentNode.removeChild(this._weatherCanvas);
    }

    if (this._miniMapEl && this._miniMapEl.parentNode) {
      this._miniMapEl.parentNode.removeChild(this._miniMapEl);
    }

    // Remove tooltips
    for (var i = 0; i < this._tooltips.length; i++) {
      var tip = this._tooltips[i];
      tip.target.removeEventListener('mouseenter', tip.show);
      tip.target.removeEventListener('mouseleave', tip.hide);
      if (tip.el.parentNode) tip.el.parentNode.removeChild(tip.el);
    }

    this._torches = [];
    this._skillBars = [];
    this._revealElements = [];
    this._tooltips = [];
    this._weatherDrops = [];
    this._miniMapSections = [];
  };

  // ---------------------------------------------------------------------------
  // Helpers (private)
  // ---------------------------------------------------------------------------

  function repeat(str, count) {
    var result = '';
    for (var i = 0; i < count; i++) {
      result += str;
    }
    return result;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  window.AsciiOverlay = AsciiOverlay;

})();
