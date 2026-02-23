import jwt from 'jsonwebtoken';
import db from '../database.js';
import { hashApiKey } from '../database.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  // Try JWT first (Bearer token)
  if (header?.startsWith('Bearer ')) {
    try {
      req.userId = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET).userId;
      req.authMethod = 'jwt';
      return next();
    } catch {}
  }

  // Try API key (av_ prefix)
  const apiKey = header?.replace('Bearer ', '') || req.headers['x-api-key'];
  if (apiKey?.startsWith('av_')) {
    const hash = hashApiKey(apiKey);
    const row = db.prepare('SELECT user_id FROM api_keys WHERE key_hash = ?').get(hash);
    if (row) {
      req.userId = row.user_id;
      req.authMethod = 'api_key';
      db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key_hash = ?').run(hash);
      return next();
    }
  }

  return res.status(401).json({ error: 'Authentication required. Use Bearer <jwt> or x-api-key: av_...' });
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.userId = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET).userId;
    } catch {}
  }
  const apiKey = req.headers['x-api-key'];
  if (!req.userId && apiKey?.startsWith('av_')) {
    const hash = hashApiKey(apiKey);
    const row = db.prepare('SELECT user_id FROM api_keys WHERE key_hash = ?').get(hash);
    if (row) req.userId = row.user_id;
  }
  next();
}
