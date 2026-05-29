'use strict';

const axios = require('axios');

// Jobicy.com - free remote jobs public API
// Use simpler, working endpoints
const API_ENDPOINTS = [
  'https://jobicy.com/api/v2/remote-jobs?count=50&industry=technology',
  'https://jobicy.com/api/v2/remote-jobs?count=50&industry=tech-support',
];

function isCSJob(job) {
  const text = `${job.jobTitle || ''} ${(job.jobIndustry || []).join(' ')} ${(job.jobType || []).join(' ')}`.toLowerCase();
  const csTerms = ['software', 'engineer', 'developer', 'data', 'ml', 'ai', 'devops', 'cloud', 'backend', 'frontend', 'fullstack', 'mobile', 'platform'];
  return csTerms.some(t => text.includes(t));
}

async function scrape() {
  const allJobs = [];
  const seen = new Set();

  for (const endpoint of API_ENDPOINTS) {
    try {
      console.log(`[Jobicy] Fetching ${endpoint}`);
      const res = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'job-alert-bot/1.0',
          'Accept': 'application/json',
        },
        timeout: 15000,
      });

      const data = res.data;
      const listings = data.jobs || data.data || data || [];
      const arr = Array.isArray(listings) ? listings : [];

      console.log(`[Jobicy]   ${arr.length} raw listings`);

      for (const item of arr) {
        if (!isCSJob(item)) continue;

        const key = `${item.jobTitle}|${item.companyName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        allJobs.push({
          title: item.jobTitle || '',
          company: item.companyName || '',
          location: item.jobGeo || 'Remote',
          salary: item.annualSalaryMin
            ? `$${item.annualSalaryMin}–$${item.annualSalaryMax} ${item.salaryCurrency || 'USD'}`
            : '',
          url: item.url || item.jobExcerpt || '',
          postedAt: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-IN') : '',
          type: (item.jobTitle || '').toLowerCase().includes('intern') ? 'internship' : 'fulltime',
          source: 'Jobicy',
        });
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error('[Jobicy] Error:', err.message);
    }
  }

  console.log(`[Jobicy] Total: ${allJobs.length} unique CS jobs`);
  return allJobs;
}

module.exports = { scrape };
