import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Download, 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Pill, 
  FileText, 
  Stethoscope, 
  Calendar, 
  User, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Eye, 
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Alert, LoadingState } from '../../components/ui';

export const FhirPage = () => {
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [observations, setObservations] = useState([]);
  const [medications, setMedications] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [diagnosticReports, setDiagnosticReports] = useState([]);
  const [documentReferences, setDocumentReferences] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [bundle, setBundle] = useState(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedJsonResource, setSelectedJsonResource] = useState(null);

  const fetchFhirData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [
        patRes,
        obsRes,
        medRes,
        condRes,
        diagRes,
        docRes,
        encRes,
        bundleRes
      ] = await Promise.all([
        api.get('/fhir/patient'),
        api.get('/fhir/observations'),
        api.get('/fhir/medications'),
        api.get('/fhir/conditions'),
        api.get('/fhir/diagnostic-reports'),
        api.get('/fhir/document-references'),
        api.get('/fhir/encounters'),
        api.get('/fhir/export')
      ]);

      setPatient(patRes);
      setObservations(obsRes.observations || obsRes.entry?.map(e => e.resource) || []);
      setMedications(medRes.medications || medRes.entry?.map(e => e.resource) || []);
      setConditions(condRes.conditions || condRes.entry?.map(e => e.resource) || []);
      setDiagnosticReports(diagRes.diagnosticReports || diagRes.entry?.map(e => e.resource) || []);
      setDocumentReferences(docRes.documentReferences || docRes.entry?.map(e => e.resource) || []);
      setEncounters(encRes.encounters || encRes.entry?.map(e => e.resource) || []);
      setBundle(bundleRes);
    } catch (err) {
      console.error('Failed to load FHIR data:', err);
      setError(err.message || 'Failed to fetch FHIR resources from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFhirData();
  }, []);

  const handleExportFhirJson = () => {
    try {
      setExporting(true);
      if (!bundle) return;
      const jsonString = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/fhir+json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `healthify_fhir_bundle_${patient?.id || 'export'}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export FHIR JSON:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyJson = (obj) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingState message="Compiling standardized FHIR R4 clinical resources from database..." />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview & Bundle', count: bundle?.total || 0, icon: Layers },
    { id: 'observations', label: 'Observations', count: observations.length, icon: Activity },
    { id: 'medications', label: 'Medications', count: medications.length, icon: Pill },
    { id: 'conditions', label: 'Conditions', count: conditions.length, icon: FileText },
    { id: 'diagnostic-reports', label: 'Diagnostic Reports', count: diagnosticReports.length, icon: Stethoscope },
    { id: 'documents', label: 'Document References', count: documentReferences.length, icon: FileText },
    { id: 'encounters', label: 'Encounters', count: encounters.length, icon: Calendar },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Health Data / FHIR
            </h1>
            <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              FHIR R4 Schema
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ABDM-ready healthcare data architecture with standardized FHIR representations directly mapped from verified records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFhirData}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          {/* Export FHIR JSON Action */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportFhirJson}
            disabled={!bundle || exporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
            icon={<Download className="w-4 h-4" />}
          >
            Export FHIR JSON
          </Button>
        </div>
      </div>

      {/* Prominent Prototype Architecture Disclaimer */}
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-amber-900 shadow-2xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="font-semibold text-amber-950 flex items-center gap-2">
              <span>Prototype / Hackathon Architecture — Not Official ABDM Connectivity</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Hackathon Prototype
              </span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              This architecture adheres strictly to India's Ayushman Bharat Digital Mission (ABDM) and NRCeS FHIR R4 clinical data specifications. 
              <strong> Notice:</strong> This is a demonstration sandbox architecture and does <em>not</em> claim official ABDM gateway integration or government accreditation. All data is scoped securely from your existing database records.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Patient FHIR Profile Card */}
      {patient && (
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50/30">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs flex-shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {patient.name?.[0]?.text || 'Patient Profile'}
                    </h2>
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full capitalize">
                      {patient.gender || 'Unknown gender'}
                    </span>
                    {patient.birthDate && (
                      <span className="text-[11px] text-slate-500">
                        DOB: {patient.birthDate}
                      </span>
                    )}
                  </div>

                  {/* Mock ABHA ID Display */}
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    <span className="text-xs text-slate-500 font-medium">ABHA Identifier:</span>
                    <span className="font-mono text-sm font-bold text-indigo-950 bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded-md tracking-wider">
                      {patient.mock_abha_id || '91-0000-0000-0000'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md">
                      {patient.mock_abha_label || 'DEMO / MOCK ABHA ID'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resource stats */}
              <div className="flex flex-wrap items-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <div className="text-center px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="block text-base font-bold text-slate-900">{bundle?.total || 0}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">Total Resources</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="block text-base font-bold text-teal-600">{observations.length}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">Observations</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="block text-base font-bold text-purple-600">{medications.length}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">Medications</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <span className="block text-base font-bold text-blue-600">{diagnosticReports.length}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-medium">Reports</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                ${isActive
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'}
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview & Bundle */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Resource Standard</span>
                <p className="text-sm font-bold text-slate-900">FHIR R4 (NRCeS Profile)</p>
                <p className="text-[11px] text-slate-500">Standardized interoperability schema for ABDM compliance.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Source Verification</span>
                <p className="text-sm font-bold text-teal-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Existing Database Records
                </p>
                <p className="text-[11px] text-slate-500">Derived strictly from uploaded documents and metrics without synthetic fabrication.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Export Compliance</span>
                <p className="text-sm font-bold text-indigo-700">Valid Structured JSON</p>
                <p className="text-[11px] text-slate-500">Bundle resource of type "collection" ready for electronic health record import.</p>
              </CardContent>
            </Card>
          </div>

          {/* Full Bundle JSON Inspector */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  FHIR R4 Bundle JSON Inspector
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete serialized bundle containing Patient, Observations, Medications, Conditions, Reports, Documents, and Encounters.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyJson(bundle)}
                  icon={copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExportFhirJson}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export FHIR JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-xl bg-slate-950 p-4 text-slate-200 overflow-x-auto max-h-[500px] border border-slate-800 font-mono text-xs leading-relaxed">
                <pre>{JSON.stringify(bundle, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: Observations */}
      {activeTab === 'observations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Laboratory & Clinical Observations ({observations.length})
            </h3>
            <span className="text-xs text-slate-500">Resource: Observation</span>
          </div>

          {observations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No laboratory observations found</p>
              <p className="text-xs text-slate-500 mt-1">Upload lab reports in the Documents tab to extract structured metrics.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {observations.map((obs) => {
                const interpCode = obs.interpretation?.[0]?.coding?.[0]?.code;
                const interpText = obs.interpretation?.[0]?.text || 'NORMAL';
                const isAbnormal = interpCode === 'H' || interpCode === 'L' || interpText.toUpperCase() === 'HIGH' || interpText.toUpperCase() === 'LOW';

                return (
                  <Card key={obs.id} className="hover:border-indigo-200 transition-colors">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block">ID: {obs.id}</span>
                          <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                            {obs.code?.text || 'Observation'}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                          isAbnormal ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
                        }`}>
                          {interpText}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-lg font-bold text-slate-900">
                          {obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit}` : obs.valueString || '—'}
                        </span>
                        {obs.referenceRange?.[0]?.text && (
                          <span className="text-xs text-slate-500">
                            (Ref: {obs.referenceRange[0].text})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                        <span>Date: {obs.effectiveDateTime ? new Date(obs.effectiveDateTime).toLocaleDateString() : '—'}</span>
                        <button
                          onClick={() => setSelectedJsonResource(obs)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View FHIR JSON
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Medications */}
      {activeTab === 'medications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Prescription Orders & Medications ({medications.length})
            </h3>
            <span className="text-xs text-slate-500">Resource: MedicationRequest</span>
          </div>

          {medications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No medication requests found</p>
              <p className="text-xs text-slate-500 mt-1">Upload prescriptions or add active medicines in the Medicines tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {medications.map((med) => (
                <Card key={med.id} className="hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">ID: {med.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {med.medicationCodeableConcept?.text || 'Medication'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {med.status || 'active'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>Dosage Instructions:</strong> {med.dosageInstruction?.[0]?.text || 'As directed'}
                    </p>

                    {med.requester?.display && (
                      <p className="text-xs text-slate-500">
                        <strong>Prescriber:</strong> {med.requester.display}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Authored: {med.authoredOn ? new Date(med.authoredOn).toLocaleDateString() : '—'}</span>
                      <button
                        onClick={() => setSelectedJsonResource(med)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View FHIR JSON
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Conditions */}
      {activeTab === 'conditions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Clinical Conditions & Diagnoses ({conditions.length})
            </h3>
            <span className="text-xs text-slate-500">Resource: Condition</span>
          </div>

          {conditions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No conditions recorded</p>
              <p className="text-xs text-slate-500 mt-1">Clinical diagnoses extracted from medical records will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conditions.map((cond) => (
                <Card key={cond.id} className="hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">ID: {cond.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {cond.code?.text || 'Diagnosis'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                        {cond.clinicalStatus?.coding?.[0]?.code || 'active'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Recorded: {cond.recordedDate ? new Date(cond.recordedDate).toLocaleDateString() : '—'}</span>
                      <button
                        onClick={() => setSelectedJsonResource(cond)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View FHIR JSON
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Diagnostic Reports */}
      {activeTab === 'diagnostic-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Diagnostic & Laboratory Reports ({diagnosticReports.length})
            </h3>
            <span className="text-xs text-slate-500">Resource: DiagnosticReport</span>
          </div>

          {diagnosticReports.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No diagnostic reports found</p>
              <p className="text-xs text-slate-500 mt-1">Upload pathology or radiology reports to generate diagnostic records.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnosticReports.map((rep) => (
                <Card key={rep.id} className="hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">ID: {rep.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {rep.code?.text || 'Diagnostic Report'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                        {rep.status || 'final'}
                      </span>
                    </div>

                    {rep.conclusion && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong>Clinical Conclusion:</strong> {rep.conclusion}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Issued: {rep.issued ? new Date(rep.issued).toLocaleDateString() : '—'}</span>
                      <button
                        onClick={() => setSelectedJsonResource(rep)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View FHIR JSON
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Document References */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Uploaded Document References ({documentReferences.length})
            </h3>
            <span className="text-xs text-slate-500">Resource: DocumentReference</span>
          </div>

          {documentReferences.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No document references found</p>
              <p className="text-xs text-slate-500 mt-1">Upload records in the Documents tab to generate FHIR DocumentReference resources.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documentReferences.map((doc) => (
                <Card key={doc.id} className="hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">ID: {doc.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {doc.description || doc.type?.text || 'Document'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.status || 'current'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      <span>Type: {doc.content?.[0]?.attachment?.contentType || 'application/pdf'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Date: {doc.date ? new Date(doc.date).toLocaleDateString() : '—'}</span>
                      <button
                        onClick={() => setSelectedJsonResource(doc)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View FHIR JSON
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Encounters */}
      {activeTab === 'encounters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Clinical Encounters & Visits ({encounters.length})
            </h3>
            <span className="text-xs text-slate-500">Resource: Encounter</span>
          </div>

          {encounters.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No encounters found</p>
              <p className="text-xs text-slate-500 mt-1">Consultations with doctors and hospital appointments will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {encounters.map((enc) => (
                <Card key={enc.id} className="hover:border-indigo-200 transition-colors">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">ID: {enc.id}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {enc.serviceProvider?.display || 'Clinical Encounter'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-teal-100 text-teal-800 border border-teal-200">
                        {enc.status || 'finished'}
                      </span>
                    </div>

                    {enc.participant?.[0]?.individual?.display && (
                      <p className="text-xs text-slate-600">
                        <strong>Doctor:</strong> {enc.participant[0].individual.display}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>Date: {enc.period?.start ? new Date(enc.period.start).toLocaleDateString() : '—'}</span>
                      <button
                        onClick={() => setSelectedJsonResource(enc)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        View FHIR JSON
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Resource JSON Viewer */}
      {selectedJsonResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedJsonResource.resourceType} Resource ({selectedJsonResource.id})
                </h3>
              </div>
              <button
                onClick={() => setSelectedJsonResource(null)}
                className="text-slate-400 hover:text-slate-700 text-lg leading-none p-1 rounded-md"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-slate-950 text-slate-100 font-mono text-xs">
              <pre>{JSON.stringify(selectedJsonResource, null, 2)}</pre>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500">Valid FHIR R4 JSON representation</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyJson(selectedJsonResource)}
                  icon={copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedJsonResource(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FhirPage;
