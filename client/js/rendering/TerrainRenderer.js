// Terrain Renderer Module
// Extracted from shooter.html as part of Phase 2 refactoring

import * as Constants from '../utils/constants.js';

/**
 * Renders terrain tiles and building floors
 */
export class TerrainRenderer {
    constructor(ctx) {
        this.ctx = ctx;

        // Terrain colors
        this.terrainColors = {
            grass: '#228b22',
            road: '#555555',
            mud: '#8b7355',
            water: '#4682b4',
            forest: '#1a5a1a'
        };

        // Floor colors based on building material
        this.floorColors = {
            wood: '#5c4033',
            brick: '#4a4a4a',
            stone: '#5a5a5a',
            sand: '#4a4a4a',
            metal: '#3a3a3a',
            default: '#3a3a3a'
        };
    }

    /**
     * Render all terrain tiles
     * @param {Array} terrain - Array of terrain tiles
     */
    renderTerrain(terrain) {
        terrain.forEach(tile => {
            const color = this.terrainColors[tile.type] || this.terrainColors.grass;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(tile.x, tile.y, tile.size, tile.size);

            // Add grass texture pattern
            if (tile.type === 'grass') {
                this.ctx.fillStyle = 'rgba(34, 139, 34, 0.3)';
                // Draw small dots in a scattered pattern for grass blades
                for (let i = 0; i < 8; i++) {
                    const dotX = tile.x + (i % 4) * 12 + 5;
                    const dotY = tile.y + Math.floor(i / 4) * 25 + 10;
                    this.ctx.fillRect(dotX, dotY, 2, 4);
                    this.ctx.fillRect(dotX + 20, dotY + 8, 2, 3);
                }
            }

            // Add tree obstacles in forest tiles
            if (tile.type === 'forest') {
                this.ctx.fillStyle = '#0d3d0d'; // Darker green for tree trunks
                // Draw 3-4 tree circles per forest tile for visual density
                const treePositions = [
                    { x: 10, y: 10, r: 8 },
                    { x: 35, y: 15, r: 6 },
                    { x: 15, y: 35, r: 7 },
                    { x: 38, y: 38, r: 5 }
                ];

                treePositions.forEach(tree => {
                    this.ctx.beginPath();
                    this.ctx.arc(tile.x + tree.x, tile.y + tree.y, tree.r, 0, Math.PI * 2);
                    this.ctx.fill();

                    // Add lighter green foliage outline
                    this.ctx.strokeStyle = '#2d7d2d';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                });
            }
        });
    }

    /**
     * Render building floor tiles
     * @param {Array} floors - Array of floor tiles
     */
    renderFloors(floors) {
        floors.forEach(floor => {
            const color = this.floorColors[floor.buildingType] || this.floorColors.default;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(floor.x, floor.y, floor.size, floor.size);

            // Add subtle grid lines for floor tiles
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(floor.x, floor.y, floor.size, floor.size);
        });
    }
}
