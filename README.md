# TTU Graphic Design Reminder & Announcement System

## Production setup

This project is being prepared to use Supabase for authentication, database storage, and protected user data.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local` and add the Project URL and publishable key from Supabase's **Connect** dialog.
4. In Supabase Authentication settings, set the production site URL and allowed redirect URLs, then keep email confirmation enabled.
5. Run `supabase/migrations/002_lecturer_requests.sql` after the main schema.
6. For an existing Supabase project, also run `supabase/migrations/003_profile_signup_details.sql` so new portal accounts appear with their role request, year, index number, staff ID, and course details.
7. Run `supabase/migrations/006_dual_verification.sql` to add dual-verification profile fields for existing projects.

## Email and phone verification

The Express API stores password and verification hashes in the database, while the Supabase project can provide the PostgreSQL database through `DATABASE_URL`. Configure the backend email and SMS senders before deploying:

```env
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+12345678900
```

In development only, codes are returned to the app when delivery credentials are unavailable. Production never returns verification codes in API responses. Users must verify both the email code and SMS code before sign-in.

Public users may request a lecturer or administrator account, but the department should approve elevated access by changing the profile role in Supabase.

Never expose a Supabase `service_role` key in this Vite application or commit `.env.local`.

## Development

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
