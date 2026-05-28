import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createMailService } from '../services/mailService.js';

async function tmpLog() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitalai-mail-'));
  return path.join(dir, 'submissions.json');
}

describe('createMailService', () => {
  it('sends via injected transporter when configured', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'abc' });
    const logFile = await tmpLog();
    const svc = createMailService({
      transporter: { sendMail },
      mailTo: 'curiolightforyou@gmail.com',
      mailFrom: 'noreply@vitalai',
      logFile,
    });

    const result = await svc.sendContact({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'Hello there.',
    });

    expect(result.delivered).toBe(true);
    expect(sendMail).toHaveBeenCalledOnce();
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe('curiolightforyou@gmail.com');
    expect(call.subject).toMatch(/Jane/);
    expect(call.text).toContain('jane@example.com');
    expect(call.text).toContain('Hello there.');
  });

  it('falls back to file log when no transporter is provided', async () => {
    const logFile = await tmpLog();
    const svc = createMailService({ transporter: null, logFile });

    const result = await svc.sendContact({
      name: 'Bob',
      email: 'bob@test.com',
      message: 'feedback msg',
    });

    expect(result.delivered).toBe(false);
    expect(result.logged).toBe(true);

    const raw = await fs.readFile(logFile, 'utf-8');
    const entries = JSON.parse(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Bob');
    expect(entries[0].email).toBe('bob@test.com');
    expect(entries[0].message).toBe('feedback msg');
  });

  it('appends to existing log file', async () => {
    const logFile = await tmpLog();
    const svc = createMailService({ transporter: null, logFile });
    await svc.sendContact({ name: 'A', email: 'a@a.com', message: 'first' });
    await svc.sendContact({ name: 'B', email: 'b@b.com', message: 'second' });

    const entries = JSON.parse(await fs.readFile(logFile, 'utf-8'));
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.name)).toEqual(['A', 'B']);
  });

  it('still logs even when send fails (so submission is not lost)', async () => {
    const logFile = await tmpLog();
    const failing = { sendMail: vi.fn().mockRejectedValue(new Error('SMTP down')) };
    const svc = createMailService({ transporter: failing, logFile });

    const result = await svc.sendContact({ name: 'X', email: 'x@x.com', message: 'msg' });
    expect(result.delivered).toBe(false);
    expect(result.logged).toBe(true);

    const entries = JSON.parse(await fs.readFile(logFile, 'utf-8'));
    expect(entries).toHaveLength(1);
  });
});
