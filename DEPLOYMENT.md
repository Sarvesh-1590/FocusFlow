# FocusFlow — Deployment Guide

## Step-by-step: Local → Production in 30 minutes

---

## 1. Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis running locally (`brew install redis` / `sudo apt install redis`)
- Anthropic API key → https://console.anthropic.com
- OpenAI API key → https://platform.openai.com

### Backend

```bash
cd focusflow/backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and fill in your keys:
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# REDIS_URL=redis://localhost:6379
# ALLOWED_ORIGINS=http://localhost:5173
```

Start Redis:
```bash
redis-server
```

Start backend:
```bash
uvicorn main:app --reload --port 8000
```

Start Celery worker (optional, for background tasks):
```bash
celery -A celery_worker worker --loglevel=info
```

### Frontend

```bash
cd focusflow/frontend
npm install
# Create .env.local:
echo "VITE_API_URL=" > .env.local        # empty = use Vite proxy
echo "VITE_WS_URL=" >> .env.local
npm run dev
```

Visit http://localhost:5173 ✅

---

## 2. Deploy Backend → Render

1. Push your code to a GitHub repo
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo, set **Root Directory** to `backend`
4. Settings:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   ```
   ANTHROPIC_API_KEY    = your key
   OPENAI_API_KEY       = your key
   REDIS_URL            = (from Render Redis add-on)
   ALLOWED_ORIGINS      = https://your-app.vercel.app
   ```
6. Add Redis: Render Dashboard → New → Redis → Free tier
   - Copy the Internal Redis URL into `REDIS_URL`
7. Deploy → note your backend URL: `https://focusflow-api.onrender.com`

---

## 3. Deploy Frontend → Vercel

1. Go to https://vercel.com → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Add Environment Variables:
   ```
   VITE_API_URL  = https://focusflow-api.onrender.com
   VITE_WS_URL   = wss://focusflow-api.onrender.com
   ```
4. Deploy → your app is live at `https://focusflow.vercel.app`

---

## 4. Production Checklist

| Item | Status | Notes |
|------|--------|-------|
| API keys set as env vars | Required | Never hardcode |
| ALLOWED_ORIGINS updated | Required | Add your Vercel URL |
| Redis provisioned | Required | Render free tier works |
| HTTPS on backend | Auto | Render provides SSL |
| HTTPS on frontend | Auto | Vercel provides SSL |
| WebSocket uses wss:// | Required | Set VITE_WS_URL |
| Model files excluded from git | Required | Check .gitignore |

---

## 5. Known Limitations (Free Tier)

| Issue | Cause | Fix |
|-------|-------|-----|
| Backend cold starts (30-60s) | Render free tier sleeps | Upgrade to Starter ($7/mo) |
| ML model load time (~60s) | Models load on startup | Use persistent disk or cache |
| Redis 25MB limit | Render free Redis | Upgrade or use Redis Cloud free |
| Whisper API cost | ~$0.006/min audio | Budget ~$0.30/hour of meetings |

---

## 6. Environment Variables Reference

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
REDIS_URL=redis://...

# Required in production
ALLOWED_ORIGINS=https://your-app.vercel.app

# Optional - use fine-tuned T5 checkpoint
T5_MODEL_PATH=path/to/your/fine-tuned-t5
```

---

## 7. Cost Estimate (per hour of meetings)

| Service | Cost |
|---------|------|
| Whisper API | ~$0.006/min × 60 = $0.36 |
| Claude API (summaries + Q&A) | ~$0.10–0.30 |
| Render Starter (backend) | $7/mo flat |
| Vercel (frontend) | Free |
| Redis | Free tier / $0 |
| **Total per hour** | **~$0.50–0.70** |
