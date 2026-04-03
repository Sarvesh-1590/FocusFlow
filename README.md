# FocusFlow — AI Meeting Companion for Neurodiverse Professionals

> Real-time meeting summaries, action item detection, attention drift nudges, and live Q&A — powered by a full ML pipeline.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | FastAPI + WebSockets |
| STT | OpenAI Whisper (via API) |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) |
| Topic Segmentation | BERTopic |
| Action Item Classifier | DistilBERT (fine-tuned) |
| Drift Detector | XGBoost |
| Readability Rewriter | T5-small (fine-tuned) |
| LLM | Claude API (Anthropic) |
| Vector Store | FAISS |
| Task Queue | Celery + Redis |
| Deployment | Render (backend) + Vercel (frontend) |

---

## Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis (running locally)
- Anthropic API key
- OpenAI API key (for Whisper)

### 1. Clone & Setup Backend

```bash
cd focusflow/backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Environment Variables

```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Start Redis

```bash
redis-server
```

### 4. Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 5. Start Celery Worker

```bash
cd backend
celery -A celery_worker worker --loglevel=info
```

### 6. Setup & Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`

---

## Deployment

### Backend → Render

1. Connect GitHub repo to Render
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add all environment variables from `.env`

### Frontend → Vercel

1. Connect GitHub repo to Vercel
2. Set root directory: `frontend`
3. Set `VITE_API_URL` to your Render backend URL

---

## Project Structure

```
focusflow/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── celery_worker.py         # Celery config
│   ├── requirements.txt
│   ├── .env.example
│   ├── routers/
│   │   ├── session.py           # Meeting session endpoints
│   │   ├── transcript.py        # Transcript + summary endpoints
│   │   └── qa.py                # Q&A endpoint
│   ├── ml/
│   │   ├── stt.py               # Whisper speech-to-text
│   │   ├── embeddings.py        # Sentence embeddings
│   │   ├── topic_model.py       # BERTopic segmentation
│   │   ├── classifier.py        # DistilBERT action item classifier
│   │   ├── drift_detector.py    # XGBoost drift model
│   │   ├── rewriter.py          # T5 readability rewriter
│   │   └── rag.py               # FAISS RAG pipeline
│   └── services/
│       ├── session_store.py     # Redis session management
│       └── claude_client.py     # Claude API client
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── components/
        │   ├── MeetingRoom.jsx       # Main meeting UI
        │   ├── TranscriptPanel.jsx   # Live transcript
        │   ├── SummaryCard.jsx       # Rolling summary cards
        │   ├── ActionSidebar.jsx     # Action items + decisions
        │   ├── DriftNudge.jsx        # Re-engagement nudge
        │   ├── QAPanel.jsx           # Real-time Q&A
        │   └── PostMeetingDigest.jsx # End-of-meeting report
        ├── hooks/
        │   ├── useWebSocket.js       # WebSocket connection
        │   ├── useMicrophone.js      # Browser audio capture
        │   └── useMeeting.js         # Meeting state management
        └── utils/
            └── api.js                # API helper functions
```
