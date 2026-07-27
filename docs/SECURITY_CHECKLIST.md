# Security checklist

- Groq calls are server-side; secret keys never enter client bundles.
- Supabase sessions are verified server-side for no-report plan APIs.
- User records and private storage use owner-scoped RLS.
- Admin access depends on server-evaluated `is_admin()` policies.
- Reports and photos use short-lived signed URLs.
- AI output uses strict schema validation and deterministic fallback.
- Uploaded text is marked untrusted and prompt length is capped.
- File size/type validation is enabled; add malware scanning before regulated use.
- Guest result cookies are HTTP-only, same-site, short-lived, and in-memory.
- Public errors exclude raw provider failures and secrets.
- Account export and deletion are user-controlled.
- Urgent symptom detection stops normal generation.
- Rate limits are process-local; use Redis/Upstash before horizontal scaling.
- Review local dependency-audit findings before production upgrades.
- Obtain legal/privacy review before handling regulated medical data.
