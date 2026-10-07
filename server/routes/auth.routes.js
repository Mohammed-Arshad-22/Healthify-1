import { Router } from 'express';
import { 
  sendOtp, 
  verifyOtp, 
  registerWithEmail, 
  loginWithEmail, 
  socialLogin, 
  demoLogin, 
  getMe, 
  logout,
  registerDoctor,
  loginDoctor
} from '../controllers/auth.controller.js';
import { protect, optionalAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public auth routes (Patients)
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerWithEmail);
router.post('/login', loginWithEmail);
router.post('/social', socialLogin);
router.post('/demo', demoLogin);

// Public auth routes (Doctors - Phases 3, 4, 5)
router.post('/doctor/register', registerDoctor);
router.post('/doctor/login', loginDoctor);

// Protected auth routes
router.get('/me', protect, getMe);
router.post('/logout', optionalAuth, logout);

export default router;
