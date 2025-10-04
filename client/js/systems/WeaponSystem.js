/**
 * WeaponSystem
 * Handles weapon management and firing logic
 *
 * Responsibilities:
 * - Weapon switching (1-4 keys)
 * - Firing logic and cooldowns
 * - Ammo management
 * - Bullet creation
 * - Tool usage (hammer, repair)
 */

import * as Constants from '../utils/constants.js';

export class WeaponSystem {
    constructor(network) {
        this.network = network;

        // Current weapon/tool state
        this.currentWeapon = 'pistol';
        this.currentTool = null; // 'hammer', 'repair', or null
        this.weaponAmmo = {}; // Track ammo for each weapon

        // Firing state
        this.lastShot = 0;

        // Tool animation state
        this.toolSwingTime = 0;
        this.toolSwingDuration = 300; // ms

        // Player reference
        this.myPlayer = null;
        this.playerId = null;

        // Setup input listeners
        this.setupInputListeners();
    }

    /**
     * Setup weapon/tool switching listeners
     */
    setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // Tool/weapon selection
            if (key === '1') {
                this.selectTool(1);
            } else if (key === '2') {
                this.selectTool(2);
            } else if (key === '3') {
                this.selectTool(3);
            }
        });

        // Note: Click handler is in shooter.html because it needs access to
        // mouse position and obstacles array which are not available here
    }

    /**
     * Set the player reference
     */
    setPlayer(player, playerId) {
        this.myPlayer = player;
        this.playerId = playerId;
    }

    /**
     * Select tool/weapon slot
     */
    selectTool(slot) {
        // Remove active class from all slots
        document.getElementById('slot1').classList.remove('active');
        document.getElementById('slot2').classList.remove('active');
        document.getElementById('slot3').classList.remove('active');

        // Add active class to selected slot
        document.getElementById('slot' + slot).classList.add('active');

        // Update current tool
        if (slot === 1) {
            this.currentTool = 'hammer';
            console.log('🔨 Hammer equipped');
        } else if (slot === 2) {
            this.currentTool = null;
            console.log('🔫 Weapon equipped');
        } else if (slot === 3) {
            this.currentTool = 'repair';
            console.log('🔧 Repair tool equipped');
        }
    }

    /**
     * Handle click for shooting or tool usage
     */
    handleClick(e, mouse, obstacles) {
        if (!this.myPlayer || this.myPlayer.health <= 0) return;

        const now = Date.now();

        // Hammer tool - destroy blocks
        if (this.currentTool === 'hammer') {
            return this.useHammer(mouse, obstacles);
        }

        // Repair tool - restore block health
        if (this.currentTool === 'repair') {
            return this.useRepair(obstacles);
        }

        // Otherwise, fire weapon
        return this.fireWeapon(mouse);
    }

    /**
     * Use hammer tool to damage obstacles
     */
    useHammer(mouse, obstacles) {
        // Trigger swing animation
        this.toolSwingTime = Date.now();

        // Find closest block within hammer range from PLAYER (60px range)
        let closestObs = null;
        let closestDist = 60;

        obstacles.forEach(obs => {
            const centerX = obs.x + obs.width / 2;
            const centerY = obs.y + obs.height / 2;
            const dx = this.myPlayer.x - centerX;
            const dy = this.myPlayer.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist) {
                closestObs = obs;
                closestDist = dist;
            }
        });

        if (closestObs) {
            this.network.send('hammerHit', {
                obstacleId: closestObs.id,
                damage: 30
            });
        }
        return true;
    }

    /**
     * Use repair tool to restore block health
     */
    useRepair(obstacles) {
        // Trigger swing animation
        this.toolSwingTime = Date.now();

        // Find closest damaged/debris block within repair range from PLAYER (60px range)
        let closestObs = null;
        let closestDist = 60;

        obstacles.forEach(obs => {
            // Can repair damaged blocks OR debris blocks
            if (obs.health < obs.maxHealth || obs.blockType === 'debris') {
                const centerX = obs.x + obs.width / 2;
                const centerY = obs.y + obs.height / 2;
                const dx = this.myPlayer.x - centerX;
                const dy = this.myPlayer.y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closestObs = obs;
                    closestDist = dist;
                }
            }
        });

        if (closestObs && this.myPlayer.scrap >= 1) {
            this.network.send('repairBlock', {
                obstacleId: closestObs.id,
                repairAmount: 20
            });
            return true;
        } else if (closestObs && this.myPlayer.scrap < 1) {
            console.log('❌ Need 1 scrap to repair');
        }
        return false;
    }

    /**
     * Fire current weapon
     */
    fireWeapon(mouse) {
        const weapon = Constants.WEAPONS[this.currentWeapon];
        const now = Date.now();

        // Check fire rate
        if (now - this.lastShot < weapon.fireRate) return null;

        // Check ammo
        const currentAmmo = this.weaponAmmo[this.currentWeapon] ?? weapon.ammo;
        if (currentAmmo <= 0) {
            // Out of ammo, switch to pistol
            this.currentWeapon = 'pistol';
            return null;
        }

        this.lastShot = now;

        // Calculate angle to mouse
        const dx = mouse.x - this.myPlayer.x;
        const dy = mouse.y - this.myPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return null;

        const baseAngle = Math.atan2(dy, dx);
        const pellets = weapon.pellets || 1;

        // Spawn bullets from gun tip (25px from center)
        const gunTipX = this.myPlayer.x + Math.cos(baseAngle) * 25;
        const gunTipY = this.myPlayer.y + Math.sin(baseAngle) * 25;

        const bullets = [];

        for (let i = 0; i < pellets; i++) {
            const spread = weapon.spread * (Math.random() - 0.5) * 2;
            const angle = baseAngle + spread;

            const bulletId = 'b_' + this.playerId + '_' + Date.now() + '_' + Math.random();
            const vx = Math.cos(angle) * weapon.bulletSpeed;
            const vy = Math.sin(angle) * weapon.bulletSpeed;

            const bullet = {
                id: bulletId,
                x: gunTipX,
                y: gunTipY,
                vx,
                vy,
                playerId: this.playerId,
                damage: weapon.damage,
                size: weapon.bulletSize,
                color: weapon.color,
                explosive: weapon.explosive || false,
                explosionRadius: weapon.explosionRadius,
                penetration: weapon.penetration
            };

            bullets.push(bullet);

            // Send to server
            this.network.send('shoot', {
                bulletId,
                x: gunTipX,
                y: gunTipY,
                vx,
                vy,
                damage: weapon.damage,
                size: weapon.bulletSize,
                color: weapon.color,
                explosive: weapon.explosive || false,
                explosionRadius: weapon.explosionRadius,
                penetration: weapon.penetration
            });
        }

        // Decrease ammo
        if (weapon.ammo !== Infinity) {
            if (this.weaponAmmo[this.currentWeapon] === undefined) {
                this.weaponAmmo[this.currentWeapon] = weapon.ammo;
            }
            this.weaponAmmo[this.currentWeapon]--;
        }

        return bullets;
    }

    /**
     * Auto-fire for mobile (called from game loop when aim joystick active)
     */
    autoFire() {
        if (!this.myPlayer || this.myPlayer.health <= 0) return null;

        const weapon = Constants.WEAPONS[this.currentWeapon];
        const now = Date.now();

        // Check fire rate
        if (now - this.lastShot < weapon.fireRate) return null;

        // Check ammo
        const currentAmmo = this.weaponAmmo[this.currentWeapon] ?? weapon.ammo;
        if (currentAmmo <= 0) {
            // Out of ammo, switch to pistol
            this.currentWeapon = 'pistol';
            return null;
        }

        this.lastShot = now;

        // Shoot in the direction of player angle
        const baseAngle = this.myPlayer.angle;
        const pellets = weapon.pellets || 1;
        const gunTipX = this.myPlayer.x + Math.cos(baseAngle) * 25;
        const gunTipY = this.myPlayer.y + Math.sin(baseAngle) * 25;

        const bullets = [];

        for (let i = 0; i < pellets; i++) {
            const spread = weapon.spread * (Math.random() - 0.5) * 2;
            const angle = baseAngle + spread;

            const bulletId = 'b_' + this.playerId + '_' + Date.now() + '_' + Math.random();
            const vx = Math.cos(angle) * weapon.bulletSpeed;
            const vy = Math.sin(angle) * weapon.bulletSpeed;

            const bullet = {
                id: bulletId,
                x: gunTipX,
                y: gunTipY,
                vx,
                vy,
                playerId: this.playerId,
                damage: weapon.damage,
                size: weapon.bulletSize,
                color: weapon.color,
                explosive: weapon.explosive || false,
                explosionRadius: weapon.explosionRadius,
                penetration: weapon.penetration
            };

            bullets.push(bullet);

            this.network.send('shoot', {
                bulletId,
                x: gunTipX,
                y: gunTipY,
                vx,
                vy,
                damage: weapon.damage,
                size: weapon.bulletSize,
                color: weapon.color,
                explosive: weapon.explosive || false,
                explosionRadius: weapon.explosionRadius,
                penetration: weapon.penetration
            });
        }

        // Decrease ammo
        if (weapon.ammo !== Infinity) {
            if (this.weaponAmmo[this.currentWeapon] === undefined) {
                this.weaponAmmo[this.currentWeapon] = weapon.ammo;
            }
            this.weaponAmmo[this.currentWeapon]--;
        }

        return bullets;
    }

    /**
     * Switch to a specific weapon
     */
    switchWeapon(weaponType) {
        if (Constants.WEAPONS[weaponType]) {
            this.currentWeapon = weaponType;
            this.myPlayer.weapon = weaponType;

            // Initialize ammo if first time picking up
            if (this.weaponAmmo[weaponType] === undefined) {
                this.weaponAmmo[weaponType] = Constants.WEAPONS[weaponType].ammo;
            }
        }
    }

    /**
     * Refill ammo for current weapon
     */
    refillAmmo(weaponType) {
        const weapon = Constants.WEAPONS[weaponType];
        if (weapon && weapon.ammo !== Infinity) {
            this.weaponAmmo[weaponType] = weapon.ammo;
        }
    }

    /**
     * Get current weapon
     */
    getCurrentWeapon() {
        return this.currentWeapon;
    }

    /**
     * Get current tool
     */
    getCurrentTool() {
        return this.currentTool;
    }

    /**
     * Get current ammo for weapon
     */
    getCurrentAmmo() {
        const weapon = Constants.WEAPONS[this.currentWeapon];
        return this.weaponAmmo[this.currentWeapon] ?? weapon.ammo;
    }

    /**
     * Get tool swing animation state
     */
    getToolSwingState() {
        return {
            time: this.toolSwingTime,
            duration: this.toolSwingDuration
        };
    }
}
