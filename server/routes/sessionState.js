import crypto from 'crypto';
import express from 'express';

const SESSION_COOKIE = 'vitalai_guest';
const TTL_MS = 24 * 60 * 60 * 1000;
const states = new Map();

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : '';
}

function cookieOptions(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return { httpOnly: true, sameSite: 'lax', secure, maxAge: TTL_MS, path: '/' };
}

function cleanExpired() {
  const now = Date.now();
  for (const [key, value] of states) {
    if (value.expiresAt <= now) states.delete(key);
  }
}

export function createSessionStateRouter() {
  const router = express.Router();

  router.get('/api/session-state', (req, res) => {
    cleanExpired();
    const id = readCookie(req, SESSION_COOKIE);
    const entry = id ? states.get(id) : null;
    res.set('Cache-Control', 'no-store');
    return res.json({ state: entry?.state || null });
  });

  router.put('/api/session-state', express.json({ limit: '2mb' }), (req, res) => {
    const state = req.body?.state;
    if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Invalid state' });
    let id = readCookie(req, SESSION_COOKIE);
    if (!id || !states.has(id)) id = crypto.randomUUID();
    states.set(id, { state, expiresAt: Date.now() + TTL_MS });
    res.cookie(SESSION_COOKIE, id, cookieOptions(req));
    res.set('Cache-Control', 'no-store');
    return res.json({ ok: true });
  });

  router.delete('/api/session-state', (req, res) => {
    const id = readCookie(req, SESSION_COOKIE);
    if (id) states.delete(id);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return res.json({ ok: true });
  });

  return router;
}
