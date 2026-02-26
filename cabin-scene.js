/**
 * CabinScene - A Japanese countryside cabin 3D scene built with Three.js
 * Uses THREE global from CDN r128 (no imports)
 * Atmospheric misty forest clearing -> cozy interior workspace
 */

class CabinScene {
  constructor() {
    this.clock = new THREE.Clock();
    this.mouse = { x: 0, y: 0 };
    this.scrollPercent = 0;
    this.disposed = false;

    // Scene objects
    this.trees = [];
    this.fireflies = [];
    this.fireflyParticles = null;
    this.dustParticles = null;
    this.dustVelocities = null;
    this.lampLight = null;
    this.lampFlickerBase = 1.2;
    this.brainGroup = null;
    this.brainVisible = false;
    this.brainFadeAlpha = 0;
    this.brainMaterials = [];

    // Interactive objects (clickable)
    this.interactiveObjects = [];
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();
    this.hoveredObject = null;

    // Performance tier
    this.performanceTier = 'high';
    this._perfSettings = null;

    // Camera smoothing
    this.cameraCurrentPos = new THREE.Vector3();
    this.cameraCurrentLookAt = new THREE.Vector3();
    this.cameraTargetOffset = new THREE.Vector3();
    this.cameraCurrentOffset = new THREE.Vector3();

    try {
      this._init();
    } catch (err) {
      console.error('[CabinScene] Initialization failed:', err);
    }
  }

  // ── Initialization ──────────────────────────────────────────────────

  _init() {
    // Detect performance settings
    if (window.MobileHandler) {
      try {
        const mobileHandler = new window.MobileHandler();
        this._perfSettings = mobileHandler.getPerformanceSettings
          ? mobileHandler.getPerformanceSettings()
          : null;
        if (this._perfSettings && this._perfSettings.tier) {
          this.performanceTier = this._perfSettings.tier;
        }
      } catch (e) {
        console.warn('[CabinScene] Could not read MobileHandler settings:', e);
      }
    }

    this._createRenderer();
    this._createScene();
    this._createCamera();
    this._buildOutdoorScene();
    this._buildCabin();
    this._buildInterior();
    this._createLighting();
    this._createFireflies();
    this._createDustParticles();
    this._createStars();
    this._createShootingStars();
    this._createMoon();
    // ASCII post-process removed
    this._bindEvents();
    this._animate();
  }

  _createRenderer() {
    const canvas = document.getElementById('cabin-canvas');
    if (!canvas) {
      console.warn('[CabinScene] No #cabin-canvas element found');
      return;
    }
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: this.performanceTier !== 'low',
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Cap pixel ratio at 1.5 for performance — still looks sharp but saves GPU
    const maxPixelRatio = (this._perfSettings && this._perfSettings.pixelRatio)
      ? Math.min(this._perfSettings.pixelRatio, 1.5)
      : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(maxPixelRatio);

    const enableShadows = this.performanceTier === 'high';
    this.renderer.shadowMap.enabled = enableShadows;
    if (enableShadows) {
      this.renderer.shadowMap.type = THREE.PCFShadowMap; // cheaper than PCFSoft
    }
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.7;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }

  _createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x050810, 0.016);
  }

  _createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    // Camera path keyframes: [scroll%, position, lookAt]
    // Laptop screen center: (-1.8, 1.19, -5.61)
    this.cameraKeyframes = [
      { t: 0.0,  pos: new THREE.Vector3(0, 2.5, 25),    look: new THREE.Vector3(0, 2.0, 0) },
      { t: 0.15, pos: new THREE.Vector3(-2, 2.2, 16),    look: new THREE.Vector3(0, 1.8, 0) },
      { t: 0.30, pos: new THREE.Vector3(0, 1.8, 6),      look: new THREE.Vector3(0, 1.6, -1) },
      { t: 0.45, pos: new THREE.Vector3(0, 1.7, 2.5),    look: new THREE.Vector3(0, 1.6, -2) },
      { t: 0.55, pos: new THREE.Vector3(0, 1.7, 0),      look: new THREE.Vector3(-1, 1.5, -4) },
      { t: 0.68, pos: new THREE.Vector3(0, 1.7, -1),     look: new THREE.Vector3(-1.5, 1.3, -5) },
      { t: 0.78, pos: new THREE.Vector3(-0.5, 1.5, -2.5), look: new THREE.Vector3(-1.8, 1.19, -5.61) },
      { t: 0.88, pos: new THREE.Vector3(-1.4, 1.3, -4.5), look: new THREE.Vector3(-1.8, 1.19, -5.61) },
      { t: 1.0,  pos: new THREE.Vector3(-1.72, 1.22, -5.25), look: new THREE.Vector3(-1.8, 1.19, -5.61) },
    ];

    this.camera.position.copy(this.cameraKeyframes[0].pos);
    this.cameraCurrentPos.copy(this.cameraKeyframes[0].pos);
    this.cameraCurrentLookAt.copy(this.cameraKeyframes[0].look);
  }

  // ── Procedural Textures ─────────────────────────────────────────────

  _createGrassTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Dark green base
    ctx.fillStyle = '#0d1f0d';
    ctx.fillRect(0, 0, size, size);

    // Scatter grass-like marks
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const g = 15 + Math.random() * 30;
      const r = 8 + Math.random() * 12;
      const b = 5 + Math.random() * 8;
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 5);
    }

    // Some brownish patches
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillStyle = `rgba(${30 + Math.random() * 20},${20 + Math.random() * 15},${10 + Math.random() * 8},0.4)`;
      ctx.fillRect(x, y, 3 + Math.random() * 6, 3 + Math.random() * 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
  }

  _createWoodTexture(plankDirection) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Warm brown base
    ctx.fillStyle = '#3a2518';
    ctx.fillRect(0, 0, size, size);

    const isHorizontal = plankDirection === 'horizontal';
    const plankCount = isHorizontal ? 8 : 6;

    for (let p = 0; p < plankCount; p++) {
      const plankStart = (p / plankCount) * size;
      const plankSize = size / plankCount;

      // Plank color variation
      const base = 40 + Math.random() * 25;
      const r = base + 15 + Math.random() * 10;
      const g = base + Math.random() * 8;
      const b = base * 0.5 + Math.random() * 5;
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      if (isHorizontal) {
        ctx.fillRect(0, plankStart + 2, size, plankSize - 4);
      } else {
        ctx.fillRect(plankStart + 2, 0, plankSize - 4, size);
      }

      // Wood grain lines
      for (let i = 0; i < 30; i++) {
        ctx.strokeStyle = `rgba(${base - 10},${base - 15},${base * 0.3},0.3)`;
        ctx.lineWidth = 0.5 + Math.random();
        ctx.beginPath();
        if (isHorizontal) {
          const y = plankStart + 4 + Math.random() * (plankSize - 8);
          ctx.moveTo(0, y);
          ctx.lineTo(size, y + (Math.random() - 0.5) * 4);
        } else {
          const x = plankStart + 4 + Math.random() * (plankSize - 8);
          ctx.moveTo(x, 0);
          ctx.lineTo(x + (Math.random() - 0.5) * 4, size);
        }
        ctx.stroke();
      }

      // Plank gap / dark line
      ctx.fillStyle = 'rgba(10,5,2,0.7)';
      if (isHorizontal) {
        ctx.fillRect(0, plankStart, size, 2);
        ctx.fillRect(0, plankStart + plankSize - 2, size, 2);
      } else {
        ctx.fillRect(plankStart, 0, 2, size);
        ctx.fillRect(plankStart + plankSize - 2, 0, 2, size);
      }
    }

    // Knots and noise
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = Math.random() * 15 - 7;
      ctx.fillStyle = `rgba(${35 + v},${25 + v},${15 + v},0.3)`;
      ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  _createPathTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2a1f15';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const v = 30 + Math.random() * 20;
      ctx.fillStyle = `rgba(${v + 10},${v},${v - 5},0.4)`;
      ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    return texture;
  }

  _createGlowTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,220,150,0.5)');
    gradient.addColorStop(0.6, 'rgba(255,180,80,0.15)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  _createParticleTexture() {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
  }

  _createCodeScreenTexture() {
    const size = 512;
    this._screenCanvas = document.createElement('canvas');
    this._screenCanvas.width = size;
    this._screenCanvas.height = size;
    this._screenCtx = this._screenCanvas.getContext('2d');
    this._screenEditing = false;
    this._screenCursorVisible = true;
    this._screenCursorTimer = null;

    // The editable text lines (terminal style)
    this._screenLines = [
      '> ',
      'If you don’t take risks, you can’t create a future -luffy',
      '',
      '> ls projects/',
      'protocols/ kodan/  serenidad/  anime/',
      'lasers/',
      '',
      '> cat contact.txt',
      'email: dieter@serenidad.app',
      'twitter: @dieterzsh',
      'github: Deetschoe',
      '',
      '> _',
    ];
    this._screenCursorLine = this._screenLines.length - 1;
    this._screenCursorCol = 0;

    this._renderScreen();
    this._screenTexture = new THREE.CanvasTexture(this._screenCanvas);
    return this._screenTexture;
  }

  _renderScreen() {
    const ctx = this._screenCtx;
    const size = 512;

    // Background
    ctx.fillStyle = '#1e1e2a';
    ctx.fillRect(0, 0, size, size);

    // Top bar
    ctx.fillStyle = '#16161e';
    ctx.fillRect(0, 0, size, 28);
    ctx.fillStyle = '#ff5f56'; ctx.fillRect(8, 8, 10, 10);
    ctx.fillStyle = '#ffbd2e'; ctx.fillRect(24, 8, 10, 10);
    ctx.fillStyle = '#27c93f'; ctx.fillRect(40, 8, 10, 10);
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.fillText("dieter's terminal", 175, 18);

    // Content area
    ctx.font = '12px monospace';
    const lineH = 18;
    const startY = 45;
    const pad = 14;

    for (let i = 0; i < this._screenLines.length; i++) {
      const line = this._screenLines[i];
      const y = startY + i * lineH;

      if (y > size - 10) break;

      // Color coding (terminal style)
      if (line.startsWith('>')) {
        ctx.fillStyle = '#7a9a78';
        ctx.font = '12px monospace';
      } else if (line.startsWith('email:') || line.startsWith('twitter:') || line.startsWith('github:')) {
        ctx.fillStyle = '#ffdb4e';
        ctx.font = '12px monospace';
      } else if (line.includes('/')) {
        ctx.fillStyle = '#6a9fd8';
        ctx.font = '12px monospace';
      } else {
        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
      }

      ctx.fillText(line, pad, y);

      // Draw cursor on the active line when editing
      if (this._screenEditing && i === this._screenCursorLine && this._screenCursorVisible) {
        const beforeCursor = line.substring(0, this._screenCursorCol);
        const cursorX = pad + ctx.measureText(beforeCursor).width;
        ctx.fillStyle = '#c49a6c';
        ctx.fillRect(cursorX, y - 11, 7, 14);
      }
    }

    // Update texture if it exists
    if (this._screenTexture) {
      this._screenTexture.needsUpdate = true;
    }
  }

  enableScreenEditing() {
    if (this._screenEditing) return;
    this._screenEditing = true;
    this._screenCursorVisible = true;

    // Blink cursor
    this._screenCursorTimer = setInterval(() => {
      this._screenCursorVisible = !this._screenCursorVisible;
      this._renderScreen();
    }, 530);

    // Listen for keyboard input
    this._screenKeyHandler = (e) => {
      if (!this._screenEditing) return;

      const line = this._screenCursorLine;
      const col = this._screenCursorCol;

      if (e.key === 'Backspace') {
        e.preventDefault();
        if (col > 0) {
          this._screenLines[line] = this._screenLines[line].substring(0, col - 1) + this._screenLines[line].substring(col);
          this._screenCursorCol--;
        } else if (line > 0) {
          // Merge with previous line
          this._screenCursorCol = this._screenLines[line - 1].length;
          this._screenLines[line - 1] += this._screenLines[line];
          this._screenLines.splice(line, 1);
          this._screenCursorLine--;
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const before = this._screenLines[line].substring(0, col);
        const after = this._screenLines[line].substring(col);
        this._screenLines[line] = before;
        this._screenLines.splice(line + 1, 0, after);
        this._screenCursorLine++;
        this._screenCursorCol = 0;
      } else if (e.key === 'ArrowLeft') {
        if (col > 0) this._screenCursorCol--;
      } else if (e.key === 'ArrowRight') {
        if (col < this._screenLines[line].length) this._screenCursorCol++;
      } else if (e.key === 'ArrowUp') {
        if (line > 0) {
          this._screenCursorLine--;
          this._screenCursorCol = Math.min(this._screenCursorCol, this._screenLines[this._screenCursorLine].length);
        }
      } else if (e.key === 'ArrowDown') {
        if (line < this._screenLines.length - 1) {
          this._screenCursorLine++;
          this._screenCursorCol = Math.min(this._screenCursorCol, this._screenLines[this._screenCursorLine].length);
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this._screenLines[line] = this._screenLines[line].substring(0, col) + e.key + this._screenLines[line].substring(col);
        this._screenCursorCol++;
      }

      this._screenCursorVisible = true;
      this._renderScreen();
    };

    window.addEventListener('keydown', this._screenKeyHandler);
    this._renderScreen();
  }

  disableScreenEditing() {
    if (!this._screenEditing) return;
    this._screenEditing = false;
    if (this._screenCursorTimer) {
      clearInterval(this._screenCursorTimer);
      this._screenCursorTimer = null;
    }
    if (this._screenKeyHandler) {
      window.removeEventListener('keydown', this._screenKeyHandler);
      this._screenKeyHandler = null;
    }
    this._screenCursorVisible = false;
    this._renderScreen();
  }

  focusScreenInput() {
    if (!this._screenEditing) {
      this.enableScreenEditing();
    }
    // Place cursor at end of last non-empty line
    for (let i = this._screenLines.length - 1; i >= 0; i--) {
      if (this._screenLines[i].length > 0 || i === this._screenLines.length - 1) {
        this._screenCursorLine = i;
        this._screenCursorCol = this._screenLines[i].length;
        break;
      }
    }
    this._screenCursorVisible = true;
    this._renderScreen();
  }

  // ── Outdoor Scene ───────────────────────────────────────────────────

  _buildOutdoorScene() {
    // Ground plane
    const grassTex = this._createGrassTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      roughness: 0.95,
      metalness: 0.0,
      color: 0x1a2a1e,
    });
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Path to cabin door
    const pathTex = this._createPathTexture();
    const pathMat = new THREE.MeshStandardMaterial({
      map: pathTex,
      roughness: 0.9,
      metalness: 0.0,
      color: 0x3a3228,
    });
    const pathGeo = new THREE.PlaneGeometry(1.8, 22);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 13);
    path.receiveShadow = true;
    this.scene.add(path);

    // Rolling hills in the background
    this._createHills();

    // Outdoor bamboo clusters flanking the path
    this._createOutdoorBamboo();

    // Trees
    this._createTrees();
  }

  _createOutdoorBamboo() {
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a1a, roughness: 0.7, metalness: 0.1,
    });
    const bambooNodeMat = new THREE.MeshStandardMaterial({
      color: 0x153015, roughness: 0.6, metalness: 0.1,
    });

    // Just a couple small clusters for accent, not a forest
    const clusters = [
      { x: -2.8, z: 10, count: 3 },
      { x: 3.0, z: 11, count: 2 },
    ];

    const maxClusters = this.performanceTier === 'low' ? 1 : 2;

    for (let c = 0; c < maxClusters && c < clusters.length; c++) {
      const cl = clusters[c];
      for (let s = 0; s < cl.count; s++) {
        const bx = cl.x + (Math.random() - 0.5) * 0.6;
        const bz = cl.z + (Math.random() - 0.5) * 0.6;
        const bh = 4.0 + Math.random() * 2.0;
        const segments = 5;
        const segH = bh / segments;
        const radius = 0.03 + Math.random() * 0.015;

        for (let seg = 0; seg < segments; seg++) {
          const segGeo = new THREE.CylinderGeometry(radius * 0.9, radius, segH - 0.02, 5);
          const segMesh = new THREE.Mesh(segGeo, bambooMat);
          segMesh.position.set(bx, seg * segH + segH / 2, bz);
          this.scene.add(segMesh);
          if (seg < segments - 1) {
            const nodeGeo = new THREE.CylinderGeometry(radius + 0.005, radius + 0.005, 0.02, 5);
            const node = new THREE.Mesh(nodeGeo, bambooNodeMat);
            node.position.set(bx, (seg + 1) * segH, bz);
            this.scene.add(node);
          }
        }
      }
    }
  }

  _createTrees() {
    const treeCount = this.performanceTier === 'low' ? 6
      : this.performanceTier === 'mid' ? 14
      : 20;

    // Trunk material - very dark bark for night
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x150e06,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Japanese forest canopy colors - very dark with blue-green tint for night
    const canopyColors = [
      0x081a10, 0x0a1810, 0x07150e, 0x0c1e18, 0x06140f,
      0x0e2418, 0x091c14, 0x08180e,
    ];

    // Tree positions - scattered around clearing, cabin area kept free
    const positions = [
      { x: -8, z: 5, s: 1.3 },   { x: -10, z: -5, s: 1.0 },  { x: -7, z: 16, s: 1.5 },
      { x: 9, z: 8, s: 1.1 },    { x: 11, z: -3, s: 1.4 },   { x: 9, z: 19, s: 0.9 },
      { x: -5, z: 23, s: 1.2 },  { x: 6, z: 25, s: 1.6 },    { x: -13, z: 12, s: 1.0 },
      { x: 13, z: 14, s: 1.3 },  { x: -6, z: -9, s: 1.1 },   { x: 8, z: -7, s: 0.8 },
      { x: -15, z: 8, s: 1.2 },  { x: 15, z: 6, s: 1.1 },    { x: -12, z: 20, s: 1.4 },
      { x: 12, z: 22, s: 1.0 },  { x: -9, z: -10, s: 1.3 },  { x: 10, z: -10, s: 1.2 },
      { x: -16, z: -2, s: 0.9 }, { x: 16, z: 18, s: 1.5 },
    ];

    // ── Japanese Cedar / Pine Trees ──────────────────────────────────────

    for (let i = 0; i < treeCount && i < positions.length; i++) {
      const p = positions[i];
      const scale = p.s * (0.85 + Math.random() * 0.3);
      const trunkH = 3.5 * scale;
      const trunkR = 0.12 + Math.random() * 0.08;

      // Trunk - slight lean for organic feel
      const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      const leanX = (Math.random() - 0.5) * 0.3;
      const leanZ = (Math.random() - 0.5) * 0.3;
      trunk.position.set(p.x + leanX * 0.5, trunkH / 2, p.z + leanZ * 0.5);
      trunk.rotation.x = leanZ * 0.08;
      trunk.rotation.z = -leanX * 0.08;
      trunk.castShadow = true;
      this.scene.add(trunk);

      // Layered canopy tiers (3-4 tiers stacked, Japanese cedar style)
      const tierCount = 3 + Math.floor(Math.random() * 2); // 3 or 4 tiers
      const baseRadius = (1.8 + Math.random() * 0.8) * scale;
      const tierHeight = (1.4 + Math.random() * 0.4) * scale;
      const topCanopyGeo = []; // we'll track the topmost tier for sway

      for (let t = 0; t < tierCount; t++) {
        const tierFraction = t / tierCount;
        const radius = baseRadius * (1.0 - tierFraction * 0.35);
        const height = tierHeight * (1.0 - tierFraction * 0.15);
        const yBase = trunkH * 0.55 + t * tierHeight * 0.7;

        // Slight horizontal offset per tier for organic silhouette
        const offsetX = (Math.random() - 0.5) * 0.25;
        const offsetZ = (Math.random() - 0.5) * 0.25;

        const colorIdx = (i * 3 + t) % canopyColors.length;
        const tierMat = new THREE.MeshStandardMaterial({
          color: canopyColors[colorIdx],
          roughness: 0.92,
          metalness: 0.0,
        });

        // Each tier is a wide, flat cone (characteristic layered look)
        const tierGeo = new THREE.ConeGeometry(radius, height, 8);
        const tierMesh = new THREE.Mesh(tierGeo, tierMat);
        tierMesh.position.set(
          p.x + offsetX + leanX * (t * 0.15),
          yBase + height / 2,
          p.z + offsetZ + leanZ * (t * 0.15)
        );
        tierMesh.castShadow = true;
        this.scene.add(tierMesh);

        // Register the topmost tier for sway animation
        if (t === tierCount - 1) {
          const origPositions = Float32Array.from(tierGeo.attributes.position.array);
          this.trees.push({
            mesh: tierMesh,
            geometry: tierGeo,
            originalPositions: origPositions,
            phase: Math.random() * Math.PI * 2,
            speed: 0.25 + Math.random() * 0.25,
          });
        }
      }
    }

    // ── Bamboo Stalks ────────────────────────────────────────────────────

    if (this.performanceTier !== 'low') {
      const bambooMat = new THREE.MeshStandardMaterial({
        color: 0x4a6b3a,
        roughness: 0.7,
        metalness: 0.05,
      });
      const bambooNodeMat = new THREE.MeshStandardMaterial({
        color: 0x3d5a2e,
        roughness: 0.6,
        metalness: 0.05,
      });

      const bambooPositions = [
        { x: -11, z: 8 },  { x: -11.4, z: 8.5 }, { x: -10.6, z: 7.7 },
        { x: 12, z: 10 },  { x: 12.5, z: 10.3 }, { x: 11.7, z: 9.6 },
        { x: -9, z: -7 },  { x: -8.5, z: -7.4 },
      ];

      const bambooCount = this.performanceTier === 'high' ? bambooPositions.length : 5;

      for (let b = 0; b < bambooCount; b++) {
        const bp = bambooPositions[b];
        const stalkHeight = 5 + Math.random() * 4;
        const stalkRadius = 0.05 + Math.random() * 0.03;
        const segments = 4 + Math.floor(Math.random() * 3);
        const segHeight = stalkHeight / segments;

        for (let s = 0; s < segments; s++) {
          // Segment cylinder
          const segGeo = new THREE.CylinderGeometry(stalkRadius, stalkRadius * 1.05, segHeight, 6);
          const seg = new THREE.Mesh(segGeo, bambooMat);
          seg.position.set(bp.x, s * segHeight + segHeight / 2, bp.z);
          seg.castShadow = true;
          this.scene.add(seg);

          // Node ring between segments
          if (s > 0) {
            const nodeGeo = new THREE.CylinderGeometry(stalkRadius * 1.4, stalkRadius * 1.4, 0.06, 6);
            const node = new THREE.Mesh(nodeGeo, bambooNodeMat);
            node.position.set(bp.x, s * segHeight, bp.z);
            this.scene.add(node);
          }
        }

        // Register top segment for sway
        const topSegGeo = new THREE.CylinderGeometry(stalkRadius * 0.8, stalkRadius, segHeight, 6);
        const topSeg = new THREE.Mesh(topSegGeo, bambooMat);
        topSeg.position.set(bp.x, stalkHeight + segHeight / 2, bp.z);
        topSeg.castShadow = true;
        this.scene.add(topSeg);

        const origPositions = Float32Array.from(topSegGeo.attributes.position.array);
        this.trees.push({
          mesh: topSeg,
          geometry: topSegGeo,
          originalPositions: origPositions,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.4,
        });
      }
    }

    // ── Ground Rocks ─────────────────────────────────────────────────────

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a18,
      roughness: 0.95,
      metalness: 0.0,
    });
    const mossyRockMat = new THREE.MeshStandardMaterial({
      color: 0x1a2418,
      roughness: 0.95,
      metalness: 0.0,
    });

    const rockPositions = [
      { x: -4, z: 7, sx: 1.2, sy: 0.4, sz: 1.0, mossy: true },
      { x: 6, z: 5, sx: 0.8, sy: 0.35, sz: 0.9, mossy: false },
      { x: -8, z: 12, sx: 1.5, sy: 0.5, sz: 1.3, mossy: true },
      { x: 10, z: 16, sx: 1.0, sy: 0.3, sz: 0.7, mossy: false },
      { x: -7, z: 20, sx: 0.9, sy: 0.4, sz: 1.1, mossy: true },
    ];

    const rockCount = this.performanceTier === 'low' ? 2 : rockPositions.length;

    for (let r = 0; r < rockCount; r++) {
      const rp = rockPositions[r];
      const rockGeo = new THREE.IcosahedronGeometry(1, 0);
      const rock = new THREE.Mesh(rockGeo, rp.mossy ? mossyRockMat : rockMat);
      rock.position.set(rp.x, rp.sy * 0.5, rp.z);
      rock.scale.set(rp.sx, rp.sy, rp.sz);
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.rotation.x = (Math.random() - 0.5) * 0.3;
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);
    }

    // ── Small Bushes Near Cabin ──────────────────────────────────────────

    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x0e1a14,
      roughness: 0.9,
      metalness: 0.0,
    });
    const bushMatLight = new THREE.MeshStandardMaterial({
      color: 0x142818,
      roughness: 0.88,
      metalness: 0.0,
    });

    const bushPositions = [
      { x: -2.8, z: 3.5, s: 0.5 },
      { x: 2.6, z: 3.2, s: 0.45 },
      { x: -3.5, z: 1.5, s: 0.35 },
      { x: 3.3, z: 1.8, s: 0.4 },
      { x: -1.5, z: 4.5, s: 0.3 },
      { x: 1.8, z: 4.2, s: 0.38 },
    ];

    const bushCount = this.performanceTier === 'low' ? 2 : bushPositions.length;

    for (let b = 0; b < bushCount; b++) {
      const bp = bushPositions[b];
      const mat = b % 2 === 0 ? bushMat : bushMatLight;

      // Main bush body
      const bushGeo = new THREE.SphereGeometry(bp.s, 6, 5);
      const bush = new THREE.Mesh(bushGeo, mat);
      bush.position.set(bp.x, bp.s * 0.6, bp.z);
      bush.scale.set(1.0, 0.7, 1.0);
      bush.castShadow = true;
      this.scene.add(bush);

      // Secondary smaller lobe for organic shape
      const lobe2Geo = new THREE.SphereGeometry(bp.s * 0.7, 5, 4);
      const lobe2 = new THREE.Mesh(lobe2Geo, mat);
      lobe2.position.set(
        bp.x + (Math.random() - 0.5) * bp.s,
        bp.s * 0.5,
        bp.z + (Math.random() - 0.5) * bp.s
      );
      lobe2.scale.set(1.0, 0.65, 1.0);
      lobe2.castShadow = true;
      this.scene.add(lobe2);
    }
  }

  // ── Cabin Structure ─────────────────────────────────────────────────

  _buildCabin() {
    const wallTex = this._createWoodTexture('vertical');
    wallTex.repeat.set(2, 1);

    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
      metalness: 0.05,
      color: 0x4a3825,
    });

    // Cabin dimensions
    const cabinW = 7;   // width (x)
    const cabinH = 3.5; // wall height
    const cabinD = 8;   // depth (z)
    const wallThick = 0.2;
    const cabinCenterX = 0;
    const cabinCenterZ = -2; // cabin center position

    this.cabinBounds = {
      minX: cabinCenterX - cabinW / 2,
      maxX: cabinCenterX + cabinW / 2,
      minZ: cabinCenterZ - cabinD / 2,
      maxZ: cabinCenterZ + cabinD / 2,
      height: cabinH,
    };

    // Back wall
    const backGeo = new THREE.BoxGeometry(cabinW, cabinH, wallThick);
    const backWall = new THREE.Mesh(backGeo, wallMat);
    backWall.position.set(cabinCenterX, cabinH / 2, cabinCenterZ - cabinD / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const sideGeo = new THREE.BoxGeometry(wallThick, cabinH, cabinD);
    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(cabinCenterX - cabinW / 2, cabinH / 2, cabinCenterZ);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall - with window gap
    // Right wall bottom section
    const rwBottomGeo = new THREE.BoxGeometry(wallThick, 1.2, cabinD);
    const rwBottom = new THREE.Mesh(rwBottomGeo, wallMat);
    rwBottom.position.set(cabinCenterX + cabinW / 2, 0.6, cabinCenterZ);
    rwBottom.castShadow = true;
    this.scene.add(rwBottom);

    // Right wall top section
    const rwTopGeo = new THREE.BoxGeometry(wallThick, 1.0, cabinD);
    const rwTop = new THREE.Mesh(rwTopGeo, wallMat);
    rwTop.position.set(cabinCenterX + cabinW / 2, cabinH - 0.5, cabinCenterZ);
    rwTop.castShadow = true;
    this.scene.add(rwTop);

    // Right wall side segments (around window)
    const rwSide1Geo = new THREE.BoxGeometry(wallThick, 1.3, 2.5);
    const rwSide1 = new THREE.Mesh(rwSide1Geo, wallMat);
    rwSide1.position.set(cabinCenterX + cabinW / 2, 1.85, cabinCenterZ - 2.75);
    this.scene.add(rwSide1);

    const rwSide2 = new THREE.Mesh(rwSide1Geo, wallMat);
    rwSide2.position.set(cabinCenterX + cabinW / 2, 1.85, cabinCenterZ + 2.75);
    this.scene.add(rwSide2);

    // Window glass on right wall (slightly emissive for light effect)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x4a6a7a,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3,
      emissive: 0x223344,
      emissiveIntensity: 0.3,
    });
    const windowGeo = new THREE.PlaneGeometry(1.3, 3.0);
    const windowPane = new THREE.Mesh(windowGeo, windowMat);
    windowPane.position.set(cabinCenterX + cabinW / 2 + 0.01, 1.85, cabinCenterZ);
    windowPane.rotation.y = Math.PI / 2;
    this.scene.add(windowPane);
    this.windowPane = windowPane;

    // Front wall with door opening
    const doorW = 1.4;
    const doorH = 2.4;

    // Left part of front wall
    const frontLeftW = (cabinW - doorW) / 2;
    const flGeo = new THREE.BoxGeometry(frontLeftW, cabinH, wallThick);
    const frontLeft = new THREE.Mesh(flGeo, wallMat);
    frontLeft.position.set(
      cabinCenterX - doorW / 2 - frontLeftW / 2,
      cabinH / 2,
      cabinCenterZ + cabinD / 2
    );
    frontLeft.castShadow = true;
    this.scene.add(frontLeft);

    // Right part of front wall
    const frontRight = new THREE.Mesh(flGeo, wallMat);
    frontRight.position.set(
      cabinCenterX + doorW / 2 + frontLeftW / 2,
      cabinH / 2,
      cabinCenterZ + cabinD / 2
    );
    frontRight.castShadow = true;
    this.scene.add(frontRight);

    // Top part above door
    const topDoorGeo = new THREE.BoxGeometry(doorW, cabinH - doorH, wallThick);
    const topDoor = new THREE.Mesh(topDoorGeo, wallMat);
    topDoor.position.set(
      cabinCenterX,
      doorH + (cabinH - doorH) / 2,
      cabinCenterZ + cabinD / 2
    );
    this.scene.add(topDoor);

    // Porch step
    const porchMat = new THREE.MeshStandardMaterial({
      color: 0x5a4030,
      roughness: 0.9,
      metalness: 0.0,
    });
    const porchGeo = new THREE.BoxGeometry(2.5, 0.15, 1.0);
    const porch = new THREE.Mesh(porchGeo, porchMat);
    porch.position.set(cabinCenterX, 0.075, cabinCenterZ + cabinD / 2 + 0.5);
    porch.receiveShadow = true;
    this.scene.add(porch);

    // Sliding door (starts closed, slides right as camera approaches)
    const doorWoodTex = this._createWoodTexture('vertical');
    const doorMat = new THREE.MeshStandardMaterial({
      map: doorWoodTex,
      color: 0x6b4b2a,
      roughness: 0.85,
      metalness: 0.0,
    });
    const doorGeo = new THREE.BoxGeometry(1.4, 2.4, 0.06);
    this.cabinDoor = new THREE.Mesh(doorGeo, doorMat);
    this.cabinDoor.position.set(cabinCenterX, 1.2, cabinCenterZ + cabinD / 2 + 0.02);
    this.cabinDoor.castShadow = true;
    this.scene.add(this.cabinDoor);
    this._doorClosedX = cabinCenterX;
    this._doorOpenX = cabinCenterX + 1.6;

    // Door handle
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.6,
    });
    const handleGeo = new THREE.BoxGeometry(0.03, 0.12, 0.04);
    this.doorHandle = new THREE.Mesh(handleGeo, handleMat);
    this.doorHandle.position.set(cabinCenterX + 0.55, 1.2, cabinCenterZ + cabinD / 2 + 0.05);
    this.scene.add(this.doorHandle);

    // Roof - A-frame gable
    this._buildRoof(cabinCenterX, cabinH, cabinCenterZ, cabinW, cabinD);
  }

  _buildRoof(cx, wallH, cz, cabinW, cabinD) {
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x1a1008,
      roughness: 0.95,
      metalness: 0.0,
    });

    const roofOverhang = 0.8;
    const roofD = cabinD + roofOverhang * 2;
    const roofRise = 2.0;
    const roofPeakY = wallH + roofRise;
    const halfW = cabinW / 2;

    // Roof slope length (hypotenuse)
    const slopeLen = Math.sqrt(halfW * halfW + roofRise * roofRise) + roofOverhang * 0.5;
    const roofAngle = Math.atan2(roofRise, halfW);
    const roofThick = 0.12;

    // Left roof slab (thin box, rotated to slope)
    const roofGeo = new THREE.BoxGeometry(slopeLen, roofThick, roofD);

    const leftRoof = new THREE.Mesh(roofGeo, roofMat);
    leftRoof.position.set(
      cx - halfW / 2,
      wallH + roofRise / 2,
      cz
    );
    leftRoof.rotation.z = roofAngle;
    leftRoof.castShadow = true;
    leftRoof.receiveShadow = true;
    this.scene.add(leftRoof);

    // Right roof slab
    const rightRoof = new THREE.Mesh(roofGeo, roofMat);
    rightRoof.position.set(
      cx + halfW / 2,
      wallH + roofRise / 2,
      cz
    );
    rightRoof.rotation.z = -roofAngle;
    rightRoof.castShadow = true;
    rightRoof.receiveShadow = true;
    this.scene.add(rightRoof);

    // Ridge beam
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1a0f08,
      roughness: 0.9,
    });
    const ridgeGeo = new THREE.BoxGeometry(0.18, 0.18, roofD);
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.set(cx, roofPeakY, cz);
    this.scene.add(ridge);

    // Front and back gable triangles - darker to blend with night sky
    const gableMat = new THREE.MeshStandardMaterial({
      color: 0x2a1c10,
      roughness: 0.95,
      side: THREE.DoubleSide,
    });

    for (const zOff of [cabinD / 2, -cabinD / 2]) {
      const shape = new THREE.Shape();
      shape.moveTo(-cabinW / 2 - roofOverhang * 0.3, wallH);
      shape.lineTo(0, roofPeakY);
      shape.lineTo(cabinW / 2 + roofOverhang * 0.3, wallH);
      shape.lineTo(-cabinW / 2 - roofOverhang * 0.3, wallH);

      const gableGeo = new THREE.ShapeGeometry(shape);
      const gable = new THREE.Mesh(gableGeo, gableMat);
      gable.position.set(cx, 0, cz + zOff);
      this.scene.add(gable);
    }
  }

  // ── Interior ────────────────────────────────────────────────────────

  _buildInterior() {
    const cb = this.cabinBounds;

    // ── Floor ──────────────────────────────────────────────────────────
    const floorTex = this._createWoodTexture('horizontal');
    floorTex.repeat.set(2, 3);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.85,
      metalness: 0.05,
      color: 0x6a5040,
    });
    const floorGeo = new THREE.PlaneGeometry(
      cb.maxX - cb.minX - 0.4,
      cb.maxZ - cb.minZ - 0.4
    );
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(
      (cb.minX + cb.maxX) / 2,
      0.01,
      (cb.minZ + cb.maxZ) / 2
    );
    floor.receiveShadow = true;
    this.scene.add(floor);



    // ── Desk against the back-left wall ───────────────────────────────
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.8,
      metalness: 0.05,
    });

    // Desk top
    const deskTopGeo = new THREE.BoxGeometry(2.5, 0.08, 1.0);
    const deskTop = new THREE.Mesh(deskTopGeo, deskMat);
    deskTop.position.set(cb.minX + 1.5, 1.0, cb.minZ + 0.7);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    this.scene.add(deskTop);
    this.deskPosition = deskTop.position.clone();

    // Desk legs
    const legGeo = new THREE.BoxGeometry(0.08, 1.0, 0.08);
    const legPositions = [
      [cb.minX + 0.35, 0.5, cb.minZ + 0.3],
      [cb.minX + 0.35, 0.5, cb.minZ + 1.1],
      [cb.minX + 2.6, 0.5, cb.minZ + 0.3],
      [cb.minX + 2.6, 0.5, cb.minZ + 1.1],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, deskMat);
      leg.position.set(x, y, z);
      this.scene.add(leg);
    });

    // ── Desk lamp ─────────────────────────────────────────────────────
    const lampBaseMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.4,
    });
    const lampBaseGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.06, 12);
    const lampBase = new THREE.Mesh(lampBaseGeo, lampBaseMat);
    lampBase.position.set(cb.minX + 1.0, 1.07, cb.minZ + 0.5);
    this.scene.add(lampBase);

    // Lamp arm
    const lampArmGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
    const lampArm = new THREE.Mesh(lampArmGeo, lampBaseMat);
    lampArm.position.set(cb.minX + 1.0, 1.3, cb.minZ + 0.5);
    this.scene.add(lampArm);

    // Lamp shade (cone)
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0x886644,
      roughness: 0.8,
      metalness: 0.0,
      emissive: 0x442200,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const shadeGeo = new THREE.ConeGeometry(0.18, 0.15, 12, 1, true);
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(cb.minX + 1.0, 1.55, cb.minZ + 0.5);
    shade.rotation.x = Math.PI;
    this.scene.add(shade);

    // ── Coffee mug on desk ────────────────────────────────────────────
    const mugMat = new THREE.MeshStandardMaterial({
      color: 0xccccbb,
      roughness: 0.6,
      metalness: 0.1,
    });
    const mugGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.1, 8);
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.set(cb.minX + 2.1, 1.07, cb.minZ + 0.7);
    this.scene.add(mug);

    // ── Laptop on desk (next to mug) ──────────────────────────────────
    const laptopMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.4,
      metalness: 0.6,
    });
    // Laptop screen with code - white background, green/dark text
    const laptopCodeTex = this._createCodeScreenTexture();
    const laptopScreenMat = new THREE.MeshStandardMaterial({
      map: laptopCodeTex,
      roughness: 0.15,
      metalness: 0.05,
      emissive: 0xaaaacc,
      emissiveIntensity: 0.5,
      emissiveMap: laptopCodeTex,
    });
    // Laptop base
    const laptopBaseGeo = new THREE.BoxGeometry(0.4, 0.02, 0.3);
    const laptopBase = new THREE.Mesh(laptopBaseGeo, laptopMat);
    laptopBase.position.set(cb.minX + 1.7, 1.05, cb.minZ + 0.55);
    this.scene.add(laptopBase);

    // Laptop keyboard
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.2,
    });
    const keyboardBaseMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.5,
      metalness: 0.3,
    });
    // Keyboard area (darker rectangle on base)
    const kbAreaGeo = new THREE.BoxGeometry(0.34, 0.003, 0.18);
    const kbArea = new THREE.Mesh(kbAreaGeo, keyboardBaseMat);
    kbArea.position.set(cb.minX + 1.7, 1.062, cb.minZ + 0.48);
    this.scene.add(kbArea);
    // Individual key rows (top row near screen, bottom row near trackpad)
    const keyW = 0.022, keyH = 0.018, keyD = 0.002;
    const keyGap = 0.004;
    const startX = cb.minX + 1.7 - 0.15;
    const startZ = cb.minZ + 0.42;
    const keyRows = [12, 12, 11, 10]; // keys per row (top to bottom)
    for (let row = 0; row < keyRows.length; row++) {
      const numKeys = keyRows[row];
      const rowOffset = row === 2 ? 0.01 : row === 3 ? 0.02 : 0;
      for (let k = 0; k < numKeys; k++) {
        const keyGeo = new THREE.BoxGeometry(keyW, keyD, keyH);
        const key = new THREE.Mesh(keyGeo, keyMat);
        key.position.set(
          startX + rowOffset + k * (keyW + keyGap),
          1.065,
          startZ + row * (keyH + keyGap)
        );
        this.scene.add(key);
      }
    }
    // Spacebar
    const spaceGeo = new THREE.BoxGeometry(0.12, keyD, keyH);
    const spaceKey = new THREE.Mesh(spaceGeo, keyMat);
    spaceKey.position.set(cb.minX + 1.7, 1.065, startZ + 4 * (keyH + keyGap));
    this.scene.add(spaceKey);
    // Trackpad
    const trackpadMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.3,
      metalness: 0.4,
    });
    const trackpadGeo = new THREE.BoxGeometry(0.1, 0.002, 0.07);
    const trackpad = new THREE.Mesh(trackpadGeo, trackpadMat);
    trackpad.position.set(cb.minX + 1.7, 1.062, cb.minZ + 0.62);
    this.scene.add(trackpad);

    // Laptop screen (angled ~110 degrees from base)
    const laptopScreenGeo = new THREE.BoxGeometry(0.38, 0.26, 0.01);
    const laptopScreen = new THREE.Mesh(laptopScreenGeo, laptopScreenMat);
    laptopScreen.position.set(cb.minX + 1.7, 1.19, cb.minZ + 0.39);
    laptopScreen.rotation.x = -0.35;
    this.scene.add(laptopScreen);

    // Store reference so we can project screen corners and fade texture
    this.laptopScreenMesh = laptopScreen;
    this.laptopScreenMat = laptopScreenMat;

    // Mark laptop as interactive (clickable -> terminal)
    laptopBase.userData.interactive = 'laptop';
    laptopScreen.userData.interactive = 'laptop';
    this.interactiveObjects.push(laptopBase, laptopScreen);

    // ── Bookshelf on back wall ────────────────────────────────────────
    this._buildBookshelf(cb.minX + 3.2, 0, cb.minZ + 0.3);

    // ── Window from inside ────────────────────────────────────────────
    const insideWindowMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      emissive: 0x334455,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
    });
    const insideWindowGeo = new THREE.PlaneGeometry(3.0, 1.3);
    const insideWindow = new THREE.Mesh(insideWindowGeo, insideWindowMat);
    insideWindow.position.set(cb.maxX - 0.15, 1.85, (cb.minZ + cb.maxZ) / 2);
    insideWindow.rotation.y = -Math.PI / 2;
    this.scene.add(insideWindow);

    // ── Chair ─────────────────────────────────────────────────────────
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x4a3520,
      roughness: 0.85,
      metalness: 0.0,
    });
    // Seat
    const seatGeo = new THREE.BoxGeometry(0.5, 0.06, 0.5);
    const seat = new THREE.Mesh(seatGeo, chairMat);
    seat.position.set(cb.minX + 1.5, 0.6, cb.minZ + 1.5);
    this.scene.add(seat);
    // Chair legs
    const chairLegGeo = new THREE.BoxGeometry(0.05, 0.6, 0.05);
    [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]].forEach(([dx, dz]) => {
      const cleg = new THREE.Mesh(chairLegGeo, chairMat);
      cleg.position.set(cb.minX + 1.5 + dx, 0.3, cb.minZ + 1.5 + dz);
      this.scene.add(cleg);
    });
    // Chair back
    const chairBackGeo = new THREE.BoxGeometry(0.5, 0.6, 0.05);
    const chairBack = new THREE.Mesh(chairBackGeo, chairMat);
    chairBack.position.set(cb.minX + 1.5, 0.93, cb.minZ + 1.75);
    this.scene.add(chairBack);

    // ── Retro CRT TV in back-right corner ─────────────────────────────
    const tvX = 2.0;
    const tvZ = -5.0;

    // TV stand / small table
    const tvStandMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.85,
      metalness: 0.05,
    });
    const tvStandTopGeo = new THREE.BoxGeometry(0.8, 0.06, 0.5);
    const tvStandTop = new THREE.Mesh(tvStandTopGeo, tvStandMat);
    tvStandTop.position.set(tvX, 0.6, tvZ);
    tvStandTop.castShadow = true;
    this.scene.add(tvStandTop);
    // Stand legs
    const tvStandLegGeo = new THREE.BoxGeometry(0.06, 0.6, 0.06);
    [[-0.34, -0.19], [-0.34, 0.19], [0.34, -0.19], [0.34, 0.19]].forEach(([dx, dz]) => {
      const sleg = new THREE.Mesh(tvStandLegGeo, tvStandMat);
      sleg.position.set(tvX + dx, 0.3, tvZ + dz);
      this.scene.add(sleg);
    });

    // CRT body (lighter gray so it doesn't appear as a black cube)
    const tvBodyMat = new THREE.MeshStandardMaterial({
      color: 0x5a5a5a,
      roughness: 0.6,
      metalness: 0.3,
    });
    const tvBodyGeo = new THREE.BoxGeometry(0.55, 0.45, 0.4);
    const tvBody = new THREE.Mesh(tvBodyGeo, tvBodyMat);
    tvBody.position.set(tvX, 0.9, tvZ);
    tvBody.castShadow = true;
    this.scene.add(tvBody);

    // Rabbit ear antennas
    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.7,
    });
    const antennaGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 4);
    const antennaL = new THREE.Mesh(antennaGeo, antennaMat);
    antennaL.position.set(tvX - 0.08, 1.3, tvZ);
    antennaL.rotation.z = 0.3;
    this.scene.add(antennaL);
    const antennaR = new THREE.Mesh(antennaGeo, antennaMat);
    antennaR.position.set(tvX + 0.08, 1.3, tvZ);
    antennaR.rotation.z = -0.3;
    this.scene.add(antennaR);

    // TV screen with video texture
    const video = document.createElement('video');
    video.src = 'public/kodan.mp4';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    const videoTex = new THREE.VideoTexture(video);
    videoTex.minFilter = THREE.LinearFilter;
    videoTex.magFilter = THREE.LinearFilter;

    const tvScreenMat = new THREE.MeshStandardMaterial({
      map: videoTex,
      emissive: 0xffffff,
      emissiveMap: videoTex,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.0,
    });
    const tvScreenGeo = new THREE.PlaneGeometry(0.48, 0.36);
    const tvScreen = new THREE.Mesh(tvScreenGeo, tvScreenMat);
    tvScreen.position.set(tvX, 0.92, tvZ + 0.226);
    this.scene.add(tvScreen);

    this.tvVideo = video;
    this.tvScreen = tvScreen;

    // Mark TV parts as interactive (clickable -> kodan link)
    tvBody.userData.interactive = 'tv';
    tvScreen.userData.interactive = 'tv';
    this.interactiveObjects.push(tvBody, tvScreen);

    // Subtle blue point light near TV screen
    const tvLight = new THREE.PointLight(0x4466aa, 0.6, 3.0);
    tvLight.position.set(tvX, 0.95, tvZ + 0.4);
    this.scene.add(tvLight);
    this.tvLight = tvLight;

    // (3D Printer removed)

    // ── Wall posters with image textures ────────────────────────────────
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1008,
      roughness: 0.9,
      metalness: 0.05,
    });

    const posterConfigs = [
      { file: 'public/poster1.png', w: 0.6, h: 0.45, x: -1.5, y: 2.2, z: cb.minZ + 0.13, ry: 0 },
      { file: 'public/poster2.png', w: 0.35, h: 0.5,  x: -0.5, y: 2.3, z: cb.minZ + 0.13, ry: 0 },
      { file: 'public/poster3.png', w: 0.3, h: 0.3,   x: 0.3, y: 2.5, z: cb.minZ + 0.13, ry: 0 },
      { file: 'public/poster4.png', w: 0.5, h: 0.4,   x: 0.9, y: 2.2, z: cb.minZ + 0.13, ry: 0 },
      { file: 'public/poster5.png', w: 0.4, h: 0.55,  x: cb.minX + 0.13, y: 2.0, z: -2.5, ry: Math.PI / 2 },
    ];

    const loader = new THREE.TextureLoader();
    posterConfigs.forEach((cfg) => {
      // Frame
      const frameGeo = new THREE.BoxGeometry(cfg.w + 0.06, cfg.h + 0.06, 0.02);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(cfg.x, cfg.y, cfg.z);
      frame.rotation.y = cfg.ry;
      this.scene.add(frame);

      // Poster art with image texture
      const posterTex = loader.load(cfg.file);
      const posterMat = new THREE.MeshStandardMaterial({
        map: posterTex,
        roughness: 0.7,
        metalness: 0.0,
      });
      const artGeo = new THREE.BoxGeometry(cfg.w, cfg.h, 0.015);
      const art = new THREE.Mesh(artGeo, posterMat);
      art.position.set(cfg.x, cfg.y, cfg.z + (cfg.ry === 0 ? 0.01 : 0));
      art.rotation.y = cfg.ry;
      if (cfg.ry !== 0) {
        art.position.x = cfg.x + 0.01;
        art.position.z = cfg.z;
      }
      this.scene.add(art);
    });

    // ── Hanging pendant light from ceiling center ─────────────────────
    const pendantX = (cb.minX + cb.maxX) / 2;
    const pendantZ = (cb.minZ + cb.maxZ) / 2;
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.3,
    });
    const wireGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.0, 4);
    const wire = new THREE.Mesh(wireGeo, wireMat);
    wire.position.set(pendantX, cb.height - 0.5, pendantZ);
    this.scene.add(wire);

    // Pendant shade (cone)
    const pendantShadeMat = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      roughness: 0.7,
      metalness: 0.1,
      emissive: 0x553300,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });
    const pendantShadeGeo = new THREE.ConeGeometry(0.2, 0.15, 12, 1, true);
    const pendantShade = new THREE.Mesh(pendantShadeGeo, pendantShadeMat);
    pendantShade.position.set(pendantX, cb.height - 1.05, pendantZ);
    pendantShade.rotation.x = Math.PI;
    this.scene.add(pendantShade);

    // Pendant bulb (small sphere)
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffddaa,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.0,
    });
    const bulbGeo = new THREE.SphereGeometry(0.05, 8, 6);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(pendantX, cb.height - 1.1, pendantZ);
    this.scene.add(bulb);

    // Pendant point light (warm, medium intensity)
    const pendantLight = new THREE.PointLight(0xffddaa, 0.8, 6.0);
    pendantLight.position.set(pendantX, cb.height - 1.1, pendantZ);
    pendantLight.castShadow = true;
    this.scene.add(pendantLight);
    this.pendantLight = pendantLight;

    // ── String lights along the back wall ─────────────────────────────
    const stringLightMat = new THREE.MeshStandardMaterial({
      color: 0xffcc66,
      emissive: 0xffaa33,
      emissiveIntensity: 1.0,
      roughness: 0.3,
      metalness: 0.0,
    });
    const stringLightGeo = new THREE.SphereGeometry(0.03, 6, 4);
    const numStringLights = 12;
    const slStartX = cb.minX + 0.5;
    const slEndX = cb.maxX - 0.5;
    const slY = cb.height - 0.3;
    const slZ = cb.minZ + 0.15;
    for (let i = 0; i < numStringLights; i++) {
      const t = i / (numStringLights - 1);
      const sx = slStartX + t * (slEndX - slStartX);
      // Slight sag in the middle (catenary approximation)
      const sag = -0.15 * Math.sin(t * Math.PI);
      const sl = new THREE.Mesh(stringLightGeo, stringLightMat);
      sl.position.set(sx, slY + sag, slZ);
      this.scene.add(sl);
    }

    // ── Science equipment (test tubes, beakers, etc.) ───────────────────
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xccddee,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5,
    });
    const liquidMat = new THREE.MeshStandardMaterial({
      color: 0x33aa77,
      roughness: 0.3,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
    });
    const liquidMat2 = new THREE.MeshStandardMaterial({
      color: 0x5566cc,
      roughness: 0.3,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
    });
    const liquidMat3 = new THREE.MeshStandardMaterial({
      color: 0xcc5533,
      roughness: 0.3,
      metalness: 0.0,
      transparent: true,
      opacity: 0.6,
    });

    // Test tube rack on desk
    const rackX = cb.minX + 0.5;
    const rackZ = cb.minZ + 0.5;
    const rackY = 1.04;

    // Rack base
    const rackBaseGeo = new THREE.BoxGeometry(0.2, 0.015, 0.06);
    const rackBaseMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.5, metalness: 0.3 });
    const rackBase = new THREE.Mesh(rackBaseGeo, rackBaseMat);
    rackBase.position.set(rackX, rackY, rackZ);
    this.scene.add(rackBase);

    // Test tubes (4 tubes in rack)
    const tubeLiquids = [liquidMat, liquidMat2, liquidMat3, liquidMat];
    for (let t = 0; t < 4; t++) {
      const tx = rackX - 0.06 + t * 0.04;
      // Glass tube
      const tubeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6, 1, true);
      const tube = new THREE.Mesh(tubeGeo, glassMat);
      tube.position.set(tx, rackY + 0.07, rackZ);
      this.scene.add(tube);
      // Liquid inside (shorter, solid)
      const fillH = 0.04 + Math.random() * 0.05;
      const fillGeo = new THREE.CylinderGeometry(0.006, 0.006, fillH, 6);
      const fill = new THREE.Mesh(fillGeo, tubeLiquids[t]);
      fill.position.set(tx, rackY + fillH / 2 + 0.01, rackZ);
      this.scene.add(fill);
    }

    // Beaker on desk edge
    const beakerX = cb.minX + 2.4;
    const beakerZ = cb.minZ + 0.4;
    const beakerY = 1.04;
    const beakerGeo = new THREE.CylinderGeometry(0.04, 0.035, 0.08, 8, 1, true);
    const beaker = new THREE.Mesh(beakerGeo, glassMat);
    beaker.position.set(beakerX, beakerY + 0.04, beakerZ);
    this.scene.add(beaker);
    const beakerLiqGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.05, 8);
    const beakerLiq = new THREE.Mesh(beakerLiqGeo, liquidMat2);
    beakerLiq.position.set(beakerX, beakerY + 0.025, beakerZ);
    this.scene.add(beakerLiq);

    // Erlenmeyer flask on desk
    const flaskX = cb.minX + 0.8;
    const flaskZ = cb.minZ + 0.4;
    const flaskY = 1.04;
    // Wide bottom
    const flaskBottomGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.05, 8);
    const flaskBottom = new THREE.Mesh(flaskBottomGeo, glassMat);
    flaskBottom.position.set(flaskX, flaskY + 0.025, flaskZ);
    this.scene.add(flaskBottom);
    // Narrow neck
    const flaskNeckGeo = new THREE.CylinderGeometry(0.01, 0.02, 0.04, 6);
    const flaskNeck = new THREE.Mesh(flaskNeckGeo, glassMat);
    flaskNeck.position.set(flaskX, flaskY + 0.07, flaskZ);
    this.scene.add(flaskNeck);
    // Green liquid
    const flaskLiqGeo = new THREE.CylinderGeometry(0.015, 0.035, 0.035, 8);
    const flaskLiq = new THREE.Mesh(flaskLiqGeo, liquidMat);
    flaskLiq.position.set(flaskX, flaskY + 0.018, flaskZ);
    this.scene.add(flaskLiq);

    // ── Mini fridge (right side, near 3D printer) ─────────────────────
    const fridgeMat = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      roughness: 0.4,
      metalness: 0.3,
    });
    const fridgeGeo = new THREE.BoxGeometry(0.5, 0.8, 0.45);
    const fridge = new THREE.Mesh(fridgeGeo, fridgeMat);
    fridge.position.set(cb.maxX - 0.5, 0.4, -1.0);
    fridge.castShadow = true;
    this.scene.add(fridge);

    // Fridge door line
    const fridgeDoorLineMat = new THREE.MeshStandardMaterial({
      color: 0x999999,
      roughness: 0.5,
      metalness: 0.4,
    });
    const fridgeDoorLineGeo = new THREE.BoxGeometry(0.48, 0.01, 0.005);
    const fridgeDoorLine = new THREE.Mesh(fridgeDoorLineGeo, fridgeDoorLineMat);
    fridgeDoorLine.position.set(cb.maxX - 0.5, 0.55, -0.77);
    this.scene.add(fridgeDoorLine);

    // Fridge handle
    const fridgeHandleGeo = new THREE.BoxGeometry(0.02, 0.15, 0.03);
    const fridgeHandle = new THREE.Mesh(fridgeHandleGeo, fridgeDoorLineMat);
    fridgeHandle.position.set(cb.maxX - 0.3, 0.65, -0.76);
    this.scene.add(fridgeHandle);

    // ── Pile of books on floor near desk ──────────────────────────────
    const bookPileColors = [0x8b2020, 0x203a8b, 0x2a5a3a, 0x6b5a2a, 0x5a2a6b, 0xaa6633];
    const pileX = cb.minX + 2.8;
    const pileZ = cb.minZ + 1.8;
    let stackY = 0.01;

    for (let i = 0; i < 6; i++) {
      const bw = 0.2 + Math.random() * 0.1;
      const bh = 0.025 + Math.random() * 0.015;
      const bd = 0.15 + Math.random() * 0.05;
      const bookMat = new THREE.MeshStandardMaterial({
        color: bookPileColors[i % bookPileColors.length],
        roughness: 0.85,
        metalness: 0.0,
      });
      const bookGeo = new THREE.BoxGeometry(bw, bh, bd);
      const book = new THREE.Mesh(bookGeo, bookMat);
      // Slightly offset and rotated for messy pile look
      book.position.set(
        pileX + (Math.random() - 0.5) * 0.05,
        stackY + bh / 2,
        pileZ + (Math.random() - 0.5) * 0.03
      );
      book.rotation.y = (Math.random() - 0.5) * 0.3;
      this.scene.add(book);
      stackY += bh;
    }

    // One book leaning against the pile
    const leanBookMat = new THREE.MeshStandardMaterial({
      color: 0x994422,
      roughness: 0.85,
    });
    const leanBookGeo = new THREE.BoxGeometry(0.18, 0.25, 0.025);
    const leanBook = new THREE.Mesh(leanBookGeo, leanBookMat);
    leanBook.position.set(pileX + 0.18, 0.12, pileZ);
    leanBook.rotation.z = -1.2;
    this.scene.add(leanBook);
  }

  _buildBookshelf(x, y, z) {
    const shelfMat = new THREE.MeshStandardMaterial({
      color: 0x4a3020,
      roughness: 0.9,
      metalness: 0.0,
    });

    const shelfW = 1.2;
    const shelfD = 0.3;
    const shelfH = 2.0;
    const shelfCount = 4;

    // Vertical sides
    const sideGeo = new THREE.BoxGeometry(0.05, shelfH, shelfD);
    const leftSide = new THREE.Mesh(sideGeo, shelfMat);
    leftSide.position.set(x, y + shelfH / 2, z);
    this.scene.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, shelfMat);
    rightSide.position.set(x + shelfW, y + shelfH / 2, z);
    this.scene.add(rightSide);

    // Horizontal shelves
    const hGeo = new THREE.BoxGeometry(shelfW, 0.04, shelfD);
    for (let i = 0; i <= shelfCount; i++) {
      const shelf = new THREE.Mesh(hGeo, shelfMat);
      shelf.position.set(x + shelfW / 2, y + (i / shelfCount) * shelfH, z);
      this.scene.add(shelf);
    }

    // Books (colored boxes on shelves)
    const bookColors = [0x8b2020, 0x203a8b, 0x3a6b2a, 0x6b5a2a, 0x5a2a6b, 0x2a5a6b];
    for (let s = 0; s < shelfCount; s++) {
      const shelfY = y + (s / shelfCount) * shelfH + 0.04;
      const nextShelfY = y + ((s + 1) / shelfCount) * shelfH;
      const maxBookH = nextShelfY - shelfY - 0.02;
      const bookCount = 3 + Math.floor(Math.random() * 4);
      let bx = x + 0.08;

      for (let b = 0; b < bookCount; b++) {
        const bw = 0.06 + Math.random() * 0.08;
        const bh = maxBookH * (0.6 + Math.random() * 0.4);
        const bd = shelfD * 0.8;
        const bookMat = new THREE.MeshStandardMaterial({
          color: bookColors[Math.floor(Math.random() * bookColors.length)],
          roughness: 0.85,
          metalness: 0.0,
        });
        const bookGeo = new THREE.BoxGeometry(bw, bh, bd);
        const book = new THREE.Mesh(bookGeo, bookMat);
        book.position.set(bx + bw / 2, shelfY + bh / 2, z);
        this.scene.add(book);
        bx += bw + 0.01;
        if (bx > x + shelfW - 0.1) break;
      }
    }
  }

  // ── Hills ──────────────────────────────────────────────────────────

  _createHills() {
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x0e1a12,
      roughness: 0.95,
      metalness: 0.0,
    });

    const hills = [
      { x: -18, z: -12, rx: 8, rz: 14, h: 3.5 },
      { x: 22, z: -8, rx: 12, rz: 10, h: 4.0 },
      { x: -25, z: 10, rx: 10, rz: 15, h: 2.8 },
      { x: 28, z: 15, rx: 14, rz: 10, h: 3.2 },
      { x: 0, z: -22, rx: 20, rz: 8, h: 2.5 },
      { x: -12, z: 28, rx: 12, rz: 10, h: 2.0 },
      { x: 15, z: 30, rx: 15, rz: 12, h: 3.0 },
    ];

    for (const h of hills) {
      const hillGeo = new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.scale.set(h.rx, h.h, h.rz);
      hill.position.set(h.x, 0, h.z);
      hill.receiveShadow = true;
      this.scene.add(hill);
    }
  }

  // ── Stars ─────────────────────────────────────────────────────────

  _createStars() {
    const starCount = this.performanceTier === 'low' ? 400 : 1500;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      // Distribute stars on a large dome
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // upper hemisphere only
      const r = 60 + Math.random() * 20;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) + 5; // push above horizon
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      sizes[i] = 0.3 + Math.random() * 0.7;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
    });

    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
    this._starsMesh = stars;
    this._starsMat = starMat;
    this._starsBaseOpacities = new Float32Array(starCount);
    this._starsPhases = new Float32Array(starCount);
    this._starsSpeeds = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      this._starsBaseOpacities[i] = 0.4 + Math.random() * 0.6;
      this._starsPhases[i] = Math.random() * Math.PI * 2;
      this._starsSpeeds[i] = 0.5 + Math.random() * 2.5;
    }
  }

  // ── Moon ──────────────────────────────────────────────────────────

  _createMoon() {
    const moonGeo = new THREE.SphereGeometry(2.5, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff,
      emissive: 0x8899bb,
      emissiveIntensity: 0.4,
      roughness: 0.8,
      metalness: 0.0,
    });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.set(20, 40, -15);
    this.scene.add(moon);

    // Moon glow halo
    const glowGeo = new THREE.SphereGeometry(4, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4466aa,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(moon.position);
    this.scene.add(glow);
  }

  // ── Shooting Stars ────────────────────────────────────────────────

  _createShootingStars() {
    this.shootingStars = [];
    this._shootingStarTimer = 0;
    this._shootingStarInterval = 0.8 + Math.random() * 1.5; // 0.8-2.3 seconds between

    const maxActive = this.performanceTier === 'low' ? 2 : 5;
    this._maxShootingStars = maxActive;
  }

  _spawnShootingStar() {
    // Random start position high in the sky
    const startX = (Math.random() - 0.5) * 60;
    const startY = 25 + Math.random() * 20;
    const startZ = -20 + (Math.random() - 0.5) * 40;

    // Direction: angled downward across the sky
    const dirX = (Math.random() - 0.5) * 2;
    const dirY = -(0.5 + Math.random() * 0.5);
    const dirZ = (Math.random() - 0.5) * 2;
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

    const speed = 15 + Math.random() * 10;
    const trailLen = 2.5 + Math.random() * 2;

    // Trail line
    const endX = startX + (dirX / len) * trailLen;
    const endY = startY + (dirY / len) * trailLen;
    const endZ = startZ + (dirZ / len) * trailLen;

    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-trailLen, 0, 0),
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
    });
    const line = new THREE.Line(geo, mat);
    line.position.set(startX, startY, startZ);

    // Orient line along direction
    const dir = new THREE.Vector3(dirX / len, dirY / len, dirZ / len);
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    line.quaternion.copy(quat);

    this.scene.add(line);

    this.shootingStars.push({
      mesh: line,
      material: mat,
      dir: dir,
      speed: speed,
      life: 0,
      maxLife: 0.8 + Math.random() * 0.6,
    });
  }

  _updateShootingStars(delta, elapsed) {
    // Twinkle stars
    if (this._starsMat) {
      const twinkle = 0.7 + Math.sin(elapsed * 1.5) * 0.15 + Math.sin(elapsed * 3.7) * 0.1;
      this._starsMat.opacity = Math.min(1.0, twinkle);
      this._starsMat.size = 0.15 + Math.sin(elapsed * 2.0) * 0.04;
    }

    if (!this.shootingStars) return;

    this._shootingStarTimer += delta;
    if (this._shootingStarTimer >= this._shootingStarInterval && this.shootingStars.length < this._maxShootingStars) {
      this._spawnShootingStar();
      this._shootingStarTimer = 0;
      this._shootingStarInterval = 0.8 + Math.random() * 1.5;
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const s = this.shootingStars[i];
      s.life += delta;

      // Move along direction
      s.mesh.position.x += s.dir.x * s.speed * delta;
      s.mesh.position.y += s.dir.y * s.speed * delta;
      s.mesh.position.z += s.dir.z * s.speed * delta;

      // Fade out
      const progress = s.life / s.maxLife;
      s.material.opacity = 1.0 - progress;

      if (s.life >= s.maxLife) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.material.dispose();
        this.shootingStars.splice(i, 1);
      }
    }
  }

  // ── Lighting ────────────────────────────────────────────────────────

  _createLighting() {
    // Dim ambient (cool night blue)
    const ambient = new THREE.AmbientLight(0x0a0e1a, 0.3);
    this.scene.add(ambient);

    // Moonlight - blue-white directional shining down
    const moonlight = new THREE.DirectionalLight(0x6688cc, 0.45);
    moonlight.position.set(8, 30, 5);
    moonlight.castShadow = this.performanceTier === 'high';
    if (moonlight.castShadow) {
      moonlight.shadow.mapSize.width = 1024;
      moonlight.shadow.mapSize.height = 1024;
      moonlight.shadow.camera.near = 0.5;
      moonlight.shadow.camera.far = 50;
      moonlight.shadow.camera.left = -15;
      moonlight.shadow.camera.right = 15;
      moonlight.shadow.camera.top = 15;
      moonlight.shadow.camera.bottom = -15;
      moonlight.shadow.bias = -0.002;
    }
    this.scene.add(moonlight);

    // Hemisphere for subtle fill (sky blue, ground dark)
    const hemi = new THREE.HemisphereLight(0x1a2244, 0x040608, 0.2);
    this.scene.add(hemi);

    // Warm window glow visible from outside
    const windowGlow = new THREE.PointLight(0xffaa55, 0.8, 12, 1.5);
    windowGlow.position.set(0, 2.0, -2);
    this.scene.add(windowGlow);

    // Desk lamp light (warm point light inside cabin)
    const cb = this.cabinBounds;

    // Emissive light plane at right-side window (visible from outside)
    const lightPlaneMat = new THREE.MeshStandardMaterial({
      color: 0xffcc88,
      emissive: 0xffaa55,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const lightPlaneGeo = new THREE.PlaneGeometry(3.0, 1.3);
    const lightPlane = new THREE.Mesh(lightPlaneGeo, lightPlaneMat);
    lightPlane.position.set(cb.maxX + 0.05, 1.85, (cb.minZ + cb.maxZ) / 2);
    lightPlane.rotation.y = Math.PI / 2;
    this.scene.add(lightPlane);

    // Light rays / volumetric glow from window (simple stretched planes)
    const rayMat = new THREE.MeshStandardMaterial({
      color: 0xffddaa,
      emissive: 0xffcc88,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let r = 0; r < 3; r++) {
      const rayGeo = new THREE.PlaneGeometry(1.5 + r * 0.8, 1.0 + r * 0.3);
      const ray = new THREE.Mesh(rayGeo, rayMat);
      ray.position.set(
        cb.maxX + 0.5 + r * 0.8,
        1.85 - r * 0.15,
        (cb.minZ + cb.maxZ) / 2
      );
      ray.rotation.y = Math.PI / 2;
      ray.rotation.z = -0.1 * r;
      this.scene.add(ray);
    }

    this.lampLight = new THREE.PointLight(0xffaa55, 1.2, 8, 1.8);
    this.lampLight.position.set(cb.minX + 1.0, 1.6, cb.minZ + 0.5);
    this.lampLight.castShadow = this.performanceTier === 'high';
    if (this.lampLight.castShadow) {
      this.lampLight.shadow.mapSize.width = 256;
      this.lampLight.shadow.mapSize.height = 256;
      this.lampLight.shadow.camera.near = 0.1;
      this.lampLight.shadow.camera.far = 8;
      this.lampLight.shadow.bias = -0.003;
    }
    this.scene.add(this.lampLight);
    this.lampFlickerBase = 1.2;

    // Subtle window light from outside (cool fill inside)
    const windowLight = new THREE.PointLight(0x5566aa, 0.3, 6, 2);
    windowLight.position.set(cb.maxX - 0.5, 2.0, (cb.minZ + cb.maxZ) / 2);
    this.scene.add(windowLight);

    // Overhead warm fill for cabin interior
    const overheadLight = new THREE.PointLight(0xffcc88, 0.6, 10, 1.5);
    overheadLight.position.set(0, 3.2, -2);
    this.scene.add(overheadLight);

    // Back corner fill light (where TV and 3D printer are)
    const cornerLight = new THREE.PointLight(0xffaa66, 0.3, 6, 2);
    cornerLight.position.set(cb.maxX - 1.5, 2.0, cb.minZ + 1.0);
    this.scene.add(cornerLight);

    // Increase ambient slightly for interior visibility
    const interiorAmbient = new THREE.AmbientLight(0x1a1510, 0.2);
    this.scene.add(interiorAmbient);

    // (Blanket and pillow removed per user request)

    // ── Light switches on wall near door ──────────────────────────────
    const switchPlateMat = new THREE.MeshStandardMaterial({
      color: 0xddd8cc,
      roughness: 0.7,
      metalness: 0.1,
    });
    const switchToggleMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.5,
      metalness: 0.2,
    });
    // Two switch plates side by side
    [0, 0.12].forEach(dx => {
      const plateGeo = new THREE.BoxGeometry(0.08, 0.12, 0.01);
      const plate = new THREE.Mesh(plateGeo, switchPlateMat);
      plate.position.set(cb.minX + 4.8 + dx, 1.3, cb.maxZ - 0.12);
      plate.rotation.y = Math.PI;
      this.scene.add(plate);
      // Toggle
      const toggleGeo = new THREE.BoxGeometry(0.03, 0.04, 0.015);
      const toggle = new THREE.Mesh(toggleGeo, switchToggleMat);
      toggle.position.set(cb.minX + 4.8 + dx, 1.3 + (dx === 0 ? 0.01 : -0.01), cb.maxZ - 0.125);
      toggle.rotation.y = Math.PI;
      this.scene.add(toggle);
    });

    // ── LED strip under desk (fun accent lighting) ────────────────────
    const ledStripMat = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      emissive: 0xffaa44,
      emissiveIntensity: 0.6,
      roughness: 0.5,
    });
    const ledStripGeo = new THREE.BoxGeometry(2.5, 0.01, 0.01);
    const ledStrip = new THREE.Mesh(ledStripGeo, ledStripMat);
    ledStrip.position.set(cb.minX + 1.5, 0.88, cb.minZ + 0.7);
    this.scene.add(ledStrip);
    // Warm glow from LED strip
    const ledLight = new THREE.PointLight(0xffaa44, 0.35, 3, 2);
    ledLight.position.set(cb.minX + 1.5, 0.7, cb.minZ + 0.9);
    this.scene.add(ledLight);

    // ── Warm string light glow (make existing string lights emit more) ──
    const stringGlow = new THREE.PointLight(0xffaa44, 0.3, 5, 2);
    stringGlow.position.set(0, cb.height - 0.6, -2);
    this.scene.add(stringGlow);

    // ── Hanging pendant lamp over desk ──────────────────────────────────
    const pendantCordMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const cordGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.2, 6);
    const cord = new THREE.Mesh(cordGeo, pendantCordMat);
    cord.position.set(cb.minX + 1.7, cb.height - 0.6, cb.minZ + 0.8);
    this.scene.add(cord);

    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xd4a55a,
      emissive: 0xffcc88,
      emissiveIntensity: 0.4,
      roughness: 0.6,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const shadeGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.14, 12, 1, true);
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(cb.minX + 1.7, cb.height - 1.25, cb.minZ + 0.8);
    this.scene.add(shade);

    const pendantBulbMat = new THREE.MeshStandardMaterial({
      color: 0xffeedd,
      emissive: 0xffcc88,
      emissiveIntensity: 1.0,
    });
    const pendantBulbGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const pendantBulb = new THREE.Mesh(pendantBulbGeo, pendantBulbMat);
    pendantBulb.position.set(cb.minX + 1.7, cb.height - 1.3, cb.minZ + 0.8);
    this.scene.add(pendantBulb);

    const pendantLight = new THREE.PointLight(0xffcc88, 0.9, 5, 1.8);
    pendantLight.position.set(cb.minX + 1.7, cb.height - 1.35, cb.minZ + 0.8);
    this.scene.add(pendantLight);

    // ── Small desk candle ───────────────────────────────────────────────
    const candleMat = new THREE.MeshStandardMaterial({ color: 0xf5e6cc, roughness: 0.8 });
    const candleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.1, 8);
    const candle = new THREE.Mesh(candleGeo, candleMat);
    candle.position.set(cb.minX + 2.5, 1.07, cb.minZ + 0.8);
    this.scene.add(candle);

    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffaa33,
      emissive: 0xff8800,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.9,
    });
    const flameGeo = new THREE.SphereGeometry(0.015, 6, 6);
    flameGeo.scale(1, 1.8, 1);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(cb.minX + 2.5, 1.15, cb.minZ + 0.8);
    this.scene.add(flame);
    this._candleFlame = flame;

    const candleLight = new THREE.PointLight(0xff9944, 0.4, 3, 2);
    candleLight.position.set(cb.minX + 2.5, 1.17, cb.minZ + 0.8);
    this.scene.add(candleLight);
    this._candleLight = candleLight;

    // ── Floor lamp in the corner ────────────────────────────────────────
    const floorLampPoleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });
    const poleGeo = new THREE.CylinderGeometry(0.015, 0.02, 1.6, 8);
    const pole = new THREE.Mesh(poleGeo, floorLampPoleMat);
    pole.position.set(cb.maxX - 0.6, 0.8, cb.minZ + 0.5);
    this.scene.add(pole);

    const floorShadeMat = new THREE.MeshStandardMaterial({
      color: 0xe8ddd0,
      emissive: 0xffddaa,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const floorShadeGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.25, 12, 1, true);
    const floorShade = new THREE.Mesh(floorShadeGeo, floorShadeMat);
    floorShade.position.set(cb.maxX - 0.6, 1.65, cb.minZ + 0.5);
    this.scene.add(floorShade);

    const floorLampLight = new THREE.PointLight(0xffddaa, 0.6, 4, 2);
    floorLampLight.position.set(cb.maxX - 0.6, 1.6, cb.minZ + 0.5);
    this.scene.add(floorLampLight);

    // ── Shelf accent light (warm glow on bookshelf) ─────────────────────
    const shelfLight = new THREE.PointLight(0xffcc88, 0.25, 2.5, 2);
    shelfLight.position.set(cb.minX + 3.2, 2.0, cb.minZ + 0.5);
    this.scene.add(shelfLight);

    // ── Warm bounce from ceiling ────────────────────────────────────────
    const ceilingBounce = new THREE.PointLight(0xffddbb, 0.15, 8, 2);
    ceilingBounce.position.set(0, cb.height - 0.3, -3);
    this.scene.add(ceilingBounce);
  }

  // ── Fireflies ───────────────────────────────────────────────────────

  _createFireflies() {
    if (this.performanceTier === 'low') return;

    const count = this.performanceTier === 'mid' ? 20 : 50;
    const positions = new Float32Array(count * 3);

    this.fireflies = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = 0.5 + Math.random() * 3;
      const z = Math.random() * 30 - 5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.fireflies.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        speedX: 0.2 + Math.random() * 0.4,
        speedY: 0.3 + Math.random() * 0.3,
        speedZ: 0.2 + Math.random() * 0.4,
        driftX: 1.0 + Math.random() * 2.0,
        driftY: 0.5 + Math.random() * 1.0,
        driftZ: 1.0 + Math.random() * 2.0,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: 0.5 + Math.random() * 1.5,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const glowTex = this._createGlowTexture();

    const mat = new THREE.PointsMaterial({
      map: glowTex,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      color: 0xffdd44,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.fireflyParticles = new THREE.Points(geo, mat);
    this.scene.add(this.fireflyParticles);
  }

  // ── Dust Particles (indoor) ─────────────────────────────────────────

  _createDustParticles() {
    const count = this.performanceTier === 'low' ? 20
      : this.performanceTier === 'mid' ? 40
      : 80;

    const cb = this.cabinBounds;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const rangeX = cb.maxX - cb.minX - 1;
    const rangeZ = cb.maxZ - cb.minZ - 1;

    for (let i = 0; i < count; i++) {
      positions[i * 3] = cb.minX + 0.5 + Math.random() * rangeX;
      positions[i * 3 + 1] = 0.3 + Math.random() * (cb.height - 0.5);
      positions[i * 3 + 2] = cb.minZ + 0.5 + Math.random() * rangeZ;

      velocities[i * 3] = (Math.random() - 0.5) * 0.002;
      velocities[i * 3 + 1] = Math.random() * 0.002 + 0.0005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleTex = this._createParticleTexture();

    const mat = new THREE.PointsMaterial({
      map: particleTex,
      size: 0.04,
      transparent: true,
      opacity: 0.3,
      color: 0xddccaa,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.dustParticles = new THREE.Points(geo, mat);
    this.scene.add(this.dustParticles);
    this.dustVelocities = velocities;
    this.dustBounds = { minX: cb.minX + 0.5, maxX: cb.maxX - 0.5, minZ: cb.minZ + 0.5, maxZ: cb.maxZ - 0.5, maxY: cb.height - 0.3 };
  }

  // ── Brain Voxel ─────────────────────────────────────────────────────

  toggleBrain(show) {
    if (show && !this.brainGroup) {
      this._createBrain();
    }

    this.brainVisible = show;
  }

  _createBrain() {
    this.brainGroup = new THREE.Group();

    const cubeCount = this.performanceTier === 'low' ? 100 : 300;
    const cubeSize = 0.1;

    const brainMat = new THREE.MeshStandardMaterial({
      color: 0xc49a6c,
      emissive: 0x8a6a3c,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.75,
      roughness: 0.4,
      metalness: 0.2,
    });
    this.brainMaterials.push(brainMat);

    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // Generate brain-like ellipsoid shape with central fissure
    let placed = 0;
    const maxAttempts = cubeCount * 5;
    let attempts = 0;

    while (placed < cubeCount && attempts < maxAttempts) {
      attempts++;

      // Random point in a bounding box
      const x = (Math.random() - 0.5) * 2.0;
      const y = (Math.random() - 0.5) * 1.4;
      const z = (Math.random() - 0.5) * 1.6;

      // Ellipsoid check: brain shape
      const ex = x / 1.0;  // wider
      const ey = y / 0.7;  // shorter
      const ez = z / 0.8;  // medium depth
      const dist = ex * ex + ey * ey + ez * ez;

      if (dist > 1.0) continue;

      // Central fissure - gap along y-z plane at x ~= 0
      const fissureWidth = 0.08 + 0.04 * (1 - Math.abs(z));
      if (Math.abs(x) < fissureWidth && y > -0.2) continue;

      // Slight asymmetry / lobes
      const lobeFactor = 1.0 - 0.3 * Math.abs(y + 0.3);
      if (dist > lobeFactor) continue;

      // Surface bias: prefer outer region for better shell look
      if (dist < 0.4 && Math.random() > 0.3) continue;

      const cube = new THREE.Mesh(cubeGeo, brainMat);
      cube.position.set(x, y, z);
      // Slight random rotation for organic feel
      cube.rotation.set(
        Math.random() * 0.3,
        Math.random() * 0.3,
        Math.random() * 0.3
      );
      this.brainGroup.add(cube);
      placed++;
    }

    // Position above desk
    if (this.deskPosition) {
      this.brainGroup.position.set(
        this.deskPosition.x,
        this.deskPosition.y + 1.2,
        this.deskPosition.z
      );
    } else {
      this.brainGroup.position.set(0, 2.5, -4);
    }

    this.brainGroup.visible = false;
    this.brainFadeAlpha = 0;
    this.scene.add(this.brainGroup);
  }

  _updateBrain(elapsed, delta) {
    if (!this.brainGroup) return;

    // Fade in/out
    if (this.brainVisible) {
      this.brainFadeAlpha = Math.min(1, this.brainFadeAlpha + delta * 1.5);
      this.brainGroup.visible = true;
    } else {
      this.brainFadeAlpha = Math.max(0, this.brainFadeAlpha - delta * 2.0);
      if (this.brainFadeAlpha <= 0) {
        this.brainGroup.visible = false;
        return;
      }
    }

    // Rotate slowly
    this.brainGroup.rotation.y = elapsed * 0.3;

    // Gentle float
    if (this.deskPosition) {
      this.brainGroup.position.y = this.deskPosition.y + 1.2 + Math.sin(elapsed * 0.8) * 0.1;
    }

    // Pulse emissive
    const pulse = 0.4 + Math.sin(elapsed * 2.0) * 0.2;
    this.brainMaterials.forEach(mat => {
      mat.emissiveIntensity = pulse;
      mat.opacity = 0.75 * this.brainFadeAlpha;
    });
  }


  // ── Animation ───────────────────────────────────────────────────────

  _animate() {
    if (this.disposed) return;
    requestAnimationFrame(() => this._animate());

    // Frame rate limiter: target ~30fps for smoother feel and lower GPU load
    const now = performance.now();
    if (!this._lastFrameTime) this._lastFrameTime = 0;
    const frameDelta = now - this._lastFrameTime;
    if (frameDelta < 30) return; // ~33ms = ~30fps cap
    this._lastFrameTime = now;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this._updateCamera(delta, elapsed);
    this._updateFireflies(elapsed);
    this._updateDustParticles(delta);
    this._updateTreeSway(elapsed);
    this._updateLampFlicker(elapsed);
    this._updateBrain(elapsed, delta);
    this._updateTV(elapsed);
    this._updateShootingStars(delta, elapsed);

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _updateTV(elapsed) {
    // Flicker the TV light subtly
    if (this.tvLight) {
      this.tvLight.intensity = 0.4 + Math.sin(elapsed * 3.7) * 0.1 + Math.sin(elapsed * 7.3) * 0.05;
    }
    // Update video texture if it exists
    if (this.tvScreen && this.tvScreen.material.map && this.tvScreen.material.map.isVideoTexture) {
      this.tvScreen.material.map.needsUpdate = true;
    }
    // Subtle pendant light sway
    if (this.pendantLight) {
      this.pendantLight.intensity = 0.5 + Math.sin(elapsed * 1.2) * 0.05;
    }
  }

  _updateCamera(delta, elapsed) {
    const t = this.scrollPercent;
    const kf = this.cameraKeyframes;

    // Find the two keyframes we're between
    let k0 = kf[0];
    let k1 = kf[1];
    for (let i = 0; i < kf.length - 1; i++) {
      if (t >= kf[i].t && t <= kf[i + 1].t) {
        k0 = kf[i];
        k1 = kf[i + 1];
        break;
      }
    }
    if (t >= kf[kf.length - 1].t) {
      k0 = kf[kf.length - 2];
      k1 = kf[kf.length - 1];
    }

    // Interpolate within segment
    const segLen = k1.t - k0.t;
    const localT = segLen > 0 ? THREE.MathUtils.clamp((t - k0.t) / segLen, 0, 1) : 0;

    // Smooth step for nicer easing
    const st = localT * localT * (3 - 2 * localT);

    const targetPos = new THREE.Vector3().lerpVectors(k0.pos, k1.pos, st);
    const targetLook = new THREE.Vector3().lerpVectors(k0.look, k1.look, st);

    // Mouse parallax — reduce when zoomed into laptop
    const parallaxScale = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;
    this.cameraTargetOffset.x = this.mouse.x * 0.5 * parallaxScale;
    this.cameraTargetOffset.y = this.mouse.y * 0.25 * parallaxScale;

    this.cameraCurrentOffset.x += (this.cameraTargetOffset.x - this.cameraCurrentOffset.x) * 2.0 * delta;
    this.cameraCurrentOffset.y += (this.cameraTargetOffset.y - this.cameraCurrentOffset.y) * 2.0 * delta;

    // Gentle idle sway — also reduce when zoomed in
    const swayX = Math.sin(elapsed * 0.25) * 0.06 * parallaxScale;
    const swayY = Math.cos(elapsed * 0.18) * 0.03 * parallaxScale;

    // Smooth camera movement
    const lerpSpeed = 3.0 * delta;
    this.cameraCurrentPos.lerp(targetPos, Math.min(lerpSpeed, 1));
    this.cameraCurrentLookAt.lerp(targetLook, Math.min(lerpSpeed, 1));

    const finalY = Math.max(1.15, this.cameraCurrentPos.y + this.cameraCurrentOffset.y + swayY);
    this.camera.position.set(
      this.cameraCurrentPos.x + this.cameraCurrentOffset.x + swayX,
      finalY,
      this.cameraCurrentPos.z
    );

    this.camera.lookAt(
      this.cameraCurrentLookAt.x + this.cameraCurrentOffset.x * 0.3,
      this.cameraCurrentLookAt.y + this.cameraCurrentOffset.y * 0.2,
      this.cameraCurrentLookAt.z
    );

    // Adjust fog based on indoor/outdoor
    if (this.scene.fog) {
      const indoorFactor = THREE.MathUtils.smoothstep(t, 0.3, 0.5);
      this.scene.fog.density = 0.016 - indoorFactor * 0.006;
    }

    // Slide cabin door open as approaching
    if (this.cabinDoor) {
      const doorProgress = THREE.MathUtils.smoothstep(t, 0.15, 0.35);
      const doorX = THREE.MathUtils.lerp(this._doorClosedX, this._doorOpenX, doorProgress);
      this.cabinDoor.position.x = doorX;
      if (this.doorHandle) this.doorHandle.position.x = doorX + 0.55;
    }
  }

  _updateFireflies(elapsed) {
    if (!this.fireflyParticles) return;
    const positions = this.fireflyParticles.geometry.attributes.position.array;

    for (let i = 0; i < this.fireflies.length; i++) {
      const ff = this.fireflies[i];

      positions[i * 3] = ff.baseX + Math.sin(elapsed * ff.speedX + ff.phaseX) * ff.driftX;
      positions[i * 3 + 1] = ff.baseY + Math.sin(elapsed * ff.speedY + ff.phaseY) * ff.driftY;
      positions[i * 3 + 2] = ff.baseZ + Math.sin(elapsed * ff.speedZ + ff.phaseZ) * ff.driftZ;
    }

    this.fireflyParticles.geometry.attributes.position.needsUpdate = true;

    // Blink effect via opacity
    const avgBlink = Math.sin(elapsed * 0.7) * 0.3 + 0.6;
    this.fireflyParticles.material.opacity = THREE.MathUtils.clamp(avgBlink, 0.2, 0.9);
  }

  _updateDustParticles(delta) {
    if (!this.dustParticles || !this.dustVelocities) return;
    // Hide dust particles when camera is inside the cabin
    if (this.scrollPercent > 0.35) {
      this.dustParticles.visible = false;
      return;
    }
    this.dustParticles.visible = true;
    const positions = this.dustParticles.geometry.attributes.position.array;
    const vel = this.dustVelocities;
    const count = positions.length / 3;
    const b = this.dustBounds;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += vel[i * 3];
      positions[i * 3 + 1] += vel[i * 3 + 1];
      positions[i * 3 + 2] += vel[i * 3 + 2];

      // Wrap
      if (positions[i * 3 + 1] > b.maxY) positions[i * 3 + 1] = 0.3;
      if (positions[i * 3] < b.minX) positions[i * 3] = b.maxX;
      if (positions[i * 3] > b.maxX) positions[i * 3] = b.minX;
      if (positions[i * 3 + 2] < b.minZ) positions[i * 3 + 2] = b.maxZ;
      if (positions[i * 3 + 2] > b.maxZ) positions[i * 3 + 2] = b.minZ;
    }

    this.dustParticles.geometry.attributes.position.needsUpdate = true;
  }

  _updateTreeSway(elapsed) {
    this.trees.forEach(tree => {
      const pos = tree.geometry.attributes.position;
      const orig = tree.originalPositions;
      const count = pos.count;

      for (let i = 0; i < count; i++) {
        const oy = orig[i * 3 + 1];
        // More sway at the top of the cone (higher y)
        const heightFactor = Math.max(0, (oy + 2) / 6); // normalized 0-1ish

        const wave = Math.sin(elapsed * tree.speed + tree.phase + i * 0.1) * 0.08 * heightFactor;
        const wave2 = Math.cos(elapsed * tree.speed * 0.7 + tree.phase * 1.3) * 0.04 * heightFactor;

        pos.array[i * 3] = orig[i * 3] + wave;
        pos.array[i * 3 + 2] = orig[i * 3 + 2] + wave2;
      }

      pos.needsUpdate = true;
    });
  }

  _updateLampFlicker(elapsed) {
    if (!this.lampLight) return;

    const flicker =
      Math.sin(elapsed * 8) * 0.03 +
      Math.sin(elapsed * 13.7) * 0.02 +
      Math.sin(elapsed * 23.1) * 0.01;

    this.lampLight.intensity = this.lampFlickerBase + flicker;

    // Candle flicker — more organic
    if (this._candleLight) {
      const cFlicker =
        Math.sin(elapsed * 11) * 0.12 +
        Math.sin(elapsed * 19.3) * 0.08 +
        Math.sin(elapsed * 31.7) * 0.05;
      this._candleLight.intensity = 0.4 + cFlicker;
    }
    if (this._candleFlame) {
      const sway = Math.sin(elapsed * 7.5) * 0.003;
      this._candleFlame.position.x = this._candleFlame.position.x + sway * 0.1;
      this._candleFlame.scale.y = 1.6 + Math.sin(elapsed * 14) * 0.3;
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  onScroll(scrollPercent) {
    this.scrollPercent = THREE.MathUtils.clamp(scrollPercent, 0, 1);
  }

  onMouseMove(normalizedX, normalizedY) {
    this.mouse.x = THREE.MathUtils.clamp(normalizedX, -1, 1);
    this.mouse.y = THREE.MathUtils.clamp(normalizedY, -1, 1);
  }

  /**
   * Raycast from screen coordinates to find interactive objects.
   * Returns the userData.interactive string ('tv', 'laptop') or null.
   */
  getInteractiveAt(clientX, clientY) {
    if (!this.camera || !this.renderer) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactiveObjects, false);
    if (hits.length > 0 && hits[0].object.userData.interactive) {
      return hits[0].object.userData.interactive;
    }
    return null;
  }

  // Get laptop screen rectangle in screen pixels (for HTML overlay positioning)
  getLaptopScreenRect() {
    if (!this.laptopScreenMesh || !this.camera) return null;
    const mesh = this.laptopScreenMesh;
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;

    // Get the 4 corners of the front face in local space
    const corners = [
      new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z),
      new THREE.Vector3(bb.max.x, bb.min.y, bb.max.z),
      new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z),
      new THREE.Vector3(bb.min.x, bb.max.y, bb.max.z),
    ];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const c of corners) {
      const world = c.clone().applyMatrix4(mesh.matrixWorld);
      const ndc = world.project(this.camera);
      const sx = (ndc.x * 0.5 + 0.5) * w;
      const sy = (-ndc.y * 0.5 + 0.5) * h;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }

    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  // Export scene JSON for Three.js Editor (https://threejs.org/editor/)
  // Call from console: cabinScene.exportScene()
  exportScene() {
    const json = this.scene.toJSON();
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cabin-scene.json';
    a.click();
    URL.revokeObjectURL(url);
    console.log('Scene exported! Load it in https://threejs.org/editor/ via File > Import');
  }

  dispose() {
    this.disposed = true;

    // Stop TV video
    if (this.tvVideo) {
      this.tvVideo.pause();
      this.tvVideo.src = '';
      this.tvVideo = null;
    }

    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
    }

    // Dispose brain
    if (this.brainGroup) {
      this.brainGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
      });
      this.brainMaterials.forEach(m => m.dispose());
      this.scene.remove(this.brainGroup);
      this.brainGroup = null;
      this.brainMaterials = [];
    }

    // Dispose fireflies
    if (this.fireflyParticles) {
      this.fireflyParticles.geometry.dispose();
      this.fireflyParticles.material.dispose();
      if (this.fireflyParticles.material.map) this.fireflyParticles.material.map.dispose();
      this.scene.remove(this.fireflyParticles);
      this.fireflyParticles = null;
    }

    // Dispose dust
    if (this.dustParticles) {
      this.dustParticles.geometry.dispose();
      this.dustParticles.material.dispose();
      if (this.dustParticles.material.map) this.dustParticles.material.map.dispose();
      this.scene.remove(this.dustParticles);
      this.dustParticles = null;
    }

    // Traverse and dispose all remaining
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });

    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  // ── Event Bindings ──────────────────────────────────────────────────

  _bindEvents() {
    this._onResize = () => {
      if (!this.camera || !this.renderer) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize, { passive: true });
  }
}

// ── Global Export ──────────────────────────────────────────────────────

window.CabinScene = CabinScene;
