import { Router } from 'express';
import Replicate from 'replicate';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';
import { GENERATION_COSTS } from './billing.js';

const router = Router();

function checkAndDeductCredits(userId, type) {
  const cost = GENERATION_COSTS[type] || 1;
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
  if (!user || user.credits < cost) {
    return { ok: false, credits: user?.credits || 0, cost };
  }
  db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(cost, userId);
  db.prepare('INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
    .run(userId, -cost, 'usage', `${type} generation`);
  return { ok: true, credits: user.credits - cost, cost };
}

router.post('/image', authenticate, async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const deduct = checkAndDeductCredits(req.userId, 'image');
  if (!deduct.ok) {
    return res.status(402).json({ error: 'Not enough credits', credits: deduct.credits, cost: deduct.cost });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(503).json({ error: 'Replicate API token not configured.' });
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const modelId = model || 'black-forest-labs/flux-schnell';
    const output = await replicate.run(modelId, { input: { prompt, num_outputs: 1 } });
    const imageUrl = Array.isArray(output) ? output[0] : output;
    res.json({ url: typeof imageUrl === 'object' ? imageUrl.url() : imageUrl, model: modelId, prompt, creditsRemaining: deduct.credits });
  } catch (err) {
    console.error('Image generation error:', err);
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(deduct.cost, req.userId);
    db.prepare('INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
      .run(req.userId, deduct.cost, 'refund', 'Image generation failed – refund');
    res.status(500).json({ error: err.message || 'Failed to generate image' });
  }
});

router.post('/video', authenticate, async (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const deduct = checkAndDeductCredits(req.userId, 'video');
  if (!deduct.ok) {
    return res.status(402).json({ error: 'Not enough credits', credits: deduct.credits, cost: deduct.cost });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(503).json({ error: 'Replicate API token not configured.' });
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const modelId = model || 'alibaba-pai/wan2.1-t2v-14b';
    const output = await replicate.run(modelId, { input: { prompt } });
    const videoUrl = Array.isArray(output) ? output[0] : output;
    res.json({ url: typeof videoUrl === 'object' ? videoUrl.url() : videoUrl, model: modelId, prompt, creditsRemaining: deduct.credits });
  } catch (err) {
    console.error('Video generation error:', err);
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(deduct.cost, req.userId);
    db.prepare('INSERT INTO credit_transactions (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
      .run(req.userId, deduct.cost, 'refund', 'Video generation failed – refund');
    res.status(500).json({ error: err.message || 'Failed to generate video' });
  }
});

router.get('/models', (_req, res) => {
  res.json({
    image: [
      { id: 'black-forest-labs/flux-schnell', name: 'Flux Schnell', description: 'Fast, high quality', speed: 'Fast' },
      { id: 'black-forest-labs/flux-dev', name: 'Flux Dev', description: 'Higher quality, slower', speed: 'Medium' },
      { id: 'stability-ai/sdxl', name: 'Stable Diffusion XL', description: 'Classic SD model', speed: 'Medium' }
    ],
    video: [
      { id: 'alibaba-pai/wan2.1-t2v-14b', name: 'Wan 2.1', description: 'Text to video', speed: 'Slow' },
      { id: 'minimax/video-01', name: 'MiniMax Video', description: 'High quality video', speed: 'Medium' }
    ]
  });
});

export default router;
