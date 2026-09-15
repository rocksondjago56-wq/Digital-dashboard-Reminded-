# TTU Graphic Design Portal Audit

Audit date: 2026-09-15

## Implemented and Working in the Project

- The frontend reads `import.meta.env.VITE_API_BASE` with no application URL fallback and checks `GET ${VITE_API_BASE}/health` before the Google account exchange.
- A successful `{ "status": "ok" }` health response enables backend sign-in. The disconnected-service message is only used when `VITE_API_BASE` is missing.
- Google OAuth sessions are exchanged with the backend, which verifies the Supabase access token before issuing the portal session.
- The Supabase `profiles.role` is the source of truth. Only `student`, `lecturer`, and `admin` route to their corresponding dashboard; unknown roles show access denied.
- A missing Supabase profile is created by the backend using its server-only service-role key. The server logs user ID, email, role, and selected dashboard.
- Student, lecturer, and administration registration fields match the requested requirements. Lecturer ID and Staff ID remain optional.
- `0000` activates lecturer/admin registration only while Render has `DEMO_MODE=true`.
- Administrators can generate role codes. The backend supports history, expiration, use tracking, and revocation endpoints.
- Class groups now store group name, course, year, WhatsApp number, and invite link. Admins and lecturers can create, edit, and remove groups. Students can view their year groups and use Join Class Group.

## Required Supabase Changes

1. Run `supabase/schema.sql` in the Supabase SQL Editor if it has not already been run.
2. Run `supabase/migrations/20260915_auth_and_roles.sql` in the SQL Editor.
3. In Supabase Authentication, enable Google and add both `https://digital-dashboard-reminded.vercel.app` and the local development URL to Redirect URLs.
4. Set the backend-only `SUPABASE_SERVICE_ROLE_KEY` in Render. Never put it in Vercel or frontend files.

## Required Vercel Changes

Set these Production environment variables, then redeploy:

```text
VITE_API_BASE=https://digital-dashboard-reminded-8i9o.onrender.com/api
VITE_SUPABASE_URL=https://htxbrxxtchomuhshdqtw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_PUBLIC_APP_URL=https://digital-dashboard-reminded.vercel.app
```

## Required Render Changes

Set `CLIENT_ORIGIN=https://digital-dashboard-reminded.vercel.app`, `DEMO_MODE=true` for presentation only, the Supabase URL/publishable key/service-role key, a real `DATABASE_URL`, and a strong `JWT_SECRET`. Run `npm run prisma:push` from `server` after deploying these source changes so the new class-group and registration-code columns exist.

## External Checks Still Required

- Google OAuth cannot be completed until the Supabase Google provider has a valid client ID/secret and authorized redirect URL.
- Vercel values are baked in at build time, so a new deployment is required after changing `VITE_*` values.
- Render must redeploy this backend commit and expose its existing `/api/health` endpoint.
