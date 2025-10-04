/**
 * AbilitySystem
 * Handles ability management and activation
 *
 * Responsibilities:
 * - Ability activation (E/Q keys)
 * - Cooldown tracking
 * - Blade swirl logic
 * - Active ability state
 * - Ability pickup/drop
 */

import * as Constants from '../utils/constants.js';

export class AbilitySystem {
    constructor(network) {
        this.network = network;

        // Ability state
        this.currentAbility = null; // 'bladeswirl', 'shield', 'grapple'
        this.abilityActive = false;

        // Blade swirl state
        this.blades = [];
        this.bladeAngle = 0;

        // Player reference
        this.myPlayer = null;
        this.playerId = null;

        // Setup input listeners
        this.setupInputListeners();
    }

    /**
     * Setup ability activation listeners
     */
    setupInputListeners() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // E key - activate ability
            if (key === 'e') {
                this.handleEKey();
            }
            // Q key - drop ability
            else if (key === 'q' && this.currentAbility) {
                this.dropAbility();
            }
        });
    }

    /**
     * Handle E key press (ability activation or building interaction)
     */
    handleEKey() {
        // This is called from shooter.html for building/door interaction
        // Only activate ability if no building/door nearby
        if (this.currentAbility && !this.abilityActive) {
            this.activateAbility();
        }
    }

    /**
     * Set the player reference
     */
    setPlayer(player, playerId) {
        this.myPlayer = player;
        this.playerId = playerId;
    }

    /**
     * Activate current ability
     */
    activateAbility() {
        if (!this.currentAbility || this.abilityActive) return;

        if (this.currentAbility === 'bladeswirl') {
            this.abilityActive = true;

            // Create 4 spinning blades
            this.blades = [];
            for (let i = 0; i < 4; i++) {
                this.blades.push({
                    angle: (Math.PI * 2 / 4) * i,
                    radius: 60,
                    lastHit: {},
                    lastObstacleHit: {},
                    totalHits: 0
                });
            }

            // Update UI
            document.getElementById('abilityName').textContent = 'Blade Swirl (ACTIVE)';
            document.getElementById('abilityName').style.color = '#ff00ff';

            // Deactivate after 10 seconds
            setTimeout(() => {
                this.deactivateAbility();
            }, 10000);
        }
    }

    /**
     * Deactivate current ability
     */
    deactivateAbility() {
        this.abilityActive = false;
        this.blades = [];
        this.currentAbility = null;
        document.getElementById('abilityName').textContent = 'None';
        document.getElementById('abilityName').style.color = '#00ffff';
    }

    /**
     * Drop ability as pickup
     */
    dropAbility() {
        if (!this.myPlayer || !this.currentAbility) return;

        const dropData = {
            id: 'pickup_dropped_' + Date.now(),
            type: 'ability_' + this.currentAbility,
            x: this.myPlayer.x,
            y: this.myPlayer.y
        };

        // Send to server
        this.network.send('dropAbility', {
            pickup: dropData
        });

        this.currentAbility = null;
        this.abilityActive = false;
        this.blades = [];
        document.getElementById('abilityName').textContent = 'None';
        document.getElementById('abilityName').style.color = '#00ffff';
    }

    /**
     * Pick up an ability
     */
    pickupAbility(abilityType) {
        if (this.currentAbility) return false; // Already have an ability

        this.currentAbility = abilityType;

        const abilityNames = {
            bladeswirl: 'Blade Swirl',
            shield: 'Shield',
            grapple: 'Grapple Hook'
        };

        document.getElementById('abilityName').textContent = abilityNames[abilityType] || abilityType;
        document.getElementById('abilityName').style.color = '#00ffff';

        return true;
    }

    /**
     * Update blade swirl ability (collision detection)
     * @returns {Array} Array of damage events to send to server
     */
    update(obstacles, players) {
        if (!this.abilityActive || this.currentAbility !== 'bladeswirl' || !this.myPlayer) {
            return [];
        }

        this.bladeAngle += 0.1; // Spin speed

        const damageEvents = [];

        this.blades.forEach((blade, index) => {
            const currentAngle = this.bladeAngle + blade.angle;
            const bladeX = this.myPlayer.x + Math.cos(currentAngle) * blade.radius;
            const bladeY = this.myPlayer.y + Math.sin(currentAngle) * blade.radius;

            // Check blade collisions with obstacles
            obstacles.forEach(obs => {
                const centerX = obs.x + obs.width / 2;
                const centerY = obs.y + obs.height / 2;
                const dx = bladeX - centerX;
                const dy = bladeY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < obs.width / 2 + 15) {
                    const now = Date.now();
                    if (!blade.lastObstacleHit[obs.id] || now - blade.lastObstacleHit[obs.id] > 200) {
                        damageEvents.push({
                            type: 'obstacle',
                            obstacleId: obs.id,
                            damage: 20
                        });

                        blade.lastObstacleHit[obs.id] = now;
                        blade.totalHits++;

                        // If blade has hit 3 blocks, deactivate ability early
                        if (blade.totalHits >= 3) {
                            this.deactivateAbility();
                        }
                    }
                }
            });

            // Check blade collisions with other players (with cooldown)
            Object.values(players).forEach(otherPlayer => {
                if (otherPlayer.id !== this.playerId && otherPlayer.health > 0) {
                    const dx = bladeX - otherPlayer.x;
                    const dy = bladeY - otherPlayer.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < Constants.PLAYER_SIZE + 10) {
                        const now = Date.now();
                        if (!blade.lastHit[otherPlayer.id] || now - blade.lastHit[otherPlayer.id] > 500) {
                            damageEvents.push({
                                type: 'player',
                                targetId: otherPlayer.id,
                                damage: 30
                            });
                            blade.lastHit[otherPlayer.id] = now;
                        }
                    }
                }
            });
        });

        // Send damage events to server
        damageEvents.forEach(event => {
            if (event.type === 'obstacle') {
                this.network.send('obstacleHit', {
                    obstacleId: event.obstacleId,
                    damage: event.damage
                });
            } else if (event.type === 'player') {
                this.network.send('bulletHit', {
                    targetId: event.targetId,
                    damage: event.damage
                });
            }
        });

        return damageEvents;
    }

    /**
     * Get current ability
     */
    getCurrentAbility() {
        return this.currentAbility;
    }

    /**
     * Check if ability is active
     */
    isAbilityActive() {
        return this.abilityActive;
    }

    /**
     * Get blades for rendering
     */
    getBlades() {
        return this.blades;
    }

    /**
     * Get blade angle for rendering
     */
    getBladeAngle() {
        return this.bladeAngle;
    }
}
