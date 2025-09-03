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

const FRONTEND_URL = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173';
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const NETLIFY_URL = process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL}` : undefined;

app.set('trust proxy', 1);

/* ----------------------------- CORS ----------------------------- */
function normalizeOrigin(o?: string | null) {
  if (!o) return o ?? '';
  try {
    const u = new URL(o);
    return `${u.protocol}//${u.host}`;
  } catch {
    return String(o).replace(/\/+$/, '');
  }
}

const allowlist = new Set(
  [FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
    .concat(RENDER_EXTERNAL_URL ? [RENDER_EXTERNAL_URL] : [])
    .concat(NETLIFY_URL ? [NETLIFY_URL] : [])
    .map(normalizeOrigin)
);

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    const ok = allowlist.has(normalizeOrigin(origin));
    if (!ok && NODE_ENV !== 'production') {
      console.warn('[CORS] Blocked origin:', origin);
    }
    cb(null, ok);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

/* -------------------------- Middleware -------------------------- */
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

/* ------------------------ Health & Alias ------------------------ */
app.get('/api/health', (_req, res) => res.send('ok'));
app.use('/auth', (req, res) => res.redirect(307, `/api/auth${req.url}`));

/* ---------------------------- Routes ---------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Protected Studio
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
  console.log('CORS allowed:', [...allowlist].join(', '));
});
