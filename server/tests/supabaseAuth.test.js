import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireSupabaseUser } from '../middleware/supabaseAuth.js';

describe('Supabase authentication middleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('fails closed when account services are not configured', async () => {
    const app = express();
    app.get('/private', requireSupabaseUser, (_req, res) => res.json({ ok: true }));
    expect((await request(app).get('/private')).status).toBe(503);
  });

  it('rejects a missing bearer token', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-key';
    const app = express();
    app.get('/private', requireSupabaseUser, (_req, res) => res.json({ ok: true }));
    expect((await request(app).get('/private')).status).toBe(401);
  });

  it('accepts a Supabase-verified user', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'public-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'user-1' }),
    }));
    const app = express();
    app.get('/private', requireSupabaseUser, (req, res) => res.json({ id: req.user.id }));
    const response = await request(app).get('/private').set('Authorization', 'Bearer valid-token');
    expect(response.status).toBe(200);
    expect(response.body.id).toBe('user-1');
  });
});
