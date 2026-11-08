# Student Planner

Expo and React Native planner with Supabase Auth, Postgres, Row Level Security, and private Storage.

## Supabase setup

1. Create a Supabase project and open **Project Settings → API**. Copy the project URL and the publishable key (or legacy anon key).
2. Copy `.env.example` to `.env.local` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. These client values are public; never put a `service_role` or secret key in the app.
3. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). It creates the `profiles`, `schedules`, `tasks`, and `revisions` tables, per-user RLS policies, a profile-on-signup trigger, and private `avatars` and `revision-materials` Storage buckets.
4. Configure email authentication under **Authentication → URL Configuration** and **Authentication → Providers**. If email confirmation is enabled, users must confirm their email before signing in.
5. Install dependencies and start Expo:

   ```bash
   npm install
   npx expo start
   ```

For Vercel, add both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to the project’s environment variables and redeploy. Restart Expo after changing local environment variables.

The app uses the authenticated Supabase user UUID for ownership; email addresses are profile data, not authorization identifiers. RLS isolates every profile, schedule, task, revision record, and uploaded file to its owner. Revision sharing creates a temporary signed URL. Existing local-only schedule/task data is not automatically copied to the cloud. The CGPA calculator remains local because no CGPA table is included in the requested schema.

## Development

- Route files are in `src/app/` and use Expo Router.
- Run `npx tsc --noEmit` for a TypeScript check.
- Never commit `.env` or `.env.local`, and never use a Supabase service-role key in the client.
