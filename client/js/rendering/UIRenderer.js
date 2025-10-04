// UI Renderer Module
// Extracted from shooter.html as part of Phase 2 refactoring

import * as Constants from '../utils/constants.js';

/**
 * Renders UI elements: minimap, debug info, FPS counter
 * Note: HUD elements (health, armor, stamina, scrap, toolbelt) are HTML-based
 * and updated via the updateUI() function in shooter.html
 */
export class UIRenderer {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
    }

    /**
     * Render minimap
     * @param {Object} myPlayer - Current player object
     * @param {Array} obstacles - Array of obstacles
     * @param {Array} pickups - Array of pickups
     * @param {Object} players - Players object keyed by player ID
     * @param {string} playerId - Current player's ID
     * @param {boolean} minimapMinimized - Whether minimap is minimized
     * @param {boolean} isMobile - Whether on mobile device
     */
    renderMinimap(myPlayer, obstacles, pickups, players, playerId, minimapMinimized, isMobile) {
        if (!myPlayer) return;

        const minimapSize = minimapMinimized ? 80 : 200;
        const minimapX = this.canvas.width - minimapSize - 10;
        const minimapY = minimapMinimized ? 10 : 20;

        // Minimap background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);

        // Minimap border
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);

        const scaleX = minimapSize / Constants.MAP_WIDTH;
        const scaleY = minimapSize / Constants.MAP_HEIGHT;

        // Draw obstacles on minimap
        this.ctx.fillStyle = '#00ffff';
        obstacles.forEach(obs => {
            this.ctx.fillRect(
                minimapX + obs.x * scaleX,
                minimapY + obs.y * scaleY,
                obs.width * scaleX,
                obs.height * scaleY
            );
        });

        // Draw pickups on minimap
        this.ctx.fillStyle = '#ffff00';
        pickups.forEach(pickup => {
            this.ctx.beginPath();
            this.ctx.arc(
                minimapX + pickup.x * scaleX,
                minimapY + pickup.y * scaleY,
                3, 0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // Draw players on minimap
        Object.values(players).forEach(player => {
            this.ctx.fillStyle = player.id === playerId ? '#00ff88' : '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(
                minimapX + player.x * scaleX,
                minimapY + player.y * scaleY,
                4, 0, Math.PI * 2
            );
            this.ctx.fill();
        });

        // Minimap label
        this.ctx.fillStyle = '#00ff88';
        if (minimapMinimized) {
            this.ctx.font = 'bold 9px Arial';
            this.ctx.fillText('MAP', minimapX + 3, minimapY + 10);
            // Show expand indicator
            this.ctx.fillText('++', minimapX + minimapSize - 15, minimapY + 10);
        } else {
            this.ctx.font = 'bold 12px Arial';
            this.ctx.fillText('MAP', minimapX + 5, minimapY + 15);
            // Show minimize indicator on mobile
            if (isMobile) {
                this.ctx.fillText('--', minimapX + minimapSize - 18, minimapY + 15);
            }
        }
    }

    /**
     * Render debug info (FPS, ping, position, weapon, object counts)
     * @param {number} fps - Current FPS
     * @param {number} ping - Current ping in ms
     * @param {Object} myPlayer - Current player object
     * @param {string} currentWeapon - Current weapon name
     * @param {number} obstacleCount - Number of obstacles
     * @param {number} pickupCount - Number of pickups
     */
    renderDebugInfo(fps, ping, myPlayer, currentWeapon, obstacleCount, pickupCount) {
        this.ctx.font = '14px Arial';

        // FPS
        this.ctx.fillStyle = fps < 30 ? '#ff0000' : (fps < 50 ? '#ffff00' : '#00ff00');
        this.ctx.fillText(`FPS: ${fps}`, 10, 25);

        // Ping
        this.ctx.fillStyle = ping > 200 ? '#ff0000' : (ping > 100 ? '#ffff00' : '#00ff00');
        this.ctx.fillText(`Ping: ${ping}ms`, 10, 45);

        // Position
        this.ctx.fillStyle = 'white';
        if (myPlayer) {
            this.ctx.fillText(`Pos: (${Math.round(myPlayer.x)}, ${Math.round(myPlayer.y)})`, 10, this.canvas.height - 40);
        }

        // Weapon
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillText(`Weapon: ${Constants.WEAPONS[currentWeapon].name}`, 10, this.canvas.height - 20);

        // Objects
        this.ctx.fillStyle = '#888888';
        this.ctx.fillText(`${obstacleCount} walls | ${pickupCount} items`, 10, this.canvas.height - 0);
    }
}
