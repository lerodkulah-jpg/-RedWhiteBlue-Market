# RedWhiteBlue Market

RedWhiteBlue Market is a Liberia-focused marketplace built with Next.js App
Router, TypeScript, Tailwind CSS, Supabase Auth, and PostgreSQL.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL,
   publishable key, and server-only service-role key.
3. Apply all migrations in `supabase/migrations/` to your Supabase project
   using the SQL Editor or Supabase CLI, in timestamp order.
4. In Supabase Authentication → URL Configuration, set the Site URL to your
   local site and add `http://localhost:3000/auth/callback` to the redirect URL
   allow list. Enable email confirmations and add your deployed callback URL
   before production use.
5. Start the development server with `npm run dev`.

The application uses Supabase's cookie-based `@supabase/ssr` integration.
`proxy.ts` refreshes sessions and verified claims are used for server-side
authorization. The service-role key is used only by a `server-only` Storage
helper after the seller action verifies the account and validates image
contents. It must never be prefixed with `NEXT_PUBLIC_` or imported by browser
code; marketplace database operations continue to use the signed-in user's
session and RLS.

## Account and seller roles

- New profiles are created as buyers by a database trigger. Signup only accepts
  a display name, email, and password; clients cannot select their role.
- Users can update their own name, phone, and Liberia location and submit a
  seller application from `/sell`.
- An administrator reviews applications at `/admin`. Approval promotes the
  applicant to seller in a database function that verifies the caller's
  administrator role.
- Profile row-level security and column-level grants prevent users from
  changing their own role. Admin access is enforced by both the page and the
  database function.

To bootstrap the first administrator, first create and verify the account, then
run this once in the Supabase SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'administrator'
where id = (
  select id
  from auth.users
  where email = 'admin@example.com'
);
```

Treat this as an operator-only action. Do not expose the SQL Editor credentials
or a service-role key to the browser.

## Authentication URLs

Configure the following redirect URLs in Supabase Authentication:

- `http://localhost:3000/auth/callback` for local signup verification and
  password recovery.
- `https://your-domain.example/auth/callback` for the deployed site.

Set `NEXT_PUBLIC_SITE_URL` to the origin users visit. For Vercel, add
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SITE_URL`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` to the
project's Environment Variables for each environment. Set
`NEXT_PUBLIC_SITE_URL` to the production custom-domain origin for Production
and to the Vercel preview origin for Preview. Add each matching
`/auth/callback` URL to Supabase's redirect URL allow list; keep the local
callback URL for development. Never expose the service-role key to client
bundles or browser tools.

## Current scope

When Supabase is not configured, the homepage and product detail pages use
sample listings. With Supabase configured and all migrations applied, the
homepage and product details show published database listings. Sellers can
create and manage listings from `/dashboard`; new and edited listings await
administrator review at `/admin`. Product photos are stored in the
private `product-images` Supabase Storage bucket. Public marketplace images
use short-lived signed URLs and Storage row-level security permits images only
for published listings, their sellers, and administrators. Favorites are
available to signed-in users, and table access is restricted with row-level
security.

Image uploads accept up to four JPEG, PNG, or WebP files per save, up to 4 MB
each and 10 per listing. The server checks file signatures, assigns random
storage names, and attempts to remove stored images when a seller deletes a
listing; cleanup failures are reported to the seller.
Images are previewed before submission. Prices display in the currency stored
on each listing; the site does not convert USD and LRD or claim a live exchange
rate. Signed-in, email-verified users can report published listings for admin
review.

Seller contact and checkout are not implemented. Buyers should verify listings,
meet in public, and avoid advance payments to unverified sellers.
