import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { httpLogger } from './middlewares/httpLogger.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import * as healthController from './controllers/healthController.js';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export function createApp() {
  const app = express();

  // Imprescindible detrás del proxy inverso de Render para cookies Secure y rate limiting por IP real
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Seguridad: Helmet con CSP estricta y HSTS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // API consumida desde otro origen (Vercel -> Render)
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // 2. CORS restringido exclusivamente al dominio del frontend con credenciales y X-CSRF-Token
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((o) => o.trim().replace(/^['"]|['"]$/g, '').replace(/\/$/, ''))
    .filter(Boolean);

  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      return callback(Object.assign(new Error('Origen no permitido por CORS.'), { status: 403 }));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // 3. Compresión HTTP
  app.use(compression());

  // 4. Body Parsers
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: true, limit: '32kb' }));

  // 5. Cookies
  app.use(cookieParser());

  // 6. Logging HTTP estructurado (res.on('finish'))
  app.use(httpLogger);

  // 7. Rate limiting global
  app.use(apiLimiter);

  // 8. Rutas de la aplicación
  app.get('/health', healthController.getHealth);
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/admin', adminRoutes);

  // 9. Manejador 404 y manejador centralizado de errores (4 parámetros)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
