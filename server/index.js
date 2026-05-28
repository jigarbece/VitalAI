import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createAnalyzeRouter } from './routes/analyze.js';
import { createContactRouter } from './routes/contact.js';
import { createStatsRouter } from './routes/stats.js';
import { createQuickPlanRouter } from './routes/quickPlan.js';
import { createStatsService } from './services/statsService.js';
import { createMailService, buildDefaultTransporter } from './services/mailService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;

async function start() {
  const app = express();

  // In production (same-origin), CORS isn't needed but we keep it permissive.
  // In dev, frontend is on localhost:5173 hitting localhost:5000.
  app.use(cors());
  app.set('trust proxy', true);
  app.use(express.json({ limit: '1mb' }));

  // Service singletons
  const stats = await createStatsService({
    filePath: path.join(__dirname, 'data', 'stats.json'),
  });
  const transporter = await buildDefaultTransporter(process.env);
  const mailService = createMailService({
    transporter,
    mailTo: process.env.MAIL_TO || 'curiolightforyou@gmail.com',
    mailFrom: process.env.MAIL_FROM || process.env.GMAIL_USER || 'noreply@vitalai.local',
    logFile: path.join(__dirname, 'data', 'contact-submissions.json'),
  });

  // Serve built React frontend in production
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  const hasClientBuild = await fs.access(clientDist).then(() => true).catch(() => false);

  if (hasClientBuild) {
    app.use(express.static(clientDist));
  } else {
    // Dev fallback: friendly landing page
    app.get('/', (_req, res) => {
      res.type('html').send(`<!doctype html>
<html><head><meta charset="utf-8"><title>VitalAI API</title>
<style>body{font-family:system-ui,sans-serif;background:#0A0F1E;color:#fff;max-width:640px;margin:60px auto;padding:0 24px;line-height:1.6}
a{color:#00D4AA}code{background:#141B30;padding:2px 6px;border-radius:4px;font-size:0.9em}
.tag{display:inline-block;background:#00D4AA;color:#0A0F1E;padding:2px 10px;border-radius:999px;font-weight:700;font-size:12px}</style>
</head><body>
<p><span class="tag">API</span> &nbsp; VitalAI backend is running.</p>
<h1>Vital<span style="color:#00D4AA">AI</span> server</h1>
<p>The app runs on the Vite dev server: <a href="http://localhost:5173">http://localhost:5173</a></p>
</body></html>`);
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, name: 'VitalAI', version: '1.0.0' });
  });

  app.use(createStatsRouter({ stats }));
  app.use(createAnalyzeRouter({ stats }));
  app.use(createQuickPlanRouter({ stats }));
  app.use(createContactRouter({ mailService }));

  // 404 for unknown API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
  });

  // SPA fallback — serve index.html for all other routes (React Router handles client-side)
  if (hasClientBuild) {
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`VitalAI server listening on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY && process.env.USE_MOCK_AI !== 'true') {
      // eslint-disable-next-line no-console
      console.warn('GEMINI_API_KEY not set - analysis will fall back to a mock plan.');
    }
    if (!transporter) {
      // eslint-disable-next-line no-console
      console.warn('SMTP not configured - contact submissions will be saved to data/contact-submissions.json only.');
    }
  });
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});
