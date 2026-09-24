# Post-migration runbook

This document describes the manual steps required after the Next.js, Turborepo, Drizzle, and Better Auth migration.

## 1. Prepare a backup

The migration recreates the `sessions` table to match Better Auth. Auth.js was using JWT sessions, but the old table may still contain data that is not needed. Back up PostgreSQL before applying the migration.

Do not run the migration against production until the backup and environment variables are ready.

## 2. Configure environment variables

Add these variables to the local `.env` file and to the deployment environment:

```env
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=https://your-domain.example
```

Generate a strong secret, for example:

```bash
openssl rand -base64 32
```

`BETTER_AUTH_URL` must be the public origin, without a trailing path. The current configuration falls back to `NEXT_PUBLIC_VERCEL_URL` when `BETTER_AUTH_URL` is not set.

The old `NEXTAUTH_SECRET` is temporarily supported as a fallback for local development, but new deployments should use `BETTER_AUTH_SECRET` only. Remove the old NextAuth variables after verifying the new login flow.

If the application uses a different origin for local development, configure the corresponding Better Auth origin and Google OAuth redirect URI separately.

## 3. Update Google OAuth

In Google Cloud Console, update the OAuth client authorized redirect URI to:

```text
https://your-domain.example/api/auth/callback/google
```

For local development, use the local origin, for example:

```text
http://localhost:3000/api/auth/callback/google
```

The old NextAuth callback path must not be used. Better Auth handles the callback through the new catch-all route at `app/api/auth/[...all]/route.ts`.

Keep the Google client ID, client secret, and service-account private key in the environment. Do not commit them.

## 4. Install dependencies

The lockfile has already been updated. On a clean machine or CI runner, install with:

```bash
pnpm install --frozen-lockfile
```

Verify the main versions:

```bash
pnpm --filter web exec node -p "require('next/package.json').version"
pnpm --filter @verific/auth exec node -e "import('better-auth').then(() => console.log('Better Auth loaded'))"
pnpm exec turbo --version
```

Expected versions are Next.js `16.3.6`, Better Auth `1.7.6`, and Turborepo `2.11.3`.

## 5. Apply the database migration

Run the migration from the repository root after the backup:

```bash
pnpm db:migrate
```

Migration `packages/drizzle/migrations/0014_better_auth.sql` performs the following changes:

- Adds `updated_at` to `users`.
- Converts `users.emailVerified` from a timestamp to a boolean.
- Adds Better Auth account fields, including token expiration fields and `created_at`/`updated_at`.
- Makes the legacy account `type` column nullable.
- Recreates `sessions` with Better Auth's `id`, `token`, `user_id`, `expires_at`, `ip_address`, and `user_agent` fields.
- Creates the `verification` table and its identifier index.
- Preserves the existing users, projects, participants, and linked Google account rows.

Do not use `pnpm db:push` for this migration. The migration is intentionally explicit because it changes the session model and the meaning of `emailVerified`.

After applying it, validate the migration files:

```bash
pnpm --filter @verific/drizzle exec drizzle-kit check
```

The command should report that everything is fine.

## 6. Restart the application

Restart the development server or redeploy after changing environment variables and applying the database migration.

```bash
pnpm dev
```

Better Auth validates its Drizzle schema when the server starts. If the old schema is still being reported, verify that the migration completed and restart the process.

## 7. Deploy safely

Use this order for production:

1. Configure `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, database variables, and Google credentials in Vercel.
2. Take or verify the PostgreSQL backup.
3. Apply `pnpm db:migrate` using the production database.
4. Deploy the new application build.
5. Run the smoke tests below.

The application is designed for static delivery of public event content. Known event URLs are generated at build time, while dynamic session and enrollment content is streamed or requested on demand. No Redis or separate cache service is required for the initial deployment.

## 8. Smoke tests

### Public event page

1. Open a known event URL directly, without logging in.
2. Confirm that the event title, description, location, branding, and schedule links render.
3. Confirm that the page is served as static or partially prerendered content in the Vercel build output.
4. Confirm that the header shows the public event links and a login action.

### Login and callback

1. Click the header login action.
2. Complete Google authentication.
3. Confirm that the user returns to the event URL, not always `/account`.
4. Confirm that the header displays the signed-in user.
5. Open `/account` and `/dashboard` and confirm that access is allowed.

### Event registration

1. Open an event with registration enabled.
2. Sign in and submit the registration form.
3. Confirm that the participant record is created.
4. Confirm that the user is redirected to `/:eventUrl/my`.
5. Confirm that the event CTA changes to the participant state.
6. Confirm that registration is rejected when the event is archived, registration is disabled, or the event has ended.

### Schedule subscriptions

1. Open the schedule for the event.
2. Confirm that the activity list loads.
3. Join and leave an activity.
4. Confirm that the activity state and participant count refresh.
5. Confirm that subscription state does not leak between different events for the same user.

### Sign out

1. Sign out from the event header and from the dashboard.
2. Confirm that protected pages redirect to `/auth`.
3. Confirm that the public event page remains accessible anonymously.

## 9. Expected user impact

Existing Auth.js JWT cookies are not Better Auth database sessions. Users should be expected to sign in again after deployment. Existing user and Google account records remain in PostgreSQL, so this should not require recreating user profiles or event participation records.

If a user reports an old session still appearing logged in, clear the old NextAuth cookies or ask the user to sign out/sign in through the new flow. The new Better Auth session cookie uses the `better-auth` cookie prefix by default.

## 10. Troubleshooting

### Better Auth reports a Drizzle schema mismatch

Run:

```bash
pnpm db:migrate
```

Then restart the application. Confirm that `0014_better_auth.sql` has been applied and that the database contains the `verification` table and the new `sessions` columns.

### Login redirects to the wrong page

Check that:

- `BETTER_AUTH_URL` matches the public origin exactly.
- The Google authorized redirect URI ends with `/api/auth/callback/google`.
- The application and authentication API are served from the same origin.
- The callback URL supplied to login starts with `/`.

### Protected pages redirect repeatedly

Check that:

- `BETTER_AUTH_SECRET` is present and identical in every server instance.
- The application was restarted after setting the secret.
- The Better Auth session cookie is not blocked by the browser.
- The `proxy.ts` matcher is active for `/dashboard` and `/account`.

### Public event page is dynamic instead of static

Confirm that:

- The event exists when the build runs.
- `generateStaticParams` returns the event URL.
- The public event page and layout do not call `getSession()` directly.
- Dynamic session and enrollment UI remains inside client components or Suspense boundaries.

## 11. Rollback

If rollback is required after the database migration:

1. Stop or roll back the application deployment.
2. Restore the PostgreSQL backup taken before migration `0014`.
3. Restore the previous application code and dependencies.
4. Do not attempt to reuse Better Auth sessions in the Auth.js application.

Because the migration changes the session table structure and the authentication provider, database restoration is safer than attempting an in-place reverse migration.
