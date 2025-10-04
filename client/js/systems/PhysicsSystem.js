/**
 * PhysicsSystem
 * Handles collision detection and bullet physics
 *
 * Responsibilities:
 * - Bullet movement and collision detection
 * - Bullet-obstacle collision
 * - Bullet-player collision
 * - Penetration mechanics
 * - Explosion mechanics
 */

import * as Constants from '../utils/constants.js';

export class PhysicsSystem {
    constructor(network, particleSystem) {
        this.network = network;
        this.particleSystem = particleSystem;

        // Player reference
        this.myPlayer = null;
        this.playerId = null;

        // Renderer reference for tree damage
        this.terrainRenderer = null;
    }

    /**
     * Set the player reference
     */
    setPlayer(player, playerId) {
        this.myPlayer = player;
        this.playerId = playerId;
    }

    /**
     * Set terrain reference for forest bullet slowdown
     */
    setTerrain(terrain) {
        this.terrain = terrain;
    }

    /**
     * Set terrain renderer for tree damage
     */
    setTerrainRenderer(renderer) {
        this.terrainRenderer = renderer;
    }

    /**
     * Update bullets - movement and collision detection
     * @param {Array} bullets - Array of bullet objects
     * @param {Array} obstacles - Array of obstacle objects
     * @param {Object} players - Object of player objects
     * @returns {Array} Filtered array of active bullets
     */
    updateBullets(bullets, obstacles, players) {
        return bullets.filter(bullet => {
            // Move bullet
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // Check if bullet traveled too far or too slow (cleanup stuck bullets)
            if (!bullet.distanceTraveled) bullet.distanceTraveled = 0;
            const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
            bullet.distanceTraveled += speed;

            // Remove bullets that are stuck (speed too low) or traveled too far
            if (speed < 0.5 || bullet.distanceTraveled > 3000) {
                return false;
            }

            // Check terrain for forest slowdown and tree damage
            if (this.terrain) {
                const tileSize = 50;
                const tileX = Math.floor(bullet.x / tileSize) * tileSize;
                const tileY = Math.floor(bullet.y / tileSize) * tileSize;
                const tile = this.terrain.find(t => t.x === tileX && t.y === tileY);

                if (tile && tile.type === 'forest') {
                    // Mark bullet as damaged by forest
                    bullet.damagedByForest = true;

                    // Damage tree cover (5 damage per bullet hit)
                    if (this.terrainRenderer) {
                        this.terrainRenderer.damageTreeCover(bullet.x, bullet.y, 5);
                    }

                    // Reduce bullet speed by 15% per frame when in forest
                    bullet.vx *= 0.85;
                    bullet.vy *= 0.85;
                } else if (bullet.damagedByForest) {
                    // Bullet exited forest - apply falloff (further 30% speed reduction)
                    bullet.vx *= 0.7;
                    bullet.vy *= 0.7;
                    bullet.damagedByForest = false; // Only apply falloff once
                }
            }

            // Check obstacle collision
            for (const obs of obstacles) {
                if (bullet.x >= obs.x && bullet.x <= obs.x + obs.width &&
                    bullet.y >= obs.y && bullet.y <= obs.y + obs.height) {

                    // Check if bullet has penetration (sniper)
                    if (bullet.penetration && bullet.penetration > 0) {
                        if (!bullet.penetrationCount) bullet.penetrationCount = 0;
                        if (!bullet.hitBlocks) bullet.hitBlocks = new Set();

                        if (!bullet.hitBlocks.has(obs.id)) {
                            bullet.hitBlocks.add(obs.id);
                            bullet.penetrationCount++;

                            // Send damage
                            if (bullet.playerId === this.playerId) {
                                this.network.send('obstacleHit', {
                                    obstacleId: obs.id,
                                    damage: bullet.damage
                                });
                            }

                            // Create penetration particles
                            for (let i = 0; i < 2; i++) {
                                this.particleSystem.createParticle({
                                    x: bullet.x,
                                    y: bullet.y,
                                    vx: (Math.random() - 0.5) * 4,
                                    vy: (Math.random() - 0.5) * 4,
                                    size: 2 + Math.random() * 2,
                                    life: 1.0,
                                    color: '#9c27b0'
                                });
                            }

                            // Stop bullet if penetration limit reached
                            if (bullet.penetrationCount >= bullet.penetration) {
                                bullet.hit = true;
                                break;
                            }
                        }
                        continue; // Continue bullet flight
                    }

                    // Handle rocket explosion
                    if (bullet.explosive && bullet.playerId === this.playerId && !bullet.hitSent) {
                        const explosionRadius = bullet.explosionRadius || 150;
                        this.createExplosion(bullet.x, bullet.y, explosionRadius, 500, 100, obstacles, players);
                        bullet.hitSent = true;
                    } else if (bullet.playerId === this.playerId && !bullet.hitSent) {
                        // Normal bullet damage
                        this.network.send('obstacleHit', {
                            obstacleId: obs.id,
                            damage: bullet.damage
                        });
                        bullet.hitSent = true;

                        // Create debris particles
                        for (let i = 0; i < 3; i++) {
                            this.particleSystem.createParticle({
                                x: bullet.x,
                                y: bullet.y,
                                vx: (Math.random() - 0.5) * 8,
                                vy: (Math.random() - 0.5) * 8,
                                size: 3 + Math.random() * 3,
                                life: 1.0,
                                color: '#00ffff'
                            });
                        }
                    }

                    bullet.hit = true;
                    break;
                }
            }

            // Check if bullet hit any player (ONLY FOR MY BULLETS)
            if (bullet.playerId === this.playerId && !bullet.hit) {
                Object.values(players).forEach(player => {
                    if (player.id !== this.playerId && !bullet.hit) {
                        // Skip if invulnerable
                        if (player.invulnerable && Date.now() < player.invulnerableUntil) {
                            return;
                        }

                        const dx = bullet.x - player.x;
                        const dy = bullet.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < Constants.PLAYER_SIZE + bullet.size) {
                            // Hit! Check if explosive
                            if (bullet.explosive) {
                                const explosionRadius = bullet.explosionRadius || 150;
                                this.createExplosion(bullet.x, bullet.y, explosionRadius, 500, 100, obstacles, players);
                            } else {
                                // Normal bullet damage
                                this.network.send('bulletHit', {
                                    bulletId: bullet.id,
                                    targetId: player.id,
                                    damage: bullet.damage
                                });
                            }

                            bullet.hit = true;
                        }
                    }
                });
            }

            // Keep bullet if not hit and within map bounds
            return !bullet.hit &&
                   bullet.x >= 0 && bullet.x <= Constants.MAP_WIDTH &&
                   bullet.y >= 0 && bullet.y <= Constants.MAP_HEIGHT;
        });
    }

    /**
     * Create explosion effect and damage
     */
    createExplosion(x, y, radius, wallDamage, playerDamage, obstacles, players) {
        // Damage all obstacles in radius
        obstacles.forEach(obs => {
            const centerX = obs.x + obs.width / 2;
            const centerY = obs.y + obs.height / 2;
            const dx = x - centerX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                const damageFalloff = 1 - (dist / radius);
                const damage = Math.floor(wallDamage * damageFalloff);

                this.network.send('obstacleHit', {
                    obstacleId: obs.id,
                    damage: damage
                });
            }
        });

        // Damage all players in radius (including self!)
        Object.values(players).forEach(player => {
            const dx = x - player.x;
            const dy = y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < radius) {
                const damageFalloff = 1 - (dist / radius);
                const damage = Math.floor(playerDamage * damageFalloff);

                this.network.send('bulletHit', {
                    bulletId: 'explosion_' + Date.now() + '_' + Math.random(),
                    targetId: player.id,
                    damage: damage
                });
            }
        });

        // Create explosion particles
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i;
            this.particleSystem.createParticle({
                x: x,
                y: y,
                vx: Math.cos(angle) * (8 + Math.random() * 8),
                vy: Math.sin(angle) * (8 + Math.random() * 8),
                size: 5 + Math.random() * 8,
                life: 1.0,
                color: i % 3 === 0 ? '#ff6600' : '#ffaa00'
            });
        }
    }

    /**
     * Check collision between circle and rectangle
     */
    checkCircleRectCollision(circleX, circleY, circleRadius, rectX, rectY, rectWidth, rectHeight) {
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        const distX = circleX - closestX;
        const distY = circleY - closestY;
        return distX * distX + distY * distY < circleRadius * circleRadius;
    }

    /**
     * Check collision between two circles
     */
    checkCircleCircleCollision(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < r1 + r2;
    }
}
