import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import commentRoutes from './routes/comments.js';
import generateRoutes from './routes/generate.js';
import agentRoutes from './routes/agent.js';
import billingRoutes from './routes/billing.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret-change-in-production';
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/billing', billingRoutes);

import fs from 'fs';
app.get('/api/docs', (_req, res) => {
  try {
    const md = fs.readFileSync(path.join(__dirname, '..', 'API_DOCS.md'), 'utf-8');
    res.type('text/plain').send(md);
  } catch { res.status(404).json({ error: 'Docs not found' }); }
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`ArtVerse server running on port ${PORT}`));
