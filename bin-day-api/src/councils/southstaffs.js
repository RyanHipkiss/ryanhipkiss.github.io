// South Staffordshire Council
// Address search posts the postcode to the Drupal bin lookup form on the collection calendar
// page; the "where I live" page for a UPRN then shows the next collection and a table of the
// following ones ("Recycling & Garden Waste & Food Waste | Monday, 19 October 2026").

import { UA, NoScheduleError, decodeHtml, sortAddresses, tidyCollections, typeFromName, isoFromDate } from "./common.js";

const BASE = "https://www.sstaffs.gov.uk";
const FORM_URL = `${BASE}/viewyourcollectioncalendar`;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// "Monday, 19 October 2026" -> "2026-10-19"
function parseDate(text) {
  const m = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(text);
  const month = m && MONTHS.indexOf(m[2].toLowerCase());
  if (!m || month === -1) return null;
  return isoFromDate(new Date(Number(m[3]), month, Number(m[1])));
}

export async function findAddresses(postcode) {
  const page = await fetch(FORM_URL, { headers: { "User-Agent": UA } });
  if (!page.ok) throw new Error(`South Staffordshire form page failed (${page.status})`);
  const html = await page.text();
  // The page has other forms (e.g. email sign-up), so take the build id from the bin lookup form
  const form = /<form[^>]*id="bbd-bin-lookup-form"[\s\S]*?<\/form>/.exec(html)?.[0] ?? "";
  const buildId = /name="form_build_id" value="([^"]+)"/.exec(form)?.[1];
  if (!buildId) throw new Error("South Staffordshire form_build_id not found");
  const cookie = page.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const res = await fetch(FORM_URL, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie && { Cookie: cookie }),
    },
    body: new URLSearchParams({
      form_build_id: buildId,
      form_id: "bbd_bin_lookup_form",
      postcode,
      op: "Look up address",
    }),
  });
  if (!res.ok) throw new Error(`South Staffordshire address lookup failed (${res.status})`);

  const select = /<select[^>]*name="objectId"[^>]*>([\s\S]*?)<\/select>/.exec(await res.text())?.[1] ?? "";
  const addresses = [...select.matchAll(/<option value="(\d{5,12})"[^>]*>([^<]*)/g)].map((m) => ({
    uprn: m[1],
    // "1, SHAWS LANE, WS6 6EG" -> "1, SHAWS LANE"
    label: decodeHtml(m[2]).replace(/,\s*[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, ""),
  }));
  return sortAddresses(addresses);
}

export async function getCollections(uprn) {
  const res = await fetch(`${BASE}/where-i-live?objectId=${encodeURIComponent(uprn)}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`South Staffordshire collections page failed (${res.status})`);
  const html = await res.text();

  const start = html.indexOf('id="showCollectionDates"');
  if (start === -1) throw new Error("South Staffordshire collections section not found");
  const end = html.indexOf("Local councillors", start);
  const section = html.slice(start, end === -1 ? undefined : end);

  // Each entry is "Recycling & Garden Waste & Food Waste" on a date: one collection per bin
  const entries = [];
  const next = /class="collection-date"[^>]*>([\s\S]*?)<\/p>[\s\S]*?class="collection-type"[^>]*>([\s\S]*?)<\/p>/.exec(section);
  if (next) entries.push({ date: next[1], names: next[2] });
  for (const row of section.split(/<\/tr>/)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (cells.length >= 2) entries.push({ date: cells[1], names: cells[0] });
  }

  const collections = [];
  for (const entry of entries) {
    const date = parseDate(decodeHtml(entry.date.replace(/<[^>]+>/g, " ")));
    if (!date) continue;
    for (const name of decodeHtml(entry.names.replace(/<[^>]+>/g, " ")).split(/\s*&\s*/)) {
      if (name) collections.push({ date, type: typeFromName(name), name, bin: "" });
    }
  }

  // Addresses the bin lorries can't reach are collected by van, and the council has no dates for them
  if (!collections.length && /van collection/i.test(section)) {
    throw new NoScheduleError("South Staffordshire Council collects from this address by van and doesn't publish its dates online.", {
      href: "mailto:communityservices@sstaffs.gov.uk",
      text: "Email South Staffordshire's community services",
    });
  }
  return tidyCollections(collections);
}

export default {
  id: "southstaffs",
  name: "South Staffordshire Council",
  gss: "E07000196",
  findAddresses,
  getCollections,
};
