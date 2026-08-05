# Web page caching

## Scope

This caching configuration applies only to the public web pages:

- /collections/[slug]
- /product/[id]

It does not change, cache, or disable any route under /api/*, and it does not
change the mobile application's API behavior.

## How it works

Both public page routes use the following Next.js route setting, and their
Supabase queries use a shared indefinite data cache:

    export const revalidate = false;

This tells Next.js not to revalidate these cached pages on a timer. The first
request for a specific URL may query Supabase and render the page. Later
requests for the same URL can use the shared server/platform cache instead of
running the same page query against Supabase again.

The product route accepts a style query string and remains a dynamic route at
the page-rendering level. The important expensive Supabase result is cached
indefinitely by URL argument, so this does not depend on the browser cache.

Each URL has its own cache entry. For example:

- /collections/fabric is separate from /collections/solid-panel
- /product/123 is separate from /product/456

prefetch={false} is also enabled on the site's Link components. The browser
will fetch a page when the visitor clicks it, rather than prefetching every
visible product link while scrolling.

## Benefits

- Lower repeated Supabase reads from public catalog pages
- Fewer server-rendered page requests and lower CPU usage
- Fewer repeated Supabase queries even when a dynamic page is rendered
- Fewer unnecessary RSC requests while scrolling
- Faster repeat visits after the page has been cached

## Trade-offs

- Product or catalog changes may not appear immediately
- The cache is not guaranteed to live forever: Vercel or Next.js may evict it,
  and a deployment can create or invalidate cache entries
- The first request after a cache miss can still be slower
- Pages that depend on per-user data must not use this public cache model

## Updating product data

When product or catalog data changes, deploy the project again. To guarantee a
fresh data cache, change the cache-key suffix from v1 to v2 in the relevant
page file before deploying. If instant updates are needed later, add explicit
revalidatePath() or tag-based revalidation to the admin update workflow.
