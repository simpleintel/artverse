import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root — safe no-op if file doesn't exist (e.g. Cloud Run)
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const dotenv = await import('dotenv');
    dotenv.config({ path: envPath });
  }
} catch {}

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret-change-in-production';
}

// Health check must be registered before anything that could fail
app.get('/health', (_req, res) => res.status(200).send('ok'));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Lazy-load routes so env vars are available and any import error is caught
try {
  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: postRoutes } = await import('./routes/posts.js');
  const { default: userRoutes } = await import('./routes/users.js');
  const { default: commentRoutes } = await import('./routes/comments.js');
  const { default: generateRoutes } = await import('./routes/generate.js');
  const { default: agentRoutes } = await import('./routes/agent.js');
  const { default: billingRoutes } = await import('./routes/billing.js');

  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/generate', generateRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/billing', billingRoutes);
} catch (err) {
  console.error('FATAL: Failed to load routes:', err);
  app.use('/api', (_req, res) => res.status(500).json({ error: 'Server failed to initialize', details: err.message }));
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
  console.log(`ArtVerse server running on port ${PORT}`);
  console.log(`  NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`  JWT_SECRET=${process.env.JWT_SECRET ? 'set' : 'MISSING'}`);
  console.log(`  STRIPE_SECRET_KEY=${process.env.STRIPE_SECRET_KEY ? 'set' : 'not set'}`);
  console.log(`  REPLICATE_API_TOKEN=${process.env.REPLICATE_API_TOKEN ? 'set' : 'not set'}`);
});
