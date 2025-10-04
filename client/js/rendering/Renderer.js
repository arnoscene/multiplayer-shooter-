// Main Renderer Module
// Orchestrates all rendering components
// Extracted from shooter.html as part of Phase 2 refactoring

import { TerrainRenderer } from './TerrainRenderer.js';
import { BuildingRenderer } from './BuildingRenderer.js';
import { PlayerRenderer } from './PlayerRenderer.js';
import { UIRenderer } from './UIRenderer.js';

/**
 * Main Renderer class that coordinates all rendering operations
 * Ensures proper rendering order: terrain -> floors -> buildings -> pickups -> particles -> bullets -> players -> abilities -> UI
 */
export class Renderer {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;

        // Initialize sub-renderers
        this.terrainRenderer = new TerrainRenderer(ctx);
        this.buildingRenderer = new BuildingRenderer(ctx);
        this.playerRenderer = new PlayerRenderer(ctx);
        this.uiRenderer = new UIRenderer(ctx, canvas);
    }

    /**
     * Main render method - called once per frame
     * @param {Object} gameState - Complete game state object containing:
     *   - terrain: Array of terrain tiles
     *   - floors: Array of floor tiles
     *   - obstacles: Array of obstacles/buildings
     *   - buildings: Array of building objects with terminals
     *   - pickups: Array of pickup objects
     *   - particles: Array of particle objects
     *   - bullets: Array of bullet objects
     *   - players: Object of players keyed by ID
     *   - myPlayer: Current player object
     *   - playerId: Current player's ID
     *   - currentTool: Current tool/weapon equipped
     *   - currentWeapon: Current weapon name
     *   - toolSwingTime: Tool swing animation timestamp
     *   - toolSwingDuration: Tool swing animation duration
     *   - blades: Array of blade objects (for blade swirl ability)
     *   - bladeAngle: Current blade rotation angle
     *   - abilityActive: Boolean if ability is active
     *   - currentAbility: Current ability name
     *   - fps: Current FPS
     *   - ping: Current ping in ms
     *   - minimapMinimized: Boolean if minimap is minimized
     *   - isMobile: Boolean if on mobile device
     */
    render(gameState) {
        const {
            terrain = [],
            floors = [],
            obstacles = [],
            buildings = [],
            pickups = [],
            particles = [],
            bullets = [],
            players = {},
            myPlayer = null,
            playerId = null,
            currentTool = null,
            currentWeapon = 'pistol',
            toolSwingTime = 0,
            toolSwingDuration = 0,
            blades = [],
            bladeAngle = 0,
            abilityActive = false,
            currentAbility = null,
            fps = 0,
            ping = 0,
            minimapMinimized = false,
            isMobile = false
        } = gameState;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context state
        this.ctx.save();

        // Apply camera transform (centered on player)
        if (myPlayer) {
            this.ctx.translate(-myPlayer.x + this.canvas.width / 2, -myPlayer.y + this.canvas.height / 2);
        }

        // Layer 1: Terrain (background)
        this.terrainRenderer.renderTerrain(terrain);

        // Layer 2: Floor tiles (building interiors)
        this.terrainRenderer.renderFloors(floors);

        // Layer 3: Buildings/Obstacles (walls, doors, etc.)
        this.buildingRenderer.renderObstacles(obstacles, myPlayer);

        // Layer 4: Building terminals (computer icons)
        this.buildingRenderer.renderTerminals(buildings, playerId, myPlayer);

        // Layer 5: Pickups (health, armor, weapons, abilities)
        this.playerRenderer.renderPickups(pickups);

        // Layer 6: Particles (debris, explosions)
        this.playerRenderer.renderParticles(particles);

        // Layer 7: Bullets
        this.playerRenderer.renderBullets(bullets);

        // Layer 8: Players (with weapons and health bars)
        this.playerRenderer.renderPlayers(players, playerId, currentTool, toolSwingTime, toolSwingDuration);

        // Layer 9: Active abilities (blade swirl, etc.)
        if (abilityActive && currentAbility === 'bladeswirl' && myPlayer) {
            this.playerRenderer.renderBladeSwirlAbility(blades, bladeAngle, myPlayer);
        }

        // Restore context state (removes camera transform)
        this.ctx.restore();

        // Layer 10: UI elements (rendered in screen space, not world space)

        // Minimap
        this.uiRenderer.renderMinimap(
            myPlayer,
            obstacles,
            pickups,
            players,
            playerId,
            minimapMinimized,
            isMobile
        );

        // Debug info (FPS, ping, position, weapon, object counts)
        this.uiRenderer.renderDebugInfo(
            fps,
            ping,
            myPlayer,
            currentWeapon,
            obstacles.length,
            pickups.length
        );
    }
}
