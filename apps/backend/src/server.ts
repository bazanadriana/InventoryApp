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
import  requireAuth  from './middleware/requireAuth.js';

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
const NETLIFY_URL = process.env.NETLIFY_URL ? `https://${process.env.NETLIFY_URL}` : undefined;

app.set('trust proxy', 1);

/* ----------------------------- CORS ----------------------------- */
const allowlist = new Set<string>([
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
if (RENDER_EXTERNAL_URL) allowlist.add(RENDER_EXTERNAL_URL);
if (NETLIFY_URL) allowlist.add(NETLIFY_URL);

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);      // same-origin / curl
    if (allowlist.has(origin)) return cb(null, true);
    return cb(null, false);                   // not allowed by CORS
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
// ❌ Express 5 no longer supports string "*" in routes
// app.options('*', cors(corsOptions));
// ✅ Use a RegExp to match all paths for preflight
app.options(/.*/, cors(corsOptions));

/* -------------------------- Middleware -------------------------- */
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

/* ------------------------ Health & Alias ------------------------ */
app.get('/api/health', (_req, res) => res.send('ok'));

app.use('/auth', (req, res) => {
  res.redirect(307, `/api/auth${req.url}`);
});

/* ---------------------------- Routes ---------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Protected Studio endpoints
app.use('/api/studio', requireAuth, studioRoutes);

initFTS().catch(console.error);
app.use('/api', searchRoutes);
app.use('/api', itemsRoutes);
app.use('/api', fieldsRoutes);
app.use('/api', customIdRoutes);
app.use('/api', membersRoutes);
app.use('/api', commentsRoutes);
app.use('/api', likesRoutes);

/* ------------------------ Error Handling ------------------------ */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err?.status || 500).json({ error: 'Server error' });
});

/* ----------------------------- Start ---------------------------- */
app.listen(PORT, () => {
  console.log('API listening on', PORT);
  console.log('CORS allowed:', [...allowlist].join(', '));
});
