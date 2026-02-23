import { Router } from 'express';
import Stripe from 'stripe';
import db from '../database.js';
import { authenticate } from '../middleware/auth.js';

let _stripe;
function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const CREDIT_PACKS = [
  { id: 'starter', credits: 50, price_cents: 499, label: '50 credits', description: 'Starter Pack' },
  { id: 'popular', credits: 200, price_cents: 1499, label: '200 credits', description: 'Popular Pack' },
  { id: 'pro', credits: 500, price_cents: 2999, label: '500 credits', description: 'Pro Pack' },
];

const GENERATION_COSTS = { image: 1, video: 5 };

const TIP_AMOUNTS = [
  { id: 'tip_2', amount_cents: 200, label: '$2' },
  { id: 'tip_5', amount_cents: 500, label: '$5' },
  { id: 'tip_10', amount_cents: 1000, label: '$10' },
  { id: 'tip_25', amount_cents: 2500, label: '$25' },
];

const router = Router();

router.get('/credits', authenticate, (req, res) => {
  const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.userId);
  res.json({ credits: user?.credits || 0, costs: GENERATION_COSTS });
});

router.get('/packs', (_req, res) => {
  res.json({ packs: CREDIT_PACKS, tips: TIP_AMOUNTS });
});

router.post('/checkout/credits', authenticate, async (req, res) => {
  const { packId } = req.body;
  const pack = CREDIT_PACKS.find(p => p.id === packId);
  if (!pack) return res.status(400).json({ error: 'Invalid pack' });

  const user = db.prepare('SELECT email, stripe_customer_id FROM users WHERE id = ?').get(req.userId);

  try {
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({ email: user.email, metadata: { userId: req.userId.toString() } });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, req.userId);
    }

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Nova ${pack.description}`, description: `${pack.credits} generation credits` },
          unit_amount: pack.price_cents,
        },
        quantity: 1,
      }],
      metadata: { userId: req.userId.toString(), type: 'credits', packId: pack.id, credits: pack.credits.toString() },
      success_url: `${CLIENT_URL}/profile/${db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId).username}?purchase=success`,
      cancel_url: `${CLIENT_URL}?purchase=cancelled`,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/checkout/tip', authenticate, async (req, res) => {
  const { artistUsername, amountId, customAmount, message } = req.body;

  const artist = db.prepare('SELECT id, username, email, display_name FROM users WHERE username = ?').get(artistUsername);
  if (!artist) return res.status(404).json({ error: 'Artist not found' });
  if (artist.id === req.userId) return res.status(400).json({ error: 'Cannot tip yourself' });

  let amountCents;
  if (customAmount) {
    amountCents = Math.round(parseFloat(customAmount) * 100);
    if (amountCents < 100 || amountCents > 50000) return res.status(400).json({ error: 'Tip must be between $1 and $500' });
  } else {
    const tipOption = TIP_AMOUNTS.find(t => t.id === amountId);
    if (!tipOption) return res.status(400).json({ error: 'Invalid tip amount' });
    amountCents = tipOption.amount_cents;
  }

  const user = db.prepare('SELECT email, stripe_customer_id FROM users WHERE id = ?').get(req.userId);

  try {
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({ email: user.email, metadata: { userId: req.userId.toString() } });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, req.userId);
    }

    const tipRecord = db.prepare(
      'INSERT INTO tips (tipper_id, artist_id, amount_cents, message) VALUES (?, ?, ?, ?)'
    ).run(req.userId, artist.id, amountCents, message || '');

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tip for @${artist.username}`,
            description: message ? `"${message.substring(0, 100)}"` : `Support ${artist.display_name || artist.username}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      metadata: { userId: req.userId.toString(), type: 'tip', artistId: artist.id.toString(), tipId: tipRecord.lastInsertRowid.toString() },
      success_url: `${CLIENT_URL}/profile/${artist.username}?tip=success`,
      cancel_url: `${CLIENT_URL}/profile/${artist.username}?tip=cancelled`,
    });

    db.prepare('UPDATE tips SET stripe_session_id = ? WHERE id = ?').run(session.id, tipRecord.lastInsertRowid);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe tip error:', err);
    res.status(500).json({ error: 'Failed to create tip session' });
  }
});

router.get('/tips-received/:username', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const total = db.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) as total FROM tips WHERE artist_id = ? AND status = 'completed'"
  ).get(user.id);
  const count = db.prepare(
    "SELECT COUNT(*) as count FROM tips WHERE artist_id = ? AND status = 'completed'"
  ).get(user.id);

  res.json({ totalCents: total.total, count: count.count });
});

router.post('/verify-session', authenticate, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.json({ status: 'unpaid' });
    }

    const { type } = session.metadata;

    if (type === 'credits') {
      const credits = parseInt(session.metadata.credits);
      const existing = db.prepare('SELECT id FROM credit_transactions WHERE stripe_session_id = ?').get(session.id);
      if (!existing) {
        const userId = parseInt(session.metadata.userId);
        db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(credits, userId);
        db.prepare('INSERT INTO credit_transactions (user_id, amount, type, description, stripe_session_id) VALUES (?, ?, ?, ?, ?)')
          .run(userId, credits, 'purchase', `Purchased ${credits} credits`, session.id);
      }
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(req.userId);
      return res.json({ status: 'paid', type: 'credits', credits: user.credits });
    }

    if (type === 'tip') {
      const tipId = parseInt(session.metadata.tipId);
      db.prepare("UPDATE tips SET status = 'completed', stripe_session_id = ? WHERE id = ?").run(session.id, tipId);
      return res.json({ status: 'paid', type: 'tip' });
    }

    res.json({ status: 'paid' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

router.get('/history', authenticate, (req, res) => {
  const transactions = db.prepare(
    'SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.userId);
  res.json(transactions);
});

// ─── Stripe Connect: Creator Payouts ────────────────────────────

const PLATFORM_FEE_PERCENT = 10;

router.get('/connect/status', authenticate, (req, res) => {
  const user = db.prepare('SELECT stripe_connect_id, stripe_connect_onboarded FROM users WHERE id = ?').get(req.userId);
  res.json({
    connectId: user.stripe_connect_id || null,
    onboarded: !!user.stripe_connect_onboarded,
  });
});

router.post('/connect/onboard', authenticate, async (req, res) => {
  const user = db.prepare('SELECT email, username, stripe_connect_id FROM users WHERE id = ?').get(req.userId);

  try {
    let connectId = user.stripe_connect_id;

    if (!connectId) {
      const account = await getStripe().accounts.create({
        type: 'express',
        email: user.email,
        metadata: { userId: req.userId.toString(), username: user.username },
        capabilities: { transfers: { requested: true } },
      });
      connectId = account.id;
      db.prepare('UPDATE users SET stripe_connect_id = ? WHERE id = ?').run(connectId, req.userId);
    }

    const link = await getStripe().accountLinks.create({
      account: connectId,
      refresh_url: `${CLIENT_URL}/profile/${user.username}?connect=refresh`,
      return_url: `${CLIENT_URL}/profile/${user.username}?connect=complete`,
      type: 'account_onboarding',
    });

    res.json({ url: link.url });
  } catch (err) {
    console.error('Connect onboarding error:', err);
    res.status(500).json({ error: 'Failed to start onboarding' });
  }
});

router.post('/connect/verify', authenticate, async (req, res) => {
  const user = db.prepare('SELECT stripe_connect_id FROM users WHERE id = ?').get(req.userId);
  if (!user.stripe_connect_id) return res.json({ onboarded: false });

  try {
    const account = await getStripe().accounts.retrieve(user.stripe_connect_id);
    const ready = account.charges_enabled && account.payouts_enabled;
    if (ready) {
      db.prepare('UPDATE users SET stripe_connect_onboarded = 1 WHERE id = ?').run(req.userId);
    }
    res.json({ onboarded: ready, details_submitted: account.details_submitted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify account' });
  }
});

router.get('/earnings', authenticate, (req, res) => {
  const totalTips = db.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) as total FROM tips WHERE artist_id = ? AND status = 'completed'"
  ).get(req.userId);

  const totalWithdrawn = db.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) as total FROM withdrawals WHERE user_id = ? AND status IN ('processing', 'completed')"
  ).get(req.userId);

  const pendingWithdrawals = db.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) as total FROM withdrawals WHERE user_id = ? AND status = 'pending'"
  ).get(req.userId);

  const totalEarned = totalTips.total;
  const withdrawn = totalWithdrawn.total;
  const pending = pendingWithdrawals.total;
  const available = totalEarned - withdrawn - pending;

  const recentTips = db.prepare(`
    SELECT t.amount_cents, t.message, t.created_at, u.username as tipper_username, u.display_name as tipper_name
    FROM tips t JOIN users u ON t.tipper_id = u.id
    WHERE t.artist_id = ? AND t.status = 'completed'
    ORDER BY t.created_at DESC LIMIT 20
  `).all(req.userId);

  const withdrawals = db.prepare(
    'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.userId);

  res.json({
    totalEarnedCents: totalEarned,
    withdrawnCents: withdrawn,
    pendingCents: pending,
    availableCents: available,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    recentTips,
    withdrawals,
  });
});

router.post('/withdraw', authenticate, async (req, res) => {
  const user = db.prepare('SELECT stripe_connect_id, stripe_connect_onboarded FROM users WHERE id = ?').get(req.userId);

  if (!user.stripe_connect_id || !user.stripe_connect_onboarded) {
    return res.status(400).json({ error: 'Set up payouts first by connecting your Stripe account' });
  }

  const totalTips = db.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) as total FROM tips WHERE artist_id = ? AND status = 'completed'"
  ).get(req.userId);
  const totalWithdrawn = db.prepare(
    "SELECT COALESCE(SUM(amount_cents), 0) as total FROM withdrawals WHERE user_id = ? AND status IN ('pending', 'processing', 'completed')"
  ).get(req.userId);

  const available = totalTips.total - totalWithdrawn.total;
  if (available < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal is $1.00', availableCents: available });
  }

  const requestedCents = req.body.amountCents ? Math.min(parseInt(req.body.amountCents), available) : available;
  if (requestedCents < 100) {
    return res.status(400).json({ error: 'Minimum withdrawal is $1.00' });
  }

  const feeCents = Math.round(requestedCents * PLATFORM_FEE_PERCENT / 100);
  const netCents = requestedCents - feeCents;

  try {
    const withdrawal = db.prepare(
      'INSERT INTO withdrawals (user_id, amount_cents, platform_fee_cents, net_amount_cents, status) VALUES (?, ?, ?, ?, ?)'
    ).run(req.userId, requestedCents, feeCents, netCents, 'processing');

    const transfer = await getStripe().transfers.create({
      amount: netCents,
      currency: 'usd',
      destination: user.stripe_connect_id,
      metadata: { userId: req.userId.toString(), withdrawalId: withdrawal.lastInsertRowid.toString() },
    });

    db.prepare("UPDATE withdrawals SET stripe_transfer_id = ?, status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(transfer.id, withdrawal.lastInsertRowid);

    res.json({
      success: true,
      grossCents: requestedCents,
      feeCents,
      netCents,
      transferId: transfer.id,
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    db.prepare("UPDATE withdrawals SET status = 'failed' WHERE user_id = ? AND status = 'processing'").run(req.userId);
    res.status(500).json({ error: err.message || 'Withdrawal failed. Please try again.' });
  }
});

router.get('/connect/dashboard', authenticate, async (req, res) => {
  const user = db.prepare('SELECT stripe_connect_id FROM users WHERE id = ?').get(req.userId);
  if (!user.stripe_connect_id) return res.status(400).json({ error: 'No connected account' });

  try {
    const link = await getStripe().accounts.createLoginLink(user.stripe_connect_id);
    res.json({ url: link.url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate dashboard link' });
  }
});

export { GENERATION_COSTS };
export default router;
