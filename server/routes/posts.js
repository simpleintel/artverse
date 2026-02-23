import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    cb(null, ok);
  }
});

const router = Router();

function formatPost(p, userId = 0) {
  return {
    id: p.id,
    caption: p.caption,
    mediaUrl: p.media_url,
    mediaType: p.media_type,
    aiModel: p.ai_model,
    aiPrompt: p.ai_prompt,
    createdAt: p.created_at,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    isLiked: (p.isLiked || 0) > 0,
    user: {
      id: p.user_id,
      username: p.username,
      displayName: p.display_name,
      avatar: p.avatar
    }
  };
}

const POST_SELECT = `
  SELECT p.*, u.username, u.display_name, u.avatar,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likeCount,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as commentCount,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as isLiked
  FROM posts p
  JOIN users u ON p.user_id = u.id
`;

router.post('/', authenticate, upload.single('media'), (req, res) => {
  const { caption, aiModel, aiPrompt, mediaUrl, mediaType } = req.body;

  let finalUrl, finalType;
  if (req.file) {
    finalUrl = `/uploads/${req.file.filename}`;
    finalType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  } else if (mediaUrl) {
    finalUrl = mediaUrl;
    finalType = mediaType || 'image';
  } else {
    return res.status(400).json({ error: 'Media file or URL is required' });
  }

  const result = db.prepare(
    'INSERT INTO posts (user_id, caption, media_url, media_type, ai_model, ai_prompt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.userId, caption || '', finalUrl, finalType, aiModel || '', aiPrompt || '');

  const post = db.prepare(POST_SELECT + ' WHERE p.id = ?').get(req.userId, result.lastInsertRowid);
  res.status(201).json(formatPost(post, req.userId));
});

router.get('/feed', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const posts = db.prepare(
    POST_SELECT +
    ` WHERE p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
  ).all(req.userId, req.userId, req.userId, limit, offset);

  res.json(posts.map(p => formatPost(p, req.userId)));
});

router.get('/explore', optionalAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 30;
  const offset = (page - 1) * limit;

  const posts = db.prepare(
    POST_SELECT + ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?'
  ).all(req.userId || 0, limit, offset);

  res.json(posts.map(p => formatPost(p, req.userId)));
});

router.get('/:id', optionalAuth, (req, res) => {
  const post = db.prepare(POST_SELECT + ' WHERE p.id = ?').get(req.userId || 0, req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(formatPost(post, req.userId));
});

router.post('/:id/like', authenticate, (req, res) => {
  const postId = req.params.id;
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.userId, postId);

  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.userId, postId);
  } else {
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.userId, postId);
  }

  const likeCount = db.prepare('SELECT COUNT(*) as count FROM likes WHERE post_id = ?').get(postId).count;
  res.json({ liked: !existing, likeCount });
});

router.delete('/:id', authenticate, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Post not found or unauthorized' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
