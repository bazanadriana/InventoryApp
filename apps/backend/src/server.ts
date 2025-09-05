import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import './config/passport';

import searchRoutes from './routes/search.routes';
import itemsRoutes from './routes/itemsRoutes';
import fieldsRoutes from './routes/fieldsRoutes';
import customIdRoutes from './routes/customIdRoutes';
import membersRoutes from './routes/membersRoutes';
import commentsRoutes from './routes/commentsRoutes';
import likesRoutes from './routes/likesRoutes';
import { initFTS } from './search/pgFullText';
import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import userRoutes from './routes/userRoutes';
import statsRoutes from './routes/statsRoutes';
import studioRoutes from './routes/studioRoutes';
import requireAuth from './middleware/requireAuth';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const NODE_ENV = process.env.NODE_ENV || 'development';

const FRONTEND_URL =
  process.env.FRONTEND_ORIGIN ||
  process.env.FRONTEND_URL ||
  'http://localhost:5173';

const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const NETLIFY_URL = process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL}` : undefined;

app.set('trust proxy', 1);

/* ----------------------------- CORS ----------------------------- */
function normalizeOrigin(o?: string | null) {
  if (!o) return o ?? '';
  try {
    const u = new URL(o);
    return `${u.protocol}//${u.host}`; // strip path
  } catch {
    return String(o).replace(/\/+$/, '');
  }
}

const baseAllowlist = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  RENDER_EXTERNAL_URL,
  NETLIFY_URL,
].filter(Boolean) as string[];

const allowlist = new Set(baseAllowlist.map(normalizeOrigin));

const FRONTEND_HOST = (() => {
  try {
    return new URL(FRONTEND_URL).host; // e.g., inventory-app-2025.netlify.app
  } catch {
    return null as string | null;
  }
})();

function isAllowedOrigin(origin?: string | null) {
  if (!origin) return true; // same-origin/SSR/fetch from server itself
  const norm = normalizeOrigin(origin);
  if (allowlist.has(norm)) return true;

  // Optional: allow Netlify branch/preview subdomains for THIS site only:
  // e.g., feature-123--inventory-app-2025.netlify.app
  if (FRONTEND_HOST && FRONTEND_HOST.endsWith('.netlify.app')) {
    try {
      const host = new URL(origin).host;
      if (host === FRONTEND_HOST) return true;
      if (host.endsWith(`--${FRONTEND_HOST}`)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    const ok = isAllowedOrigin(origin);
    if (!ok && NODE_ENV !== 'production') {
      console.warn('[CORS] Blocked origin:', origin, 'Allowed:', [...allowlist]);
    }
    cb(null, ok);
  },
  // ✅ We’re not using cookies for auth; rely on Authorization: Bearer
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400, // cache preflight for a day
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* -------------------------- Middleware -------------------------- */
// Keep helmet; default is fine. If you embed cross-origin images, you can tweak CORP.
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
// cookieParser is harmless even if we don't use auth cookies elsewhere.
app.use(cookieParser());
app.use(passport.initialize());

/* ------------------------ Health & Alias ------------------------ */
app.get('/api/health', (_req, res) => res.send('ok'));
app.get('/api/debug/cors', (req, res) => {
  res.json({
    env: NODE_ENV,
    requestOrigin: req.headers.origin ?? null,
    normalized: normalizeOrigin(req.headers.origin as string | undefined),
    allowlist: [...allowlist],
    frontendHost: FRONTEND_HOST,
  });
});

// Keep /auth alias → /api/auth to preserve old OAuth links/bookmarks
app.use('/auth', (req, res) => res.redirect(307, `/api/auth${req.url}`));

/* ---------------------------- Routes ---------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Protected Studio (expects Authorization: Bearer <jwt>)
app.use('/api/studio', requireAuth, studioRoutes);

// Feature routes
app.use('/api', searchRoutes);
app.use('/api', itemsRoutes);
app.use('/api', fieldsRoutes);
app.use('/api', customIdRoutes);
app.use('/api', membersRoutes);
app.use('/api', commentsRoutes);
app.use('/api', likesRoutes);

// Initialize full-text setup (non-blocking)
initFTS().catch(console.error);

/* ------------------------ Error Handling ------------------------ */
const errHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const status = (err as any)?.status ?? 500;
  const payload: any = { error: 'Server error' };
  if (NODE_ENV !== 'production' && (err as any)?.message) {
    payload.message = (err as any).message;
  }
  res.status(status).json(payload);
};
app.use(errHandler);

/* ----------------------------- Start ---------------------------- */
app.listen(PORT, () => {
  console.log('API listening on', PORT);
  console.log('CORS allowed (base):', [...allowlist].join(', '));
});
