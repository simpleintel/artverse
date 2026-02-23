import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (_req, file, cb) => cb(null, `avatar-${uuidv4()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = Router();

router.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const users = db.prepare(
    'SELECT id, username, display_name, avatar FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 20'
  ).all(`%${q}%`, `%${q}%`);
  res.json(users.map(u => ({ ...u, displayName: u.display_name })));
});

router.put('/profile/update', authenticate, avatarUpload.single('avatar'), (req, res) => {
  const { displayName, bio } = req.body;
  const updates = [];
  const params = [];

  if (displayName !== undefined) { updates.push('display_name = ?'); params.push(displayName); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (req.file) { updates.push('avatar = ?'); params.push(`/uploads/${req.file.filename}`); }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare('SELECT id, username, email, display_name, bio, avatar FROM users WHERE id = ?').get(req.userId);
  res.json({ ...user, displayName: user.display_name });
});

router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, avatar, created_at FROM users WHERE username = ?'
  ).get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) as postCount,
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) as followers,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following
  `).get(user.id, user.id, user.id);

  const isFollowing = req.userId
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.userId, user.id)
    : false;

  res.json({ ...user, displayName: user.display_name, ...stats, isFollowing });
});

router.get('/:username/posts', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const posts = db.prepare(`
    SELECT p.*, u.username, u.display_name, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
    FROM posts p JOIN users u ON p.user_id = u.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.userId || 0, user.id);

  res.json(posts.map(p => ({
    id: p.id, caption: p.caption, mediaUrl: p.media_url, mediaType: p.media_type,
    aiModel: p.ai_model, aiPrompt: p.ai_prompt, createdAt: p.created_at,
    likeCount: p.likeCount, commentCount: p.commentCount, isLiked: (p.isLiked || 0) > 0,
    user: { id: p.user_id, username: p.username, displayName: p.display_name, avatar: p.avatar }
  })));
});

router.post('/:username/follow', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.userId, target.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.userId, target.id);
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.userId, target.id);
  }

  const followers = db.prepare('SELECT COUNT(*) as count FROM follows WHERE following_id = ?').get(target.id).count;
  res.json({ following: !existing, followers });
});

export default router;
