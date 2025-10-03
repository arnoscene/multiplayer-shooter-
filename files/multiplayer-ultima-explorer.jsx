import React, { useState, useEffect, useCallback, useRef } from 'react';

const MultiplayerUltimaExplorer = () => {
  const TILE_SIZE = 32;
  const WORLD_WIDTH = 40;
  const WORLD_HEIGHT = 30;
  const VIEWPORT_WIDTH = 20;
  const VIEWPORT_HEIGHT = 15;

  // Game state
  const [playerId, setPlayerId] = useState(null);
  const [player, setPlayer] = useState(null);
  const [otherPlayers, setOtherPlayers] = useState(new Map());
  const [inventory, setInventory] = useState([]);
  const [gold, setGold] = useState(50);
  const [gameTime, setGameTime] = useState(0);
  const [dialogue, setDialogue] = useState(null);
  const [notification, setNotification] = useState('');
  const [showInventory, setShowInventory] = useState(false);
  const [discoveredLocations, setDiscoveredLocations] = useState(new Set());
  const [connected, setConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [npcs, setNpcs] = useState([]);
  const [items, setItems] = useState([]);
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const wsRef = useRef(null);
  const chatEndRef = useRef(null);

  // Terrain types
  const TERRAIN = {
    GRASS: 0,
    WATER: 1,
    STONE: 2,
    WOOD: 3,
    DIRT: 4,
    SAND: 5
  };

  // Generate world (same as before)
  const [world] = useState(() => {
    const w = Array(WORLD_HEIGHT).fill(null).map(() => Array(WORLD_WIDTH).fill(TERRAIN.GRASS));
    
    for (let i = 5; i < 10; i++) {
      for (let j = 25; j < 35; j++) {
        w[i][j] = TERRAIN.WATER;
      }
    }
    
    for (let i = 0; i < WORLD_HEIGHT; i++) {
      w[i][15] = TERRAIN.DIRT;
    }
    for (let j = 0; j < WORLD_WIDTH; j++) {
      w[12][j] = TERRAIN.DIRT;
    }
    
    for (let i = 4; i < 11; i++) {
      if (w[i][24] !== TERRAIN.DIRT) w[i][24] = TERRAIN.SAND;
    }
    
    return w;
  });

  // Buildings
  const buildings = [
    { x: 8, y: 5, width: 4, height: 4, name: "Tavern", entrance: { x: 10, y: 8 } },
    { x: 18, y: 5, width: 3, height: 3, name: "Shop", entrance: { x: 19, y: 7 } },
    { x: 8, y: 14, width: 3, height: 3, name: "House", entrance: { x: 9, y: 16 } },
    { x: 18, y: 14, width: 4, height: 3, name: "Temple", entrance: { x: 20, y: 16 } },
    { x: 28, y: 14, width: 3, height: 3, name: "Blacksmith", entrance: { x: 29, y: 16 } }
  ];

  // WebSocket connection
  useEffect(() => {
    // Connect to WebSocket server
    const ws = new WebSocket('ws://localhost:3001');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to server');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'init':
          // Initialize game state
          setPlayerId(data.playerId);
          setPlayer(data.player);
          setGold(data.player.gold);
          setInventory(data.player.inventory);
          
          // Set other players
          const others = new Map();
          data.players.forEach(p => {
            if (p.id !== data.playerId) {
              others.set(p.id, p);
            }
          });
          setOtherPlayers(others);
          
          setItems(data.items);
          setNpcs(data.npcs);
          setChatMessages(data.chatMessages);
          break;

        case 'playerJoined':
          setOtherPlayers(prev => {
            const newMap = new Map(prev);
            newMap.set(data.player.id, data.player);
            return newMap;
          });
          showNotification(`${data.player.name} joined the game!`);
          break;

        case 'playerLeft':
          setOtherPlayers(prev => {
            const newMap = new Map(prev);
            newMap.delete(data.playerId);
            return newMap;
          });
          break;

        case 'playerMoved':
          setOtherPlayers(prev => {
            const newMap = new Map(prev);
            const player = newMap.get(data.playerId);
            if (player) {
              player.x = data.x;
              player.y = data.y;
            }
            return newMap;
          });
          break;

        case 'itemPickedUp':
          setItems(prev => prev.filter(item => item.id !== data.itemId));
          if (data.playerId !== playerId) {
            showNotification(`${data.pickedBy} picked up an item`);
          }
          break;

        case 'itemSpawned':
          setItems(prev => [...prev, data.item]);
          showNotification('A new item has appeared!');
          break;

        case 'playerUsedItem':
          if (data.playerId !== playerId) {
            showNotification(`${data.playerName} used ${data.itemName}`);
          }
          break;

        case 'playerHealed':
          if (data.playerId !== playerId) {
            showNotification(`${data.playerName} was healed at the temple`);
          }
          break;

        case 'chat':
          setChatMessages(prev => [...prev, data.chatMessage]);
          break;

        case 'playerNameChanged':
          setOtherPlayers(prev => {
            const newMap = new Map(prev);
            const player = newMap.get(data.playerId);
            if (player) {
              player.name = data.name;
            }
            return newMap;
          });
          break;

        case 'healed':
          setPlayer(prev => ({ ...prev, health: data.health }));
          setGold(data.gold);
          showNotification('You have been healed!');
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Send message to server
  const sendToServer = (data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  // Movement with collision detection
  const canMoveTo = (x, y) => {
    if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return false;
    if (world[y][x] === TERRAIN.WATER) return false;
    
    for (let building of buildings) {
      if (x >= building.x && x < building.x + building.width &&
          y >= building.y && y < building.y + building.height) {
        if (x === building.entrance.x && y === building.entrance.y) {
          showNotification(`Entered ${building.name}`);
          if (!discoveredLocations.has(building.name)) {
            setDiscoveredLocations(new Set([...discoveredLocations, building.name]));
          }
          return true;
        }
        return false;
      }
    }
    return true;
  };

  const movePlayer = useCallback((dx, dy) => {
    if (!player) return;
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    if (canMoveTo(newX, newY)) {
      setPlayer(prev => ({ ...prev, x: newX, y: newY }));
      sendToServer({ type: 'move', x: newX, y: newY });
    }
  }, [player]);

  // Item pickup
  const checkItemPickup = useCallback(() => {
    if (!player) return;
    
    const itemAtPosition = items.find(item => item.x === player.x && item.y === player.y);
    if (itemAtPosition) {
      if (itemAtPosition.type === 'gold') {
        setGold(prev => prev + itemAtPosition.value);
        showNotification(`Found ${itemAtPosition.value} gold!`);
      } else {
        setInventory(prev => [...prev, itemAtPosition]);
        showNotification(`Picked up ${itemAtPosition.name}`);
      }
      
      sendToServer({ type: 'pickupItem', itemId: itemAtPosition.id });
    }
  }, [items, player]);

  // NPC interaction
  const checkNPCInteraction = useCallback(() => {
    if (!player) return;
    
    const nearbyNPC = npcs.find(npc => 
      Math.abs(npc.x - player.x) <= 1 && Math.abs(npc.y - player.y) <= 1
    );
    
    if (nearbyNPC) {
      const dialogueIndex = Math.floor(Math.random() * nearbyNPC.dialogue.length);
      const dialogueLine = nearbyNPC.dialogue[dialogueIndex];
      setDialogue({
        npc: nearbyNPC.name,
        text: dialogueLine,
        isHealer: nearbyNPC.healer,
        isShop: nearbyNPC.shop
      });
    }
  }, [npcs, player]);

  // Use item
  const useItem = (item) => {
    if (item.type === 'potion') {
      setPlayer(prev => ({
        ...prev,
        health: Math.min(prev.maxHealth, prev.health + 30)
      }));
      setInventory(prev => prev.filter(i => i.id !== item.id));
      showNotification(`Used ${item.name}. Health restored!`);
      sendToServer({ type: 'useItem', itemId: item.id });
    } else if (item.type === 'scroll') {
      showNotification('The scroll reveals: "Seek the ruby in the northwest..."');
    }
  };

  const showNotification = (text) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  // Heal at temple
  const healPlayer = () => {
    if (gold >= 20) {
      sendToServer({ type: 'heal' });
      setDialogue(null);
    } else {
      showNotification('Not enough gold! (Need 20 gold)');
    }
  };

  // Send chat message
  const sendChatMessage = () => {
    if (chatInput.trim() && connected) {
      sendToServer({ type: 'chat', message: chatInput.trim() });
      setChatInput('');
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (dialogue) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          setDialogue(null);
        }
        return;
      }

      if (showInventory && e.key === 'Escape') {
        setShowInventory(false);
        return;
      }

      // Chat input focused
      if (document.activeElement?.tagName === 'INPUT') {
        return;
      }

      switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          movePlayer(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          movePlayer(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          movePlayer(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          movePlayer(1, 0);
          break;
        case ' ':
        case 'e':
        case 'E':
          checkItemPickup();
          checkNPCInteraction();
          break;
        case 'i':
        case 'I':
          setShowInventory(prev => !prev);
          break;
        case 'c':
        case 'C':
          setShowChat(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePlayer, checkItemPickup, checkNPCInteraction, dialogue, showInventory]);

  // Game time
  useEffect(() => {
    const interval = setInterval(() => {
      setGameTime(prev => prev + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Render game
  useEffect(() => {
    if (!player) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const render = () => {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cameraX = Math.max(0, Math.min(player.x - Math.floor(VIEWPORT_WIDTH / 2), WORLD_WIDTH - VIEWPORT_WIDTH));
      const cameraY = Math.max(0, Math.min(player.y - Math.floor(VIEWPORT_HEIGHT / 2), WORLD_HEIGHT - VIEWPORT_HEIGHT));

      // Draw terrain
      for (let y = 0; y < VIEWPORT_HEIGHT; y++) {
        for (let x = 0; x < VIEWPORT_WIDTH; x++) {
          const worldX = x + cameraX;
          const worldY = y + cameraY;
          
          if (worldX >= 0 && worldX < WORLD_WIDTH && worldY >= 0 && worldY < WORLD_HEIGHT) {
            const terrain = world[worldY][worldX];
            
            switch(terrain) {
              case TERRAIN.GRASS:
                ctx.fillStyle = '#4a7c59';
                break;
              case TERRAIN.WATER:
                ctx.fillStyle = '#3b5998';
                break;
              case TERRAIN.DIRT:
                ctx.fillStyle = '#8b7355';
                break;
              case TERRAIN.SAND:
                ctx.fillStyle = '#c2b280';
                break;
              default:
                ctx.fillStyle = '#4a7c59';
            }
            
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#00000020';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // Draw buildings
      buildings.forEach(building => {
        const screenX = (building.x - cameraX) * TILE_SIZE;
        const screenY = (building.y - cameraY) * TILE_SIZE;
        
        if (screenX > -building.width * TILE_SIZE && screenX < canvas.width &&
            screenY > -building.height * TILE_SIZE && screenY < canvas.height) {
          ctx.fillStyle = '#654321';
          ctx.fillRect(screenX, screenY, building.width * TILE_SIZE, building.height * TILE_SIZE);
          
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(screenX, screenY, building.width * TILE_SIZE, 8);
          
          ctx.fillStyle = '#3d2817';
          const doorX = (building.entrance.x - cameraX) * TILE_SIZE + TILE_SIZE / 4;
          const doorY = (building.entrance.y - cameraY) * TILE_SIZE;
          ctx.fillRect(doorX, doorY, TILE_SIZE / 2, TILE_SIZE);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px monospace';
          ctx.fillText(building.name, screenX + 5, screenY + 15);
        }
      });

      // Draw items
      items.forEach(item => {
        const screenX = (item.x - cameraX) * TILE_SIZE;
        const screenY = (item.y - cameraY) * TILE_SIZE;
        
        if (screenX >= 0 && screenX < canvas.width && screenY >= 0 && screenY < canvas.height) {
          ctx.font = '24px serif';
          ctx.fillText(item.sprite, screenX + 4, screenY + 24);
        }
      });

      // Draw NPCs
      npcs.forEach(npc => {
        const screenX = (npc.x - cameraX) * TILE_SIZE;
        const screenY = (npc.y - cameraY) * TILE_SIZE;
        
        if (screenX >= 0 && screenX < canvas.width && screenY >= 0 && screenY < canvas.height) {
          ctx.fillStyle = '#ff6b6b';
          ctx.fillRect(screenX + 8, screenY + 12, 16, 16);
          
          ctx.fillStyle = '#ffd93d';
          ctx.beginPath();
          ctx.arc(screenX + 16, screenY + 10, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '8px monospace';
          ctx.fillText(npc.name.split(' ')[0], screenX + 2, screenY - 2);
        }
      });

      // Draw other players
      otherPlayers.forEach(otherPlayer => {
        const screenX = (otherPlayer.x - cameraX) * TILE_SIZE;
        const screenY = (otherPlayer.y - cameraY) * TILE_SIZE;
        
        if (screenX >= -TILE_SIZE && screenX < canvas.width && 
            screenY >= -TILE_SIZE && screenY < canvas.height) {
          // Other player body
          ctx.fillStyle = otherPlayer.color || '#ff6b6b';
          ctx.fillRect(screenX + 8, screenY + 12, 16, 16);
          
          // Other player head
          ctx.fillStyle = '#ffe66d';
          ctx.beginPath();
          ctx.arc(screenX + 16, screenY + 10, 6, 0, Math.PI * 2);
          ctx.fill();
          
          // Name tag
          ctx.fillStyle = '#ffffff';
          ctx.font = '8px monospace';
          const name = otherPlayer.name || 'Player';
          ctx.fillText(name, screenX + 4, screenY - 2);
        }
      });

      // Draw current player
      const playerScreenX = (player.x - cameraX) * TILE_SIZE;
      const playerScreenY = (player.y - cameraY) * TILE_SIZE;
      
      ctx.fillStyle = player.color || '#4ecdc4';
      ctx.fillRect(playerScreenX + 8, playerScreenY + 12, 16, 16);
      
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(playerScreenX + 16, playerScreenY + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('YOU', playerScreenX + 6, playerScreenY - 2);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [player, world, items, npcs, otherPlayers]);

  if (!connected || !player) {
    return (
      <div className="w-full h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌐</div>
          <div className="text-xl mb-2">Connecting to server...</div>
          <div className="text-sm text-gray-400">Make sure the server is running on localhost:3001</div>
        </div>
      </div>
    );
  }

  const timeOfDay = Math.floor((gameTime / 100) % 24);
  const isDaytime = timeOfDay >= 6 && timeOfDay < 20;

  return (
    <div className="w-full h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-bold mb-2">⚔️ Multiplayer Ultima Explorer ⚔️</h1>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-gray-400">WASD/Arrows: Move | SPACE/E: Interact | I: Inventory | C: Chat</span>
          <span className={`px-2 py-1 rounded ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
            {connected ? '🟢 Online' : '🔴 Offline'}
          </span>
          <span className="text-amber-400">👥 {otherPlayers.size + 1} players</span>
        </div>
      </div>

      <div className="flex gap-4 w-full max-w-6xl">
        {/* Game Canvas */}
        <div className="flex-1">
          <canvas 
            ref={canvasRef}
            width={VIEWPORT_WIDTH * TILE_SIZE}
            height={VIEWPORT_HEIGHT * TILE_SIZE}
            className="border-4 border-amber-600 rounded bg-black"
          />
        </div>

        {/* Side Panel */}
        <div className="w-64 space-y-3">
          {/* Player Stats */}
          <div className="bg-gray-800 p-3 rounded border-2 border-amber-600">
            <h3 className="font-bold mb-2 text-amber-400">{player.name}</h3>
            <div className="space-y-1 text-sm">
              <div>HP: {player.health}/{player.maxHealth}</div>
              <div className="w-full bg-gray-700 h-2 rounded">
                <div 
                  className="bg-red-500 h-2 rounded transition-all"
                  style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                />
              </div>
              <div>💰 Gold: {gold}</div>
              <div>📍 ({player.x}, {player.y})</div>
              <div>🕐 {timeOfDay}:00 {isDaytime ? '☀️' : '🌙'}</div>
            </div>
          </div>

          {/* Online Players */}
          <div className="bg-gray-800 p-3 rounded border-2 border-amber-600">
            <h3 className="font-bold mb-2 text-amber-400">Players ({otherPlayers.size + 1})</h3>
            <div className="space-y-1 text-xs max-h-24 overflow-y-auto">
              <div className="text-green-400">✓ {player.name} (You)</div>
              {Array.from(otherPlayers.values()).map(p => (
                <div key={p.id}>
                  <span style={{ color: p.color }}>●</span> {p.name}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Inventory */}
          <div className="bg-gray-800 p-3 rounded border-2 border-amber-600">
            <h3 className="font-bold mb-2 text-amber-400">Inventory ({inventory.length})</h3>
            <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
              {inventory.slice(0, 5).map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span>{item.sprite}</span>
                  <span className="flex-1 text-xs">{item.name}</span>
                </div>
              ))}
              {inventory.length === 0 && <div className="text-gray-500 text-xs">Empty</div>}
            </div>
            <button
              onClick={() => setShowInventory(true)}
              className="mt-2 w-full bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded text-sm"
            >
              View All (I)
            </button>
          </div>

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(prev => !prev)}
            className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded font-bold"
          >
            💬 Chat (C)
          </button>
        </div>
      </div>

      {/* Chat Window */}
      {showChat && (
        <div className="fixed right-4 bottom-4 w-96 bg-gray-800 border-4 border-blue-600 rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-4 py-2 flex justify-between items-center">
            <span className="font-bold">💬 Chat</span>
            <button 
              onClick={() => setShowChat(false)}
              className="text-white hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          <div className="h-64 overflow-y-auto p-3 space-y-2 text-sm">
            {chatMessages.map(msg => (
              <div key={msg.id} className="break-words">
                <span className="font-bold text-amber-400">{msg.playerName}:</span>{' '}
                <span>{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type message..."
                className="flex-1 bg-gray-700 px-3 py-2 rounded text-white outline-none"
                maxLength={200}
              />
              <button
                onClick={sendChatMessage}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-amber-600 text-black px-6 py-3 rounded-lg font-bold shadow-lg">
          {notification}
        </div>
      )}

      {/* Dialogue Box */}
      {dialogue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border-4 border-amber-600 p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-xl font-bold mb-3 text-amber-400">{dialogue.npc}</h3>
            <p className="mb-4 text-lg">{dialogue.text}</p>
            <div className="flex gap-2">
              {dialogue.isHealer && (
                <button
                  onClick={healPlayer}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
                >
                  Heal (20 gold)
                </button>
              )}
              <button
                onClick={() => setDialogue(null)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold flex-1"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Inventory */}
      {showInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border-4 border-amber-600 p-6 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4 text-amber-400">Inventory</h3>
            <div className="grid grid-cols-2 gap-3">
              {inventory.map(item => (
                <div key={item.id} className="bg-gray-700 p-3 rounded flex items-center gap-3">
                  <span className="text-3xl">{item.sprite}</span>
                  <div className="flex-1">
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.type}</div>
                  </div>
                  {(item.type === 'potion' || item.type === 'scroll') && (
                    <button
                      onClick={() => {
                        useItem(item);
                        if (inventory.length <= 1) setShowInventory(false);
                      }}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                    >
                      Use
                    </button>
                  )}
                </div>
              ))}
            </div>
            {inventory.length === 0 && (
              <div className="text-center text-gray-500 py-8">Your inventory is empty</div>
            )}
            <button
              onClick={() => setShowInventory(false)}
              className="mt-4 w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold"
            >
              Close (ESC)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiplayerUltimaExplorer;
