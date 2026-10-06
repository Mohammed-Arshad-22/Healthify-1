import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'healthify_super_secure_jwt_secret_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthify',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiApiKey: process.env.AI_API_KEY || '',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 300, // limit each IP to 300 requests per windowMs
};
