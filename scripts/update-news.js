#!/usr/bin/env node
// ============================================================
// Auto-update script: fetches RSS feeds, uses Gemini to extract
// the most relevant headline per tracked company, and writes
// the results back into data.js.
//
// Usage:  GEMINI_API_KEY=xxx node scripts/update-news.js
// ============================================================

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "data.js");
const RSS_PROXY = "https://api.rss2json.com/v1/api.json?rss_url=";
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error("ERROR: GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

// RSS feeds (same as in data.js)
const NEWS_FEEDS = [
  "https://techcrunch.com/category/artificial-intelligence/feed/",
  "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
  "https://www.technologyreview.com/feed/",
  "https://feeds.arstechnica.com/arstechnica/technology-lab",
  "https://venturebeat.com/category/ai/feed/"
];

// ---- Main ----
async function main() {
  console.log("=== AI Landscape Tracker — Auto-Update ===");
  console.log(`Time: ${new Date().toISOString()}`);

  // 1. Read current data.js and extract company names + slugs
  const dataSource = fs.readFileSync(DATA_FILE, "utf-8");
  const companies = extractCompanies(dataSource);
  console.log(`Tracked companies: ${companies.length}`);

  // 2. Fetch all RSS feeds
  const articles = await fetchAllFeeds();
  console.log(`Total articles fetched: ${articles.length}`);

  if (articles.length === 0) {
    console.log("No articles fetched. Skipping update.");
    return;
  }

  // 3. Match articles to companies
  const companyArticles = matchArticlesToCompanies(companies, articles);
  const companiesWithNews = Object.keys(companyArticles).length;
  console.log(`Companies with matching articles: ${companiesWithNews}`);

  if (companiesWithNews === 0) {
    console.log("No company matches found. Skipping Gemini call.");
    return;
  }

  // 4. Call Gemini to pick the best headline + classify each
  const newsUpdates = await callGemini(companyArticles);
  console.log(`Gemini returned updates for: ${Object.keys(newsUpdates).length} companies`);

  // 5. Write updated data.js
  const updatedSource = applyUpdates(dataSource, newsUpdates);
  fs.writeFileSync(DATA_FILE, updatedSource, "utf-8");
  console.log("data.js updated successfully.");
}

// ---- Extract company info from data.js ----
function extractCompanies(source) {
  const companies = [];
  // Match each company object to get name, slug, and models
  const nameRegex = /name:\s*"([^"]+)"/g;
  const slugRegex = /slug:\s*"([^"]+)"/g;
  const modelsRegex = /models:\s*\[([^\]]+)\]/g;

  const names = [...source.matchAll(nameRegex)].map(m => m[1]);
  const slugs = [...source.matchAll(slugRegex)].map(m => m[1]);
  const models = [...source.matchAll(modelsRegex)].map(m =>
    m[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || []
  );

  for (let i = 0; i < names.length; i++) {
    companies.push({
      name: names[i],
      slug: slugs[i] || names[i].toLowerCase().replace(/\s+/g, "-"),
      models: models[i] || [],
      searchTerms: [
        names[i],
        ...(models[i] || [])
      ].filter(t => t.length > 2)
    });
  }

  return companies;
}

// ---- Fetch RSS feeds ----
async function fetchAllFeeds() {
  const allArticles = [];

  for (const feedUrl of NEWS_FEEDS) {
    try {
      const res = await fetch(RSS_PROXY + encodeURIComponent(feedUrl));
      const data = await res.json();
      if (data.status === "ok" && data.items) {
        for (const item of data.items) {
          allArticles.push({
            title: stripHtml(item.title || ""),
            link: item.link || "",
            description: stripHtml(item.description || "").slice(0, 200),
            date: item.pubDate || new Date().toISOString()
          });
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch feed: ${feedUrl} — ${err.message}`);
    }
  }

  return allArticles;
}

// ---- Match articles to companies ----
function matchArticlesToCompanies(companies, articles) {
  const result = {};

  for (const company of companies) {
    const matched = articles.filter(article => {
      const text = article.title + " " + article.description;
      return company.searchTerms.some(term => {
        if (term.length < 3) return false;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp("\\b" + escaped + "\\b", "i");
        return regex.test(text);
      });
    });

    if (matched.length > 0) {
      // Keep top 5 most recent
      result[company.slug] = {
        name: company.name,
        articles: matched.slice(0, 5)
      };
    }
  }

  return result;
}

// ---- Call Gemini API ----
async function callGemini(companyArticles) {
  const prompt = buildGeminiPrompt(companyArticles);

  try {
    const res = await fetch(`${GEMINI_API}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini API error ${res.status}: ${errText.slice(0, 500)}`);
      return {};
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    try {
      const parsed = JSON.parse(text);
      return validateGeminiResponse(parsed);
    } catch {
      console.error("Failed to parse Gemini response as JSON:", text.slice(0, 500));
      return {};
    }
  } catch (err) {
    console.error(`Gemini request failed: ${err.message}`);
    return {};
  }
}

function buildGeminiPrompt(companyArticles) {
  let companySections = "";

  for (const [slug, data] of Object.entries(companyArticles)) {
    const articleList = data.articles
      .map((a, i) => `  ${i + 1}. "${a.title}" (${a.date}) — ${a.link}`)
      .join("\n");

    companySections += `\n### ${data.name} (slug: "${slug}")\n${articleList}\n`;
  }

  return `You are an AI news analyst. For each company below, pick the SINGLE most important/relevant headline from the provided articles. Summarize it in one sentence and classify the signal type.

Signal types: "launch", "funding", "regulation", "partnership", "infra"

${companySections}

Respond with a JSON object where each key is the company slug, and the value is:
{
  "headline": "short headline text",
  "summary": "one-sentence summary of the news",
  "signal": "launch|funding|regulation|partnership|infra",
  "date": "the article's date in ISO format",
  "url": "the article URL"
}

Only include companies that have genuinely relevant articles. If none of the articles are truly about that company, omit it. Return ONLY valid JSON, no markdown fences.`;
}

// ---- Apply updates to data.js source ----
function applyUpdates(source, newsUpdates) {
  // Update LAST_AUTO_UPDATED
  const now = new Date().toISOString();
  source = source.replace(
    /const LAST_AUTO_UPDATED\s*=\s*[^;]+;/,
    `const LAST_AUTO_UPDATED = "${now}";`
  );

  // Update each company's latestNews field
  for (const [slug, newsData] of Object.entries(newsUpdates)) {
    const newsObj = JSON.stringify({
      headline: newsData.headline,
      summary: newsData.summary,
      signal: newsData.signal,
      date: newsData.date,
      url: newsData.url
    });

    // Find the company block by slug and replace its latestNews
    const slugPattern = new RegExp(
      `(slug:\\s*"${escapeRegex(slug)}"[\\s\\S]*?)(latestNews:\\s*)(null|\\{[^}]*\\})`,
    );

    if (slugPattern.test(source)) {
      source = source.replace(slugPattern, `$1latestNews: ${newsObj}`);
    }
  }

  return source;
}

const VALID_SIGNALS = ["launch", "funding", "regulation", "partnership", "infra"];

function validateGeminiResponse(parsed) {
  if (typeof parsed !== "object" || parsed === null) return {};
  const validated = {};
  for (const [slug, entry] of Object.entries(parsed)) {
    if (typeof entry !== "object" || entry === null) continue;
    const { headline, summary, signal, date, url } = entry;
    if (typeof headline !== "string" || headline.length > 200) continue;
    if (typeof summary !== "string" || summary.length > 500) continue;
    if (!VALID_SIGNALS.includes(signal)) continue;
    if (typeof date !== "string" || isNaN(Date.parse(date))) continue;
    if (typeof url !== "string") continue;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) continue;
    } catch { continue; }
    validated[slug] = { headline, summary, signal, date, url };
  }
  return validated;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

// ---- Run ----
main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
