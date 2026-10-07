import { Router } from 'express';
import { 
  interpretStandaloneLaboratories, 
  getLaboratoryInterpretations,
  interpretDocumentLaboratories,
  getDocumentLabInterpretations
} from '../controllers/labInterpretation.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Strict Authentication required
router.use(protect);

// Lab interpretation endpoints
router.post('/interpret', interpretStandaloneLaboratories);
router.get('/interpretations', getLaboratoryInterpretations);
router.post('/documents/:id/interpret', interpretDocumentLaboratories);
router.get('/documents/:id/interpretations', getDocumentLabInterpretations);

export default router;
