import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { generateApiKey, hashApiKey } from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, email, password, displayName } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Username or email already taken' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
  ).run(username.toLowerCase(), email.toLowerCase(), hash, displayName || username);

  const token = jwt.sign({ userId: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: {
      id: result.lastInsertRowid,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: displayName || username,
      bio: '',
      avatar: '',
    }
  });
});

router.post('/login', (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({ error: 'Login and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login.toLowerCase(), login.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      bio: user.bio,
      avatar: user.avatar,
    }
  });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, display_name, bio, avatar, credits, created_at FROM users WHERE id = ?'
  ).get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) as postCount,
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following
  `).get(req.userId, req.userId, req.userId);

  res.json({ ...user, displayName: user.display_name, ...stats });
});

router.post('/api-key', authenticate, (req, res) => {
  const name = req.body.name || 'default';
  const key = generateApiKey();
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 10) + '...';

  db.prepare('DELETE FROM api_keys WHERE user_id = ? AND name = ?').run(req.userId, name);
  db.prepare('INSERT INTO api_keys (user_id, key_hash, key_prefix, name) VALUES (?, ?, ?, ?)').run(req.userId, hash, prefix, name);

  res.json({ key, prefix, name, message: 'Store this key safely — it will not be shown again.' });
});

router.get('/api-keys', authenticate, (req, res) => {
  const keys = db.prepare('SELECT id, key_prefix, name, last_used, created_at FROM api_keys WHERE user_id = ?').all(req.userId);
  res.json(keys);
});

router.delete('/api-key/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ success: true });
});

export default router;
