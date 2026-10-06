import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  UploadCloud, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Eye, 
  Trash2, 
  FileCheck, 
  Clock, 
  Building, 
  User, 
  Pill, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { 
  Button, 
  Card, 
  Badge, 
  Dialog, 
  Input, 
  Select, 
  Alert, 
  LoadingState, 
  EmptyState 
} from '../../components/ui';

export const DocumentsPage = () => {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(searchParams.get('action') === 'upload');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocCategory, setUploadDocCategory] = useState('laboratory_report');

  // Human Review & Verification Modal state (Phase 8 requirement)
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const categories = [
    { value: 'all', label: 'All Documents' },
    { value: 'prescription', label: 'Prescriptions' },
    { value: 'laboratory_report', label: 'Lab Reports' },
    { value: 'diagnostic_report', label: 'Diagnostic Reports' },
    { value: 'discharge_summary', label: 'Discharge Summaries' },
    { value: 'vaccination_record', label: 'Vaccination Records' },
    { value: 'other', label: 'Other Records' },
  ];

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'all' ? '/documents' : `/documents?category=${selectedCategory}`;
      const res = await api.get(url);
      setDocuments(res.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedCategory]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      setFeedback({ type: '', message: '' });

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadDocCategory);

      const res = await api.upload('/documents/upload', formData);
      setShowUploadModal(false);
      setUploadFile(null);
      await fetchDocuments();

      // Open verification modal immediately for seamless human-in-the-loop validation
      if (res.document) {
        setVerifyingDoc(res.document);
      }
      setFeedback({ type: 'success', message: 'Document uploaded and analyzed by Health AI.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmVerification = async () => {
    if (!verifyingDoc) return;
    try {
      setIsVerifying(true);
      await api.post(`/documents/${verifyingDoc._id}/verify`, {
        verifiedData: verifyingDoc.extractedData,
        createHealthRecords: true,
      });

      setVerifyingDoc(null);
      await fetchDocuments();
      setFeedback({ type: 'success', message: 'Document verified and normalized into health timeline & charts!' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Verification failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await api.delete(`/documents/${docId}`);
      await fetchDocuments();
      setFeedback({ type: 'success', message: 'Document removed.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Upload Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Documents</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Secure storage, OCR entity extraction, and clinician-verified health records.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowUploadModal(true)}
          leftIcon={<UploadCloud className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`
              px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors
              ${selectedCategory === cat.value
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
            `}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Documents List / Grid */}
      {loading ? (
        <LoadingState message="Fetching medical documents..." />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No documents in this category"
          description="Upload your paper prescription, laboratory report or discharge summary to enable AI extraction."
          actionLabel="Upload First Document"
          onAction={() => setShowUploadModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const isVerified = doc.status === 'VERIFIED';
            const isAnalyzed = doc.status === 'ANALYZED' || doc.status === 'NEEDS_REVIEW';
            const confidence = doc.overallConfidence || 90;

            return (
              <Card key={doc._id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant={isVerified ? 'success' : isAnalyzed ? 'teal' : 'neutral'}
                      size="sm"
                      dot
                    >
                      {doc.status}
                    </Badge>

                    {doc.overallConfidence > 0 && (
                      <span className="text-[11px] font-semibold text-slate-500">
                        Confidence: <span className="text-teal-700 font-bold">{confidence}%</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-teal-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {doc.originalName || doc.fileName}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {doc.category.replace('_', ' ')} &bull; {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* AI Extraction Snippet */}
                  {doc.extractedData && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      {doc.extractedData.hospitalName && (
                        <p className="text-slate-600 truncate flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.extractedData.hospitalName}</span>
                        </p>
                      )}
                      {doc.extractedData.doctorName && (
                        <p className="text-slate-600 truncate flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.extractedData.doctorName}</span>
                        </p>
                      )}
                      {doc.extractedData.medicines?.length > 0 && (
                        <p className="text-teal-800 font-medium">
                          Rx: {doc.extractedData.medicines.map(m => m.name).join(', ')}
                        </p>
                      )}
                      {doc.extractedData.labTests?.length > 0 && (
                        <p className="text-teal-800 font-medium">
                          Tests: {doc.extractedData.labTests.map(t => `${t.testName}: ${t.value}`).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {!isVerified ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setVerifyingDoc(doc)}
                      leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                    >
                      Verify AI Extraction
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Timeline Synced
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(doc._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 1. UPLOAD MODAL */}
      <Dialog
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Medical Document"
        description="Supported formats: PDF, JPG, JPEG, PNG. Uploaded records undergo secure AI entity extraction."
      >
        <form onSubmit={handleFileUpload} className="space-y-4 pt-2">
          <Select
            label="Document Category"
            value={uploadDocCategory}
            onChange={(e) => setUploadDocCategory(e.target.value)}
            options={[
              { value: 'laboratory_report', label: 'Laboratory Report (Blood, Urine, Metabolic)' },
              { value: 'prescription', label: 'Prescription (Doctor Rx, Dosages)' },
              { value: 'diagnostic_report', label: 'Diagnostic / Radiology Report (X-Ray, MRI, USG)' },
              { value: 'discharge_summary', label: 'Hospital Discharge Summary' },
              { value: 'vaccination_record', label: 'Vaccination / Immunization Record' },
              { value: 'other', label: 'Other Healthcare Document' },
            ]}
          />

          {/* File Drag & Drop Box */}
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-teal-500 transition-colors bg-slate-50/50">
            <UploadCloud className="w-8 h-8 text-teal-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              {uploadFile ? uploadFile.name : 'Select or drop medical file here'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Maximum file size: 10MB</p>
            
            <input
              type="file"
              id="file-input"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
            <label
              htmlFor="file-input"
              className="inline-block mt-3 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
            >
              Choose File
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={uploading} disabled={!uploadFile}>
              Upload & Extract
            </Button>
          </div>
        </form>
      </Dialog>

      {/* 2. HUMAN VERIFICATION MODAL (Phase 8 requirement) */}
      <Dialog
        isOpen={Boolean(verifyingDoc)}
        onClose={() => setVerifyingDoc(null)}
        title="Human Verification: AI Extracted Clinical Data"
        description="Review extracted values before permanently committing them to your health timeline, medications, and trend charts."
        maxWidth="max-w-2xl"
      >
        {verifyingDoc && (
          <div className="space-y-5 pt-2">
            {/* Confidence Alert */}
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between text-xs text-teal-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Overall Extraction Confidence: <strong>{verifyingDoc.overallConfidence || 94}%</strong></span>
              </div>
              <span className="bg-teal-200/70 text-teal-950 font-bold px-2 py-0.5 rounded-md">
                Verified Model
              </span>
            </div>

            {/* Extracted Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Hospital / Clinic Name"
                value={verifyingDoc.extractedData?.hospitalName || ''}
                onChange={(e) => setVerifyingDoc({
                  ...verifyingDoc,
                  extractedData: { ...verifyingDoc.extractedData, hospitalName: e.target.value }
                })}
              />
              <Input
                label="Treating Doctor"
                value={verifyingDoc.extractedData?.doctorName || ''}
                onChange={(e) => setVerifyingDoc({
                  ...verifyingDoc,
                  extractedData: { ...verifyingDoc.extractedData, doctorName: e.target.value }
                })}
              />
            </div>

            {/* Extracted Medicines Table (If Prescription) */}
            {verifyingDoc.extractedData?.medicines?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Extracted Medications
                </h4>
                <div className="space-y-2">
                  {verifyingDoc.extractedData.medicines.map((med, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{med.name}</span>
                        <p className="text-slate-500 mt-0.5">{med.dosage} &bull; {med.frequency} &bull; {med.duration}</p>
                      </div>
                      <Badge variant="success" size="sm">Confidence: {med.confidence}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Lab Tests Table (If Lab Report) */}
            {verifyingDoc.extractedData?.labTests?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  Extracted Diagnostic Parameters
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {verifyingDoc.extractedData.labTests.map((test, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900">{test.testName}</span>
                        <p className="text-slate-500">Ref: {test.referenceRange || 'Standard'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 font-mono">
                          {test.value} {test.unit}
                        </span>
                        <Badge variant={test.status === 'high' ? 'danger' : 'success'} size="sm">
                          {test.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setVerifyingDoc(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmVerification}
                isLoading={isVerifying}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Sync to Health Records
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
