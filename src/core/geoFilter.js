'use strict';

// ─── Indian city/location keywords ─────────────────────────────────────────
const INDIA_KEYWORDS = [
  'india', 'indian', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'new delhi',
  'hyderabad', 'pune', 'chennai', 'kolkata', 'noida', 'gurgaon', 'gurugram',
  'ahmedabad', 'jaipur', 'kota', 'indore', 'bhopal', 'surat', 'chandigarh',
  'coimbatore', 'kochi', 'thiruvananthapuram', 'vizag', 'visakhapatnam',
  'nagpur', 'vadodara', 'lucknow', 'bhubaneswar', 'mysore', 'mysuru',
  'navi mumbai', 'thane', 'pimpri', 'mohali', 'zirakpur',
];

// ─── Remote/location-agnostic keywords ─────────────────────────────────────
const REMOTE_KEYWORDS = [
  'remote', 'work from home', 'wfh', 'anywhere', 'worldwide', 'global',
  'distributed', 'fully remote', 'remote-first', 'location independent',
  'virtual', 'telecommute',
];

// ─── Reputable global companies — always include even if on-site ────────────
const REPUTABLE_COMPANIES = [
  'google', 'alphabet', 'microsoft', 'amazon', 'aws', 'meta', 'facebook',
  'apple', 'netflix', 'openai', 'anthropic', 'deepmind', 'nvidia',
  'goldman sachs', 'jane street', 'two sigma', 'citadel', 'de shaw',
  'jump trading', 'optiver', 'tower research',
  'stripe', 'airbnb', 'uber', 'linkedin', 'salesforce', 'adobe',
  'oracle', 'ibm', 'qualcomm', 'intel', 'amd', 'arm',
  'atlassian', 'zoom', 'slack', 'shopify', 'dropbox', 'notion',
  'figma', 'canva', 'databricks', 'snowflake', 'palantir',
  'coinbase', 'robinhood', 'square', 'block',
  'spacex', 'tesla', 'bytedance', 'tiktok',
  'samsung', 'sony', 'lg', 'siemens', 'sap',
  'servicenow', 'workday', 'hubspot', 'twilio',
];

// FIX Issue 9: Sources that are India-primary — jobs with no location from
// these sources are assumed to be India-based (not bypassing geo filter).
const INDIA_PRIMARY_SOURCES = ['Internshala', 'Naukri', 'Freshersworld'];

function isIndia(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  return INDIA_KEYWORDS.some(kw => loc.includes(kw));
}

function isRemote(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  return REMOTE_KEYWORDS.some(kw => loc.includes(kw));
}

function isReputableCompany(company) {
  if (!company) return false;
  const co = company.toLowerCase();
  return REPUTABLE_COMPANIES.some(rc => co.includes(rc));
}

/**
 * Main geo-filter:
 * - India jobs: accept all (any city, remote, hybrid)
 * - Global jobs: accept only if remote OR reputable company
 *
 * FIX Issue 9: Empty location is no longer a free pass.
 * India-primary scrapers (Internshala, Naukri, Freshersworld) → assume India → accept.
 * All other sources with no location → reject (unknown global location).
 */
function passesGeoFilter(job) {
  const location = (job.location || '').toLowerCase().trim();
  const company = job.company || '';

  // India: always accept
  if (isIndia(location)) return true;

  // Explicitly remote: always accept
  if (isRemote(location)) return true;

  // No location info: source-aware default
  if (!location) {
    return INDIA_PRIMARY_SOURCES.includes(job.source);
  }

  // Global on-site at a reputable company: accept
  if (isReputableCompany(company)) return true;

  // Everything else: skip
  return false;
}

/**
 * Assign a geo tag for display
 */
function getGeoTag(job) {
  const location = (job.location || '').toLowerCase();
  if (isRemote(location)) return '🌐 Remote';
  if (isIndia(location)) return '🇮🇳 India';
  return '🌍 Global';
}

module.exports = { passesGeoFilter, getGeoTag, isIndia, isRemote, isReputableCompany };
