/**
 * MediCard Cloud API — Cloudflare Pages Function (D1)
 * Handles: auth, progress, wrong-questions, leaderboard, accounts, player-stats
 * Served from same domain as Pages (no CORS needed for same-origin)
 */
let _migrated = false;

async function autoMigrate(env) {
  if (_migrated) return;
  const ddl = [
    `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS study_progress (user_id INTEGER NOT NULL REFERENCES users(id), subject TEXT NOT NULL, total_answered INTEGER NOT NULL DEFAULT 0, total_correct INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, max_streak INTEGER NOT NULL DEFAULT 0, last_studied TEXT, PRIMARY KEY (user_id, subject))`,
    `CREATE TABLE IF NOT EXISTS wrong_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), subject TEXT NOT NULL, question_index INTEGER NOT NULL, question_data TEXT NOT NULL, added_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS player_sessions (sid TEXT PRIMARY KEY, last_seen TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS legacy_accounts (user_id TEXT PRIMARY KEY, username TEXT NOT NULL, password_hash TEXT NOT NULL DEFAULT '', avatar_color TEXT NOT NULL DEFAULT '#06b6d4', avatar_icon TEXT NOT NULL DEFAULT '👨‍⚕️', created_at TEXT NOT NULL DEFAULT (datetime('now')), last_sync TEXT NOT NULL DEFAULT (datetime('now')), game_stats TEXT NOT NULL DEFAULT '[]', wrong_questions TEXT NOT NULL DEFAULT '[]', study_progress TEXT NOT NULL DEFAULT '{}')`,
    `CREATE TABLE IF NOT EXISTS leaderboard (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, username TEXT NOT NULL DEFAULT '', type TEXT NOT NULL, period TEXT NOT NULL DEFAULT 'total', score REAL NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0, win_rate REAL NOT NULL DEFAULT 0, max_streak INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, reputation INTEGER NOT NULL DEFAULT 0, total_value INTEGER NOT NULL DEFAULT 0, approved INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_legacy_accounts_username ON legacy_accounts(username)`,
    `CREATE INDEX IF NOT EXISTS idx_lb_type_period ON leaderboard(type, period)`,
    `CREATE INDEX IF NOT EXISTS idx_lb_score ON leaderboard(type, period, score DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_wq_user ON wrong_questions(user_id, subject)`,
    `CREATE INDEX IF NOT EXISTS idx_progress_user ON study_progress(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`,
  ];
  for (const sql of ddl) {
    try { await env.DB.prepare(sql).run(); } catch(e) { console.error('DDL error:', e.message); }
  }
  _migrated = true;
  console.log('[MediCard] Auto-migration complete');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return jsonResponse(null, 204);
  await autoMigrate(env);

  try {
    if (path === '/api/register' && request.method === 'POST') return handleRegister(request, env);
    if (path === '/api/login' && request.method === 'POST') return handleLogin(request, env);
    if (path === '/api/logout' && request.method === 'POST') return handleLogout(request, env);
    if (path === '/api/me' && request.method === 'GET') return handleMe(request, env);

    if (path === '/api/progress' && request.method === 'GET') return handleGetProgress(request, env);
    if (path === '/api/progress' && request.method === 'POST') return handleSaveProgress(request, env);

    if (path === '/api/wrong-questions' && request.method === 'GET') return handleGetWrongQuestions(request, env);
    if (path === '/api/wrong-questions' && request.method === 'POST') return handleAddWrongQuestion(request, env);
    if (path.startsWith('/api/wrong-questions/') && request.method === 'DELETE') {
      return handleDeleteWrongQuestion(request, env, parseInt(path.split('/').pop()));
    }

    if (path === '/api/player-stats' && request.method === 'GET') return handlePlayerStats(request, env);
    if (path === '/api/heartbeat' && request.method === 'GET') return handleHeartbeat(request, env);

    if (path === '/api/leaderboard' && request.method === 'GET') return handleGetLeaderboard(request, env);
    if (path === '/api/leaderboard' && request.method === 'POST') return handlePostLeaderboard(request, env);

    if (path === '/api/accounts/sync' && request.method === 'POST') return handleAccountSync(request, env);
    if (path === '/api/accounts/backup' && request.method === 'GET') return handleAccountBackup(request, env);
    if (path === '/api/accounts/lookup' && request.method === 'GET') return handleAccountLookup(request, env);

    if (path === '/api/study-progress' && request.method === 'GET') return handleLegacyGetProgress(request, env);
    if (path === '/api/study-progress' && request.method === 'POST') return handleLegacySaveProgress(request, env);

    return jsonResponse({ error: 'Not found' }, 404);
  } catch (e) {
    console.error('API error:', e);
    return jsonResponse({ error: 'Server error', detail: e.message }, 500);
  }
}

function jsonResponse(data, status) {
  const body = data ? JSON.stringify(data) : null;
  const headers = { 'Content-Type': 'application/json' };
  // CORS for non-same-origin access (e.g., curl, other tools)
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  return new Response(body, { status: status || 200, headers });
}

// Auth helpers
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 32; i++) token += chars[bytes[i] % chars.length];
  return token;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return saltHex + ':' + hashHex;
}

async function verifyPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const hashHexNew = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHexNew === hashHex;
}

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const session = await env.DB.prepare(
    "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  return session ? session.user_id : null;
}

// Auth route handlers
async function handleRegister(request, env) {
  const { username, password } = await request.json();
  if (!username || !password) return jsonResponse({ error: 'Username and password required' }, 400);
  if (username.length < 2 || username.length > 20) return jsonResponse({ error: 'Username must be 2-20 characters' }, 400);
  if (password.length < 4) return jsonResponse({ error: 'Password must be at least 4 characters' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) return jsonResponse({ error: 'Username already taken' }, 409);

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).bind(username, passwordHash).run();

  const userId = result.meta.last_row_id;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();

  return jsonResponse({ success: true, token, username, userId });
}

async function handleLogin(request, env) {
  const { username, password } = await request.json();
  if (!username || !password) return jsonResponse({ error: 'Username and password required' }, 400);

  const user = await env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE username = ?'
  ).bind(username).first();
  if (!user) return jsonResponse({ error: 'Invalid username or password' }, 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return jsonResponse({ error: 'Invalid username or password' }, 401);

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  return jsonResponse({ success: true, token, username, userId: user.id });
}

async function handleLogout(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  const token = request.headers.get('Authorization').slice(7);
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return jsonResponse({ success: true });
}

async function handleMe(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  const user = await env.DB.prepare('SELECT id, username, created_at FROM users WHERE id = ?').bind(userId).first();
  return jsonResponse({ id: user.id, username: user.username, createdAt: user.created_at });
}

// Progress (token-based)
async function handleGetProgress(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  const rows = await env.DB.prepare(
    'SELECT subject, total_answered, total_correct, streak, max_streak, last_studied FROM study_progress WHERE user_id = ?'
  ).bind(userId).all();
  const progress = {};
  for (const r of rows.results) {
    progress[r.subject] = {
      totalAnswered: r.total_answered, totalCorrect: r.total_correct,
      streak: r.streak, maxStreak: r.max_streak, lastStudied: r.last_studied
    };
  }
  return jsonResponse({ progress });
}

async function handleSaveProgress(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  const { subject, answered, correct, streak, maxStreak } = await request.json();
  if (!subject) return jsonResponse({ error: 'Subject required' }, 400);

  await env.DB.prepare(`
    INSERT INTO study_progress (user_id, subject, total_answered, total_correct, streak, max_streak, last_studied)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (user_id, subject) DO UPDATE SET
      total_answered = total_answered + ?, total_correct = total_correct + ?,
      streak = ?, max_streak = MAX(max_streak, ?), last_studied = datetime('now')
  `).bind(userId, subject, answered || 0, correct || 0, streak || 0, maxStreak || 0,
          answered || 0, correct || 0, streak || 0, maxStreak || 0).run();
  return jsonResponse({ success: true });
}

// Wrong questions (token-based)
async function handleGetWrongQuestions(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  const subject = new URL(request.url).searchParams.get('subject');

  let query = 'SELECT id, subject, question_index, question_data, added_at FROM wrong_questions WHERE user_id = ?';
  const params = [userId];
  if (subject) { query += ' AND subject = ?'; params.push(subject); }
  query += ' ORDER BY added_at DESC';

  const rows = await env.DB.prepare(query).bind(...params).all();
  const questions = rows.results.map(r => ({
    id: r.id, subject: r.subject, questionIndex: r.question_index,
    questionData: JSON.parse(r.question_data), addedAt: r.added_at
  }));
  return jsonResponse({ questions });
}

async function handleAddWrongQuestion(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  const { subject, questionIndex, questionData } = await request.json();
  if (!subject || questionIndex === undefined) return jsonResponse({ error: 'Subject and questionIndex required' }, 400);

  const existing = await env.DB.prepare(
    'SELECT id FROM wrong_questions WHERE user_id = ? AND subject = ? AND question_index = ?'
  ).bind(userId, subject, questionIndex).first();
  if (existing) return jsonResponse({ success: true, id: existing.id, existed: true });

  const result = await env.DB.prepare(
    'INSERT INTO wrong_questions (user_id, subject, question_index, question_data) VALUES (?, ?, ?, ?)'
  ).bind(userId, subject, questionIndex, JSON.stringify(questionData)).run();
  return jsonResponse({ success: true, id: result.meta.last_row_id });
}

async function handleDeleteWrongQuestion(request, env, id) {
  const userId = await authenticate(request, env);
  if (!userId) return jsonResponse({ error: 'Not authenticated' }, 401);
  if (!id) return jsonResponse({ error: 'Question ID required' }, 400);
  await env.DB.prepare('DELETE FROM wrong_questions WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return jsonResponse({ success: true });
}

// Player stats (session-based, no auth)
async function handlePlayerStats(request, env) {
  const url = new URL(request.url);
  const sid = (url.searchParams.get('sid') || '').substring(0, 128);

  if (sid) {
    await env.DB.prepare(
      "INSERT INTO player_sessions (sid, last_seen) VALUES (?, datetime('now')) ON CONFLICT(sid) DO UPDATE SET last_seen = datetime('now')"
    ).bind(sid).run();
  }

  const online = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM player_sessions WHERE last_seen > datetime('now', '-5 minutes')"
  ).first();
  const cumulative = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM player_sessions'
  ).first();

  return jsonResponse({
    online: online ? online.count : 0,
    cumulative: cumulative ? cumulative.count : 0,
    peerCount: 0,
    estimatedCapacity: 500,
    loadPercent: 0
  });
}

async function handleHeartbeat(request, env) {
  const url = new URL(request.url);
  const sid = (url.searchParams.get('sid') || '').substring(0, 128);
  if (!sid) return jsonResponse({ ok: false, error: 'Missing sid' }, 400);

  await env.DB.prepare(
    "INSERT INTO player_sessions (sid, last_seen) VALUES (?, datetime('now')) ON CONFLICT(sid) DO UPDATE SET last_seen = datetime('now')"
  ).bind(sid).run();

  return jsonResponse({ ok: true, online: 1 });
}

// Leaderboard
async function handleGetLeaderboard(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') === 'contribution' ? 'contribution' : 'battle';
  const period = url.searchParams.get('period') === 'weekly' ? 'weekly' : 'total';

  const rows = await env.DB.prepare(
    'SELECT user_id, username, score, wins, losses, win_rate, max_streak, streak, reputation, total_value, approved FROM leaderboard WHERE type = ? AND period = ? ORDER BY score DESC LIMIT 50'
  ).bind(type, period).all();

  return jsonResponse(rows.results.map(r => ({
    userId: r.user_id,
    username: r.username,
    score: r.score,
    wins: r.wins,
    losses: r.losses,
    winRate: r.win_rate,
    maxStreak: r.max_streak,
    streak: r.streak,
    reputation: r.reputation,
    totalValue: r.total_value,
    approved: r.approved
  })));
}

async function handlePostLeaderboard(request, env) {
  const data = await request.json();
  if (!data || typeof data !== 'object') return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);

  const entries = Array.isArray(data) ? data : [data];
  for (const entry of entries) {
    const type = entry.type === 'contribution' ? 'contribution' : 'battle';
    const userId = String(entry.userId || '').substring(0, 64);
    if (!userId) continue;

    await env.DB.prepare(`
      INSERT INTO leaderboard (user_id, username, type, period, score, wins, losses, win_rate, max_streak, streak, reputation, total_value, approved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `).bind(
      userId, String(entry.username || '').substring(0, 16), type, entry.period || 'total',
      entry.score || 0, entry.wins || 0, entry.losses || 0, entry.winRate || 0,
      entry.maxStreak || 0, entry.streak || 0, entry.reputation || 0,
      entry.totalValue || 0, entry.approved || 0
    ).run();

    await env.DB.prepare(`
      UPDATE leaderboard SET
        username = ?, score = ?, wins = ?, losses = ?, win_rate = ?,
        max_streak = ?, streak = ?, reputation = ?, total_value = ?, approved = ?,
        updated_at = datetime('now')
      WHERE user_id = ? AND type = ? AND period = ?
    `).bind(
      String(entry.username || '').substring(0, 16), entry.score || 0, entry.wins || 0,
      entry.losses || 0, entry.winRate || 0, entry.maxStreak || 0, entry.streak || 0,
      entry.reputation || 0, entry.totalValue || 0, entry.approved || 0,
      userId, type, entry.period || 'total'
    ).run();
  }
  return jsonResponse({ ok: true, count: entries.length });
}

// Legacy accounts (localStorage backup)
async function handleAccountSync(request, env) {
  const data = await request.json();
  if (!data || typeof data !== 'object') return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);

  const userId = String(data.userId || '').substring(0, 64);
  if (!userId) return jsonResponse({ ok: false, error: 'Missing userId' }, 400);

  const existing = await env.DB.prepare('SELECT * FROM legacy_accounts WHERE user_id = ?').bind(userId).first();
  const merged = {
    userId,
    username: String(data.username || (existing ? existing.username : '')).substring(0, 16),
    passwordHash: String(data.passwordHash || (existing ? existing.password_hash : '')).substring(0, 128),
    avatarColor: String(data.avatarColor || (existing ? existing.avatar_color : '#06b6d4')).substring(0, 20),
    avatarIcon: String(data.avatarIcon || (existing ? existing.avatar_icon : '👨‍⚕️')).substring(0, 8),
    gameStats: JSON.stringify((Array.isArray(data.gameStats) ? data.gameStats.slice(-50) : (existing ? JSON.parse(existing.game_stats || '[]') : []))),
    wrongQuestions: JSON.stringify((Array.isArray(data.wrongQuestions) ? data.wrongQuestions.slice(-200) : (existing ? JSON.parse(existing.wrong_questions || '[]') : []))),
    studyProgress: JSON.stringify(data.studyProgress || (existing ? JSON.parse(existing.study_progress || '{}') : {}))
  };

  await env.DB.prepare(`
    INSERT INTO legacy_accounts (user_id, username, password_hash, avatar_color, avatar_icon, game_stats, wrong_questions, study_progress, last_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username, password_hash = excluded.password_hash,
      avatar_color = excluded.avatar_color, avatar_icon = excluded.avatar_icon,
      game_stats = excluded.game_stats, wrong_questions = excluded.wrong_questions,
      study_progress = excluded.study_progress, last_sync = datetime('now')
  `).bind(merged.userId, merged.username, merged.passwordHash, merged.avatarColor, merged.avatarIcon,
          merged.gameStats, merged.wrongQuestions, merged.studyProgress).run();

  return jsonResponse({ ok: true });
}

async function handleAccountBackup(request, env) {
  const url = new URL(request.url);
  const userId = (url.searchParams.get('userId') || '').substring(0, 64);
  if (!userId) return jsonResponse({ ok: false, error: 'Missing userId' }, 400);

  const account = await env.DB.prepare('SELECT * FROM legacy_accounts WHERE user_id = ?').bind(userId).first();
  if (!account) return jsonResponse({ ok: false, error: 'Account not found' }, 404);

  return jsonResponse({
    ok: true,
    account: {
      userId: account.user_id,
      username: account.username,
      passwordHash: account.password_hash,
      avatarColor: account.avatar_color,
      avatarIcon: account.avatar_icon,
      createdAt: account.created_at,
      lastSync: account.last_sync,
      gameStats: JSON.parse(account.game_stats || '[]'),
      wrongQuestions: JSON.parse(account.wrong_questions || '[]'),
      studyProgress: JSON.parse(account.study_progress || '{}')
    }
  });
}

async function handleAccountLookup(request, env) {
  const url = new URL(request.url);
  const username = (url.searchParams.get('username') || '').trim().substring(0, 16);
  if (!username) return jsonResponse({ ok: false, error: 'Missing username' }, 400);

  const account = await env.DB.prepare('SELECT * FROM legacy_accounts WHERE username = ?').bind(username).first();
  if (!account) return jsonResponse({ ok: false, error: 'Account not found' }, 404);

  return jsonResponse({
    ok: true,
    account: {
      userId: account.user_id,
      username: account.username,
      avatarColor: account.avatar_color,
      avatarIcon: account.avatar_icon,
      createdAt: account.created_at
    }
  });
}

// Legacy study progress (userId-based, no auth)
async function handleLegacyGetProgress(request, env) {
  const url = new URL(request.url);
  const userId = (url.searchParams.get('userId') || '').substring(0, 64);
  if (!userId) return jsonResponse({ ok: false, error: 'Missing userId' }, 400);

  const account = await env.DB.prepare('SELECT study_progress FROM legacy_accounts WHERE user_id = ?').bind(userId).first();
  const progress = account ? JSON.parse(account.study_progress || '{}') : {};
  return jsonResponse({ ok: true, studyProgress: progress });
}

async function handleLegacySaveProgress(request, env) {
  const data = await request.json();
  if (!data || typeof data !== 'object') return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);

  const userId = String(data.userId || '').substring(0, 64);
  if (!userId) return jsonResponse({ ok: false, error: 'Missing userId' }, 400);

  const existing = await env.DB.prepare('SELECT * FROM legacy_accounts WHERE user_id = ?').bind(userId).first();
  const studyProgress = JSON.stringify(data.studyProgress || {});

  await env.DB.prepare(`
    INSERT INTO legacy_accounts (user_id, username, study_progress, last_sync)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET study_progress = excluded.study_progress, last_sync = datetime('now')
  `).bind(userId, (existing ? existing.username : ''), studyProgress).run();

  return jsonResponse({ ok: true });
}
