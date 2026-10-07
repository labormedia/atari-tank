// Main Game Engine for Atari 2600 Tank Combat
(function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // DOM UI references
  const scoreP1El = document.getElementById('score-p1');
  const scoreP2El = document.getElementById('score-p2');
  const p2HeaderLabel = document.getElementById('p2-header-label');
  const timerEl = document.getElementById('game-timer');
  const timerStatusBadge = document.getElementById('timer-status-badge');
  const startOverlay = document.getElementById('start-overlay');
  const pauseOverlay = document.getElementById('pause-overlay');
  const gameOverOverlay = document.getElementById('game-over-overlay');
  const winnerBanner = document.getElementById('winner-banner');
  const finalScoreText = document.getElementById('final-score-text');
  const controllerDot = document.getElementById('controller-dot');
  const controllerStatusText = document.getElementById('controller-status-text');

  // Modal references
  const settingsModal = document.getElementById('settings-modal');
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const btnPauseToggle = document.getElementById('btn-pause-toggle');
  const btnReset = document.getElementById('btn-reset');
  const opponentSelect = document.getElementById('opponent-select');
  const aiDiffSelect = document.getElementById('ai-difficulty-select');
  const aiDiffRow = document.getElementById('ai-difficulty-row');
  const roundDurationSelect = document.getElementById('round-duration-select');
  const arenaSelect = document.getElementById('arena-select');
  const gamepadSelect = document.getElementById('gamepad-select');
  const btnDetectGamepad = document.getElementById('btn-detect-gamepad');
  const gamepadNameEl = document.getElementById('gamepad-name');
  const diagAxesEl = document.getElementById('diag-axes');
  const diagButtonsEl = document.getElementById('diag-buttons');

  // Arena configurations
  const ARENAS = {
    classic: [
      // Outer border walls
      { x: 0, y: 0, w: 800, h: 16 },
      { x: 0, y: 584, w: 800, h: 16 },
      { x: 0, y: 0, w: 16, h: 600 },
      { x: 784, y: 0, w: 16, h: 600 },
      // Classic Atari 2600 T-barriers and maze columns
      { x: 180, y: 120, w: 24, h: 160 },
      { x: 204, y: 190, w: 100, h: 24 },
      { x: 596, y: 320, w: 24, h: 160 },
      { x: 496, y: 386, w: 100, h: 24 },
      { x: 376, y: 230, w: 48, h: 140 },
      { x: 180, y: 440, w: 130, h: 24 },
      { x: 490, y: 136, w: 130, h: 24 }
    ],
    open: [
      { x: 0, y: 0, w: 800, h: 16 },
      { x: 0, y: 584, w: 800, h: 16 },
      { x: 0, y: 0, w: 16, h: 600 },
      { x: 784, y: 0, w: 16, h: 600 }
    ],
    fortress: [
      { x: 0, y: 0, w: 800, h: 16 },
      { x: 0, y: 584, w: 800, h: 16 },
      { x: 0, y: 0, w: 16, h: 600 },
      { x: 784, y: 0, w: 16, h: 600 },
      { x: 200, y: 150, w: 40, h: 110 },
      { x: 560, y: 150, w: 40, h: 110 },
      { x: 200, y: 340, w: 40, h: 110 },
      { x: 560, y: 340, w: 40, h: 110 },
      { x: 370, y: 270, w: 60, h: 60 }
    ]
  };

  // Game state
  const gameState = {
    running: false,
    mode: 'start', // 'start' | 'playing' | 'paused' | 'gameover'
    opponent: 'ai', // 'ai' | 'human'
    aiDifficulty: 'medium',
    roundDuration: 120,
    timeRemaining: 120,
    currentArena: 'classic',
    walls: ARENAS.classic,
    scoreP1: 0,
    scoreP2: 0,
    maxScore: 10
  };

  const keysDown = {};
  const prevKeysDown = {};
  const ai = new TankAI(gameState.aiDifficulty);

  // Tank Class
  class Tank {
    constructor(x, y, angle, color, trackColor) {
      this.initialX = x;
      this.initialY = y;
      this.initialAngle = angle;
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.color = color;
      this.trackColor = trackColor;
      this.radius = 16;
      this.speed = 135;
      this.rotSpeed = 2.8;
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
      this.coolDownMain = 0;
      this.coolDownMissile = 0;
      this.coolDownDiagonal = 0;
      this.coolDownTwoSided = 0;
      this.spinTimer = 0;
      this.isDestroyed = false;
    }

    reset(x, y, angle) {
      this.x = x !== undefined ? x : this.initialX;
      this.y = y !== undefined ? y : this.initialY;
      this.angle = angle !== undefined ? angle : this.initialAngle;
      this.vx = 0;
      this.vy = 0;
      this.moving = false;
      this.coolDownMain = 0;
      this.coolDownMissile = 0;
      this.coolDownDiagonal = 0;
      this.coolDownTwoSided = 0;
      this.spinTimer = 0;
      this.isDestroyed = false;
    }

    update(control, dt, walls) {
      if (this.coolDownMain > 0) this.coolDownMain -= dt;
      if (this.coolDownMissile > 0) this.coolDownMissile -= dt;
      if (this.coolDownDiagonal > 0) this.coolDownDiagonal -= dt;
      if (this.coolDownTwoSided > 0) this.coolDownTwoSided -= dt;

      // Handle hit / death spin
      if (this.isDestroyed) {
        this.spinTimer += dt;
        this.angle += 14 * dt;
        if (this.spinTimer > 1.2) {
          this.isDestroyed = false;
        }
        return;
      }

      // Rotation
      if (control.rotateLeft) {
        this.angle -= this.rotSpeed * dt;
      }
      if (control.rotateRight) {
        this.angle += this.rotSpeed * dt;
      }

      // Linear motion
      let moveDir = 0;
      if (control.forward) moveDir += 1;
      if (control.reverse) moveDir -= 0.65;

      this.moving = moveDir !== 0;

      if (moveDir !== 0) {
        const moveDist = moveDir * this.speed * dt;
        const nextX = this.x + Math.cos(this.angle) * moveDist;
        const nextY = this.y + Math.sin(this.angle) * moveDist;

        if (!this.checkWallCollision(nextX, nextY, walls)) {
          this.vx = (nextX - this.x) / dt;
          this.vy = (nextY - this.y) / dt;
          this.x = nextX;
          this.y = nextY;
        } else {
          if (!this.checkWallCollision(nextX, this.y, walls)) {
            this.x = nextX;
          } else if (!this.checkWallCollision(this.x, nextY, walls)) {
            this.y = nextY;
          }
          this.vx = 0;
          this.vy = 0;
        }
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    }

    checkWallCollision(testPx, testPy, walls) {
      const halfSize = 13;
      for (const w of walls) {
        if (
          testPx + halfSize > w.x &&
          testPx - halfSize < w.x + w.w &&
          testPy + halfSize > w.y &&
          testPy - halfSize < w.y + w.h
        ) {
          return true;
        }
      }
      return false;
    }

    canShootMain() {
      return !this.isDestroyed && this.coolDownMain <= 0;
    }

    canShootMissile() {
      return !this.isDestroyed && this.coolDownMissile <= 0;
    }

    canShootDiagonal() {
      return !this.isDestroyed && this.coolDownDiagonal <= 0;
    }

    canShootTwoSided() {
      return !this.isDestroyed && this.coolDownTwoSided <= 0;
    }

    // B0: Standard Front Cannon
    shootMain() {
      this.coolDownMain = 0.4;
      const barrelLength = 20;
      const spawnX = this.x + Math.cos(this.angle) * barrelLength;
      const spawnY = this.y + Math.sin(this.angle) * barrelLength;
      return [new Bullet(spawnX, spawnY, this.angle, this)];
    }

    // B1: Self-Guided Homing Missile
    shootMissile(targetTank) {
      this.coolDownMissile = 1.4; // Recharge delay
      const barrelLength = 18;
      const spawnX = this.x + Math.cos(this.angle) * barrelLength;
      const spawnY = this.y + Math.sin(this.angle) * barrelLength;
      return [new GuidedMissile(spawnX, spawnY, this.angle, this, targetTank)];
    }

    // B2: Two-Cannon Diagonal Shooter (+45° and -45°, not front facing)
    shootDiagonal() {
      this.coolDownDiagonal = 0.55;
      const barrelOffset = 16;
      const angleLeft = this.angle - Math.PI / 4;   // -45 degrees
      const angleRight = this.angle + Math.PI / 4;  // +45 degrees

      const b1 = new Bullet(
        this.x + Math.cos(angleLeft) * barrelOffset,
        this.y + Math.sin(angleLeft) * barrelOffset,
        angleLeft,
        this
      );
      const b2 = new Bullet(
        this.x + Math.cos(angleRight) * barrelOffset,
        this.y + Math.sin(angleRight) * barrelOffset,
        angleRight,
        this
      );
      return [b1, b2];
    }

    // B3: Two-Sided Cannon Shooter (+90° and -90°, not front facing)
    shootTwoSided() {
      this.coolDownTwoSided = 0.55;
      const sideOffset = 14;
      const anglePort = this.angle - Math.PI / 2;     // -90 degrees (Left flank)
      const angleStarboard = this.angle + Math.PI / 2; // +90 degrees (Right flank)

      const b1 = new Bullet(
        this.x + Math.cos(anglePort) * sideOffset,
        this.y + Math.sin(anglePort) * sideOffset,
        anglePort,
        this
      );
      const b2 = new Bullet(
        this.x + Math.cos(angleStarboard) * sideOffset,
        this.y + Math.sin(angleStarboard) * sideOffset,
        angleStarboard,
        this
      );
      return [b1, b2];
    }

    hit() {
      this.isDestroyed = true;
      this.spinTimer = 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Treads
      ctx.fillStyle = this.trackColor;
      ctx.fillRect(-15, -12, 30, 6);
      ctx.fillRect(-15, 6, 30, 6);

      // Tread segment lines
      ctx.fillStyle = '#000';
      for (let i = -12; i <= 12; i += 6) {
        ctx.fillRect(i, -12, 2, 6);
        ctx.fillRect(i, 6, 2, 6);
      }

      // Main Hull
      ctx.fillStyle = this.color;
      ctx.fillRect(-12, -7, 24, 14);

      // Visual side gun pods for 2-sided and diagonal shooting
      ctx.fillStyle = '#222';
      ctx.fillRect(-4, -10, 8, 3); // Left flank pod
      ctx.fillRect(-4, 7, 8, 3);  // Right flank pod

      // Diagonal mini barrels
      ctx.fillStyle = this.trackColor;
      ctx.fillRect(3, -9, 6, 2);
      ctx.fillRect(3, 7, 6, 2);

      // Central Turret
      ctx.fillStyle = '#111';
      ctx.fillRect(-4, -4, 8, 8);

      // Front Cannon Barrel
      ctx.fillStyle = this.color;
      ctx.fillRect(0, -2, 17, 4);

      ctx.restore();
    }
  }

  // Bullet Class with Atari 2600 ricochet bounce mechanics
  class Bullet {
    constructor(x, y, angle, owner) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = 380;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.owner = owner;
      this.bouncesRemaining = 3;
      this.lifeTime = 2.4;
      this.size = 4;
      this.expired = false;
      this.isMissile = false;
    }

    update(dt, walls) {
      this.lifeTime -= dt;
      if (this.lifeTime <= 0) {
        this.expired = true;
        return;
      }

      let nextX = this.x + this.vx * dt;
      let nextY = this.y + this.vy * dt;

      // Check wall bounce collisions
      for (const w of walls) {
        if (
          nextX + this.size > w.x &&
          nextX - this.size < w.x + w.w &&
          nextY + this.size > w.y &&
          nextY - this.size < w.y + w.h
        ) {
          if (this.bouncesRemaining > 0) {
            this.bouncesRemaining--;
            window.atariAudio.playBounce();

            const prevDistLeft = Math.abs(this.x - w.x);
            const prevDistRight = Math.abs(this.x - (w.x + w.w));
            const prevDistTop = Math.abs(this.y - w.y);
            const prevDistBottom = Math.abs(this.y - (w.y + w.h));
            const minDistH = Math.min(prevDistLeft, prevDistRight);
            const minDistV = Math.min(prevDistTop, prevDistBottom);

            if (minDistH < minDistV) {
              this.vx = -this.vx;
            } else {
              this.vy = -this.vy;
            }

            nextX = this.x + this.vx * dt;
            nextY = this.y + this.vy * dt;
          } else {
            this.expired = true;
            return;
          }
        }
      }

      this.x = nextX;
      this.y = nextY;
    }

    draw(ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
    }
  }

  // Self-Guided Homing Missile Class (B1 / Circle)
  class GuidedMissile {
    constructor(x, y, angle, owner, target) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = 290;
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.owner = owner;
      this.target = target;
      this.turnRate = 3.6; // Radians per second tracking
      this.lifeTime = 3.8;
      this.size = 6;
      this.expired = false;
      this.isMissile = true;
      this.trailTimer = 0;
      this.smokeParticles = [];
    }

    update(dt, walls) {
      this.lifeTime -= dt;
      if (this.lifeTime <= 0) {
        this.expired = true;
        return;
      }

      // Homing steer towards hostile target tank
      if (this.target && !this.target.isDestroyed) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const desiredAngle = Math.atan2(dy, dx);
        let angleDiff = desiredAngle - this.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        const turnStep = this.turnRate * dt;
        if (Math.abs(angleDiff) <= turnStep) {
          this.angle = desiredAngle;
        } else {
          this.angle += Math.sign(angleDiff) * turnStep;
        }

        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
      }

      // Smoke puff trail
      this.trailTimer += dt;
      if (this.trailTimer > 0.04) {
        this.trailTimer = 0;
        this.smokeParticles.push({
          x: this.x - Math.cos(this.angle) * 8,
          y: this.y - Math.sin(this.angle) * 8,
          life: 0.35,
          color: Math.random() > 0.5 ? '#ff3300' : '#ffff33'
        });
      }

      for (const p of this.smokeParticles) {
        p.life -= dt;
      }
      this.smokeParticles = this.smokeParticles.filter(p => p.life > 0);

      const nextX = this.x + this.vx * dt;
      const nextY = this.y + this.vy * dt;

      // Missiles explode on wall impact
      for (const w of walls) {
        if (
          nextX + this.size > w.x &&
          nextX - this.size < w.x + w.w &&
          nextY + this.size > w.y &&
          nextY - this.size < w.y + w.h
        ) {
          this.expired = true;
          explosions.push(new ExplosionEffect(this.x, this.y, '#ff4400'));
          window.atariAudio.playBounce();
          return;
        }
      }

      this.x = nextX;
      this.y = nextY;
    }

    draw(ctx) {
      // Draw smoke exhaust trail
      for (const p of this.smokeParticles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Rocket fuselage & red warhead
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -2, 10, 4);
      ctx.fillStyle = '#ff2200';
      ctx.fillRect(3, -2, 4, 4);
      // Fins
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(-5, -4, 2, 8);

      ctx.restore();
    }
  }

  // Particle explosion effects
  class ExplosionEffect {
    constructor(x, y, color) {
      this.particles = [];
      for (let i = 0; i < 24; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = Math.random() * 140 + 40;
        this.particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: Math.random() * 4 + 2,
          life: 0.5 + Math.random() * 0.3,
          color: Math.random() > 0.4 ? color : (Math.random() > 0.5 ? '#ff4400' : '#ffff00')
        });
      }
    }

    update(dt) {
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      }
      this.particles = this.particles.filter(p => p.life > 0);
    }

    draw(ctx) {
      for (const p of this.particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    }
  }

  // Tank instances
  const tankP1 = new Tank(100, 300, 0, '#caa049', '#7f6323'); // Tan
  const tankP2 = new Tank(700, 300, Math.PI, '#3d7cd1', '#1e4882'); // Blue
  let bullets = [];
  let explosions = [];

  // Input Listeners
  window.addEventListener('keydown', (e) => {
    keysDown[e.code] = true;
    window.atariAudio.init();

    if (e.code === 'Space' || e.code === 'Enter') {
      if (gameState.mode === 'start' || gameState.mode === 'gameover') {
        startGame();
      }
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
    }

    if (e.code === 'KeyM') {
      toggleSound();
    }

    if (e.code === 'KeyR') {
      resetMatch();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysDown[e.code] = false;
  });

  // UI buttons
  btnSettings.addEventListener('click', () => openSetupMenu());
  btnCloseModal.addEventListener('click', () => closeSetupMenu());
  btnSaveSettings.addEventListener('click', () => {
    applySettings();
    closeSetupMenu();
  });

  opponentSelect.addEventListener('change', (e) => {
    aiDiffRow.style.display = e.target.value === 'ai' ? 'flex' : 'none';
  });

  btnDetectGamepad.addEventListener('click', () => updateGamepadSelectOptions());
  btnSoundToggle.addEventListener('click', () => toggleSound());
  btnPauseToggle.addEventListener('click', () => togglePause());
  btnReset.addEventListener('click', () => resetMatch());
  startOverlay.addEventListener('click', () => startGame());
  pauseOverlay.addEventListener('click', () => togglePause());
  gameOverOverlay.addEventListener('click', () => startGame());

  function openSetupMenu() {
    updateGamepadSelectOptions();
    settingsModal.classList.remove('hidden');
    if (gameState.mode === 'playing') {
      pauseGame();
    }
  }

  function closeSetupMenu() {
    settingsModal.classList.add('hidden');
  }

  function toggleSetupMenu() {
    if (settingsModal.classList.contains('hidden')) {
      openSetupMenu();
    } else {
      applySettings();
      closeSetupMenu();
    }
  }

  function toggleSound() {
    window.atariAudio.init();
    const enabled = window.atariAudio.toggleSound();
    btnSoundToggle.textContent = enabled ? '🔊 SOUND: ON (M)' : '🔇 SOUND: OFF (M)';
  }

  function pauseGame() {
    if (gameState.mode === 'playing') {
      gameState.mode = 'paused';
      pauseOverlay.classList.remove('hidden');
      timerStatusBadge.textContent = 'PAUSED';
      btnPauseToggle.textContent = '▶ RESUME (B9 / P)';
      window.atariAudio.updateEngine(false, false);
    }
  }

  function resumeGame() {
    if (gameState.mode === 'paused') {
      gameState.mode = 'playing';
      pauseOverlay.classList.add('hidden');
      timerStatusBadge.textContent = 'TIME';
      btnPauseToggle.textContent = '⏸ PAUSE (B9 / P)';
    }
  }

  function togglePause() {
    if (gameState.mode === 'playing') {
      pauseGame();
    } else if (gameState.mode === 'paused') {
      resumeGame();
    } else if (gameState.mode === 'start' || gameState.mode === 'gameover') {
      startGame();
    }
  }

  function updateGamepadSelectOptions() {
    const pads = window.gamepadController.refreshGamepads();
    gamepadSelect.innerHTML = '';
    
    if (pads.length === 0) {
      const opt = document.createElement('option');
      opt.value = -1;
      opt.textContent = 'None detected (Plug USB & press button)';
      gamepadSelect.appendChild(opt);
    } else {
      pads.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.index;
        opt.textContent = `[#${p.index}] ${p.id.substring(0, 32)}`;
        if (p.index === window.gamepadController.selectedGamepadIndex) {
          opt.selected = true;
        }
        gamepadSelect.appendChild(opt);
      });
    }
  }

  function applySettings() {
    gameState.opponent = opponentSelect.value;
    gameState.aiDifficulty = aiDiffSelect.value;
    ai.setDifficulty(gameState.aiDifficulty);
    gameState.roundDuration = parseInt(roundDurationSelect.value, 10);
    gameState.currentArena = arenaSelect.value;
    gameState.walls = ARENAS[gameState.currentArena];

    const selectedPadIdx = parseInt(gamepadSelect.value, 10);
    if (!isNaN(selectedPadIdx)) {
      window.gamepadController.selectedGamepadIndex = selectedPadIdx;
    }

    p2HeaderLabel.textContent = gameState.opponent === 'ai' 
      ? `CPU (${gameState.aiDifficulty.toUpperCase()})` 
      : 'PLAYER 2';

    resetMatch();
  }

  function startGame() {
    window.atariAudio.init();
    startOverlay.classList.remove('active');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    gameState.mode = 'playing';
    gameState.timeRemaining = gameState.roundDuration;
    gameState.scoreP1 = 0;
    gameState.scoreP2 = 0;
    timerStatusBadge.textContent = 'TIME';
    btnPauseToggle.textContent = '⏸ PAUSE (B9 / P)';
    updateScoreboard();
    resetPositions();
  }

  function resetMatch() {
    gameState.mode = 'start';
    startOverlay.classList.add('active');
    pauseOverlay.classList.add('hidden');
    gameOverOverlay.classList.add('hidden');
    gameState.scoreP1 = 0;
    gameState.scoreP2 = 0;
    gameState.timeRemaining = gameState.roundDuration;
    timerStatusBadge.textContent = 'TIME';
    btnPauseToggle.textContent = '⏸ PAUSE (B9 / P)';
    bullets = [];
    explosions = [];
    resetPositions();
    updateScoreboard();
  }

  function resetPositions() {
    tankP1.reset(120, 300, 0);
    tankP2.reset(680, 300, Math.PI);
    bullets = [];
  }

  function endGame(winner) {
    gameState.mode = 'gameover';
    window.atariAudio.playBuzzer();
    gameOverOverlay.classList.remove('hidden');

    if (winner === 'p1') {
      winnerBanner.textContent = 'PLAYER 1 WINS!';
      winnerBanner.style.color = 'var(--atari-tank-tan)';
    } else if (winner === 'p2') {
      winnerBanner.textContent = gameState.opponent === 'ai' ? 'CPU WINS!' : 'PLAYER 2 WINS!';
      winnerBanner.style.color = 'var(--atari-tank-blue)';
    } else {
      winnerBanner.textContent = 'DRAW MATCH!';
      winnerBanner.style.color = '#ffd700';
    }

    finalScoreText.textContent = `FINAL SCORE: ${gameState.scoreP1} - ${gameState.scoreP2}`;
  }

  function updateScoreboard() {
    scoreP1El.textContent = gameState.scoreP1;
    scoreP2El.textContent = gameState.scoreP2;

    if (gameState.roundDuration > 3600) {
      timerEl.textContent = '∞';
    } else {
      const mins = Math.floor(gameState.timeRemaining / 60);
      const secs = Math.floor(gameState.timeRemaining % 60);
      timerEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  }

  let lastGamepadCount = -1;
  function updateDiagnosticsUI() {
    const diag = window.gamepadController.getDiagnostics();
    gamepadNameEl.textContent = diag.name;
    diagAxesEl.textContent = diag.axesText;
    diagButtonsEl.textContent = diag.buttonsText;

    const summary = window.gamepadController.getStatusSummary();
    controllerStatusText.textContent = summary.text;
    if (summary.connected) {
      controllerDot.classList.add('active');
    } else {
      controllerDot.classList.remove('active');
    }

    // Live update the gamepad dropdown in setup menu if modal is visible or count changed
    const currentCount = window.gamepadController.getAvailableGamepads().length;
    if (currentCount !== lastGamepadCount && !settingsModal.classList.contains('hidden')) {
      lastGamepadCount = currentCount;
      updateGamepadSelectOptions();
    }
  }

  // Keyboard edge trigger helper
  function isKeyJustPressed(code) {
    return keysDown[code] && !prevKeysDown[code];
  }

  // Main Loop
  let lastTime = performance.now();

  function gameLoop(currentTime) {
    const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
    lastTime = currentTime;

    updateDiagnosticsUI();

    const gpInput = window.gamepadController.pollInput();

    // Menu / Pause shortcuts via Controller
    if (gpInput.startPressed) {
      togglePause();
    }
    if (gpInput.selectPressed) {
      toggleSetupMenu();
    }

    // P1 Weapon Triggers (Gamepad or Keyboard)
    // B0 / Space: Main Front Cannon
    const p1FireMain = keysDown['Space'] || keysDown['Enter'] || gpInput.fireMain;
    // B1 / 1: Self-Guided Missile
    const p1FireMissile = isKeyJustPressed('Digit1') || isKeyJustPressed('Numpad1') || gpInput.fireMissile;
    // B2 / 2: Two-Cannon Diagonal Shooter (+45° and -45°)
    const p1FireDiagonal = isKeyJustPressed('Digit2') || isKeyJustPressed('Numpad2') || gpInput.fireDiagonal;
    // B3 / 3: Two-Sided Cannon Shooter (+90° and -90°)
    const p1FireTwoSided = isKeyJustPressed('Digit3') || isKeyJustPressed('Numpad3') || gpInput.fireTwoSided;

    const p1Control = {
      forward: keysDown['KeyW'] || keysDown['ArrowUp'] || gpInput.forward,
      reverse: keysDown['KeyS'] || keysDown['ArrowDown'] || gpInput.reverse,
      rotateLeft: keysDown['KeyA'] || keysDown['ArrowLeft'] || gpInput.rotateLeft,
      rotateRight: keysDown['KeyD'] || keysDown['ArrowRight'] || gpInput.rotateRight
    };

    // P2 Controls (Human or AI)
    let p2Control = {
      forward: false,
      reverse: false,
      rotateLeft: false,
      rotateRight: false,
      fireMain: false,
      fireMissile: false,
      fireDiagonal: false,
      fireTwoSided: false
    };

    if (gameState.opponent === 'human') {
      p2Control = {
        forward: keysDown['KeyI'],
        reverse: keysDown['KeyK'],
        rotateLeft: keysDown['KeyJ'],
        rotateRight: keysDown['KeyL'],
        fireMain: keysDown['KeyF'],
        fireMissile: isKeyJustPressed('Digit7'),
        fireDiagonal: isKeyJustPressed('Digit8'),
        fireTwoSided: isKeyJustPressed('Digit9')
      };
    } else if (gameState.mode === 'playing') {
      const aiAction = ai.update(tankP2, tankP1, gameState.walls, bullets, dt);
      p2Control = {
        forward: aiAction.forward,
        reverse: aiAction.reverse,
        rotateLeft: aiAction.rotateLeft,
        rotateRight: aiAction.rotateRight,
        fireMain: aiAction.fire,
        fireMissile: aiAction.fireMissile,
        fireDiagonal: aiAction.fireDiagonal,
        fireTwoSided: aiAction.fireTwoSided
      };
    }

    if (gameState.mode === 'playing') {
      // Countdown Timer
      if (gameState.roundDuration <= 3600) {
        gameState.timeRemaining -= dt;
        if (gameState.timeRemaining <= 0) {
          gameState.timeRemaining = 0;
          if (gameState.scoreP1 > gameState.scoreP2) endGame('p1');
          else if (gameState.scoreP2 > gameState.scoreP1) endGame('p2');
          else endGame('draw');
        }
      }
      updateScoreboard();

      // P1 Weapon Executions
      if (p1FireMain && tankP1.canShootMain()) {
        bullets.push(...tankP1.shootMain());
        window.atariAudio.playFire();
      }
      if (p1FireMissile && tankP1.canShootMissile()) {
        bullets.push(...tankP1.shootMissile(tankP2));
        window.atariAudio.playMissileLaunch();
      }
      if (p1FireDiagonal && tankP1.canShootDiagonal()) {
        bullets.push(...tankP1.shootDiagonal());
        window.atariAudio.playDualFire();
      }
      if (p1FireTwoSided && tankP1.canShootTwoSided()) {
        bullets.push(...tankP1.shootTwoSided());
        window.atariAudio.playDualFire();
      }

      // P2 Weapon Executions
      if (p2Control.fireMain && tankP2.canShootMain()) {
        bullets.push(...tankP2.shootMain());
        window.atariAudio.playFire();
      }
      if (p2Control.fireMissile && tankP2.canShootMissile()) {
        bullets.push(...tankP2.shootMissile(tankP1));
        window.atariAudio.playMissileLaunch();
      }
      if (p2Control.fireDiagonal && tankP2.canShootDiagonal()) {
        bullets.push(...tankP2.shootDiagonal());
        window.atariAudio.playDualFire();
      }
      if (p2Control.fireTwoSided && tankP2.canShootTwoSided()) {
        bullets.push(...tankP2.shootTwoSided());
        window.atariAudio.playDualFire();
      }

      // Update Tanks
      tankP1.update(p1Control, dt, gameState.walls);
      tankP2.update(p2Control, dt, gameState.walls);
      window.atariAudio.updateEngine(tankP1.moving, tankP2.moving);

      // Update Projectiles
      for (const b of bullets) {
        b.update(dt, gameState.walls);

        // Check hit on Tank 1
        if (!tankP1.isDestroyed && Math.hypot(b.x - tankP1.x, b.y - tankP1.y) < tankP1.radius) {
          b.expired = true;
          tankP1.hit();
          explosions.push(new ExplosionEffect(tankP1.x, tankP1.y, tankP1.color));
          window.atariAudio.playExplosion();
          gameState.scoreP2++;
          updateScoreboard();
          if (gameState.roundDuration > 3600 && gameState.scoreP2 >= gameState.maxScore) {
            endGame('p2');
          }
        }

        // Check hit on Tank 2
        if (!tankP2.isDestroyed && Math.hypot(b.x - tankP2.x, b.y - tankP2.y) < tankP2.radius) {
          b.expired = true;
          tankP2.hit();
          explosions.push(new ExplosionEffect(tankP2.x, tankP2.y, tankP2.color));
          window.atariAudio.playExplosion();
          gameState.scoreP1++;
          updateScoreboard();
          if (gameState.roundDuration > 3600 && gameState.scoreP1 >= gameState.maxScore) {
            endGame('p1');
          }
        }
      }

      bullets = bullets.filter(b => !b.expired);

      // Update explosions
      for (const exp of explosions) {
        exp.update(dt);
      }
      explosions = explosions.filter(exp => exp.particles.length > 0);
    }

    // Save previous key states
    for (const k in keysDown) {
      prevKeysDown[k] = keysDown[k];
    }

    // RENDER PASS
    render();

    requestAnimationFrame(gameLoop);
  }

  function render() {
    ctx.fillStyle = '#d4a34b'; // Sand pitch
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Barriers/Walls
    ctx.fillStyle = '#4a2f1b';
    for (const w of gameState.walls) {
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#6a4327';
      ctx.fillRect(w.x, w.y, w.w, 2);
      ctx.fillStyle = '#4a2f1b';
    }

    // Draw Tanks
    tankP1.draw(ctx);
    tankP2.draw(ctx);

    // Draw Projectiles
    for (const b of bullets) {
      b.draw(ctx);
    }

    // Draw Explosions
    for (const exp of explosions) {
      exp.draw(ctx);
    }
  }

  requestAnimationFrame(gameLoop);
})();
