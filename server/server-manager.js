const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

console.log('\x1b[32m========================================\x1b[0m');
console.log('\x1b[32m   MULTIPLAYER GAME SERVER MANAGER\x1b[0m');
console.log('\x1b[32m========================================\x1b[0m\n');

// Start the game server
console.log('\x1b[36m[1/2] Starting survival shooter server...\x1b[0m');
const server = spawn('node', ['survival-server.js'], {
  cwd: __dirname,
  stdio: 'pipe'
});

server.stdout.on('data', (data) => {
  console.log('\x1b[33m[SERVER]\x1b[0m', data.toString().trim());
});

server.stderr.on('data', (data) => {
  console.error('\x1b[31m[SERVER ERROR]\x1b[0m', data.toString().trim());
});

// Wait a bit for server to start, then start tunnel with Cloudflare
setTimeout(() => {
  console.log('\n\x1b[36m[2/2] Starting Cloudflare tunnel for low-latency gaming...\x1b[0m');

  // Cloudflare tunnel command: cloudflared tunnel --url http://localhost:3001
  const tunnel = spawn('cloudflared', [
    'tunnel',
    '--url', 'http://localhost:3001'
  ], {
    stdio: 'pipe'
  });

  let tunnelUrl = '';

  tunnel.stdout.on('data', (data) => {
    const output = data.toString().trim();

    console.log('\x1b[35m[TUNNEL]\x1b[0m', output);

    // Look for Cloudflare URL pattern (https://xxxxx.trycloudflare.com)
    const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (urlMatch && !tunnelUrl) {
      tunnelUrl = urlMatch[0];
      const wsUrl = tunnelUrl.replace('https://', 'wss://');

      // Save URL to file for client to read
      const urlData = {
        url: wsUrl,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(path.join(__dirname, '../client/server-url.json'), JSON.stringify(urlData, null, 2));

      console.log('\n\x1b[42m\x1b[30m========================================\x1b[0m');
      console.log('\x1b[42m\x1b[30m  SHARE THIS LINK WITH FRIENDS:        \x1b[0m');
      console.log('\x1b[42m\x1b[30m                                        \x1b[0m');
      console.log('\x1b[42m\x1b[30m  ' + tunnelUrl.padEnd(38) + '\x1b[0m');
      console.log('\x1b[42m\x1b[30m========================================\x1b[0m\n');

      console.log('\x1b[36m📱 Scan QR code to play on mobile:\x1b[0m\n');
      qrcode.generate(tunnelUrl, { small: true });

      console.log('\n\x1b[32m✅ No password required - just share the link!\x1b[0m');
      console.log('\x1b[32m✅ Fast and reliable with Cloudflare\x1b[0m\n');
      console.log('\x1b[36m🎮 Local play: http://localhost:3001\x1b[0m\n');
    }
  });

  tunnel.stderr.on('data', (data) => {
    const output = data.toString().trim();
    // Show all stderr output
    console.log('\x1b[35m[TUNNEL]\x1b[0m', output);
  });

  tunnel.on('close', (code) => {
    if (code !== 0) {
      console.log('\x1b[33m[TUNNEL] Tunnel closed with code ' + code + '. Server will continue running locally.\x1b[0m');
      console.log('\x1b[36m🎮 You can still play locally at: http://localhost:3001\x1b[0m\n');
    } else {
      console.log('\x1b[31m[TUNNEL] Tunnel closed. Shutting down...\x1b[0m');
      server.kill();
      process.exit(code);
    }
  });

  tunnel.on('error', (err) => {
    console.error('\x1b[31m[TUNNEL ERROR] Failed to start Cloudflare tunnel:\x1b[0m', err.message);
    console.log('\x1b[33m💡 Make sure cloudflared is installed and you have internet access\x1b[0m');
    console.log('\x1b[36m🎮 Server will continue running locally at: http://localhost:3001\x1b[0m\n');
  });
}, 2000);

server.on('close', (code) => {
  console.log('\x1b[31m[SERVER] Server closed. Shutting down...\x1b[0m');
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\x1b[33mShutting down gracefully...\x1b[0m');
  server.kill();
  process.exit(0);
});

console.log('\n\x1b[32mBoth server and tunnel running!\x1b[0m');
console.log('\x1b[90mPress Ctrl+C to stop\x1b[0m\n');
