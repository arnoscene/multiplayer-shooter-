/**
 * PlayerController System
 * Handles player movement, input, and local state management
 *
 * Responsibilities:
 * - Keyboard/mouse input handling
 * - Mobile joystick controls
 * - Player position updates
 * - Movement validation
 * - Camera calculations
 * - Stamina management
 */

import * as Constants from '../utils/constants.js';

export class PlayerController {
    constructor(canvas, network) {
        this.canvas = canvas;
        this.network = network;

        // Input state
        this.keys = {};
        this.mouse = { x: canvas.width / 2, y: canvas.height / 2 };

        // Mobile controls state
        this.isMobile = false;
        this.joystickActive = false;
        this.joystickStartX = 0;
        this.joystickStartY = 0;
        this.joystickDeltaX = 0;
        this.joystickDeltaY = 0;
        this.joystickTouchId = null;
        this.aimJoystickActive = false;
        this.aimJoystickStartX = 0;
        this.aimJoystickStartY = 0;
        this.aimJoystickDeltaX = 0;
        this.aimJoystickDeltaY = 0;
        this.aimJoystickTouchId = null;
        this.mobileAimX = 0;
        this.mobileAimY = 0;

        // Camera
        this.cameraX = 0;
        this.cameraY = 0;

        // Player reference
        this.myPlayer = null;
        this.playerId = null;

        // Terrain speed modifier
        this.currentSpeedModifier = 1.0;

        // Network update throttling
        this.lastUpdate = 0;
        this.UPDATE_RATE = 100; // Send updates every 100ms

        // Detect mobile
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.isMobile = true;
        }

        // Setup input listeners
        this.setupInputListeners();
    }

    /**
     * Setup keyboard, mouse, and touch event listeners
     */
    setupInputListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Clear keys on window blur
        window.addEventListener('blur', () => {
            Object.keys(this.keys).forEach(key => this.keys[key] = false);
        });

        // Mouse
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX + this.cameraX;
            this.mouse.y = e.clientY + this.cameraY;
        });

        // Mobile controls
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    /**
     * Setup mobile joystick controls
     */
    setupMobileControls() {
        const joystickEl = document.getElementById('joystick');
        const joystickStick = document.getElementById('joystickStick');
        const aimJoystickEl = document.getElementById('aimJoystick');
        const aimJoystickStick = document.getElementById('aimJoystickStick');

        // Movement joystick
        joystickEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = joystickEl.getBoundingClientRect();
            this.joystickActive = true;
            this.joystickTouchId = touch.identifier;
            this.joystickStartX = rect.left + rect.width / 2;
            this.joystickStartY = rect.top + rect.height / 2;
        });

        window.addEventListener('touchmove', (e) => {
            // Handle movement joystick
            if (this.joystickActive && this.joystickTouchId !== null) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === this.joystickTouchId) {
                        const touch = e.touches[i];
                        const deltaX = touch.clientX - this.joystickStartX;
                        const deltaY = touch.clientY - this.joystickStartY;

                        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        const maxDistance = 35;

                        if (distance > maxDistance) {
                            this.joystickDeltaX = (deltaX / distance) * maxDistance;
                            this.joystickDeltaY = (deltaY / distance) * maxDistance;
                        } else {
                            this.joystickDeltaX = deltaX;
                            this.joystickDeltaY = deltaY;
                        }

                        joystickStick.style.transform = `translate(calc(-50% + ${this.joystickDeltaX}px), calc(-50% + ${this.joystickDeltaY}px))`;
                        break;
                    }
                }
            }

            // Handle aim joystick
            if (this.aimJoystickActive && this.aimJoystickTouchId !== null) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === this.aimJoystickTouchId) {
                        const touch = e.touches[i];
                        const deltaX = touch.clientX - this.aimJoystickStartX;
                        const deltaY = touch.clientY - this.aimJoystickStartY;

                        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                        const maxDistance = 35;

                        if (distance > maxDistance) {
                            this.aimJoystickDeltaX = (deltaX / distance) * maxDistance;
                            this.aimJoystickDeltaY = (deltaY / distance) * maxDistance;
                        } else {
                            this.aimJoystickDeltaX = deltaX;
                            this.aimJoystickDeltaY = deltaY;
                        }

                        aimJoystickStick.style.transform = `translate(calc(-50% + ${this.aimJoystickDeltaX}px), calc(-50% + ${this.aimJoystickDeltaY}px))`;
                        break;
                    }
                }
            }
        });

        window.addEventListener('touchend', (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                if (touch.identifier === this.joystickTouchId) {
                    this.joystickActive = false;
                    this.joystickTouchId = null;
                    this.joystickDeltaX = 0;
                    this.joystickDeltaY = 0;
                    joystickStick.style.transform = 'translate(-50%, -50%)';
                }

                if (touch.identifier === this.aimJoystickTouchId) {
                    this.aimJoystickActive = false;
                    this.aimJoystickTouchId = null;
                    this.aimJoystickDeltaX = 0;
                    this.aimJoystickDeltaY = 0;
                    aimJoystickStick.style.transform = 'translate(-50%, -50%)';
                }
            }
        });

        // Aim joystick
        aimJoystickEl.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            const rect = aimJoystickEl.getBoundingClientRect();
            this.aimJoystickActive = true;
            this.aimJoystickTouchId = touch.identifier;
            this.aimJoystickStartX = rect.left + rect.width / 2;
            this.aimJoystickStartY = rect.top + rect.height / 2;
        });
    }

    /**
     * Set the player reference
     */
    setPlayer(player, playerId) {
        this.myPlayer = player;
        this.playerId = playerId;
    }

    /**
     * Update player movement and position
     * @param {Array} terrain - Terrain tiles for speed modifiers
     * @param {Array} obstacles - Obstacles for collision detection
     * @returns {boolean} Whether player moved this frame
     */
    update(terrain, obstacles) {
        if (!this.myPlayer || this.myPlayer.health <= 0) {
            return false;
        }

        // Get speed modifier from current terrain
        this.currentSpeedModifier = 1.0;
        for (const tile of terrain) {
            if (this.myPlayer.x >= tile.x && this.myPlayer.x < tile.x + tile.size &&
                this.myPlayer.y >= tile.y && this.myPlayer.y < tile.y + tile.size) {
                this.currentSpeedModifier = tile.speedModifier;
                break;
            }
        }

        let dx = 0, dy = 0;

        // Check if sprinting
        const isSprinting = this.keys['shift'] && this.myPlayer.stamina > 0;
        const sprintMultiplier = isSprinting ? 1.8 : 1.0;

        // Stamina drain/regen
        const isMoving = this.keys['w'] || this.keys['s'] || this.keys['a'] || this.keys['d'] ||
                        this.keys['arrowup'] || this.keys['arrowdown'] || this.keys['arrowleft'] || this.keys['arrowright'] ||
                        (this.isMobile && this.joystickActive);

        if (isSprinting && isMoving) {
            this.myPlayer.stamina = Math.max(0, this.myPlayer.stamina - 0.5);
        } else {
            this.myPlayer.stamina = Math.min(this.myPlayer.maxStamina, this.myPlayer.stamina + 0.2);
        }

        // Keyboard controls
        if (this.keys['w'] || this.keys['arrowup']) dy -= Constants.MOVE_SPEED * this.currentSpeedModifier * sprintMultiplier;
        if (this.keys['s'] || this.keys['arrowdown']) dy += Constants.MOVE_SPEED * this.currentSpeedModifier * sprintMultiplier;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= Constants.MOVE_SPEED * this.currentSpeedModifier * sprintMultiplier;
        if (this.keys['d'] || this.keys['arrowright']) dx += Constants.MOVE_SPEED * this.currentSpeedModifier * sprintMultiplier;

        // Mobile joystick controls
        if (this.isMobile && this.joystickActive) {
            dx = (this.joystickDeltaX / 35) * Constants.MOVE_SPEED * this.currentSpeedModifier * sprintMultiplier;
            dy = (this.joystickDeltaY / 35) * Constants.MOVE_SPEED * this.currentSpeedModifier * sprintMultiplier;
        }

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const factor = 1 / Math.sqrt(2);
            dx *= factor;
            dy *= factor;
        }

        let newX = this.myPlayer.x + dx;
        let newY = this.myPlayer.y + dy;

        // Clamp to map bounds
        newX = Math.max(Constants.PLAYER_SIZE, Math.min(Constants.MAP_WIDTH - Constants.PLAYER_SIZE, newX));
        newY = Math.max(Constants.PLAYER_SIZE, Math.min(Constants.MAP_HEIGHT - Constants.PLAYER_SIZE, newY));

        // Check collision and apply movement with sliding
        const moved = this.applyMovement(newX, newY, obstacles);

        // Update angle
        this.updatePlayerAngle();

        // Send network update if moved
        if (moved) {
            this.sendNetworkUpdate();
        }

        return moved;
    }

    /**
     * Apply movement with collision detection and sliding
     */
    applyMovement(newX, newY, obstacles) {
        const checkCollision = (x, y) => {
            for (const obs of obstacles) {
                // Skip collision with open doors and debris
                if ((obs.isDoor && obs.isOpen) || obs.isWall === false || obs.blockType === 'debris') {
                    continue;
                }

                const closestX = Math.max(obs.x, Math.min(x, obs.x + obs.width));
                const closestY = Math.max(obs.y, Math.min(y, obs.y + obs.height));
                const distX = x - closestX;
                const distY = y - closestY;
                if (distX * distX + distY * distY < Constants.PLAYER_SIZE * Constants.PLAYER_SIZE) {
                    return true;
                }
            }
            return false;
        };

        let moved = false;
        const oldX = this.myPlayer.x;
        const oldY = this.myPlayer.y;

        // Try full movement
        if (!checkCollision(newX, newY)) {
            this.myPlayer.x = newX;
            this.myPlayer.y = newY;
            moved = true;
        } else {
            // Try sliding on X axis
            if (!checkCollision(newX, this.myPlayer.y)) {
                this.myPlayer.x = newX;
                moved = true;
            }
            // Try sliding on Y axis
            if (!checkCollision(this.myPlayer.x, newY)) {
                this.myPlayer.y = newY;
                moved = true;
            }
        }

        return moved || (this.myPlayer.x !== oldX || this.myPlayer.y !== oldY);
    }

    /**
     * Update player's aim angle
     */
    updatePlayerAngle() {
        let aimX = this.mouse.x;
        let aimY = this.mouse.y;

        // Use aim joystick if active on mobile
        if (this.isMobile && this.aimJoystickActive && (this.aimJoystickDeltaX !== 0 || this.aimJoystickDeltaY !== 0)) {
            this.myPlayer.angle = Math.atan2(this.aimJoystickDeltaY, this.aimJoystickDeltaX);
        } else if (this.isMobile && this.mobileAimX !== 0 && this.mobileAimY !== 0) {
            aimX = this.mobileAimX;
            aimY = this.mobileAimY;
            const angleDx = aimX - this.myPlayer.x;
            const angleDy = aimY - this.myPlayer.y;
            this.myPlayer.angle = Math.atan2(angleDy, angleDx);
        } else {
            const angleDx = aimX - this.myPlayer.x;
            const angleDy = aimY - this.myPlayer.y;
            this.myPlayer.angle = Math.atan2(angleDy, angleDx);
        }
    }

    /**
     * Send network update for player position (throttled)
     */
    sendNetworkUpdate() {
        const now = Date.now();
        if (now - this.lastUpdate <= this.UPDATE_RATE) {
            return;
        }

        const roundedX = Math.round(this.myPlayer.x);
        const roundedY = Math.round(this.myPlayer.y);
        const roundedAngle = Math.round(this.myPlayer.angle * 100) / 100;

        // Only send if changed significantly
        if (!this.myPlayer.lastSent ||
            Math.abs(roundedX - this.myPlayer.lastSent.x) > 1 ||
            Math.abs(roundedY - this.myPlayer.lastSent.y) > 1 ||
            Math.abs(roundedAngle - this.myPlayer.lastSent.angle) > 0.05) {

            this.network.send('move', {
                x: roundedX,
                y: roundedY,
                angle: roundedAngle
            });

            this.myPlayer.lastSent = { x: roundedX, y: roundedY, angle: roundedAngle };
        }

        this.lastUpdate = now;
    }

    /**
     * Update camera to follow player
     */
    updateCamera() {
        if (!this.myPlayer) return;

        this.cameraX = this.myPlayer.x - this.canvas.width / 2;
        this.cameraY = this.myPlayer.y - this.canvas.height / 2;

        // Clamp camera to map bounds
        this.cameraX = Math.max(0, Math.min(Constants.MAP_WIDTH - this.canvas.width, this.cameraX));
        this.cameraY = Math.max(0, Math.min(Constants.MAP_HEIGHT - this.canvas.height, this.cameraY));
    }

    /**
     * Get camera position
     */
    getCamera() {
        return { x: this.cameraX, y: this.cameraY };
    }

    /**
     * Check if a key is pressed
     */
    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] || false;
    }

    /**
     * Get mouse position in world coordinates
     */
    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    /**
     * Check if player is using aim joystick (for auto-fire)
     */
    isAimJoystickActive() {
        return this.isMobile && this.aimJoystickActive &&
               (this.aimJoystickDeltaX !== 0 || this.aimJoystickDeltaY !== 0);
    }
}
