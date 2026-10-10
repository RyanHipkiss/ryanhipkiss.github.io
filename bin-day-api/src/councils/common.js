// Helpers shared by the council modules.

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Safari/537.36";

// Thrown when the council answers but has no collection schedule for an address
// (e.g. a new build). The message and link are shown to the user and cached like any answer.
export class NoScheduleError extends Error {
  constructor(message, link) {
    super(message);
    this.link = link;
  }
}

// Display order for bins collected on the same day
const BIN_ORDER = ["household", "recycling", "garden", "food"];

export function todayIso() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

// "13/10/2026" -> "2026-10-13"
export function fromDdMmYyyy(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value?.trim() ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Works out the bin type from a council's service name, e.g. "Recycling Waste" -> recycling
export function typeFromName(name) {
  const n = name.toLowerCase();
  if (n.includes("recycl")) return "recycling";
  if (n.includes("garden")) return "garden";
  if (n.includes("food")) return "food";
  return "household";
}

export function decodeHtml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const collator = new Intl.Collator("en-GB", { numeric: true, sensitivity: "base" });

export function sortAddresses(addresses) {
  return addresses.sort((a, b) => collator.compare(a.label, b.label));
}

// De-duplicate, drop past dates and sort by date then bin type
export function tidyCollections(collections) {
  const today = todayIso();
  const seen = new Set();
  return collections
    .filter((c) => c.date && c.date >= today)
    .filter((c) => {
      const key = `${c.type}:${c.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || BIN_ORDER.indexOf(a.type) - BIN_ORDER.indexOf(b.type));
}
