/**
 * MediCard 医杀 — Production Server
 * Serves static game files + PeerJS signaling for P2P multiplayer
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { PeerServer } = require('peer');

const PORT = process.env.PORT || 8080;
const PEER_PORT = process.env.PEER_PORT || 9000;
const ROOT = __dirname; // serve from project root

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// ── Static file server ──────────────────────────────────────
const staticServer = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  const filePath = path.join(ROOT, url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Don't serve sensitive files
  const basename = path.basename(filePath);
  if (basename.startsWith('.') || filePath.includes('node_modules')) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
  fs.createReadStream(filePath).pipe(res);
});

staticServer.listen(PORT, () => {
  console.log(`🎮 MediCard 医杀 → http://0.0.0.0:${PORT}`);
});

// ── PeerJS signaling server ─────────────────────────────────
const peerServer = PeerServer({
  port: PEER_PORT,
  path: '/medicard',
  allow_discovery: true,
  proxied: false,
});

peerServer.on('connection', (client) => {
  console.log(`🔗 Peer connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`🔌 Peer disconnected: ${client.getId()}`);
});

console.log(`🔗 PeerJS signaling → ws://0.0.0.0:${PEER_PORT}/medicard`);
console.log('✅ Server ready!');
