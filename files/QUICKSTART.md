# Quick Start - Multiplayer Ultima Explorer

## 🚀 Get Running in 3 Minutes

### Step 1: Start the Server (30 seconds)

```bash
# Install Node.js first if you don't have it (https://nodejs.org)

# Navigate to the directory with server.js and package.json
cd /path/to/server/files

# Install dependencies
npm install

# Start the server
npm start
```

You should see: `🎮 Multiplayer game server running on port 3001`

### Step 2: Open the Client (30 seconds)

Open `multiplayer-ultima-explorer.jsx` in your browser using Claude's artifact system, or integrate it into a React app.

### Step 3: Test Multiplayer! (2 minutes)

1. Open the game in **multiple browser tabs** (Ctrl+T / Cmd+T)
2. Each tab is a different player
3. Move around with **WASD** or **arrow keys**
4. Watch other players move in real-time!
5. Press **C** to open chat and talk to other players

## 🎮 Controls

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| E / Space | Pick up items, talk to NPCs |
| I | Open inventory |
| C | Toggle chat |
| Escape | Close dialogs |

## 🌟 What Makes It Multiplayer?

### You'll See:
- ✅ Other players moving around in real-time
- ✅ Items disappear when someone picks them up
- ✅ Chat messages from other players
- ✅ Join/leave notifications
- ✅ Shared world state

### Technical Magic:
```
Player 1 moves → Server validates → Broadcasts to all players → Player 2 sees movement
```

All game logic runs on the **server** to prevent cheating!

## 🐛 Troubleshooting

**"Connecting to server..." forever?**
- Make sure the server is actually running
- Check that nothing else is using port 3001
- Try `localhost:3001` in your browser to test

**Not seeing other players?**
- Open multiple browser tabs (not windows on different computers yet)
- Check browser console (F12) for errors
- Refresh both tabs

**Server crashes?**
- Check you have Node.js installed: `node --version`
- Make sure all dependencies installed: `npm install`
- Look at error message - usually tells you what's wrong

## 🔧 Quick Customization

**Change player spawn location** (server.js line 95):
```javascript
x: 20,  // Change these numbers
y: 15,
```

**Add more items** (server.js line 23):
```javascript
{ id: 9, x: 10, y: 10, type: "sword", name: "Epic Sword", sprite: "⚔️" }
```

**Change server port** (server.js line 326):
```javascript
const PORT = 8080; // Change from 3001
```

## 📚 Want to Learn More?

See `SETUP.md` for:
- Complete architecture explanation
- How to add combat, trading, etc.
- Scaling for more players
- Production deployment
- Security considerations

## 🎯 Next Steps

Once you have it running, try:
1. Open 3-4 tabs and watch multiplayer in action
2. Test the chat system
3. See what happens when someone picks up an item
4. Try the healing system at the temple

Then start customizing:
- Add your own NPCs
- Create new items
- Design new buildings
- Implement combat
- Add quests

**Have fun building your multiplayer world!** 🏰⚔️
