import { Router } from 'express';
import OpenAI from 'openai';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const MONTHLY_LIMIT = 100;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getMonthlyUsage(userId) {
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM caption_usage WHERE user_id = ? AND created_at >= ?"
  ).get(userId, firstOfMonth.toISOString());
  return row?.count || 0;
}

function recordUsage(userId) {
  db.prepare('INSERT INTO caption_usage (user_id) VALUES (?)').run(userId);
}

router.get('/status', authenticate, (req, res) => {
  const used = getMonthlyUsage(req.userId);
  res.json({
    subscribed: true,
    usage: { used, limit: MONTHLY_LIMIT, remaining: Math.max(0, MONTHLY_LIMIT - used) },
  });
});

router.post('/generate', authenticate, async (req, res) => {
  const used = getMonthlyUsage(req.userId);
  if (used >= MONTHLY_LIMIT) {
    return res.status(429).json({
      error: `Monthly limit reached (${MONTHLY_LIMIT}/${MONTHLY_LIMIT})`,
      limitReached: true,
      message: `You've used all ${MONTHLY_LIMIT} AI captions this month — resets on the 1st. You can always write your own captions for free.`,
    });
  }

  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'Image URL is required' });

  try {
    const openai = getOpenAI();

    let imageContent;
    if (imageUrl.startsWith('/uploads/')) {
      const baseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3001}`;
      imageContent = { type: 'image_url', image_url: { url: `${baseUrl}${imageUrl}` } };
    } else {
      imageContent = { type: 'image_url', image_url: { url: imageUrl } };
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a creative art curator for an AI art platform called "View of Nova". Generate a poetic, evocative title and description for the artwork. The title should be 3-8 words. The description should be 1-3 sentences capturing the mood, style, and essence. Respond in JSON: {"title": "...", "description": "..."}'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Generate a title and description for this artwork:' },
            imageContent,
          ],
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    recordUsage(req.userId);

    const result = JSON.parse(completion.choices[0].message.content);
    const remaining = MONTHLY_LIMIT - used - 1;
    res.json({ title: result.title || '', description: result.description || '', usage: { used: used + 1, limit: MONTHLY_LIMIT, remaining } });
  } catch (err) {
    console.error('Caption generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate caption' });
  }
});

export default router;
