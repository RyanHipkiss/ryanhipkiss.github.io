---
title: "Building Bin Day: one page for four councils' bin collections"
description: "How a static page, a Cloudflare Worker and a week-long cache answer the question every household asks on a Sunday night."
publishDate: 2026-10-10
---

Which bin goes out this week?

Every council in the West Midlands answers that question, but each one does it differently. Some have a form that takes four steps. Some hide the answer in a PDF calendar. Some want you to log in. None of them remember you.

So I built [Bin Day](/bin-day/). Type a postcode, pick your address, and it shows the next collection and the weeks after it. It covers **Sandwell, Dudley, Wolverhampton and Birmingham**, and it remembers your address so the next visit is a single glance.

This post is about how it's put together, rather than the code line by line.

## The shape of it

There are three pieces:

```text
  Browser                     Cloudflare                        Councils
 ---------                   ------------                      ----------
 /bin-day/  ---- fetch ---->  Bin Day API (Worker)  ---------->  Sandwell
 (static page                    |                                Dudley
  on GitHub Pages)               |                                Wolverhampton
                                 v                                Birmingham
                            Workers KV
                       (week-long cache + quotas)       postcodes.io (which council?)
```

1. **The page** is part of this site. It's a static Astro page served by GitHub Pages, with a small script that talks to the API and draws the results.
2. **The API** is a Cloudflare Worker. It has two endpoints: one turns a postcode into a list of addresses, the other turns an address into collection dates.
3. **The store** is Workers KV, a simple key and value store that sits next to the Worker. It holds the cache and the usage limits.

The site itself stays fully static. Anything that needs a server lives in the Worker, which runs on Cloudflare's free plan.

## Why a Worker?

The councils' services can't be called straight from the browser. They don't allow cross-origin requests, several of them need a session cookie from one page before the next will answer, and some only return HTML.

Something has to sit in the middle. A Worker is a good fit because it only runs when someone asks it something, it costs nothing at this scale, and it deploys in seconds. There's no server for me to patch or keep alive.

The Worker only accepts requests from this site, so it isn't a free bin API for the rest of the internet.

## Finding the right council

A postcode doesn't tell you which council it belongs to, at least not obviously. B-postcodes are split between Birmingham, Sandwell, Dudley and several others.

So the first thing the Worker does is ask [postcodes.io](https://postcodes.io), a free, open service built on ONS data. It returns the local authority's official code, and the Worker uses that to pick the right council module. If the postcode is outside the four councils, you get a friendly message saying where it is instead.

## One module per council

Each council is a small module with the same three things:

* **Who it is**: a name and its local authority code.
* **Find addresses**: given a postcode, return a list of addresses with their property reference (the UPRN).
* **Get collections**: given a UPRN, return a list of dates and bin types.

Behind that identical shape, each one does something different:

| Council | How it gets the answer |
| --- | --- |
| Sandwell | The lookups behind the council's own online forms |
| Dudley | The same form platform, with a different set of lookups |
| Wolverhampton | The council's "find my nearest" address form and results page |
| Birmingham | The "check your collection day" page, read as HTML |

Each module also tidies its answer into one common format: a date, and a bin type of household, recycling, food or garden. The page never needs to know which council it's talking to. Adding a fifth council means writing one more module and registering it.

## Being a good neighbour to the councils

These are public services running on public money, and I didn't want Bin Day to hammer them. So there are three rules:

* **Each answer is cached for a week.** Once anyone has looked up a postcode, everyone else gets the cached answer for the next seven days. Collection rounds don't change week to week, so this costs nothing in accuracy.
* **Duplicate requests are merged.** If two people ask for the same address at the same moment, the council is only asked once.
* **Each visitor can look up 3 new postcodes a week.** Cached answers are always free and don't count. This stops anyone using Bin Day to crawl a council's whole address list.

In practice, most lookups never reach a council at all. A cached answer comes back in well under half a second.

## When the council doesn't know

Not every address has a schedule. Birmingham, for example, has no collection data for some newer houses, and its page says so instead of showing dates.

Rather than show an error, Bin Day looks at the neighbours. Bins are collected street by street, so it tries the nearest house numbers on the same street in the same postcode. When one has a schedule, it shows those dates with a clear note explaining where they came from, plus a link to the council's own service to double check.

That logic lives in the Worker rather than in any one council module, so any council that can spot its own "no schedule" page gets the fallback for free.

## The page

The front end is deliberately plain: a postcode box, an address dropdown, and the results. It uses the same header, typography and footer as the rest of this site, so it feels like part of it rather than a separate app.

The results lead with the next collection in a big tile, with a countdown that turns gold when it's today or tomorrow. Below that is a list of the coming weeks, with a coloured bin icon for each type. Your chosen address is saved in your browser, so returning visitors see their dates straight away without typing anything.

## What it costs

Nothing. GitHub Pages hosts the page, and the Worker and KV store fit comfortably inside Cloudflare's free allowance. If it ever got popular enough to hit those limits, requests would simply fail until the next day rather than run up a bill.

## What's next

More councils, mainly. The pattern is set, so each one is a single module. If yours is in the West Midlands and isn't covered yet, let me know.

You can try it now at [ryanhipkiss.co.uk/bin-day](/bin-day/).
