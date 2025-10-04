// Player Renderer Module
// Extracted from shooter.html as part of Phase 2 refactoring

import * as Constants from '../utils/constants.js';

/**
 * Renders players, weapons, abilities, bullets, particles, and pickups
 */
export class PlayerRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Render pickups (health, armor, weapons, abilities)
     * @param {Array} pickups - Array of pickup objects
     */
    renderPickups(pickups) {
        pickups.forEach(pickup => {
            const glowSize = 30 + Math.sin(Date.now() / 200) * 5;

            if (pickup.type === 'health') {
                this.ctx.fillStyle = '#00ff00';
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = '#00ff00';
                this.ctx.beginPath();
                this.ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;

                // Draw cross
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(pickup.x - 7, pickup.y);
                this.ctx.lineTo(pickup.x + 7, pickup.y);
                this.ctx.moveTo(pickup.x, pickup.y - 7);
                this.ctx.lineTo(pickup.x, pickup.y + 7);
                this.ctx.stroke();
            } else if (pickup.type === 'armor') {
                this.ctx.fillStyle = '#00aaff';
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = '#00aaff';
                this.ctx.beginPath();
                this.ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;

                // Draw shield
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(pickup.x, pickup.y - 10);
                this.ctx.lineTo(pickup.x - 8, pickup.y - 5);
                this.ctx.lineTo(pickup.x - 8, pickup.y + 5);
                this.ctx.lineTo(pickup.x, pickup.y + 10);
                this.ctx.lineTo(pickup.x + 8, pickup.y + 5);
                this.ctx.lineTo(pickup.x + 8, pickup.y - 5);
                this.ctx.closePath();
                this.ctx.stroke();
            } else if (pickup.type.startsWith('weapon_')) {
                const weaponType = pickup.type.replace('weapon_', '');
                const weaponData = Constants.WEAPONS[weaponType];
                this.ctx.fillStyle = weaponData.color;
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = weaponData.color;
                this.ctx.beginPath();
                this.ctx.arc(pickup.x, pickup.y, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;

                // Draw gun icon
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 3;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(pickup.x - 8, pickup.y);
                this.ctx.lineTo(pickup.x + 8, pickup.y);
                this.ctx.stroke();
            } else if (pickup.type.startsWith('ability_')) {
                // Draw ability pickup as spinning icon
                const abilityType = pickup.type.replace('ability_', '');
                this.ctx.fillStyle = '#00ffff';
                this.ctx.shadowBlur = 25;
                this.ctx.shadowColor = '#00ffff';

                this.ctx.save();
                this.ctx.translate(pickup.x, pickup.y);
                this.ctx.rotate(Date.now() / 500);

                if (abilityType === 'bladeswirl') {
                    // Draw 4 small blades
                    for (let i = 0; i < 4; i++) {
                        const angle = (Math.PI * 2 / 4) * i;
                        const x = Math.cos(angle) * 12;
                        const y = Math.sin(angle) * 12;
                        this.ctx.beginPath();
                        this.ctx.moveTo(x - 8, y - 3);
                        this.ctx.lineTo(x + 8, y);
                        this.ctx.lineTo(x - 8, y + 3);
                        this.ctx.closePath();
                        this.ctx.fill();
                    }
                }
                this.ctx.shadowBlur = 0;
                this.ctx.restore();
            }
        });
    }

    /**
     * Render particles (debris, explosions, etc.)
     * @param {Array} particles - Array of particle objects
     */
    renderParticles(particles) {
        particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = particle.color;

            if (particle.isVoxel) {
                // Draw as square voxel chunk
                this.ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
            } else {
                // Draw as circle
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.shadowBlur = 0;
            this.ctx.globalAlpha = 1.0;
        });
    }

    /**
     * Render bullets
     * @param {Array} bullets - Array of bullet objects
     */
    renderBullets(bullets) {
        bullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.color || '#ffeb3b';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = bullet.color || '#ffeb3b';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, bullet.size || 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }

    /**
     * Render all players
     * @param {Object} players - Players object keyed by player ID
     * @param {string} playerId - Current player's ID
     * @param {string} currentTool - Current tool equipped ('hammer', 'repair', or weapon)
     * @param {number} toolSwingTime - Timestamp of tool swing start
     * @param {number} toolSwingDuration - Duration of tool swing animation
     */
    renderPlayers(players, playerId, currentTool, toolSwingTime, toolSwingDuration) {
        Object.values(players).forEach(player => {
            const isMe = player.id === playerId;

            // Don't draw dead players
            if (player.health <= 0) return;

            // Check if invulnerable and should flash
            const isInvulnerable = player.invulnerable && Date.now() < player.invulnerableUntil;
            const flashOn = isInvulnerable ? Math.floor(Date.now() / 100) % 2 === 0 : true;

            if (!flashOn) return; // Skip drawing if flashing off

            // Shield circle (if armor > 0)
            if (player.armor > 0) {
                const shieldRadius = Constants.PLAYER_SIZE + 8;
                const shieldPercent = player.armor / (player.maxArmor || 100);

                this.ctx.strokeStyle = '#00aaff';
                this.ctx.lineWidth = 3;
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#00aaff';
                this.ctx.globalAlpha = 0.6 + (shieldPercent * 0.4);
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, shieldRadius, 0, Math.PI * 2 * shieldPercent);
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
                this.ctx.shadowBlur = 0;
            }

            // Draw top-down person
            const color = isInvulnerable ? '#ffffff' : (player.color || '#4ecdc4');
            this.ctx.shadowBlur = isMe ? 20 : 10;
            this.ctx.shadowColor = isInvulnerable ? '#ffffff' : (player.color || '#4ecdc4');

            // Body (torso)
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.ellipse(player.x, player.y + 2, 12, 16, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Head
            this.ctx.beginPath();
            this.ctx.arc(player.x, player.y - 12, 8, 0, Math.PI * 2);
            this.ctx.fill();

            // Arms (pointing in aim direction)
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';

            // Left arm
            this.ctx.beginPath();
            this.ctx.moveTo(player.x - 8, player.y);
            this.ctx.lineTo(player.x + Math.cos(player.angle - 0.3) * 18, player.y + Math.sin(player.angle - 0.3) * 18);
            this.ctx.stroke();

            // Right arm
            this.ctx.beginPath();
            this.ctx.moveTo(player.x + 8, player.y);
            this.ctx.lineTo(player.x + Math.cos(player.angle + 0.3) * 18, player.y + Math.sin(player.angle + 0.3) * 18);
            this.ctx.stroke();

            // Draw tool/weapon based on current tool
            if (isMe && currentTool === 'hammer') {
                this.renderHammer(player, toolSwingTime, toolSwingDuration);
            } else if (isMe && currentTool === 'repair') {
                this.renderWrench(player, toolSwingTime, toolSwingDuration);
            } else {
                this.renderGun(player);
            }

            // Legs
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 5;

            // Left leg
            this.ctx.beginPath();
            this.ctx.moveTo(player.x - 4, player.y + 12);
            this.ctx.lineTo(player.x - 6, player.y + 22);
            this.ctx.stroke();

            // Right leg
            this.ctx.beginPath();
            this.ctx.moveTo(player.x + 4, player.y + 12);
            this.ctx.lineTo(player.x + 6, player.y + 22);
            this.ctx.stroke();

            this.ctx.shadowBlur = 0;

            // Name
            this.ctx.fillStyle = isMe ? '#00ff88' : 'white';
            this.ctx.font = isMe ? 'bold 14px Arial' : '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name || 'Player', player.x, player.y - 30);

            // Health bar
            if (player.health !== undefined) {
                const barWidth = 40;
                const barHeight = 5;
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(player.x - barWidth/2, player.y + 28, barWidth, barHeight);
                this.ctx.fillStyle = '#00ff00';
                this.ctx.fillRect(player.x - barWidth/2, player.y + 28, (player.health / player.maxHealth) * barWidth, barHeight);
            }
        });
    }

    /**
     * Render hammer/pickaxe tool
     * @param {Object} player - Player object
     * @param {number} toolSwingTime - Timestamp of tool swing start
     * @param {number} toolSwingDuration - Duration of tool swing animation
     */
    renderHammer(player, toolSwingTime, toolSwingDuration) {
        // Pickaxe animation
        const swingProgress = toolSwingTime > 0 ? (Date.now() - toolSwingTime) / toolSwingDuration : 0;
        const swingAngle = swingProgress < 1 ? Math.sin(swingProgress * Math.PI) * 0.8 : 0;

        const pickAngle = player.angle + swingAngle;
        const handleLen = 25;
        const pickLen = 15;

        // Handle
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(player.x + Math.cos(player.angle) * 8, player.y + Math.sin(player.angle) * 8);
        this.ctx.lineTo(player.x + Math.cos(pickAngle) * handleLen, player.y + Math.sin(pickAngle) * handleLen);
        this.ctx.stroke();

        // Pickaxe head
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';
        const headX = player.x + Math.cos(pickAngle) * handleLen;
        const headY = player.y + Math.sin(pickAngle) * handleLen;
        this.ctx.beginPath();
        this.ctx.moveTo(headX + Math.cos(pickAngle + Math.PI/2) * pickLen, headY + Math.sin(pickAngle + Math.PI/2) * pickLen);
        this.ctx.lineTo(headX + Math.cos(pickAngle - Math.PI/2) * pickLen, headY + Math.sin(pickAngle - Math.PI/2) * pickLen);
        this.ctx.stroke();
    }

    /**
     * Render wrench/repair tool
     * @param {Object} player - Player object
     * @param {number} toolSwingTime - Timestamp of tool swing start
     * @param {number} toolSwingDuration - Duration of tool swing animation
     */
    renderWrench(player, toolSwingTime, toolSwingDuration) {
        // Wrench animation
        const swingProgress = toolSwingTime > 0 ? (Date.now() - toolSwingTime) / toolSwingDuration : 0;
        const swingAngle = swingProgress < 1 ? Math.sin(swingProgress * Math.PI) * 0.5 : 0;

        const wrenchAngle = player.angle + swingAngle;
        const wrenchLen = 22;

        // Wrench handle
        this.ctx.strokeStyle = '#888888';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(player.x + Math.cos(player.angle) * 8, player.y + Math.sin(player.angle) * 8);
        this.ctx.lineTo(player.x + Math.cos(wrenchAngle) * wrenchLen, player.y + Math.sin(wrenchAngle) * wrenchLen);
        this.ctx.stroke();

        // Wrench head
        this.ctx.fillStyle = '#666666';
        const headX = player.x + Math.cos(wrenchAngle) * wrenchLen;
        const headY = player.y + Math.sin(wrenchAngle) * wrenchLen;
        this.ctx.beginPath();
        this.ctx.arc(headX, headY, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Render gun/weapon
     * @param {Object} player - Player object
     */
    renderGun(player) {
        // Gun (in hands)
        this.ctx.strokeStyle = '#333333';
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(player.x + Math.cos(player.angle) * 10, player.y + Math.sin(player.angle) * 10);
        this.ctx.lineTo(player.x + Math.cos(player.angle) * 28, player.y + Math.sin(player.angle) * 28);
        this.ctx.stroke();
    }

    /**
     * Render blade swirl ability
     * @param {Array} blades - Array of blade objects
     * @param {number} bladeAngle - Current blade rotation angle
     * @param {Object} myPlayer - Current player object
     */
    renderBladeSwirlAbility(blades, bladeAngle, myPlayer) {
        if (!myPlayer) return;

        blades.forEach((blade, index) => {
            const currentAngle = bladeAngle + blade.angle;
            const bladeX = myPlayer.x + Math.cos(currentAngle) * blade.radius;
            const bladeY = myPlayer.y + Math.sin(currentAngle) * blade.radius;

            // Draw blade
            this.ctx.save();
            this.ctx.translate(bladeX, bladeY);
            this.ctx.rotate(currentAngle);

            // Blade shape (glowing cyan blade)
            this.ctx.fillStyle = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00ffff';

            this.ctx.beginPath();
            this.ctx.moveTo(-15, -5);
            this.ctx.lineTo(15, 0);
            this.ctx.lineTo(-15, 5);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        });
    }
}
