// Client for AchieveForms (Firmstep) lookups, used by Sandwell and Dudley.
// A session ID comes from /authapi/isauthenticated and is passed to /apibroker/runLookup.

const SESSION_TTL_MS = 10 * 60 * 1000;

export function createAchieveForms({ base, section, name }) {
  let session = null;

  async function getSession(force = false) {
    if (!force && session && Date.now() - session.created < SESSION_TTL_MS) return session;

    const res = await fetch(`${base}/authapi/isauthenticated?uri=${encodeURIComponent(encodeURIComponent(base + "/en"))}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`${name} session request failed (${res.status})`);
    const data = await res.json();
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");

    session = { sid: data["auth-session"], cookie, created: Date.now() };
    return session;
  }

  async function runLookup(id, fields, retried = false) {
    const s = await getSession();
    const params = new URLSearchParams({
      id,
      repeat_against: "",
      noRetry: "false",
      getOnlyTokens: "undefined",
      log_id: "",
      app_name: "AF-Renderer::Self",
      _: String(Date.now()),
      sid: s.sid,
    });

    const formValues = { [section]: {} };
    for (const [key, value] of Object.entries(fields)) {
      formValues[section][key] = { value };
    }

    const res = await fetch(`${base}/apibroker/runLookup?${params}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": "Mozilla/5.0",
        Referer: `${base}/fillform/?iframe_id=fillform-frame-1&db_id=`,
        Cookie: s.cookie,
      },
      body: JSON.stringify({ formValues }),
    });

    if (!res.ok || !res.headers.get("content-type")?.includes("json")) {
      if (!retried) {
        await getSession(true);
        return runLookup(id, fields, true);
      }
      throw new Error(`${name} lookup ${id} failed (${res.status})`);
    }

    const data = await res.json();
    const rows = data?.integration?.transformed?.rows_data;
    if (!rows) return [];
    return Array.isArray(rows) ? rows : Object.values(rows);
  }

  return { runLookup };
}
