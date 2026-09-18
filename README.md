# BappaVerse 🐘
### Ganapati Festival Gaming Platform

A full-stack, real-time multiplayer gaming platform for Ganesh Chaturthi with two games: **Ganapati Quiz** and **Bappa Housie (Tambola)**.

---

## Architecture

```
bappaverse/
├── frontend/     → Next.js 14 + TypeScript + Tailwind CSS → Vercel
└── server/       → Node.js + Express + Socket.IO + MongoDB → Render
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### 1. Set up the Server

```bash
cd server
cp .env.example .env
# Fill in your MongoDB URI and set ADMIN_EMAIL
npm install
```

Create your `.env`:
```env
PORT=10000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bappaverse
FRONTEND_URL=http://localhost:3000
AUTH_SECRET=your-secure-random-secret-min-32-chars
NODE_ENV=development
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=YourSecurePassword123!
```

Seed the database:
```bash
npx ts-node-dev --transpile-only scripts/seed.ts
```

Start the server:
```bash
npm run dev
# Server runs on http://localhost:10000
```

### 2. Set up the Frontend

```bash
cd frontend
cp .env.example .env.local
# .env.local already points to localhost:10000
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### 3. First Login

1. Open http://localhost:3000
2. Click **Register**
3. Use the `ADMIN_EMAIL` you set — this account auto-gets **Host** role
4. You'll be redirected to `/admin` — the Host Control Room

---

## Features

### Player Features
- ✅ Register / Login with secure bcrypt password hashing
- ✅ Personal dashboard with stats (wins, points, rank)
- ✅ **Ganapati Quiz** — 6 categories, timed questions, score tracking
- ✅ **Join Housie** — enter room code, get unique Tambola ticket
- ✅ **Live ticket** — marks numbers in real-time as Host calls them
- ✅ **Claim Win** — submit winning pattern claim (server-validated)
- ✅ Game history, wins, leaderboard
- ✅ Festival points accumulation

### Host/Admin Features
- ✅ Separate `/admin` route with role guard
- ✅ **Create Housie game** — name, patterns, max players, auto-call interval
- ✅ **Host Control Room** (`/admin/housie/[gameId]`)
  - Large number display with animation
  - Full 1–90 number board (called = highlighted)
  - Manual + Auto number calling
  - Pause / Resume / End game
  - **See every player's ticket in real-time**
  - Filter players by pattern completion
  - Pending claim alerts with Approve/Reject
- ✅ **Quiz Manager** — add/edit/delete questions
- ✅ Player statistics

---

## Database Models

| Model | Purpose |
|-------|---------|
| `User` | Auth, role, stats (wins, points) |
| `QuizQuestion` | Quiz content with correct answers |
| `QuizGame` | Player quiz sessions + scores |
| `HousieGame` | Game state, called numbers, patterns |
| `HousieTicket` | 3×9 Tambola ticket per player per game |
| `WinnerClaim` | Claim lifecycle with server validation |

---

## Socket.IO Events

### Client → Server
| Event | Description |
|-------|-------------|
| `join-game` | Join a game room |
| `leave-game` | Leave a game room |
| `start-game` | Host: start game |
| `call-number` | Host: call next number |
| `toggle-auto-call` | Host: toggle auto-calling |
| `pause-game` | Host: pause |
| `resume-game` | Host: resume |
| `claim-win` | Player: claim a winning pattern |
| `approve-claim` | Host: approve a claim |
| `reject-claim` | Host: reject a claim |
| `end-game` | Host: end game |
| `request-game-state` | Reconnection: get current state |

### Server → Client
| Event | Description |
|-------|-------------|
| `game-state` | Full game state on join/reconnect |
| `player-joined` | New player joined |
| `player-left` | Player disconnected |
| `game-started` | Game has started |
| `number-called` | New number called + all player progress |
| `game-paused` | Game paused |
| `game-resumed` | Game resumed |
| `winner-claim-pending` | Player submitted a claim |
| `winner-approved` | Claim approved by Host |
| `winner-rejected` | Claim rejected by Host |
| `game-ended` | Game over |

---

## Housie Rules Implemented

- ✅ 3 rows × 9 columns, 15 numbers, 5 per row
- ✅ Standard Tambola column ranges (col 1: 1–9, col 9: 80–90)
- ✅ Server-generated and stored tickets
- ✅ **Early Five** — first 5 numbers marked
- ✅ **Top Line** — complete first row
- ✅ **Middle Line** — complete second row
- ✅ **Bottom Line** — complete third row
- ✅ **Four Corners** — optional
- ✅ **Full House** — all 15 numbers

All win validation is **server-authoritative**. The client never decides if a win is valid.

---

## Deployment

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import in Vercel
3. Set environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-server.onrender.com
   NEXT_PUBLIC_SOCKET_URL=https://your-server.onrender.com
   ```

### Backend → Render
1. Push `server/` to GitHub  
2. Create a **Web Service** in Render
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Set environment variables:
   ```
   PORT=10000
   MONGODB_URI=your_atlas_connection_string
   FRONTEND_URL=https://your-app.vercel.app
   AUTH_SECRET=your_secure_secret
   NODE_ENV=production
   ADMIN_EMAIL=your@email.com
   ```

### MongoDB → Atlas
1. Create free cluster at mongodb.com/atlas
2. Create database user
3. Whitelist all IPs (0.0.0.0/0) for Render
4. Copy connection string to both .env files

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens for auth (7-day expiry)
- All admin API routes verify `host`/`admin` role server-side
- All Socket.IO events verify token + role
- Number calls are server-authoritative (client can request, server decides)
- Win claims validated server-side (client's claim is re-verified)
- Duplicate claim prevention at DB level

---

## Ganapati Quiz Categories

1. Ganapati Basics
2. Ganesh Chaturthi Traditions
3. Maharashtra Culture
4. Modak & Festival Food
5. Ganapati History
6. Festival Knowledge

35+ questions included in seed data.

---

## Development Notes

- **Socket.IO singleton**: The frontend uses a singleton socket instance to prevent duplicate connections across page navigations.
- **Server-authoritative state**: MongoDB is the source of truth. Reconnecting clients call `request-game-state` to restore their view.
- **No Redis needed**: For 10–20 players in a single room, the in-memory approach in `socket.ts` (tracking online players per game) is sufficient. Add Redis + Socket.IO adapter if scaling to multiple server instances.
- **No real money**: Entry is free. No payment gateway, no prizes.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.IO, TypeScript |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| Realtime | Socket.IO |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

**Ganpati Bappa Morya! 🐘**
