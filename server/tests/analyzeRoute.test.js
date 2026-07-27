import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createAnalyzeRouter } from '../routes/analyze.js';

function buildApp(deps) {
  const app = express();
  app.use(createAnalyzeRouter(deps));
  return app;
}

const sampleProfile = {
  age: 30,
  gender: 'Female',
  weight: 65,
  height: 165,
  diet: 'Vegetarian',
  activity: 'Lightly Active (1-3 days/week)',
  goals: ['Improve Energy'],
  conditions: '',
};

describe('POST /api/analyze', () => {
  let extractTextFromPdf, extractTextFromImage, generateHealthPlan;

  beforeEach(() => {
    extractTextFromPdf = vi.fn().mockResolvedValue('Hemoglobin 12 g/dL');
    extractTextFromImage = vi.fn().mockResolvedValue('Hemoglobin 12 g/dL');
    generateHealthPlan = vi.fn().mockResolvedValue({ healthScore: 80, bloodMarkers: [] });
  });

  it('returns 400 when no file is uploaded', async () => {
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/i);
  });

  it('returns 400 when userProfile is missing or invalid', async () => {
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/profile/i);
  });

  it('returns 400 when required profile fields are missing', async () => {
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('userProfile', JSON.stringify({ age: 30 }));
    expect(res.status).toBe(400);
  });

  it('routes PDFs to extractTextFromPdf', async () => {
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4 fake'), { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(res.status).toBe(200);
    expect(extractTextFromPdf).toHaveBeenCalledOnce();
    expect(extractTextFromImage).not.toHaveBeenCalled();
    expect(generateHealthPlan).toHaveBeenCalledOnce();
    expect(res.body.healthScore).toBe(80);
  });

  it('routes images to extractTextFromImage', async () => {
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]), { filename: 'r.jpg', contentType: 'image/jpeg' })
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(res.status).toBe(200);
    expect(extractTextFromImage).toHaveBeenCalledOnce();
    expect(extractTextFromPdf).not.toHaveBeenCalled();
  });

  it('returns 500 when generateHealthPlan throws', async () => {
    generateHealthPlan.mockRejectedValueOnce(new Error('upstream boom'));
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });

  it('calls stats.recordReportChecked on success', async () => {
    const stats = { recordReportChecked: vi.fn().mockResolvedValue(undefined) };
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan, stats });
    await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(stats.recordReportChecked).toHaveBeenCalledOnce();
  });

  it('does not call stats.recordReportChecked on failure', async () => {
    const stats = { recordReportChecked: vi.fn().mockResolvedValue(undefined) };
    generateHealthPlan.mockRejectedValueOnce(new Error('boom'));
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan, stats });
    await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(stats.recordReportChecked).not.toHaveBeenCalled();
  });

  it('still calls AI when text extraction returns empty (graceful)', async () => {
    extractTextFromPdf.mockResolvedValueOnce('');
    const app = buildApp({ extractTextFromPdf, extractTextFromImage, generateHealthPlan });
    const res = await request(app)
      .post('/api/analyze')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'r.pdf', contentType: 'application/pdf' })
      .field('userProfile', JSON.stringify(sampleProfile));
    expect(res.status).toBe(200);
    expect(generateHealthPlan).toHaveBeenCalledWith('', expect.any(Object), expect.any(Object));
  });
});
