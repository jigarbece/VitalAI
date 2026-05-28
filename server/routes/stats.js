import express from 'express';

function clientFingerprint(req) {
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';
  const ua = (req.headers['user-agent'] || 'unknown').toString();
  return { ip, userAgent: ua };
}

export function createStatsRouter({ stats }) {
  if (!stats) throw new Error('stats service is required');

  const router = express.Router();

  router.post('/api/visit', async (req, res) => {
    try {
      const fp = clientFingerprint(req);
      await stats.recordVisit(fp);
      const data = await stats.getStats();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Could not record visit' });
    }
  });

  router.get('/api/stats', async (_req, res) => {
    try {
      const data = await stats.getStats();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Could not fetch stats' });
    }
  });

  return router;
}
