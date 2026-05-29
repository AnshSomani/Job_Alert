'use strict';

// ─── CS Role Keywords — matched ONLY against job title ───────────────────────
// FIX Issue 8: Scope allow/block checks to title only, not company/description.
// This prevents "Salesforce" company from being blocked by 'sales' keyword,
// and prevents "Security Guard" from passing as a CS role.
const ALLOW_KEYWORDS = [
  // Core engineering roles
  'software engineer', 'software developer', 'software development',
  'sde', 'swe', 'systems engineer', 'systems developer',
  // Specializations
  'backend developer', 'backend engineer', 'back-end developer', 'back-end engineer',
  'frontend developer', 'frontend engineer', 'front-end developer', 'front-end engineer',
  'full stack', 'fullstack', 'full-stack',
  'mobile developer', 'mobile engineer', 'ios developer', 'android developer',
  'data engineer', 'data scientist', 'data analyst',
  'machine learning', 'ml engineer', 'ai engineer',
  'devops engineer', 'site reliability', 'sre', 'platform engineer',
  'cloud engineer', 'infrastructure engineer',
  'security engineer', 'cybersecurity engineer', 'application security',
  'embedded engineer', 'firmware engineer',
  'qa engineer', 'quality assurance engineer', 'automation engineer', 'test engineer',
  // Fresher/intern specific
  'intern', 'internship', 'trainee', 'fresher', 'new grad', 'entry level', 'junior developer',
  'junior engineer', 'associate engineer', 'associate developer', 'graduate engineer',
  // Domain terms that in a title context are unambiguous
  'computer science', 'deep learning', 'nlp engineer', 'computer vision',
  'blockchain developer', 'web developer', 'api developer',
  'react developer', 'node developer', 'python developer',
  'java developer', 'golang developer', 'rust developer',
  'kubernetes', 'docker', 'microservices',
];

// ─── Blocklist — matched ONLY against job title ─────────────────────────────
const BLOCK_KEYWORDS = [
  'sales executive', 'sales manager', 'sales representative', 'sales associate',
  'business development', 'marketing manager', 'digital marketing',
  'financial analyst', 'business analyst', 'hr executive', 'human resources',
  'legal counsel', 'operations manager', 'project manager', 'product manager',
  'content writer', 'graphic designer', 'ui/ux designer',
  'customer success', 'customer support', 'account manager', 'account executive',
  'recruiter', 'talent acquisition',
  'mechanical engineer', 'civil engineer', 'electrical engineer', 'hardware engineer',
  'supply chain', 'logistics coordinator',
];

// ─── Experience killers — checked against full text (title + description) ────
const OVER_EXPERIENCED = [
  '10+ years', '10 years experience', '9+ years', '8+ years',
  '7+ years', '6+ years', '5+ years', '5 years of experience',
  '6 years of experience', '7 years of experience',
  'minimum 5 years', 'at least 5 years',
];

/**
 * FIX Issue 8: Run ALLOW/BLOCK checks on title only.
 * Reserve fullText scan only for experience-level detection.
 */
function isRelevant(job) {
  const titleOnly = (job.title || '').toLowerCase();
  const fullText = `${job.title || ''} ${job.description || ''}`.toLowerCase();

  // Title must match at least one CS keyword (compound phrases = fewer false positives)
  const hasCS = ALLOW_KEYWORDS.some(kw => titleOnly.includes(kw));
  if (!hasCS) return false;

  // Title must not match explicit non-CS role
  const isBlocked = BLOCK_KEYWORDS.some(kw => titleOnly.includes(kw));
  if (isBlocked) return false;

  // Full text checked only for experience level (descriptions contain years-of-exp requirements)
  const isTooSenior = OVER_EXPERIENCED.some(kw => fullText.includes(kw));
  if (isTooSenior) return false;

  return true;
}

/**
 * Detect job type from title/description
 */
function detectJobType(job) {
  const text = `${job.title || ''} ${job.description || ''}`.toLowerCase();
  if (text.includes('intern') || text.includes('internship') || text.includes('trainee')) return 'internship';
  if (text.includes('contract') || text.includes('freelance') || text.includes('part-time')) return 'contract';
  return 'fulltime';
}

/**
 * Filter and enrich an array of raw jobs
 */
function filterJobs(jobs) {
  return jobs
    .filter(j => j && j.title && j.url)
    .filter(isRelevant)
    .map(job => ({
      ...job,
      type: job.type || detectJobType(job),
    }));
}

module.exports = { filterJobs, isRelevant, detectJobType };
