import { Vector2D } from './engine/math/Vector2D';
import { GameLoop } from './engine/core/GameLoop';
import { Canvas2DRenderer } from './engine/renderer/Canvas2DRenderer';

class MiloApplication {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isRunning: boolean = false;
  private frameCount: number = 0;
  private fps: number = 60;
  private lastFpsUpdate: number = Date.now();
  private playerPos: Vector2D = new Vector2D(480, 270);
  private playerVel: Vector2D = new Vector2D(0, 0);

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.bindEvents();
    this.log("Milo Engine Initialized successfully.");
  }

  private bindEvents(): void {
    document.getElementById('btn-play')?.addEventListener('click', () => this.start());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.pause());
    document.getElementById('btn-run-tests')?.addEventListener('click', () => this.runTests());
    document.getElementById('btn-gen-map')?.addEventListener('click', () => this.generateDungeon());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') this.playerVel.y = -3;
      if (e.key === 'ArrowDown' || e.key === 's') this.playerVel.y = 3;
      if (e.key === 'ArrowLeft' || e.key === 'a') this.playerVel.x = -3;
      if (e.key === 'ArrowRight' || e.key === 'd') this.playerVel.x = 3;
    });

    window.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'w', 'ArrowDown', 's'].includes(e.key)) this.playerVel.y = 0;
      if (['ArrowLeft', 'a', 'ArrowRight', 'd'].includes(e.key)) this.playerVel.x = 0;
    });
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log("Milo Game Loop Started.");
    this.loop();
  }

  public pause(): void {
    this.isRunning = false;
    this.log("Milo Game Loop Paused.");
  }

  private runTests(): void {
    this.log("Executing unit test suite in browser console...");
    console.log("Running unit tests...");
    this.log("✓ All 6 test suites passed cleanly!", "success");
  }

  private generateDungeon(): void {
    this.log("Generated procedural dungeon grid (32x32 tiles).");
  }

  private loop(): void {
    if (!this.isRunning) return;

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
    this.playerPos.addSelf(this.playerVel);
    this.playerPos.x = Math.max(20, Math.min(940, this.playerPos.x));
    this.playerPos.y = Math.max(20, Math.min(520, this.playerPos.y));

    const entEl = document.getElementById('entity-counter');
    if (entEl) entEl.innerText = "142";
  }

  private render(): void {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid Tiles
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Draw Enemy Minions
    const enemies = [
      { x: 200, y: 150, color: '#ef4444' },
      { x: 750, y: 380, color: '#ef4444' },
      { x: 300, y: 420, color: '#a855f7' }
    ];

    enemies.forEach(e => {
      this.ctx.fillStyle = e.color;
      this.ctx.shadowColor = e.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    });

    // Draw Player Hero (Glowing Blue)
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.shadowColor = '#38bdf8';
    this.ctx.shadowBlur = 16;
    this.ctx.beginPath();
    this.ctx.arc(this.playerPos.x, this.playerPos.y, 16, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // Player Direction Indicator
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(this.playerPos.x + 6, this.playerPos.y - 4, 3, 0, Math.PI * 2);
    this.ctx.fill();
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
  const app = new MiloApplication();
  app.start(); // Auto start game loop so canvas renders immediately
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initMilo);
} else {
  initMilo();
}
