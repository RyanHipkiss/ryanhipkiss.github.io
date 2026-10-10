// Birmingham City Council
// The "Check your collection day" page lists addresses for ?postcode= and, with &uprn=,
// shows a table of upcoming collections ("Wednesday 14 October | Rubbish | ").

import { UA, NoScheduleError, decodeHtml, sortAddresses, tidyCollections, typeFromName, isoFromDate } from "./common.js";

const PAGE_URL = "https://www.birmingham.gov.uk/info/50388/check_your_collection_day";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

async function getPage(params) {
  const url = new URL(PAGE_URL);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Birmingham page failed (${res.status})`);
  return res.text();
}

// "Wednesday 14 October" has no year, so pick the year that puts it nearest to today
function parseDayMonth(text) {
  const m = /(\d{1,2})\s+([A-Za-z]+)/.exec(text);
  const month = m && MONTHS.indexOf(m[2].toLowerCase());
  if (!m || month === -1) return null;
  const today = new Date();
  let date = new Date(today.getFullYear(), month, Number(m[1]));
  const sixMonths = 182 * 86_400_000;
  if (date - today > sixMonths) date = new Date(today.getFullYear() - 1, month, Number(m[1]));
  else if (today - date > sixMonths) date = new Date(today.getFullYear() + 1, month, Number(m[1]));
  return isoFromDate(date);
}

export async function findAddresses(postcode) {
  const html = await getPage({ postcode });
  const select = /<select[^>]*name="uprn"[^>]*>([\s\S]*?)<\/select>/.exec(html)?.[1] ?? "";
  const addresses = [...select.matchAll(/<option value="(\d{5,12})"[^>]*>([^<]*)/g)].map((m) => ({
    uprn: m[1],
    label: decodeHtml(m[2]).replace(/\s+,/g, ","),
  }));
  return sortAddresses(addresses);
}

export async function getCollections(uprn, postcode) {
  const html = await getPage({ postcode, uprn });
  if (html.includes("unable to find your rubbish collection schedule")) {
    throw new NoScheduleError("Birmingham City Council doesn't have a collection schedule for this address yet.", {
      href: "https://waste.birmingham.gov.uk/",
      text: "Check Birmingham's Waste Portal",
    });
  }

  const table = /<table[^>]*class="[^"]*data-table[^"]*"[^>]*>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1];
  if (table == null) throw new Error("Birmingham collections table not found");

  const collections = [];
  for (const row of table.split(/<\/tr>/)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((c) => decodeHtml(c[1].replace(/<[^>]+>/g, " ")));
    if (cells.length < 2) continue;
    const date = parseDayMonth(cells[0]);
    if (!date) continue;
    collections.push({ date, type: typeFromName(cells[1]), name: cells[1], bin: "" });
  }
  return tidyCollections(collections);
}

export default {
  id: "birmingham",
  name: "Birmingham City Council",
  gss: "E08000025",
  findAddresses,
  getCollections,
};
