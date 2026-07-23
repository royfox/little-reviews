import { createRemoteJWKSet, jwtVerify } from 'jose';

const jsonHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const passwordIterations = 100_000;
const sessionLifetimeSeconds = 60 * 60 * 24 * 30;
const loginWindowSeconds = 15 * 60;
const maximumLoginAttempts = 5;
const sessionCookieName = 'recall_session';
const publicOrigin = 'https://recall.royfox.co.uk';
const encoder = new TextEncoder();
let accessJwks;
let accessTeamDomain;

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...jsonHeaders, ...extraHeaders } });
}

async function requestBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
}

function isLocalRequest(url) {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
}

function requireSameOrigin(request, url) {
  const origin = request.headers.get('Origin');
  const trustedOrigins = new Set([
    url.origin,
    publicOrigin,
  ].filter(Boolean));
  if (!origin || !trustedOrigins.has(origin)) throw new ApiError(403, 'Cross-site requests are not allowed.');
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function sha256Hex(value) {
  const source = typeof value === 'string' ? encoder.encode(value) : value;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', source));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function passwordHash(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function validateCredentials(payload) {
  const username = String(payload.username ?? '').trim().toLowerCase();
  const password = String(payload.password ?? '');
  if (username.length < 3 || username.length > 128) throw new ApiError(400, 'Username must be between 3 and 128 characters.');
  if (password.length < 12 || password.length > 128) throw new ApiError(400, 'Password must be between 12 and 128 characters.');
  return { username, password };
}

function cookies(request) {
  return Object.fromEntries((request.headers.get('Cookie') ?? '').split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const separator = item.indexOf('=');
    return separator === -1 ? [item, ''] : [item.slice(0, separator), item.slice(separator + 1)];
  }));
}

function sessionCookie(token, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${sessionCookieName}=${token}; Path=/; Max-Age=${sessionLifetimeSeconds}; HttpOnly; SameSite=Strict${secure}`;
}

function expiredSessionCookie(url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${sessionCookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`;
}

async function createSession(db, userId, url) {
  const token = bytesToBase64Url(randomBytes(32));
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare('DELETE FROM app_sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO app_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .bind(await sha256Hex(token), userId, now + sessionLifetimeSeconds, now),
  ]);
  return sessionCookie(token, url);
}

async function currentUser(request, db) {
  const token = cookies(request)[sessionCookieName];
  if (!token || token.length < 32 || token.length > 128) return null;
  return db.prepare(
    'SELECT app_users.id, app_users.username FROM app_sessions JOIN app_users ON app_users.id = app_sessions.user_id WHERE app_sessions.token_hash = ? AND app_sessions.expires_at > ?'
  ).bind(await sha256Hex(token), Math.floor(Date.now() / 1000)).first();
}

async function verifyAccessForInitialSetup(request, env, url) {
  if (isLocalRequest(url)) return;
  const teamDomain = String(env.TEAM_DOMAIN ?? '').replace(/\/+$/, '');
  const audience = String(env.POLICY_AUD ?? '').trim();
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!teamDomain || !audience || !token) throw new ApiError(403, 'Initial setup must be completed through Cloudflare Access.');
  try {
    if (!accessJwks || accessTeamDomain !== teamDomain) {
      accessJwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
      accessTeamDomain = teamDomain;
    }
    await jwtVerify(token, accessJwks, { issuer: teamDomain, audience });
  } catch {
    throw new ApiError(403, 'Cloudflare Access could not authorize initial setup.');
  }
}

async function handleAuth(request, env, url) {
  const { pathname } = url;
  if (pathname === '/api/auth/status' && request.method === 'GET') {
    const configured = Boolean(await env.DB.prepare('SELECT 1 FROM app_users WHERE id = 1').first());
    const user = configured ? await currentUser(request, env.DB) : null;
    return json({ configured, authenticated: Boolean(user), username: user?.username ?? null });
  }
  if (pathname === '/api/auth/setup' && request.method === 'POST') {
    if (await env.DB.prepare('SELECT 1 FROM app_users WHERE id = 1').first()) throw new ApiError(409, 'The account has already been configured.');
    await verifyAccessForInitialSetup(request, env, url);
    const credentials = validateCredentials(await requestBody(request));
    const salt = randomBytes(16);
    const hash = await passwordHash(credentials.password, salt, passwordIterations);
    const now = Math.floor(Date.now() / 1000);
    try {
      await env.DB.prepare(
        'INSERT INTO app_users (id, username, password_salt, password_hash, password_iterations, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?)'
      ).bind(credentials.username, bytesToBase64Url(salt), bytesToBase64Url(hash), passwordIterations, now, now).run();
    } catch {
      throw new ApiError(409, 'The account has already been configured.');
    }
    return json({ authenticated: true, username: credentials.username }, 201, {
      'Set-Cookie': await createSession(env.DB, 1, url),
    });
  }
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    const payload = await requestBody(request);
    const username = String(payload.username ?? '').trim().toLowerCase();
    const password = String(payload.password ?? '');
    if (username.length > 128 || password.length > 128) throw new ApiError(401, 'Username or password is incorrect.');
    const attemptKey = await sha256Hex(`${request.headers.get('CF-Connecting-IP') ?? 'local'}\0${username}`);
    const now = Math.floor(Date.now() / 1000);
    const oldestAttempt = now - loginWindowSeconds;
    await env.DB.prepare('DELETE FROM app_login_attempts WHERE attempted_at < ?').bind(oldestAttempt).run();
    const attemptRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM app_login_attempts WHERE attempt_key = ? AND attempted_at >= ?')
      .bind(attemptKey, oldestAttempt).first();
    if (Number(attemptRow?.count ?? 0) >= maximumLoginAttempts) throw new ApiError(429, 'Too many login attempts. Try again in 15 minutes.');
    const user = await env.DB.prepare(
      'SELECT id, username, password_salt, password_hash, password_iterations FROM app_users WHERE username = ? COLLATE NOCASE'
    ).bind(username).first();
    const candidate = await passwordHash(password, user ? base64UrlToBytes(user.password_salt) : new Uint8Array(16), user?.password_iterations ?? passwordIterations);
    const valid = Boolean(user) && candidate.length === base64UrlToBytes(user.password_hash).length &&
      crypto.subtle.timingSafeEqual(candidate, base64UrlToBytes(user.password_hash));
    if (!valid) {
      await env.DB.prepare('INSERT INTO app_login_attempts (attempt_key, attempted_at) VALUES (?, ?)').bind(attemptKey, now).run();
      throw new ApiError(401, 'Username or password is incorrect.');
    }
    await env.DB.prepare('DELETE FROM app_login_attempts WHERE attempt_key = ?').bind(attemptKey).run();
    return json({ authenticated: true, username: user.username }, 200, {
      'Set-Cookie': await createSession(env.DB, user.id, url),
    });
  }
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const token = cookies(request)[sessionCookieName];
    if (token) await env.DB.prepare('DELETE FROM app_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
    return json({ authenticated: false }, 200, { 'Set-Cookie': expiredSessionCookie(url) });
  }
  return null;
}

function validateReview(payload) {
  const title = String(payload.title ?? '').trim();
  const type = String(payload.type ?? '');
  const author = payload.author == null ? null : String(payload.author).trim() || null;
  const rating = Number(payload.rating);
  const releaseYear = Number(payload.releaseYear);
  const text = Array.isArray(payload.text) ? payload.text.map(value => String(value).trim()).filter(Boolean) : [];
  if (!title || title.length > 300) throw new ApiError(400, 'A title of at most 300 characters is required.');
  if (!['Movie', 'TV Show', 'Book', 'Music'].includes(type)) throw new ApiError(400, 'Choose a valid media type.');
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) throw new ApiError(400, 'Rating must be between 0 and 5.');
  if (!Number.isInteger(releaseYear) || releaseYear < 1800 || releaseYear > 9999) throw new ApiError(400, 'Choose a valid release year.');
  if (!text.length || text.some(value => value.length > 10_000)) throw new ApiError(400, 'Review text is required and each point must be at most 10,000 characters.');
  if ((type === 'Book' || type === 'Music') && !author) throw new ApiError(400, 'An author or artist is required.');
  return { title, type, author, rating, releaseYear, text };
}

function reviewFromRow(row) {
  return {
    id: row.id, title: row.title, author: row.author ?? undefined, type: row.type, rating: row.rating,
    text: JSON.parse(row.text), releaseYear: row.release_year, reviewDate: row.review_date,
    updatedDate: row.updated_date ?? undefined,
  };
}

async function allReviews(db) {
  const { results } = await db.prepare('SELECT id, title, author, type, rating, text, release_year, review_date, updated_date FROM reviews ORDER BY review_date DESC').all();
  return results.map(reviewFromRow);
}

async function oneReview(db, id) {
  const row = await db.prepare('SELECT id, title, author, type, rating, text, release_year, review_date, updated_date FROM reviews WHERE id = ?').bind(id).first();
  if (!row) throw new ApiError(404, 'Review not found.');
  return reviewFromRow(row);
}

async function handleReviews(request, env, path) {
  if (path === '/api/reviews' && request.method === 'GET') return json(await allReviews(env.DB));
  if (path === '/api/reviews' && request.method === 'POST') {
    const review = validateReview(await requestBody(request));
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO reviews (id, title, author, type, rating, text, release_year, review_date, updated_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)'
    ).bind(id, review.title, review.author, review.type, review.rating, JSON.stringify(review.text), review.releaseYear, now, now, now).run();
    return json(await oneReview(env.DB, id), 201);
  }
  const match = path.match(/^\/api\/reviews\/([^/]+)$/);
  if (!match) throw new ApiError(404, 'Endpoint not found.');
  const id = decodeURIComponent(match[1]);
  if (request.method === 'GET') return json(await oneReview(env.DB, id));
  if (request.method === 'PUT') {
    const review = validateReview(await requestBody(request));
    const now = new Date().toISOString();
    const result = await env.DB.prepare(
      'UPDATE reviews SET title = ?, author = ?, type = ?, rating = ?, text = ?, release_year = ?, updated_date = ?, updated_at = ? WHERE id = ?'
    ).bind(review.title, review.author, review.type, review.rating, JSON.stringify(review.text), review.releaseYear, now, now, id).run();
    if (!result.meta.changes) throw new ApiError(404, 'Review not found.');
    return json(await oneReview(env.DB, id));
  }
  if (request.method === 'DELETE') {
    const result = await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
    if (!result.meta.changes) throw new ApiError(404, 'Review not found.');
    return json({ deleted: true });
  }
  throw new ApiError(405, 'Method not allowed.');
}

function secureAssetResponse(response) {
  const secured = new Response(response.body, response);
  secured.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  secured.headers.set('Referrer-Policy', 'no-referrer');
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('X-Frame-Options', 'DENY');
  return secured;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return secureAssetResponse(await env.ASSETS.fetch(request));
    try {
      if (request.method !== 'GET') requireSameOrigin(request, url);
      const authResponse = await handleAuth(request, env, url);
      if (authResponse) return authResponse;
      if (request.method !== 'GET' && !await currentUser(request, env.DB)) throw new ApiError(401, 'Please sign in to continue.');
      return await handleReviews(request, env, url.pathname);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status);
      console.error(error);
      return json({ error: 'The server could not complete that request.' }, 500);
    }
  },
};
