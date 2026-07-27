# VitalAI deployment

## Required configuration

Client:

- `VITE_API_URL` (empty for same-origin production)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable/anon key only)

Server:

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable/anon key only)
- optional SMTP variables documented in `.env.example`

Never expose or commit the Groq key or Supabase service-role key.

## Supabase

Run migrations in order:

1. `001_initial_schema.sql`
2. `002_admin_policies.sql`
3. `003_privacy_notifications.sql`

Set the first administrator through the SQL Editor, then manage later roles from the admin panel.

## Render

- Build: `cd server && npm install && cd ../client && npm install && npm run build`
- Start: `cd server && node index.js`
- Node: 20+
- Add all server variables in the Render dashboard.
- Build-time client variables must also be available during the client build.

The local JSON stats/contact fallback is ephemeral on Render. Configure SMTP and use Supabase for durable user data.

## Release checks

Run:

```powershell
cd server
npm.cmd test
cd ..\client
npm.cmd test
npm.cmd run build
```

Confirm authentication, RLS, report upload, signed file access, account deletion, and a real Groq request in staging.
