import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createContactRouter } from '../routes/contact.js';

function buildApp(mailService) {
  const app = express();
  app.use(express.json());
  app.use(createContactRouter({ mailService }));
  return app;
}

describe('POST /api/contact', () => {
  it('returns 400 when name/email/message missing', async () => {
    const send = vi.fn();
    const app = buildApp({ sendContact: send });
    const res = await request(app).post('/api/contact').send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid email', async () => {
    const app = buildApp({ sendContact: vi.fn() });
    const res = await request(app).post('/api/contact').send({
      name: 'A', email: 'notanemail', message: 'hello there',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('returns 400 for too-short message', async () => {
    const app = buildApp({ sendContact: vi.fn() });
    const res = await request(app).post('/api/contact').send({
      name: 'A', email: 'a@b.com', message: 'hi',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/message/i);
  });

  it('returns 200 and calls sendContact with valid payload', async () => {
    const send = vi.fn().mockResolvedValue({ delivered: true, logged: true });
    const app = buildApp({ sendContact: send });
    const res = await request(app).post('/api/contact').send({
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'This is a feedback message, thank you!',
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(send).toHaveBeenCalledWith({
      name: 'Jane Doe',
      email: 'jane@example.com',
      message: 'This is a feedback message, thank you!',
    });
  });

  it('returns 200 even when delivery fails (because submission was logged)', async () => {
    const send = vi.fn().mockResolvedValue({ delivered: false, logged: true });
    const app = buildApp({ sendContact: send });
    const res = await request(app).post('/api/contact').send({
      name: 'Jane', email: 'jane@example.com', message: 'a long enough message',
    });
    expect(res.status).toBe(200);
    expect(res.body.delivered).toBe(false);
  });

  it('returns 500 when both delivery and logging fail', async () => {
    const send = vi.fn().mockResolvedValue({ delivered: false, logged: false });
    const app = buildApp({ sendContact: send });
    const res = await request(app).post('/api/contact').send({
      name: 'Jane', email: 'jane@example.com', message: 'a long enough message',
    });
    expect(res.status).toBe(500);
  });
});
