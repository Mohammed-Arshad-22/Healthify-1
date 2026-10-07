import { Router } from 'express';
import {
  getPatient,
  getObservations,
  getMedications,
  getConditions,
  getDiagnosticReports,
  getDocumentReferences,
  getEncounters,
  exportFhirBundle,
} from '../controllers/fhir.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// All FHIR endpoints require authentication and scope to the authenticated user
router.use(protect);

// 1. Patient FHIR Resource
router.get('/patient', getPatient);

// 2. Observations FHIR Resources (Lab metrics, interpretations)
router.get('/observations', getObservations);

// 3. MedicationRequest FHIR Resources
router.get('/medications', getMedications);

// 4. Condition FHIR Resources
router.get('/conditions', getConditions);

// 5. DiagnosticReport FHIR Resources
router.get('/diagnostic-reports', getDiagnosticReports);

// 6. DocumentReference FHIR Resources
router.get('/document-references', getDocumentReferences);

// 7. Encounter FHIR Resources
router.get('/encounters', getEncounters);

// 8. Export FHIR JSON Bundle
router.get('/export', exportFhirBundle);

export default router;
