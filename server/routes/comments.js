import { Router } from 'express';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:postId', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.postId);

  res.json(comments.map(c => ({
    id: c.id, text: c.text, createdAt: c.created_at,
    user: { id: c.user_id, username: c.username, displayName: c.display_name, avatar: c.avatar }
  })));
});

router.post('/:postId', authenticate, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required' });

  const result = db.prepare(
    'INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)'
  ).run(req.userId, req.params.postId, text.trim());

  const comment = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    id: comment.id, text: comment.text, createdAt: comment.created_at,
    user: { id: comment.user_id, username: comment.username, displayName: comment.display_name, avatar: comment.avatar }
  });
});

router.delete('/:id', authenticate, (req, res) => {
  const comment = db.prepare('SELECT id FROM comments WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!comment) return res.status(404).json({ error: 'Comment not found or unauthorized' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
