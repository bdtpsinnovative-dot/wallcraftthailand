# Web Page Caching (Cloudflare Edge 1-Year + Vercel Full-Page ISR + Auto-Purge)

## Architecture (2-Layer Shield)

```
Visitor -> Cloudflare Edge (Bangkok BKK, 1-Year HTML Cache)
              |-- HIT  --> Served in ~15ms (0 Vercel requests, 0 Supabase queries)
              |-- MISS --> Vercel Edge ISR (Singapore sin1, 1-Year Cache)
                              |-- HIT  --> Served from Vercel (0 Supabase queries)
                              |-- MISS --> Queries Supabase -> Caches at Vercel & Cloudflare for 1 year
```

### Safe Exclusion Rules (NEVER Cached at Cloudflare)
- `/api/*` (Mobile apps `hello_app`, `sale_ops_app`, `hr_management`, contact, revalidate)
- `/login`, `/register`, `/profile`, `/search`
- Non-GET requests (`POST`, `PUT`, `PATCH`, `DELETE`)
- Next.js App Router RSC/Prefetch payloads (`RSC: 1`, `Next-Router-Prefetch: 1`, `?_rsc=...`) — prevents RSC cache poisoning on Cloudflare Free plan!

All exclusions are enforced automatically via `Cloudflare-CDN-Cache-Control: no-store` in [middleware.ts](middleware.ts).

## Automatic Cache Clearing (Vercel + Cloudflare Together)

When Admin imports, edits, or deletes products in `/import-products`, `/manage-products`, or `/manage-products/[id]`:
1. Admin calls `POST https://www.wallcraftthailand.com/api/revalidate` with `x-revalidate-secret`.
2. `/api/revalidate` immediately purges:
   - Vercel Next.js Data Cache tags (`{ expire: 0 }`) and Full-Page ISR routes
   - Cloudflare Edge Cache (`POST /zones/{CLOUDFLARE_ZONE_ID}/purge_cache` with `{ purge_everything: true }`)

## Required Environment Variables (Never prefix with `NEXT_PUBLIC_`)

1. **`wallcraft-next`** (Vercel Project `wallcraftthailand` & `.env.local`):
   - `REVALIDATE_SECRET` — shared secret string chosen by you
   - `CLOUDFLARE_ZONE_ID` — Cloudflare Zone ID for `wallcraftthailand.com`
   - `CLOUDFLARE_API_TOKEN` — Cloudflare API Token with permission **Zone → Cache Purge → Purge**
2. **`adminwallcraft`** (Vercel Project `adminwallcraft` & `.env`):
   - `REVALIDATE_SECRET` — same secret string as above
   - `WALLCRAFT_WEB_URL` *(optional; defaults to `https://www.wallcraftthailand.com`)*

## Cloudflare Dashboard Setup Checklist

1. **SSL/TLS → Overview**: Set encryption mode to **Full (strict)** *(must be done BEFORE turning on orange cloud!)*.
2. **Caching → Cache Rules**: Create 2 rules (in this order):
   - **Rule 1 (`Bypass Dynamic & API`)**:
     - Expression: `(starts_with(http.request.uri.path, "/api/")) or (starts_with(http.request.uri.path, "/login")) or (starts_with(http.request.uri.path, "/register")) or (starts_with(http.request.uri.path, "/profile")) or (starts_with(http.request.uri.path, "/search")) or (http.request.method ne "GET") or (any(http.request.headers["rsc"][*] eq "1")) or (any(http.request.headers["next-router-prefetch"][*] eq "1"))`
     - Action: **Bypass cache**
   - **Rule 2 (`Cache Public Wallcraft HTML 1 Year`)**:
     - Expression: `(http.host eq "www.wallcraftthailand.com" or http.host eq "wallcraftthailand.com") and (http.request.method eq "GET")`
     - Cache eligibility: **Eligible for cache**
     - Edge TTL: **Use cache-control header if present, bypass cache if not** *(reads our `Cloudflare-CDN-Cache-Control: public, max-age=31536000` header automatically!)*
3. **DNS → Records**: Toggle Proxy status to **Proxied (Orange Cloud)** for `wallcraftthailand.com` and `www.wallcraftthailand.com`.
