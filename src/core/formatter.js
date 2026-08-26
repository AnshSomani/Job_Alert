'use strict';

const { getGeoTag } = require('./geoFilter');

// Emoji map
const TYPE_EMOJI = {
  internship: '🧪',
  fulltime: '💼',
  contract: '📝',
};

const SOURCE_EMOJI = {
  'Google Jobs': '🔍',
  'Internshala': '🎓',
  'Naukri': '📋',
  'RemoteOK': '🌐',
  'WeWorkRemotely': '🏠',
  'YCombinator': '🚀',
  'GitHub Repos': '📦',
  'Freshersworld': '🌱',
  'Remotive': '💡',
};

// Escape special MarkdownV2 characters for Telegram
function escapeMdV2(text) {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, c => `\\${c}`);
}

/**
 * FIX Issue 11: Encode parentheses in URLs before embedding in MarkdownV2.
 * ATS systems (Greenhouse, Lever, Workday) use parens in URLs which break
 * Telegram's inline link syntax: [text](url_with_(parens)) → malformed.
 */
function safeUrl(url) {
  if (!url) return '';
  return url.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/**
 * Format a single job as Telegram MarkdownV2 message
 */
function formatTelegram(job) {
  const typeEmoji = TYPE_EMOJI[job.type] || '💼';
  const sourceEmoji = SOURCE_EMOJI[job.source] || '📌';
  const geoTag = getGeoTag(job);

  const title = escapeMdV2(job.title);
  const company = escapeMdV2(job.company || 'Unknown Company');
  const location = escapeMdV2(job.location || 'Not specified');
  const salary = job.salary ? `\n💰 ${escapeMdV2(job.salary)}` : '';
  // FIX Issue 11: 'Full-Time' — hyphen must be escaped but not double-escaped
  const typeLabel = job.type === 'internship' ? 'Internship' : job.type === 'contract' ? 'Contract' : 'Full-Time';
  const type = escapeMdV2(typeLabel);
  const source = escapeMdV2(job.source || 'Unknown');
  const url = safeUrl(job.url || '');
  const posted = job.postedAt ? `\n⏱ ${escapeMdV2(job.postedAt)}` : '';

  return (
    `${typeEmoji} *${title}*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 ${company}\n` +
    `📍 ${location} ${escapeMdV2(geoTag)}\n` +
    `🏷 ${type} • ${sourceEmoji} ${source}` +
    `${job.matchScore != null ? `\n📊 Match: ${escapeMdV2(String(job.matchScore))}%` : ''}` +
    `${job.aiReason ? `\n💡 ${escapeMdV2(job.aiReason)}` : ''}` +
    `${salary}` +
    `${posted}\n` +
    `${job.coldPitch && job.matchScore >= 80 ? `\n✉️ _${escapeMdV2(job.coldPitch)}_\n` : ''}` +
    `\n🔗 [Apply Now →](${url})`
  );
}

/**
 * Format a batch header for Telegram (only called when jobs.length > 0)
 */
function formatTelegramHeader(count, runType) {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return (
    `🤖 *Job Alert Bot* — ${escapeMdV2(String(count))} new job${count > 1 ? 's' : ''} found\\!\n` +
    `_Run: ${escapeMdV2(runType)} \\| ${escapeMdV2(time)} IST_`
  );
}

/**
 * Format a single job as a Discord embed object
 */
function formatDiscordEmbed(job) {
  const geoTag = getGeoTag(job);
  const sourceEmoji = SOURCE_EMOJI[job.source] || '📌';

  // Color by type
  const color =
    job.type === 'internship' ? 0x00b894 :   // green
    job.type === 'contract'   ? 0xfdcb6e :   // yellow
                                0x0984e3;    // blue

  const fields = [
    { name: '🏢 Company', value: (job.company || 'Unknown').slice(0, 1024), inline: true },
    { name: '📍 Location', value: `${(job.location || 'Not specified').slice(0, 900)} ${geoTag}`, inline: true },
    { name: '🏷 Type', value: job.type === 'internship' ? '🧪 Internship' : job.type === 'contract' ? '📝 Contract' : '💼 Full-Time', inline: true },
    { name: `${sourceEmoji} Source`, value: (job.source || 'Unknown'), inline: true },
  ];

  if (job.salary) {
    fields.push({ name: '💰 Salary / Stipend', value: job.salary.slice(0, 1024), inline: true });
  }
  if (job.postedAt) {
    fields.push({ name: '⏱ Posted', value: job.postedAt, inline: true });
  }
  if (job.matchScore != null) {
    fields.push({ name: '📊 Match Score', value: `${job.matchScore}%`, inline: true });
  }
  if (job.aiReason) {
    fields.push({ name: '💡 AI Insight', value: job.aiReason.slice(0, 1024), inline: false });
  }
  if (job.coldPitch && job.matchScore >= 80) {
    fields.push({ name: '✉️ Cold Pitch', value: job.coldPitch.slice(0, 1024), inline: false });
  }

  return {
    title: ((TYPE_EMOJI[job.type] || '💼') + ' ' + (job.title || 'Job Opportunity')).slice(0, 256),
    url: job.url || undefined,
    color,
    fields,
    footer: {
      text: `IIIT Kota Job Bot • ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format a Discord summary embed (only called when jobs.length > 0)
 */
function formatDiscordHeader(count, runType) {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  return {
    title: `🤖 Job Bot — ${count} New Job${count > 1 ? 's' : ''} Found!`,
    description: `Here are the latest CS opportunities. Good luck! 🚀`,
    color: 0x6c5ce7,
    footer: { text: `${runType} • ${time} IST` },
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  formatTelegram,
  formatTelegramHeader,
  formatDiscordEmbed,
  formatDiscordHeader,
};
