# Multiplayer Ultima Explorer - Setup Guide

## Overview

This multiplayer implementation uses a **client-server architecture** with WebSocket communication for real-time gameplay.

### Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │◄─────────────────────────►│             │
│  (Browser)  │                            │             │
└─────────────┘                            │   Server    │
                                           │  (Node.js)  │
┌─────────────┐         WebSocket          │             │
│   Client 2  │◄─────────────────────────►│   Port      │
│  (Browser)  │                            │   3001      │
└─────────────┘                            └─────────────┘
                                                  │
                                           ┌──────▼──────┐
                                           │  Game State │
                                           │  - Players  │
                                           │  - Items    │
                                           │  - NPCs     │
                                           └─────────────┘
```

## Setup Instructions

### 1. Server Setup

First, set up the WebSocket server:

```bash
# Navigate to the server directory
cd /home/claude

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 3001 and you should see:
```
🎮 Multiplayer game server running on port 3001
Players can connect to ws://localhost:3001
```

### 2. Client Setup

The client is a React component. You have two options:

**Option A: Use in Claude's artifact system** (easiest)
- The .jsx file can be directly viewed as an artifact in Claude
- Just open the file and it will render

**Option B: Integrate into your own React app**
```jsx
import MultiplayerUltimaExplorer from './multiplayer-ultima-explorer.jsx';

function App() {
  return <MultiplayerUltimaExplorer />;
}
```

### 3. Testing Multiplayer

1. Start the server (npm start)
2. Open the client in multiple browser tabs/windows
3. Each tab will connect as a different player
4. You'll see other players moving around in real-time!

## How It Works

### 1. Connection Flow

```
Client                           Server
  │                                │
  │──── WebSocket Connect ────────►│
  │                                │
  │◄─── Init Message (player data, world state)
  │                                │
  │─── Movement/Actions ──────────►│
  │                                │
  │◄─── Broadcasts (other players' actions)
  │                                │
```

### 2. Message Types

**Client → Server:**
- `move` - Player movement
- `pickupItem` - Pick up an item
- `useItem` - Use an item from inventory
- `heal` - Request healing at temple
- `chat` - Send chat message
- `updateName` - Change player name

**Server → Client:**
- `init` - Initial game state
- `playerJoined` - New player connected
- `playerLeft` - Player disconnected
- `playerMoved` - Another player moved
- `itemPickedUp` - Item was collected
- `itemSpawned` - New item appeared
- `chat` - Chat message received
- `healed` - Healing confirmation

### 3. State Synchronization

The server maintains the **authoritative game state**:
- Player positions
- Item locations
- Gold amounts
- Inventories

Clients send actions, server validates and broadcasts changes.

## Key Features

### Real-Time Multiplayer
- See other players moving around
- Watch items disappear when picked up
- Real-time chat system
- Player join/leave notifications

### Shared World
- All players exist in the same world
- Items are shared (first come, first served)
- NPCs are visible to everyone
- Temple healing affects individual players

### Network Optimization
- Only movement deltas are sent
- State is only broadcast when changed
- Efficient binary WebSocket protocol

## Extending the System

### Adding New Features

**Example: Adding Combat**

Server (server.js):
```javascript
case 'attack':
  const target = gameState.players.get(data.targetId);
  if (target && isNearby(player, target)) {
    target.health -= 10;
    broadcast({
      type: 'playerAttacked',
      attackerId: playerId,
      targetId: data.targetId,
      damage: 10
    });
  }
  break;
```

Client (multiplayer-ultima-explorer.jsx):
```javascript
case 'playerAttacked':
  if (data.targetId === playerId) {
    setPlayer(prev => ({ 
      ...prev, 
      health: prev.health - data.damage 
    }));
  }
  showNotification(`Combat! ${data.damage} damage dealt!`);
  break;
```

### Adding Persistence

To save game state between server restarts:

```javascript
// In server.js
const fs = require('fs');

// Save state every 30 seconds
setInterval(() => {
  const state = {
    players: Array.from(gameState.players.values()),
    items: gameState.items
  };
  fs.writeFileSync('gamestate.json', JSON.stringify(state));
}, 30000);

// Load on startup
try {
  const saved = JSON.parse(fs.readFileSync('gamestate.json'));
  gameState.items = saved.items;
} catch (e) {
  console.log('No saved state found, starting fresh');
}
```

### Scaling for More Players

For 10+ concurrent players, consider:

1. **Room System**: Divide world into regions
2. **Spatial Partitioning**: Only sync nearby players
3. **Redis**: Store state in Redis for horizontal scaling
4. **Load Balancing**: Multiple server instances

Example room system:
```javascript
const rooms = new Map(); // roomId -> players

// Only broadcast to players in same room
function broadcastToRoom(roomId, data) {
  const room = rooms.get(roomId);
  room.forEach(playerId => {
    const client = clients.get(playerId);
    sendToClient(client, data);
  });
}
```

## Troubleshooting

### "Cannot connect to server"
- Ensure server is running: `npm start`
- Check port 3001 is not blocked
- Verify WebSocket URL: `ws://localhost:3001`

### Players not seeing each other
- Check browser console for WebSocket errors
- Verify both clients connected to same server
- Check server logs for connection messages

### Lag/Desync Issues
- Reduce broadcast frequency
- Implement client-side prediction
- Add interpolation for smooth movement

## Security Considerations

For production deployment:

1. **Authentication**: Add login system
2. **Input Validation**: Validate all client messages
3. **Rate Limiting**: Prevent spam/abuse
4. **HTTPS/WSS**: Use secure connections
5. **Anti-Cheat**: Server-side validation of all actions

Example validation:
```javascript
case 'move':
  // Validate movement is possible
  const distance = Math.abs(data.x - player.x) + Math.abs(data.y - player.y);
  if (distance > 1) {
    console.log('Invalid move detected:', playerId);
    return; // Reject
  }
  // ... process valid move
  break;
```

## Performance Optimization

### Client-Side
- **Interpolation**: Smooth out network jitter
- **Dead Reckoning**: Predict other player positions
- **Only render visible**: Cull off-screen entities

### Server-Side
- **Spatial Hashing**: Efficient nearby player queries
- **Tick Rate**: Update at 20-30 fps, not 60
- **Compression**: Use binary protocols (MessagePack)

## File Summary

- `server.js` - WebSocket server handling game logic
- `package.json` - Server dependencies
- `multiplayer-ultima-explorer.jsx` - React client with WebSocket integration
- `SETUP.md` - This guide

## Next Steps

1. ✅ Basic multiplayer working
2. Add player-to-player trading
3. Implement combat system
4. Add dungeons/instanced content
5. Create party/guild system
6. Add player housing
7. Implement crafting system
8. Add boss monsters

Enjoy your multiplayer adventure! 🎮⚔️
