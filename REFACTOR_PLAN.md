# Refactoring Plan - Multiplayer Shooter Game

## Current State
- **Single monolithic file**: `shooter.html` (~3000+ lines)
- All game logic, rendering, networking in one file
- Difficult to maintain and add features
- Hard to debug and test

## Goals
1. **Modular architecture** - Separate concerns into focused modules
2. **Easier maintenance** - Find and fix bugs faster
3. **Feature additions** - Add new systems without breaking existing code
4. **Better organization** - Clear structure for future development

---

## Proposed File Structure

```
/client/
├── index.html                 # Main entry point (minimal HTML)
├── styles/
│   └── game.css              # All game styles
├── js/
│   ├── main.js               # Entry point, initialization
│   ├── core/
│   │   ├── GameClient.js     # Main game class
│   │   ├── NetworkManager.js # WebSocket handling
│   │   └── InputManager.js   # Keyboard/mouse/touch input
│   ├── rendering/
│   │   ├── Renderer.js       # Main rendering engine
│   │   ├── TerrainRenderer.js
│   │   ├── BuildingRenderer.js
│   │   ├── PlayerRenderer.js
│   │   └── UIRenderer.js     # HUD, menus, overlays
│   ├── systems/
│   │   ├── BuildingSystem.js # Building capture/hacking logic
│   │   ├── WeaponSystem.js   # Weapon handling
│   │   ├── AbilitySystem.js  # Player abilities
│   │   └── InventorySystem.js
│   ├── entities/
│   │   ├── Player.js
│   │   ├── Building.js
│   │   ├── Bullet.js
│   │   └── Pickup.js
│   └── utils/
│       ├── math.js           # Vector math, collision detection
│       ├── constants.js      # Game constants
│       └── helpers.js        # Utility functions

/server/
├── survival-server.js        # Keep as main entry
├── systems/
│   ├── BuildingSystem.js     # Building logic
│   ├── CombatSystem.js       # Damage, bullets
│   └── TerrainSystem.js      # Terrain management
├── entities/
│   ├── Player.js
│   ├── Building.js
│   └── GameState.js
└── utils/
    └── helpers.js
```

---

## Refactoring Phases

### Phase 1: Extract Constants & Utils (Low Risk)
**Goal**: Pull out constants and utility functions first

**Files to create**:
- `client/js/utils/constants.js` - Game constants (PLAYER_SIZE, BULLET_SPEED, etc.)
- `client/js/utils/math.js` - Vector math, collision detection
- `client/js/utils/helpers.js` - Helper functions

**Benefits**:
- Easy wins, low risk
- Makes code more readable
- Reduces duplication

**Effort**: 1-2 hours

---

### Phase 2: Extract Rendering (Medium Risk)
**Goal**: Separate all rendering logic from game logic

**Files to create**:
- `client/js/rendering/Renderer.js` - Main renderer class
- `client/js/rendering/TerrainRenderer.js` - Terrain drawing
- `client/js/rendering/BuildingRenderer.js` - Buildings, walls, debris
- `client/js/rendering/PlayerRenderer.js` - Players, weapons, abilities
- `client/js/rendering/UIRenderer.js` - HUD, toolbelt, menus

**Current rendering locations in shooter.html**:
- Lines 2100-2400: Main render loop
- Terrain, obstacles, players, bullets, pickups, buildings

**Benefits**:
- Cleaner separation of concerns
- Easier to optimize rendering
- Can add visual effects without touching game logic

**Effort**: 3-4 hours

---

### Phase 3: Extract Network Layer (Medium Risk)
**Goal**: Isolate all WebSocket communication

**Files to create**:
- `client/js/core/NetworkManager.js`

**Features**:
```javascript
class NetworkManager {
  connect(url)
  send(type, data)
  on(messageType, callback)
  // Handle reconnection, message queuing
}
```

**Current network locations**:
- Lines 800-1100: WebSocket message handlers
- Various `ws.send()` calls throughout code

**Benefits**:
- Centralized network logic
- Easier to add offline mode
- Better error handling

**Effort**: 2-3 hours

---

### Phase 4: Extract Game Systems (High Value)
**Goal**: Modularize major game features

**Building System**:
```javascript
// client/js/systems/BuildingSystem.js
class BuildingSystem {
  startHack(buildingId)
  upgradeBuilding(buildingId)
  repairWall(obstacleId)
  updateHackProgress(buildingId, progress)
}
```

**Weapon System**:
```javascript
// client/js/systems/WeaponSystem.js
class WeaponSystem {
  switchWeapon(weaponType)
  fire(position, angle)
  reload()
  canFire()
}
```

**Ability System**:
```javascript
// client/js/systems/AbilitySystem.js
class AbilitySystem {
  activateAbility(abilityType)
  deactivateAbility()
  pickupAbility(abilityType)
  dropAbility()
}
```

**Benefits**:
- Each system is self-contained
- Easy to add new features
- Better testing
- Clear responsibilities

**Effort**: 5-6 hours

---

### Phase 5: Extract Input Handling (Medium Risk)
**Goal**: Centralize all keyboard, mouse, touch input

**Files to create**:
- `client/js/core/InputManager.js`

**Features**:
```javascript
class InputManager {
  onKeyDown(key, callback)
  onKeyUp(key, callback)
  onMouseMove(callback)
  onMouseClick(callback)
  onTouch(callback)
  isKeyPressed(key)
}
```

**Benefits**:
- Support for key remapping
- Better mobile controls
- Gamepad support possible

**Effort**: 2-3 hours

---

### Phase 6: Create Main Game Class (High Risk, High Value)
**Goal**: Orchestrate all systems

**Files to create**:
- `client/js/core/GameClient.js`
- `client/js/main.js`

```javascript
// GameClient.js
class GameClient {
  constructor() {
    this.network = new NetworkManager()
    this.renderer = new Renderer()
    this.input = new InputManager()
    this.buildings = new BuildingSystem()
    this.weapons = new WeaponSystem()
    this.abilities = new AbilitySystem()
  }

  init()
  update(deltaTime)
  render()
}

// main.js
const game = new GameClient()
game.init()
```

**Benefits**:
- Clear entry point
- Easy to understand flow
- Game loop is explicit

**Effort**: 3-4 hours

---

## Server-Side Refactoring

### Current Issues:
- `survival-server.js` is ~1100 lines
- Message handlers are all in switch statement
- Systems are mixed together

### Proposed Changes:

```
/server/
├── survival-server.js       # Slim entry point
├── GameServer.js            # Main server class
├── systems/
│   ├── PlayerSystem.js
│   ├── BuildingSystem.js
│   ├── CombatSystem.js
│   └── TerrainSystem.js
└── handlers/
    ├── PlayerHandlers.js
    ├── BuildingHandlers.js
    └── CombatHandlers.js
```

**Benefits**:
- Each system in own file
- Easier to add features
- Better error handling
- Can unit test systems

**Effort**: 4-5 hours

---

## Migration Strategy

### Option A: Gradual Migration (RECOMMENDED)
1. Create new module files alongside `shooter.html`
2. Move code piece by piece
3. Test after each change
4. Keep `shooter.html` working until fully migrated
5. Delete `shooter.html` when complete

**Pros**:
- Lower risk
- Can roll back easily
- Test incrementally

**Cons**:
- Takes longer
- Code duplication temporarily

---

### Option B: Big Bang Rewrite
1. Create all new files at once
2. Move all code in one go
3. Fix everything at the end

**Pros**:
- Faster to complete

**Cons**:
- High risk
- Everything breaks until done
- Hard to debug

---

## Recommended Approach

**Week 1**: Phases 1-2 (Constants, Utils, Rendering)
- Low risk changes first
- Build confidence
- Still playable

**Week 2**: Phases 3-4 (Network, Systems)
- Higher value changes
- More complex

**Week 3**: Phases 5-6 (Input, Main Class)
- Polish and completion
- Remove old code

---

## Benefits After Refactoring

### For Development:
- ✅ Add features without breaking existing code
- ✅ Fix bugs faster (know where to look)
- ✅ Reuse code (e.g., rendering in different modes)
- ✅ Test individual systems
- ✅ Multiple developers can work without conflicts

### For New Features:
- Door codes → Add to `BuildingSystem.js`
- Turrets → Create `TurretSystem.js`
- New weapons → Extend `WeaponSystem.js`
- Crafting → Create `CraftingSystem.js`

### For Performance:
- Can optimize rendering separately
- Can profile each system
- Can lazy-load modules

---

## Next Steps

1. **Review this plan** - Discuss and adjust
2. **Choose phase to start** - Recommend Phase 1
3. **Create first module** - Start with constants
4. **Test thoroughly** - Make sure nothing breaks
5. **Repeat** - One phase at a time

---

## Open Questions

1. Do we want TypeScript for better type safety?
2. Should we use a bundler (Webpack/Vite)?
3. Do we need a state management library?
4. Should we add automated tests?
5. Do we want to support older browsers?

---

## Conclusion

This refactoring will:
- Make the codebase **sustainable**
- Enable **faster feature development**
- Reduce **bugs and technical debt**
- Create a **professional structure**

**Total Effort**: ~20-25 hours over 2-3 weeks
**Risk Level**: Medium (with gradual migration)
**Value**: Very High
