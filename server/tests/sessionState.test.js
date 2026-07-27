import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createSessionStateRouter } from '../routes/sessionState.js';

function app() {
  const instance = express();
  instance.use(createSessionStateRouter());
  return instance;
}

describe('guest session state', () => {
  it('persists completed analysis using an http-only cookie', async () => {
    const agent = request.agent(app());
    const saved = await agent.put('/api/session-state').send({
      state: { mode: 'report', result: { healthScore: 80 } },
    });
    expect(saved.status).toBe(200);
    expect(saved.headers['set-cookie'][0]).toContain('HttpOnly');

    const loaded = await agent.get('/api/session-state');
    expect(loaded.body.state.result.healthScore).toBe(80);
  });

  it('clears persisted state', async () => {
    const agent = request.agent(app());
    await agent.put('/api/session-state').send({ state: { result: { healthScore: 70 } } });
    await agent.delete('/api/session-state');
    const loaded = await agent.get('/api/session-state');
    expect(loaded.body.state).toBeNull();
  });
});
