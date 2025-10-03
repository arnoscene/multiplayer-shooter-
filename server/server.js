// Multiplayer Game Server
// Run with: node server.js
// Install dependencies: npm install ws express

const WebSocket = require('ws');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Game state
const gameState = {
  players: new Map(), // playerId -> player data
  items: [
    { id: 1, x: 12, y: 10, type: "potion", name: "Health Potion", sprite: "🧪" },
    { id: 2, x: 25, y: 8, type: "gold", name: "Gold Coins", value: 25, sprite: "💰" },
    { id: 3, x: 30, y: 20, type: "key", name: "Rusty Key", sprite: "🔑" },
    { id: 4, x: 15, y: 18, type: "sword", name: "Iron Sword", sprite: "⚔️" },
    { id: 5, x: 6, y: 23, type: "scroll", name: "Ancient Scroll", sprite: "📜" },
    { id: 6, x: 32, y: 8, type: "potion", name: "Health Potion", sprite: "🧪" },
    { id: 7, x: 22, y: 22, type: "gold", name: "Gold Coins", value: 50, sprite: "💰" },
    { id: 8, x: 3, y: 3, type: "gem", name: "Ruby", sprite: "💎" }
  ],
  npcs: [
    {
      id: 1, x: 9, y: 6, name: "Bartender Bob",
      dialogue: [
        "Welcome to the Golden Mug tavern!",
        "Looking for adventure? I heard there's treasure near the old ruins to the north.",
        "Careful near the water - some say a monster lurks there."
      ]
    },
    {
      id: 2, x: 19, y: 6, name: "Merchant Mary",
      dialogue: [
        "Welcome to my shop! I have the finest goods in town.",
        "That sword you're looking for? I might have one in the back...",
        "Come back with 100 gold and we'll talk business."
      ],
      shop: true
    },
    {
      id: 3, x: 20, y: 15, name: "Priest Thomas",
      dialogue: [
        "Blessings upon you, traveler.",
        "The temple offers healing for those in need.",
        "Seek the light and you shall find your path."
      ],
      healer: true
    },
    {
      id: 4, x: 29, y: 15, name: "Blacksmith John",
      dialogue: [
        "Finest weapons and armor in the land!",
        "Bring me iron ore and I'll forge you something special.",
        "That old sword needs sharpening, doesn't it?"
      ]
    },
    {
      id: 5, x: 5, y: 20, name: "Old Hermit",
      dialogue: [
        "Ahh, a visitor! Haven't seen one in years...",
        "The ancients buried secrets in these lands.",
        "Follow the path north when the moon is full..."
      ]
    }
  ],
  chatMessages: []
};

// Helper to generate unique player ID
function generatePlayerId() {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

// Generate random player color
function getRandomColor() {
  const colors = ['#4ecdc4', '#ff6b6b', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#a8d8ea'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Broadcast to all connected clients
function broadcast(data, excludeClient = null) {
  wss.clients.forEach(client => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Send to specific client
function sendToClient(client, data) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  const playerId = generatePlayerId();
  console.log(`Player ${playerId} connected`);

  // Initialize new player
  const newPlayer = {
    id: playerId,
    name: `Hero ${gameState.players.size + 1}`,
    x: 10 + Math.floor(Math.random() * 3),
    y: 10 + Math.floor(Math.random() * 3),
    health: 100,
    maxHealth: 100,
    gold: 50,
    inventory: [],
    color: getRandomColor()
  };

  gameState.players.set(playerId, newPlayer);

  // Send initial state to new player
  sendToClient(ws, {
    type: 'init',
    playerId: playerId,
    player: newPlayer,
    players: Array.from(gameState.players.values()),
    items: gameState.items,
    npcs: gameState.npcs,
    chatMessages: gameState.chatMessages.slice(-50) // Last 50 messages
  });

  // Notify other players
  broadcast({
    type: 'playerJoined',
    player: newPlayer
  }, ws);

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const player = gameState.players.get(playerId);

      if (!player) return;

      switch(data.type) {
        case 'move':
          // Update player position
          player.x = data.x;
          player.y = data.y;
          
          // Broadcast movement to other players
          broadcast({
            type: 'playerMoved',
            playerId: playerId,
            x: data.x,
            y: data.y
          }, ws);
          break;

        case 'pickupItem':
          // Find and remove item from world
          const itemIndex = gameState.items.findIndex(item => item.id === data.itemId);
          if (itemIndex !== -1) {
            const item = gameState.items[itemIndex];
            
            if (item.type === 'gold') {
              player.gold += item.value;
            } else {
              player.inventory.push(item);
            }
            
            gameState.items.splice(itemIndex, 1);
            
            // Broadcast item pickup to all players
            broadcast({
              type: 'itemPickedUp',
              playerId: playerId,
              itemId: data.itemId,
              pickedBy: player.name
            });
          }
          break;

        case 'useItem':
          // Handle item usage
          const invItemIndex = player.inventory.findIndex(item => item.id === data.itemId);
          if (invItemIndex !== -1) {
            const item = player.inventory[invItemIndex];
            
            if (item.type === 'potion') {
              player.health = Math.min(player.maxHealth, player.health + 30);
              player.inventory.splice(invItemIndex, 1);
              
              broadcast({
                type: 'playerUsedItem',
                playerId: playerId,
                itemName: item.name,
                playerName: player.name
              });
            }
          }
          break;

        case 'heal':
          // Heal at temple
          if (player.gold >= 20) {
            player.gold -= 20;
            player.health = player.maxHealth;
            
            sendToClient(ws, {
              type: 'healed',
              health: player.health,
              gold: player.gold
            });
            
            broadcast({
              type: 'playerHealed',
              playerId: playerId,
              playerName: player.name
            }, ws);
          }
          break;

        case 'chat':
          // Handle chat message
          const chatMessage = {
            id: Date.now(),
            playerId: playerId,
            playerName: player.name,
            message: data.message,
            timestamp: Date.now()
          };
          
          gameState.chatMessages.push(chatMessage);
          
          // Keep only last 100 messages
          if (gameState.chatMessages.length > 100) {
            gameState.chatMessages.shift();
          }
          
          // Broadcast chat to all players
          broadcast({
            type: 'chat',
            chatMessage: chatMessage
          });
          break;

        case 'updateName':
          // Update player name
          player.name = data.name.substring(0, 20); // Limit name length
          
          broadcast({
            type: 'playerNameChanged',
            playerId: playerId,
            name: player.name
          });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`Player ${playerId} disconnected`);
    
    gameState.players.delete(playerId);
    
    broadcast({
      type: 'playerLeft',
      playerId: playerId
    });
  });
});

// Item respawn system (respawn items every 2 minutes)
setInterval(() => {
  const respawnableItems = [
    { type: "potion", name: "Health Potion", sprite: "🧪" },
    { type: "gold", name: "Gold Coins", value: 25, sprite: "💰" }
  ];
  
  if (gameState.items.length < 15 && Math.random() > 0.5) {
    const newItem = {
      id: Date.now(),
      x: Math.floor(Math.random() * 35) + 2,
      y: Math.floor(Math.random() * 25) + 2,
      ...respawnableItems[Math.floor(Math.random() * respawnableItems.length)]
    };
    
    gameState.items.push(newItem);
    
    broadcast({
      type: 'itemSpawned',
      item: newItem
    });
  }
}, 120000); // 2 minutes

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎮 Multiplayer game server running on port ${PORT}`);
  console.log(`Players can connect to ws://localhost:${PORT}`);
});
