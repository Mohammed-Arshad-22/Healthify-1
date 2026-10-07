import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { 
  getDocuments, 
  getDocumentById,
  viewDocument,
  downloadDocument,
  uploadDocument, 
  verifyDocumentExtraction, 
  deleteDocument,
  triggerDocumentOCR,
  getDocumentExtraction,
  triggerAIExtraction,
  processDocumentPipeline
} from '../controllers/document.controller.js';
import { protect } from '../middleware/authMiddleware.js';
import { AppError } from '../middleware/errorHandler.js';

// Ensure uploads directory exists
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.pdf';
    const uniqueName = `doc_${crypto.randomUUID()}${safeExt}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(mime);

    if (isExtAllowed && isMimeAllowed) {
      return cb(null, true);
    }
    cb(new AppError('Invalid file type. Supported formats: PDF, JPG, JPEG, PNG (max 15MB).', 400));
  },
});

// Middleware handling multer single file upload & MulterError gracefully
const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File size exceeds the 15MB limit.', 400));
      }
      return next(new AppError(`Upload error: ${err.message}`, 400));
    } else if (err) {
      return next(err);
    }
    next();
  });
};

const router = Router();

// Strict Authentication required for all document endpoints
router.use(protect);

// PHASE 3 API ENDPOINTS
router.get('/', getDocuments);
router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/:id', getDocumentById);
router.get('/:id/view', viewDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

// PHASE 4 & 5 OCR & AI EXTRACTION PIPELINE ENDPOINTS
router.post('/:id/ocr', triggerDocumentOCR);
router.post('/:id/extract', triggerAIExtraction);
router.get('/:id/extraction', getDocumentExtraction);
router.post('/:id/process', processDocumentPipeline);

// PHASE 6 LABORATORY RESULT INTERPRETATION PIPELINE
import { 
  interpretDocumentLaboratories, 
  getDocumentLabInterpretations 
} from '../controllers/labInterpretation.controller.js';
router.post('/:id/interpret-labs', interpretDocumentLaboratories);
router.get('/:id/lab-interpretations', getDocumentLabInterpretations);

// Backward compatibility for clinical verification
router.post('/:id/verify', verifyDocumentExtraction);

export default router;
