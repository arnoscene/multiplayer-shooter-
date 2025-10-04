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
