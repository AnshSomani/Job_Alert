'use strict';

const axios = require('axios');

// Community-maintained GitHub repos with job tables in README.
// These repos are updated frequently by the community and contain
// high-signal new-grad and internship listings.
const REPOS = [
  {
    name: 'SimplifyJobs/New-Grad-Positions',
    rawUrl: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/README.md',
    type: 'fulltime',
    label: 'New Grad 2025/2026',
  },
  {
    name: 'SimplifyJobs/Summer-2026-Internships',
    rawUrl: 'https://raw.githubusercontent.com/SimplifyJobs/Summer-2026-Internships/dev/.github/README.md',
    type: 'internship',
    label: 'Summer 2026 Intern (dev branch)',
  },
  {
    name: 'SimplifyJobs/Summer-2026-Internships (main)',
    rawUrl: 'https://raw.githubusercontent.com/SimplifyJobs/Summer-2026-Internships/main/README.md',
    type: 'internship',
    label: 'Summer 2026 Intern (main branch)',
  },
];

// FIX Issue 12: Removed dead constant SIMPLIFY_BASE — it was declared but
// never used anywhere in this file.

/**
 * Parse a markdown table row like:
 * | Company | Role | Location | Apply | Date |
 * Returns array of job objects
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
    const markdown = await fetchRepo(repo);
    if (!markdown) continue;

    const jobs = parseMarkdownTable(markdown, repo.type);
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
