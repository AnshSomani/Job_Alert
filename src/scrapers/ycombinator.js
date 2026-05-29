'use strict';

const Parser = require('rss-parser');
const parser = new Parser({ timeout: 15000 });

const HN_JOBS_RSS = 'https://news.ycombinator.com/jobs.rss';

const CS_KEYWORDS = [
  'engineer', 'developer', 'software', 'backend', 'frontend', 'fullstack',
  'data', 'ml', 'machine learning', 'ai', 'devops', 'sre', 'platform',
  'infrastructure', 'security', 'mobile', 'ios', 'android', 'cloud',
  'python', 'javascript', 'typescript', 'golang', 'rust',
];

function extractDetails(item) {
  const content = (item.contentSnippet || item.content || '').toLowerCase();
  const title = (item.title || '').toLowerCase();

  const isRemote = content.includes('remote') || title.includes('remote');
  const isIntern = content.includes('intern') || title.includes('intern');

  return { isRemote, isIntern };
}

async function scrape() {
  console.log('[YCombinator] Fetching HN Jobs RSS...');
  try {
    const result = await parser.parseURL(HN_JOBS_RSS);
    const items = result.items || [];
    console.log(`[YCombinator] Raw items: ${items.length}`);

    const jobs = items
      .filter(item => {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
        return CS_KEYWORDS.some(kw => text.includes(kw));
      })
      .map(item => {
        const { isRemote, isIntern } = extractDetails(item);
        // HN job posts usually follow format: "Company (YC SXXX) – Hiring ROLE (Remote)"
        const titleParts = (item.title || '').split('–');
        const company = titleParts[0]?.trim() || 'YC Company';
        const role = titleParts[1]?.trim() || item.title || 'Engineering Role';

        return {
          title: role,
          company,
          location: isRemote ? 'Remote' : 'Global / On-site',
          url: item.link || item.guid || 'https://news.ycombinator.com/jobs',
          postedAt: item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-IN') : '',
          description: item.contentSnippet ? item.contentSnippet.slice(0, 300) : '',
          type: isIntern ? 'internship' : 'fulltime',
          source: 'YCombinator',
        };
      });

    console.log(`[YCombinator] CS-relevant jobs: ${jobs.length}`);
    return jobs;
  } catch (err) {
    console.error('[YCombinator] Error:', err.message);
    return [];
  }
}

module.exports = { scrape };
