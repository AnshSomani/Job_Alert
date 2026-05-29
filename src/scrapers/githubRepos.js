'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

// SimplifyJobs repos — both use the 'dev' branch as primary.
// URLs verified live 2026-05-29.
const REPOS = [
  {
    name: 'SimplifyJobs/New-Grad-Positions',
    rawUrl: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md',
    type: 'fulltime',
    label: 'New Grad 2025/2026',
  },
  {
    name: 'SimplifyJobs/Summer2026-Internships',
    rawUrl: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md',
    type: 'internship',
    label: 'Summer 2026 Internships',
  },
];

/**
 * Parse SimplifyJobs HTML table format (used since 2026 restructure).
 * Format: <table><thead><tr><th>Company</th><th>Role</th><th>Location</th>...
 * Each data row: <tr><td>company link</td><td>role</td><td>location</td><td>apply buttons</td>...
 */
function parseHTMLTable(html, repoType) {
  const $ = cheerio.load(html);
  const jobs = [];

  $('table').each((_, table) => {
    const headers = [];
    $(table).find('thead th').each((_, th) => {
      headers.push($(th).text().trim().toLowerCase());
    });

    // Only process tables that look like job tables
    if (!headers.some(h => /company|role|position/i.test(h))) return;

    const companyIdx = headers.findIndex(h => /company/i.test(h));
    const roleIdx    = headers.findIndex(h => /role|position|title/i.test(h));
    const locIdx     = headers.findIndex(h => /location/i.test(h));
    const applyIdx   = headers.findIndex(h => /application|apply|link/i.test(h));

    $(table).find('tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const companyCell = cells.eq(companyIdx >= 0 ? companyIdx : 0);
      const roleCell    = cells.eq(roleIdx    >= 0 ? roleIdx    : 1);
      const locCell     = cells.eq(locIdx     >= 0 ? locIdx     : 2);
      const applyCell   = cells.eq(applyIdx   >= 0 ? applyIdx   : 3);

      // Company: strip emoji (🔥, ↳), strong, links
      const companyRaw = companyCell.text().replace(/🔥|↳|🎓|🛂|🇺🇸/g, '').trim();
      // ↳ rows are sub-roles of the previous company — skip them
      if (companyCell.text().trim().startsWith('↳')) return;

      const company = companyRaw || 'Unknown Company';
      const role    = roleCell.text().replace(/🎓|🛂|🇺🇸/g, '').trim();
      // Location cells sometimes use <br> for multiple cities — join with comma
      const location = locCell.text().replace(/\n/g, ', ').trim() || 'USA / Global';

      // Extract apply URL — prefer direct apply link (first <a> with href not simplify.jobs)
      let url = '';
      applyCell.find('a[href]').each((_, a) => {
        const href = $(a).attr('href') || '';
        if (!url && href && !href.includes('simplify.jobs/p/')) {
          url = href;
        }
      });
      // Fallback: any link in the whole row
      if (!url) {
        $(row).find('a[href]').each((_, a) => {
          const href = $(a).attr('href') || '';
          if (!url && href.startsWith('http')) url = href;
        });
      }

      // Skip closed roles (🔒 in company or role text)
      if (companyCell.html()?.includes('🔒') || roleCell.html()?.includes('🔒')) return;

      if (role && company) {
        jobs.push({
          title: role,
          company,
          location,
          url: url || 'https://github.com/SimplifyJobs',
          type: repoType,
          source: 'GitHub Repos',
        });
      }
    });
  });

  return jobs;
}

/**
 * Legacy markdown table parser — kept as fallback.
 */
function parseMarkdownTable(markdown, repoType) {
  const jobs = [];
  const lines = markdown.split('\n');
  let inTable = false;
  let headers = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      if (inTable) inTable = false;
      continue;
    }

    const cells = trimmed.split('|').map(c => c.trim()).filter(c => c !== '');

    // Detect header row
    if (!inTable && cells.some(c => /company|role|position|title/i.test(c))) {
      headers = cells.map(c => c.toLowerCase());
      inTable = true;
      continue;
    }

    // Skip separator row (--- cells)
    if (cells.every(c => /^[-:\s]+$/.test(c))) continue;

    if (!inTable || cells.length < 2) continue;

    // Map cells to fields by header position
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });

    // Extract company — strip markdown links: [Text](url)
    const companyRaw = row['company'] || row['employer'] || cells[0] || '';
    const company = companyRaw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();

    // Extract role/title
    const roleRaw = row['role'] || row['position'] || row['title'] || cells[1] || '';
    const title = roleRaw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();

    // Extract location
    const locRaw = row['location'] || row['locations'] || cells[2] || '';
    const location = locRaw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`]/g, '').trim();

    // Extract URL from any apply link in the row
    const fullRow = cells.join(' ');
    const urlMatch = fullRow.match(/\(https?:\/\/[^)]+\)/);
    const url = urlMatch ? urlMatch[0].slice(1, -1) : '';

    // Skip closed/filled positions (🔒 symbol)
    if (companyRaw.includes('🔒') || roleRaw.includes('🔒')) {
      continue;
    }

    if (company && title) {
      jobs.push({
        title,
        company,
        location: location || 'USA / Global',
        url: url || 'https://github.com',
        type: repoType,
        source: 'GitHub Repos',
      });
    }
  }

  return jobs;
}

async function fetchRepo(repo) {
  try {
    console.log(`[GitHubRepos] Fetching ${repo.name}...`);
    const res = await axios.get(repo.rawUrl, {
      headers: {
        'User-Agent': 'job-alert-bot/1.0',
        'Accept': 'text/plain',
      },
      timeout: 20000,
    });
    return res.data;
  } catch (err) {
    console.error(`[GitHubRepos] Error fetching ${repo.name}:`, err.message);
    return null;
  }
}

async function scrape() {
  const allJobs = [];
  const seen = new Set();

  for (const repo of REPOS) {
    const content = await fetchRepo(repo);
    if (!content) continue;

    // Try HTML table parser first (SimplifyJobs switched from markdown to HTML in 2026)
    let jobs = parseHTMLTable(content, repo.type);
    if (jobs.length === 0) {
      // Fallback: legacy markdown pipe-table format
      jobs = parseMarkdownTable(content, repo.type);
    }
    console.log(`[GitHubRepos] ${repo.label}: ${jobs.length} jobs parsed`);

    for (const job of jobs) {
      const key = `${job.title}|${job.company}`;
      if (!seen.has(key)) {
        seen.add(key);
        allJobs.push(job);
      }
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`[GitHubRepos] Total: ${allJobs.length} unique jobs`);
  return allJobs;
}

module.exports = { scrape };

