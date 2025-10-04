// Building generation module using Binary Space Partitioning (BSP)

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

// Generate buildings with BSP room layout in organized zones
function generateBuildings(gameState, isGrassland) {
  const voxelSize = 20;
  const buildings = [];
  let buildingIndex = 0;

  // Define map zones with material tiers (wood/sand -> brick/stone -> metal)
  const zones = [
    // Zone 1: Military Base (center, 1 large building) - Tier 3: Metal
    {
      name: 'military',
      centerX: 2500,
      centerY: 2500,
      count: 1,
      sizeMin: 500,
      sizeMax: 500,
      material: 'metal',
      spread: 0
    },
    // Zone 2: Research Labs (northwest, 4 clustered buildings) - Tier 2: Brick/Stone
    {
      name: 'research',
      centerX: 1200,
      centerY: 1200,
      count: 4,
      sizeMin: 300,
      sizeMax: 400,
      material: ['brick', 'stone'],
      spread: 300
    },
    // Zone 3: Small Town (southeast, 10 residential buildings) - Tier 1: Wood/Sand
    {
      name: 'town',
      centerX: 3800,
      centerY: 3800,
      count: 10,
      sizeMin: 250,
      sizeMax: 350,
      material: ['wood', 'sand'],
      spread: 600
    },
    // Zone 4: Outpost Bunkers (scattered on edges, 5 small fortified) - Tier 2: Stone
    {
      name: 'outpost',
      positions: [
        { x: 800, y: 2500 },   // West
        { x: 4200, y: 2500 },  // East
        { x: 2500, y: 800 },   // North
        { x: 2500, y: 4200 },  // South
        { x: 1500, y: 4000 }   // Southwest
      ],
      count: 5,
      sizeMin: 200,
      sizeMax: 250,
      material: 'stone',
      spread: 100
    }
  ];

  // Generate buildings for each zone
  for (const zone of zones) {
    for (let i = 0; i < zone.count; i++) {
      let attempts = 0;
      const maxAttempts = 50;
      let placed = false;

      while (!placed && attempts < maxAttempts) {
        attempts++;

        // Position based on zone type
        let buildingX, buildingY;
        if (zone.positions) {
          // Fixed positions with small random offset
          const pos = zone.positions[i];
          buildingX = pos.x + (Math.random() - 0.5) * zone.spread;
          buildingY = pos.y + (Math.random() - 0.5) * zone.spread;
        } else {
          // Random within zone spread
          buildingX = zone.centerX + (Math.random() - 0.5) * zone.spread;
          buildingY = zone.centerY + (Math.random() - 0.5) * zone.spread;
        }

        // Building size
        const buildingWidth = zone.sizeMin + Math.random() * (zone.sizeMax - zone.sizeMin);
        const buildingHeight = zone.sizeMin + Math.random() * (zone.sizeMax - zone.sizeMin);

        // Material type
        let buildingType;
        if (Array.isArray(zone.material)) {
          buildingType = zone.material[Math.floor(Math.random() * zone.material.length)];
        } else {
          buildingType = zone.material;
        }

        // Check if this area is grassland (skip for military base - clear terrain for it)
        if (zone.name !== 'military' && !isGrassland(buildingX, buildingY, buildingWidth, buildingHeight, gameState.terrain)) {
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

        // Split 2-3 times to create rooms (more splits for larger buildings)
        let splits = 2 + Math.floor(Math.random() * 2);
        if (zone.name === 'military') splits = 4; // Military base has more rooms
        const leaves = [bsp];

        for (let s = 0; s < splits; s++) {
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
              else if (isExteriorWall && vy === chunksY - 1) {
                // 3-block wide door in center of south wall
                const doorCenter = Math.floor(chunksX / 2);
                if (vx >= doorCenter - 1 && vx <= doorCenter + 1) {
                  blockType = 'door';
                } else if (Math.random() < 0.15) {
                  blockType = 'window';
                }
              }
              else if (isExteriorWall && Math.random() < 0.15) blockType = 'window';

              // HP based on material tier: wood/sand=1000, brick/stone=1500, metal=2000
              let hp = 1000; // Tier 1 default (wood/sand)
              if (buildingType === 'brick' || buildingType === 'stone') {
                hp = 1500; // Tier 2
              } else if (buildingType === 'metal') {
                hp = 2000; // Tier 3
              }

              gameState.obstacles.push({
                id: `building_${buildingIndex}_${vx}_${vy}`,
                x: worldX,
                y: worldY,
                width: voxelSize,
                height: voxelSize,
                health: hp,
                maxHealth: hp,
                blockType: blockType,
                isWall: true,
                isDoor: blockType === 'door',
                isOpen: false,
                buildingId: buildingIndex // Track which building this block belongs to
              });
            } else if (insideRoom) {
              // Add floor tile for walkable room area
              gameState.floors.push({
                id: `floor_${buildingIndex}_${vx}_${vy}`,
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
          rooms: rooms,
          zoneName: zone.name
        });

        // Add building to gameState with capture zone
        const captureX = buildingX + buildingWidth / 2;
        const captureY = buildingY + buildingHeight / 2;

        gameState.buildings.push({
          id: `building_${buildingIndex}`,
          x: buildingX,
          y: buildingY,
          width: buildingWidth,
          height: buildingHeight,
          rooms: rooms,
          zoneName: zone.name,
          buildingType: buildingType,

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
          integrity: 100,

          // Upgrade terminal (placed in first room)
          terminal: {
            x: captureX,
            y: captureY,
            radius: 50 // Interaction range
          }
        });

        buildingIndex++;
        placed = true;
      }
    }
  }

  // Calculate total blocks for each building
  gameState.buildings.forEach((building, index) => {
    const blockCount = gameState.obstacles.filter(obs =>
      obs.buildingId === index
    ).length;
    building.totalBlocks = blockCount;
  });

  const blockCount = gameState.obstacles.filter(o => o.isWall).length;
  const floorCount = gameState.floors.length;

  console.log(`Created ${buildingIndex} buildings in organized zones:`);
  console.log(`  - Military Base: 1 large fortified structure`);
  console.log(`  - Research Labs: 4 medium buildings`);
  console.log(`  - Small Town: 10 residential buildings`);
  console.log(`  - Outposts: 5 fortified bunkers`);
  console.log(`Total: ${blockCount} building blocks with ${floorCount} floor tiles`);

  return buildings;
}

module.exports = {
  generateBuildings
};
