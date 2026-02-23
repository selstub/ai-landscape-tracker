// ============================================================
// AI LANDSCAPE TRACKER — Main Application Logic
// Single-page with expandable sections, live news, filtering
// ============================================================

// ---- State ----
let activeRegionFilter = "all";
let activeCategoryFilter = null;
let activeSignalFilter = "all";
let searchQuery = "";
let expandedCard = null;
let allNewsItems = [];

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  initModeToggle();
  initMatrixRain();
  initParticles();
  updateStats();
  renderCompanyCards();
  fetchAllNews();
  initFilters();
  initSearch();
  initBrainBounce();
  initDownloadBtn();

  // Event delegation for card expand/collapse — bound once
  document.getElementById("company-grid").addEventListener("click", (e) => {
    const header = e.target.closest(".card-header");
    if (header) toggleCardExpand(header);
  });
  setInterval(fetchAllNews, 5 * 60 * 1000); // refresh news every 5 min
  document.getElementById("last-scan").textContent = new Date().toLocaleString();

  // Bind modal close button
  document.getElementById("modal-close-btn")?.addEventListener("click", closeModal);

  // Show last auto-update timestamp if available
  if (typeof LAST_AUTO_UPDATED !== "undefined" && LAST_AUTO_UPDATED) {
    const el = document.getElementById("last-auto-update");
    if (el) el.textContent = new Date(LAST_AUTO_UPDATED).toLocaleString();
  }
});

// ---- Logo Helper ----
function logoSrc(company) {
  return getLogoUrl(company.slug);
}

// ---- Matrix Rain Background ----
function initMatrixRain() {
  const canvas = document.getElementById("matrix-bg");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const chars = "01アイウエオカキクケコABCDEFGHIJKLMNOPQRSTUVWXYZ∑∏∫∂∞≠≈";
  const fontSize = 14;
  const columns = Math.floor(canvas.width / fontSize);
  const drops = Array(columns).fill(1);

  function draw() {
    ctx.fillStyle = "rgba(10, 10, 20, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 255, 136, 0.08)";
    ctx.font = fontSize + "px monospace";

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 50);
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ---- Floating Particles ----
function initParticles() {
  const container = document.getElementById("particles");
  const emojis = ["🧠", "🤖", "⚡", "🔮", "💡", "🛸", "🌐", "💎", "🔬", "🎲"];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = Math.random() * 100 + "%";
    p.style.top = Math.random() * 100 + "%";
    p.style.animationDuration = (15 + Math.random() * 25) + "s";
    p.style.animationDelay = Math.random() * 10 + "s";
    p.style.fontSize = (14 + Math.random() * 20) + "px";
    p.style.opacity = 0.15 + Math.random() * 0.15;
    container.appendChild(p);
  }
}

// ---- Brain Logo Bounce ----
function initBrainBounce() {
  const brain = document.getElementById("brain-logo");
  brain.addEventListener("click", () => {
    brain.style.animation = "none";
    void brain.offsetHeight;
    brain.style.animation = "brainSpin 0.6s ease-in-out";
  });
}

// ---- Stats ----
function updateStats() {
  animateNumber("stat-companies", COMPANIES.length);
  const totalModels = COMPANIES.reduce((sum, c) => sum + c.models.length, 0);
  animateNumber("stat-models", totalModels);
  const totalVal = COMPANIES.reduce((sum, c) => sum + c.valuationNum, 0);
  animateNumber("stat-valuation", (totalVal / 1000).toFixed(1), true);
}

function animateNumber(id, target, isFloat = false) {
  const el = document.getElementById(id);
  const end = isFloat ? parseFloat(target) : parseInt(target);
  const duration = 1200;
  const start = 0;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ---- Company Cards ----
function renderCompanyCards() {
  const grid = document.getElementById("company-grid");
  const filtered = getFilteredCompanies();
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results">
      <span class="no-results-icon">🔭</span>
      <p>No companies match your filters. Try broadening your search!</p>
    </div>`;
    return;
  }

  filtered.forEach((company, idx) => {
    const card = createCompanyCard(company, idx);
    grid.appendChild(card);
  });
}

function createCompanyCard(company, idx) {
  const card = document.createElement("div");
  card.className = "company-card";
  card.style.animationDelay = `${idx * 0.05}s`;
  card.style.setProperty("--accent", company.color);

  const regionFlag = getRegionFlag(company.region);
  const strategyBadge = getStrategyBadge(company.strategy);
  const mainLogo = logoSrc(company);
  const inlineLogo = logoSrc(company);

  const safeName = escapeHtml(company.name);
  const safeLocation = escapeHtml(company.location);
  const safeSummary = escapeHtml(company.summary);
  const safeLeader = escapeHtml(company.leader);
  const safePartnerships = escapeHtml(company.partnerships);
  const safeValuation = escapeHtml(company.valuation);
  const safeStrategy = escapeHtml(company.strategy);
  const safeModels = company.models.map(m => escapeHtml(m)).join(", ");

  card.innerHTML = `
    <div class="card-header">
      <div class="card-logo-wrap">
        <img class="card-logo" src="${mainLogo}" alt="${safeName}"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="card-logo-fallback" style="display:none; background:${company.color}20; color:${company.color}">
          ${company.emoji}
        </div>
      </div>
      <div class="card-title-block">
        <h3><img class="card-inline-logo" src="${inlineLogo}" alt="" onerror="this.style.display='none'"> ${safeName}</h3>
        <span class="card-location">${regionFlag} ${safeLocation}</span>
      </div>
      <div class="card-expand-icon">▼</div>
    </div>
    <div class="card-summary">${safeSummary}</div>
    ${company.latestNews ? `
    <div class="card-latest-news">
      <a href="${sanitizeUrl(company.latestNews.url)}" target="_blank" rel="noopener noreferrer">
        <span class="latest-signal ${escapeHtml(company.latestNews.signal)}">${getSignalEmoji(company.latestNews.signal)} ${escapeHtml(company.latestNews.signal)}</span>
        <span class="latest-headline">${escapeHtml(company.latestNews.headline)}</span>
        <span class="latest-date">${formatDate(new Date(company.latestNews.date))}</span>
      </a>
    </div>
    ` : ""}
    <div class="card-tags">
      ${strategyBadge}
      ${company.category.map(c => `<span class="tag tag-${c}">${getCategoryLabel(c)}</span>`).join("")}
    </div>
    <div class="card-details" style="display:none;">
      <div class="detail-section">
        <div class="detail-row">
          <span class="detail-label">🤖 Models</span>
          <span class="detail-value">${safeModels}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">💰 Valuation/Rev</span>
          <span class="detail-value">${safeValuation}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">👤 Leader</span>
          <span class="detail-value">
            ${safeLeader}
            ${company.leaderX ? `<a href="${sanitizeUrl(company.leaderX)}" target="_blank" rel="noopener noreferrer" class="x-link">𝕏</a>` : ""}
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">🤝 Partners</span>
          <span class="detail-value">${safePartnerships}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">📋 Strategy</span>
          <span class="detail-value">${safeStrategy}</span>
        </div>
        <div class="detail-row detail-links">
          ${company.companyX ? `<a href="${sanitizeUrl(company.companyX)}" target="_blank" rel="noopener noreferrer" class="detail-btn">𝕏 Page</a>` : ""}
          <a href="https://${escapeHtml(company.domain)}" target="_blank" rel="noopener noreferrer" class="detail-btn">🌐 Website</a>
        </div>
      </div>
      <div class="card-news-section">
        <h4>📡 Latest Signals for ${safeName}</h4>
        <div class="card-news-items" id="news-${escapeHtml(company.slug)}">
          <div class="mini-loading">scanning...</div>
        </div>
      </div>
    </div>
  `;

  return card;
}

function toggleCardExpand(headerEl) {
  const card = headerEl.closest(".company-card");
  const details = card.querySelector(".card-details");
  const icon = card.querySelector(".card-expand-icon");
  const isExpanded = details.style.display !== "none";

  if (isExpanded) {
    details.style.display = "none";
    icon.textContent = "▼";
    card.classList.remove("expanded");
  } else {
    details.style.display = "block";
    icon.textContent = "▲";
    card.classList.add("expanded");
    populateCardNews(card);
  }
}

// Cache for company-specific news fetches
const companyNewsCache = {};

async function populateCardNews(card) {
  const slug = card.querySelector(".card-news-items").id.replace("news-", "");
  const company = COMPANIES.find(c => c.slug === slug);
  const newsContainer = card.querySelector(".card-news-items");

  // If already cached, render immediately
  if (companyNewsCache[slug]) {
    renderCardNewsItems(newsContainer, companyNewsCache[slug], company);
    return;
  }

  newsContainer.innerHTML = `<div class="mini-loading">fetching news for ${escapeHtml(company.name)}...</div>`;

  // Build Google News RSS search URL for this company
  const searchQuery = company.newsSearch || company.name;
  const googleNewsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery + " AI")}&hl=en&gl=US&ceid=US:en`;
  const proxyBase = "https://api.rss2json.com/v1/api.json?rss_url=";

  try {
    const res = await fetch(proxyBase + encodeURIComponent(googleNewsUrl));
    const data = await res.json();
    let items = [];
    if (data.status === "ok" && data.items) {
      items = data.items.slice(0, 5).map(item => ({
        title: stripHtml(item.title),
        link: item.link,
        date: new Date(item.pubDate),
        dateFormatted: formatDate(new Date(item.pubDate)),
        signal: classifySignal(item.title + " " + (item.description || ""))
      }));
    }
    companyNewsCache[slug] = items;
    renderCardNewsItems(newsContainer, items, company);
  } catch {
    // Fallback to general news matching
    const companyTerms = [company.name, ...company.models, company.leader].filter(Boolean);
    let relevant = allNewsItems.filter(item => {
      const text = item.title + " " + (item.description || "");
      return companyTerms.some(term => {
        if (term.length < 3) return false;
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp("\\b" + escaped + "\\b", "i");
        return regex.test(text);
      });
    });
    if (relevant.length === 0 && company.name.length >= 3) {
      const nameLower = company.name.toLowerCase();
      relevant = allNewsItems.filter(item => {
        const text = (item.title + " " + (item.description || "")).toLowerCase();
        return text.includes(nameLower);
      });
    }
    companyNewsCache[slug] = relevant.slice(0, 5);
    renderCardNewsItems(newsContainer, companyNewsCache[slug], company);
  }
}

function renderCardNewsItems(container, items, company) {
  if (items.length === 0) {
    container.innerHTML = `<div class="mini-loading">No recent signals detected for ${escapeHtml(company.name)}</div>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener noreferrer" class="card-news-item">
      <span class="card-news-signal">${getSignalEmoji(item.signal)}</span>
      <span class="card-news-title">${escapeHtml(item.title)}</span>
      <span class="card-news-date">${escapeHtml(item.dateFormatted)}</span>
    </a>
  `).join("");
}

// ---- Filtering ----
function getFilteredCompanies() {
  let result = [...COMPANIES];

  if (activeRegionFilter !== "all") {
    result = result.filter(c => c.region === activeRegionFilter);
  }

  if (activeCategoryFilter) {
    result = result.filter(c => c.category.includes(activeCategoryFilter));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(c => {
      const searchable = [c.name, c.summary, c.location, c.leader, ...c.models, c.partnerships, c.strategy].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }

  const sortBy = document.getElementById("sort-select")?.value || "valuation";
  switch (sortBy) {
    case "valuation":
      result.sort((a, b) => b.valuationNum - a.valuationNum);
      break;
    case "name":
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "country":
      result.sort((a, b) => a.region.localeCompare(b.region));
      break;
    case "recent":
      result.sort((a, b) => a.rank - b.rank);
      break;
  }

  return result;
}

function initFilters() {
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeRegionFilter = btn.dataset.filter;
      renderCompanyCards();
    });
  });

  document.querySelectorAll("[data-category]").forEach(btn => {
    btn.addEventListener("click", () => {
      const wasActive = btn.classList.contains("active");
      document.querySelectorAll("[data-category]").forEach(b => b.classList.remove("active"));
      if (wasActive) {
        activeCategoryFilter = null;
      } else {
        btn.classList.add("active");
        activeCategoryFilter = btn.dataset.category;
      }
      renderCompanyCards();
    });
  });

  document.getElementById("sort-select")?.addEventListener("change", renderCompanyCards);

  document.querySelectorAll("[data-feed]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-feed]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeSignalFilter = btn.dataset.feed;
      renderNewsFeed();
    });
  });
}

function initSearch() {
  const input = document.getElementById("search-input");
  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      searchQuery = input.value.trim();
      renderCompanyCards();
    }, 250);
  });
}

// ---- News Feed ----
async function fetchAllNews() {
  const proxyBase = "https://api.rss2json.com/v1/api.json?rss_url=";
  const promises = NEWS_FEEDS.map(feed =>
    fetch(proxyBase + encodeURIComponent(feed.url))
      .then(r => r.json())
      .then(data => {
        if (data.status === "ok" && data.items) {
          return data.items.map(item => ({
            title: stripHtml(item.title),
            link: item.link,
            description: stripHtml(item.description || ""),
            date: new Date(item.pubDate),
            dateFormatted: formatDate(new Date(item.pubDate)),
            source: feed.name,
            sourceIcon: feed.icon,
            signal: classifySignal(item.title + " " + (item.description || "")),
            companies: matchCompanies(item.title + " " + (item.description || ""))
          }));
        }
        return [];
      })
      .catch(() => [])
  );

  const results = await Promise.all(promises);
  allNewsItems = results.flat().sort((a, b) => b.date - a.date);

  const seen = new Set();
  allNewsItems = allNewsItems.filter(item => {
    const key = item.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  animateNumber("stat-news", allNewsItems.length);
  renderNewsFeed();
  document.getElementById("last-scan").textContent = new Date().toLocaleString();
}

function renderNewsFeed() {
  const container = document.getElementById("news-feed");
  let items = [...allNewsItems];

  if (activeSignalFilter !== "all") {
    items = items.filter(i => i.signal === activeSignalFilter);
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="news-empty">
        <span>📭</span>
        <p>No signals found. The AI multiverse is quiet... for now.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.slice(0, 50).map((item, idx) => `
    <a href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener noreferrer" class="news-item" style="animation-delay: ${idx * 0.03}s">
      <div class="news-item-header">
        <span class="news-signal-badge ${escapeHtml(item.signal)}">${getSignalEmoji(item.signal)} ${escapeHtml(item.signal)}</span>
        <span class="news-date">${escapeHtml(item.dateFormatted)}</span>
      </div>
      <div class="news-title">${escapeHtml(item.title)}</div>
      <div class="news-meta">
        <span class="news-source">${item.sourceIcon} ${escapeHtml(item.source)}</span>
        ${item.companies.length > 0 ? `<span class="news-companies">${item.companies.map(c => `<span class="news-company-tag" style="border-color:${c.color}"><img class="news-company-logo" src="${logoSrc(c)}" alt="" onerror="this.style.display='none'"> ${escapeHtml(c.name)}</span>`).join("")}</span>` : ""}
      </div>
    </a>
  `).join("");
}

// ---- Downloadable Table ----
function initDownloadBtn() {
  document.getElementById("download-csv-btn")?.addEventListener("click", downloadCSV);
  document.getElementById("download-html-btn")?.addEventListener("click", downloadHTMLTable);
}

function downloadCSV() {
  const headers = ["Company", "Summary", "Location", "Region", "Flagship Models", "Strategy", "Valuation/Revenue (USD)", "Key Leader", "Major Partnerships"];
  const rows = getFilteredCompanies().map(c => [
    c.name,
    `"${c.summary.replace(/"/g, '""')}"`,
    c.location,
    c.region.toUpperCase(),
    `"${c.models.join(', ')}"`,
    c.strategy,
    c.valuation,
    c.leader,
    `"${c.partnerships.replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AI_Landscape_Tracker_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadHTMLTable() {
  const companies = getFilteredCompanies();
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Convert logos to base64 data URIs so they work in standalone HTML
  const logoMap = {};
  await Promise.all(companies.map(async (c) => {
    try {
      const res = await fetch(logoSrc(c));
      const blob = await res.blob();
      logoMap[c.slug] = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      logoMap[c.slug] = "";
    }
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AI Foundation Model Landscape — ${date}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #fff; color: #1a1a2e; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th {
      background: #1a1a2e; color: #fff; padding: 10px 12px;
      text-align: left; font-weight: 600; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.5px;
      position: sticky; top: 0;
    }
    tbody tr { border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:hover { background: #eef2ff; }
    td { padding: 10px 12px; vertical-align: top; line-height: 1.5; }
    .company-name { font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .company-name img { width: 20px; height: 20px; border-radius: 4px; }
    .models { color: #7c3aed; font-size: 12px; }
    .strategy-badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .strat-open { background: #dcfce7; color: #166534; }
    .strat-closed { background: #fee2e2; color: #991b1b; }
    .strat-hybrid { background: #fef3c7; color: #92400e; }
    .footer-note { margin-top: 24px; font-size: 11px; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      thead th { background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>AI Foundation Model Landscape</h1>
  <div class="subtitle">Generated ${date} &mdash; ${companies.length} companies tracked</div>
  <table>
    <thead>
      <tr>
        <th>Company</th>
        <th>Location</th>
        <th>Flagship Models</th>
        <th>Strategy</th>
        <th>Valuation / Revenue</th>
        <th>Key Leader</th>
        <th>Partnerships</th>
      </tr>
    </thead>
    <tbody>
      ${companies.map(c => {
        let stratClass = "strat-closed";
        if (c.strategy.toLowerCase().includes("open")) stratClass = "strat-open";
        if (c.strategy.toLowerCase().includes("hybrid") || c.strategy.toLowerCase().includes("+")) stratClass = "strat-hybrid";
        const logoDataUri = logoMap[c.slug] || "";
        return `<tr>
          <td><div class="company-name">${logoDataUri ? `<img src="${logoDataUri}" alt="">` : ""}${c.name}</div><div style="font-size:11px;color:#666;margin-top:2px">${c.summary}</div></td>
          <td>${c.location}</td>
          <td class="models">${c.models.join(", ")}</td>
          <td><span class="strategy-badge ${stratClass}">${c.strategy}</span></td>
          <td>${c.valuation}</td>
          <td>${c.leader}</td>
          <td style="font-size:12px">${c.partnerships}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
  <div class="footer-note">AI Landscape Tracker &mdash; vibe coded with love & caffeine</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AI_Landscape_Tracker_${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Security Helpers ----
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function sanitizeUrl(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "#";
    return escapeHtml(parsed.href);
  } catch { return "#"; }
}

// ---- Helpers ----
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim();
}

function formatDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHrs < 1) return "just now";
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function classifySignal(text) {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(SIGNAL_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return type;
  }
  return "launch";
}

function matchCompanies(text) {
  const matched = COMPANIES.filter(c => {
    // Use full company name and full model names for precise matching
    const exactTerms = [c.name.toLowerCase(), ...c.models.map(m => m.toLowerCase())];
    // Also match leader names (full name only)
    if (c.leader) exactTerms.push(c.leader.toLowerCase());
    return exactTerms.some(term => {
      if (term.length < 3) return false;
      // Word boundary match to avoid partial matches (e.g. "meta" in "metadata")
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp("\\b" + escaped + "\\b", "i");
      return regex.test(text);
    });
  });

  // Fallback: if no word-boundary matches, try case-insensitive includes on company name only
  if (matched.length === 0) {
    const lower = text.toLowerCase();
    return COMPANIES.filter(c => {
      if (c.name.length < 3) return false;
      return lower.includes(c.name.toLowerCase());
    });
  }

  return matched;
}

function getSignalEmoji(signal) {
  const map = { launch: "🚀", funding: "💸", regulation: "⚖️", partnership: "🤝", infra: "🔧" };
  return map[signal] || "📡";
}

function getRegionFlag(region) {
  const map = { us: "🇺🇸", eu: "🇪🇺", cn: "🇨🇳", other: "🌍" };
  return map[region] || "🌍";
}

function getCategoryLabel(cat) {
  const map = { frontier: "⚡ Frontier", bigtech: "🏛️ Big Tech", opensource: "🔓 Open", infra: "🔧 Infra" };
  return map[cat] || cat;
}

function getStrategyBadge(strategy) {
  let cls = "strategy-closed";
  if (strategy.toLowerCase().includes("open")) cls = "strategy-open";
  if (strategy.toLowerCase().includes("hybrid") || strategy.toLowerCase().includes("+")) cls = "strategy-hybrid";
  return `<span class="tag tag-strategy ${cls}">${strategy}</span>`;
}

function closeModal() {
  document.getElementById("company-modal").style.display = "none";
}

// ---- Geek / Business Mode Toggle ----
function initModeToggle() {
  const toggle = document.getElementById("mode-toggle-input");
  const saved = localStorage.getItem("viewMode");
  if (saved === "business") {
    document.body.classList.add("business-mode");
    if (toggle) toggle.checked = true;
  }
  if (toggle) {
    toggle.addEventListener("change", () => {
      if (toggle.checked) {
        document.body.classList.add("business-mode");
        localStorage.setItem("viewMode", "business");
      } else {
        document.body.classList.remove("business-mode");
        localStorage.setItem("viewMode", "geek");
      }
    });
  }
}
