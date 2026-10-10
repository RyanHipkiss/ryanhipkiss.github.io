# Bin Day API

Cloudflare Worker behind [ryanhipkiss.co.uk/bin-day](https://ryanhipkiss.co.uk/bin-day/). The page itself is static and lives in `../public/bin-day/`.

It looks up bin collection days for **Sandwell, Dudley, Wolverhampton and Birmingham**. The council is worked out from the postcode via [postcodes.io](https://postcodes.io).

- `GET /api/addresses?postcode=B71 1AA`
- `GET /api/collections?postcode=B71 1AA&uprn=32113489`

Only `https://ryanhipkiss.co.uk` (and `localhost` during development) gets CORS access.

## Caching and limits (Workers KV, binding `BINS`)

- Every council response is cached for 7 days: the address list per postcode, and the collections per address. A postcode is only looked up with its council once a week.
- Each user (by `CF-Connecting-IP`) can trigger fresh council lookups for up to 3 different postcodes a week. Choosing addresses within a postcode they've already looked up doesn't count again. Cached answers are always served and never count.
- Collections can only be requested for addresses returned by that postcode's search.

## Councils

Each module in `src/councils/` exports `id`, `name`, `gss` (local authority code), `findAddresses(postcode)` and `getCollections(uprn, postcode)`. To add a council, add a module and register it in `src/index.js`.

| Council | Source |
| --- | --- |
| Sandwell | AchieveForms lookups on my.sandwell.gov.uk |
| Dudley | AchieveForms lookups on my.dudley.gov.uk (next date per bin) |
| Wolverhampton | Drupal address form + "find my nearest" page on wolverhampton.gov.uk (next date per bin) |
| Birmingham | "Check your collection day" page on birmingham.gov.uk |

## Develop and deploy

```sh
npm install
npm run dev       # http://localhost:8787, with a local KV store
npm run deploy    # needs `npx wrangler login` first
```

First deploy only: `npx wrangler kv namespace create BINS`, then put the id it prints into `wrangler.toml`.

Free plan limits: 100,000 requests/day, 100,000 KV reads/day and 1,000 KV writes/day. When a limit is hit, requests fail until midnight UTC. Nothing is charged.
