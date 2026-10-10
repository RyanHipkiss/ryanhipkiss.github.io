// Sandwell Metropolitan Borough Council
// Uses the AchieveForms lookups behind the "When's my bin day?" form at https://my.sandwell.gov.uk.

import { createAchieveForms } from "./achieveforms.js";
import { fromDdMmYyyy, sortAddresses, tidyCollections, todayIso } from "./common.js";

const { runLookup } = createAchieveForms({
  base: "https://my.sandwell.gov.uk",
  section: "Property details",
  name: "Sandwell",
});

const ADDRESS_LOOKUP = "55dee71f20a9a";

// Each lookup returns rows like { DWCollection, DWDay, DWDate: "dd/mm/yyyy" }
const COLLECTION_LOOKUPS = [
  { id: "686294de50729", prefix: "DW", type: "household", name: "Household waste", bin: "Grey bin" },
  { id: "68629dd642423", prefix: "MDR", type: "recycling", name: "Recycling", bin: "Blue bin" },
  { id: "6863a78a1dd8e", prefix: "FW", type: "food", name: "Food waste", bin: "Food caddy" },
  { id: "686295a88a750", prefix: "GW", type: "garden", name: "Garden waste", bin: "Green bin" },
];

export async function findAddresses(postcode) {
  const rows = await runLookup(ADDRESS_LOOKUP, { postcode_search: postcode });
  return sortAddresses(
    rows
      .filter((r) => r.uprn)
      .map((r) => ({ uprn: r.uprn, label: r.display.replace(/\s+/g, " ").trim() }))
  );
}

export async function getCollections(uprn) {
  const fromDate = todayIso();
  let failures = 0;
  const results = await Promise.all(
    COLLECTION_LOOKUPS.map(async (lookup) => {
      try {
        const rows = await runLookup(lookup.id, { Uprn: uprn, NextCollectionFromDate: fromDate });
        return rows
          .map((row) => fromDdMmYyyy(row[`${lookup.prefix}Date`]))
          .filter(Boolean)
          .map((date) => ({ date, type: lookup.type, name: lookup.name, bin: lookup.bin }));
      } catch (err) {
        failures++;
        console.error(`[sandwell] ${lookup.name}:`, err.message);
        return [];
      }
    })
  );

  // Don't let a total outage look like "no collections" (it would get cached)
  if (failures === COLLECTION_LOOKUPS.length) throw new Error("All Sandwell collection lookups failed");
  return tidyCollections(results.flat());
}

export default {
  id: "sandwell",
  name: "Sandwell Council",
  gss: "E08000028",
  findAddresses,
  getCollections,
};
