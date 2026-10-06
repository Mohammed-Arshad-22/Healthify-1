import { Router } from 'express';
import { 
  sendOtp, 
  verifyOtp, 
  registerWithEmail, 
  loginWithEmail, 
  socialLogin, 
  demoLogin, 
  getMe, 
  logout 
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Public auth routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerWithEmail);
router.post('/login', loginWithEmail);
router.post('/social', socialLogin);
router.post('/demo', demoLogin);

// Protected auth routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

export default router;
