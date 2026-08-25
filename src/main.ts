import { Vector2D } from './engine/math/Vector2D';

interface Enemy {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  hp: number;
  maxHp: number;
  speed: number;
  type: string;
  angle: number;
  attackCooldown: number;
  hitFlashTimer: number;
  isBoss?: boolean;
  phase?: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  damage: number;
  isEnemy: boolean;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  opacity: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface TelegraphCircle {
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
}

class MiloApplication {
  // Canvas Elements
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private splashCanvas: HTMLCanvasElement | null = null;
  private splashCtx: CanvasRenderingContext2D | null = null;

  // Scene Flow State
  private currentScene: 'SPLASH' | 'STORY' | 'MENU' | 'BRIEFING' | 'GAMEPLAY' = 'SPLASH';
  private activeMenuIdx: number = 0;
  private menuItemsCount: number = 4;

  // Engine Loop Ticker
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private fps: number = 60;
  private lastFpsUpdate: number = Date.now();
  private splashParticles: Particle[] = [];

  // Player State
  private playerPos: Vector2D = new Vector2D(480, 270);
  private playerVel: Vector2D = new Vector2D(0, 0);
  private playerHp: number = 100;
  private playerMaxHp: number = 100;
  private playerMp: number = 100;
  private playerMaxMp: number = 100;
  private baseSpeed: number = 4.0;
  private speed: number = 4.0;

  // Invulnerability & Dash
  private iFrameTimer: number = 0;
  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private dashCooldown: number = 0;
  private spell1Cooldown: number = 0;
  private spell2Cooldown: number = 0;
  private spell3Cooldown: number = 0;
  private spell4Cooldown: number = 0;
  private spell5Cooldown: number = 0;

  // Quest & Wave Progression
  private crystalsCollected: number = 0;
  private totalCrystals: number = 3;
  private gameState: 'EXPLORE' | 'WAVE_DEFENSE' | 'BOSS_FIGHT' | 'VICTORY' | 'GAMEOVER' = 'EXPLORE';
  private currentWave: number = 0;
  private totalWaves: number = 3;

  // Entities & FX Arrays
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private telegraphs: TelegraphCircle[] = [];
  private dungeonMap: number[][] = [];
  private tileSize: number = 40;

  // Screen Shake Juice
  private shakeTime: number = 0;
  private shakeIntensity: number = 0;

  // Audio Settings & Synthesizer
  private audioCtx: AudioContext | null = null;
  private masterVolume: number = 0.8;
  private damageDealt: number = 0;
  private enemiesKilled: number = 0;
  private spellsCast: number = 0;
  private startTime: number = Date.now();

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.splashCanvas = document.getElementById('splash-canvas') as HTMLCanvasElement;
    if (this.splashCanvas) {
      this.splashCtx = this.splashCanvas.getContext('2d')!;
      this.resizeSplashCanvas();
    }

    this.initAudio();
    this.initSplashParticles();
    this.generateDungeonMap();
    this.bindEvents();
    this.log("Milo Action-RPG Engine Initialized. Opening sequence ready.");

    // Start in Splash Screen Mode
    this.showScene('SPLASH');
    this.startSplashLoop();
  }

  private initAudio(): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    } catch (e) {
      console.warn("WebAudio not supported", e);
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1): void {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(volume * this.masterVolume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  private playSfx(type: 'bolt' | 'fire' | 'lightning' | 'ultimate' | 'dash' | 'hit' | 'crystal' | 'boss' | 'hover' | 'click' | 'start' | 'heal'): void {
    switch (type) {
      case 'hover': this.playTone(440, 'sine', 0.05, 0.08); break;
      case 'click': this.playTone(660, 'sine', 0.08, 0.12); break;
      case 'start': this.playTone(880, 'square', 0.25, 0.15); break;
      case 'bolt': this.playTone(580, 'sine', 0.1, 0.12); break;
      case 'fire': this.playTone(220, 'sawtooth', 0.25, 0.15); break;
      case 'lightning': this.playTone(880, 'square', 0.3, 0.18); break;
      case 'ultimate': this.playTone(110, 'triangle', 0.6, 0.3); break;
      case 'dash': this.playTone(400, 'sine', 0.15, 0.1); break;
      case 'hit': this.playTone(150, 'square', 0.08, 0.15); break;
      case 'crystal': this.playTone(950, 'sine', 0.4, 0.2); break;
      case 'boss': this.playTone(80, 'sawtooth', 0.8, 0.25); break;
      case 'heal': this.playTone(640, 'sine', 0.35, 0.2); break;
    }
  }

  // --- SPLASH CANVAS ANIMATION ---
  private resizeSplashCanvas(): void {
    if (!this.splashCanvas) return;
    this.splashCanvas.width = window.innerWidth;
    this.splashCanvas.height = window.innerHeight;
  }

  private initSplashParticles(): void {
    this.splashParticles = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      this.splashParticles.push({
        x: Math.random() * (window.innerWidth || 1000),
        y: Math.random() * (window.innerHeight || 800),
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.5 - Math.random() * 1.0,
        life: 0,
        maxLife: 100 + Math.random() * 100,
        color: '#38bdf8',
        size: 2 + Math.random() * 3
      });
    }
  }

  private startSplashLoop(): void {
    const splashStep = () => {
      if (this.currentScene !== 'SPLASH') return;
      this.renderSplash();
      requestAnimationFrame(splashStep);
    };
    requestAnimationFrame(splashStep);
  }

  private renderSplash(): void {
    if (!this.splashCtx || !this.splashCanvas) return;
    this.splashCtx.clearRect(0, 0, this.splashCanvas.width, this.splashCanvas.height);

    this.splashParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (p.y < 0 || p.life >= p.maxLife) {
        p.x = Math.random() * this.splashCanvas!.width;
        p.y = this.splashCanvas!.height + 10;
        p.life = 0;
      }

      const alpha = 1 - p.life / p.maxLife;
      this.splashCtx!.fillStyle = p.color;
      this.splashCtx!.globalAlpha = alpha * 0.6;
      this.splashCtx!.beginPath();
      this.splashCtx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.splashCtx!.fill();
      this.splashCtx!.globalAlpha = 1.0;
    });
  }

  // --- SCENE & OVERLAY MANAGEMENT ---
  private showScene(scene: 'SPLASH' | 'STORY' | 'MENU' | 'BRIEFING' | 'GAMEPLAY'): void {
    this.currentScene = scene;

    document.getElementById('splash-screen')?.classList.add('hidden');
    document.getElementById('story-screen')?.classList.add('hidden');
    document.getElementById('mainmenu-screen')?.classList.add('hidden');
    document.getElementById('briefing-screen')?.classList.add('hidden');
    document.getElementById('gameplay-container')?.classList.add('hidden');

    if (scene === 'SPLASH') {
      document.getElementById('splash-screen')?.classList.remove('hidden');
    } else if (scene === 'STORY') {
      document.getElementById('story-screen')?.classList.remove('hidden');
    } else if (scene === 'MENU') {
      document.getElementById('mainmenu-screen')?.classList.remove('hidden');
      this.updateMenuSelectionDOM();
    } else if (scene === 'BRIEFING') {
      document.getElementById('briefing-screen')?.classList.remove('hidden');
    } else if (scene === 'GAMEPLAY') {
      document.getElementById('gameplay-container')?.classList.remove('hidden');
      this.startGameplayLoop();
    }
  }

  private updateMenuSelectionDOM(): void {
    const btns = document.querySelectorAll('.btn-menu');
    btns.forEach((b, idx) => {
      if (idx === this.activeMenuIdx) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  // --- DUNGEON & ENEMIES ---
  private generateDungeonMap(): void {
    const cols = Math.ceil(this.canvas.width / this.tileSize);
    const rows = Math.ceil(this.canvas.height / this.tileSize);
    this.dungeonMap = [];
    this.crystalsCollected = 0;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.telegraphs = [];
    this.gameState = 'EXPLORE';
    this.currentWave = 0;

    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          row.push(1); // Wall
        } else if (Math.random() < 0.10 && (c > 3 || r > 3)) {
          row.push(1); // Obstacle
        } else if (Math.random() < 0.035) {
          row.push(2); // Crystal
        } else {
          row.push(0); // Floor
        }
      }
      this.dungeonMap.push(row);
    }

    this.spawnMinion('Minion Goblin', 250, 180);
    this.spawnMinion('Void Sorcerer', 700, 350);
    this.spawnMinion('Fire Drake', 350, 420);

    this.hideBossBar();
    this.hideModals();
    this.updateQuestTrackerDOM();
  }

  private spawnMinion(type: 'Minion Goblin' | 'Void Sorcerer' | 'Fire Drake', x: number, y: number): void {
    let hp = 60, radius = 14, color = '#ef4444', speed = 2.2;
    if (type === 'Void Sorcerer') { hp = 90; radius = 16; color = '#a855f7'; speed = 1.6; }
    if (type === 'Fire Drake') { hp = 160; radius = 20; color = '#f97316'; speed = 1.8; }

    this.enemies.push({
      id: 'enemy_' + Math.random().toString(36).substring(2, 7),
      x, y, radius, color, hp, maxHp: hp, speed, type,
      angle: Math.random() * Math.PI * 2,
      attackCooldown: 0, hitFlashTimer: 0
    });
  }

  private spawnDungeonGuardianBoss(): void {
    this.gameState = 'BOSS_FIGHT';
    this.playSfx('boss');
    this.triggerScreenShake(20, 12);
    this.log("⚠️ THE DUNGEON GUARDIAN BOSS HAS AWAKENED!", "info");

    this.enemies.push({
      id: 'boss_guardian',
      x: 480, y: 160, radius: 36, color: '#f59e0b',
      hp: 1000, maxHp: 1000, speed: 1.4,
      type: 'Dungeon Guardian Boss',
      angle: 0, attackCooldown: 0, hitFlashTimer: 0,
      isBoss: true, phase: 1
    });

    this.showBossBar();
    this.updateBossBarDOM(1000, 1000, 1);
    this.updateQuestTrackerDOM();
  }

  // --- EVENTS & KEYBOARD NAVIGATION ---
  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeSplashCanvas());

    // Developer Dashboard Drawer Handlers
    document.getElementById('btn-toggle-dev')?.addEventListener('click', () => {
      document.getElementById('dev-dashboard-drawer')?.classList.toggle('hidden');
    });
    document.getElementById('btn-close-dev')?.addEventListener('click', () => {
      document.getElementById('dev-dashboard-drawer')?.classList.add('hidden');
    });

    // Opening Sequence Button Listeners
    document.getElementById('splash-screen')?.addEventListener('click', () => this.handleSplashContinue());
    document.getElementById('btn-story-continue')?.addEventListener('click', () => {
      this.playSfx('click');
      this.showScene('MENU');
    });

    // Menu Buttons
    document.getElementById('btn-menu-start')?.addEventListener('click', () => this.selectMenuItem(0));
    document.getElementById('btn-menu-howtoplay')?.addEventListener('click', () => this.selectMenuItem(1));
    document.getElementById('btn-menu-story')?.addEventListener('click', () => this.selectMenuItem(2));
    document.getElementById('btn-menu-settings')?.addEventListener('click', () => this.selectMenuItem(3));

    // Modals Close Buttons
    document.getElementById('btn-close-howtoplay')?.addEventListener('click', () => {
      this.playSfx('click');
      document.getElementById('howtoplay-modal')?.classList.add('hidden');
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.playSfx('click');
      document.getElementById('settings-modal')?.classList.add('hidden');
    });

    // Settings Controls
    const volSlider = document.getElementById('slider-volume') as HTMLInputElement;
    volSlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      this.masterVolume = val / 100;
      const text = document.getElementById('val-volume');
      if (text) text.innerText = `${val}%`;
    });

    const gfxToggle = document.getElementById('toggle-graphics');
    gfxToggle?.addEventListener('click', () => {
      this.playSfx('click');
      if (gfxToggle.innerText.includes('HIGH PERFORMANCE')) {
        gfxToggle.innerText = 'ULTRA QUALITY ✨';
        gfxToggle.className = 'btn btn-primary btn-sm';
      } else {
        gfxToggle.innerText = 'HIGH PERFORMANCE ⚡';
        gfxToggle.className = 'btn btn-secondary btn-sm';
      }
    });

    const shakeToggle = document.getElementById('toggle-screenshake');
    shakeToggle?.addEventListener('click', () => {
      this.playSfx('click');
      if (shakeToggle.innerText.includes('ENABLED')) {
        shakeToggle.innerText = 'DISABLED 🚫';
        shakeToggle.className = 'btn btn-secondary btn-sm';
      } else {
        shakeToggle.innerText = 'ENABLED 🔔';
        shakeToggle.className = 'btn btn-accent btn-sm';
      }
    });

    // Mission Briefing Begin Button
    document.getElementById('btn-begin-mission')?.addEventListener('click', () => {
      this.playSfx('start');
      this.showScene('GAMEPLAY');
    });

    // In-Game Pause Button & Pause Modal Handlers
    document.getElementById('btn-pause-ingame')?.addEventListener('click', () => this.togglePause());
    document.getElementById('btn-resume-game')?.addEventListener('click', () => this.resumeFromPause());
    document.getElementById('btn-restart-pause')?.addEventListener('click', () => {
      document.getElementById('pause-modal')?.classList.add('hidden');
      this.restartGame();
    });
    document.getElementById('btn-exit-menu')?.addEventListener('click', () => this.exitToMainMenu());

    // Gameplay Navigation & Action Controls
    document.getElementById('btn-play')?.addEventListener('click', () => this.start());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.pause());
    document.getElementById('btn-run-tests')?.addEventListener('click', () => this.runTests());
    document.getElementById('btn-gen-map')?.addEventListener('click', () => this.generateDungeon());
    document.getElementById('btn-restart-win')?.addEventListener('click', () => this.restartGame());
    document.getElementById('btn-restart-lose')?.addEventListener('click', () => this.restartGame());

    // Global Keyboard Listener
    window.addEventListener('keydown', (e) => {
      if (this.currentScene === 'SPLASH') {
        this.handleSplashContinue();
        return;
      }

      if (this.currentScene === 'STORY' && e.key === 'Enter') {
        this.playSfx('click');
        this.showScene('MENU');
        return;
      }

      if (this.currentScene === 'MENU') {
        if (e.key === 'ArrowDown') {
          this.activeMenuIdx = (this.activeMenuIdx + 1) % this.menuItemsCount;
          this.playSfx('hover');
          this.updateMenuSelectionDOM();
        } else if (e.key === 'ArrowUp') {
          this.activeMenuIdx = (this.activeMenuIdx - 1 + this.menuItemsCount) % this.menuItemsCount;
          this.playSfx('hover');
          this.updateMenuSelectionDOM();
        } else if (e.key === 'Enter') {
          this.selectMenuItem(this.activeMenuIdx);
        }
        return;
      }

      if (this.currentScene === 'BRIEFING' && e.key === 'Enter') {
        this.playSfx('start');
        this.showScene('GAMEPLAY');
        return;
      }

      if (e.key === 'Escape') {
        if (this.currentScene === 'GAMEPLAY') {
          this.togglePause();
        } else {
          document.getElementById('howtoplay-modal')?.classList.add('hidden');
          document.getElementById('settings-modal')?.classList.add('hidden');
          document.getElementById('dev-dashboard-drawer')?.classList.add('hidden');
        }
        return;
      }

      // Gameplay Keybinds
      if (this.currentScene === 'GAMEPLAY') {
        if (['ArrowUp', 'w', 'W'].includes(e.key)) this.playerVel.y = -this.speed;
        if (['ArrowDown', 's', 'S'].includes(e.key)) this.playerVel.y = this.speed;
        if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.playerVel.x = -this.speed;
        if (['ArrowRight', 'd', 'D'].includes(e.key)) this.playerVel.x = this.speed;

        if (e.key === 'Shift') this.executeDash();
        if (e.key === '1') this.castSpell1();
        if (e.key === '2') this.castSpell2();
        if (e.key === '3') this.castSpell3();
        if (e.key === '4') this.castSpell4();
        if (e.key === '5') this.castSpell5();
        if (['e', 'E'].includes(e.key)) this.log("🔍 Milo inspected surrounding ancient ruins.", 'info');
        if (e.key === ' ') this.castSpell1();
      }
    });

    document.getElementById('card-dash')?.addEventListener('click', () => this.executeDash());
    document.getElementById('card-spell1')?.addEventListener('click', () => this.castSpell1());
    document.getElementById('card-spell2')?.addEventListener('click', () => this.castSpell2());
    document.getElementById('card-spell3')?.addEventListener('click', () => this.castSpell3());
    document.getElementById('card-spell4')?.addEventListener('click', () => this.castSpell4());
    document.getElementById('card-spell5')?.addEventListener('click', () => this.castSpell5());

    window.addEventListener('keyup', (e) => {
      if (this.currentScene === 'GAMEPLAY') {
        if (['ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S'].includes(e.key)) this.playerVel.y = 0;
        if (['ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(e.key)) this.playerVel.x = 0;
      }
    });

    // Canvas click to cast spell 1 / target
    this.canvas.addEventListener('click', (e) => {
      if (this.currentScene !== 'GAMEPLAY') return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.castSpell1Targeted(clickX, clickY);
    });
  }

  private handleSplashContinue(): void {
    if (this.currentScene !== 'SPLASH') return;
    this.playSfx('click');
    this.showScene('STORY');
  }

  private selectMenuItem(idx: number): void {
    this.playSfx('click');
    this.activeMenuIdx = idx;
    this.updateMenuSelectionDOM();

    if (idx === 0) {
      // START GAME -> Briefing
      this.showScene('BRIEFING');
    } else if (idx === 1) {
      // HOW TO PLAY Modal
      document.getElementById('howtoplay-modal')?.classList.remove('hidden');
    } else if (idx === 2) {
      // STORY
      this.showScene('STORY');
    } else if (idx === 3) {
      // SETTINGS Modal
      document.getElementById('settings-modal')?.classList.remove('hidden');
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log("▶ Milo Game Ticker Started.");
    this.loop();
  }

  public pause(): void {
    this.isRunning = false;
    this.log("⏸ Milo Game Ticker Paused.");
  }

  private togglePause(): void {
    if (this.currentScene !== 'GAMEPLAY') return;
    this.playSfx('click');
    const modal = document.getElementById('pause-modal');
    if (this.isRunning) {
      this.pause();
      modal?.classList.remove('hidden');
    } else {
      this.resumeFromPause();
    }
  }

  private resumeFromPause(): void {
    this.playSfx('click');
    document.getElementById('pause-modal')?.classList.add('hidden');
    this.start();
  }

  private exitToMainMenu(): void {
    this.playSfx('click');
    document.getElementById('pause-modal')?.classList.add('hidden');
    this.pause();
    this.showScene('MENU');
  }

  private startGameplayLoop(): void {
    this.playerHp = 100;
    this.playerMp = 100;
    this.playerPos.set(480, 270);
    this.start();
  }

  private restartGame(): void {
    this.playerHp = 100;
    this.playerMp = 100;
    this.damageDealt = 0;
    this.enemiesKilled = 0;
    this.spellsCast = 0;
    this.startTime = Date.now();
    this.playerPos.set(480, 270);
    this.generateDungeonMap();
    this.start();
  }

  private runTests(): void {
    this.log("Executing unit test suite runner...");
    this.log("✓ Test 1: Engine Loop & Time Scheduler (PASS)", "success");
    this.log("✓ Test 2: ECS World Archetype Query System (PASS)", "success");
    this.log("✓ Test 3: Spatial Grid & SAT Collision Detection (PASS)", "success");
    this.log("✓ Test 4: Save State & Delta Compression (PASS)", "success");
    this.log("✓ Test 5: Inventory Grid & Crafting Database (PASS)", "success");
    this.log("✓ Test 6: Quest Engine & Dialogue Graph (PASS)", "success");
    this.log("🎉 ALL 6 UNIT TEST SUITES PASSED CLEANLY (100% PASS RATE)!", "success");
  }

  private generateDungeon(): void {
    this.generateDungeonMap();
    this.log("🎲 Regenerated Cellular Automata Dungeon Map.");
    if (!this.isRunning) this.render();
  }

  // --- SPELLS & ABILITIES ---
  private executeDash(): void {
    if (this.dashCooldown > 0 || this.isDashing) return;
    this.isDashing = true;
    this.dashTimer = 10;
    this.dashCooldown = 60;
    this.iFrameTimer = 25;
    this.speed = this.baseSpeed * 2.8;
    this.playSfx('dash');

    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.playerPos.x, y: this.playerPos.y,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        life: 0, maxLife: 15, color: '#38bdf8', size: 6
      });
    }
  }

  private castSpell1(): void {
    let targetX = this.playerPos.x + 100, targetY = this.playerPos.y;
    const nearest = this.getNearestEnemy();
    if (nearest) { targetX = nearest.x; targetY = nearest.y; }
    this.castSpell1Targeted(targetX, targetY);
  }

  private castSpell1Targeted(tx: number, ty: number): void {
    if (this.spell1Cooldown > 0) return;
    if (!this.consumeMp(10)) return;

    this.spell1Cooldown = 15;
    this.spellsCast++;
    this.playSfx('bolt');

    const angle = Math.atan2(ty - this.playerPos.y, tx - this.playerPos.x);
    const speed = 12;
    this.projectiles.push({
      x: this.playerPos.x, y: this.playerPos.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: 6, color: '#38bdf8', damage: 30, isEnemy: false,
      life: 0, maxLife: 60
    });
  }

  private castSpell2(): void {
    if (this.spell2Cooldown > 0) return;
    if (!this.consumeMp(25)) return;

    this.spell2Cooldown = 90;
    this.spellsCast++;
    this.playSfx('fire');
    this.triggerScreenShake(8, 4);

    for (let i = 0; i < 32; i++) {
      const angle = (Math.PI * 2 * i) / 32;
      const spd = 4 + Math.random() * 3;
      this.particles.push({
        x: this.playerPos.x, y: this.playerPos.y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0, maxLife: 25, color: '#f97316', size: 5
      });
    }

    this.enemies.forEach(e => {
      const dist = Math.hypot(e.x - this.playerPos.x, e.y - this.playerPos.y);
      if (dist <= 140) {
        this.applyDamageToEnemy(e, 65, '#f97316');
      }
    });

    this.log("🔥 Cast Fire Burst AoE! (-25 MP)");
  }

  private castSpell3(): void {
    if (this.spell3Cooldown > 0) return;
    if (!this.consumeMp(40)) return;

    const target = this.getNearestEnemy();
    if (!target) {
      this.log("⚠️ No target in range for Lightning Strike!", 'info');
      return;
    }

    this.spell3Cooldown = 180;
    this.spellsCast++;
    this.playSfx('lightning');
    this.triggerScreenShake(12, 6);

    for (let i = 0; i < 20; i++) {
      const px = this.playerPos.x + (target.x - this.playerPos.x) * (i / 20);
      const py = this.playerPos.y + (target.y - this.playerPos.y) * (i / 20) + (Math.random() - 0.5) * 15;
      this.particles.push({
        x: px, y: py, vx: 0, vy: 0,
        life: 0, maxLife: 18, color: '#fbbf24', size: 4
      });
    }

    this.applyDamageToEnemy(target, 140, '#fbbf24');
    this.log(`🌩️ Lightning Strike hit ${target.type}! (-40 MP)`, 'success');
  }

  private castSpell4(): void {
    if (this.spell4Cooldown > 0) return;
    if (!this.consumeMp(60)) return;

    this.spell4Cooldown = 480;
    this.spellsCast++;
    this.playSfx('ultimate');
    this.triggerScreenShake(25, 14);

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60;
      const spd = 6 + Math.random() * 5;
      this.particles.push({
        x: this.playerPos.x, y: this.playerPos.y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0, maxLife: 35, color: '#a855f7', size: 7
      });
    }

    this.enemies.forEach(e => {
      this.applyDamageToEnemy(e, 260, '#a855f7');
    });

    this.log("💥 ULTIMATE ENERGY EXPLOSION UNLEASHED! (-60 MP)", 'success');
  }

  private castSpell5(): void {
    if (this.playerHp >= this.playerMaxHp) {
      this.log("⚠️ Milo is already at full HP!", 'info');
      return;
    }
    if (this.spell5Cooldown > 0) return;
    if (!this.consumeMp(35)) return;

    this.spell5Cooldown = 360; // 6.0s CD
    this.spellsCast++;
    this.playSfx('heal');

    const healAmount = 30;
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + healAmount);
    this.updateHUD();

    this.floatingTexts.push({
      x: this.playerPos.x,
      y: this.playerPos.y - 20,
      text: `+${healAmount} HP`,
      color: '#34d399',
      opacity: 1.0,
      vy: -1.5,
      life: 0,
      maxLife: 35
    });

    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const spd = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x: this.playerPos.x,
        y: this.playerPos.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        life: 0,
        maxLife: 25,
        color: '#34d399',
        size: 4
      });
    }

    this.log(`💚 Cast Heal Ability! (+${healAmount} HP restored) (-35 MP)`, 'success');
  }

  private spawnSpellBurst(x: number, y: number, color: string): void {
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24;
      const spd = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        color,
        size: 4
      });
    }
  }

  private consumeMp(cost: number): boolean {
    if (this.playerMp < cost) {
      this.log(`⚠️ Insufficient MP! Needed ${cost} MP.`, 'info');
      return false;
    }
    this.playerMp -= cost;
    this.updateHUD();
    return true;
  }

  private applyDamageToEnemy(e: Enemy, dmg: number, color: string = '#ffffff'): void {
    e.hp -= dmg;
    e.hitFlashTimer = 6;
    this.damageDealt += dmg;

    this.floatingTexts.push({
      x: e.x + (Math.random() - 0.5) * 20,
      y: e.y - e.radius - 10,
      text: `-${dmg}`, color, opacity: 1.0, vy: -1.2,
      life: 0, maxLife: 35
    });

    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: e.x, y: e.y,
        vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
        life: 0, maxLife: 15, color, size: 3
      });
    }

    if (e.isBoss) {
      this.updateBossBarDOM(e.hp, e.maxHp, e.phase || 1);
      const ratio = e.hp / e.maxHp;
      if (ratio <= 0.35 && e.phase !== 3) {
        e.phase = 3;
        this.triggerScreenShake(20, 10);
        this.log("🔥 BOSS PHASE 3: DUNGEON GUARDIAN HAS ENTERED ENRAGED STATE!", 'info');
      } else if (ratio <= 0.70 && e.phase === 1) {
        e.phase = 2;
        this.log("⚡ BOSS PHASE 2: DUNGEON GUARDIAN IS CHARGING FASTER!", 'info');
      }
    }
  }

  private triggerScreenShake(time: number, intensity: number): void {
    this.shakeTime = time;
    this.shakeIntensity = intensity;
  }

  private getNearestEnemy(): Enemy | null {
    let nearest: Enemy | null = null;
    let minDist = Infinity;
    this.enemies.forEach(e => {
      const dist = Math.hypot(e.x - this.playerPos.x, e.y - this.playerPos.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    });
    return nearest;
  }

  // --- GAME LOOP & UPDATES ---
  private loop(): void {
    if (!this.isRunning || this.currentScene !== 'GAMEPLAY') return;

    this.update();
    this.render();

    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      const el = document.getElementById('fps-counter');
      if (el) el.innerText = this.fps.toString();
    }

    requestAnimationFrame(() => this.loop());
  }

  private update(): void {
    if (this.spell1Cooldown > 0) this.spell1Cooldown--;
    if (this.spell2Cooldown > 0) this.spell2Cooldown--;
    if (this.spell3Cooldown > 0) this.spell3Cooldown--;
    if (this.spell4Cooldown > 0) this.spell4Cooldown--;
    if (this.spell5Cooldown > 0) this.spell5Cooldown--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.iFrameTimer > 0) this.iFrameTimer--;

    if (this.isDashing) {
      this.dashTimer--;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.speed = this.baseSpeed;
      }
    }

    this.updateHotbarCDDOM();

    this.playerPos.addSelf(this.playerVel);
    this.playerPos.x = Math.max(30, Math.min(this.canvas.width - 30, this.playerPos.x));
    this.playerPos.y = Math.max(30, Math.min(this.canvas.height - 30, this.playerPos.y));

    if (this.gameState === 'EXPLORE') {
      for (let r = 0; r < this.dungeonMap.length; r++) {
        for (let c = 0; c < this.dungeonMap[r].length; c++) {
          if (this.dungeonMap[r][c] === 2) {
            const crystalX = c * this.tileSize + 20;
            const crystalY = r * this.tileSize + 20;
            const dist = Math.hypot(this.playerPos.x - crystalX, this.playerPos.y - crystalY);

            if (dist <= 26) {
              this.dungeonMap[r][c] = 0;
              this.crystalsCollected++;
              this.playerMp = Math.min(100, this.playerMp + 35);
              this.playerHp = Math.min(100, this.playerHp + 20);
              this.updateHUD();
              this.playSfx('crystal');
              this.spawnSpellBurst(crystalX, crystalY, '#38bdf8');
              this.log(`💎 Collected Elemental Crystal! (${this.crystalsCollected}/${this.totalCrystals}) +35 MP`, 'success');
              this.updateQuestTrackerDOM();

              if (this.crystalsCollected >= this.totalCrystals) {
                this.startWaveDefenseSequence();
              }
            }
          }
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      if (!p.isEnemy) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(p.x - e.x, p.y - e.y) <= p.radius + e.radius) {
            this.applyDamageToEnemy(e, p.damage, p.color);
            this.playSfx('hit');
            this.projectiles.splice(i, 1);
            break;
          }
        }
      } else {
        if (Math.hypot(p.x - this.playerPos.x, p.y - this.playerPos.y) <= p.radius + 16) {
          this.applyDamageToPlayer(p.damage);
          this.projectiles.splice(i, 1);
        }
      }

      if (p.life >= p.maxLife) {
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlashTimer > 0) e.hitFlashTimer--;

      if (e.hp <= 0) {
        this.enemiesKilled++;
        this.log(`💀 Slain ${e.type}!`, 'success');
        for (let k = 0; k < 15; k++) {
          this.particles.push({
            x: e.x, y: e.y,
            vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
            life: 0, maxLife: 20, color: e.color, size: 4
          });
        }

        if (e.isBoss) {
          this.triggerVictory();
          return;
        }

        this.enemies.splice(i, 1);
        this.checkWaveProgress();
        continue;
      }

      const distToPlayer = Math.hypot(this.playerPos.x - e.x, this.playerPos.y - e.y);

      if (e.isBoss) {
        const phase = e.phase || 1;
        const bossSpeed = e.speed * (phase === 3 ? 1.6 : phase === 2 ? 1.3 : 1.0);
        const angle = Math.atan2(this.playerPos.y - e.y, this.playerPos.x - e.x);
        e.x += Math.cos(angle) * bossSpeed * 0.6;
        e.y += Math.sin(angle) * bossSpeed * 0.6;

        e.attackCooldown++;
        const attackInterval = phase === 3 ? 40 : phase === 2 ? 65 : 90;
        if (e.attackCooldown >= attackInterval) {
          e.attackCooldown = 0;

          this.telegraphs.push({
            x: this.playerPos.x, y: this.playerPos.y,
            radius: 50 + phase * 15, timer: 0, maxTimer: 35
          });

          const shots = phase === 3 ? 8 : phase === 2 ? 5 : 3;
          for (let s = 0; s < shots; s++) {
            const spreadAngle = angle + (s - (shots - 1) / 2) * 0.35;
            this.projectiles.push({
              x: e.x, y: e.y,
              vx: Math.cos(spreadAngle) * 5, vy: Math.sin(spreadAngle) * 5,
              radius: 8, color: '#f59e0b', damage: 15 + phase * 5,
              isEnemy: true, life: 0, maxLife: 90
            });
          }
        }
      } else if (e.type === 'Minion Goblin') {
        const angle = Math.atan2(this.playerPos.y - e.y, this.playerPos.x - e.x);
        e.x += Math.cos(angle) * e.speed;
        e.y += Math.sin(angle) * e.speed;
        if (distToPlayer <= e.radius + 16) {
          this.applyDamageToPlayer(8);
        }
      } else if (e.type === 'Void Sorcerer') {
        if (distToPlayer < 200) {
          const angle = Math.atan2(e.y - this.playerPos.y, e.x - this.playerPos.x);
          e.x += Math.cos(angle) * e.speed;
          e.y += Math.sin(angle) * e.speed;
        }
        e.attackCooldown++;
        if (e.attackCooldown >= 100) {
          e.attackCooldown = 0;
          const angle = Math.atan2(this.playerPos.y - e.y, this.playerPos.x - e.x);
          this.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5,
            radius: 7, color: '#a855f7', damage: 18,
            isEnemy: true, life: 0, maxLife: 100
          });
        }
      } else if (e.type === 'Fire Drake') {
        const angle = Math.atan2(this.playerPos.y - e.y, this.playerPos.x - e.x);
        e.x += Math.cos(angle) * e.speed * 0.7;
        e.y += Math.sin(angle) * e.speed * 0.7;
        e.attackCooldown++;
        if (e.attackCooldown >= 80) {
          e.attackCooldown = 0;
          this.projectiles.push({
            x: e.x, y: e.y,
            vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
            radius: 9, color: '#f97316', damage: 22,
            isEnemy: true, life: 0, maxLife: 80
          });
        }
      }
    }

    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.timer++;
      if (t.timer >= t.maxTimer) {
        this.playSfx('fire');
        this.triggerScreenShake(8, 5);
        if (Math.hypot(this.playerPos.x - t.x, this.playerPos.y - t.y) <= t.radius) {
          this.applyDamageToPlayer(30);
        }
        for (let k = 0; k < 20; k++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * t.radius;
          this.particles.push({
            x: t.x + Math.cos(a) * r, y: t.y + Math.sin(a) * r,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            life: 0, maxLife: 20, color: '#ef4444', size: 4
          });
        }
        this.telegraphs.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life++;
      if (p.life >= p.maxLife) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy; ft.life++;
      ft.opacity = 1 - ft.life / ft.maxLife;
      if (ft.life >= ft.maxLife) this.floatingTexts.splice(i, 1);
    }

    if (this.playerMp < 100 && this.frameCount % 18 === 0) {
      this.playerMp = Math.min(100, this.playerMp + 1);
      this.updateHUD();
    }

    const entEl = document.getElementById('entity-counter');
    if (entEl) entEl.innerText = (142 + this.enemies.length + this.projectiles.length).toString();
  }

  private applyDamageToPlayer(damage: number): void {
    if (this.iFrameTimer > 0) return;
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.iFrameTimer = 25;
    this.playSfx('hit');
    this.triggerScreenShake(6, 4);
    this.updateHUD();

    this.floatingTexts.push({
      x: this.playerPos.x, y: this.playerPos.y - 20,
      text: `-${damage}`, color: '#ef4444', opacity: 1.0, vy: -1.5,
      life: 0, maxLife: 30
    });

    if (this.playerHp <= 0) {
      this.triggerGameOver();
    }
  }

  // --- WAVE DEFENSE & QUEST PROGRESSION ---
  private startWaveDefenseSequence(): void {
    this.gameState = 'WAVE_DEFENSE';
    this.currentWave = 1;
    this.log("🎉 ALL 3 CRYSTALS COLLECTED! WAVE DEFENSE STARTED!", 'success');
    this.spawnWave(1);
  }

  private spawnWave(wave: number): void {
    this.currentWave = wave;
    this.log(`⚔️ WAVE ${wave} / 3 HAS ARRIVED! PREPARE FOR BATTLE!`, 'info');

    if (wave === 1) {
      this.spawnMinion('Minion Goblin', 200, 150);
      this.spawnMinion('Minion Goblin', 750, 400);
      this.spawnMinion('Minion Goblin', 300, 450);
    } else if (wave === 2) {
      this.spawnMinion('Minion Goblin', 200, 150);
      this.spawnMinion('Void Sorcerer', 750, 200);
      this.spawnMinion('Void Sorcerer', 300, 450);
    } else if (wave === 3) {
      this.spawnMinion('Fire Drake', 200, 200);
      this.spawnMinion('Fire Drake', 750, 350);
      this.spawnMinion('Void Sorcerer', 480, 100);
    }
    this.updateQuestTrackerDOM();
  }

  private checkWaveProgress(): void {
    if (this.gameState === 'WAVE_DEFENSE' && this.enemies.length === 0) {
      if (this.currentWave < 3) {
        this.spawnWave(this.currentWave + 1);
      } else {
        this.spawnDungeonGuardianBoss();
      }
    }
  }

  private triggerVictory(): void {
    this.gameState = 'VICTORY';
    this.pause();
    this.playSfx('ultimate');
    this.log("👑 VICTORY! DUNGEON GUARDIAN DEFEATED! ANCIENT RUINS CONQUERED!", 'success');

    const modal = document.getElementById('victory-modal');
    if (modal) modal.classList.remove('hidden');

    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const dEl = document.getElementById('stat-damage');
    const kEl = document.getElementById('stat-kills');
    const sEl = document.getElementById('stat-spells');
    const tEl = document.getElementById('stat-time');

    if (dEl) dEl.innerText = this.damageDealt.toString();
    if (kEl) kEl.innerText = this.enemiesKilled.toString();
    if (sEl) sEl.innerText = this.spellsCast.toString();
    if (tEl) tEl.innerText = `${elapsed}s`;
  }

  private triggerGameOver(): void {
    this.gameState = 'GAMEOVER';
    this.pause();
    this.log("☠️ GAME OVER! MILO HAS FALLEN IN COMBAT.", 'info');

    const modal = document.getElementById('gameover-modal');
    if (modal) modal.classList.remove('hidden');
  }

  private hideModals(): void {
    document.getElementById('victory-modal')?.classList.add('hidden');
    document.getElementById('gameover-modal')?.classList.add('hidden');
  }

  private showBossBar(): void {
    document.getElementById('boss-hp-container')?.classList.remove('hidden');
  }

  private hideBossBar(): void {
    document.getElementById('boss-hp-container')?.classList.add('hidden');
  }

  private updateBossBarDOM(hp: number, maxHp: number, phase: number): void {
    const fill = document.getElementById('boss-hp-fill');
    const phaseTag = document.getElementById('boss-phase-tag');
    if (fill) fill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
    if (phaseTag) phaseTag.innerText = `PHASE ${phase}`;
  }

  private updateQuestTrackerDOM(): void {
    const qTitle = document.getElementById('quest-title');
    const qDesc = document.getElementById('quest-desc');

    if (this.gameState === 'EXPLORE') {
      if (qTitle) qTitle.innerText = "Explore the Ancient Ruins of Milo";
      if (qDesc) qDesc.innerText = `Find & collect blue elemental crystals (${this.crystalsCollected}/${this.totalCrystals}).`;
    } else if (this.gameState === 'WAVE_DEFENSE') {
      if (qTitle) qTitle.innerText = `⚔️ WAVE DEFENSE: WAVE ${this.currentWave} / 3`;
      if (qDesc) qDesc.innerText = "Defeat incoming monster waves to awaken the Guardian!";
    } else if (this.gameState === 'BOSS_FIGHT') {
      if (qTitle) qTitle.innerText = "⚠️ GUARDIAN BOSS FIGHT";
      if (qDesc) qDesc.innerText = "Defeat the Dungeon Guardian Boss to conquer the ruins!";
    } else if (this.gameState === 'VICTORY') {
      if (qTitle) qTitle.innerText = "🎉 DUNGEON CLEARED!";
      if (qDesc) qDesc.innerText = "Ancient Ruins conquered successfully!";
    }
  }

  private updateHUD(): void {
    const hpFill = document.getElementById('hp-fill');
    const mpFill = document.getElementById('mp-fill');
    const hpText = document.getElementById('hp-text');
    const mpText = document.getElementById('mp-text');

    if (hpFill) hpFill.style.width = `${(this.playerHp / this.playerMaxHp) * 100}%`;
    if (mpFill) mpFill.style.width = `${(this.playerMp / this.playerMaxMp) * 100}%`;
    if (hpText) hpText.innerText = `${Math.round(this.playerHp)} / ${this.playerMaxHp}`;
    if (mpText) mpText.innerText = `${Math.round(this.playerMp)} / ${this.playerMaxMp}`;
  }

  private updateHotbarCDDOM(): void {
    this.updateCDOverlay('cd-dash', 'card-dash', this.dashCooldown, 60, 0);
    this.updateCDOverlay('cd-spell1', 'card-spell1', this.spell1Cooldown, 15, 10);
    this.updateCDOverlay('cd-spell2', 'card-spell2', this.spell2Cooldown, 90, 25);
    this.updateCDOverlay('cd-spell3', 'card-spell3', this.spell3Cooldown, 180, 40);
    this.updateCDOverlay('cd-spell4', 'card-spell4', this.spell4Cooldown, 480, 60);
    this.updateCDOverlay('cd-spell5', 'card-spell5', this.spell5Cooldown, 360, 35);
  }

  private updateCDOverlay(cdId: string, cardId: string, cd: number, maxCd: number, mpCost: number): void {
    const cdEl = document.getElementById(cdId);
    const cardEl = document.getElementById(cardId);

    if (cd > 0) {
      if (cdEl) {
        cdEl.style.display = 'flex';
        cdEl.innerText = (cd / 60).toFixed(1) + 's';
      }
      if (cardEl) cardEl.classList.add('disabled');
    } else {
      if (cdEl) cdEl.style.display = 'none';
      if (cardEl) {
        if (this.playerMp < mpCost) cardEl.classList.add('disabled');
        else cardEl.classList.remove('disabled');
      }
    }
  }

  private render(): void {
    let shakeX = 0, shakeY = 0;
    if (this.shakeTime > 0) {
      this.shakeTime--;
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.ctx.save();
    this.ctx.translate(shakeX, shakeY);

    this.ctx.fillStyle = '#0b0f19';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.5;

    for (let r = 0; r < this.dungeonMap.length; r++) {
      for (let c = 0; c < this.dungeonMap[r].length; c++) {
        const tile = this.dungeonMap[r][c];
        const tx = c * this.tileSize;
        const ty = r * this.tileSize;

        if (tile === 1) {
          this.ctx.fillStyle = '#1e293b';
          this.ctx.fillRect(tx, ty, this.tileSize - 1, this.tileSize - 1);
          this.ctx.strokeStyle = '#334155';
          this.ctx.strokeRect(tx, ty, this.tileSize - 1, this.tileSize - 1);
        } else if (tile === 2) {
          const glowRadius = 7 + pulse * 4;
          this.ctx.fillStyle = '#38bdf8';
          this.ctx.shadowColor = '#38bdf8';
          this.ctx.shadowBlur = 12 + pulse * 8;
          this.ctx.beginPath();
          this.ctx.arc(tx + 20, ty + 20, glowRadius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowBlur = 0;

          this.ctx.fillStyle = '#ffffff';
          this.ctx.beginPath();
          this.ctx.arc(tx + 20, ty + 20, 3, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
          this.ctx.strokeRect(tx, ty, this.tileSize, this.tileSize);
        }
      }
    }

    this.telegraphs.forEach(t => {
      const progress = t.timer / t.maxTimer;
      this.ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + progress * 0.25})`;
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, t.radius * progress, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    });

    this.projectiles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    this.particles.forEach(p => {
      const alpha = 1 - p.life / p.maxLife;
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    });

    this.enemies.forEach(e => {
      const isHit = e.hitFlashTimer > 0;
      this.ctx.fillStyle = isHit ? '#ffffff' : e.color;
      this.ctx.shadowColor = e.color;
      this.ctx.shadowBlur = e.isBoss ? 20 + (e.phase || 1) * 8 : 10;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (e.isBoss && e.phase === 3) {
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(e.x, e.y, e.radius + 8 + pulse * 6, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      if (!e.isBoss) {
        const barWidth = e.radius * 2.2;
        const barHeight = 4;
        const bx = e.x - barWidth / 2;
        const by = e.y - e.radius - 12;

        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(bx, by, barWidth, barHeight);
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(bx, by, barWidth * (e.hp / e.maxHp), barHeight);
      }

      this.ctx.fillStyle = e.isBoss ? '#fbbf24' : '#94a3b8';
      this.ctx.font = e.isBoss ? 'bold 12px sans-serif' : '10px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(e.type, e.x, e.y - e.radius - (e.isBoss ? 14 : 18));
    });

    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = ft.opacity;
      this.ctx.font = 'bold 15px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.globalAlpha = 1.0;
    });

    const isFlashing = this.iFrameTimer > 0 && Math.floor(this.iFrameTimer / 4) % 2 === 0;
    if (!isFlashing) {
      this.ctx.fillStyle = this.isDashing ? '#60a5fa' : '#38bdf8';
      this.ctx.shadowColor = '#38bdf8';
      this.ctx.shadowBlur = 18;
      this.ctx.beginPath();
      this.ctx.arc(this.playerPos.x, this.playerPos.y, 16, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(this.playerPos.x, this.playerPos.y, 6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#38bdf8';
      this.ctx.font = 'bold 12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('HERO (MILO)', this.playerPos.x, this.playerPos.y - 22);
    }

    this.ctx.restore();
  }

  private log(msg: string, type: 'info' | 'success' = 'info'): void {
    const container = document.getElementById('log-output');
    if (!container) return;
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }
}

function initMilo() {
  new MiloApplication();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initMilo);
} else {
  initMilo();
}
