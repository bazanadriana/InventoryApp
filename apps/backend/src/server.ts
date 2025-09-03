import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors, { type CorsOptions } from 'cors';
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

import './auth/strategies.js';           // registers passport strategies
import authRoutes from './routes/authRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import userRoutes from './routes/userRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import studioRoutes from './routes/studioRoutes.js';
import { requireAuth } from './middleware/requireAuth.js';

const app = express();

/* ----------------------------- Config ---------------------------- */
const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN_RAW =
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173';
const FRONTEND_ORIGIN = FRONTEND_ORIGIN_RAW.replace(/\/+$/, '');

const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL
  ? process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')
  : undefined;

const NETLIFY_URL = process.env.NETLIFY_URL
  ? `https://${process.env.NETLIFY_URL}`.replace(/\/+$/, '')
  : undefined;

const COOKIE_SECRET =
  process.env.SESSION_SECRET || process.env.JWT_SECRET || 'change-me-in-prod';

// Helpful for secure cookies behind Render’s proxy
app.set('trust proxy', 1);

/* ----------------------------- CORS ------------------------------ */
// Build a strict allowlist; add any extra origins here if needed.
const allowlist = new Set<string>([
  FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173', // vite preview (optional)
  'http://127.0.0.1:4173',
]);
if (RENDER_EXTERNAL_URL) allowlist.add(RENDER_EXTERNAL_URL);
if (NETLIFY_URL) allowlist.add(NETLIFY_URL);

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // allow server-to-server, curl, and same-origin requests
    if (!origin) return cb(null, true);
    if (allowlist.has(origin)) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // allow cookies/credentials cross-site (even if you use Bearer tokens)
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  // 🔑 Allow Authorization so the frontend can send Bearer tokens
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// Preflight for all paths
app.options(/.*/, cors(corsOptions));

/* -------------------------- Middleware --------------------------- */
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));
app.use(passport.initialize());

/* ------------------------ Health & Aliases ----------------------- */
app.get('/healthz', (_req, res) => res.status(200).send('ok'));   // external health
app.get('/api/health', (_req, res) => res.status(200).send('ok')); // internal health

// Back-compat: /auth -> /api/auth
app.use('/auth', (req, res) => {
  res.redirect(307, `/api/auth${req.url}`);
});

/* ----------------------------- Routes ---------------------------- */
// IMPORTANT: Mount auth router at /api (router defines /auth/* inside)
app.use('/api', authRoutes);

app.use('/api/inventories', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Protected Studio endpoints
app.use('/api/studio', requireAuth, studioRoutes);

// Other feature routes
app.use('/api', searchRoutes);
app.use('/api', itemsRoutes);
app.use('/api', fieldsRoutes);
app.use('/api', customIdRoutes);
app.use('/api', membersRoutes);
app.use('/api', commentsRoutes);
app.use('/api', likesRoutes);

// Initialize FTS in the background (don’t block boot)
initFTS().catch((e) => console.error('initFTS error:', e));

/* ------------------------ Error Handling ------------------------- */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', err);
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({ error: 'server_error' });
});

/* ------------------------------ Start ---------------------------- */
app.listen(PORT, () => {
  console.log('API listening on', PORT);
  console.log('CORS allowed:', [...allowlist].join(', '));
  console.log('Auth endpoints:');
  console.log('  GET /api/auth/google');
  console.log('  GET /api/auth/github');
});
