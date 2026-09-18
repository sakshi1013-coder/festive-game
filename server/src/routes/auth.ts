import express, { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index';
import { signToken } from '../middleware/auth';

const router: Router = express.Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailLower = email.toLowerCase().trim();
    const usernameLower = username.toLowerCase().trim();

    const existingEmail = await User.findOne({ email: emailLower });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ username: usernameLower });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Auto-assign host role for admin or platform owner
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || 'admin@bappaverse.com';
    const isHostRole =
      emailLower === adminEmail ||
      emailLower.includes('sakshi') ||
      emailLower.includes('admin');
    const role = isHostRole ? 'host' : 'player';

    const user = await User.create({
      name: name.trim(),
      username: usernameLower,
      email: emailLower,
      passwordHash,
      role,
    });

    const token = signToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailClean = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailClean });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Auto-upgrade platform owner or admin to host role if needed
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() || 'admin@bappaverse.com';
    if (
      emailClean === adminEmail ||
      emailClean.includes('sakshi') ||
      emailClean.includes('admin')
    ) {
      if (user.role !== 'host') {
        user.role = 'host';
        await user.save();
      }
    }

    const token = signToken({
      userId: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        totalWins: user.totalWins,
        totalGamesPlayed: user.totalGamesPlayed,
        totalPoints: user.totalPoints,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/players
router.get('/players', async (_req: Request, res: Response) => {
  try {
    const players = await User.find()
      .select('name username email role totalWins totalLosses totalGamesPlayed totalPoints createdAt')
      .sort({ createdAt: -1 });
    return res.json({ players });
  } catch (err) {
    console.error('Fetch players error:', err);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
});

export default router;

