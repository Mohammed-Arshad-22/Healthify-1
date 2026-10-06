import { Router } from 'express';
import { 
  getHealthRecords, 
  createHealthRecord, 
  deleteHealthRecord,
  getMedications, 
  createMedication, 
  logMedicationAdherence, 
  toggleMedicationStatus,
  getLabTrends, 
  addLabMetric,
  getDoctors, 
  createDoctor,
  getAppointments, 
  createAppointment,
  getCaregivers, 
  addCaregiver, 
  revokeCaregiver,
  getAbhaProfile, 
  connectAbhaDemo, 
  discoverAbhaRecords, 
  importAbhaRecords,
  askHealthCopilot,
  getEmergencyProfile, 
  getPublicEmergencyCard,
  globalSearch,
  getNotifications, 
  markNotificationRead
} from '../controllers/healthData.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Public emergency route for QR scans
router.get('/emergency/public/:userId', getPublicEmergencyCard);

// Protected routes
router.use(protect);

// Records & Timeline
router.get('/records', getHealthRecords);
router.post('/records', createHealthRecord);
router.delete('/records/:id', deleteHealthRecord);

// Medications
router.get('/medications', getMedications);
router.post('/medications', createMedication);
router.post('/medications/:id/adherence', logMedicationAdherence);
router.patch('/medications/:id/toggle', toggleMedicationStatus);

// Lab Trends
router.get('/trends', getLabTrends);
router.post('/trends', addLabMetric);

// Doctors & Appointments
router.get('/doctors', getDoctors);
router.post('/doctors', createDoctor);
router.get('/appointments', getAppointments);
router.post('/appointments', createAppointment);

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

// Emergency Profile
router.get('/emergency', getEmergencyProfile);

// Global Search
router.get('/search', globalSearch);

// Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);

export default router;
