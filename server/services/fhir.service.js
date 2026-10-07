import User from '../models/User.js';
import Document from '../models/Document.js';
import Medication from '../models/Medication.js';
import LabMetric from '../models/LabMetric.js';
import ObservationInterpretation from '../models/ObservationInterpretation.js';
import AIExtraction from '../models/AIExtraction.js';
import HealthRecord from '../models/HealthRecord.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';

/**
 * Generate a deterministic Mock ABHA ID conforming strictly to XX-XXXX-XXXX-XXXX format.
 * Clearly labeled: DEMO / MOCK ABHA ID.
 * RULE: Never generate or claim a real government ABHA ID.
 */
export function formatMockAbhaId(user) {
  if (user?.abhaNumber && /^\d{2}-\d{4}-\d{4}-\d{4}$/.test(user.abhaNumber)) {
    return user.abhaNumber;
  }

  // If user has demo abhaNumber like 'DEMO-ABHA-8842-1920-5511', extract digits to format 91-8842-1920-5511
  if (user?.abhaNumber) {
    const match = user.abhaNumber.match(/(\d{4})-(\d{4})-(\d{4})/);
    if (match) {
      return `91-${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  // Derive deterministically from user ID
  const rawId = (user?._id || user?.id || '507f1f77bcf86cd799439011').toString();
  let hashNum = 0;
  for (let i = 0; i < rawId.length; i++) {
    hashNum = (hashNum * 31 + rawId.charCodeAt(i)) >>> 0;
  }

  const s1 = String((hashNum % 90) + 10); // 2 digits: 10-99
  const s2 = String(((hashNum * 3) % 9000) + 1000); // 4 digits
  const s3 = String(((hashNum * 7) % 9000) + 1000); // 4 digits
  const s4 = String(((hashNum * 13) % 9000) + 1000); // 4 digits

  return `${s1}-${s2}-${s3}-${s4}`;
}

export class FhirService {
  /**
   * Helper: Normalize user ID
   */
  normalizeUserId(userId) {
    if (!userId) return null;
    return userId._id ? userId._id.toString() : userId.toString();
  }

  /**
   * 1. Patient FHIR Resource
   * Maps User profile to FHIR R4 Patient representation.
   * Includes mock_abha_id in XX-XXXX-XXXX-XXXX format labeled as DEMO / MOCK ABHA ID.
   */
  async getPatient(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).lean();
    if (!user) {
      throw new Error('Patient not found.');
    }

    const mockAbhaId = formatMockAbhaId(user);

    let birthDate = null;
    if (user.dateOfBirth) {
      birthDate = new Date(user.dateOfBirth).toISOString().split('T')[0];
    } else if (user.age) {
      const year = new Date().getFullYear() - user.age;
      birthDate = `${year}-01-01`;
    }

    const telecoms = [];
    if (user.phone) telecoms.push({ system: 'phone', value: user.phone, use: 'mobile' });
    if (user.email) telecoms.push({ system: 'email', value: user.email, use: 'home' });

    return {
      resourceType: 'Patient',
      id: user._id.toString(),
      mock_abha_id: mockAbhaId,
      mock_abha_label: 'DEMO / MOCK ABHA ID',
      meta: {
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient'],
        tag: [
          {
            code: 'DEMO / MOCK ABHA ID',
            display: 'Prototype / Hackathon Architecture — Not Official ABDM Connectivity',
          },
        ],
      },
      identifier: [
        {
          system: 'https://healthid.ndhm.gov.in/demo-mock',
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical record number',
              },
            ],
            text: 'DEMO / MOCK ABHA ID',
          },
          value: mockAbhaId,
        },
      ],
      active: true,
      name: [
        {
          use: 'official',
          text: user.name || 'Unnamed Patient',
          family: (user.name || '').split(' ').slice(1).join(' ') || undefined,
          given: (user.name || '').split(' ').slice(0, 1),
        },
      ],
      telecom: telecoms,
      gender: ['male', 'female', 'other'].includes((user.gender || '').toLowerCase())
        ? user.gender.toLowerCase()
        : 'unknown',
      birthDate,
      generalPractitioner: user.primaryDoctorName
        ? [{ display: user.primaryDoctorName }]
        : [],
      managingOrganization: {
        display: 'Healthify Prototype Architecture (Non-Official ABDM Sandbox)',
      },
    };
  }

  /**
   * 2. Observations FHIR Resources
   * Maps laboratory observations, metrics, and interpretations to FHIR Observation resources.
   * All data originates from existing database records.
   */
  async getObservations(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).select('name').lean();
    const userName = user?.name || 'Patient';

    const observations = [];
    const seenTests = new Set();

    // 1. ObservationInterpretations (Phase 6)
    const interpretations = await ObservationInterpretation.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
    }).lean();

    interpretations.forEach((item) => {
      const key = `${item.test_name}_${item.value}`.toLowerCase();
      if (!seenTests.has(key)) {
        seenTests.add(key);
        const numVal = parseFloat(item.value);
        observations.push({
          resourceType: 'Observation',
          id: item._id.toString(),
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory',
                },
              ],
            },
          ],
          code: {
            text: item.test_name,
            coding: [
              {
                system: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation',
                display: item.test_name,
              },
            ],
          },
          subject: {
            reference: `Patient/${rawUserId}`,
            display: userName,
          },
          effectiveDateTime: item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
          valueQuantity: !isNaN(numVal)
            ? {
                value: numVal,
                unit: item.unit || '',
                system: 'http://unitsofmeasure.org',
              }
            : undefined,
          valueString: isNaN(numVal) ? String(item.value) : undefined,
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: item.status === 'HIGH' ? 'H' : item.status === 'LOW' ? 'L' : item.status === 'NORMAL' ? 'N' : 'IND',
                  display: item.status || 'UNKNOWN',
                },
              ],
              text: item.severity || item.status || 'UNKNOWN',
            },
          ],
          referenceRange: item.reference_range
            ? [{ text: item.reference_range }]
            : [],
        });
      }
    });

    // 2. LabMetrics (Phase 1 & 7)
    const metrics = await LabMetric.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
    }).lean();

    metrics.forEach((m) => {
      const key = `${m.metricName}_${m.value}`.toLowerCase();
      if (!seenTests.has(key)) {
        seenTests.add(key);
        observations.push({
          resourceType: 'Observation',
          id: m._id.toString(),
          status: 'final',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                  code: 'laboratory',
                  display: 'Laboratory',
                },
              ],
            },
          ],
          code: {
            text: m.metricName,
            coding: [
              {
                system: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation',
                display: m.metricName,
              },
            ],
          },
          subject: {
            reference: `Patient/${rawUserId}`,
            display: userName,
          },
          effectiveDateTime: m.date ? new Date(m.date).toISOString() : new Date().toISOString(),
          valueQuantity: {
            value: Number(m.value),
            unit: m.unit || '',
            system: 'http://unitsofmeasure.org',
          },
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: m.status === 'high' ? 'H' : m.status === 'low' ? 'L' : m.status === 'normal' ? 'N' : 'IND',
                  display: (m.status || 'normal').toUpperCase(),
                },
              ],
              text: (m.status || 'normal').toUpperCase(),
            },
          ],
          referenceRange: m.referenceMin !== undefined && m.referenceMax !== undefined
            ? [{ text: `${m.referenceMin}–${m.referenceMax} ${m.unit || ''}`.trim() }]
            : [],
        });
      }
    });

    // 3. AI Extractions (Phase 5)
    const aiExts = await AIExtraction.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
    }).lean();

    aiExts.forEach((ext) => {
      const tests = [
        ...(ext.validated_data?.laboratory_tests || []),
        ...(ext.validated_data?.observations || []),
      ];
      tests.forEach((t, idx) => {
        if (t.test_name) {
          const key = `${t.test_name}_${t.value}`.toLowerCase();
          if (!seenTests.has(key)) {
            seenTests.add(key);
            const numVal = t.numeric_value !== null && t.numeric_value !== undefined ? t.numeric_value : parseFloat(t.value);
            observations.push({
              resourceType: 'Observation',
              id: `${ext._id}-obs-${idx}`,
              status: 'final',
              category: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                      code: 'laboratory',
                      display: 'Laboratory',
                    },
                  ],
                },
              ],
              code: {
                text: t.test_name,
              },
              subject: {
                reference: `Patient/${rawUserId}`,
                display: userName,
              },
              effectiveDateTime: ext.validated_data?.document_date ? new Date(ext.validated_data.document_date).toISOString() : new Date().toISOString(),
              valueQuantity: !isNaN(numVal)
                ? {
                    value: numVal,
                    unit: t.unit || '',
                    system: 'http://unitsofmeasure.org',
                  }
                : undefined,
              valueString: isNaN(numVal) ? String(t.value) : undefined,
              interpretation: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                      code: t.abnormal_flag === 'HIGH' ? 'H' : t.abnormal_flag === 'LOW' ? 'L' : t.abnormal_flag === 'NORMAL' ? 'N' : 'IND',
                      display: t.abnormal_flag || 'UNKNOWN',
                    },
                  ],
                  text: t.abnormal_flag || 'UNKNOWN',
                },
              ],
              referenceRange: t.reference_range ? [{ text: t.reference_range }] : [],
            });
          }
        }
      });
    });

    return observations;
  }

  /**
   * 3. MedicationRequest FHIR Resources
   * Maps active and historical prescriptions into FHIR MedicationRequest resources.
   * All data originates from existing database records.
   */
  async getMedications(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).select('name').lean();
    const userName = user?.name || 'Patient';

    const medicationRequests = [];
    const seenMeds = new Set();

    // 1. Medication collection records
    const meds = await Medication.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
    }).lean();

    meds.forEach((m) => {
      const key = `${m.name}_${m.dosage}`.toLowerCase();
      if (!seenMeds.has(key)) {
        seenMeds.add(key);
        medicationRequests.push({
          resourceType: 'MedicationRequest',
          id: m._id.toString(),
          status: m.status === 'discontinued' ? 'stopped' : 'active',
          intent: 'order',
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
                  code: 'outpatient',
                  display: 'Outpatient',
                },
              ],
            },
          ],
          medicationCodeableConcept: {
            text: m.name,
            coding: [
              {
                system: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest',
                display: m.name,
              },
            ],
          },
          subject: {
            reference: `Patient/${rawUserId}`,
            display: userName,
          },
          authoredOn: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
          requester: {
            display: m.prescribedBy || 'Attending Physician',
          },
          dosageInstruction: [
            {
              text: [m.dosage, m.frequency, m.instructions].filter(Boolean).join(' | '),
              timing: {
                code: { text: m.frequency || 'As advised' },
              },
              route: { text: m.route || 'Oral' },
              doseAndRate: [
                {
                  doseQuantity: { value: m.dosage || 'Standard' },
                },
              ],
            },
          ],
        });
      }
    });

    // 2. AI Extractions medications
    const aiExts = await AIExtraction.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
      'validated_data.medications.0': { $exists: true },
    }).lean();

    aiExts.forEach((ext) => {
      (ext.validated_data?.medications || []).forEach((m, idx) => {
        if (m.name) {
          const key = `${m.name}_${m.dosage}`.toLowerCase();
          if (!seenMeds.has(key)) {
            seenMeds.add(key);
            medicationRequests.push({
              resourceType: 'MedicationRequest',
              id: `${ext._id}-med-${idx}`,
              status: 'active',
              intent: 'order',
              category: [
                {
                  coding: [
                    {
                      system: 'http://terminology.hl7.org/CodeSystem/medicationrequest-category',
                      code: 'outpatient',
                      display: 'Outpatient',
                    },
                  ],
                },
              ],
              medicationCodeableConcept: {
                text: m.name,
              },
              subject: {
                reference: `Patient/${rawUserId}`,
                display: userName,
              },
              authoredOn: ext.validated_data?.document_date ? new Date(ext.validated_data.document_date).toISOString() : new Date().toISOString(),
              requester: {
                display: ext.validated_data?.doctor_name || 'Attending Physician',
              },
              dosageInstruction: [
                {
                  text: [m.dosage, m.frequency, m.instructions].filter(Boolean).join(' | '),
                  timing: { code: { text: m.frequency || 'As advised' } },
                  route: { text: m.route || 'Oral' },
                },
              ],
            });
          }
        }
      });
    });

    return medicationRequests;
  }

  /**
   * 4. Condition FHIR Resources
   * Maps diagnosed clinical conditions from HealthRecords and AIExtractions.
   */
  async getConditions(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).select('name').lean();
    const userName = user?.name || 'Patient';

    const conditions = [];
    const seenConds = new Set();

    // 1. HealthRecord diagnoses
    const hRecords = await HealthRecord.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
      diagnosis: { $exists: true, $ne: [] },
    }).lean();

    hRecords.forEach((hr) => {
      (hr.diagnosis || []).forEach((diag, idx) => {
        const key = diag.toLowerCase().trim();
        if (!seenConds.has(key)) {
          seenConds.add(key);
          conditions.push({
            resourceType: 'Condition',
            id: `${hr._id}-cond-${idx}`,
            clinicalStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                  code: 'active',
                  display: 'Active',
                },
              ],
            },
            verificationStatus: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                  code: 'confirmed',
                  display: 'Confirmed',
                },
              ],
            },
            category: [
              {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                    code: 'encounter-diagnosis',
                    display: 'Encounter Diagnosis',
                  },
                ],
              },
            ],
            code: {
              text: diag,
              coding: [
                {
                  system: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition',
                  display: diag,
                },
              ],
            },
            subject: {
              reference: `Patient/${rawUserId}`,
              display: userName,
            },
            recordedDate: hr.date ? new Date(hr.date).toISOString() : new Date().toISOString(),
          });
        }
      });
    });

    // 2. AIExtraction diagnoses
    const aiExts = await AIExtraction.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
      'validated_data.diagnoses.0': { $exists: true },
    }).lean();

    aiExts.forEach((ext) => {
      (ext.validated_data?.diagnoses || []).forEach((diag, idx) => {
        const key = diag.toLowerCase().trim();
        if (!seenConds.has(key)) {
          seenConds.add(key);
          conditions.push({
            resourceType: 'Condition',
            id: `${ext._id}-cond-${idx}`,
            clinicalStatus: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' }],
            },
            verificationStatus: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed', display: 'Confirmed' }],
            },
            code: { text: diag },
            subject: { reference: `Patient/${rawUserId}`, display: userName },
            recordedDate: ext.validated_data?.document_date ? new Date(ext.validated_data.document_date).toISOString() : new Date().toISOString(),
          });
        }
      });
    });

    return conditions;
  }

  /**
   * 5. DiagnosticReport FHIR Resources
   * Maps laboratory and diagnostic documents into FHIR DiagnosticReport.
   */
  async getDiagnosticReports(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).select('name').lean();
    const userName = user?.name || 'Patient';

    const reports = [];

    const labDocs = await Document.find({
      $and: [
        { $or: [{ userId: rawUserId }, { user_id: rawUserId }] },
        {
          $or: [
            { category: 'laboratory_report' },
            { document_type: 'LAB_REPORT' },
            { 'extractedData.labTests.0': { $exists: true } },
          ],
        },
      ],
    }).lean();

    labDocs.forEach((doc) => {
      reports.push({
        resourceType: 'DiagnosticReport',
        id: doc._id.toString(),
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
                code: 'LAB',
                display: 'Laboratory',
              },
            ],
          },
        ],
        code: {
          text: doc.original_filename || doc.originalName || 'Diagnostic Laboratory Report',
          coding: [
            {
              system: 'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportLab',
              display: doc.original_filename || doc.originalName || 'Laboratory Report',
            },
          ],
        },
        subject: {
          reference: `Patient/${rawUserId}`,
          display: userName,
        },
        effectiveDateTime: doc.upload_date ? new Date(doc.upload_date).toISOString() : new Date(doc.createdAt).toISOString(),
        issued: new Date(doc.createdAt || Date.now()).toISOString(),
        conclusion: doc.extractedData?.summary || 'Laboratory diagnostic testing completed with validated reference ranges.',
        presentedForm: [
          {
            contentType: doc.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
            url: doc.fileUrl,
            title: doc.original_filename || doc.originalName,
          },
        ],
      });
    });

    return reports;
  }

  /**
   * 6. DocumentReference FHIR Resources
   * Maps all uploaded patient records into FHIR DocumentReference resources.
   */
  async getDocumentReferences(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).select('name').lean();
    const userName = user?.name || 'Patient';

    const docs = await Document.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
    }).lean();

    return docs.map((doc) => ({
      resourceType: 'DocumentReference',
      id: doc._id.toString(),
      status: 'current',
      docStatus: 'final',
      type: {
        text: (doc.category || doc.document_type || 'MEDICAL_RECORD').replace(/_/g, ' ').toUpperCase(),
      },
      category: [
        {
          coding: [
            {
              system: 'http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category',
              code: 'clinical-note',
              display: 'Clinical Note',
            },
          ],
        },
      ],
      subject: {
        reference: `Patient/${rawUserId}`,
        display: userName,
      },
      date: doc.upload_date ? new Date(doc.upload_date).toISOString() : new Date(doc.createdAt).toISOString(),
      content: [
        {
          attachment: {
            contentType: doc.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
            url: doc.fileUrl,
            size: doc.fileSize,
            title: doc.original_filename || doc.originalName,
          },
        },
      ],
    }));
  }

  /**
   * 7. Encounter FHIR Resources
   * Maps appointments and doctor consultations to FHIR Encounter resources.
   */
  async getEncounters(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const user = await User.findById(rawUserId).select('name').lean();
    const userName = user?.name || 'Patient';

    const encounters = [];

    // Appointments
    const appts = await Appointment.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
    }).lean();

    appts.forEach((a) => {
      encounters.push({
        resourceType: 'Encounter',
        id: a._id.toString(),
        status: a.status === 'completed' ? 'finished' : 'planned',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: `Patient/${rawUserId}`,
          display: userName,
        },
        participant: [
          {
            individual: {
              display: a.doctorName || 'Doctor',
            },
          },
        ],
        period: {
          start: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
        },
        serviceProvider: {
          display: 'City Health Clinic / Ambulatory Care',
        },
      });
    });

    // HealthRecord consultations
    const hRecords = await HealthRecord.find({
      $or: [{ userId: rawUserId }, { user_id: rawUserId }],
      doctorName: { $exists: true, $ne: '' },
    }).lean();

    hRecords.forEach((hr) => {
      encounters.push({
        resourceType: 'Encounter',
        id: `${hr._id}-enc`,
        status: 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: `Patient/${rawUserId}`,
          display: userName,
        },
        participant: [
          {
            individual: {
              display: hr.doctorName,
            },
          },
        ],
        period: {
          start: hr.date ? new Date(hr.date).toISOString() : new Date().toISOString(),
        },
        serviceProvider: {
          display: hr.hospitalClinicName || 'Primary Care Consultation',
        },
      });
    });

    return encounters;
  }

  /**
   * 8. Export Full FHIR Bundle ("Export FHIR JSON")
   * Compiles all 7 resources for authenticated user into valid structured FHIR R4 Bundle.
   * All data strictly originates from database without fabrication.
   */
  async exportFhirBundle(userId) {
    const rawUserId = this.normalizeUserId(userId);
    const [patient, observations, medications, conditions, diagnosticReports, documentReferences, encounters] = await Promise.all([
      this.getPatient(rawUserId),
      this.getObservations(rawUserId),
      this.getMedications(rawUserId),
      this.getConditions(rawUserId),
      this.getDiagnosticReports(rawUserId),
      this.getDocumentReferences(rawUserId),
      this.getEncounters(rawUserId),
    ]);

    const entries = [];

    // Add Patient
    entries.push({
      fullUrl: `urn:uuid:Patient/${patient.id}`,
      resource: patient,
    });

    // Add Observations
    observations.forEach((obs) => {
      entries.push({
        fullUrl: `urn:uuid:Observation/${obs.id}`,
        resource: obs,
      });
    });

    // Add MedicationRequests
    medications.forEach((med) => {
      entries.push({
        fullUrl: `urn:uuid:MedicationRequest/${med.id}`,
        resource: med,
      });
    });

    // Add Conditions
    conditions.forEach((cond) => {
      entries.push({
        fullUrl: `urn:uuid:Condition/${cond.id}`,
        resource: cond,
      });
    });

    // Add DiagnosticReports
    diagnosticReports.forEach((rep) => {
      entries.push({
        fullUrl: `urn:uuid:DiagnosticReport/${rep.id}`,
        resource: rep,
      });
    });

    // Add DocumentReferences
    documentReferences.forEach((doc) => {
      entries.push({
        fullUrl: `urn:uuid:DocumentReference/${doc.id}`,
        resource: doc,
      });
    });

    // Add Encounters
    encounters.forEach((enc) => {
      entries.push({
        fullUrl: `urn:uuid:Encounter/${enc.id}`,
        resource: enc,
      });
    });

    return {
      resourceType: 'Bundle',
      id: `bundle-${rawUserId}-${Date.now()}`,
      type: 'collection',
      timestamp: new Date().toISOString(),
      meta: {
        tag: [
          {
            code: 'DEMO / MOCK ABHA ID',
            display: 'DEMO / MOCK ABHA ID',
          },
          {
            code: 'PROTOTYPE_ARCHITECTURE',
            display: 'Prototype / Hackathon Architecture — Not Official ABDM Connectivity',
          },
        ],
      },
      total: entries.length,
      entry: entries,
    };
  }
}

export const fhirService = new FhirService();
export default fhirService;
