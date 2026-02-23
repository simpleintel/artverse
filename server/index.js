import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env if it exists (not present on Cloud Run — env vars injected by runtime)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const dotenv = await import('dotenv');
  dotenv.default.config({ path: envPath });
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret-change-in-production';
}

const app = express();
const PORT = process.env.PORT || 3001;

// Health check — registered first so Cloud Run probe passes even if routes fail
app.get('/health', (_req, res) => res.status(200).send('ok'));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
const uploadsDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Load routes — wrapped in try/catch so the server still starts on failure
try {
  const [auth, posts, users, comments, generate, agent, billing, caption] = await Promise.all([
    import('./routes/auth.js'),
    import('./routes/posts.js'),
    import('./routes/users.js'),
    import('./routes/comments.js'),
    import('./routes/generate.js'),
    import('./routes/agent.js'),
    import('./routes/billing.js'),
    import('./routes/caption.js'),
  ]);

  app.use('/api/auth', auth.default);
  app.use('/api/posts', posts.default);
  app.use('/api/users', users.default);
  app.use('/api/comments', comments.default);
  app.use('/api/generate', generate.default);
  app.use('/api/agent', agent.default);
  app.use('/api/caption', caption.default);
  app.use('/api/billing', billing.default);

  console.log('All routes loaded successfully');
} catch (err) {
  console.error('FATAL: Failed to load routes:', err.message);
  console.error(err.stack);
  app.use('/api', (_req, res) => res.status(500).json({ error: 'Server initialization failed', details: err.message }));
}

app.get('/api/docs', (_req, res) => {
  try {
    const md = fs.readFileSync(path.join(__dirname, '..', 'API_DOCS.md'), 'utf-8');
    res.type('text/plain').send(md);
  } catch { res.status(404).json({ error: 'Docs not found' }); }
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nova server listening on port ${PORT}`);
  console.log(`  NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`  JWT_SECRET=${process.env.JWT_SECRET ? 'set' : 'MISSING'}`);
  console.log(`  STRIPE=${process.env.STRIPE_SECRET_KEY ? 'set' : '-'}`);
  console.log(`  REPLICATE=${process.env.REPLICATE_API_TOKEN ? 'set' : '-'}`);
});
