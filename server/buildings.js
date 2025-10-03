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

// Generate buildings with BSP room layout
function generateBuildings(gameState, isGrassland) {
  const voxelSize = 20;
  const buildingCount = 20;
  let buildingsPlaced = 0;
  let attempts = 0;
  const maxAttempts = 200;
  const buildings = [];

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
    if (!isGrassland(buildingX, buildingY, buildingWidth, buildingHeight, gameState.terrain)) {
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

  // Calculate total blocks for each building
  gameState.buildings.forEach(building => {
    const blockCount = gameState.obstacles.filter(obs =>
      obs.id.startsWith(`building_${gameState.buildings.indexOf(building)}_`)
    ).length;
    building.totalBlocks = blockCount;
  });

  const blockCount = gameState.obstacles.filter(o => o.isWall).length;
  const floorCount = gameState.floors.length;

  console.log(`Scattered ${buildingsPlaced} buildings across grasslands (${attempts} attempts)`);
  console.log(`Created ${blockCount} building blocks with ${floorCount} floor tiles`);
  console.log(`Created ${gameState.buildings.length} capturable buildings`);

  return buildings;
}

module.exports = {
  generateBuildings
};
