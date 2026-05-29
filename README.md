# 🤖 Job Alert Bot — CS Job Hunter for IIIT Kota 2023–27

> Automatically scrapes 9 job platforms twice daily and delivers fresh CS job & internship alerts directly to your **Telegram** and **Discord**, hosted 100% free on GitHub Actions.

---

## ✨ Features

| Feature | Details |
|---|---|
| **10 Scrapers** | Internshala, Naukri, Google Jobs, RemoteOK, WeWorkRemotely, YCombinator, GitHub Repos, Freshersworld, Jobicy |
| **Dual Notifications** | Telegram (rich messages) + Discord (rich embeds) simultaneously |
| **Smart Filtering** | CS-only roles, experience filter (no 5+ yr roles), geo filter |
| **Deduplication** | SHA-256 hash DB — never get the same job twice |
| **Free Hosting** | GitHub Actions cron — zero cost, zero maintenance |
| **Rate-limit safe** | 240 SerpAPI calls/month, well within all free tiers |

---

## 📅 Schedule

| Run | Time (IST) | SerpAPI? | Sources |
|---|---|---|---|
| Morning | **9:00 AM** | ✅ Yes (8 queries) | All 9 scrapers |
| Evening | **9:00 PM** | ❌ No | 8 free scrapers |

---

## 🚀 Setup (5 minutes)

### Step 1 — Fork this repo to your GitHub

### Step 2 — Add GitHub Secrets
Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Where to get it |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Message `@BotFather` on Telegram → `/newbot` |
| `TELEGRAM_CHAT_ID` | Message your bot, then visit `api.telegram.org/bot<TOKEN>/getUpdates` |
| `SERPAPI_KEY` | Sign up at [serpapi.com](https://serpapi.com) (250 free/month) |
| `DISCORD_WEBHOOK_URL` | Server Settings → Integrations → Webhooks → New Webhook |

### Step 3 — Test it manually
Go to **Actions tab → Morning Scrape → Run workflow**

That's it! The bot will run automatically at 9 AM and 9 PM IST every day.

---

## 🧪 Local Testing

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/job-alert-bot
cd job-alert-bot
npm install

# Copy env template
cp .env.example .env
# Fill in your credentials in .env

# Test run (no messages sent)
npm test

# Full local run
npm start

# Full run with SerpAPI
npm run start:all
```

---

## 📁 Project Structure

```
job-alert-bot/
├── .github/workflows/
│   ├── scrape-morning.yml    # 9 AM IST — full run with SerpAPI
│   └── scrape-evening.yml    # 9 PM IST — free sources only
├── src/
│   ├── scrapers/             # One file per platform
│   ├── core/                 # DB, filter, geoFilter, formatter
│   ├── notifiers/            # telegram.js, discord.js
│   └── main.js               # Entry point
├── data/
│   └── seen_jobs.json        # Deduplication DB (auto-committed by Actions)
├── .env.example
└── package.json
```

---

## 🌍 Geographic Rules

- **India** (any city, remote, hybrid) → ✅ Always included
- **Global remote** → ✅ Always included  
- **Global on-site at top companies** (Google, Microsoft, Meta, etc.) → ✅ Included
- **Random global on-site** → ❌ Skipped

---

## 📊 Rate Limit Budget

| Service | Limit | Used | Buffer |
|---|---|---|---|
| SerpAPI | 250/month | ~240/month | 10 |
| GitHub Actions | 2,000 min/month | ~90 min/month | 1,910 min |
| Telegram | 1 msg/sec | ~0.6 msg/sec | Safe |
| Discord | ~30 msg/min | ~1 msg/2s | Safe |

---

## 📝 Notes

- The `data/seen_jobs.json` file is auto-committed by GitHub Actions after each run — this is how deduplication persists across runs
- Jobs older than 45 days are auto-purged from the DB
- Max 30 job notifications per run to prevent spam
- India jobs are shown first, then remote, then global
