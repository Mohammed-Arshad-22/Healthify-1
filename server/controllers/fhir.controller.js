import { fhirService } from '../services/fhir.service.js';

/**
 * 1. GET /api/fhir/patient
 * Returns FHIR Patient resource with mock_abha_id in XX-XXXX-XXXX-XXXX format labeled DEMO / MOCK ABHA ID.
 */
export const getPatient = async (req, res, next) => {
  try {
    const patientResource = await fhirService.getPatient(req.user._id);
    res.status(200).json(patientResource);
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/fhir/observations
 * Returns FHIR Observations for user's laboratory and clinical metrics.
 */
export const getObservations = async (req, res, next) => {
  try {
    const observations = await fhirService.getObservations(req.user._id);
    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map((o) => ({ resource: o })),
      observations,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/fhir/medications
 * Returns FHIR MedicationRequests for user's prescribed medications.
 */
export const getMedications = async (req, res, next) => {
  try {
    const medications = await fhirService.getMedications(req.user._id);
    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: medications.length,
      entry: medications.map((m) => ({ resource: m })),
      medications,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/fhir/conditions
 * Returns FHIR Condition resources for patient's clinical diagnoses.
 */
export const getConditions = async (req, res, next) => {
  try {
    const conditions = await fhirService.getConditions(req.user._id);
    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: conditions.length,
      entry: conditions.map((c) => ({ resource: c })),
      conditions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. GET /api/fhir/diagnostic-reports
 * Returns FHIR DiagnosticReport resources for laboratory and diagnostic reports.
 */
export const getDiagnosticReports = async (req, res, next) => {
  try {
    const diagnosticReports = await fhirService.getDiagnosticReports(req.user._id);
    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: diagnosticReports.length,
      entry: diagnosticReports.map((r) => ({ resource: r })),
      diagnosticReports,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. GET /api/fhir/document-references
 * Returns FHIR DocumentReference resources for all uploaded medical documents.
 */
export const getDocumentReferences = async (req, res, next) => {
  try {
    const documentReferences = await fhirService.getDocumentReferences(req.user._id);
    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: documentReferences.length,
      entry: documentReferences.map((d) => ({ resource: d })),
      documentReferences,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. GET /api/fhir/encounters
 * Returns FHIR Encounter resources for appointments and clinical consultations.
 */
export const getEncounters = async (req, res, next) => {
  try {
    const encounters = await fhirService.getEncounters(req.user._id);
    res.status(200).json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: encounters.length,
      entry: encounters.map((e) => ({ resource: e })),
      encounters,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 8. GET /api/fhir/export
 * "Export FHIR JSON": Compiles all 7 resources into a single valid FHIR R4 Bundle.
 */
export const exportFhirBundle = async (req, res, next) => {
  try {
    const bundle = await fhirService.exportFhirBundle(req.user._id);

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="healthify_fhir_bundle_${req.user._id}.json"`);
      res.setHeader('Content-Type', 'application/fhir+json');
    }

    res.status(200).json(bundle);
  } catch (err) {
    next(err);
  }
};

export default {
  getPatient,
  getObservations,
  getMedications,
  getConditions,
  getDiagnosticReports,
  getDocumentReferences,
  getEncounters,
  exportFhirBundle,
};
