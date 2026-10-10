const STORAGE_KEY = "home-manager:bin-address";

const postcodeForm = document.getElementById("postcode-form");
const postcodeInput = document.getElementById("postcode");
const postcodeMsg = document.getElementById("postcode-msg");
const findBtn = document.getElementById("find-btn");
const addressStep = document.getElementById("address-step");
const addressSelect = document.getElementById("address");
const results = document.getElementById("results");
const councilName = document.getElementById("council-name");

let currentPostcode = ""; // the postcode the address list came from

const POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

// ---------- helpers ----------

// The Bin Day API is a Cloudflare Worker (bin-day-api/ in this repo); run it locally with `npm run dev`
const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "http://127.0.0.1:8787"
  : "https://bin-day-api.tight-bread-5394.workers.dev";

async function api(path) {
  let res;
  try {
    res = await fetch(API_BASE + path);
  } catch {
    throw new Error("Couldn't reach Bin Day. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

function binIcon(type) {
  const tpl = document.getElementById(type === "food" ? "caddy-icon" : "bin-icon");
  return tpl.content.firstElementChild.cloneNode(true);
}

function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseIso(iso) - today) / 86_400_000);
}

function relativeLabel(days) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  if (rem === 0) return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
  return `In ${days} days`;
}

const fmtLong = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });
const fmtMonth = new Intl.DateTimeFormat("en-GB", { month: "short" });
const fmtChecked = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" });

function groupByDate(collections) {
  const groups = new Map();
  for (const c of collections) {
    if (!groups.has(c.date)) groups.set(c.date, []);
    groups.get(c.date).push(c);
  }
  return [...groups.entries()].map(([date, bins]) => ({ date, bins }));
}

function save(value) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch {}
}
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

// ---------- rendering ----------

function showStatus(text) {
  results.replaceChildren(el("div", { class: "status" }, el("div", { class: "spinner" }), text));
}

function showError(text) {
  results.replaceChildren(el("div", { class: "error-box" }, text));
}

function renderCollections(address, collections, checkedAt) {
  const addressLine = el("p", { class: "address-line" }, address, ` · dates checked ${fmtChecked.format(new Date(checkedAt))}`);
  if (!collections.length) {
    results.replaceChildren(
      addressLine,
      el("div", { class: "card empty" }, "No upcoming collections were found for this address.")
    );
    return;
  }

  const [next, ...rest] = groupByDate(collections);
  const nextDays = daysUntil(next.date);

  const hero = el(
    "article",
    { class: "card next" },
    el("p", { class: "eyebrow" }, "Next collection"),
    el("h2", { class: "date" }, fmtLong.format(parseIso(next.date))),
    el("span", { class: `countdown${nextDays <= 1 ? " soon" : ""}` },
      nextDays === 1 ? "Tomorrow — put your bins out tonight" :
      nextDays === 0 ? "Today" : relativeLabel(nextDays)),
    el("div", { class: "next-bins" },
      next.bins.map((b) =>
        el("div", { class: `next-bin t-${b.type}` }, binIcon(b.type), el("strong", {}, b.name), el("span", {}, b.bin))
      )
    )
  );

  const children = [addressLine, hero];

  if (rest.length) {
    children.push(
      el("section", { class: "upcoming" },
        el("h2", {}, "Coming up"),
        el("ol", { class: "timeline" },
          rest.map((g) => {
            const d = parseIso(g.date);
            return el("li", {},
              el("div", { class: "cal", "aria-hidden": "true" },
                el("span", { class: "m" }, fmtMonth.format(d)),
                el("span", { class: "d" }, String(d.getDate()))
              ),
              el("div", {},
                el("div", { class: "when" },
                  el("span", { class: "day" }, fmtLong.format(d)),
                  el("span", { class: "rel" }, relativeLabel(daysUntil(g.date)))
                ),
                el("div", { class: "chips" },
                  g.bins.map((b) => el("span", { class: `chip t-${b.type}` }, binIcon(b.type), b.name))
                )
              )
            );
          })
        )
      )
    );
  }

  results.replaceChildren(...children);
}

// ---------- flow ----------

async function lookupAddresses(postcode, preselectUprn) {
  postcodeMsg.textContent = "";
  results.replaceChildren();
  addressStep.hidden = true;
  councilName.textContent = "";
  findBtn.disabled = true;
  findBtn.textContent = "Searching…";

  try {
    const { postcode: clean, council, addresses } = await api(`/api/addresses?postcode=${encodeURIComponent(postcode)}`);
    postcodeInput.value = currentPostcode = clean;
    councilName.textContent = council.name;

    if (!addresses.length) {
      postcodeMsg.textContent = `We couldn't find any ${council.name} addresses for that postcode.`;
      return;
    }

    addressSelect.replaceChildren(
      el("option", { value: "" }, `Select your address (${addresses.length} found)`),
      ...addresses.map((a) => el("option", { value: a.uprn }, a.label))
    );
    addressStep.hidden = false;

    if (preselectUprn && addresses.some((a) => a.uprn === preselectUprn)) {
      addressSelect.value = preselectUprn;
      loadCollections();
    } else if (addresses.length === 1) {
      addressSelect.value = addresses[0].uprn;
      loadCollections();
    } else {
      addressSelect.focus();
    }
  } catch (err) {
    postcodeMsg.textContent = err.message;
  } finally {
    findBtn.disabled = false;
    findBtn.textContent = "Find address";
  }
}

async function loadCollections() {
  const uprn = addressSelect.value;
  if (!uprn) {
    results.replaceChildren();
    return;
  }
  const label = addressSelect.selectedOptions[0].textContent;
  save({ postcode: currentPostcode, uprn });
  showStatus("Checking collection dates…");

  try {
    const { collections, checkedAt } = await api(
      `/api/collections?postcode=${encodeURIComponent(currentPostcode)}&uprn=${encodeURIComponent(uprn)}`
    );
    if (addressSelect.value !== uprn) return; // user picked another address meanwhile
    renderCollections(`${label}, ${currentPostcode}`, collections, checkedAt);
  } catch (err) {
    showError(err.message);
  }
}

postcodeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = postcodeInput.value.trim();
  if (!POSTCODE_RE.test(value)) {
    postcodeMsg.textContent = "Please enter a full UK postcode, e.g. B71 1AA.";
    postcodeInput.focus();
    return;
  }
  lookupAddresses(value);
});

addressSelect.addEventListener("change", loadCollections);

// Restore the last address used on this device
const saved = load();
if (saved?.postcode) {
  postcodeInput.value = saved.postcode;
  lookupAddresses(saved.postcode, saved.uprn);
}
