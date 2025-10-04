// Terrain generation module for the multiplayer shooter game

// Fixed seed for deterministic terrain generation
// This allows client-side generation of identical terrain
const TERRAIN_SEED = 123456789;

// Simple Perlin-like noise generator with seeded randomness
function createNoise(seed = 12345) {
  const permutation = [];
  for (let i = 0; i < 256; i++) permutation[i] = i;

  // Seeded random number generator
  let currentSeed = seed;
  const seededRandom = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  // Shuffle with seeded randomness
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
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

// Helper function to check if area is grassland
function isGrassland(x, y, width, height, terrain) {
  const tileSize = 50;
  let grassCount = 0;
  let totalTiles = 0;

  for (let checkX = x; checkX < x + width; checkX += tileSize) {
    for (let checkY = y; checkY < y + height; checkY += tileSize) {
      const tile = terrain.find(t =>
        checkX >= t.x && checkX < t.x + t.size &&
        checkY >= t.y && checkY < t.y + t.size
      );
      if (tile) {
        totalTiles++;
        if (tile.type === 'grass') grassCount++;
      }
    }
  }

  return totalTiles > 0 && (grassCount / totalTiles) > 0.8; // 80% must be grass
}

// Generate terrain with Perlin noise
function generateTerrain() {
  const terrain = [];
  const tileSize = 50;
  const mapSize = 5000;
  const noise = createNoise(TERRAIN_SEED);

  for (let x = 0; x < mapSize; x += tileSize) {
    for (let y = 0; y < mapSize; y += tileSize) {
      let terrainType = 'grass';
      let speedModifier = 1.0;

      // Much larger scale for coherent biomes
      const scale1 = 0.003; // Very large biomes (lakes, forests)
      const scale2 = 0.008; // Regional variation
      const scale3 = 0.02;  // Local detail

      const noise1 = (noise(x * scale1, y * scale1) + 1) / 2;
      const noise2 = (noise(x * scale2, y * scale2) + 1) / 2;
      const noise3 = (noise(x * scale3, y * scale3) + 1) / 2;

      // Heavily favor large-scale features for coherent biomes
      const baseNoise = noise1 * 0.75 + noise2 * 0.20 + noise3 * 0.05;

      // Use separate noise layer for moisture (affects grass vs forest)
      const moistureNoise = (noise(x * 0.004 + 1000, y * 0.004 + 1000) + 1) / 2;

      // Create distinct biomes with clearer boundaries
      if (baseNoise < 0.30) {
        // Water bodies (lakes, rivers)
        terrainType = 'water';
        speedModifier = 0.4;
      } else if (baseNoise < 0.35) {
        // Shoreline/wetlands transition
        terrainType = 'mud';
        speedModifier = 0.6;
      } else if (baseNoise < 0.70) {
        // Main land area - varies by moisture
        if (moistureNoise > 0.6) {
          terrainType = 'forest';
          speedModifier = 0.8;
        } else {
          terrainType = 'grass';
          speedModifier = 1.0;
        }
      } else if (baseNoise < 0.75) {
        // Transition to highlands
        terrainType = 'mud';
        speedModifier = 0.7;
      } else {
        // Highland forests
        terrainType = 'forest';
        speedModifier = 0.8;
      }

      terrain.push({
        x: x,
        y: y,
        size: tileSize,
        type: terrainType,
        speedModifier: speedModifier
      });
    }
  }

  console.log(`Generated ${terrain.length} organic terrain tiles`);
  return terrain;
}

// Generate roads connecting buildings
function generateRoads(buildings, terrain) {
  const tileSize = 50;

  // Step 1: Create perimeter roads around each building
  for (const building of buildings) {
    const padding = 30; // Distance from building edge to road
    const roadWidth = tileSize;

    // North perimeter
    for (let x = building.x - padding - roadWidth; x < building.x + building.width + padding + roadWidth; x += tileSize) {
      const rx = Math.floor(x / tileSize) * tileSize;
      const ry = Math.floor((building.y - padding) / tileSize) * tileSize;
      const tile = terrain.find(t => t.x === rx && t.y === ry);
      if (tile && tile.type !== 'water') {
        tile.type = 'road';
        tile.speedModifier = 1.3;
      }
    }

    // South perimeter
    for (let x = building.x - padding - roadWidth; x < building.x + building.width + padding + roadWidth; x += tileSize) {
      const rx = Math.floor(x / tileSize) * tileSize;
      const ry = Math.floor((building.y + building.height + padding) / tileSize) * tileSize;
      const tile = terrain.find(t => t.x === rx && t.y === ry);
      if (tile && tile.type !== 'water') {
        tile.type = 'road';
        tile.speedModifier = 1.3;
      }
    }

    // West perimeter
    for (let y = building.y - padding; y < building.y + building.height + padding; y += tileSize) {
      const rx = Math.floor((building.x - padding) / tileSize) * tileSize;
      const ry = Math.floor(y / tileSize) * tileSize;
      const tile = terrain.find(t => t.x === rx && t.y === ry);
      if (tile && tile.type !== 'water') {
        tile.type = 'road';
        tile.speedModifier = 1.3;
      }
    }

    // East perimeter
    for (let y = building.y - padding; y < building.y + building.height + padding; y += tileSize) {
      const rx = Math.floor((building.x + building.width + padding) / tileSize) * tileSize;
      const ry = Math.floor(y / tileSize) * tileSize;
      const tile = terrain.find(t => t.x === rx && t.y === ry);
      if (tile && tile.type !== 'water') {
        tile.type = 'road';
        tile.speedModifier = 1.3;
      }
    }
  }

  // Step 2: Create road network using minimum spanning tree per zone
  const zones = {};

  // Group buildings by zone
  for (const building of buildings) {
    const zoneName = building.zoneName || 'default';
    if (!zones[zoneName]) {
      zones[zoneName] = [];
    }
    zones[zoneName].push(building);
  }

  // Helper function to create road between two buildings
  function createRoad(buildingA, buildingB) {
    const startX = buildingA.x + buildingA.width / 2;
    const startY = buildingA.y + buildingA.height / 2;
    const endX = buildingB.x + buildingB.width / 2;
    const endY = buildingB.y + buildingB.height / 2;

    const roadWidth = tileSize;

    // Horizontal segment
    for (let x = Math.min(startX, endX); x < Math.max(startX, endX); x += tileSize) {
      for (let offsetY = -roadWidth / 2; offsetY < roadWidth / 2; offsetY += tileSize) {
        const rx = Math.floor(x / tileSize) * tileSize;
        const ry = Math.floor((startY + offsetY) / tileSize) * tileSize;
        const tile = terrain.find(t => t.x === rx && t.y === ry);
        if (tile && tile.type !== 'water') {
          tile.type = 'road';
          tile.speedModifier = 1.3;
        }
      }
    }

    // Vertical segment
    for (let y = Math.min(startY, endY); y < Math.max(startY, endY); y += tileSize) {
      for (let offsetX = -roadWidth / 2; offsetX < roadWidth / 2; offsetX += tileSize) {
        const rx = Math.floor((endX + offsetX) / tileSize) * tileSize;
        const ry = Math.floor(y / tileSize) * tileSize;
        const tile = terrain.find(t => t.x === rx && t.y === ry);
        if (tile && tile.type !== 'water') {
          tile.type = 'road';
          tile.speedModifier = 1.3;
        }
      }
    }
  }

  // Connect buildings within each zone using simple MST approach
  for (const zoneName in zones) {
    const zoneBuildings = zones[zoneName];
    if (zoneBuildings.length < 2) continue;

    const connected = new Set();
    connected.add(zoneBuildings[0]);

    // Connect each building to the nearest already-connected building
    while (connected.size < zoneBuildings.length) {
      let minDist = Infinity;
      let closestPair = null;

      for (const connectedBuilding of connected) {
        for (const building of zoneBuildings) {
          if (connected.has(building)) continue;

          const dist = Math.hypot(
            connectedBuilding.x - building.x,
            connectedBuilding.y - building.y
          );

          if (dist < minDist) {
            minDist = dist;
            closestPair = [connectedBuilding, building];
          }
        }
      }

      if (closestPair) {
        createRoad(closestPair[0], closestPair[1]);
        connected.add(closestPair[1]);
      } else {
        break;
      }
    }
  }

  // Also connect nearest zones to create a full map network
  const zoneNames = Object.keys(zones);
  if (zoneNames.length > 1) {
    const zoneConnected = new Set();
    zoneConnected.add(zoneNames[0]);

    while (zoneConnected.size < zoneNames.length) {
      let minDist = Infinity;
      let closestPair = null;

      for (const connectedZone of zoneConnected) {
        for (const zoneName of zoneNames) {
          if (zoneConnected.has(zoneName)) continue;

          // Find closest buildings between zones
          for (const buildingA of zones[connectedZone]) {
            for (const buildingB of zones[zoneName]) {
              const dist = Math.hypot(
                buildingA.x - buildingB.x,
                buildingA.y - buildingB.y
              );

              if (dist < minDist && dist < 3000) { // Max inter-zone distance
                minDist = dist;
                closestPair = [buildingA, buildingB, zoneName];
              }
            }
          }
        }
      }

      if (closestPair) {
        createRoad(closestPair[0], closestPair[1]);
        zoneConnected.add(closestPair[2]);
      } else {
        break;
      }
    }
  }

  console.log('Generated perimeter roads around all buildings');
  console.log('Generated connecting roads between buildings');
}

module.exports = {
  generateTerrain,
  generateRoads,
  isGrassland,
  TERRAIN_SEED
};
