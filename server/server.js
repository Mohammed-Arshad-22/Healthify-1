import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { config } from './config/config.js';
import { connectDB, disconnectDB } from './config/db.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import documentRoutes from './routes/document.routes.js';
import healthDataRoutes from './routes/healthData.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Ensure upload directory exists
const uploadPath = path.join(__dirname, config.uploadDir);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// 1. Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow local dev origins or no origin (mobile apps, curl, etc.)
    callback(null, true);
  },
  credentials: true,
}));

// 3. Request Logging
app.use(requestLogger);

// 4. Rate Limiting for general API
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'fail',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});
app.use('/api', limiter);

// 5. Body Parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 6. Static files for uploads (scanned reports, prescription images)
app.use('/uploads', express.static(uploadPath));

// 7. Base Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', healthDataRoutes);

// 8. 404 Route handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server!`, 404));
});

// 9. Centralized Error Handler
app.use(errorHandler);

// Server startup
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(config.port, () => {
      console.log(`[Healthify Server] Running on http://localhost:${config.port} in ${config.env} mode`);
    });

    const shutdown = async () => {
      console.log('[Healthify Server] Shutting down gracefully...');
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[Healthify Server] Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

export default app;
