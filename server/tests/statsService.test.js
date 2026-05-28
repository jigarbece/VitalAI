import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createStatsService } from '../services/statsService.js';

async function tmpFile() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vitalai-stats-'));
  return path.join(dir, 'stats.json');
}

describe('createStatsService', () => {
  let file;
  let stats;

  beforeEach(async () => {
    file = await tmpFile();
    stats = await createStatsService({ filePath: file });
  });

  it('starts with all counters at zero', async () => {
    const s = await stats.getStats();
    expect(s.uniqueVisitors).toBe(0);
    expect(s.totalVisits).toBe(0);
    expect(s.reportsChecked).toBe(0);
    expect(s.quickPlansChecked).toBe(0);
  });

  it('counts a unique visitor only once per fingerprint', async () => {
    await stats.recordVisit({ ip: '1.1.1.1', userAgent: 'Mozilla/5.0' });
    await stats.recordVisit({ ip: '1.1.1.1', userAgent: 'Mozilla/5.0' });
    await stats.recordVisit({ ip: '1.1.1.1', userAgent: 'Mozilla/5.0' });
    const s = await stats.getStats();
    expect(s.uniqueVisitors).toBe(1);
    expect(s.totalVisits).toBe(3);
  });

  it('counts different fingerprints separately', async () => {
    await stats.recordVisit({ ip: '1.1.1.1', userAgent: 'Mozilla/5.0' });
    await stats.recordVisit({ ip: '2.2.2.2', userAgent: 'Mozilla/5.0' });
    await stats.recordVisit({ ip: '1.1.1.1', userAgent: 'Chrome/120' });
    const s = await stats.getStats();
    expect(s.uniqueVisitors).toBe(3);
    expect(s.totalVisits).toBe(3);
  });

  it('increments report and quick-plan counters independently', async () => {
    await stats.recordReportChecked();
    await stats.recordReportChecked();
    await stats.recordQuickPlanChecked();
    const s = await stats.getStats();
    expect(s.reportsChecked).toBe(2);
    expect(s.quickPlansChecked).toBe(1);
  });

  it('persists across instances (loads from disk)', async () => {
    await stats.recordVisit({ ip: '9.9.9.9', userAgent: 'UA' });
    await stats.recordReportChecked();

    const stats2 = await createStatsService({ filePath: file });
    const s = await stats2.getStats();
    expect(s.uniqueVisitors).toBe(1);
    expect(s.reportsChecked).toBe(1);
  });

  it('handles a missing data file by starting fresh', async () => {
    const missingPath = path.join(os.tmpdir(), 'vitalai-stats-missing', 'stats.json');
    const s = await createStatsService({ filePath: missingPath });
    const data = await s.getStats();
    expect(data.uniqueVisitors).toBe(0);
  });

  it('handles a corrupt data file by starting fresh', async () => {
    await fs.writeFile(file, 'this is not json {{{', 'utf-8');
    const s = await createStatsService({ filePath: file });
    const data = await s.getStats();
    expect(data.totalVisits).toBe(0);
  });
});
