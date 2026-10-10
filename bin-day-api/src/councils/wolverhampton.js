// City of Wolverhampton Council
// Address search posts to the Drupal AJAX form on the bin collection dates page; the
// "find my nearest" page for a postcode + UPRN then lists the next date for each bin.

import { UA, decodeHtml, sortAddresses, tidyCollections, typeFromName, isoFromDate } from "./common.js";

const BASE = "https://www.wolverhampton.gov.uk";
const FORM_URL = `${BASE}/waste-and-recycling/bin-collection-dates`;

export async function findAddresses(postcode) {
  const page = await fetch(FORM_URL, { headers: { "User-Agent": UA } });
  if (!page.ok) throw new Error(`Wolverhampton form page failed (${page.status})`);
  const html = await page.text();
  const buildId = /name="form_build_id" value="([^"]+)"/.exec(html)?.[1];
  if (!buildId) throw new Error("Wolverhampton form_build_id not found");
  const cookie = page.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  const res = await fetch(`${FORM_URL}?ajax_form=1&_wrapper_format=drupal_ajax`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Cookie: cookie,
    },
    body: new URLSearchParams({
      form_build_id: buildId,
      form_id: "cwc_find_my_nearest_search",
      postcode,
      op: "Look up address",
    }),
  });
  if (!res.ok) throw new Error(`Wolverhampton address lookup failed (${res.status})`);

  const addresses = [];
  for (const command of await res.json()) {
    if (command.command !== "insert" || !command.data) continue;
    for (const m of command.data.matchAll(/<option[^>]*value="(\d+)"[^>]*>([^<]*)<\/option>/g)) {
      // "1, WESTLAND ROAD, WOLVERHAMPTON, WV3 9NZ" -> "1, WESTLAND ROAD"
      const label = decodeHtml(m[2]).replace(/,\s*WOLVERHAMPTON.*$/i, "").replace(/,\s*WV\d.*$/i, "");
      addresses.push({ uprn: m[1], label });
    }
  }
  return sortAddresses(addresses);
}

export async function getCollections(uprn, postcode) {
  const res = await fetch(`${BASE}/find-my-nearest/${encodeURIComponent(postcode)}/${uprn}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Wolverhampton collections page failed (${res.status})`);
  const html = await res.text();

  const start = html.indexOf("jumbotron");
  if (start === -1) throw new Error("Wolverhampton collections section not found");
  const end = html.indexOf("View the calendar", start);
  const section = html.slice(start, end === -1 ? undefined : end);

  // Each bin is an <h3>name</h3> followed by "<h4>Next date: October 13, 2026</h4>"
  const collections = [];
  for (const m of section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?Next date:\s*([A-Za-z]+ \d{1,2}, \d{4})/g)) {
    const name = decodeHtml(m[1].replace(/<[^>]+>/g, ""));
    const date = new Date(m[2]);
    if (Number.isNaN(date.getTime())) continue;
    collections.push({ date: isoFromDate(date), type: typeFromName(name), name, bin: "" });
  }
  return tidyCollections(collections);
}

export default {
  id: "wolverhampton",
  name: "Wolverhampton Council",
  gss: "E08000031",
  findAddresses,
  getCollections,
};
