import { Router } from 'express';
import { 
  getDoctorProfile, 
  updateDoctorProfile, 
  getAuthorizedPatients, 
  getAuthorizedPatientHealthData, 
  addDoctorConsultation,
  getDoctorsDirectory,
  shareWithDoctor,
  revokeDoctorSharing,
  getPatientDoctorShares
} from '../controllers/doctor.controller.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// Base middleware: must be authenticated
router.use(protect);

// 1. Patient-facing doctor sharing routes (Phases 6 & 7)
router.get('/directory', getDoctorsDirectory);
router.post('/share', shareWithDoctor);
router.delete('/share/:shareId', revokeDoctorSharing);
router.get('/shares', getPatientDoctorShares);

// 2. Doctor-only portal routes (Phases 3, 5, 6 - strictly isolated by role and patient consent)
router.get('/profile', requireRole('doctor'), getDoctorProfile);
router.put('/profile', requireRole('doctor'), updateDoctorProfile);
router.get('/patients', requireRole('doctor'), getAuthorizedPatients);
router.get('/patients/:patientId', requireRole('doctor'), getAuthorizedPatientHealthData);
router.post('/patients/:patientId/consultations', requireRole('doctor'), addDoctorConsultation);

export default router;
