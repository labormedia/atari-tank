# Atari Combat 2600 - Tank Game

A browser-based recreation of the Atari 2600 *Combat* tank battle with USB gamepad/videocontroller support, dynamic audio synthesis, pause functionality, advanced multi-cannon and missile weaponry, and an automated computer AI with 3 difficulty levels.

## Features

1. **Atari 2600 Combat Simulation:**
   - 2-player tank battlefield with sand arena, obstacle barriers, tank tracks, and turret rotation.
   - Bouncing/ricochet shell physics, self-guided rocket propulsion, and classic Atari death spin & particle explosion animations.
   - TIA-style sound effects built using the Web Audio API (cannon blast, dual cannons, rocket thrusters, ricochet, noise explosion, motor hum, round buzzer).
   - CRT scanline effect, scoreboard timer, and dedicated **Pause** mode.

2. **Dedicated USB Videocontroller Gameplay Mapping (Sony PlayStation Mini 054c / Standard Gamepads):**
   - **`Button 0` (Cross / B0):** Main Cannon (Forward shell)
   - **`Button 1` (Circle / B1):** 🚀 **Self-Guided Homing Missile** (Tracks hostile tank target with animated rocket smoke exhaust)
   - **`Button 2` (Square / B2):** ↗ **Two Diagonal Cannons** (+45° and -45° flanking shells, non-front facing)
   - **`Button 3` (Triangle / B3):** ↔ **Two-Sided Cannons** (+90° and -90° broadside shells, non-front facing)
   - **`Button 9` (START):** Start Match / Pause / Resume
   - **`Button 8` (SELECT):** Open / Close Setup Menu
   - **D-Pad / Left Analog Stick:** Steer & Drive

3. **Automated Computer Contestant (3 Difficulty Levels):**
   - **Recruit (Easy):** Errant wandering, slow turns, inaccurate quadrant shooting.
   - **Veteran (Medium):** Continuous tracking, predictive lead aiming, occasional guided missile strikes, and obstacle avoidance.
   - **Ace (Hard):** Hostile projectile dodging, rapid predictive calculation, side-cannon flanking attacks, wall-ricochet banking shots, and strategic guided missile pursuit.

4. **Keyboard Controls:**
   - `Space`: Main Cannon
   - `1`: Self-Guided Missile
   - `2`: Two Diagonal Cannons (±45°)
   - `3`: Two-Sided Cannons (±90°)
   - `P` or `Esc`: Pause / Resume
   - `M`: Toggle Sound On / Off
   - `R`: Reset Match
   - `W`, `A`, `S`, `D` or `Arrow Keys`: Drive & Rotate

## Running Locally

```bash
cd /home/xmonad/Antigravity/atari-tank
python3 -m http.server 8080
```
Then visit `http://localhost:8080` in your web browser.
