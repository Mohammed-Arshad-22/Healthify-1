import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  addEmergencyContact, 
  removeEmergencyContact, 
  getAccessLogs,
  getStructuredHealthProfile
} from '../controllers/user.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/profile', getProfile);
router.get('/health-profile', getStructuredHealthProfile);
router.put('/profile', updateProfile);
router.post('/emergency-contact', addEmergencyContact);
router.delete('/emergency-contact/:contactId', removeEmergencyContact);
router.get('/access-logs', getAccessLogs);

export default router;
