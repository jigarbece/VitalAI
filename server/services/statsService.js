import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DEFAULT_STATE = {
  uniqueVisitorHashes: [],
  totalVisits: 0,
  reportsChecked: 0,
  quickPlansChecked: 0,
};

function hashFingerprint(ip, userAgent) {
  return crypto
    .createHash('sha256')
    .update(`${ip || 'unknown'}|${userAgent || 'unknown'}`)
    .digest('hex')
    .slice(0, 24);
}

/**
 * Parse STATS_BASELINE env var.
 * Format: "visitors:10,visits:25,reports:3,quickPlans:5"
 * This lets you preserve counts across Render deploys (ephemeral disk).
 */
function loadBaseline() {
  const raw = process.env.STATS_BASELINE || '';
  const base = { uniqueVisitors: 0, totalVisits: 0, reportsChecked: 0, quickPlansChecked: 0 };
  if (!raw) return base;
  for (const pair of raw.split(',')) {
    const [key, val] = pair.split(':').map((s) => s.trim());
    const n = parseInt(val, 10);
    if (isNaN(n)) continue;
    if (key === 'visitors') base.uniqueVisitors = n;
    else if (key === 'visits') base.totalVisits = n;
    else if (key === 'reports') base.reportsChecked = n;
    else if (key === 'quickPlans') base.quickPlansChecked = n;
  }
  return base;
}

async function loadState(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      uniqueVisitorHashes: Array.isArray(parsed.uniqueVisitorHashes) ? parsed.uniqueVisitorHashes : [],
      totalVisits: typeof parsed.totalVisits === 'number' ? parsed.totalVisits : 0,
      reportsChecked: typeof parsed.reportsChecked === 'number' ? parsed.reportsChecked : 0,
      quickPlansChecked: typeof parsed.quickPlansChecked === 'number' ? parsed.quickPlansChecked : 0,
    };
  } catch (_err) {
    return { ...DEFAULT_STATE, uniqueVisitorHashes: [] };
  }
}

async function saveState(filePath, state) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}

export async function createStatsService({ filePath }) {
  if (!filePath) throw new Error('filePath is required');

  const baseline = loadBaseline();
  let state = await loadState(filePath);
  let visitorSet = new Set(state.uniqueVisitorHashes);
  let writeChain = Promise.resolve();

  const persist = () => {
    state.uniqueVisitorHashes = Array.from(visitorSet);
    // Chain writes to avoid concurrent overwrites
    writeChain = writeChain.then(() => saveState(filePath, state)).catch(() => {});
    return writeChain;
  };

  return {
    async recordVisit({ ip, userAgent }) {
      const fp = hashFingerprint(ip, userAgent);
      visitorSet.add(fp);
      state.totalVisits += 1;
      await persist();
    },
    async recordReportChecked() {
      state.reportsChecked += 1;
      await persist();
    },
    async recordQuickPlanChecked() {
      state.quickPlansChecked += 1;
      await persist();
    },
    async getStats() {
      return {
        uniqueVisitors: visitorSet.size + baseline.uniqueVisitors,
        totalVisits: state.totalVisits + baseline.totalVisits,
        reportsChecked: state.reportsChecked + baseline.reportsChecked,
        quickPlansChecked: state.quickPlansChecked + baseline.quickPlansChecked,
      };
    },
  };
}
