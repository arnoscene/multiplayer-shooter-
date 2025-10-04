// Terrain generation module for the multiplayer shooter game

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

  // Step 2: Connect buildings within same zone
  for (let i = 0; i < buildings.length; i++) {
    const buildingA = buildings[i];

    // Find closest building in same zone or nearest neighbor
    let closestDist = Infinity;
    let closestBuilding = null;

    for (let j = 0; j < buildings.length; j++) {
      if (i === j) continue;
      const buildingB = buildings[j];
      const dist = Math.hypot(buildingA.x - buildingB.x, buildingA.y - buildingB.y);

      // Prioritize same-zone connections
      const sameZone = buildingA.zoneName === buildingB.zoneName;
      const effectiveDist = sameZone ? dist * 0.5 : dist; // Half distance for same zone

      if (effectiveDist < closestDist) {
        closestDist = effectiveDist;
        closestBuilding = buildingB;
      }
    }

    if (closestBuilding && closestDist < 2000) { // Only connect if close enough
      // Create road path between buildings
      const startX = buildingA.x + buildingA.width / 2;
      const startY = buildingA.y + buildingA.height / 2;
      const endX = closestBuilding.x + closestBuilding.width / 2;
      const endY = closestBuilding.y + closestBuilding.height / 2;

      // Manhattan path (simpler than curved)
      const roadWidth = tileSize;

      // Horizontal segment
      for (let x = Math.min(startX, endX); x < Math.max(startX, endX); x += tileSize) {
        for (let offsetY = -roadWidth / 2; offsetY < roadWidth / 2; offsetY += tileSize) {
          const rx = Math.floor(x / tileSize) * tileSize;
          const ry = Math.floor((startY + offsetY) / tileSize) * tileSize;
          const tile = terrain.find(t => t.x === rx && t.y === ry);
          if (tile && tile.type !== 'water') {
            tile.type = 'road';
            tile.speedModifier = 1.3; // Faster on roads
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
            tile.speedModifier = 1.3; // Faster on roads
          }
        }
      }
    }
  }

  console.log('Generated perimeter roads around all buildings');
  console.log('Generated connecting roads between buildings');
}

module.exports = {
  generateTerrain,
  generateRoads,
  isGrassland
};
