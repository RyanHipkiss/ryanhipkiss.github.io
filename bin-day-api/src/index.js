// Bin Day API (Cloudflare Worker), used by https://ryanhipkiss.co.uk/bin-day/
//   GET /api/addresses?postcode=B71 1AA
//   GET /api/collections?postcode=B71 1AA&uprn=32113483

import sandwell from "./councils/sandwell.js";
import dudley from "./councils/dudley.js";
import wolverhampton from "./councils/wolverhampton.js";
import birmingham from "./councils/birmingham.js";
import { createStore, USER_POSTCODES_PER_WEEK } from "./store.js";

const councils = Object.fromEntries([sandwell, dudley, wolverhampton, birmingham].map((c) => [c.id, c]));
const councilsByGss = Object.fromEntries(Object.values(councils).map((c) => [c.gss, c]));
const COVERED = "Sandwell, Dudley, Wolverhampton and Birmingham";

const ALLOWED_ORIGINS = ["https://ryanhipkiss.co.uk", "https://www.ryanhipkiss.co.uk"];
const LOCAL_ORIGIN_RE = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalisePostcode(raw = "") {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact;
}

function councilSummary(council) {
  return { id: council.id, name: council.name };
}

function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

// Concurrent cache misses in the same isolate share one council request
const inFlight = new Map();

function createApi(env, request) {
  const store = createStore(env.BINS);
  const user = request.headers.get("CF-Connecting-IP") || "unknown";

  // Only successful responses are cached
  function fetchAndCache(key, load) {
    if (!inFlight.has(key)) {
      inFlight.set(key, load().then((value) => store.setCached(key, value)).finally(() => inFlight.delete(key)));
    }
    return inFlight.get(key);
  }

  // A council lookup made for this user: checks their quota first and counts it once it succeeds
  async function fetchForUser(postcode, key, load) {
    if (!(await store.canLookUp(user, postcode))) {
      const resets = await store.quotaResetsAt(user);
      const when = resets
        ? ` You can look up a new postcode from ${resets.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" })}.`
        : "";
      throw new HttpError(429, `You've looked up ${USER_POSTCODES_PER_WEEK} postcodes this week, which is the limit.${when}`);
    }
    const entry = await fetchAndCache(key, load);
    await store.recordLookUp(user, postcode);
    return entry;
  }

  // Which council covers a postcode, via postcodes.io (cached for a week)
  async function councilFor(postcode) {
    const key = `district:${postcode}`;
    let entry = await store.getCached(key);
    if (!entry) {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(" ", ""))}`);
      if (res.status === 404) throw new HttpError(404, "We couldn't find that postcode. Please check it and try again.");
      if (!res.ok) throw new Error(`postcodes.io failed (${res.status})`);
      const { result } = await res.json();
      entry = await store.setCached(key, { gss: result.codes.admin_district, name: result.admin_district });
    }
    const council = councilsByGss[entry.value.gss];
    if (!council) throw new HttpError(422, `Bin Day covers ${COVERED}. ${postcode} is in ${entry.value.name}.`);
    return council;
  }

  async function getAddresses(postcode) {
    const key = `addresses:${postcode}`;
    let entry = await store.getCached(key);
    if (!entry) {
      const council = await councilFor(postcode);
      entry = await fetchForUser(postcode, key, async () => ({
        council: councilSummary(council),
        addresses: await council.findAddresses(postcode),
      }));
    }
    return { postcode, ...entry.value, checkedAt: new Date(entry.at).toISOString() };
  }

  async function getCollections(postcode, uprn) {
    // Only addresses from this postcode's (cached) search are allowed
    const addresses = await store.getCached(`addresses:${postcode}`);
    if (!addresses?.value.addresses.some((a) => a.uprn === uprn)) {
      throw new HttpError(400, "Please search for your postcode again.");
    }
    const council = councils[addresses.value.council.id];

    const key = `collections:${council.id}:${uprn}`;
    let entry = await store.getCached(key);
    if (!entry) entry = await fetchForUser(postcode, key, () => council.getCollections(uprn, postcode));

    // Cached dates may have passed since they were fetched
    return {
      uprn,
      council: councilSummary(council),
      collections: entry.value.filter((c) => c.date >= todayIso()),
      checkedAt: new Date(entry.at).toISOString(),
    };
  }

  return { getAddresses, getCollections };
}

async function handle(request, env) {
  if (request.method !== "GET") throw new HttpError(405, "Method not allowed");
  const url = new URL(request.url);
  const api = createApi(env, request);

  const postcode = normalisePostcode(url.searchParams.get("postcode") ?? "");
  if (!POSTCODE_RE.test(postcode)) throw new HttpError(400, "Please enter a valid UK postcode");

  if (url.pathname === "/api/addresses") return api.getAddresses(postcode);

  if (url.pathname === "/api/collections") {
    const uprn = url.searchParams.get("uprn") || "";
    if (!/^\d{5,12}$/.test(uprn)) throw new HttpError(400, "Invalid property reference");
    return api.getCollections(postcode, uprn);
  }

  throw new HttpError(404, "Not found");
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (!origin || !(ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN_RE.test(origin))) return {};
  return { "Access-Control-Allow-Origin": origin, Vary: "Origin" };
}

function json(request, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(request),
    },
  });
}

export default {
  async fetch(request, env) {
    try {
      return json(request, 200, await handle(request, env));
    } catch (err) {
      if (err instanceof HttpError) return json(request, err.status, { error: err.message });
      console.error(err);
      return json(request, 502, { error: "Couldn't reach the council's service. Please try again shortly." });
    }
  },
};
