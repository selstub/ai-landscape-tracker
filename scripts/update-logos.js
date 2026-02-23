#!/usr/bin/env node
// ============================================================
// Logo auto-update script: downloads fresh favicons from Google
// for each tracked company and replaces only if changed.
//
// Usage:  node scripts/update-logos.js
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_FILE = path.join(__dirname, "..", "data.js");
const LOGOS_DIR = path.join(__dirname, "..", "logos");
const FAVICON_API = "https://www.google.com/s2/favicons?sz=128&domain=";

async function main() {
  console.log("=== AI Landscape Tracker — Logo Update ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // Extract slug + logoDomain pairs from data.js
  const source = fs.readFileSync(DATA_FILE, "utf-8");
  const companies = extractCompanies(source);
  console.log(`Tracked companies: ${companies.length}`);

  if (!fs.existsSync(LOGOS_DIR)) {
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
  }

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const { slug, logoDomain } of companies) {
    const filePath = path.join(LOGOS_DIR, `${slug}.png`);
    try {
      const res = await fetch(`${FAVICON_API}${logoDomain}`);
      if (!res.ok) {
        console.warn(`  [SKIP] ${slug}: HTTP ${res.status}`);
        failed++;
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());

      if (fs.existsSync(filePath)) {
        const existing = fs.readFileSync(filePath);
        const oldHash = crypto.createHash("md5").update(existing).digest("hex");
        const newHash = crypto.createHash("md5").update(buffer).digest("hex");
        if (oldHash === newHash) {
          unchanged++;
          continue;
        }
      }

      fs.writeFileSync(filePath, buffer);
      console.log(`  [UPDATED] ${slug}.png`);
      updated++;
    } catch (err) {
      console.warn(`  [ERROR] ${slug}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Unchanged: ${unchanged}, Failed: ${failed}`);
}

function extractCompanies(source) {
  const companies = [];
  const slugRegex = /slug:\s*"([^"]+)"/g;
  const logoDomainRegex = /logoDomain:\s*"([^"]+)"/g;

  const slugs = [...source.matchAll(slugRegex)].map(m => m[1]);
  const logoDomains = [...source.matchAll(logoDomainRegex)].map(m => m[1]);

  for (let i = 0; i < slugs.length; i++) {
    companies.push({
      slug: slugs[i],
      logoDomain: logoDomains[i] || slugs[i] + ".com"
    });
  }

  return companies;
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
