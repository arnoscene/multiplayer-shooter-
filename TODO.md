# Multiplayer Shooter Game - Feature Roadmap

## ✅ Completed Features

### Core Gameplay
- [x] Top-down multiplayer shooter with WebSocket
- [x] Multiple weapons (Pistol, SMG, Shotgun, Rifle, Sniper, Rocket Launcher)
- [x] Ammo system with finite ammunition
- [x] Health and armor system
- [x] Weapon pickups and drops
- [x] Player respawning with invulnerability
- [x] Self-damage from rocket explosions

### World Generation
- [x] Procedural terrain with Perlin noise (grass, road, mud, water, forest)
- [x] Speed modifiers based on terrain type
- [x] Procedural buildings using BSP (Binary Space Partitioning)
- [x] Walkable building interiors with rooms (4-8 rooms per building)
- [x] Floor tiles distinct from terrain
- [x] Buildings now 250-500px (larger for better gameplay)

### Building & Destruction
- [x] 20px destructible building blocks (voxel-based)
- [x] Block types: brick, wood, stone, windows, doors, roofs
- [x] Hammer tool (key 1) - destroys blocks for scrap (30 damage, 50px range)
- [x] Repair tool (key 3) - restores blocks (20 HP, costs 1 scrap)
- [x] Weapon mode (key 2) - switch back to shooting
- [x] Captured base protection (blocks near owned bases take 75% less damage)
- [x] Scrap economy (2 scrap per destroyed block)

### UI/UX
- [x] Bottom toolbar with toolbelt (clean HUD design)
- [x] Health/armor bars with gradient fills
- [x] Tool slots with visual selection (1=Hammer, 2=Weapon, 3=Repair)
- [x] Scrap counter, ammo display, ability tracker
- [x] Player name display on toolbar
- [x] Clickable tool slots + keyboard shortcuts

### Abilities
- [x] Blade Swirl ability - spinning blades that damage blocks (ends after 3 block hits)
- [x] Ability pickup and drop system (E to use, Q to drop)

### Base System (Partially Implemented)
- [x] 9 capture points across the map
- [x] Capture progress tracking (2% per 100ms, 5 seconds to capture)
- [x] Base ownership system
- [x] Base upgrade levels (0-3: uncaptured, basic, fortified, turret)
- [x] NPC guards with limited ammo (spawn at level 1 and 2)
- [x] Ammo crate pickups (10 scrap reward)
- [x] Scrap-based upgrade costs (50, 100, 200 scrap)
- [ ] **Need client-side UI** for base info and upgrades
- [ ] **Need to render** guards and capture zones

---

## 🎯 High Priority Features

### Graphics Improvements (Quick Wins)
- [ ] **Health bars on damaged blocks** - Visual damage indicators (5 min)
- [ ] **Better player rendering** - Show weapon, directional facing, body/head (10 min)
- [ ] **Tool cursor indicator** - Show hammer/repair icon near cursor (5 min)
- [ ] **Block shadows and gradients** - Add depth to buildings (10 min)
- [ ] **Damage overlays** - Cracks on damaged walls (15 min)
- [ ] **Muzzle flash effects** - Better shooting feedback (5 min)
- [ ] **Screen shake on explosions** - Impact feeling (5 min)

### Crafting & Building System 🆕 **Spy vs Spy Inspired**
- [ ] **Radar station parts** - Scattered around map (4-5 parts to collect)
- [ ] **Radar construction** - Build at your base to unlock minimap
- [ ] **Minimap display** - Corner radar showing player positions (only if radar built)
- [ ] **Booby traps** - Placeable traps that damage enemies
  - [ ] Landmines - Invisible until triggered
  - [ ] Trip wires - Across doorways
  - [ ] Spike traps - In hallways
  - [ ] Explosive barrels - Shoot to detonate
- [ ] **Trap detection** - Radar upgrades reveal enemy traps
- [ ] **Sabotage mechanics** - Destroy enemy radar stations
- [ ] **Resource gathering** - Different scrap types for different crafts

### Building & Construction
- [ ] **Place new blocks** - Key 4 for build mode (costs 3 scrap per block)
- [ ] **Block type selection** - Cycle through brick/wood/stone
- [ ] **Build snap-to-grid** - Align with existing structures
- [ ] **Blueprint mode** - Plan layouts before building
- [ ] **Structural integrity** - Floating blocks collapse
- [ ] **Door placement** - Functional doors that open/close
- [ ] **Window placement** - Transparent blocks for visibility

---

## 🔮 Medium Priority Features

### Advanced Base System
- [ ] **Automated turrets** - Level 3 bases spawn AI turrets
- [ ] **Resource generators** - Bases slowly produce scrap over time
- [ ] **Base healing** - Auto-repair damaged blocks in owned bases
- [ ] **Supply lines** - Connect bases for shared resources
- [ ] **Base customization** - Choose guard types and positions
- [ ] **Forward operating bases** - Build small outposts for 50 scrap

### Enhanced Combat
- [ ] **Melee weapons** - Knife, sword, baseball bat
- [ ] **Throwables** - Grenades, molotovs, smoke bombs
- [ ] **Vehicle system** - Cars, tanks, motorcycles
- [ ] **Weapon modifications** - Scopes, silencers, extended mags
- [ ] **Armor system expansion** - Helmets, vests, leg armor
- [ ] **Cover system** - Crouch behind walls for protection

### World Systems
- [ ] **Day/night cycle** - Visibility changes, lights needed at night
- [ ] **Weather effects** - Rain, fog, snow affecting gameplay
- [ ] **Dynamic events** - Supply drops, airstrikes, boss enemies
- [ ] **Underground system** - Sewers, bunkers, tunnels
- [ ] **Destructible terrain** - Crater explosions, scorched earth

### Progression & Economy
- [ ] **Player levels** - XP from kills, captures, building
- [ ] **Skill trees** - Unlock perks (faster reload, more health, etc.)
- [ ] **Persistent inventory** - Save items between sessions
- [ ] **Trading system** - Exchange items with other players
- [ ] **Black market vendors** - NPC traders at specific locations
- [ ] **Contracts/missions** - Objectives for bonus rewards

---

## 🚀 Future/Polish Features

### Visuals & Audio
- [ ] **Sprite graphics** - Replace shapes with pixel art
- [ ] **Particle effects** - Better explosions, blood, sparks
- [ ] **Sound effects** - Gunshots, explosions, footsteps
- [ ] **Background music** - Dynamic tracks based on situation
- [ ] **Lighting system** - Shadows, flashlights, muzzle flashes
- [ ] **Weather particles** - Rain drops, snow flakes

### Social Features
- [ ] **Teams/clans** - Form alliances
- [ ] **Voice chat** - In-game communication
- [ ] **Text chat** - Global and team channels
- [ ] **Friends list** - Track regular players
- [ ] **Leaderboards** - Top players, most captures, etc.
- [ ] **Replays** - Watch past matches

### Game Modes
- [ ] **Deathmatch** - Traditional FFA
- [ ] **Team Deathmatch** - 2+ teams compete
- [ ] **Capture the Flag** - Classic CTF mode
- [ ] **King of the Hill** - Control zones for points
- [ ] **Battle Royale** - Shrinking map, last man standing
- [ ] **Zombies** - Survive waves of AI enemies
- [ ] **Creative mode** - Unlimited resources for building

### Technical Improvements
- [ ] **Spatial optimization** - Grid-based collision for performance
- [ ] **Dedicated servers** - Better hosting than P2P
- [ ] **Matchmaking** - Balanced team assignment
- [ ] **Anti-cheat** - Server-side validation
- [ ] **Save/load maps** - Custom map persistence
- [ ] **Map editor** - GUI tool for creating maps
- [ ] **Mobile optimization** - Better touch controls

---

## 🐛 Known Bugs & Issues

### Current Issues
- [ ] Rocket self-damage may not be working (needs testing)
- [ ] Guard AI not fully implemented (need pathfinding)
- [ ] Capture zones not rendered on client
- [ ] Base upgrade UI missing on client
- [ ] Ammo crates not visible on client

### Performance
- [ ] Too many particles can cause lag (limit particle count)
- [ ] Collision detection expensive with many blocks (use spatial grid)
- [ ] Network traffic could be optimized (delta compression)

---

## 💡 Design Notes

### Spy vs Spy Inspiration
The game should feel like strategic sabotage with:
- **Information warfare** - Radar gives advantage, destroying it blinds enemies
- **Trap warfare** - Set traps in enemy territory, avoid theirs
- **Resource denial** - Destroy enemy buildings to prevent their upgrades
- **Hit and run** - Quick strikes on bases then retreat

### Balance Considerations
- Hammer destroys too fast → increase block HP?
- Repair too cheap → increase scrap cost?
- Buildings too easy to level → captured base protection working?
- Scrap economy → ensure destroying is worth the risk

### Map Size & Scale
- **Map:** 5000 x 5000px
- **Terrain tiles:** 50px (perfect size confirmed)
- **Building blocks:** 20px (good for detailed destruction)
- **Buildings:** 250-500px (new larger size)
- **Capture zones:** 150px radius

---

## 📊 Priority Matrix

**Implement Next:**
1. Health bars on blocks (visual feedback)
2. Radar parts & construction system (core gameplay loop)
3. Minimap when radar built (reward for crafting)
4. Booby traps (spy vs spy mechanics)
5. Better player/weapon rendering (polish)
6. Block placement tool (key 4)

**After That:**
7. Guard AI and rendering
8. Base upgrade UI
9. Turret system
10. Day/night cycle
