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

## Installable app and security

The homepage includes an install button and the app provides a web manifest
with install icons. Users can install it from a supported browser; on iPhone
and iPad, use Safari's Share menu and choose Add to Home Screen. Production
installations require the site to be served over HTTPS. The installed app
continues to use the live marketplace; offline browsing is not enabled.

The Next.js server adds clickjacking, MIME-sniffing, referrer, and permissions
policy headers, disables the `X-Powered-By` header, and enables HSTS in
production. These are defense-in-depth measures, not a guarantee against
attacks. Keep production secrets server-only, apply all database migrations so
row-level security remains active, restrict Supabase Auth redirect URLs, and
configure rate limits and multi-factor authentication in the Supabase project
for administrator accounts.

## Account and seller roles

- New profiles are created as buyers by a database trigger. Signup only accepts
  a display name, email, and password; clients cannot select their role.
- Users can update their own name, phone, and Liberia location. Email-verified
  buyers apply for seller verification at `/sell`.
- Seller applications are reviewed in the protected `/admin/sellers` workspace.
  Only the database decision function can promote a buyer to a seller.
- Profile row-level security and column-level grants prevent users from
  changing their own role. Admin access is enforced by both the page and the
  database function.

### Seller verification and private documents

Apply `20261017020000_seller_verification.sql` after the earlier marketplace
migrations. The multi-step application saves drafts, records verified account
email from Supabase Auth, captures store and operations details, requires
unselected policy acknowledgements, and tracks `draft`, `pending_review`,
`under_review`, `action_required`, `approved`, `rejected`, and `suspended`
states. Applicants can view their own status and correct/resubmit requests;
admins review applications at `/admin/sellers`.

Identity and applicable business documents accept JPEG, PNG, or PDF up to 5 MB
each. The server checks file signatures, assigns random private object paths,
and uploads to the non-public `seller-verification-private` bucket. The server
action needs the server-only `SUPABASE_SERVICE_ROLE_KEY` for uploads and admins
need it to open a 60-second signed document link. No identity number,
password, card security code, or bank password is collected. Database RLS
restricts application records and document metadata to the applicant and
authorized administrators; only an administrator can read objects directly.
Basic legacy seller applications are not allowed to promote accounts.

Approval and payout verification are separate. The repository has no
configured payout provider or verified account-ownership integration, so the
application reports payouts as unavailable and does not collect payout
credentials. Seller approval does not enable withdrawals. Do not enable
payouts until a supported payment provider and server-verified ownership flow
are configured.

Document retention defaults to 90 days after the application record's last
update and is configurable using the server-only
`SELLER_VERIFICATION_DOCUMENT_RETENTION_DAYS` (1–3650). Configure a daily
scheduled POST to `/api/cron/purge-seller-verification-documents` with
`Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` to a strong,
unpredictable secret. After the retention period, the job deletes stored
verification files and metadata; old drafts, correction requests, and rejected
applications are removed, while approved/suspended application records are
retained with identity and application details scrubbed so account status and
audit references remain. The application intentionally does not claim
jurisdiction-specific legal compliance; configure and review the retention
period and policy text with qualified counsel for applicable jurisdictions.

Signup, sign-in, and password-reset forms include a user-controlled show/hide
password toggle. The password remains submitted only to the existing Supabase
Auth flow and is never stored by seller verification.

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
review. Signed-in, email-verified users can start private conversations from
published listings. Conversation and message data is protected with row-level
security; messages are limited to 2000 characters and five per sender per
conversation each minute. Apply every migration in timestamp order, including
the homepage-categories migration, to add Sports & Outdoors and Jobs and update
the public category labels. The Realtime publication migration enables live
message updates. Open
conversations and inboxes update in real time. Users can optionally enable
browser notifications; notifications require the inbox or conversation page to
remain open in a browser that supports them. Push notifications while the site
is closed are not implemented.

Separate administrator and seller workspaces are available at
`/admin/dashboard` and `/seller/dashboard`. Their pages are role-guarded on the
server and seller queries are scoped to the authenticated seller. Apply
`20261016040000_dashboard_access_and_realtime.sql` along with the other
migrations to enable administrator profile counts and workspace Realtime
refreshes. Apply `20261017010000_marketplace_message_read_tracking.sql` to
enable participant-scoped conversation read tracking and the seller's live
unread message count. The current schema does not include orders, verified
payments, commissions, refunds, payouts, product view analytics, or reviews,
so dashboard sales and performance metrics remain unavailable until those
records and integrations are implemented; the dashboards do not substitute
sample values.

Homepage category, location, price, currency, and newest-listing filters use
published database listings. The seller directory contains only approved
seller profiles with published listings; product ratings and buyer reviews are
not collected yet. Favorites are account-backed. A shopping cart, online
checkout, integrated mobile-money/card payments, discounts, newsletter signup,
and return/refund workflows are not configured, so the homepage does not
advertise those as available.
The homepage hero uses the supplied Liberia waterfront artwork optimized as
`public/images/monrovia-hero.webp`.

Buyers should verify listings, meet in public, and avoid advance payments to
unverified sellers.
