'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const SEARCH_URLS = [
  'https://www.naukri.com/software-engineer-fresher-jobs?experience=0,1&jobAge=1',
  'https://www.naukri.com/software-developer-fresher-jobs?experience=0,1&jobAge=3',
  'https://www.naukri.com/data-engineer-fresher-jobs?experience=0,1',
  'https://www.naukri.com/machine-learning-engineer-fresher-jobs?experience=0,1',
  'https://www.naukri.com/full-stack-developer-fresher-jobs?experience=0,1',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://www.naukri.com/',
  'sec-ch-ua': '"Chromium";v="124"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
};

async function fetchPage(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 20000 });
    return res.data;
  } catch (err) {
    console.error(`[Naukri] Fetch error: ${err.message}`);
    return null;
  }
}

function extractNextData(html) {
  // Naukri embeds job data as JSON in a <script id="__NEXT_DATA__"> tag
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  return null;
}

function parseFromNextData(data) {
  const jobs = [];
  try {
    // Navigate the Next.js data structure to find job listings
    const props = data?.props?.pageProps;
    const jobData = props?.jobData || props?.jobsData || props?.data;
    const listings = jobData?.jobDetails || jobData?.jobs || jobData?.results || [];

    for (const item of listings) {
      const title = item.title || item.jobTitle || '';
      const company = item.companyName || item.company || '';
      const location = item.placeholders?.find(p => p.type === 'location')?.label ||
                       item.location || item.city || 'India';
      const salary = item.placeholders?.find(p => p.type === 'salary')?.label || '';
      const experience = item.experience || '';
      const jobId = item.jobId || item.id || '';
      const url = jobId ? `https://www.naukri.com/job-listings-${title.replace(/\s+/g, '-').toLowerCase()}-${company.replace(/\s+/g, '-').toLowerCase()}-${jobId}` : '';

      if (title) {
        jobs.push({
          title,
          company,
          location: location || 'India',
          salary,
          url: url || 'https://www.naukri.com',
          postedAt: item.footerPlaceholderLabel || '',
          type: title.toLowerCase().includes('intern') ? 'internship' : 'fulltime',
          source: 'Naukri',
        });
      }
    }
  } catch (err) {
    console.warn('[Naukri] Error parsing __NEXT_DATA__:', err.message);
  }
  return jobs;
}

function parseWithCheerio(html) {
  const $ = cheerio.load(html);
  const jobs = [];

  // Naukri job cards
  $('article.jobTuple, .cust-job-tuple, [class*="job-container"], .jobsearch-SerpJobCard').each((_, el) => {
    const card = $(el);
    const title = card.find('a.title, .title a, h2 a, [class*="jobTitle"]').first().text().trim();
    const company = card.find('.comp-name, [class*="companyName"], .company-name').first().text().trim();
    const location = card.find('.loc-wrap, [class*="location"], .loc').first().text().trim() || 'India';
    const salary = card.find('.salary-detail, [class*="salary"]').first().text().trim();
    const url = card.find('a.title, a[href*="naukri.com/job"]').attr('href') || '';

    if (title) {
      jobs.push({
        title,
        company: company || 'Company on Naukri',
        location,
        salary,
        url: url.startsWith('http') ? url : `https://www.naukri.com${url}`,
        type: title.toLowerCase().includes('intern') ? 'internship' : 'fulltime',
        source: 'Naukri',
      });
    }
  });

  return jobs;
}

async function scrape() {
  const allJobs = [];
  const seen = new Set();

  for (const url of SEARCH_URLS) {
    console.log(`[Naukri] Fetching ${url}`);
    const html = await fetchPage(url);
    if (!html) continue;

    // Try __NEXT_DATA__ first (more structured)
    let jobs = [];
    const nextData = extractNextData(html);
    if (nextData) {
      jobs = parseFromNextData(nextData);
      console.log(`[Naukri]   ${jobs.length} jobs from __NEXT_DATA__`);
    }

    // Fallback to cheerio if needed
    if (jobs.length === 0) {
      jobs = parseWithCheerio(html);
      console.log(`[Naukri]   ${jobs.length} jobs from cheerio`);
    }

    for (const job of jobs) {
      const key = `${job.title}|${job.company}`;
      if (!seen.has(key)) {
        seen.add(key);
        allJobs.push(job);
      }
    }

    await new Promise(r => setTimeout(r, 4000)); // Naukri is strict — longer delay
  }

  console.log(`[Naukri] Total: ${allJobs.length} unique jobs`);
  return allJobs;
}

module.exports = { scrape };
