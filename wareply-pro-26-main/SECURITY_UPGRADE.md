# Wasend-Pro Security Upgrade

This build hardens the admin/license/payment APIs without changing the product UI or extension-facing API shapes.

## Required Supabase step

Run the complete `supabase-schema.sql` in the Supabase SQL Editor. The file now includes the atomic `activate_license_atomic()` function used by `/api/licenses/verify` for activation.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` — use a random value of at least 32 characters.

## Admin session

Admin login now uses an HttpOnly, Secure, SameSite=Lax cookie named `wasend_admin`. Existing bearer-token authorization is still accepted by the API for backwards compatibility, but the included admin UI no longer stores JWTs in localStorage.

## Important deployment note

The built-in rate limiter is an in-memory fallback suitable for basic protection. For multi-instance/serverless production, add a shared rate limiter (for example Upstash/Redis or an edge/WAF rate limit) in front of the public APIs.
