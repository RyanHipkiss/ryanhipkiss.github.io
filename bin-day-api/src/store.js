// Weekly cache of council responses plus a per-user quota of fresh lookups, kept in Workers KV.
// Entries expire on their own after a week.

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEK_S = WEEK_MS / 1000;
export const USER_POSTCODES_PER_WEEK = 3;

export function createStore(kv) {
  async function recentLookUps(userId) {
    const cutoff = Date.now() - WEEK_MS;
    const list = (await kv.get(`user:${userId}`, "json")) ?? [];
    return list.filter((r) => r.at >= cutoff);
  }

  return {
    // Returns { value, at } if cached within the last week
    async getCached(key) {
      const entry = await kv.get(`cache:${key}`, "json");
      if (!entry || Date.now() - entry.at >= WEEK_MS) return null;
      return entry;
    },

    async setCached(key, value) {
      const entry = { at: Date.now(), value };
      await kv.put(`cache:${key}`, JSON.stringify(entry), { expirationTtl: WEEK_S });
      return entry;
    },

    // A user may trigger fresh council lookups for up to 3 different postcodes a week.
    // Further lookups within a postcode they've already used don't count again.
    async canLookUp(userId, postcode) {
      const recent = await recentLookUps(userId);
      return recent.some((r) => r.postcode === postcode) || recent.length < USER_POSTCODES_PER_WEEK;
    },

    async recordLookUp(userId, postcode) {
      const recent = await recentLookUps(userId);
      if (recent.some((r) => r.postcode === postcode)) return;
      recent.push({ postcode, at: Date.now() });
      await kv.put(`user:${userId}`, JSON.stringify(recent), { expirationTtl: WEEK_S });
    },

    // When the user's oldest counted postcode drops out of the week
    async quotaResetsAt(userId) {
      const oldest = Math.min(...(await recentLookUps(userId)).map((r) => r.at));
      return Number.isFinite(oldest) ? new Date(oldest + WEEK_MS) : null;
    },
  };
}
