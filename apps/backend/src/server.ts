// apps/backend/src/server.ts
import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';

import searchRoutes from './routes/search.routes';
import itemsRoutes from './routes/itemsRoutes';
import fieldsRoutes from './routes/fieldsRoutes';
import customIdRoutes from './routes/customIdRoutes';
import membersRoutes from './routes/membersRoutes';
import commentsRoutes from './routes/commentsRoutes';
import likesRoutes from './routes/likesRoutes';
import { initFTS } from './search/pgFullText';

import './auth/strategies.js';
import authRoutes from './routes/authRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statsRoutes from './routes/statsRoutes.js';

import studioRoutes from './routes/studioRoutes.js';
import requireAuth from './middleware/requireAuth.js';

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const API_PREFIX = process.env.API_PREFIX || '/api';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || '').replace(/\/+$/, '');
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL?.replace(/\/+$/, '');
const NETLIFY_URL = process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '')}` : undefined;

app.set('trust proxy', 1);

/* ----------------------------- CORS ----------------------------- */
const allowlist = new Set<string>([
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
if (FRONTEND_ORIGIN) allowlist.add(FRONTEND_ORIGIN);
if (RENDER_EXTERNAL_URL) allowlist.add(RENDER_EXTERNAL_URL);
if (NETLIFY_URL) allowlist.add(NETLIFY_URL);

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    // Allow same-origin / curl / server-to-server (no Origin header)
    if (!origin) return cb(null, true);
    if (allowlist.has(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin not allowed -> ${origin}`));
  },
  credentials: false, // using Authorization header, not cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Vary so proxies don't cache a CORS response across origins
app.use((_req, res, next) => {
  res.header('Vary', 'Origin');
  next();
});

// CORS must be before any routes
app.use(cors(corsOptions));
// Express 5: use a RegExp for global OPTIONS preflights
app.options(/.*/, cors(corsOptions));

/* -------------------------- Middleware -------------------------- */
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(passport.initialize());

/* ------------------------ Health & Alias ------------------------ */
app.get(`${API_PREFIX}/health`, (_req, res) => res.json({ ok: true }));

// Keep old /auth path working by redirecting to /api/auth
app.use('/auth', (req, res) => {
  res.redirect(307, `${API_PREFIX}/auth${req.url}`);
});

/* ---------------------------- Routes ---------------------------- */
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/inventories`, inventoryRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/stats`, statsRoutes);

// Protected Studio endpoints
app.use(`${API_PREFIX}/studio`, requireAuth, studioRoutes);

// Unprotected utilities
initFTS().catch(console.error);
app.use(API_PREFIX, searchRoutes);
app.use(API_PREFIX, itemsRoutes);
app.use(API_PREFIX, fieldsRoutes);
app.use(API_PREFIX, customIdRoutes);
app.use(API_PREFIX, membersRoutes);
app.use(API_PREFIX, commentsRoutes);
app.use(API_PREFIX, likesRoutes);

/* ------------------------ Error Handling ------------------------ */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err?.status || 500;
  res.status(status).json({ error: err?.message || 'Server error' });
});

/* ----------------------------- Start ---------------------------- */
app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
  console.log(`CORS allowlist: ${[...allowlist].join(', ')}`);
});
