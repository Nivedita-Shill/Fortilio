# Fortilio – Your Portfolio. Your Fortune.

React (Vite, React Router) + FastAPI + SQLAlchemy (SQLite locally, PostgreSQL in production) with JWT auth.
Prices are entered by the user. There is no live market feed and no investment advice.

## User workflow
1. **Landing** `/` – product overview and how it works
2. **Register / Login** `/register`, `/login`
3. **Onboarding** `/onboarding` – About you → Risk questionnaire (4 questions) → First goal
4. **App** `/app` – Dashboard, Holdings (add, update price, delete), Transactions (buy/sell), Goals, Profile
Routes are guarded: logged-out users go to login; users who haven't finished onboarding go to onboarding.

## Run
    cd backend && python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\Activate.ps1
    pip install -r requirements.txt && cp .env.example .env
    uvicorn main:app --reload          # http://127.0.0.1:8000/docs
    cd frontend && cp .env.example .env && npm install && npm run dev

## Backend layout
    main.py database.py models.py schemas.py security.py
    routers/auth.py       register, login, me
    routers/profile.py    profile + risk score, goals CRUD
    routers/portfolio.py  holdings, transactions, summary, allocation, history, insights

## API (all but /auth/* and /health need `Authorization: Bearer <token>`)
POST /api/auth/register · POST /api/auth/login · GET /api/auth/me
GET/PUT /api/profile · GET/POST /api/goals · DELETE /api/goals/{id}
GET/POST /api/holdings · PUT /api/holdings/{id}/price · DELETE /api/holdings/{id}
GET/POST /api/transactions · GET /api/summary /allocation /history /insights

## Deploy
Backend on Render (root `backend`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`) with env vars
`DATABASE_URL` (hosted Postgres), `JWT_SECRET` (long random), `FRONTEND_ORIGIN` (your Vercel URL).
Frontend on Vercel (root `frontend`, `VITE_API_URL` = backend URL). `vercel.json` handles client-side routes.
