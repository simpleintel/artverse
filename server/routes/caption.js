import { Router } from 'express';
import OpenAI from 'openai';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const NOVA_AI_PRICE = 499; // $4.99/mo in cents
const MONTHLY_LIMIT = 100;
const NOVA_AI_PRICE_ID_KEY = 'STRIPE_NOVA_PRICE_ID';

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function hasActiveSubscription(userId) {
  const user = db.prepare('SELECT caption_sub_status, caption_sub_end FROM users WHERE id = ?').get(userId);
  if (!user) return false;
  if (user.caption_sub_status === 'active') return true;
  if (user.caption_sub_status === 'cancelled' && user.caption_sub_end) {
    return new Date(user.caption_sub_end) > new Date();
  }
  return false;
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
  const user = db.prepare('SELECT caption_sub_status, caption_sub_end FROM users WHERE id = ?').get(req.userId);
  const active = hasActiveSubscription(req.userId);
  const used = active ? getMonthlyUsage(req.userId) : 0;
  res.json({
    subscribed: active,
    status: user?.caption_sub_status || 'none',
    endsAt: user?.caption_sub_end || null,
    usage: { used, limit: MONTHLY_LIMIT, remaining: Math.max(0, MONTHLY_LIMIT - used) },
    price: { amount: NOVA_AI_PRICE, currency: 'usd', label: '$4.99/mo' },
  });
});

router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const stripe = await getStripeInstance();
    const user = db.prepare('SELECT email, stripe_customer_id FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(req.userId) } });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, req.userId);
    }

    let priceId = process.env[NOVA_AI_PRICE_ID_KEY];
    if (!priceId) {
      const product = await stripe.products.create({
        name: 'Nova AI — Caption Generator',
        description: `Up to ${MONTHLY_LIMIT} AI-generated titles & descriptions per month. This is only for AI captioning — writing your own captions is always free.`,
      });
      const price = await stripe.prices.create({ product: product.id, unit_amount: NOVA_AI_PRICE, currency: 'usd', recurring: { interval: 'month' } });
      priceId = price.id;
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${clientUrl}/profile/${req.body.username || 'me'}?caption_sub=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/profile/${req.body.username || 'me'}?caption_sub=cancelled`,
      metadata: { userId: String(req.userId), type: 'nova_ai' },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Caption subscribe error:', err.message);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

router.post('/verify-subscription', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    const stripe = await getStripeInstance();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    if (session.metadata?.type === 'nova_ai' && session.subscription) {
      const sub = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

      db.prepare('UPDATE users SET caption_sub_id = ?, caption_sub_status = ?, caption_sub_end = ? WHERE id = ?')
        .run(sub.id, sub.status === 'active' ? 'active' : 'none', new Date(sub.current_period_end * 1000).toISOString(), req.userId);

      return res.json({ subscribed: true, status: 'active' });
    }
    res.json({ subscribed: false });
  } catch (err) {
    console.error('Verify sub error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/cancel', authenticate, async (req, res) => {
  try {
    const user = db.prepare('SELECT caption_sub_id FROM users WHERE id = ?').get(req.userId);
    if (!user?.caption_sub_id) return res.status(400).json({ error: 'No active subscription' });

    const stripe = await getStripeInstance();
    await stripe.subscriptions.update(user.caption_sub_id, { cancel_at_period_end: true });
    const sub = await stripe.subscriptions.retrieve(user.caption_sub_id);

    db.prepare('UPDATE users SET caption_sub_status = ?, caption_sub_end = ? WHERE id = ?')
      .run('cancelled', new Date(sub.current_period_end * 1000).toISOString(), req.userId);

    res.json({ status: 'cancelled', endsAt: new Date(sub.current_period_end * 1000).toISOString() });
  } catch (err) {
    console.error('Cancel sub error:', err.message);
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

router.post('/generate', authenticate, async (req, res) => {
  if (!hasActiveSubscription(req.userId)) {
    return res.status(403).json({
      error: 'Nova AI subscription required',
      subscriptionRequired: true,
      message: `Nova AI lets you auto-generate titles & descriptions using OpenAI — up to ${MONTHLY_LIMIT}/month for $4.99. This small fee covers the cost we pay OpenAI each time it reads your art. Writing your own captions is always free.`,
    });
  }

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

async function getStripeInstance() {
  const Stripe = (await import('stripe')).default;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export default router;
