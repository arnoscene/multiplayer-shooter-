// Survival Shooter Server
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');
const { generateTerrain, generateRoads, isGrassland } = require('./terrain');
const { generateBuildings } = require('./buildings');

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
gameState.terrain = generateTerrain();
const buildings = generateBuildings(gameState, isGrassland);
generateRoads(buildings, gameState.terrain);
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
            let damage = data.damage || 20;

            // Check if this block belongs to a captured building (10x protection)
            if (obstacle.buildingId !== undefined) {
              const building = gameState.buildings[obstacle.buildingId];
              if (building && building.ownerId && building.ownerId !== playerId) {
                // Enemy's captured building - reduce damage by 10x
                damage = damage / 10;
              }
            }

            obstacle.health -= damage;

            if (obstacle.health <= 0) {
              // Convert to debris/rubble tile (walkable, can be rebuilt)
              obstacle.isDestroyed = true;
              obstacle.isWall = false; // No longer blocks movement
              obstacle.health = 0;
              obstacle.originalType = obstacle.blockType; // Remember original material
              obstacle.blockType = 'debris'; // New debris type

              // Award scrap to player who destroyed it
              player.scrap += 2;

              broadcast({
                type: 'obstacleDestroyed',
                obstacleId: data.obstacleId,
                x: obstacle.x,
                y: obstacle.y,
                width: obstacle.width,
                height: obstacle.height,
                isDebris: true // Tell clients it's now debris
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
            let damage = data.damage;

            // Check if this block belongs to a captured building (10x protection)
            if (hammerObs.buildingId !== undefined) {
              const building = gameState.buildings[hammerObs.buildingId];
              if (building && building.ownerId && building.ownerId !== playerId) {
                // Enemy's captured building - reduce damage by 10x
                damage = damage / 10;
              }
            }

            hammerObs.health -= damage;

            if (hammerObs.health <= 0) {
              // Convert to debris/rubble tile (walkable, can be rebuilt)
              hammerObs.isDestroyed = true;
              hammerObs.isWall = false; // No longer blocks movement
              hammerObs.health = 0;
              hammerObs.originalType = hammerObs.blockType; // Remember original material
              hammerObs.blockType = 'debris'; // New debris type

              // Award scrap
              player.scrap += 2;

              broadcast({
                type: 'obstacleDestroyed',
                obstacleId: data.obstacleId,
                x: hammerObs.x,
                y: hammerObs.y,
                width: hammerObs.width,
                height: hammerObs.height,
                isDebris: true // Tell clients it's now debris
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
            // Cost 1 scrap to repair 100 health
            player.scrap -= 1;

            // If it's debris, restore it to a proper wall
            if (repairObs.blockType === 'debris') {
              repairObs.blockType = repairObs.originalType || 'wood';
              repairObs.isWall = true;
              repairObs.isDestroyed = false;
              repairObs.health = 100; // Start with 100 HP when rebuilding from debris
            } else {
              // Normal repair: restore 100 health (up to max)
              repairObs.health = Math.min(repairObs.maxHealth, repairObs.health + 100);
            }

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

        case 'startHack':
          // Handle starting a hack on a building
          const buildingToHack = gameState.buildings.find(b => b.id === data.buildingId);
          if (buildingToHack && buildingToHack.ownerId !== playerId) {
            // Initialize hack progress if not exists
            if (!buildingToHack.hackProgress) buildingToHack.hackProgress = {};

            // Start hack (10 second timer = 100% progress)
            buildingToHack.hackProgress[playerId] = {
              progress: 0,
              startTime: Date.now(),
              duration: 10000 // 10 seconds
            };

            ws.send(JSON.stringify({
              type: 'hackStarted',
              buildingId: data.buildingId,
              duration: 10000
            }));
          }
          break;

        case 'terminalUpgrade':
          // Handle upgrading all walls in a captured building
          const buildingToUpgrade = gameState.buildings.find(b => b.id === data.buildingId);
          if (buildingToUpgrade && buildingToUpgrade.ownerId === playerId) {
            const upgradeCost = 50; // Costs 50 scrap to upgrade all walls

            if (player.scrap >= upgradeCost) {
              // Deduct scrap
              player.scrap -= upgradeCost;

              // Upgrade all blocks in this building
              const buildingIndex = gameState.buildings.indexOf(buildingToUpgrade);
              const buildingBlocks = gameState.obstacles.filter(obs => obs.buildingId === buildingIndex);

              for (const block of buildingBlocks) {
                if (!block.isDestroyed) {
                  // Increase max health by 50%
                  block.maxHealth = Math.floor(block.maxHealth * 1.5);
                  block.health = block.maxHealth; // Fully heal during upgrade
                }
              }

              broadcast({
                type: 'buildingUpgraded',
                buildingId: data.buildingId,
                newMaxHealth: buildingBlocks[0]?.maxHealth || 60
              });

              broadcast({
                type: 'playerScrapUpdate',
                playerId: playerId,
                scrap: player.scrap
              });

              ws.send(JSON.stringify({
                type: 'terminalMessage',
                message: `Building upgraded! All walls health increased by 50%`
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'terminalMessage',
                message: `Not enough scrap! Need ${upgradeCost}, have ${player.scrap}`
              }));
            }
          } else {
            ws.send(JSON.stringify({
              type: 'terminalMessage',
              message: 'You must own this building to upgrade it!'
            }));
          }
          break;

        case 'toggleDoor':
          // Handle door open/close - toggle all 3 blocks that make up the door
          const door = gameState.obstacles.find(o => o.id === data.doorId && o.isDoor);
          if (door) {
            // Extract building ID from door ID (e.g., "building_0_5_9" -> "building_0")
            const buildingId = door.id.split('_').slice(0, 2).join('_');

            // Find all door blocks for this building and toggle them
            const doorBlocks = gameState.obstacles.filter(o =>
              o.isDoor && o.id.startsWith(buildingId + '_')
            );

            const newState = !door.isOpen;
            doorBlocks.forEach(doorBlock => {
              doorBlock.isOpen = newState;
            });

            // Broadcast all door IDs that were toggled
            broadcast({
              type: 'doorToggled',
              doorIds: doorBlocks.map(d => d.id),
              isOpen: newState
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
    // Process active hacks
    if (building.hackProgress) {
      const now = Date.now();
      Object.keys(building.hackProgress).forEach(playerId => {
        const hack = building.hackProgress[playerId];
        const elapsed = now - hack.startTime;
        hack.progress = Math.min(100, (elapsed / hack.duration) * 100);

        // Send progress update
        broadcast({
          type: 'hackProgress',
          buildingId: building.id,
          playerId: playerId,
          progress: hack.progress
        });

        // Hack complete!
        if (hack.progress >= 100) {
          building.ownerId = playerId;
          const player = gameState.players.get(playerId);
          building.ownerName = player?.name || playerId;
          building.captureProgress = {}; // Clear old capture progress
          building.hackProgress = {}; // Clear hack progress

          broadcast({
            type: 'buildingCaptured',
            buildingId: building.id,
            ownerId: playerId,
            ownerName: building.ownerName
          });

          console.log(`Player ${building.ownerName} hacked ${building.id}!`);
        }
      });
    }

    // Check building integrity - lose ownership if too damaged
    if (building.ownerId && building.integrity < 40) {
      console.log(`Building ${building.id} lost due to low integrity (${building.integrity}%)`);
      building.ownerId = null;
      building.ownerName = null;
      building.captureProgress = {};
      building.hackProgress = {};
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
