#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

console.log('\x1b[32m========================================\x1b[0m');
console.log('\x1b[32m   MULTIPLAYER SHOOTER LAUNCHER\x1b[0m');
console.log('\x1b[32m========================================\x1b[0m\n');

const serverPath = path.join(__dirname, 'server');

// Start server
console.log('\x1b[36mStarting game server...\x1b[0m\n');
const server = spawn('node', ['server-manager.js'], {
  cwd: serverPath,
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('\x1b[31mFailed to start server:\x1b[0m', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log('\n\x1b[33mServer stopped.\x1b[0m');
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\x1b[33mShutting down...\x1b[0m');
  server.kill();
  process.exit(0);
});

// Get local IP for display
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

setTimeout(() => {
  const ip = getLocalIP();
  console.log('\n\x1b[42m\x1b[30m========================================\x1b[0m');
  console.log('\x1b[42m\x1b[30m  GAME READY!                          \x1b[0m');
  console.log('\x1b[42m\x1b[30m========================================\x1b[0m');
  console.log('\n\x1b[36mPLAY NOW:\x1b[0m');
  console.log(`  http://${ip}:3001`);
  console.log('\n\x1b[36mADMIN DASHBOARD:\x1b[0m');
  console.log(`  http://${ip}:3001/admin`);
  console.log('\n\x1b[90mPress Ctrl+C to stop\x1b[0m\n');
}, 3000);
