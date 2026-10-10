// Dudley Metropolitan Borough Council
// Uses the AchieveForms lookups behind the "Bins - my next collection" form at https://my.dudley.gov.uk.
// The collection lookup only returns the next date for each bin.

import { createAchieveForms } from "./achieveforms.js";
import { sortAddresses, tidyCollections } from "./common.js";

const { runLookup } = createAchieveForms({
  base: "https://my.dudley.gov.uk",
  section: "My bins",
  name: "Dudley",
});

const ADDRESS_LOOKUP = "3c9f54d0cf944";
const COLLECTIONS_LOOKUP = "64899d4c2574c";

// Fields on the collections row, all "yyyy-mm-dd" or ""
const BINS = [
  { field: "refuseDate", type: "household", name: "Refuse" },
  { field: "recyclingDate", type: "recycling", name: "Recycling" },
  { field: "gardenDate", type: "garden", name: "Garden waste" },
  { field: "gardenAdditionalDate", type: "garden", name: "Garden waste" },
  { field: "gardenExtendedDate", type: "garden", name: "Garden waste" },
];

export async function findAddresses(postcode) {
  const rows = await runLookup(ADDRESS_LOOKUP, { postcode_search: postcode });
  return sortAddresses(
    rows
      .filter((r) => r.uprn)
      // "1 Turls Street, Sedgley, DY3 1HH" -> "1 Turls Street, Sedgley" (the page adds the postcode)
      .map((r) => ({ uprn: r.uprn, label: r.display.replace(/\s+/g, " ").replace(/,\s*[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, "").trim() }))
  );
}

export async function getCollections(uprn) {
  const [row] = await runLookup(COLLECTIONS_LOOKUP, { uprnToCheck: uprn });
  if (!row) return [];
  return tidyCollections(
    BINS.filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(row[b.field] || "")).map((b) => ({
      date: row[b.field],
      type: b.type,
      name: b.name,
      bin: "",
    }))
  );
}

export default {
  id: "dudley",
  name: "Dudley Council",
  gss: "E08000027",
  findAddresses,
  getCollections,
};
