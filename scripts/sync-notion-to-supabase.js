// ============================================================
// VAVA — Notion → Supabase Sync Script
// Run from Terminal: node scripts/sync-notion-to-supabase.js
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();

const NOTION_SECRET = process.env.NOTION_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// The 4 Notion database IDs (these are fixed — don't change)
const NOTION_DBS = {
  service_categories:      "c228d8f1a7b74a71b03ef4294ce55591",
  service_style_modifiers: "1761286a571a407daa4e8b2c44b7d363",
  lash_special_fiber_tags: "fe8dffb7a62348049ead5322decdd2cd",
  preference_options:      "bf545469fdde4f75bb223055d09aef8f",
};

// ── Helpers ──────────────────────────────────────────────────

// Read all rows from a Notion database (handles pagination)
async function fetchNotionDB(databaseId) {
  let results = [];
  let cursor = undefined;

  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_SECRET}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API error on DB ${databaseId}: ${err}`);
    }

    const data = await res.json();
    results = results.concat(data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

// Get a plain text value from a Notion property
function getText(prop) {
  if (!prop) return null;
  if (prop.type === "title") return prop.title.map(t => t.plain_text).join("") || null;
  if (prop.type === "rich_text") return prop.rich_text.map(t => t.plain_text).join("") || null;
  if (prop.type === "number") return prop.number ?? null;
  if (prop.type === "checkbox") return prop.checkbox ?? false;
  if (prop.type === "select") return prop.select?.name ?? null;
  return null;
}

// Upsert rows into Supabase (insert or update by `key` field)
async function upsertSupabase(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert error on ${table}: ${err}`);
  }

  return rows.length;
}

// ── Sync functions (one per table) ───────────────────────────

async function syncServiceCategories() {
  const pages = await fetchNotionDB(NOTION_DBS.service_categories);
  const rows = pages.map(p => {
    const domainVal = getText(p.properties["domain"]);
    return {
      key:            getText(p.properties["key"]),
      name_zh:        getText(p.properties["name_zh"]),
      name_en:        getText(p.properties["name_en"]),
      service_type:   domainVal,
      domain:         domainVal,
      skips_style:    getText(p.properties["skips_style"]) ?? false,
      is_addon:       getText(p.properties["is_addon"]) ?? false,
      is_active:      getText(p.properties["is_active"]) ?? true,
      has_styles:     getText(p.properties["has_styles"]) ?? false,
      is_standalone:  getText(p.properties["is_standalone"]) ?? true,
    };
  }).filter(r => r.key && r.service_type); // skip rows missing key or service_type

  return upsertSupabase("service_categories", rows);
}

async function syncStyleModifiers() {
  const pages = await fetchNotionDB(NOTION_DBS.service_style_modifiers);
  const rows = pages.map(p => ({
    key:               getText(p.properties["key"]),
    name_zh:           getText(p.properties["name_zh"]),
    name_en:           getText(p.properties["name_en"]),
    service_type:      getText(p.properties["domain"]),
    density_applies:   getText(p.properties["density_applies"]) ?? false,
    style_tags_apply:  getText(p.properties["style_tags_apply"]) ?? false,
    fiber_tag_applies: getText(p.properties["fiber_tag_applies"]) ?? false,
    is_active:         getText(p.properties["is_active"]) ?? true,
    sort_order:        getText(p.properties["sort_order"]) ?? 0,
  })).filter(r => r.key && r.service_type); // skip rows missing key or service_type

  return upsertSupabase("service_style_modifiers", rows);
}

async function syncFiberTags() {
  const pages = await fetchNotionDB(NOTION_DBS.lash_special_fiber_tags);
  const rows = pages.map(p => ({
    key:        getText(p.properties["key"]),
    name_zh:    getText(p.properties["name_zh"]),
    name_en:    getText(p.properties["name_en"]),
    is_active:  getText(p.properties["is_active"]) ?? true,
    sort_order: getText(p.properties["sort_order"]) ?? 0,
  })).filter(r => r.key);

  return upsertSupabase("lash_special_fiber_tags", rows);
}

async function syncPreferenceOptions() {
  const pages = await fetchNotionDB(NOTION_DBS.preference_options);
  const rows = pages.map(p => ({
    key:        getText(p.properties["key"]),
    label_zh:   getText(p.properties["label_zh"]),
    label_en:   getText(p.properties["label_en"]),
    is_active:  getText(p.properties["is_active"]) ?? true,
    sort_order: getText(p.properties["sort_order"]) ?? 0,
  })).filter(r => r.key);

  return upsertSupabase("preference_options", rows);
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  // Check all env vars are present
  if (!NOTION_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Missing environment variables. Check your .env file.");
    console.error("   Required: NOTION_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY");
    process.exit(1);
  }

  console.log("🔄 Starting Notion → Supabase sync...\n");

  try {
    const n1 = await syncServiceCategories();
    console.log(`✅ service_categories     — ${n1} rows synced`);

    const n2 = await syncStyleModifiers();
    console.log(`✅ service_style_modifiers — ${n2} rows synced`);

    const n3 = await syncFiberTags();
    console.log(`✅ lash_special_fiber_tags — ${n3} rows synced`);

    // preference_options table does not exist yet — skip
    // const n4 = await syncPreferenceOptions();
    // console.log(`✅ preference_options      — ${n4} rows synced`);

    console.log("\n🎉 Sync complete!");
  } catch (err) {
    console.error("\n❌ Sync failed:", err.message);
    process.exit(1);
  }
}

main();
