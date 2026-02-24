# ⚡ LinkedIn Groq AI Auto Reply

> **Generate professional, AI-powered LinkedIn replies instantly — powered by Groq LLaMA3-70B.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest](https://img.shields.io/badge/Manifest-v3-green)
![Model](https://img.shields.io/badge/model-llama3--70b--8192-purple)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## 📁 Folder Structure

```
Extension/
├── extension/                  # Chrome Extension (Frontend)
│   ├── manifest.json           # MV3 manifest
│   ├── content.js              # LinkedIn page injector (core logic)
│   ├── background.js           # Service worker
│   ├── popup.html              # Extension popup UI
│   ├── popup.js                # Popup logic
│   ├── popup.css               # Popup styles (dark/light mode)
│   ├── styles.css              # Content script styles (buttons, badges, toasts)
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── backend/                    # Node.js + Express Backend
│   ├── server.js               # Main Express server + Groq API proxy
│   ├── package.json
│   ├── .env.example            # Environment variable template
│   ├── .env                    # Your actual secrets (NEVER commit this)
│   └── .gitignore
│
└── README.md
```

---

## 🚀 Running Locally

### Step 1 — Set Up the Backend

```bash
# Navigate to backend
cd Extension/backend

# Install dependencies
npm install

# Copy the env template and add your key
cp .env.example .env
```

Open `.env` and set your Groq API key:

```env
GROQ_API_KEY=gsk_your_key_here_from_console.groq.com
PORT=3001
```

> **Get a free Groq API key at:** https://console.groq.com

```bash
# Start the backend server
npm run dev       # Development (with hot reload via nodemon)
# OR
npm start         # Production
```

You should see:
```
╔══════════════════════════════════════════════════════╗
║   LinkedIn Groq AI Auto Reply - Backend Server       ║
║   Running on http://localhost:3001                   ║
║   Model: llama3-70b-8192                             ║
║   Status: ✅ Ready                                   ║
╚══════════════════════════════════════════════════════╝
```

Verify it works:
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"LinkedIn Groq AI Auto Reply",...}
```

---

### Step 2 — Load the Chrome Extension

1. Open Chrome and navigate to: `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `Extension/extension/` folder
5. The extension icon (⚡) will appear in your Chrome toolbar

---

### Step 3 — Test It

1. Go to **https://www.linkedin.com/feed**
2. Scroll to any post with comments
3. You'll see **⚡ Generate AI Reply** buttons appear under each comment
4. Click the button → the AI reply auto-inserts into the comment box
5. Review and click **Post**!

---

## ⚙️ Configuration

### Changing the Backend URL

If you deploy the backend to a cloud server, update this line in `extension/content.js`:

```js
const BACKEND_URL = 'http://localhost:3001/generate';
// Change to:
const BACKEND_URL = 'https://your-api.yourdomain.com/generate';
```

### Tone Options

Select from the popup:
| Tone | Description |
|------|-------------|
| 👔 **Professional** | Formal, polished, authoritative |
| 😊 **Friendly** | Warm, approachable, genuine |
| 🚀 **Founder Mode** | Bold, visionary, growth-oriented |
| 💪 **Motivational** | Energetic, inspiring, uplifting |

### Smart Comment Detection

| Type | Auto-behavior |
|------|--------------|
| ❓ Question | Helpful, knowledgeable answer |
| 🎉 Congratulation | Genuine, warm reply |
| ⚠️ Negative | Empathetic, constructive |
| 💬 Opinion | Adds unique perspective |
| 🚫 Toxic/Spam/Political | **Blocked — no button shown** |

### Daily Limit

- **10 replies per day** stored in `chrome.storage.local`
- Resets automatically at midnight
- Reset manually from the popup

---

## 🔐 Security Architecture

```
User clicks button
       │
       ▼
content.js (NO API KEY)
       │  POST /generate
       ▼
Express Backend (server.js)
  - Validates input length
  - Rate limits per IP
  - CORS whitelist
  - Helmet headers
       │
       ▼
Groq API (GROQ_API_KEY stays server-side)
       │
       ▼
Reply returned to extension
```

**Key security properties:**
- ✅ API key NEVER exposed to the browser or extension code
- ✅ Input validated (5–2000 chars)
- ✅ Rate limiting: 100 req/15min global, 20 req/5min for `/generate`
- ✅ Helmet HTTP security headers
- ✅ CORS restricted to extension + localhost origins

---

## 🌐 Publishing on Chrome Web Store

### Prerequisites
- Google Developer account ($5 one-time fee at https://chrome.google.com/webstore/devconsole)
- All icons ready (16px, 48px, 128px)
- Screenshots of the extension in action (1280×800 or 640×400)

### Steps

1. **Build a ZIP of the extension folder:**
   ```bash
   # From the Extension/ directory
   Compress-Archive -Path extension\* -DestinationPath groq-ai-reply.zip
   ```

2. **Go to Chrome Web Store Developer Dashboard:**
   https://chrome.google.com/webstore/devconsole

3. **Click "New Item"** → Upload your `groq-ai-reply.zip`

4. **Fill in the Store Listing:**
   - **Name:** LinkedIn Groq AI Auto Reply
   - **Category:** Productivity
   - **Language:** English
   - **Description:** (see SEO description below)
   - **Screenshots:** 3–5 screenshots of the extension working on LinkedIn
   - **Promotional tile:** 440×280px graphic

5. **Privacy Policy:** Required — explain what data is stored (only `chrome.storage` locally)

6. **Submit for Review** — Google reviews take 1–3 business days

7. **After approval:** Share your Chrome Web Store link!

---

## 📣 Chrome Web Store SEO Description

```
⚡ LinkedIn Groq AI Auto Reply — Generate Professional Replies in 1 Click

Stop spending 10 minutes crafting the perfect LinkedIn reply. 
Let Groq AI (powered by Meta's LLaMA3-70B) write engaging, 
human-sounding replies for you — instantly.

✨ KEY FEATURES:
• ⚡ One-click AI reply generation on any LinkedIn comment
• 🧠 Smart comment detection (Question, Congratulation, Opinion, Negative)
• 🎯 4 tone modes: Professional, Friendly, Founder Mode, Motivational
• 🚫 Auto-blocks toxic, spam & political content
• 📊 10 replies/day limit to keep engagement authentic
• 🔐 Your Groq API key stays 100% secure (never exposed in browser)
• 🌙 Beautiful dark & light mode UI
• 🚀 Zero-setup: install and start replying in 60 seconds

PERFECT FOR:
→ LinkedIn creators growing their personal brand
→ Founders doing founder-led sales on LinkedIn  
→ Sales professionals nurturing leads
→ Job seekers building authentic engagement
→ Content marketers managing LinkedIn presence

POWERED BY:
• Groq Cloud (world's fastest AI inference)
• Meta LLaMA3-70B (open-source, best-in-class language model)
• Chrome Extension Manifest V3

🔒 PRIVACY: We never store your LinkedIn data. All AI replies are 
generated in real-time and only the comment text is sent to our 
secure proxy server. No accounts required.

Start generating smarter LinkedIn replies today! ⚡
```

---

## 💰 SaaS Monetization Plan

### Free Tier
- 10 AI replies/day
- 2 tone options (Professional, Friendly)
- Community support

### Pro Tier — $9/month
- Unlimited AI replies
- All 4 tone modes
- Priority Groq inference
- Reply history & analytics dashboard
- Email support

### Business Tier — $29/month
- Everything in Pro
- 5 team seats
- Custom system prompt/brand voice
- API access for automation
- Priority support + onboarding call

### Agency Tier — $99/month
- Unlimited seats
- White-label option
- LinkedIn profile analytics
- Bulk reply scheduling
- Dedicated account manager

---

## 💳 Stripe Integration Plan

### Implementation Steps

1. **Add Stripe to backend:**
   ```bash
   npm install stripe
   ```

2. **Create checkout session endpoint:**
   ```js
   // POST /create-checkout
   const session = await stripe.checkout.sessions.create({
     mode: 'subscription',
     line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
     success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
     cancel_url: 'https://yourapp.com/cancel',
   });
   ```

3. **Webhook to grant access:**
   ```js
   // POST /webhook — listen for checkout.session.completed
   // Store user's subscription status in your database (Supabase/MongoDB)
   // Issue a token/API key to the extension
   ```

4. **Extension auth flow:**
   - User pays via web portal
   - Receives a unique `extension_key`
   - Enters key in popup → stored in `chrome.storage.sync`
   - All API calls include key in header: `Authorization: Bearer <extension_key>`
   - Backend validates key + checks subscription status

---

## 📈 How to Scale the Backend

### Phase 1 — Single Server (0–1K users)
- Deploy to **Railway**, **Render**, or **Fly.io** (free/cheap tiers)
- $0–7/month
- Current architecture handles this fine

### Phase 2 — Growing (1K–10K users)
- Move to **AWS EC2** (t3.medium) or **DigitalOcean Droplet**
- Add **Redis** for distributed rate limiting (replace `express-rate-limit` memory store)
- Add **PM2** for process management + zero-downtime restarts
  ```bash
  npm install -g pm2
  pm2 start server.js --name groq-api -i max
  ```
- Add **Nginx** as reverse proxy with SSL termination

### Phase 3 — Scale (10K+ users)
- **Horizontal scaling** with multiple Node instances behind a load balancer
- Move to **serverless** (AWS Lambda + API Gateway) for auto-scaling
- **Supabase/PostgreSQL** for user management and usage tracking
- **Upstash Redis** for rate limiting across instances
- **Groq Batch API** for cost optimization
- Add CDN (Cloudflare) in front of API

### Infra Cost Estimate
| Stage | Users | Monthly Cost |
|-------|-------|-------------|
| MVP | 0–500 | $0 (free tiers) |
| Growth | ~5K | $20–50 |
| Scale | ~50K | $200–500 |
| Enterprise | 100K+ | Custom |

---

## 📋 Requirements

- **Node.js** 18+
- **Chrome** 114+ (Manifest V3 support)
- **Groq API key** (free at https://console.groq.com)

---

## 📄 License

MIT © 2026 — LinkedIn Groq AI Auto Reply
