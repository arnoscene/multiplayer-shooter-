// Game Constants Module
// Extracted from shooter.html as part of Phase 1 refactoring

// Map dimensions
export const MAP_WIDTH = 5000;
export const MAP_HEIGHT = 5000;

// Player constants
export const PLAYER_SIZE = 20;
export const MOVE_SPEED = 4;

// Weapon configurations
export const WEAPONS = {
    pistol: {
        name: 'Pistol',
        damage: 20,
        fireRate: 500,
        bulletSpeed: 12,
        bulletSize: 5,
        color: '#ffeb3b',
        spread: 0,
        ammo: Infinity
    },
    smg: {
        name: 'SMG',
        damage: 15,
        fireRate: 150,
        bulletSpeed: 14,
        bulletSize: 4,
        color: '#ff9800',
        spread: 0.1,
        ammo: 120
    },
    shotgun: {
        name: 'Shotgun',
        damage: 15,
        fireRate: 800,
        bulletSpeed: 10,
        bulletSize: 6,
        color: '#f44336',
        spread: 0.3,
        pellets: 5,
        ammo: 24
    },
    rifle: {
        name: 'Rifle',
        damage: 35,
        fireRate: 400,
        bulletSpeed: 18,
        bulletSize: 6,
        color: '#2196f3',
        spread: 0,
        ammo: 90
    },
    sniper: {
        name: 'Sniper',
        damage: 80,
        fireRate: 1500,
        bulletSpeed: 25,
        bulletSize: 8,
        color: '#9c27b0',
        spread: 0,
        penetration: 4,
        ammo: 15
    },
    rocket: {
        name: 'Rocket Launcher',
        damage: 100,
        fireRate: 2000,
        bulletSpeed: 8,
        bulletSize: 12,
        color: '#ff0000',
        spread: 0,
        explosive: true,
        explosionRadius: 150,
        ammo: 5
    }
};

// Player color palette
export const COLORS = [
    '#4ecdc4', '#ff6b6b', '#95e1d3', '#f38181',
    '#aa96da', '#fcbad3', '#ffffd2', '#a8e6cf'
];

// Tool configurations
export const TOOLS = {
    HAMMER: 'hammer',
    REPAIR: 'repair'
};

// Ability configurations
export const ABILITIES = {
    SPEED_BOOST: 'speedBoost',
    SHIELD: 'shield',
    INVISIBILITY: 'invisibility'
};

// Building/interaction constants
export const INTERACTION_RANGE = 50; // Door and terminal interaction range
export const REPAIR_RANGE = 60; // Repair tool range
export const HACK_DURATION = 10000; // 10 seconds in milliseconds

// Material tier HP values
export const MATERIAL_HP = {
    wood: 1000,
    sand: 1000,
    brick: 1500,
    stone: 1500,
    metal: 2000
};

// Repair constants
export const SCRAP_REPAIR_AMOUNT = 100; // HP restored per scrap
export const DEBRIS_REBUILD_HP = 100; // Starting HP when rebuilding debris

// Block/obstacle types
export const BLOCK_TYPES = {
    WOOD: 'wood',
    SAND: 'sand',
    BRICK: 'brick',
    STONE: 'stone',
    METAL: 'metal',
    ROOF: 'roof',
    WINDOW: 'window',
    DOOR: 'door',
    DEBRIS: 'debris'
};

// Material colors (for rendering)
export const MATERIAL_COLORS = {
    brick: '#a0522d',
    wood: '#8b4513',
    stone: '#708090',
    sand: '#daa520',
    metal: '#696969',
    roof: '#8b0000',
    window: '#87ceeb',
    door: '#654321'
};

// Debris colors (lighter versions of materials)
export const DEBRIS_COLORS = {
    brick: '#c8835e',
    wood: '#b8733f',
    stone: '#9fb0c0',
    sand: '#f4d5a6',
    metal: '#b8b8b8',
    roof: '#b84545',
    default: '#6a6a6a'
};

// Terrain types
export const TERRAIN_TYPES = {
    GRASS: 'grass',
    WATER: 'water',
    MUD: 'mud',
    FOREST: 'forest',
    ROAD: 'road'
};

// Voxel/tile size
export const VOXEL_SIZE = 20;
export const TERRAIN_TILE_SIZE = 50;
