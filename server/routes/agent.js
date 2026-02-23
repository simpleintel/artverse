import { Router } from 'express';
import Replicate from 'replicate';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/create', authenticate, async (req, res) => {
  const { mediaUrl, mediaType, caption, aiModel, aiPrompt } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({ error: 'mediaUrl is required' });
  }
  if (!['image', 'video'].includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be "image" or "video"' });
  }

  const result = db.prepare(
    'INSERT INTO posts (user_id, caption, media_url, media_type, ai_model, ai_prompt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.userId, caption || '', mediaUrl, mediaType, aiModel || '', aiPrompt || '');

  res.status(201).json({
    id: result.lastInsertRowid,
    message: 'Creation posted successfully',
    url: `/api/posts/${result.lastInsertRowid}`
  });
});

router.post('/generate-and-post', authenticate, async (req, res) => {
  const { prompt, model, type = 'image', caption } = req.body;

  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(503).json({ error: 'Replicate API token not configured on server' });
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const modelId = model || (type === 'video' ? 'alibaba-pai/wan2.1-t2v-14b' : 'black-forest-labs/flux-schnell');

    const output = await replicate.run(modelId, {
      input: type === 'video' ? { prompt } : { prompt, num_outputs: 1 }
    });

    const mediaUrl = Array.isArray(output) ? output[0] : output;
    const finalUrl = typeof mediaUrl === 'object' && mediaUrl.url ? mediaUrl.url() : mediaUrl;

    const result = db.prepare(
      'INSERT INTO posts (user_id, caption, media_url, media_type, ai_model, ai_prompt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.userId, caption || '', finalUrl, type, modelId, prompt);

    res.status(201).json({
      id: result.lastInsertRowid,
      mediaUrl: finalUrl,
      mediaType: type,
      model: modelId,
      prompt,
      message: 'Generated and posted successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, avatar, created_at FROM users WHERE id = ?'
  ).get(req.userId);

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ?) as creations,
      (SELECT COUNT(*) FROM follows WHERE following_id = ?) as collectors,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as collecting,
      (SELECT COUNT(*) FROM posts WHERE user_id = ? AND ai_model != '') as aiCreations
  `).get(req.userId, req.userId, req.userId, req.userId);

  res.json({ ...user, displayName: user.display_name, ...stats });
});

router.get('/creations', authenticate, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;

  const posts = db.prepare(`
    SELECT id, caption, media_url as mediaUrl, media_type as mediaType,
           ai_model as aiModel, ai_prompt as aiPrompt, created_at as createdAt,
           (SELECT COUNT(*) FROM likes WHERE post_id = posts.id) as likeCount,
           (SELECT COUNT(*) FROM comments WHERE post_id = posts.id) as commentCount
    FROM posts WHERE user_id = ?
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(req.userId, limit, offset);

  res.json({ creations: posts, limit, offset });
});

router.delete('/creations/:id', authenticate, (req, res) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!post) return res.status(404).json({ error: 'Creation not found' });
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Creation deleted' });
});

router.post('/like/:postId', authenticate, (req, res) => {
  const existing = db.prepare('SELECT id FROM likes WHERE user_id = ? AND post_id = ?').get(req.userId, req.params.postId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE user_id = ? AND post_id = ?').run(req.userId, req.params.postId);
  } else {
    db.prepare('INSERT INTO likes (user_id, post_id) VALUES (?, ?)').run(req.userId, req.params.postId);
  }
  const count = db.prepare('SELECT COUNT(*) as c FROM likes WHERE post_id = ?').get(req.params.postId).c;
  res.json({ liked: !existing, likeCount: count });
});

router.post('/comment/:postId', authenticate, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });
  const result = db.prepare('INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)').run(req.userId, req.params.postId, text.trim());
  res.status(201).json({ id: result.lastInsertRowid, text: text.trim(), message: 'Comment added' });
});

router.post('/follow/:username', authenticate, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.userId, target.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.userId, target.id);
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.userId, target.id);
  }
  res.json({ collecting: !existing });
});

export default router;
