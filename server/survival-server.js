// Survival Shooter Server
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();

// Serve static files from client folder
app.use(express.static(path.join(__dirname, '../client')));

// Default route - serve shooter.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/shooter.html'));
});

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/admin.html'));
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Game state
const gameState = {
  players: new Map(),
  bullets: [],
  pickups: [],
  obstacles: [],
  terrain: [], // Terrain tiles with speed modifiers
  capturePoints: [], // Capture zones
  guards: [], // NPC guards
  ammoCrates: [], // Ammo supply crates
  floors: [], // Floor tiles inside buildings
  buildings: [] // Building ownership and capture zones
};

function generatePlayerId() {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

// Simple Perlin-like noise generator
function createNoise() {
  const permutation = [];
  for (let i = 0; i < 256; i++) permutation[i] = i;

  // Shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }

  const p = [...permutation, ...permutation];

  function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  function lerp(t, a, b) {
    return a + t * (b - a);
  }

  function grad(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return function noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = fade(x);
    const v = fade(y);

    const a = p[X] + Y;
    const b = p[X + 1] + Y;

    return lerp(v,
      lerp(u, grad(p[a], x, y), grad(p[b], x - 1, y)),
      lerp(u, grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1))
    );
  };
}

// BSP room generator
class BSPNode {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.leftChild = null;
    this.rightChild = null;
    this.room = null;
  }

  split(minRoomSize = 40) {
    if (this.leftChild || this.rightChild) return false;

    let splitHorizontal = Math.random() > 0.5;

    if (this.width > this.height && this.width / this.height >= 1.25) {
      splitHorizontal = false;
    } else if (this.height > this.width && this.height / this.width >= 1.25) {
      splitHorizontal = true;
    }

    const max = (splitHorizontal ? this.height : this.width) - minRoomSize;
    if (max <= minRoomSize) return false;

    const split = minRoomSize + Math.floor(Math.random() * (max - minRoomSize));

    if (splitHorizontal) {
      this.leftChild = new BSPNode(this.x, this.y, this.width, split);
      this.rightChild = new BSPNode(this.x, this.y + split, this.width, this.height - split);
    } else {
      this.leftChild = new BSPNode(this.x, this.y, split, this.height);
      this.rightChild = new BSPNode(this.x + split, this.y, this.width - split, this.height);
    }

    return true;
  }

  createRooms() {
    if (this.leftChild || this.rightChild) {
      if (this.leftChild) this.leftChild.createRooms();
      if (this.rightChild) this.rightChild.createRooms();
    } else {
      // Create room with padding
      const padding = 10;
      this.room = {
        x: this.x + padding,
        y: this.y + padding,
        width: this.width - padding * 2,
        height: this.height - padding * 2
      };
    }
  }

  getLeaves() {
    if (!this.leftChild && !this.rightChild) return [this];
    const leaves = [];
    if (this.leftChild) leaves.push(...this.leftChild.getLeaves());
    if (this.rightChild) leaves.push(...this.rightChild.getLeaves());
    return leaves;
  }
}

function broadcast(data, excludeClient = null) {
  wss.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function sendToClient(client, data) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

// Generate a town with BSP buildings and Perlin terrain
// Helper function to check if area is grassland
function isGrassland(centerX, centerY, width, height) {
  const tileSize = 50;
  let grassCount = 0;
  let totalTiles = 0;

  for (let x = centerX; x < centerX + width; x += tileSize) {
    for (let y = centerY; y < centerY + height; y += tileSize) {
      const tile = gameState.terrain.find(t =>
        x >= t.x && x < t.x + t.size &&
        y >= t.y && y < t.y + t.size
      );
      if (tile) {
        totalTiles++;
        if (tile.type === 'grass') grassCount++;
      }
    }
  }

  return totalTiles > 0 && (grassCount / totalTiles) > 0.8; // 80% must be grass
}

function spawnObstacles() {
  const voxelSize = 20;
  const buildingCount = 20; // Scatter 20 buildings across the map
  let buildingsPlaced = 0;
  let attempts = 0;
  const maxAttempts = 200;
  const buildings = []; // Track building positions for road generation

  while (buildingsPlaced < buildingCount && attempts < maxAttempts) {
    attempts++;

    // Random position on the map
    const buildingX = 500 + Math.random() * 4000;
    const buildingY = 500 + Math.random() * 4000;

    const buildingTypes = ['brick', 'wood', 'stone'];
    const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];

    // Random building size
    const buildingWidth = 250 + Math.random() * 250;  // 250-500px
    const buildingHeight = 250 + Math.random() * 250;

    // Check if this area is grassland
    if (!isGrassland(buildingX, buildingY, buildingWidth, buildingHeight)) {
      continue; // Skip if not on grass
    }

    // Check if overlaps with existing buildings (with spacing)
    let overlaps = false;
    for (const obs of gameState.obstacles) {
      if (buildingX < obs.x + 300 && buildingX + buildingWidth + 300 > obs.x &&
          buildingY < obs.y + 300 && buildingY + buildingHeight + 300 > obs.y) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    // Create BSP tree for this building
    const bsp = new BSPNode(0, 0, Math.floor(buildingWidth), Math.floor(buildingHeight));

    // Split 2-3 times to create rooms
    const splits = 2 + Math.floor(Math.random() * 2);
    const leaves = [bsp];

    for (let i = 0; i < splits; i++) {
      const leafToSplit = leaves[Math.floor(Math.random() * leaves.length)];
      if (leafToSplit.split()) {
        leaves.splice(leaves.indexOf(leafToSplit), 1);
        leaves.push(leafToSplit.leftChild, leafToSplit.rightChild);
      }
    }

    bsp.createRooms();
    const rooms = bsp.getLeaves().map(leaf => leaf.room);

    // Create outer walls
    const chunksX = Math.ceil(buildingWidth / voxelSize);
    const chunksY = Math.ceil(buildingHeight / voxelSize);

    for (let vx = 0; vx < chunksX; vx++) {
      for (let vy = 0; vy < chunksY; vy++) {
        const worldX = buildingX + vx * voxelSize;
        const worldY = buildingY + vy * voxelSize;

        // Check if this is an exterior wall
        const isExteriorWall = vx === 0 || vx === chunksX - 1 || vy === 0 || vy === chunksY - 1;

        // Check if inside any room (should be walkable)
        const localX = vx * voxelSize;
        const localY = vy * voxelSize;
        const insideRoom = rooms.some(room =>
          localX >= room.x && localX < room.x + room.width &&
          localY >= room.y && localY < room.y + room.height
        );

        // Only place blocks on walls
        if (isExteriorWall || !insideRoom) {
          let blockType = buildingType;

          if (vy === 0) blockType = 'roof';
          else if (isExteriorWall && vy === chunksY - 1 && vx === Math.floor(chunksX / 2)) blockType = 'door';
          else if (isExteriorWall && Math.random() < 0.15) blockType = 'window';

          gameState.obstacles.push({
            id: `building_${buildingsPlaced}_${vx}_${vy}`,
            x: worldX,
            y: worldY,
            width: voxelSize,
            height: voxelSize,
            health: 40,
            maxHealth: 40,
            blockType: blockType,
            isWall: true,
            isDoor: blockType === 'door',
            isOpen: false
          });
        } else if (insideRoom) {
          // Add floor tile for walkable room area
          gameState.floors.push({
            id: `floor_${buildingsPlaced}_${vx}_${vy}`,
            x: worldX,
            y: worldY,
            size: voxelSize,
            buildingType: buildingType
          });
        }
      }
    }

    // Track building for road generation
    buildings.push({
      x: buildingX,
      y: buildingY,
      width: buildingWidth,
      height: buildingHeight,
      rooms: rooms
    });

    // Add building to gameState with capture zone
    const captureX = buildingX + buildingWidth / 2;
    const captureY = buildingY + buildingHeight / 2;

    gameState.buildings.push({
      id: `building_${buildingsPlaced}`,
      x: buildingX,
      y: buildingY,
      width: buildingWidth,
      height: buildingHeight,
      rooms: rooms,

      // Ownership properties
      ownerId: null,
      ownerName: null,
      captureProgress: {}, // { playerId: progress% }

      // Capture zone
      captureZone: {
        x: captureX,
        y: captureY,
        radius: 80
      },

      // Stats
      totalBlocks: 0, // Will be calculated after all buildings created
      destroyedBlocks: 0,
      integrity: 100
    });

    buildingsPlaced++;
  }

  // Calculate total blocks per building
  gameState.buildings.forEach(building => {
    const buildingIndex = building.id.split('_')[1];
    building.totalBlocks = gameState.obstacles.filter(obs =>
      obs.id.startsWith(`building_${buildingIndex}_`)
    ).length;
  });

  console.log(`Scattered ${buildingsPlaced} buildings across grasslands (${attempts} attempts)`);
  console.log(`Created ${gameState.obstacles.length} building blocks with ${gameState.floors.length} floor tiles`);
  console.log(`Created ${gameState.buildings.length} capturable buildings`);

  return buildings;
}

// Check if position overlaps with any obstacle
function isPositionValid(x, y, margin = 50) {
  for (const obs of gameState.obstacles) {
    if (x > obs.x - margin && x < obs.x + obs.width + margin &&
        y > obs.y - margin && y < obs.y + obs.height + margin) {
      return false;
    }
  }
  return true;
}

// Find valid spawn position
function findValidSpawnPosition(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const x = 200 + Math.random() * 4600;
    const y = 200 + Math.random() * 4600;
    if (isPositionValid(x, y)) {
      return { x, y };
    }
  }
  // Fallback to random position if no valid spot found
  return { x: 200 + Math.random() * 4600, y: 200 + Math.random() * 4600 };
}

// Generate terrain with Perlin noise
function spawnTerrain() {
  const tileSize = 50;
  const mapSize = 5000;
  const noise = createNoise();

  for (let x = 0; x < mapSize; x += tileSize) {
    for (let y = 0; y < mapSize; y += tileSize) {
      let terrainType = 'grass';
      let speedModifier = 1.0;

      // Use multiple octaves of Perlin noise for more organic terrain
      const scale1 = 0.008; // Large biomes (bigger features)
      const scale2 = 0.025; // Medium patches
      const scale3 = 0.08;  // Small detail

      const noise1 = (noise(x * scale1, y * scale1) + 1) / 2;
      const noise2 = (noise(x * scale2, y * scale2) + 1) / 2;
      const noise3 = (noise(x * scale3, y * scale3) + 1) / 2;

      // Combine with more emphasis on large features
      const combinedNoise = noise1 * 0.5 + noise2 * 0.35 + noise3 * 0.15;

      // Create varied terrain with larger biomes
      if (combinedNoise < 0.28) {
        terrainType = 'water';
        speedModifier = 0.4;
      } else if (combinedNoise < 0.38) {
        terrainType = 'mud';
        speedModifier = 0.6;
      } else if (combinedNoise < 0.65) {
        terrainType = 'grass';
        speedModifier = 1.0;
      } else if (combinedNoise < 0.82) {
        terrainType = 'forest';
        speedModifier = 0.8;
      } else {
        // Rocky/sandy areas
        terrainType = 'mud';
        speedModifier = 0.7;
      }

      gameState.terrain.push({
        x: x,
        y: y,
        size: tileSize,
        type: terrainType,
        speedModifier: speedModifier
      });
    }
  }

  console.log(`Generated ${gameState.terrain.length} organic terrain tiles`);
}

// Generate roads connecting buildings
function generateRoads(buildings) {
  const tileSize = 50;

  // For each building, create a road path to nearest neighbor
  for (let i = 0; i < buildings.length; i++) {
    const buildingA = buildings[i];

    // Find closest building
    let closestDist = Infinity;
    let closestBuilding = null;

    for (let j = 0; j < buildings.length; j++) {
      if (i === j) continue;
      const buildingB = buildings[j];
      const dist = Math.hypot(buildingA.x - buildingB.x, buildingA.y - buildingB.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestBuilding = buildingB;
      }
    }

    if (closestBuilding && closestDist < 1500) { // Only connect if close enough
      // Create road path between buildings
      const startX = buildingA.x + buildingA.width / 2;
      const startY = buildingA.y + buildingA.height / 2;
      const endX = closestBuilding.x + closestBuilding.width / 2;
      const endY = closestBuilding.y + closestBuilding.height / 2;

      const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY)) / tileSize;

      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const roadX = Math.floor((startX + (endX - startX) * t) / tileSize) * tileSize;
        const roadY = Math.floor((startY + (endY - startY) * t) / tileSize) * tileSize;

        // Make road 2-3 tiles wide
        for (let dx = -tileSize; dx <= tileSize; dx += tileSize) {
          for (let dy = -tileSize; dy <= tileSize; dy += tileSize) {
            const tile = gameState.terrain.find(t =>
              t.x === roadX + dx && t.y === roadY + dy
            );
            if (tile && tile.type !== 'water') {
              tile.type = 'road';
              tile.speedModifier = 1.3;
            }
          }
        }
      }
    }
  }

  console.log('Generated roads connecting buildings');
}

// Spawn capture points at strategic locations
function spawnCapturePoints() {
  const captureLocations = [
    { x: 500, y: 500 },    // Northwest
    { x: 2500, y: 500 },   // North
    { x: 4500, y: 500 },   // Northeast
    { x: 500, y: 2500 },   // West
    { x: 2500, y: 2500 },  // Center
    { x: 4500, y: 2500 },  // East
    { x: 500, y: 4500 },   // Southwest
    { x: 2500, y: 4500 },  // South
    { x: 4500, y: 4500 }   // Southeast
  ];

  captureLocations.forEach((loc, index) => {
    gameState.capturePoints.push({
      id: `capture_${index}`,
      x: loc.x,
      y: loc.y,
      radius: 100,
      owner: null, // null or playerId
      captureProgress: {},  // playerId -> progress (0-100)
      level: 0, // 0=uncaptured, 1=basic, 2=fortified, 3=turret
      guards: [],
      ammoSupply: 0
    });
  });

  console.log(`Spawned ${gameState.capturePoints.length} capture points`);
}

// Spawn ammo crates around the map
function spawnAmmoCrates() {
  for (let i = 0; i < 15; i++) {
    const pos = findValidSpawnPosition();
    gameState.ammoCrates.push({
      id: 'ammo_crate_' + i,
      x: pos.x,
      y: pos.y,
      ammoAmount: 100
    });
  }
  console.log(`Spawned ${gameState.ammoCrates.length} ammo crates`);
}

// Weapon spawn points (fixed locations with respawn timers)
const WEAPON_SPAWN_POINTS = [
  // SMGs (common, 4 spawns)
  { type: 'weapon_smg', x: 800, y: 800, respawnTime: 30000 },
  { type: 'weapon_smg', x: 4200, y: 800, respawnTime: 30000 },
  { type: 'weapon_smg', x: 800, y: 4200, respawnTime: 30000 },
  { type: 'weapon_smg', x: 4200, y: 4200, respawnTime: 30000 },

  // Shotguns (common, 4 spawns)
  { type: 'weapon_shotgun', x: 1500, y: 1500, respawnTime: 30000 },
  { type: 'weapon_shotgun', x: 3500, y: 1500, respawnTime: 30000 },
  { type: 'weapon_shotgun', x: 1500, y: 3500, respawnTime: 30000 },
  { type: 'weapon_shotgun', x: 3500, y: 3500, respawnTime: 30000 },

  // Rifles (medium, 3 spawns)
  { type: 'weapon_rifle', x: 2500, y: 1000, respawnTime: 45000 },
  { type: 'weapon_rifle', x: 1000, y: 2500, respawnTime: 45000 },
  { type: 'weapon_rifle', x: 4000, y: 2500, respawnTime: 45000 },

  // Snipers (rare, 2 spawns)
  { type: 'weapon_sniper', x: 2500, y: 500, respawnTime: 60000 },
  { type: 'weapon_sniper', x: 2500, y: 4500, respawnTime: 60000 },

  // Rocket Launchers (very rare, 2 spawns)
  { type: 'weapon_rocket', x: 500, y: 2500, respawnTime: 90000 },
  { type: 'weapon_rocket', x: 4500, y: 2500, respawnTime: 90000 },
];

// Spawn weapons inside buildings
function spawnWeaponPoints(buildings) {
  const weaponTypes = [
    { type: 'weapon_smg', count: 4, respawnTime: 30000 },
    { type: 'weapon_shotgun', count: 4, respawnTime: 30000 },
    { type: 'weapon_rifle', count: 3, respawnTime: 45000 },
    { type: 'weapon_sniper', count: 2, respawnTime: 60000 },
    { type: 'weapon_rocket', count: 2, respawnTime: 90000 }
  ];

  let weaponIndex = 0;

  weaponTypes.forEach(weaponConfig => {
    for (let i = 0; i < weaponConfig.count; i++) {
      // Pick a random building
      const building = buildings[Math.floor(Math.random() * buildings.length)];
      if (!building || !building.rooms || building.rooms.length === 0) continue;

      // Pick a random room in that building
      const room = building.rooms[Math.floor(Math.random() * building.rooms.length)];

      // Place weapon in center of room
      const weaponX = building.x + room.x + room.width / 2;
      const weaponY = building.y + room.y + room.height / 2;

      const pickup = {
        id: `weapon_spawn_${weaponIndex}`,
        type: weaponConfig.type,
        x: weaponX,
        y: weaponY,
        spawnPointIndex: weaponIndex,
        respawnTime: weaponConfig.respawnTime,
        available: true
      };
      gameState.pickups.push(pickup);
      weaponIndex++;
    }
  });

  console.log(`Spawned ${weaponIndex} weapons inside ${buildings.length} buildings`);
}

// Handle weapon pickup respawn
function respawnWeapon(spawnPointIndex) {
  const spawnPoint = WEAPON_SPAWN_POINTS[spawnPointIndex];
  const pickup = {
    id: `weapon_spawn_${spawnPointIndex}`,
    type: spawnPoint.type,
    x: spawnPoint.x,
    y: spawnPoint.y,
    spawnPointIndex: spawnPointIndex,
    respawnTime: spawnPoint.respawnTime,
    available: true
  };
  gameState.pickups.push(pickup);

  broadcast({
    type: 'pickupsUpdate',
    pickups: gameState.pickups
  });

  console.log(`Respawned ${spawnPoint.type} at spawn point ${spawnPointIndex}`);
}

// Initialize terrain first, then buildings (buildings check terrain)
spawnTerrain();
const buildings = spawnObstacles();
generateRoads(buildings);
spawnCapturePoints();
spawnAmmoCrates();
spawnWeaponPoints(buildings);

// Spawn some health/armor pickups
for (let i = 0; i < 10; i++) {
  const pos = findValidSpawnPosition();
  const type = Math.random() < 0.5 ? 'health' : 'armor';
  gameState.pickups.push({
    id: `${type}_${i}`,
    type: type,
    x: pos.x,
    y: pos.y
  });
}
console.log('Spawned health and armor pickups');

wss.on('connection', (ws) => {
  let playerId = null;
  let playerRegistered = false;
  console.log(`WebSocket connection opened, awaiting registration...`);

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle registration first
      if (data.type === 'register' && !playerRegistered) {
        playerId = data.persistentId || generatePlayerId();
        playerRegistered = true;
        console.log(`Player registered: ${playerId}`);

        // Initialize new player with random spawn location
        const spawnPos = findValidSpawnPosition();
        const newPlayer = {
          id: playerId,
          name: data.name || `Player ${gameState.players.size + 1}`,
          x: spawnPos.x,
          y: spawnPos.y,
          angle: 0,
          health: 100,
          maxHealth: 100,
          armor: 0,
          maxArmor: 100,
          color: data.color || '#4ecdc4',
          weapon: 'pistol',
          invulnerable: true,
          invulnerableUntil: Date.now() + 1500,
          scrap: 0  // Resource for upgrades
        };

        gameState.players.set(playerId, newPlayer);

        // Send initial state to new player
        sendToClient(ws, {
          type: 'init',
          playerId: playerId,
          player: newPlayer,
          players: Array.from(gameState.players.values())
        });

        // Send pickups, obstacles, terrain, capture points, and ammo crates
        setTimeout(() => {
          sendToClient(ws, {
            type: 'pickupsUpdate',
            pickups: gameState.pickups
          });

          sendToClient(ws, {
            type: 'obstaclesUpdate',
            obstacles: gameState.obstacles
          });

          sendToClient(ws, {
            type: 'terrainUpdate',
            terrain: gameState.terrain
          });

          sendToClient(ws, {
            type: 'capturePointsUpdate',
            capturePoints: gameState.capturePoints
          });

          sendToClient(ws, {
            type: 'ammoCratesUpdate',
            ammoCrates: gameState.ammoCrates
          });

          sendToClient(ws, {
            type: 'guardsUpdate',
            guards: gameState.guards
          });

          sendToClient(ws, {
            type: 'floorsUpdate',
            floors: gameState.floors
          });
          sendToClient(ws, {
            type: 'buildingsUpdate',
            buildings: gameState.buildings
          });
        }, 100);

        // Notify other players
        broadcast({
          type: 'playerJoined',
          player: newPlayer
        }, ws);

        return;
      }

      // All other messages require registration
      if (!playerRegistered) return;

      const player = gameState.players.get(playerId);
      if (!player) return;

      switch(data.type) {
        case 'move':
          // Don't accept movement if player is dead
          if (!player.isDead) {
            player.x = data.x;
            player.y = data.y;
            player.angle = data.angle;

            broadcast({
              type: 'playerMoved',
              playerId: playerId,
              x: data.x,
              y: data.y,
              angle: data.angle
            }, ws);
          }
          break;

        case 'shoot':
          const bullet = {
            id: data.bulletId,
            x: data.x,
            y: data.y,
            vx: data.vx,
            vy: data.vy,
            playerId: playerId,
            createdAt: Date.now()
          };

          gameState.bullets.push(bullet);

          broadcast({
            type: 'playerShot',
            bulletId: data.bulletId,
            x: data.x,
            y: data.y,
            vx: data.vx,
            vy: data.vy,
            playerId: playerId
          });
          break;

        case 'bulletHit':
          // Handle bullet hitting a player
          const target = gameState.players.get(data.targetId);
          if (target && target.id !== playerId) {
            // Check if target is invulnerable
            if (target.invulnerable && Date.now() < target.invulnerableUntil) {
              console.log(`Player ${data.targetId} is invulnerable, ignoring hit`);
              break;
            }

            const damage = data.damage || 20;

            // Apply damage - armor absorbs first
            if (target.armor > 0) {
              if (target.armor >= damage) {
                target.armor -= damage;
              } else {
                const remainingDamage = damage - target.armor;
                target.armor = 0;
                target.health = Math.max(0, target.health - remainingDamage);
              }
            } else {
              target.health = Math.max(0, target.health - damage);
            }

            // Broadcast armor update
            broadcast({
              type: 'playerArmorUpdate',
              playerId: data.targetId,
              armor: target.armor
            });

            // Broadcast damage immediately
            broadcast({
              type: 'playerDamaged',
              playerId: data.targetId,
              health: target.health,
              byPlayer: playerId
            });

            // Check if player died
            if (target.health <= 0) {
              // Stop accepting movement updates
              target.isDead = true;

              broadcast({
                type: 'playerDied',
                playerId: data.targetId,
                killedBy: playerId
              });

              // Respawn after 2 seconds
              setTimeout(() => {
                if (gameState.players.has(data.targetId)) {
                  const respawnPos = findValidSpawnPosition();
                  target.health = target.maxHealth;
                  target.armor = 0;
                  target.weapon = 'pistol';
                  target.x = respawnPos.x;
                  target.y = respawnPos.y;
                  target.isDead = false;
                  target.invulnerable = true;
                  target.invulnerableUntil = Date.now() + 1500; // 1.5s invulnerability

                  broadcast({
                    type: 'playerRespawned',
                    playerId: data.targetId,
                    x: target.x,
                    y: target.y,
                    health: target.health,
                    invulnerable: true
                  });
                }
              }, 2000);
            }
          }
          break;

        case 'updateName':
          player.name = data.name.substring(0, 20);

          broadcast({
            type: 'playerNameChanged',
            playerId: playerId,
            name: player.name
          });
          break;

        case 'collectPickup':
          const pickup = gameState.pickups.find(p => p.id === data.pickupId);
          if (pickup) {
            // Remove pickup
            gameState.pickups = gameState.pickups.filter(p => p.id !== data.pickupId);

            // Apply pickup effect
            if (pickup.type === 'health') {
              player.health = Math.min(player.maxHealth, player.health + 30);
            } else if (pickup.type === 'armor') {
              player.armor = Math.min(player.maxArmor, player.armor + 50);
            } else if (pickup.type.startsWith('weapon_')) {
              player.weapon = pickup.type.replace('weapon_', '');
            }

            // If weapon spawn point, trigger respawn timer
            if (pickup.spawnPointIndex !== undefined) {
              setTimeout(() => {
                respawnWeapon(pickup.spawnPointIndex);
              }, pickup.respawnTime);
              console.log(`Weapon ${pickup.type} collected, will respawn in ${pickup.respawnTime/1000}s`);
            }

            // Broadcast collection
            broadcast({
              type: 'pickupCollected',
              pickupId: data.pickupId,
              playerId: playerId,
              pickupType: pickup.type
            });
          }
          break;

        case 'obstacleHit':
          // Handle bullet hitting obstacle
          const obstacle = gameState.obstacles.find(o => o.id === data.obstacleId);
          if (obstacle) {
            obstacle.health -= data.damage || 20;

            if (obstacle.health <= 0) {
              // Remove destroyed obstacle
              gameState.obstacles = gameState.obstacles.filter(o => o.id !== data.obstacleId);

              // Award scrap to player who destroyed it
              player.scrap += 2;

              broadcast({
                type: 'obstacleDestroyed',
                obstacleId: data.obstacleId,
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height
              });

              broadcast({
                type: 'playerScrapUpdate',
                playerId: playerId,
                scrap: player.scrap
              });
            } else {
              // Broadcast damage
              broadcast({
                type: 'obstacleDamaged',
                obstacleId: data.obstacleId,
                health: obstacle.health
              });
            }
          }
          break;

        case 'hammerHit':
          // Handle hammer destroying blocks
          const hammerObs = gameState.obstacles.find(o => o.id === data.obstacleId);
          if (hammerObs) {
            // Check if block is within a captured base radius (100px from capture point)
            let isCapturedBase = false;
            for (const cp of gameState.capturePoints) {
              if (cp.owner) {
                const dx = hammerObs.x - cp.x;
                const dy = hammerObs.y - cp.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                  isCapturedBase = true;
                  break;
                }
              }
            }

            // If captured base, reduce damage by 75% (harder to destroy)
            const damage = isCapturedBase ? Math.floor(data.damage * 0.25) : data.damage;
            hammerObs.health -= damage;

            if (hammerObs.health <= 0) {
              gameState.obstacles = gameState.obstacles.filter(o => o.id !== data.obstacleId);

              // Award scrap
              player.scrap += 2;

              broadcast({
                type: 'obstacleDestroyed',
                obstacleId: data.obstacleId,
                x: hammerObs.x,
                y: hammerObs.y,
                width: hammerObs.width,
                height: hammerObs.height
              });

              broadcast({
                type: 'playerScrapUpdate',
                playerId: playerId,
                scrap: player.scrap
              });
            } else {
              broadcast({
                type: 'obstacleDamaged',
                obstacleId: data.obstacleId,
                health: hammerObs.health
              });
            }
          }
          break;

        case 'repairBlock':
          // Handle repair tool restoring block health
          const repairObs = gameState.obstacles.find(o => o.id === data.obstacleId);
          if (repairObs && player.scrap >= 1) {
            // Cost 1 scrap to repair
            player.scrap -= 1;

            // Restore health (up to max)
            repairObs.health = Math.min(repairObs.maxHealth, repairObs.health + data.repairAmount);

            broadcast({
              type: 'obstacleDamaged',
              obstacleId: data.obstacleId,
              health: repairObs.health
            });

            broadcast({
              type: 'playerScrapUpdate',
              playerId: playerId,
              scrap: player.scrap
            });
          }
          break;

        case 'toggleDoor':
          // Handle door open/close
          const door = gameState.obstacles.find(o => o.id === data.doorId && o.isDoor);
          if (door) {
            door.isOpen = !door.isOpen;
            broadcast({
              type: 'doorToggled',
              doorId: data.doorId,
              isOpen: door.isOpen
            });
          }
          break;

        case 'dropAbility':
          // Add dropped ability to server pickups
          gameState.pickups.push(data.pickup);

          // Broadcast to all players
          broadcast({
            type: 'pickupsUpdate',
            pickups: gameState.pickups
          });
          break;

        case 'collectAmmoCrate':
          const crate = gameState.ammoCrates.find(c => c.id === data.crateId);
          if (crate) {
            player.scrap += 10; // Collecting crate gives scrap
            gameState.ammoCrates = gameState.ammoCrates.filter(c => c.id !== data.crateId);

            broadcast({
              type: 'ammoCrateCollected',
              crateId: data.crateId,
              playerId: playerId
            });

            broadcast({
              type: 'playerScrapUpdate',
              playerId: playerId,
              scrap: player.scrap
            });
          }
          break;

        case 'upgradeBase':
          const capturePoint = gameState.capturePoints.find(cp => cp.id === data.capturePointId);
          if (capturePoint && capturePoint.owner === playerId) {
            const upgradeCosts = [0, 50, 100, 200]; // scrap cost for each level
            const nextLevel = capturePoint.level + 1;

            if (nextLevel < upgradeCosts.length && player.scrap >= upgradeCosts[nextLevel]) {
              player.scrap -= upgradeCosts[nextLevel];
              capturePoint.level = nextLevel;

              // Spawn guards based on level
              if (nextLevel === 1) {
                // Level 1: spawn 2 guards
                for (let i = 0; i < 2; i++) {
                  const angle = (Math.PI * 2 / 2) * i;
                  gameState.guards.push({
                    id: `guard_${capturePoint.id}_${i}`,
                    capturePointId: capturePoint.id,
                    owner: playerId,
                    x: capturePoint.x + Math.cos(angle) * 80,
                    y: capturePoint.y + Math.sin(angle) * 80,
                    angle: 0,
                    health: 100,
                    maxHealth: 100,
                    ammo: 50,
                    maxAmmo: 50,
                    weapon: 'pistol'
                  });
                }
              } else if (nextLevel === 2) {
                // Level 2: add 2 more guards
                const existingGuards = gameState.guards.filter(g => g.capturePointId === capturePoint.id).length;
                for (let i = existingGuards; i < existingGuards + 2; i++) {
                  const angle = (Math.PI * 2 / 4) * i;
                  gameState.guards.push({
                    id: `guard_${capturePoint.id}_${i}`,
                    capturePointId: capturePoint.id,
                    owner: playerId,
                    x: capturePoint.x + Math.cos(angle) * 80,
                    y: capturePoint.y + Math.sin(angle) * 80,
                    angle: 0,
                    health: 100,
                    maxHealth: 100,
                    ammo: 100,
                    maxAmmo: 100,
                    weapon: 'smg'
                  });
                }
              }

              broadcast({
                type: 'baseUpgraded',
                capturePointId: capturePoint.id,
                level: capturePoint.level,
                owner: playerId
              });

              broadcast({
                type: 'guardsUpdate',
                guards: gameState.guards
              });

              broadcast({
                type: 'playerScrapUpdate',
                playerId: playerId,
                scrap: player.scrap
              });
            }
          }
          break;

        case 'supplyGuard':
          const guard = gameState.guards.find(g => g.id === data.guardId);
          if (guard && guard.owner === playerId && player.scrap >= 5) {
            player.scrap -= 5;
            guard.ammo = Math.min(guard.maxAmmo, guard.ammo + 50);

            broadcast({
              type: 'guardSupplied',
              guardId: data.guardId,
              ammo: guard.ammo
            });

            broadcast({
              type: 'playerScrapUpdate',
              playerId: playerId,
              scrap: player.scrap
            });
          }
          break;

        case 'ping':
          sendToClient(ws, { type: 'pong' });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);
    gameState.players.delete(playerId);

    broadcast({
      type: 'playerLeft',
      playerId: playerId
    });
  });
});

// Cleanup old bullets periodically
setInterval(() => {
  const now = Date.now();
  gameState.bullets = gameState.bullets.filter(bullet => {
    return (now - bullet.id) < 5000; // Remove bullets older than 5 seconds
  });
}, 1000);

// Spawn ability pickups occasionally (rare spawns)
setInterval(() => {
  if (gameState.pickups.filter(p => p.type.startsWith('ability_')).length < 3) {
    const pos = findValidSpawnPosition();
    gameState.pickups.push({
      id: 'ability_' + Date.now(),
      type: 'ability_bladeswirl',
      x: pos.x,
      y: pos.y
    });

    broadcast({
      type: 'pickupsUpdate',
      pickups: gameState.pickups
    });

    console.log(`Spawned ability at (${Math.round(pos.x)}, ${Math.round(pos.y)})`);
  }
}, 60000); // Every 60 seconds

// Capture point progress game loop
setInterval(() => {
  gameState.capturePoints.forEach(cp => {
    // Count players in capture zone
    const playersInZone = Array.from(gameState.players.values()).filter(player => {
      const dx = player.x - cp.x;
      const dy = player.y - cp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < cp.radius && player.health > 0;
    });

    // If players are in zone
    if (playersInZone.length > 0) {
      playersInZone.forEach(player => {
        // Initialize progress for this player
        if (!cp.captureProgress[player.id]) {
          cp.captureProgress[player.id] = 0;
        }

        // If no owner or different owner, increase capture progress
        if (!cp.owner || cp.owner !== player.id) {
          cp.captureProgress[player.id] += 2; // 2% per tick (50 ticks to capture)

          // Capture complete
          if (cp.captureProgress[player.id] >= 100) {
            cp.owner = player.id;
            cp.captureProgress = {}; // Reset all progress
            cp.level = 0; // Reset to uncaptured state

            broadcast({
              type: 'baseCaptured',
              capturePointId: cp.id,
              owner: player.id
            });

            console.log(`Player ${player.id} captured ${cp.id}`);
          } else {
            // Send progress update
            broadcast({
              type: 'captureProgress',
              capturePointId: cp.id,
              playerId: player.id,
              progress: cp.captureProgress[player.id]
            });
          }
        }
      });
    } else {
      // Decay progress when no one is in zone
      Object.keys(cp.captureProgress).forEach(playerId => {
        cp.captureProgress[playerId] = Math.max(0, cp.captureProgress[playerId] - 1);
        if (cp.captureProgress[playerId] === 0) {
          delete cp.captureProgress[playerId];
        }
      });
    }
  });
}, 100); // Run every 100ms

// Building capture zone game loop
setInterval(() => {
  gameState.buildings.forEach(building => {
    // Check building integrity - lose ownership if too damaged
    if (building.ownerId && building.integrity < 40) {
      console.log(`Building ${building.id} lost due to low integrity (${building.integrity}%)`);
      building.ownerId = null;
      building.ownerName = null;
      building.captureProgress = {};
      broadcast({
        type: 'buildingLost',
        buildingId: building.id,
        reason: 'destroyed'
      });
    }

    // Count alive players in capture zone
    const playersInZone = Array.from(gameState.players.values()).filter(player => {
      const dx = player.x - building.captureZone.x;
      const dy = player.y - building.captureZone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < building.captureZone.radius && player.health > 0;
    });

    if (playersInZone.length > 0) {
      playersInZone.forEach(player => {
        // Initialize progress for this player
        if (!building.captureProgress[player.id]) {
          building.captureProgress[player.id] = 0;
        }

        // If building is owned by someone else, must neutralize first
        if (building.ownerId && building.ownerId !== player.id) {
          building.captureProgress[player.id] = Math.min(100, building.captureProgress[player.id] + 1); // Slower when contesting

          // Neutralize owner's progress
          if (building.captureProgress[building.ownerId] > 0) {
            building.captureProgress[building.ownerId] = Math.max(0, building.captureProgress[building.ownerId] - 2);
          }

          // If owner's progress hits 0, building becomes neutral
          if (building.captureProgress[building.ownerId] === 0) {
            building.ownerId = null;
            building.ownerName = null;
            broadcast({
              type: 'buildingNeutralized',
              buildingId: building.id,
              contesterId: player.id
            });
          }
        } else {
          // Normal capture (neutral or already owned by this player)
          building.captureProgress[player.id] = Math.min(100, building.captureProgress[player.id] + 2); // 2% per tick = 50 seconds total

          // Capture complete!
          if (building.captureProgress[player.id] >= 100 && building.ownerId !== player.id) {
            building.ownerId = player.id;
            building.ownerName = player.name || player.id;
            building.captureProgress = { [player.id]: 100 }; // Reset other players' progress

            broadcast({
              type: 'buildingCaptured',
              buildingId: building.id,
              ownerId: player.id,
              ownerName: building.ownerName
            });

            console.log(`Player ${building.ownerName} captured ${building.id}!`);
          }
        }

        // Send progress update
        broadcast({
          type: 'buildingCaptureProgress',
          buildingId: building.id,
          playerId: player.id,
          progress: building.captureProgress[player.id],
          ownerId: building.ownerId
        });
      });
    } else {
      // Decay progress when no one is in zone
      Object.keys(building.captureProgress).forEach(playerId => {
        if (playerId !== building.ownerId) { // Don't decay owner's progress
          building.captureProgress[playerId] = Math.max(0, building.captureProgress[playerId] - 0.5);
          if (building.captureProgress[playerId] === 0) {
            delete building.captureProgress[playerId];
          }
        }
      });
    }
  });
}, 100); // Run every 100ms

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Survival Shooter server running on port ${PORT}`);
  console.log(`Players can connect to ws://localhost:${PORT}`);
});
