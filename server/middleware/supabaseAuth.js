export async function requireSupabaseUser(req, res, next) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.authorization || '';
  if (!url || !anonKey) {
    return res.status(503).json({ error: 'Account services are not configured.' });
  }
  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in is required.' });
  }
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { authorization, apikey: anonKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return res.status(401).json({ error: 'Your session is invalid or expired.' });
    req.user = await response.json();
    return next();
  } catch (_) {
    return res.status(503).json({ error: 'Could not verify your session.' });
  }
}
