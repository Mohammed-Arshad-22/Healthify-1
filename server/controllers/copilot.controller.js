import path from 'path';
import Document from '../models/Document.js';
import Medication from '../models/Medication.js';
import HealthRecord from '../models/HealthRecord.js';
import { aiService } from '../services/ai.service.js';
import { geminiService } from '../services/gemini.service.js';
import { sarvamService } from '../services/sarvam/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * 1. Sarvam Saaras v4 Voice Transcription Endpoint
 * Strict Privacy: Audio processed strictly in memory and discarded. No raw audio persisted.
 */
export const transcribeVoiceInput = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return next(new AppError('No voice audio data received. Please record speech and try again.', 400));
    }

    const { language = 'auto' } = req.body;

    // Build dynamic healthcare keyterms from user's authorized profile
    const activeMeds = await Medication.find({ userId: req.user._id, status: 'active' }).select('name');
    const userRecords = await HealthRecord.find({ userId: req.user._id }).select('doctorName hospitalClinicName diagnosis');

    const keyterms = [];
    activeMeds.forEach(m => keyterms.push(m.name));
    userRecords.forEach(r => {
      if (r.doctorName) keyterms.push(r.doctorName);
      if (r.hospitalClinicName) keyterms.push(r.hospitalClinicName);
      if (r.diagnosis) keyterms.push(...r.diagnosis);
    });

    const langMap = {
      ta: 'ta-IN',
      hi: 'hi-IN',
      te: 'te-IN',
      en: 'en-IN',
    };
    const targetLangCode = langMap[language] || (language !== 'auto' ? language : 'unknown');

    const result = await sarvamService.transcribeAudio({
      buffer: file.buffer,
      mimeType: file.mimetype || 'audio/webm',
      languageCode: targetLangCode,
      keyterms,
    });

    if (result.fallbackToBrowser) {
      return res.status(200).json({
        status: 'fallback',
        transcript: '',
        fallbackToBrowser: true,
      });
    }

    res.status(200).json({
      status: 'success',
      transcript: result.transcript,
      languageCode: result.languageCode,
    });
  } catch (err) {
    res.status(200).json({
      status: 'fallback',
      transcript: '',
      fallbackToBrowser: true,
    });
  }
};

/**
 * 2. Optional Voice Response (Sarvam Bulbul TTS)
 */
export const speakVoiceResponse = async (req, res, next) => {
  try {
    const { text, language = 'en', speaker = 'meera' } = req.body;
    if (!text || !text.trim()) {
      return next(new AppError('Please provide text to read.', 400));
    }

    const result = await sarvamService.synthesizeSpeech({
      text,
      language,
      speaker,
    });

    res.status(200).json({
      status: 'success',
      audioBase64: result.audioBase64,
      mimeType: result.mimeType,
    });
  } catch (err) {
    res.status(200).json({
      status: 'fallback',
      audioBase64: null,
      mimeType: null,
    });
  }
};

/**
 * 3. Copilot Document / Photo Upload
 * Saves document to user's central Documents library, performs OCR/AI extraction,
 * and makes it accessible in main application (single source of truth).
 */
export const uploadCopilotDocument = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return next(new AppError('Please select a photo or medical document to upload.', 400));
    }

    const { category = 'laboratory_report', userPrompt = '' } = req.body;
    const docFileName = file.filename;
    const docOriginalName = file.originalname;
    const docUrl = `/uploads/${docFileName}`;
    const docType = path.extname(docOriginalName).slice(1).toLowerCase() || 'pdf';

    // 1. Create Document in user's unified document collection
    const document = new Document({
      userId: req.user._id,
      fileName: docFileName,
      originalName: docOriginalName,
      fileUrl: docUrl,
      fileType: ['jpg', 'jpeg', 'png'].includes(docType) ? docType : 'pdf',
      fileSize: file.size,
      category,
      status: 'PROCESSING',
    });

    await document.save();
    document.filePath = file.path;

    // 2. Perform AI OCR & Entity Extraction via Gemini
    const extractionResult = await aiService.extractDocumentEntities(document);
    document.ocrRawText = extractionResult.ocrRawText;
    document.extractedData = extractionResult.extractedData;
    document.overallConfidence = extractionResult.overallConfidence;
    document.status = extractionResult.overallConfidence >= 90 ? 'ANALYZED' : 'NEEDS_REVIEW';

    await document.save();

    // 3. Craft conversational plain-language AI response for Copilot chat stream (Phases 1-10)
    let copilotExplanation = '';
    const extData = document.extractedData || {};

    if (extData.labTests && extData.labTests.length > 0) {
      copilotExplanation = geminiService.explainMedicalReportInPlainLanguage({
        documents: [document],
        labMetrics: [],
        query: 'Explain my uploaded report',
        language: req.user?.preferredLanguage || 'en',
      });
    } else if (extData.medicines && extData.medicines.length > 0) {
      copilotExplanation = geminiService.explainPrescriptionsInPlainLanguage({
        medications: [],
        documents: [document],
        language: req.user?.preferredLanguage || 'en',
      });
    } else if (extData.summary) {
      copilotExplanation = extData.summary;
    } else {
      copilotExplanation = `Your document "${docOriginalName}" has been uploaded to your verified Documents library and analyzed in plain language.`;
    }

    res.status(201).json({
      status: 'success',
      message: 'Document uploaded and integrated into your health records.',
      document,
      copilotExplanation,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  transcribeVoiceInput,
  speakVoiceResponse,
  uploadCopilotDocument,
};
