// USB Game Controller / Gamepad Management using HTML5 Gamepad API
class GamepadController {
  constructor() {
    this.selectedGamepadIndex = -1;
    // PlayStation action buttons for gameplay:
    this.fireMainButtonIndex = 0;     // B0 (Cross): Main Cannon (Forward)
    this.missileButtonIndex = 1;      // B1 (Circle): Self-Guided Missile
    this.diagonalButtonIndex = 2;     // B2 (Square): Two-Cannon Diagonal Shooter (+45° & -45°)
    this.twoSidedButtonIndex = 3;     // B3 (Triangle): Two-Sided Cannon Shooter (+90° & -90°)

    // Menu and Pause controls:
    this.startButtonIndex = 9;        // B9 (START): Pause / Resume / Start Match
    this.selectButtonIndex = 8;       // B8 (SELECT): Open / Close Setup Menu

    this.deadzone = 0.22;
    this.connectedGamepads = [];
    this.lastConnectedCount = 0;
    this.onStatusChange = null;

    // Edge triggers for weapon buttons and menu buttons
    this.prevButtons = {};

    this.initListeners();
  }

  initListeners() {
    window.addEventListener('gamepadconnected', (e) => {
      this.refreshGamepads();
      if (e.gamepad) {
        this.selectedGamepadIndex = e.gamepad.index;
      }
      if (this.onStatusChange) {
        this.onStatusChange(this.getStatusSummary());
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      this.refreshGamepads();
      const available = this.getAvailableGamepads();
      this.selectedGamepadIndex = available.length > 0 ? available[0].index : -1;
      this.prevButtons = {};
      if (this.onStatusChange) {
        this.onStatusChange(this.getStatusSummary());
      }
    });
  }

  // Cross-browser querying of all gamepads
  getAvailableGamepads() {
    const rawPads = (navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : [])) || [];
    const pads = [];
    for (let i = 0; i < rawPads.length; i++) {
      if (rawPads[i] && rawPads[i].connected !== false) {
        pads.push(rawPads[i]);
      }
    }
    return pads;
  }

  refreshGamepads() {
    this.connectedGamepads = this.getAvailableGamepads();
    return this.connectedGamepads;
  }

  // Get active gamepad with dynamic re-acquisition if disconnected/reconnected
  getActiveGamepad() {
    const pads = this.getAvailableGamepads();
    if (pads.length === 0) {
      this.selectedGamepadIndex = -1;
      return null;
    }

    // 1. If currently selected index is valid, check if still in available list
    if (this.selectedGamepadIndex !== -1) {
      const match = pads.find(p => p.index === this.selectedGamepadIndex);
      if (match) return match;
    }

    // 2. Look for any pad that user is actively pressing
    for (const p of pads) {
      for (let i = 0; i < p.buttons.length; i++) {
        if (p.buttons[i] && p.buttons[i].pressed) {
          this.selectedGamepadIndex = p.index;
          return p;
        }
      }
      for (let a = 0; a < p.axes.length; a++) {
        if (Math.abs(p.axes[a]) > this.deadzone) {
          this.selectedGamepadIndex = p.index;
          return p;
        }
      }
    }

    // 3. Fallback to the first available connected pad
    this.selectedGamepadIndex = pads[0].index;
    return pads[0];
  }

  getStatusSummary() {
    const pads = this.getAvailableGamepads();
    if (pads.length === 0) {
      return { connected: false, text: 'Controller: None detected (Using Keyboard)' };
    }
    const activePad = this.getActiveGamepad() || pads[0];
    const name = activePad.id.length > 32 ? activePad.id.substring(0, 29) + '...' : activePad.id;
    return {
      connected: true,
      text: `Controller: ${name} (Pad #${activePad.index})`
    };
  }

  // Poll state each frame for player controls
  pollInput() {
    const pad = this.getActiveGamepad();
    if (!pad) {
      this.prevButtons = {};
      return {
        forward: false,
        reverse: false,
        rotateLeft: false,
        rotateRight: false,
        fireMain: false,
        fireMissile: false,
        fireDiagonal: false,
        fireTwoSided: false,
        startPressed: false,
        selectPressed: false,
        raw: null
      };
    }

    // Left analog stick or D-pad
    const axisX = pad.axes && pad.axes.length > 0 ? pad.axes[0] : 0;
    const axisY = pad.axes && pad.axes.length > 1 ? pad.axes[1] : 0;

    // Standard D-pad buttons (12: Up, 13: Down, 14: Left, 15: Right)
    const dpadUp = pad.buttons[12] && pad.buttons[12].pressed;
    const dpadDown = pad.buttons[13] && pad.buttons[13].pressed;
    const dpadLeft = pad.buttons[14] && pad.buttons[14].pressed;
    const dpadRight = pad.buttons[15] && pad.buttons[15].pressed;

    const forward = axisY < -this.deadzone || dpadUp;
    const reverse = axisY > this.deadzone || dpadDown;
    const rotateLeft = axisX < -this.deadzone || dpadLeft;
    const rotateRight = axisX > this.deadzone || dpadRight;

    // Check just pressed (edge trigger)
    const checkJustPressed = (btnIndex) => {
      const isDown = pad.buttons[btnIndex] && pad.buttons[btnIndex].pressed;
      const wasDown = !!this.prevButtons[btnIndex];
      return isDown && !wasDown;
    };

    // Weapons (B0 continuous/held or tapped, B1/B2/B3 edge triggers)
    const fireMain = pad.buttons[this.fireMainButtonIndex] ? pad.buttons[this.fireMainButtonIndex].pressed : false;
    const fireMissile = checkJustPressed(this.missileButtonIndex);   // B1: Circle
    const fireDiagonal = checkJustPressed(this.diagonalButtonIndex); // B2: Square
    const fireTwoSided = checkJustPressed(this.twoSidedButtonIndex); // B3: Triangle

    // Menu and pause controls
    const startJustPressed = checkJustPressed(this.startButtonIndex);   // B9: START
    const selectJustPressed = checkJustPressed(this.selectButtonIndex); // B8: SELECT

    // Save current button states for next frame edge detection
    for (let i = 0; i < pad.buttons.length; i++) {
      this.prevButtons[i] = pad.buttons[i].pressed;
    }

    return {
      forward,
      reverse,
      rotateLeft,
      rotateRight,
      fireMain,
      fireMissile,
      fireDiagonal,
      fireTwoSided,
      startPressed: startJustPressed,
      selectPressed: selectJustPressed,
      raw: pad
    };
  }

  // Diagnostics formatting for Setup modal (updated live every frame)
  getDiagnostics() {
    const pad = this.getActiveGamepad();
    if (!pad) {
      return {
        name: 'No USB Controller connected. Plug in USB and press any button.',
        axesText: 'Axes: None',
        buttonsText: 'Buttons: None'
      };
    }

    const axesStr = pad.axes && pad.axes.length > 0 
      ? pad.axes.map((a, i) => `${i}: ${a.toFixed(2)}`).slice(0, 4).join('  ') 
      : 'None';
      
    const pressedButtons = [];
    if (pad.buttons) {
      pad.buttons.forEach((b, i) => {
        if (b && b.pressed) pressedButtons.push(`B${i}`);
      });
    }

    return {
      name: `[Pad #${pad.index}] ${pad.id}`,
      axesText: axesStr || 'None',
      buttonsText: pressedButtons.length > 0 ? pressedButtons.join(', ') : 'None'
    };
  }
}

window.gamepadController = new GamepadController();
