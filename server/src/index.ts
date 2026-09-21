import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import housieRoutes from './routes/housie';
import quizRoutes from './routes/quiz';
import quizzesRoutes from './routes/quizzes';
import leaderboardRoutes from './routes/leaderboard';
import { initSocket } from './socket';

import { Aarti } from './models/index';
import { VERIFIED_AARTIS } from './data/verifiedAartis';

const PORT = parseInt(process.env.PORT || '10000', 10);
const MONGODB_URI = process.env.MONGODB_URI || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function ensureAartisSeeded() {
  try {
    const count = await Aarti.countDocuments();
    if (count === 0) {
      console.log('[DB] Aarti collection is empty. Auto-seeding verified Aartis...');
      await Aarti.insertMany(VERIFIED_AARTIS);
      console.log(`[DB] Successfully auto-seeded ${VERIFIED_AARTIS.length} verified Aartis into MongoDB!`);
    } else {
      console.log(`[DB] Found ${count} verified Aartis in MongoDB.`);
    }
  } catch (err) {
    console.error('[DB] Failed to check/seed Aartis:', err);
  }
}

async function main() {
  // ─── MongoDB ───────────────────────────────────────────────────────────────
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { dbName: 'bappaverse' });
  console.log('[DB] Connected to MongoDB Atlas');
  await ensureAartisSeeded();

  // ─── Express ──────────────────────────────────────────────────────────────
  const app = express();

  // Allow all Vercel domains (*.vercel.app), localhost, and custom frontend URLs
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        // Allow requests with no origin or any frontend client (Vercel, localhost, etc.)
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/housie', housieRoutes);
  app.use('/api/quiz', quizRoutes);
  app.use('/api/quizzes', quizzesRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);

  // ─── HTTP + Socket.IO ─────────────────────────────────────────────────────
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  app.set('io', io);
  initSocket(io);

  httpServer.listen(PORT, () => {
    console.log(`[Server] BappaVerse server running on port ${PORT}`);
    console.log(`[Server] Accepting connections from: ${FRONTEND_URL}`);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
