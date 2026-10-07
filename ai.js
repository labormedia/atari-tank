// Automated Computer Contestant (AI) with 3 Difficulty Levels
class TankAI {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy' | 'medium' | 'hard'
    this.timer = 0;
    this.changeActionTimer = 0;
    this.currentAction = {
      forward: false,
      reverse: false,
      rotateLeft: false,
      rotateRight: false,
      fire: false,
      fireMissile: false,
      fireDiagonal: false,
      fireTwoSided: false
    };
    this.specialWeaponTimer = 0;
  }

  setDifficulty(level) {
    this.difficulty = level;
  }

  // Raycast to check if bullet trajectory hits target directly
  checkDirectLineOfSight(x1, y1, x2, y2, walls) {
    for (const w of walls) {
      if (this.lineIntersectsRect(x1, y1, x2, y2, w)) {
        return false;
      }
    }
    return true;
  }

  lineIntersectsRect(x1, y1, x2, y2, r) {
    return this.lineIntersectsSegment(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
           this.lineIntersectsSegment(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
           this.lineIntersectsSegment(x1, y1, x2, y2, r.x, r.y + r.h, r.x + r.w, r.y + r.h) ||
           this.lineIntersectsSegment(x1, y1, x2, y2, r.x, r.y, r.x, r.y + r.h);
  }

  lineIntersectsSegment(p0_x, p0_y, p1_x, p1_y, p2_x, p2_y, p3_x, p3_y) {
    const s1_x = p1_x - p0_x;
    const s1_y = p1_y - p0_y;
    const s2_x = p3_x - p2_x;
    const s2_y = p3_y - p2_y;

    const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / (-s2_x * s1_y + s1_x * s2_y);
    const t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / (-s2_x * s1_y + s1_x * s2_y);

    return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
  }

  update(selfTank, targetTank, walls, bullets, dt) {
    this.timer += dt;
    this.changeActionTimer += dt;
    this.specialWeaponTimer += dt;

    if (this.difficulty === 'easy') {
      return this.updateEasy(selfTank, targetTank, dt);
    } else if (this.difficulty === 'medium') {
      return this.updateMedium(selfTank, targetTank, walls, dt);
    } else {
      return this.updateHard(selfTank, targetTank, walls, bullets, dt);
    }
  }

  // --- EASY DIFFICULTY: Recruit ---
  updateEasy(selfTank, targetTank, dt) {
    if (this.changeActionTimer > 0.8) {
      this.changeActionTimer = 0;
      const dx = targetTank.x - selfTank.x;
      const dy = targetTank.y - selfTank.y;
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - selfTank.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      const noisyDiff = angleDiff + (Math.random() - 0.5) * 1.5;

      this.currentAction.rotateLeft = noisyDiff < -0.3;
      this.currentAction.rotateRight = noisyDiff > 0.3;
      this.currentAction.forward = Math.random() > 0.35;
      this.currentAction.reverse = Math.random() > 0.9;
      
      this.currentAction.fire = Math.abs(angleDiff) < 0.5 && Math.random() > 0.4;
      this.currentAction.fireMissile = false;
      this.currentAction.fireDiagonal = false;
      this.currentAction.fireTwoSided = false;
    }
    return this.currentAction;
  }

  // --- MEDIUM DIFFICULTY: Veteran ---
  updateMedium(selfTank, targetTank, walls, dt) {
    const dx = targetTank.x - selfTank.x;
    const dy = targetTank.y - selfTank.y;
    const dist = Math.hypot(dx, dy);

    const leadTime = dist / 380;
    const predX = targetTank.x + targetTank.vx * leadTime * 0.7;
    const predY = targetTank.y + targetTank.vy * leadTime * 0.7;

    const desiredAngle = Math.atan2(predY - selfTank.y, predX - selfTank.x);
    let angleDiff = desiredAngle - selfTank.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    const action = {
      forward: false,
      reverse: false,
      rotateLeft: angleDiff < -0.15,
      rotateRight: angleDiff > 0.15,
      fire: false,
      fireMissile: false,
      fireDiagonal: false,
      fireTwoSided: false
    };

    const hasLos = this.checkDirectLineOfSight(selfTank.x, selfTank.y, targetTank.x, targetTank.y, walls);

    if (hasLos) {
      if (Math.abs(angleDiff) < 0.25) {
        action.fire = true;
      }
      // Occasionally fire guided missile
      if (this.specialWeaponTimer > 7 && Math.random() > 0.5) {
        action.fireMissile = true;
        this.specialWeaponTimer = 0;
      }
      if (dist > 220) {
        action.forward = true;
      } else if (dist < 120) {
        action.reverse = true;
      }
    } else {
      action.forward = true;
      if (Math.abs(selfTank.vx) < 5 && Math.abs(selfTank.vy) < 5 && this.changeActionTimer > 0.4) {
        action.rotateRight = true;
        action.reverse = true;
      }
    }

    return action;
  }

  // --- HARD DIFFICULTY: Ace ---
  updateHard(selfTank, targetTank, walls, bullets, dt) {
    const action = {
      forward: false,
      reverse: false,
      rotateLeft: false,
      rotateRight: false,
      fire: false,
      fireMissile: false,
      fireDiagonal: false,
      fireTwoSided: false
    };

    // 1. Threat avoidance
    let incomingDanger = false;
    for (const b of bullets) {
      if (b.owner !== selfTank) {
        const toAIX = selfTank.x - b.x;
        const toAIY = selfTank.y - b.y;
        const distToBullet = Math.hypot(toAIX, toAIY);
        
        if (distToBullet < 180) {
          const dot = (b.vx * toAIX + b.vy * toAIY) / (Math.hypot(b.vx, b.vy) * distToBullet || 1);
          if (dot > 0.7) {
            incomingDanger = true;
            action.forward = true;
            action.rotateLeft = true;
            break;
          }
        }
      }
    }

    if (incomingDanger) {
      return action;
    }

    // 2. High-precision predictive lead aim
    const dx = targetTank.x - selfTank.x;
    const dy = targetTank.y - selfTank.y;
    const dist = Math.hypot(dx, dy);
    const bulletSpeed = 380;
    const leadTime = dist / bulletSpeed;

    const predictedTargetX = targetTank.x + targetTank.vx * leadTime;
    const predictedTargetY = targetTank.y + targetTank.vy * leadTime;

    let targetAimX = predictedTargetX;
    let targetAimY = predictedTargetY;

    let clearShot = this.checkDirectLineOfSight(selfTank.x, selfTank.y, targetAimX, targetAimY, walls);

    if (!clearShot) {
      const mirrorX = 800 - targetAimX;
      if (this.checkDirectLineOfSight(selfTank.x, selfTank.y, 790, targetAimY, walls)) {
        targetAimX = 790;
        clearShot = true;
      } else if (this.checkDirectLineOfSight(selfTank.x, selfTank.y, 10, targetAimY, walls)) {
        targetAimX = 10;
        clearShot = true;
      }
    }

    const desiredAngle = Math.atan2(targetAimY - selfTank.y, targetAimX - selfTank.x);
    let angleDiff = desiredAngle - selfTank.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    action.rotateLeft = angleDiff < -0.06;
    action.rotateRight = angleDiff > 0.06;

    // Check angle for side-cannon shooting (approx ±90° / ±1.57 rad)
    const absDiff = Math.abs(angleDiff);
    if (Math.abs(absDiff - Math.PI / 2) < 0.25) {
      action.fireTwoSided = true;
    }
    // Check angle for diagonal shooting (approx ±45° / ±0.785 rad)
    else if (Math.abs(absDiff - Math.PI / 4) < 0.22) {
      action.fireDiagonal = true;
    } else if (clearShot && absDiff < 0.12) {
      action.fire = true;
    }

    // High level AI uses guided missile when player is hiding behind barrier
    if (!clearShot && this.specialWeaponTimer > 4.5) {
      action.fireMissile = true;
      this.specialWeaponTimer = 0;
    }

    // Tactical positioning
    if (dist > 280) {
      action.forward = true;
    } else if (dist < 140) {
      action.reverse = true;
    } else {
      action.forward = true;
    }

    return action;
  }
}

window.TankAI = TankAI;
