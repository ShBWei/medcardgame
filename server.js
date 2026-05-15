/**
 * MediCard 医杀 — Hardened Production Server
 * Security: rate-limit, CSP, anti-traversal, input validation, audit logging
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const zlib = require('zlib');
const crypto = require('crypto');
const { PeerServer } = require('peer');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const PEER_PORT = process.env.PEER_PORT || 9000;
const ROOT = __dirname;

// ── Security constants ────────────────────────────────────────
const MAX_REQ_PER_MIN = 120;        // per-IP rate limit
const CLEANUP_INTERVAL = 60_000;    // 1 min
const MAX_URL_LEN = 512;
const MAX_REQ_BODY = 64 * 1024;     // 64KB max payload

const BLOCKED_PATTERNS = [
  /\.php/i, /\.asp/i, /\.jsp/i, /\.cgi/i, /\.pl/i,
  /wp-admin/i, /wp-login/i, /admin\.php/i, /xmlrpc/i,
  /\.env$/i, /\.git/i, /\.svn/i, /\.hg/i,
  /\/etc\//i, /\/bin\//i, /\/boot\//i,
  /SELECT.+FROM/i, /UNION\s+SELECT/i, /<script/i,
  /\.\.\/\.\./, /%2e%2e/i, /%00/i, /\x00/,
];

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

// ── Rate limiter (token bucket per IP) ────────────────────────
const ipBuckets = new Map();

function getBucket(ip) {
  let b = ipBuckets.get(ip);
  if (!b) { b = { tokens: MAX_REQ_PER_MIN, last: Date.now() }; ipBuckets.set(ip, b); }
  // Refill
  const now = Date.now();
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(MAX_REQ_PER_MIN, b.tokens + elapsed * (MAX_REQ_PER_MIN / 60));
  b.last = now;
  return b;
}

setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, b] of ipBuckets) { if (b.last < cutoff) ipBuckets.delete(ip); }
}, CLEANUP_INTERVAL);

// ── Audit log ──────────────────────────────────────────────────
function audit(level, ip, msg) {
  const ts = new Date().toISOString();
  const line = `[AUDIT ${level} ${ts}] [${ip}] ${msg}`;
  if (level === 'WARN' || level === 'BLOCK') console.error(line);
  else console.log(line);
}

// ── Blocked IP set ─────────────────────────────────────────────
const blockedIPs = new Set();

function blockIP(ip, reason) {
  blockedIPs.add(ip);
  audit('BLOCK', ip, `Blocked: ${reason}`);
  setTimeout(() => blockedIPs.delete(ip), 600_000); // 10min ban
}

// ── Global state (persisted to disk) ──────────────────────────
const DATA_DIR = path.join(ROOT, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

// Ensure data directory exists
try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

function loadJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch(e) { console.error('[PERSIST] Load error:', file, e.message); }
  return fallback;
}

function saveJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
  } catch(e) { console.error('[PERSIST] Save error:', file, e.message); }
}

// Load persisted state
const globalLeaderboard = loadJSON(LEADERBOARD_FILE, {
  battle: [],
  contribution: [],
  weeklyBattle: [],
  weeklyContribution: []
});
const MAX_LEADERBOARD_ENTRIES = 200;

const onlinePlayers = new Set();
const cumulativePlayers = new Set(loadJSON(PLAYERS_FILE, { cumulative: [] }).cumulative || []);
// Re-save cumulative on startup to ensure file exists
saveJSON(PLAYERS_FILE, { cumulative: Array.from(cumulativePlayers) });

// Load persisted accounts
const globalAccounts = loadJSON(ACCOUNTS_FILE, {});
const os = require('os');
const ESTIMATED_CAPACITY = os.cpus().length * 25; // ~25 connections per core

// Track online sessions via heartbeat (replaces IP-based HTTP visitor counting).
// Each browser tab gets a unique session ID (sessionStorage), pings every 30s.
// This avoids double-counting PeerJS users, NAT collisions, and premature timeouts.
const clientSessions = new Map();  // sessionId → lastSeen timestamp
const SESSION_TTL = 90_000;        // 90s — client pings every 30s, so 3 misses = offline

function getOnlineCount() {
  const now = Date.now();
  for (const [sid, ts] of clientSessions) {
    if (now - ts > SESSION_TTL) clientSessions.delete(sid);
  }
  return clientSessions.size;
}

function getCumulativeCount() {
  return cumulativePlayers.size;
}

function addToLeaderboard(type, entry) {
  const list = globalLeaderboard[type] || globalLeaderboard.battle;
  // Require userId
  if (!entry || !entry.userId) return;
  // Sanitize
  const clean = {
    userId: String(entry.userId).substring(0, 64),
    name: String(entry.name || '').substring(0, 16).replace(/[<>]/g, ''),
    score: Math.max(0, parseInt(entry.score) || 0),
    wins: Math.max(0, parseInt(entry.wins) || 0),
    totalGames: Math.max(0, parseInt(entry.totalGames) || 0),
    winRate: Math.min(100, Math.max(0, parseFloat(entry.winRate) || 0)),
    reputation: Math.max(0, parseInt(entry.reputation) || 0),
    approved: Math.max(0, parseInt(entry.approved) || 0),
    totalValue: Math.max(0, parseInt(entry.totalValue) || 0)
  };
  // Upsert
  const idx = list.findIndex(e => e.userId === clean.userId);
  if (idx >= 0) list[idx] = clean;
  else list.push(clean);
  // Sort and trim
  if (type === 'battle' || type === 'weeklyBattle') {
    list.sort((a, b) => b.score - a.score || b.wins - a.wins || b.winRate - a.winRate);
  } else {
    list.sort((a, b) => b.reputation - a.reputation || b.totalValue - a.totalValue);
  }
  if (list.length > MAX_LEADERBOARD_ENTRIES) list.length = MAX_LEADERBOARD_ENTRIES;
  // Persist to disk (debounced: at most once per 5 seconds)
  scheduleLeaderboardSave();
}

let _saveTimer = null;
function scheduleLeaderboardSave() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    saveJSON(LEADERBOARD_FILE, globalLeaderboard);
    _saveTimer = null;
  }, 5000);
}

function persistCumulativePlayers() {
  saveJSON(PLAYERS_FILE, { cumulative: Array.from(cumulativePlayers) });
}

function handleApiRoute(req, res, ip) {
  const url = req.url.split('?')[0];
  const qs = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');

  // CORS-lite: allow same-origin + game clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /api/player-stats?sid=xxx — stats + optional heartbeat
  if (req.method === 'GET' && url === '/api/player-stats') {
    // Treat as heartbeat if session ID provided
    const sid = String(qs.get('sid') || '').substring(0, 128);
    if (sid) {
      clientSessions.set(sid, Date.now());
      const prevSize = cumulativePlayers.size;
      cumulativePlayers.add('sid:' + sid);
      if (cumulativePlayers.size !== prevSize) persistCumulativePlayers();
    }
    const online = getOnlineCount();
    const cumulative = getCumulativeCount();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({
      online: online,
      cumulative: cumulative,
      peerCount: onlinePlayers.size,
      estimatedCapacity: ESTIMATED_CAPACITY,
      loadPercent: Math.min(100, Math.round(online / ESTIMATED_CAPACITY * 100))
    }));
    return;
  }

  // GET /api/heartbeat?sid=xxx — session keepalive
  if (req.method === 'GET' && url === '/api/heartbeat') {
    const sid = String(qs.get('sid') || '').substring(0, 128);
    if (sid) {
      clientSessions.set(sid, Date.now());
      // Track cumulative
      const prevSize = cumulativePlayers.size;
      cumulativePlayers.add('sid:' + sid);
      if (cumulativePlayers.size !== prevSize) persistCumulativePlayers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, online: getOnlineCount() }));
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing sid' }));
    }
    return;
  }

  // GET /api/leaderboard?type=battle&period=total
  if (req.method === 'GET' && url === '/api/leaderboard') {
    const type = qs.get('type') === 'contribution' ? 'contribution' : 'battle';
    const period = qs.get('period') === 'weekly' ? 'weekly' : 'total';
    const key = period === 'weekly'
      ? (type === 'battle' ? 'weeklyBattle' : 'weeklyContribution')
      : (type === 'battle' ? 'battle' : 'contribution');
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(globalLeaderboard[key] || []));
    return;
  }

  // POST /api/leaderboard
  if (req.method === 'POST' && url === '/api/leaderboard') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 16384) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
        // Support single entry or batch
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          const type = entry.type === 'contribution' ? 'contribution' : 'battle';
          addToLeaderboard(type, entry);
          // Also add to weekly if flag set
          if (entry.weekly) addToLeaderboard('weekly' + (type === 'battle' ? 'Battle' : 'Contribution'), entry);
        }
        audit('INFO', ip, `Leaderboard update: ${entries.length} entries`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: entries.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Bad request' }));
      }
    });
    return;
  }

  // POST /api/accounts/sync — backup user account data
  if (req.method === 'POST' && url === '/api/accounts/sync') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 65536) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
        // data = { userId, username, passwordHash, avatarColor, avatarIcon, createdAt, gameStats, wrongQuestions, studyProgress }
        const userId = String(data.userId || '').substring(0, 64);
        if (!userId) throw new Error('Missing userId');
        // Merge with existing account data (preserve fields not sent)
        const existing = globalAccounts[userId] || {};
        const mergedStudyProgress = data.studyProgress
          ? { ...(existing.studyProgress || {}), ...data.studyProgress }
          : (existing.studyProgress || {});
        // Sanitize and store
        globalAccounts[userId] = {
          userId: userId,
          username: String(data.username || existing.username || '').substring(0, 16),
          passwordHash: String(data.passwordHash || existing.passwordHash || '').substring(0, 128),
          avatarColor: String(data.avatarColor || existing.avatarColor || '#06b6d4').substring(0, 20),
          avatarIcon: String(data.avatarIcon || existing.avatarIcon || '👨‍⚕️').substring(0, 8),
          createdAt: data.createdAt || existing.createdAt || new Date().toISOString(),
          lastSync: new Date().toISOString(),
          gameStats: Array.isArray(data.gameStats) ? data.gameStats.slice(-50) : (existing.gameStats || []),
          wrongQuestions: Array.isArray(data.wrongQuestions) ? data.wrongQuestions.slice(-200) : (existing.wrongQuestions || []),
          studyProgress: mergedStudyProgress
        };
        saveJSON(ACCOUNTS_FILE, globalAccounts);
        audit('INFO', ip, `Account sync: ${userId}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Bad request' }));
      }
    });
    return;
  }

  // GET /api/accounts/backup?userId=xxx — restore account data
  if (req.method === 'GET' && url === '/api/accounts/backup') {
    const userId = String(qs.get('userId') || '').substring(0, 64);
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing userId' }));
      return;
    }
    const account = globalAccounts[userId];
    if (!account) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Account not found' }));
      return;
    }
    audit('INFO', ip, `Account restore: ${userId}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, account: account }));
    return;
  }

  // GET /api/accounts/lookup?username=xxx — find account by username
  if (req.method === 'GET' && url === '/api/accounts/lookup') {
    const username = String(qs.get('username') || '').trim().substring(0, 16);
    if (!username) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing username' }));
      return;
    }
    let found = null;
    for (const uid of Object.keys(globalAccounts)) {
      if (globalAccounts[uid].username === username) {
        found = { userId: uid, username: globalAccounts[uid].username, avatarColor: globalAccounts[uid].avatarColor, avatarIcon: globalAccounts[uid].avatarIcon, createdAt: globalAccounts[uid].createdAt };
        break;
      }
    }
    if (!found) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Account not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, account: found }));
    return;
  }

  // GET /api/study-progress?userId=xxx — retrieve study progress
  if (req.method === 'GET' && url === '/api/study-progress') {
    const userId = String(qs.get('userId') || '').substring(0, 64);
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Missing userId' }));
      return;
    }
    const account = globalAccounts[userId];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, studyProgress: account ? (account.studyProgress || {}) : {} }));
    return;
  }

  // POST /api/study-progress — save study progress
  if (req.method === 'POST' && url === '/api/study-progress') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 65536) req.destroy(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
        const userId = String(data.userId || '').substring(0, 64);
        if (!userId) throw new Error('Missing userId');
        const existing = globalAccounts[userId] || {};
        existing.studyProgress = data.studyProgress || {};
        if (!existing.userId) existing.userId = userId;
        existing.lastSync = new Date().toISOString();
        globalAccounts[userId] = existing;
        saveJSON(ACCOUNTS_FILE, globalAccounts);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Bad request' }));
      }
    });
    return;
  }

  res.writeHead(404); res.end('Not Found');
}

// ── Static server ──────────────────────────────────────────────
const staticServer = http.createServer((req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : null) || req.socket.remoteAddress || 'unknown';

  // Pre-check: banned IP
  if (blockedIPs.has(ip)) { res.writeHead(403); res.end('Forbidden'); return; }

  // Validate method — allow POST for API endpoints
  const isApiRoute = req.url.startsWith('/api/');

  // Rate limit only API / auth-sensitive routes (not static assets)
  if (isApiRoute) {
    const bucket = getBucket(ip);
    bucket.tokens -= 1;
    if (bucket.tokens < 0) {
      res.writeHead(429, { 'Retry-After': '30' });
      res.end('Too Many Requests');
      if (bucket.tokens < -10) blockIP(ip, `Rate limit exceeded (${req.url})`);
      return;
    }
  }

  // ── API Routes ──────────────────────────────────────────────────
  if (isApiRoute) {
    handleApiRoute(req, res, ip);
    return;
  }

  // Validate method for static routes
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    audit('WARN', ip, `Bad method: ${req.method} ${req.url}`);
    res.writeHead(405); res.end('Method Not Allowed');
    return;
  }

  // Validate URL
  let url = req.url.split('?')[0];
  if (url.length > MAX_URL_LEN) {
    audit('WARN', ip, `URL too long: ${url.length} chars`);
    res.writeHead(414); res.end('URI Too Long');
    return;
  }

  // Block malicious patterns
  for (const pat of BLOCKED_PATTERNS) {
    if (pat.test(url)) {
      audit('WARN', ip, `Blocked pattern match: ${url}`);
      blockIP(ip, `Pattern: ${pat}`);
      res.writeHead(404); res.end('Not Found');
      return;
    }
  }

  if (url === '/') url = '/index.html';

  // Normalize and prevent traversal
  const normalized = path.normalize(url).replace(/\\/g, '/');
  if (normalized.includes('..') || normalized.includes('\x00')) {
    audit('WARN', ip, `Traversal attempt: ${url}`);
    blockIP(ip, 'Path traversal');
    res.writeHead(403); res.end('Forbidden');
    return;
  }

  const filePath = path.join(ROOT, normalized);

  // Double-check containment
  const realPath = path.resolve(filePath);
  if (!realPath.startsWith(ROOT)) {
    audit('WARN', ip, `Path escape: ${url} -> ${realPath}`);
    res.writeHead(403); res.end('Forbidden');
    return;
  }

  // Block sensitive paths
  const basename = path.basename(realPath);
  if (basename.startsWith('.') || basename.endsWith('.key') || basename.endsWith('.pem')) {
    res.writeHead(404); res.end('Not Found');
    return;
  }
  if (realPath.includes('/node_modules/') || realPath.includes('/.git/')) {
    res.writeHead(404); res.end('Not Found');
    return;
  }
  // Block access to top-level tools/ config/ production/ dirs only
  // NOTE: Do NOT use includes('/config/') — it breaks src/modules/config/
  const relPath = path.relative(ROOT, realPath);
  if (relPath.startsWith('tools' + path.sep) || relPath.startsWith('config' + path.sep) || relPath.startsWith('production' + path.sep) || relPath.startsWith('data' + path.sep)) {
    res.writeHead(404); res.end('Not Found');
    return;
  }

  if (!fs.existsSync(realPath) || !fs.statSync(realPath).isFile()) {
    res.writeHead(404); res.end('Not Found');
    return;
  }

  const ext = path.extname(realPath);
  const contentType = MIME[ext] || 'application/octet-stream';

  // Add CSP to HTML responses
  const headers = { ...SECURITY_HEADERS, 'Content-Type': contentType };
  if (ext === '.html') {
    headers['Content-Security-Policy'] =
      "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  } else if (ext === '.js' || ext === '.css') {
    // Subject files are large (3.2MB total), rarely change — cache 24h
    if (url.startsWith('/src/modules/question-bank/subjects/')) {
      headers['Cache-Control'] = 'public, max-age=86400';
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
  } else if (['.png', '.jpg', '.svg', '.ico', '.woff2'].includes(ext)) {
    headers['Cache-Control'] = 'public, max-age=3600';
  }

  // Gzip text-based responses when client supports it (~70% smaller for subject JS)
  const textExts = ['.html', '.css', '.js', '.json', '.svg'];
  if (textExts.includes(ext) && (req.headers['accept-encoding'] || '').includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    res.writeHead(200, headers);
    const gzip = zlib.createGzip({ level: 4 });
    fs.createReadStream(realPath).pipe(gzip).pipe(res);
  } else {
    res.writeHead(200, headers);
    fs.createReadStream(realPath).pipe(res);
  }
});

// ── PeerJS signaling server (internal, port 9000) ────────────────────
const peerServer = PeerServer({
  port: PEER_PORT,
  host: '127.0.0.1',  // Only listen locally — HTTP server proxies externally
  path: '/medicard',
  allow_discovery: true,
  proxied: true,
  concurrent_limit: 10,
  timeout: 5000,
  alive_timeout: 120000,
  key: 'medicard'
});

// ── WebSocket relay server (TCP fallback when P2P/WebRTC blocked) ──
const relayRooms = new Map();  // roomCode → { connections: Map<clientId, ws>, hostId: string }

function relayBroadcast(roomCode, senderId, data) {
  const room = relayRooms.get(roomCode);
  if (!room) return;
  room.connections.forEach((ws, cid) => {
    if (cid !== senderId && ws.readyState === 1) {
      try { ws.send(JSON.stringify(data)); } catch(e) {}
    }
  });
}

function relaySend(roomCode, targetId, data) {
  const room = relayRooms.get(roomCode);
  if (!room) return;
  const ws = room.connections.get(targetId);
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify(data)); } catch(e) {}
  }
}

function relayCleanupRoom(roomCode) {
  const room = relayRooms.get(roomCode);
  if (!room) return;
  let empty = true;
  room.connections.forEach((ws) => { if (ws.readyState === 1) empty = false; });
  if (empty) {
    relayRooms.delete(roomCode);
    audit('INFO', 'relay', `Room ${roomCode} cleaned up (empty)`);
  }
}

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', function(ws) {
  let clientRoom = null;
  let clientId = null;
  const ip = ws._socket ? (ws._socket.remoteAddress || 'unknown') : 'unknown';

  ws.on('message', function(raw) {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch(e) { return; }
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'relay_join':
        clientId = String(msg.clientId || '').substring(0, 64);
        clientRoom = String(msg.room || '').substring(0, 32).toUpperCase();
        if (!clientId || !clientRoom) {
          ws.send(JSON.stringify({ type: 'relay_error', error: 'Missing clientId or room' }));
          return;
        }
        // Create or join room
        let room = relayRooms.get(clientRoom);
        if (!room) {
          room = { connections: new Map(), hostId: clientId };
          relayRooms.set(clientRoom, room);
        }
        room.connections.set(clientId, ws);
        // Notify joiner of current peers
        const peerList = [];
        room.connections.forEach((_, cid) => { if (cid !== clientId) peerList.push(cid); });
        ws.send(JSON.stringify({ type: 'relay_joined', room: clientRoom, clients: peerList, hostId: room.hostId }));
        // Notify others
        relayBroadcast(clientRoom, clientId, { type: 'relay_client_joined', clientId: clientId });
        audit('INFO', ip, `Relay join: ${clientId} → room ${clientRoom} (${room.connections.size} peers)`);
        break;

      case 'relay_data':
        if (!msg.room || !msg.payload) return;
        if (msg.target === 'broadcast' || !msg.target) {
          relayBroadcast(msg.room, clientId, { type: 'relay_data', from: clientId, payload: msg.payload });
        } else {
          relaySend(msg.room, msg.target, { type: 'relay_data', from: clientId, payload: msg.payload });
        }
        break;

      case 'relay_leave':
        if (clientRoom && clientId) {
          const r = relayRooms.get(clientRoom);
          if (r) {
            r.connections.delete(clientId);
            relayBroadcast(clientRoom, clientId, { type: 'relay_client_left', clientId: clientId });
            audit('INFO', ip, `Relay leave: ${clientId} ← room ${clientRoom}`);
          }
          relayCleanupRoom(clientRoom);
        }
        clientRoom = null;
        clientId = null;
        break;
    }
  });

  ws.on('close', function() {
    if (clientRoom && clientId) {
      const r = relayRooms.get(clientRoom);
      if (r) {
        r.connections.delete(clientId);
        relayBroadcast(clientRoom, clientId, { type: 'relay_client_left', clientId: clientId });
        audit('INFO', ip, `Relay disconnect: ${clientId} ← room ${clientRoom}`);
      }
      relayCleanupRoom(clientRoom);
    }
  });

  ws.on('error', function(e) {
    console.error('[RELAY] WebSocket error:', e.message);
  });
});

// Periodic cleanup of stale rooms
setInterval(() => {
  for (const [code, room] of relayRooms) {
    let alive = 0;
    room.connections.forEach((ws) => { if (ws.readyState === 1) alive++; });
    if (alive === 0) relayRooms.delete(code);
  }
}, 120_000);

// ── WebSocket upgrade routing: /medicard (PeerJS) + /relay (TCP fallback) ──
staticServer.on('upgrade', function(req, socket, head) {
  if (req.url.startsWith('/relay')) {
    wss.handleUpgrade(req, socket, head, function(ws) {
      wss.emit('connection', ws, req);
    });
    return;
  }
  if (req.url.startsWith('/medicard')) {
    // Proxy WebSocket upgrade to internal PeerServer
    var proxy = net.connect(PEER_PORT, '127.0.0.1', function() {
      var headers = [];
      headers.push(req.method + ' ' + req.url + ' HTTP/' + req.httpVersion);
      for (var i = 0; i < (req.rawHeaders || []).length; i += 2) {
        headers.push(req.rawHeaders[i] + ': ' + req.rawHeaders[i + 1]);
      }
      headers.push('\r\n');
      proxy.write(headers.join('\r\n'));
      proxy.write(head);
      proxy.pipe(socket);
      socket.pipe(proxy);
    });
    proxy.on('error', function(e) {
      console.error('[WS-PROXY] PeerJS proxy error:', e.message);
      socket.destroy();
    });
    socket.on('error', function() { proxy.destroy(); });
    return;
  }
  socket.destroy();
});

staticServer.listen(PORT, () => {
  console.log(`MediCard → http://0.0.0.0:${PORT}  (PeerJS internal :${PEER_PORT}, proxy via /medicard)`);
});

peerServer.on('connection', (client) => {
  const id = client.getId();
  if (typeof id === 'string') {
    onlinePlayers.add(id);
    cumulativePlayers.add(id);
    persistCumulativePlayers();
    audit('INFO', id, `Peer connected (online: ${onlinePlayers.size}, cumulative: ${cumulativePlayers.size})`);
    console.log(`[BATTLE_LOG]${JSON.stringify({ ts: new Date().toISOString(), peerId: id, event: 'connect', online: onlinePlayers.size, cumulative: cumulativePlayers.size })}`);
  }
});

peerServer.on('disconnect', (client) => {
  const id = client.getId();
  onlinePlayers.delete(id);
  audit('INFO', id, `Peer disconnected (online: ${onlinePlayers.size})`);
  console.log(`[BATTLE_LOG]${JSON.stringify({ ts: new Date().toISOString(), peerId: id, event: 'disconnect', online: onlinePlayers.size })}`);
});

// Log signaling errors + count messages for diagnostics
let signalMsgCount = 0;
peerServer.on('message', (client, data) => {
  signalMsgCount++;
  if (data && JSON.stringify(data).length > 8192) {
    audit('WARN', client.getId(), `Oversized signal message (${JSON.stringify(data).length} bytes)`);
    return;
  }
});
setInterval(() => {
  if (signalMsgCount > 0) {
    console.log(`[BATTLE_LOG]${JSON.stringify({ ts: new Date().toISOString(), event: 'signal_stats', messages: signalMsgCount })}`);
    signalMsgCount = 0;
  }
}, 60000);

console.log(`PeerJS signaling → ws://0.0.0.0:${PORT}/medicard (proxied to :${PEER_PORT})`);
console.log('Server ready — security mode: hardened');

// ── Graceful shutdown — persist data ──────────────────────────
function gracefulShutdown(signal) {
  console.log(`[PERSIST] ${signal} received — saving data...`);
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
  saveJSON(LEADERBOARD_FILE, globalLeaderboard);
  saveJSON(PLAYERS_FILE, { cumulative: Array.from(cumulativePlayers) });
  console.log('[PERSIST] Data saved. Exiting.');
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
