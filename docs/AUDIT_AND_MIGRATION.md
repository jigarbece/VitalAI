# VitalAI product and architecture audit

## Executive assessment

VitalAI is a functional React/Express health-wellness MVP, not yet a finished regulated-health product. The strongest parts are report extraction, deterministic calculations, the food catalog, weekly fallback plans, Supabase ownership policies, private storage, and the Groq fallback path. The main risks are a large phase-based client controller, direct browser-to-database writes, incomplete admin content management, process-local quotas/session storage, incomplete AI observability, and limited end-to-end/accessibility coverage.

## Current stack

- React 18, Vite 5, JavaScript, Tailwind CSS 3, Recharts, jsPDF.
- Node.js/Express REST API with Zod, Multer, pdf-parse, and Tesseract.
- Supabase Auth, PostgreSQL, Row-Level Security, and private Storage.
- Groq server-side primary provider; deterministic rule engine remains available.
- Single Render service can serve the production client and API.

## Working product areas

- Guest report analysis and demo mode.
- Registration, login, logout, password recovery, persisted sessions.
- Multi-step health setup with BMI, BMR, TDEE, target and safety estimates.
- Saved user profile, goals, food preferences, health metrics, reports, history.
- Seven-day diet plan, validated food catalog, grocery list, exercise guidance.
- Plan versions, PDF export, daily check-ins, charts, private progress photos.
- Notifications display, privacy export, account deletion.
- Admin users, reports, plans, AI usage and safety review.
- Groq JSON mode, schema validation, timeout/retry, prompt boundary and fallback.

## Critical defect corrected

Guest result state previously restored before Supabase authentication completed. That result could remain visible after another user logged in and suppress loading account data. Guest state is now loaded only after authentication resolves and only for signed-out users. Account changes clear transient health state. Old active plans remain in Plan History and no longer open automatically after login. A guest report transfers only after the user explicitly chooses the result-page registration action.

## Architecture gaps

1. `App.jsx` still owns navigation, authentication, workflow, persistence, and result state. Move toward route modules and feature hooks.
2. `UserDashboard.jsx` is a broad feature container. Split reports, metrics, goals, check-ins, photos, privacy, and overview.
3. Browser-to-Supabase writes rely correctly on RLS, but privileged admin mutations should move behind audited server endpoints.
4. AI quotas and guest session state use process memory, so they do not work across multiple instances or restarts.
5. AI usage logs and safety flags are not populated consistently by every generation path.
6. Weekly plan generation is deterministic; Groq is not yet used for safe variation or partial meal/day regeneration.
7. Report extraction lacks malware scanning and strong magic-byte validation.
8. Contact/stat JSON persistence is unsuitable for ephemeral production disks.
9. Application has no formal router, route-level error boundary, service worker, or offline strategy.
10. Legal text requires jurisdiction-specific review before marketing as a health product.

## UX gaps

- Logged-in navigation contains many destinations; it needs grouped desktop sidebar navigation.
- Dashboard needs next meal, adherence, goal progress, active plan summary, and stronger empty states.
- Light mode is absent.
- Forms need skeletons, unsaved-change protection, and consistent confirmation dialogs.
- Mobile and keyboard navigation need automated verification.
- Public content is phase-based rather than shareable routes.

## Remaining master-prompt work

- Admin CRUD for foods, categories, nutrition, exercise templates, diet templates, notices, provider settings, and audit logs.
- Partial meal/day regeneration, safe AI repair, shared distributed quotas/cache, complete AI logs.
- Advanced multi-metric charts with date ranges and plan comparison/restore/archive/rating.
- Full exercise builder with limitations/equipment inputs.
- Single-day, grocery, exercise, combined, and progress-summary PDFs.
- OCR value editing before confirmation.
- Optional consent-based target visualization provider.
- Public Features, How It Works, BMI Checker, Sample Plan, About, and Contact routes.
- Registration fields for DOB, gender, country, timezone, and separate consent records.
- E2E, authorization, accessibility, mobile, PDF, onboarding, and plan-version tests.
- Production monitoring, backups, dependency remediation, deployment, and legal review.

## Recommended delivery order

1. Data isolation, authorization, and account correctness.
2. Route/feature restructuring and responsive application shell.
3. Complete user workflows and plan lifecycle.
4. Complete audited admin APIs and content management.
5. Distributed AI controls and observability.
6. Accessibility, E2E/mobile testing, performance, and deployment hardening.

