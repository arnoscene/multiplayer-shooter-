// Building Renderer Module
// Extracted from shooter.html as part of Phase 2 refactoring

import * as Constants from '../utils/constants.js';

/**
 * Renders buildings, obstacles, doors, and terminals
 */
export class BuildingRenderer {
    constructor(ctx) {
        this.ctx = ctx;
    }

    /**
     * Render all obstacles (building blocks, walls, doors, etc.)
     * @param {Array} obstacles - Array of obstacle objects
     * @param {Object} myPlayer - Current player object (for door interaction prompts)
     */
    renderObstacles(obstacles, myPlayer) {
        obstacles.forEach(obs => {
            // Different colors based on block type
            let color = '#00ffff'; // default cyan

            if (obs.blockType === 'debris') {
                // Debris uses a lighter shade of the original material
                color = Constants.DEBRIS_COLORS[obs.originalType] || Constants.DEBRIS_COLORS.default;
            } else {
                // Use material colors from constants
                color = Constants.MATERIAL_COLORS[obs.blockType] || '#00ffff';

                // Special handling for doors
                if (obs.blockType === 'door') {
                    // Open doors are lighter/translucent
                    color = obs.isOpen ? '#a0826d' : Constants.MATERIAL_COLORS.door;
                }
            }

            this.ctx.fillStyle = color;

            // Debris/rubble is solid but lighter colored
            if (obs.blockType === 'debris') {
                // Just draw as a simple lighter block (no fancy effects)
                this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
            } else {
                // Open doors are semi-transparent
                if (obs.blockType === 'door' && obs.isOpen) {
                    this.ctx.globalAlpha = 0.3;
                }

                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = color;
                this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                this.ctx.shadowBlur = 0;

                // Reset alpha
                this.ctx.globalAlpha = 1.0;
            }

            // Inner outline for depth
            this.ctx.strokeStyle = obs.blockType === 'window' ? '#ffffff' : '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(obs.x + 1, obs.y + 1, obs.width - 2, obs.height - 2);

            // Damage overlay - cracks on damaged blocks
            if (obs.health !== undefined && obs.maxHealth !== undefined && obs.health < obs.maxHealth) {
                this.renderDamageCracks(obs);
                this.renderHealthBar(obs);
            }

            // Draw "E" prompt for nearby doors
            if (obs.blockType === 'door' && myPlayer) {
                const dist = Math.hypot(obs.x + obs.width/2 - myPlayer.x, obs.y + obs.height/2 - myPlayer.y);
                if (dist < 50) {
                    this.ctx.fillStyle = '#00ff00';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(obs.isOpen ? '[E] Close' : '[E] Open', obs.x + obs.width/2, obs.y - 5);
                    this.ctx.textAlign = 'left';
                }
            }
        });
    }

    /**
     * Render damage cracks on obstacles
     * @param {Object} obs - Obstacle object with health properties
     */
    renderDamageCracks(obs) {
        const damagePercent = obs.health / obs.maxHealth;

        // Draw cracks based on damage
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.lineWidth = 1;

        if (damagePercent < 0.75) {
            // Light damage - few cracks
            this.ctx.beginPath();
            this.ctx.moveTo(obs.x + obs.width * 0.3, obs.y);
            this.ctx.lineTo(obs.x + obs.width * 0.3, obs.y + obs.height);
            this.ctx.stroke();
        }
        if (damagePercent < 0.5) {
            // Medium damage - more cracks
            this.ctx.beginPath();
            this.ctx.moveTo(obs.x, obs.y + obs.height * 0.5);
            this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height * 0.5);
            this.ctx.stroke();
        }
        if (damagePercent < 0.25) {
            // Heavy damage - lots of cracks
            this.ctx.beginPath();
            this.ctx.moveTo(obs.x + obs.width * 0.7, obs.y);
            this.ctx.lineTo(obs.x + obs.width * 0.7, obs.y + obs.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(obs.x, obs.y + obs.height * 0.25);
            this.ctx.lineTo(obs.x + obs.width, obs.y + obs.height * 0.75);
            this.ctx.stroke();
        }
    }

    /**
     * Render health bar above obstacle
     * @param {Object} obs - Obstacle object with health properties
     */
    renderHealthBar(obs) {
        const damagePercent = obs.health / obs.maxHealth;
        const barWidth = obs.width;
        const barHeight = 3;
        const barX = obs.x;
        const barY = obs.y - 6;

        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill - color changes based on health
        let healthColor = '#00ff00'; // green
        if (damagePercent < 0.5) healthColor = '#ffff00'; // yellow
        if (damagePercent < 0.25) healthColor = '#ff0000'; // red

        this.ctx.fillStyle = healthColor;
        this.ctx.fillRect(barX, barY, barWidth * damagePercent, barHeight);
    }

    /**
     * Render building computer terminals (for hacking/management)
     * @param {Array} buildings - Array of building objects
     * @param {string} playerId - Current player's ID
     * @param {Object} myPlayer - Current player object (for interaction range)
     */
    renderTerminals(buildings, playerId, myPlayer) {
        buildings.forEach(building => {
            const terminal = building.terminal;
            if (!terminal) return;

            // Draw PC icon for all buildings (neutral or owned)
            const pcSize = 25;

            // PC monitor (screen)
            this.ctx.fillStyle = building.ownerId === playerId ? '#00ffcc' :
                           (building.ownerId ? '#ff4444' : '#666666');
            this.ctx.fillRect(terminal.x - pcSize/2, terminal.y - pcSize/2, pcSize, pcSize * 0.7);

            // Monitor border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(terminal.x - pcSize/2, terminal.y - pcSize/2, pcSize, pcSize * 0.7);

            // PC base/stand
            this.ctx.fillStyle = '#888888';
            this.ctx.fillRect(terminal.x - pcSize/4, terminal.y + pcSize * 0.25, pcSize/2, pcSize * 0.15);

            // PC icon text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('💻', terminal.x, terminal.y - 3);
            this.ctx.textBaseline = 'alphabetic';
            this.ctx.textAlign = 'left';

            // Show interaction hint if player is near terminal
            if (myPlayer) {
                const dist = Math.hypot(myPlayer.x - terminal.x, myPlayer.y - terminal.y);
                if (dist < terminal.radius) {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.textAlign = 'center';

                    if (building.ownerId === playerId) {
                        // Owned - show management option
                        this.ctx.fillText('Press E to manage building', terminal.x, terminal.y + 30);
                    } else {
                        // Not owned - show hack option
                        this.ctx.fillText('Press E to hack terminal', terminal.x, terminal.y + 30);
                    }
                    this.ctx.textAlign = 'left';
                }
            }
        });
    }
}
