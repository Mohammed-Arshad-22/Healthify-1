import mongoose from 'mongoose';
import Document from '../models/Document.js';
import ObservationInterpretation from '../models/ObservationInterpretation.js';
import { labInterpretationService } from '../services/labInterpretation.service.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * 1. Interpret Standalone Laboratory Observations
 * POST /api/lab/interpret
 */
export const interpretStandaloneLaboratories = async (req, res, next) => {
  try {
    const { observations, patient_context, document_id } = req.body;

    if (!observations || !Array.isArray(observations) || observations.length === 0) {
      return next(new AppError('Please provide an array of laboratory observations to interpret.', 400));
    }

    // Inherit user context if authenticated user has profile info
    const mergedPatientContext = {
      age: req.user?.age || req.user?.profile?.age,
      gender: req.user?.gender || req.user?.profile?.gender,
      is_adult: true,
      ...(patient_context || {}),
    };

    const interpretations = await labInterpretationService.interpretAndPersistObservations({
      observations,
      userId: req.user?._id,
      documentId: document_id || null,
      patientContext: mergedPatientContext,
    });

    res.status(200).json({
      status: 'success',
      count: interpretations.length,
      interpretations,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Interpret All Laboratories for a specific Document
 * POST /api/documents/:id/interpret-labs
 */
export const interpretDocumentLaboratories = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    const query = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(query);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    const patientContext = {
      age: req.user?.age || req.user?.profile?.age,
      gender: req.user?.gender || req.user?.profile?.gender,
      is_adult: true,
      ...(req.body.patient_context || {}),
    };

    const interpretations = await labInterpretationService.interpretDocumentLaboratories(
      document,
      req.user._id,
      patientContext
    );

    res.status(200).json({
      status: 'success',
      count: interpretations.length,
      interpretations,
      document,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. List All Laboratory Interpretations (User-Scoped)
 * GET /api/lab/interpretations
 */
export const getLaboratoryInterpretations = async (req, res, next) => {
  try {
    const { status, severity, test_name, document_id, limit = 100 } = req.query;

    const filter = {
      $or: [{ user_id: req.user._id }, { userId: req.user._id }],
    };

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (severity) {
      filter.severity = severity.toUpperCase();
    }

    if (test_name) {
      filter.test_name = { $regex: test_name, $options: 'i' };
    }

    if (document_id && mongoose.isValidObjectId(document_id)) {
      filter.$and = [
        { $or: [{ document_id }, { documentId: document_id }] }
      ];
    }

    const interpretations = await ObservationInterpretation.find(filter)
      .sort({ created_at: -1 })
      .limit(parseInt(limit, 10));

    res.status(200).json({
      status: 'success',
      count: interpretations.length,
      interpretations,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Get Laboratory Interpretations for Document
 * GET /api/documents/:id/lab-interpretations
 */
export const getDocumentLabInterpretations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.isValidObjectId(id);

    const docQuery = {
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [isObjectId ? { _id: id } : null, { uuid: id }].filter(Boolean) },
      ],
    };

    const document = await Document.findOne(docQuery);
    if (!document) {
      return next(new AppError('Document not found or unauthorized.', 404));
    }

    const interpretations = await ObservationInterpretation.find({
      $and: [
        { $or: [{ user_id: req.user._id }, { userId: req.user._id }] },
        { $or: [{ document_id: document._id }, { documentId: document._id }] },
      ],
    }).sort({ created_at: -1 });

    res.status(200).json({
      status: 'success',
      count: interpretations.length,
      interpretations,
      document,
    });
  } catch (err) {
    next(err);
  }
};
