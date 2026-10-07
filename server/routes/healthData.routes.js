import { Router } from 'express';
import { 
  getHealthRecords, 
  getHealthRecordById,
  createHealthRecord, 
  deleteHealthRecord,
  getMedications, 
  getMedicationById,
  createMedication, 
  logMedicationAdherence, 
  toggleMedicationStatus,
  deleteMedication,
  getLabTrends, 
  addLabMetric,
  getDoctors, 
  createDoctor,
  deleteDoctor,
  getAppointments, 
  createAppointment,
  deleteAppointment,
  getCaregivers, 
  addCaregiver, 
  revokeCaregiver,
  getAbhaProfile, 
  connectAbhaDemo, 
  discoverAbhaRecords, 
  importAbhaRecords,
  askHealthCopilot,
  retrieveCopilotData,
  getEmergencyProfile, 
  getPublicEmergencyCard,
  globalSearch,
  getNotifications,
  markNotificationRead,
} from '../controllers/healthData.controller.js';
import {
  transcribeVoiceInput,
  speakVoiceResponse,
  uploadCopilotDocument,
} from '../controllers/copilot.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';

// Multer in-memory storage for voice STT audio stream (Strict privacy: zero disk storage)
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Multer disk storage for user-uploaded documents inside Copilot
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `copilot_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const copilotDocUpload = multer({
  storage: docStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

// Public emergency route for QR scans
router.get('/emergency/public/:userId', getPublicEmergencyCard);

// Protected routes
router.use(protect);

// PHASE 7: Structured Health Profile
import { getStructuredHealthProfile } from '../controllers/user.controller.js';
router.get('/health-profile', getStructuredHealthProfile);

// Records & Timeline
router.get('/records', getHealthRecords);
router.get('/records/:id', getHealthRecordById);
router.post('/records', createHealthRecord);
router.delete('/records/:id', deleteHealthRecord);

// Medications
router.get('/medications', getMedications);
router.get('/medications/:id', getMedicationById);
router.post('/medications', createMedication);
router.post('/medications/:id/adherence', logMedicationAdherence);
router.patch('/medications/:id/toggle', toggleMedicationStatus);
router.delete('/medications/:id', deleteMedication);

// Lab Trends
router.get('/trends', getLabTrends);
router.post('/trends', addLabMetric);

// Doctors & Appointments
router.get('/doctors', getDoctors);
router.post('/doctors', createDoctor);
router.delete('/doctors/:id', deleteDoctor);
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);
router.delete('/appointments/:id', deleteAppointment);

// Caregivers
router.get('/caregivers', getCaregivers);
router.post('/caregivers', addCaregiver);
router.delete('/caregivers/:id', revokeCaregiver);

// ABDM / ABHA
router.get('/abha/profile', getAbhaProfile);
router.post('/abha/demo/connect', connectAbhaDemo);
router.get('/abha/demo/records', discoverAbhaRecords);
router.post('/abha/demo/import', importAbhaRecords);

// Health Copilot AI
router.post('/copilot/ask', askHealthCopilot);
router.post('/copilot/chat', askHealthCopilot);
router.post('/copilot/retrieve', retrieveCopilotData);
router.post('/copilot/voice-transcribe', voiceUpload.single('audio'), transcribeVoiceInput);
router.post('/copilot/voice-speak', speakVoiceResponse);
router.post('/copilot/upload-document', copilotDocUpload.single('file'), uploadCopilotDocument);

// Emergency Profile
router.get('/emergency', getEmergencyProfile);

// Global Search
router.get('/search', globalSearch);

// Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
