/**
 * MediCard Cloud API — Cloudflare Worker (D1 + KV-free)
 * Handles: register, login, study progress, wrong question book
 * Deploy: npx wrangler deploy
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    try {
      // Auth routes
      if (path === '/api/register' && request.method === 'POST') {
        return handleRegister(request, env);
      }
      if (path === '/api/login' && request.method === 'POST') {
        return handleLogin(request, env);
      }
      if (path === '/api/logout' && request.method === 'POST') {
        return handleLogout(request, env);
      }
      if (path === '/api/me' && request.method === 'GET') {
        return handleMe(request, env);
      }

      // Study progress routes (authenticated)
      if (path === '/api/progress' && request.method === 'GET') {
        return handleGetProgress(request, env);
      }
      if (path === '/api/progress' && request.method === 'POST') {
        return handleSaveProgress(request, env);
      }

      // Wrong question routes (authenticated)
      if (path === '/api/wrong-questions' && request.method === 'GET') {
        return handleGetWrongQuestions(request, env);
      }
      if (path === '/api/wrong-questions' && request.method === 'POST') {
        return handleAddWrongQuestion(request, env);
      }
      if (path.startsWith('/api/wrong-questions/') && request.method === 'DELETE') {
        const id = parseInt(path.split('/').pop());
        return handleDeleteWrongQuestion(request, env, id);
      }

      return corsResponse({ error: 'Not found' }, 404);
    } catch (e) {
      console.error('Worker error:', e);
      return corsResponse({ error: 'Server error', detail: e.message }, 500);
    }
  }
};

// ── CORS helper ────────────────────────────────────────
function corsResponse(data, status) {
  const body = data ? JSON.stringify(data) : null;
  return new Response(body, {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// ── Auth helpers ───────────────────────────────────────
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 32; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
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
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  );
  const hashHexNew = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHexNew === hashHex;
}

async function authenticate(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const session = await env.DB.prepare(
    'SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
  ).bind(token).first();
  if (!session) return null;
  return session.user_id;
}

// ── Route handlers ─────────────────────────────────────

async function handleRegister(request, env) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return corsResponse({ error: 'Username and password required' }, 400);
  }
  if (username.length < 2 || username.length > 20) {
    return corsResponse({ error: 'Username must be 2-20 characters' }, 400);
  }
  if (password.length < 4) {
    return corsResponse({ error: 'Password must be at least 4 characters' }, 400);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existing) {
    return corsResponse({ error: 'Username already taken' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const result = await env.DB.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)'
  ).bind(username, passwordHash).run();

  const userId = result.meta.last_row_id;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, userId, expiresAt).run();

  return corsResponse({ success: true, token, username, userId });
}

async function handleLogin(request, env) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return corsResponse({ error: 'Username and password required' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE username = ?'
  ).bind(username).first();

  if (!user) {
    return corsResponse({ error: 'Invalid username or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return corsResponse({ error: 'Invalid username or password' }, 401);
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(
    'INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(token, user.id, expiresAt).run();

  return corsResponse({ success: true, token, username, userId: user.id });
}

async function handleLogout(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  const auth = request.headers.get('Authorization');
  const token = auth.slice(7);
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  return corsResponse({ success: true });
}

async function handleMe(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  const user = await env.DB.prepare('SELECT id, username, created_at FROM users WHERE id = ?').bind(userId).first();
  return corsResponse({ id: user.id, username: user.username, createdAt: user.created_at });
}

async function handleGetProgress(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  const rows = await env.DB.prepare(
    'SELECT subject, total_answered, total_correct, streak, max_streak, last_studied FROM study_progress WHERE user_id = ?'
  ).bind(userId).all();

  const progress = {};
  for (const r of rows.results) {
    progress[r.subject] = {
      totalAnswered: r.total_answered,
      totalCorrect: r.total_correct,
      streak: r.streak,
      maxStreak: r.max_streak,
      lastStudied: r.last_studied
    };
  }
  return corsResponse({ progress });
}

async function handleSaveProgress(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  const { subject, answered, correct, streak, maxStreak } = await request.json();

  if (!subject) {
    return corsResponse({ error: 'Subject required' }, 400);
  }

  await env.DB.prepare(`
    INSERT INTO study_progress (user_id, subject, total_answered, total_correct, streak, max_streak, last_studied)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT (user_id, subject) DO UPDATE SET
      total_answered = total_answered + ?,
      total_correct = total_correct + ?,
      streak = ?,
      max_streak = MAX(max_streak, ?),
      last_studied = datetime('now')
  `).bind(userId, subject, answered || 0, correct || 0, streak || 0, maxStreak || 0, answered || 0, correct || 0, streak || 0, maxStreak || 0).run();

  return corsResponse({ success: true });
}

async function handleGetWrongQuestions(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  const url = new URL(request.url);
  const subject = url.searchParams.get('subject');

  let query = 'SELECT id, subject, question_index, question_data, added_at FROM wrong_questions WHERE user_id = ?';
  const params = [userId];
  if (subject) {
    query += ' AND subject = ?';
    params.push(subject);
  }
  query += ' ORDER BY added_at DESC';

  const rows = await env.DB.prepare(query).bind(...params).all();
  const questions = rows.results.map(r => ({
    id: r.id,
    subject: r.subject,
    questionIndex: r.question_index,
    questionData: JSON.parse(r.question_data),
    addedAt: r.added_at
  }));
  return corsResponse({ questions });
}

async function handleAddWrongQuestion(request, env) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  const { subject, questionIndex, questionData } = await request.json();

  if (!subject || questionIndex === undefined) {
    return corsResponse({ error: 'Subject and questionIndex required' }, 400);
  }

  // Check if already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM wrong_questions WHERE user_id = ? AND subject = ? AND question_index = ?'
  ).bind(userId, subject, questionIndex).first();

  if (existing) {
    return corsResponse({ success: true, id: existing.id, existed: true });
  }

  const result = await env.DB.prepare(
    'INSERT INTO wrong_questions (user_id, subject, question_index, question_data) VALUES (?, ?, ?, ?)'
  ).bind(userId, subject, questionIndex, JSON.stringify(questionData)).run();

  return corsResponse({ success: true, id: result.meta.last_row_id });
}

async function handleDeleteWrongQuestion(request, env, id) {
  const userId = await authenticate(request, env);
  if (!userId) {
    return corsResponse({ error: 'Not authenticated' }, 401);
  }
  if (!id) {
    return corsResponse({ error: 'Question ID required' }, 400);
  }
  await env.DB.prepare('DELETE FROM wrong_questions WHERE id = ? AND user_id = ?').bind(id, userId).run();
  return corsResponse({ success: true });
}
