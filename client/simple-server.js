const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    let filePath = '.' + req.url;
    if (filePath === './') filePath = './shooter.html';

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('\x1b[32m========================================\x1b[0m');
    console.log('\x1b[32m   GAME CLIENT SERVER RUNNING\x1b[0m');
    console.log('\x1b[32m========================================\x1b[0m\n');
    console.log(`\x1b[36mServer running at:\x1b[0m`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`  http://127.0.0.1:${PORT}\n`);
    console.log('\x1b[33mOpen your browser to one of these URLs\x1b[0m');
    console.log('\x1b[90mPress Ctrl+C to stop\x1b[0m\n');
});
