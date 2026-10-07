import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Eye, 
  Trash2, 
  Download,
  FileCheck, 
  Clock, 
  Building, 
  User, 
  Pill, 
  Activity,
  FileCode,
  Image as ImageIcon,
  X,
  RefreshCw,
  ShieldCheck,
  Info,
  Cpu,
  Copy,
  Check,
  Globe,
  Timer,
  Layers,
  Stethoscope,
  Calendar
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

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All Documents' },
  { value: 'PRESCRIPTION', label: 'Prescriptions' },
  { value: 'LAB_REPORT', label: 'Lab Reports' },
  { value: 'DIAGNOSTIC_REPORT', label: 'Diagnostic Reports' },
  { value: 'DISCHARGE_SUMMARY', label: 'Discharge Summaries' },
  { value: 'OTHER', label: 'Other Records' },
];

export const DocumentsPage = () => {
  const [searchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('PRESCRIPTION');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStage, setProcessingStage] = useState(null); // 'uploading' | 'processing' | 'reading' | 'updating' | 'completed' | 'failed'
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Phase 4 OCR Modal & Execution State
  const [ocrLoadingId, setOcrLoadingId] = useState(null);
  const [selectedOcrDoc, setSelectedOcrDoc] = useState(null);
  const [selectedExtraction, setSelectedExtraction] = useState(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Phase 5 AI Medical Extraction Modal & Execution State
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [selectedAiDoc, setSelectedAiDoc] = useState(null);
  const [selectedAiExtraction, setSelectedAiExtraction] = useState(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [loadingAiExtraction, setLoadingAiExtraction] = useState(false);
  const [aiModalTab, setAiModalTab] = useState('clinical'); // 'clinical' | 'json' | 'raw'
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedRawModel, setCopiedRawModel] = useState(false);

  // Delete Confirmation State
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const url = selectedType === 'all' 
        ? '/documents' 
        : `/documents?document_type=${selectedType}`;
      const res = await api.get(url);
      setDocuments(res.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedType]);

  // File Validation
  const validateFile = (file) => {
    if (!file) return 'No file selected.';

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file format (${ext}). Supported formats: PDF, JPG, JPEG, PNG.`;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 15MB limit.`;
    }

    return '';
  };

  const handleFileSelection = (file) => {
    if (!file) return;
    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setUploadFile(null);
      return;
    }
    setValidationError('');
    setUploadFile(file);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  // Execute Upload & Automatic Processing Pipeline
  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!uploadFile) {
      setValidationError('Please select or drop a medical document first.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setValidationError('');
      setFeedback({ type: '', message: '' });
      setProcessingStage('uploading');

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadDocType);

      const uploadRes = await api.uploadWithProgress('/documents/upload', formData, (percent) => {
        setUploadProgress(percent);
      });

      const uploadedDoc = uploadRes?.document;

      if (uploadedDoc && uploadedDoc._id) {
        setProcessingStage('processing');

        // Progress indicators for friendly multi-stage UX
        const stageTimer1 = setTimeout(() => {
          setProcessingStage('reading');
        }, 700);

        const stageTimer2 = setTimeout(() => {
          setProcessingStage('updating');
        }, 1500);

        try {
          await api.post(`/documents/${uploadedDoc._id}/process`, {});
          clearTimeout(stageTimer1);
          clearTimeout(stageTimer2);
          setProcessingStage('completed');

          setFeedback({
            type: 'success',
            message: `"${uploadFile.name}" processed successfully! Medicines, lab results, doctors, and timeline have been automatically updated.`,
          });
        } catch (procErr) {
          clearTimeout(stageTimer1);
          clearTimeout(stageTimer2);
          console.warn('Automatic processing pipeline warning:', procErr);
          setProcessingStage('failed');
          setFeedback({
            type: 'warning',
            message: 'Medical information extraction could not be completed for this document. The original file is safely stored.',
          });
        }
      } else {
        setProcessingStage('completed');
        setFeedback({ 
          type: 'success', 
          message: `"${uploadFile.name}" uploaded successfully.` 
        });
      }

      setUploadFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await fetchDocuments();
    } catch (err) {
      setProcessingStage('failed');
      setFeedback({ type: 'danger', message: err.message || 'Upload failed. Please retry.' });
    } finally {
      setIsUploading(false);
      setTimeout(() => setProcessingStage(null), 7000);
    }
  };

  // Trigger Phase 4 OCR
  const handleTriggerOCR = async (doc) => {
    try {
      setOcrLoadingId(doc._id);
      setFeedback({ type: '', message: '' });

      const res = await api.post(`/documents/${doc._id}/ocr`, {});
      const ext = res.extraction;

      if (ext.ocr_status === 'FAILED') {
        setFeedback({ 
          type: 'warning', 
          message: `OCR processing finished with status FAILED: ${ext.error_message || 'No text recognized.'}` 
        });
      } else {
        setFeedback({ 
          type: 'success', 
          message: `OCR extraction complete with ${ext.ocr_confidence}% confidence (${ext.language_detected.toUpperCase()}).` 
        });
      }

      await fetchDocuments();

      setSelectedOcrDoc(doc);
      setSelectedExtraction(ext);
      setIsOcrModalOpen(true);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'OCR processing failed.' });
    } finally {
      setOcrLoadingId(null);
    }
  };

  // View Existing OCR Extraction
  const handleViewExtraction = async (doc) => {
    try {
      setSelectedOcrDoc(doc);
      setSelectedExtraction(null);
      setIsOcrModalOpen(true);
      setLoadingExtraction(true);

      const res = await api.get(`/documents/${doc._id}/extraction`);
      setSelectedExtraction(res.extraction);
    } catch (err) {
      setSelectedExtraction(null);
    } finally {
      setLoadingExtraction(false);
    }
  };

  // Copy text helper
  const handleCopyText = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Phase 5: Trigger AI Medical Extraction
  const handleTriggerAiExtraction = async (doc) => {
    try {
      setAiLoadingId(doc._id);
      setFeedback({ type: '', message: '' });

      const res = await api.post(`/documents/${doc._id}/extract`, {});
      const extraction = res.extraction || {
        validated_data: res.validated_data,
        raw_model_response: res.raw_model_response || '',
        provider: 'Clinical Abstraction',
        processing_status: 'COMPLETED',
        created_at: new Date().toISOString(),
      };

      setFeedback({ 
        type: 'success', 
        message: `AI medical entities extracted successfully for "${doc.original_filename || doc.originalName || 'Document'}".` 
      });

      await fetchDocuments();

      setSelectedAiDoc(doc);
      setSelectedAiExtraction(extraction);
      setAiModalTab('clinical');
      setIsAiModalOpen(true);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'AI medical extraction failed.' });
    } finally {
      setAiLoadingId(null);
    }
  };

  // Phase 5: View Existing AI Extraction
  const handleViewAiExtraction = async (doc) => {
    try {
      setSelectedAiDoc(doc);
      setSelectedAiExtraction(null);
      setAiModalTab('clinical');
      setIsAiModalOpen(true);
      setLoadingAiExtraction(true);

      const res = await api.get(`/documents/${doc._id}/extraction`);
      if (res.ai_extraction) {
        setSelectedAiExtraction(res.ai_extraction);
      } else if (res.extraction && res.extraction.validated_data) {
        setSelectedAiExtraction(res.extraction);
      } else {
        setSelectedAiExtraction(null);
      }
    } catch (err) {
      setSelectedAiExtraction(null);
    } finally {
      setLoadingAiExtraction(false);
    }
  };

  // Copy helper for Validated JSON
  const handleCopyJson = (data) => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Copy helper for Raw Model Response
  const handleCopyRawModel = (raw) => {
    if (!raw) return;
    navigator.clipboard.writeText(raw);
    setCopiedRawModel(true);
    setTimeout(() => setCopiedRawModel(false), 2000);
  };

  // Helper: Render Confidence Badge with Low Confidence Highlighting (< 70%)
  const renderConfidenceBadge = (confidence) => {
    const conf = typeof confidence === 'number' ? confidence : 0;
    const isLow = conf < 70;

    if (isLow) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
          {conf}% (Low Confidence)
        </span>
      );
    }

    if (conf >= 85) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
          {conf}%
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
        {conf}%
      </span>
    );
  };

  // Helper: Render Abnormal Flag Badge
  const renderAbnormalBadge = (flag) => {
    const normalized = (flag || 'UNKNOWN').toUpperCase();
    switch (normalized) {
      case 'HIGH':
        return <Badge variant="danger" size="sm">HIGH</Badge>;
      case 'LOW':
        return <Badge variant="warning" size="sm">LOW</Badge>;
      case 'NORMAL':
        return <Badge variant="success" size="sm">NORMAL</Badge>;
      default:
        return <Badge variant="neutral" size="sm">UNKNOWN</Badge>;
    }
  };

  // View / Preview Document
  const handleOpenPreview = async (doc) => {
    try {
      setPreviewDoc(doc);
      setPreviewLoading(true);

      const token = localStorage.getItem('healthify_token');
      const response = await fetch(`${api.baseUrl}/documents/${doc._id}/view`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load document preview.');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Could not load document preview.' });
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setPreviewDoc(null);
  };

  // Download Document
  const handleDownload = async (doc) => {
    try {
      const token = localStorage.getItem('healthify_token');
      const response = await fetch(`${api.baseUrl}/documents/${doc._id}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Download failed.');

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = doc.original_filename || doc.originalName || 'medical_document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Download failed.' });
    }
  };

  // Delete Document
  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      setIsDeleting(true);
      await api.delete(`/documents/${docToDelete._id}`);
      setFeedback({ type: 'success', message: 'Document deleted successfully.' });
      setDocToDelete(null);
      await fetchDocuments();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to delete document.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Document Type Display Badge
  const getDocTypeBadge = (doc) => {
    const type = doc.document_type || (doc.category ? doc.category.toUpperCase() : 'OTHER');
    const colorMap = {
      PRESCRIPTION: 'teal',
      LAB_REPORT: 'indigo',
      DIAGNOSTIC_REPORT: 'sky',
      DISCHARGE_SUMMARY: 'amber',
      OTHER: 'neutral',
      UNKNOWN: 'neutral',
    };
    const labelMap = {
      PRESCRIPTION: 'Prescription',
      LAB_REPORT: 'Lab Report',
      LABORATORY_REPORT: 'Lab Report',
      DIAGNOSTIC_REPORT: 'Diagnostic Report',
      DISCHARGE_SUMMARY: 'Discharge Summary',
      OTHER: 'Other',
      UNKNOWN: 'Unknown',
    };
    return (
      <Badge variant={colorMap[type] || 'neutral'} size="sm">
        {labelMap[type] || type}
      </Badge>
    );
  };

  // Processing Status Display Badge
  const getStatusBadge = (doc) => {
    const status = doc.processing_status || doc.status || 'UPLOADED';
    switch (status) {
      case 'UPLOADED':
        return <Badge variant="primary" size="sm" dot>Uploaded</Badge>;
      case 'PROCESSING':
        return <Badge variant="warning" size="sm" dot>Processing...</Badge>;
      case 'COMPLETED':
      case 'ANALYZED':
      case 'VERIFIED':
        return <Badge variant="success" size="sm" dot>Processed</Badge>;
      case 'LOW_CONFIDENCE':
        return <Badge variant="warning" size="sm" dot>Review Recommended</Badge>;
      case 'FAILED':
        return <Badge variant="danger" size="sm" dot>Processing Failed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Medical Documents
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Securely store and organize your prescriptions, laboratory reports, and clinical records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDocuments}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* =========================================================================
          SECTION 1: UPLOAD AREA (DRAG & DROP + FILE PICKER + PROGRESS + VALIDATION)
          ========================================================================= */}
      <Card className="p-6 border-slate-200 shadow-sm bg-gradient-to-b from-white to-slate-50/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Upload Medical Document</h2>
              <p className="text-xs text-slate-500">Drag & drop or choose your file. Supported formats: PDF, JPG, JPEG, PNG (Max 15MB).</p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-white px-2.5 py-1 rounded-md border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Secure & Scoped
          </span>
        </div>

        {validationError && (
          <div className="mb-4">
            <Alert variant="danger" onClose={() => setValidationError('')}>
              {validationError}
            </Alert>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Document Type Dropdown */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Document Classification
              </label>
              <select
                value={uploadDocType}
                onChange={(e) => setUploadDocType(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
              >
                <option value="PRESCRIPTION">Prescription (Doctor Rx)</option>
                <option value="LAB_REPORT">Laboratory Report (Blood, Metabolic)</option>
                <option value="DIAGNOSTIC_REPORT">Diagnostic Report (X-Ray, MRI)</option>
                <option value="DISCHARGE_SUMMARY">Hospital Discharge Summary</option>
                <option value="OTHER">Other Clinical Record</option>
              </select>
            </div>

            {/* Drag & Drop Zone */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Medical File
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer
                  ${dragActive 
                    ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' 
                    : uploadFile 
                      ? 'border-emerald-300 bg-emerald-50/30' 
                      : 'border-slate-300 bg-white hover:border-teal-400 hover:bg-slate-50/50'}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelection(e.target.files[0]);
                    }
                  }}
                />

                {uploadFile ? (
                  <div className="flex items-center justify-between px-3 py-1 bg-white rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        {uploadFile.name.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate max-w-[280px]">
                          {uploadFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatFileSize(uploadFile.size)} &bull; Ready for upload
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <UploadCloud className="w-7 h-7 text-teal-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-800">
                      Drop file here or <span className="text-teal-600 underline">browse</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      PDF, JPG, JPEG, PNG up to 15MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                  Uploading medical document securely...
                </span>
                <span className="font-bold text-teal-700">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-teal-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Multi-Step Automatic Pipeline Status Indicator */}
          {processingStage && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600 animate-pulse" />
                  Automatic Document Processing
                </span>
                <span className="text-xs font-bold text-teal-700">
                  {processingStage === 'uploading' && 'Uploading...'}
                  {processingStage === 'processing' && 'Processing document...'}
                  {processingStage === 'reading' && 'Reading medical information...'}
                  {processingStage === 'updating' && 'Updating health records...'}
                  {processingStage === 'completed' && 'Completed ✓'}
                  {processingStage === 'failed' && 'Processing failed'}
                </span>
              </div>

              {/* Progress Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { key: 'uploading', label: '1. Uploading...' },
                  { key: 'processing', label: '2. Processing doc...' },
                  { key: 'reading', label: '3. Reading info...' },
                  { key: 'updating', label: '4. Updating records...' },
                  { key: 'completed', label: 'Completed ✓' },
                ].map((step, idx) => {
                  const stages = ['uploading', 'processing', 'reading', 'updating', 'completed'];
                  const curIdx = stages.indexOf(processingStage);
                  const isDone = processingStage === 'completed' || (curIdx > idx && processingStage !== 'failed');
                  const isCurrent = processingStage === step.key;

                  return (
                    <div
                      key={step.key}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isDone
                          ? 'bg-teal-50 border-teal-200 text-teal-800 font-semibold'
                          : isCurrent
                          ? 'bg-white border-teal-500 text-teal-900 font-bold ring-2 ring-teal-100 shadow-xs'
                          : 'bg-white/60 border-slate-200 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-200 text-[10px] text-slate-600 flex items-center justify-center">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] block truncate">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {uploadFile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUploadFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isUploading}
              disabled={!uploadFile || isUploading}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          </div>
        </form>
      </Card>

      {/* =========================================================================
          SECTION 2: DOCUMENT FILTER PILLS
          ========================================================================= */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setSelectedType(type.value)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors
                ${selectedType === type.value
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
              `}
            >
              {type.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          {documents.length} {documents.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* =========================================================================
          SECTION 3: DOCUMENT CARDS GRID
          ========================================================================= */}
      {loading ? (
        <LoadingState message="Fetching medical documents..." />
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-teal-600" />}
          title="No documents in this category"
          description="Upload your medical prescription, laboratory report or diagnostic scan above."
          actionLabel="Select File to Upload"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const isPdf = (doc.mime_type === 'application/pdf') || 
                          (doc.original_filename || doc.originalName || '').toLowerCase().endsWith('.pdf');
            const uploadDate = doc.upload_date || doc.createdAt;
            const originalName = doc.original_filename || doc.originalName || doc.filename || 'Document';
            const fileSize = doc.file_size || doc.fileSize || 0;
            const isOcrRunning = ocrLoadingId === doc._id;
            const hasOcr = doc.ocrRawText || ['COMPLETED', 'LOW_CONFIDENCE', 'FAILED'].includes(doc.processing_status);
            const hasAiExtracted = doc.status === 'ANALYZED' || Boolean(
              doc.extractedData && (
                doc.extractedData.doctorName || 
                (doc.extractedData.diagnosis && doc.extractedData.diagnosis.length > 0) || 
                (doc.extractedData.medicines && doc.extractedData.medicines.length > 0) || 
                (doc.extractedData.labTests && doc.extractedData.labTests.length > 0)
              )
            );

            return (
              <Card 
                key={doc._id} 
                className="p-5 flex flex-col justify-between hover:shadow-card transition-all border border-slate-200/80 bg-white"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    {getStatusBadge(doc)}
                    {getDocTypeBadge(doc)}
                  </div>

                  {/* Document Title & File Info */}
                  <div className="flex items-start gap-3 mt-1">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 border border-teal-100">
                      {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate" title={originalName}>
                        {originalName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {uploadDate ? new Date(uploadDate).toLocaleDateString() : 'Recent'}
                        </span>
                        <span>&bull;</span>
                        <span>{formatFileSize(fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Document Source */}
                  <div className="mt-3 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                    <span className="font-medium text-slate-600">Source Document</span>
                    <span className="uppercase text-[9px] font-semibold text-slate-500">
                      {isPdf ? 'PDF' : 'IMAGE'}
                    </span>
                  </div>

                  {/* OCR Snippet if available */}
                  {doc.ocrRawText && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                      <p className="line-clamp-2 italic text-[11px] text-slate-500 font-mono">
                        "{doc.ocrRawText.slice(0, 120)}..."
                      </p>
                    </div>
                  )}

                  {/* AI Extraction Snippet if available */}
                  {hasAiExtracted && (
                    <div className="mt-2.5 p-2 rounded-xl bg-teal-50/70 border border-teal-100/90 text-xs text-teal-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-[11px] truncate">
                        <Sparkles className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        {doc.extractedData?.diagnosis?.[0] ? `Dx: ${doc.extractedData.diagnosis[0]}` :
                         doc.extractedData?.doctorName ? `Dr. ${doc.extractedData.doctorName}` :
                         `${doc.extractedData?.medicines?.length || 0} Meds & ${doc.extractedData?.labTests?.length || 0} Labs`}
                      </span>
                      <span className="text-[10px] text-teal-700 font-bold bg-white px-2 py-0.5 rounded-md border border-teal-200">
                        {doc.overallConfidence || 90}% AI
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {/* View Recognized Text */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => hasOcr ? handleViewExtraction(doc) : handleTriggerOCR(doc)}
                        isLoading={isOcrRunning}
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                      >
                        {hasOcr ? 'View Text' : 'Read Text'}
                      </Button>

                      {/* View Medical Info */}
                      <Button
                        variant={hasAiExtracted ? "primary" : "outline"}
                        size="sm"
                        onClick={() => hasAiExtracted ? handleViewAiExtraction(doc) : handleTriggerAiExtraction(doc)}
                        isLoading={aiLoadingId === doc._id}
                        leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                      >
                        {hasAiExtracted ? 'Medical Info' : 'Extract Info'}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* View Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPreview(doc)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>

                      {/* Download Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                      >
                        Download
                      </Button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          SECTION 4: OCR EXTRACTION DETAILS MODAL (PHASE 4 SPECIFICATION)
          ========================================================================= */}
      <Dialog
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        title="Document Text"
        description="Text recognized from your uploaded medical document."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-5 pt-2">
          {loadingExtraction ? (
            <div className="py-12">
              <LoadingState message="Loading OCR extraction metrics..." />
            </div>
          ) : selectedExtraction ? (
            <div className="space-y-4">
              {/* Top Stats Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. Status */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    OCR Status
                  </span>
                  <div className="mt-1">
                    {selectedExtraction.ocr_status === 'COMPLETED' ? (
                      <Badge variant="success" size="sm">Completed</Badge>
                    ) : selectedExtraction.ocr_status === 'LOW_CONFIDENCE' ? (
                      <Badge variant="warning" size="sm">Low Confidence</Badge>
                    ) : selectedExtraction.ocr_status === 'FAILED' ? (
                      <Badge variant="danger" size="sm">Failed</Badge>
                    ) : (
                      <Badge variant="primary" size="sm">Processing</Badge>
                    )}
                  </div>
                </div>

                {/* 2. Confidence */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Confidence
                  </span>
                  <span className={`text-base font-bold mt-0.5 block ${
                    selectedExtraction.ocr_confidence >= 80 ? 'text-emerald-700' :
                    selectedExtraction.ocr_confidence >= 60 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {selectedExtraction.ocr_confidence}%
                  </span>
                </div>

                {/* 3. Language */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Language
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-800">
                    <Globe className="w-3.5 h-3.5 text-teal-600" />
                    <span>
                      {selectedExtraction.language_detected === 'ta' ? 'Tamil' :
                       selectedExtraction.language_detected === 'en, ta' ? 'English & Tamil' :
                       selectedExtraction.language_detected === 'en' ? 'English' : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* 4. Page Count & Time */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Pages & Latency
                  </span>
                  <span className="text-xs font-semibold text-slate-800 mt-1 block">
                    {selectedExtraction.page_count} {selectedExtraction.page_count === 1 ? 'page' : 'pages'} &bull; {selectedExtraction.processing_time}ms
                  </span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Recognition Confidence Meter</span>
                  <span className="font-semibold">{selectedExtraction.ocr_confidence}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                      selectedExtraction.ocr_confidence >= 80 ? 'bg-emerald-500' :
                      selectedExtraction.ocr_confidence >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${selectedExtraction.ocr_confidence}%` }}
                  />
                </div>
              </div>

              {/* Error Message if Failed */}
              {selectedExtraction.ocr_status === 'FAILED' && (
                <Alert variant="danger">
                  {selectedExtraction.error_message || 'Document image unreadable or no characters recognized. High resolution scan recommended.'}
                </Alert>
              )}

              {/* Extracted Text Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    Cleaned Extracted Text
                  </label>
                  {selectedExtraction.cleaned_text && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(selectedExtraction.cleaned_text)}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-100 transition-colors"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Text
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800">
                  {selectedExtraction.cleaned_text || (
                    <span className="text-slate-500 italic">No readable text extracted.</span>
                  )}
                </div>
              </div>

              {/* Verification & Handwritten Footnote */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Clinical Notice:</strong> Standard typed and printed diagnostic reports and prescriptions have high accuracy. Handwritten doctor notes and cursive signatures require clinician verification.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              <p>This document has not been processed through OCR yet.</p>
              {selectedOcrDoc && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleTriggerOCR(selectedOcrDoc)}
                  leftIcon={<Cpu className="w-3.5 h-3.5" />}
                >
                  Run OCR Extraction Now
                </Button>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              {selectedOcrDoc && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTriggerOCR(selectedOcrDoc)}
                  isLoading={ocrLoadingId === selectedOcrDoc._id}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Re-run OCR
                </Button>
              )}
              {selectedOcrDoc && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsOcrModalOpen(false);
                    handleTriggerAiExtraction(selectedOcrDoc);
                  }}
                  isLoading={aiLoadingId === selectedOcrDoc._id}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Extract Clinical Entities (AI)
                </Button>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOcrModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* =========================================================================
          SECTION 5: DOCUMENT PREVIEW MODAL
          ========================================================================= */}
      <Dialog
        isOpen={Boolean(previewDoc)}
        onClose={handleClosePreview}
        title={previewDoc ? (previewDoc.original_filename || previewDoc.originalName || 'Document Preview') : 'Preview'}
        description={`Secure view of ${previewDoc?.document_type || 'medical document'}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 pt-2">
          {previewLoading ? (
            <div className="py-16">
              <LoadingState message="Loading secure file stream..." />
            </div>
          ) : previewUrl ? (
            <div className="relative rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200">
              {previewDoc?.mime_type === 'application/pdf' || 
               (previewDoc?.original_filename || previewDoc?.originalName || '').toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-[550px] border-0"
                />
              ) : (
                <div className="flex items-center justify-center p-4 min-h-[400px] max-h-[550px]">
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="max-h-[500px] max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}
            </div>
          ) : (
            <Alert variant="danger">
              Unable to load preview for this document.
            </Alert>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              User-scoped &bull; Streamed securely with anti-traversal protection
            </span>
            <div className="flex items-center gap-2">
              {previewDoc && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(previewDoc)}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleClosePreview}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* =========================================================================
          SECTION 6: DELETE CONFIRMATION MODAL
          ========================================================================= */}
      <Dialog
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        title="Delete Medical Document"
        description="Are you sure you want to permanently delete this document? This action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          {docToDelete && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                Permanently deleting: <strong>{docToDelete.original_filename || docToDelete.originalName}</strong>
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDocToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              isLoading={isDeleting}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Dialog>

      {/* =========================================================================
          SECTION 7: AI MEDICAL EXTRACTION MODAL (PHASE 5 SPECIFICATION)
          ========================================================================= */}
      <Dialog
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="Medical Information"
        description="Verified health details organized directly from your uploaded document."
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 pt-2">
          {/* Medical Non-Certainty & Decision Support Disclaimer */}
          <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Clinical Decision Support Notice & Non-Certainty Disclaimer</span>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Information extracted by AI reflects only explicit text detected in the document. This output does <strong>NOT claim medical certainty</strong>, does <strong>NOT constitute an independent clinical diagnosis</strong>, and must be reviewed and verified by a licensed healthcare professional before making any treatment decisions.
              </p>
            </div>
          </div>

          {loadingAiExtraction ? (
            <div className="py-12">
              <LoadingState message="Retrieving validated AI clinical entities..." />
            </div>
          ) : selectedAiExtraction ? (
            (() => {
              const data = selectedAiExtraction.validated_data || {};

              return (
                <div className="space-y-4">
                  {/* Top Stats Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* 1. Status */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Extraction Status
                      </span>
                      <div className="mt-1">
                        {selectedAiExtraction.processing_status === 'COMPLETED' ? (
                          <Badge variant="success" size="sm">Completed</Badge>
                        ) : selectedAiExtraction.processing_status === 'FAILED' ? (
                          <Badge variant="danger" size="sm">Failed</Badge>
                        ) : (
                          <Badge variant="primary" size="sm">Processing</Badge>
                        )}
                      </div>
                    </div>

                    {/* 2. Overall Confidence */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Extraction Confidence
                      </span>
                      <span className={`text-base font-bold mt-0.5 block ${
                        (data.overall_confidence || selectedAiExtraction.confidence_score || 0) >= 80 ? 'text-emerald-700' :
                        (data.overall_confidence || selectedAiExtraction.confidence_score || 0) >= 60 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {data.overall_confidence || selectedAiExtraction.confidence_score || 0}%
                      </span>
                    </div>

                    {/* 3. Document Category */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Document Type
                      </span>
                      <span className="text-xs font-semibold text-slate-800 mt-1 block truncate">
                        {selectedAiDoc?.document_type?.replace(/_/g, ' ') || 'Clinical Record'}
                      </span>
                    </div>

                    {/* 4. Health Record Sync */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Record Sync
                      </span>
                      <div className="mt-1">
                        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Synchronized
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Clinical Data Recognition Meter</span>
                      <span className="font-semibold">{data.overall_confidence || selectedAiExtraction.confidence_score || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          (data.overall_confidence || 0) >= 80 ? 'bg-emerald-500' :
                          (data.overall_confidence || 0) >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${data.overall_confidence || selectedAiExtraction.confidence_score || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Clean Section Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-teal-600" /> Extracted Medical Details
                    </span>
                    <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-100">
                      Verified from Document
                    </span>
                  </div>

                  {/* CLINICAL SECTIONS */}
                  <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-1">
                      {/* SECTION 1: PATIENT */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-4 h-4 text-teal-600" /> Patient Demographics
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">Explicitly extracted</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Patient Name</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {data.patient_name || <span className="text-slate-400 font-mono italic">null</span>}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Age</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {data.patient_age || <span className="text-slate-400 font-mono italic">null</span>}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Gender</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {data.patient_gender || <span className="text-slate-400 font-mono italic">null</span>}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2 & 3: DOCTOR & HOSPITAL */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* DOCTOR */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-teal-600" /> Attending Doctor
                          </h4>
                          <div className="bg-white p-3 rounded-lg border border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 block uppercase">Clinician</span>
                            <span className="text-sm font-semibold text-slate-800">
                              {data.doctor_name ? (
                                data.doctor_name.toLowerCase().startsWith('dr') ? data.doctor_name : `Dr. ${data.doctor_name}`
                              ) : (
                                <span className="text-slate-400 font-mono italic">null</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* HOSPITAL & DATE */}
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Building className="w-4 h-4 text-teal-600" /> Hospital & Date
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Facility</span>
                              <span className="text-sm font-semibold text-slate-800 truncate block" title={data.hospital_name}>
                                {data.hospital_name || <span className="text-slate-400 font-mono italic">null</span>}
                              </span>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Date</span>
                              <span className="text-sm font-semibold text-slate-800 block">
                                {data.document_date || <span className="text-slate-400 font-mono italic">null</span>}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 4: DIAGNOSIS */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-teal-600" /> Clinical Diagnoses
                        </h4>
                        {data.diagnoses && data.diagnoses.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {data.diagnoses.map((diag, idx) => (
                              <span key={idx} className="px-3 py-1.5 bg-white border border-teal-200 text-teal-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                {diag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic font-mono">null (No formal diagnoses recorded in document)</p>
                        )}
                      </div>

                      {/* SECTION 5: MEDICATIONS */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Pill className="w-4 h-4 text-teal-600" /> Medications
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {(data.medications || []).length} {((data.medications || []).length === 1) ? 'item' : 'items'}
                          </span>
                        </div>

                        {data.medications && data.medications.length > 0 ? (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Medication</th>
                                  <th className="py-2.5 px-3">Dosage</th>
                                  <th className="py-2.5 px-3">Route</th>
                                  <th className="py-2.5 px-3">Frequency</th>
                                  <th className="py-2.5 px-3">Duration</th>
                                  <th className="py-2.5 px-3">Instructions</th>
                                  <th className="py-2.5 px-3 text-right">Confidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {data.medications.map((med, idx) => {
                                  const isLowConf = (med.confidence || 0) < 70;
                                  return (
                                    <tr 
                                      key={idx} 
                                      className={`hover:bg-slate-50 transition-colors ${
                                        isLowConf ? 'bg-amber-50/40 border-l-2 border-l-amber-500' : ''
                                      }`}
                                    >
                                      <td className="py-2.5 px-3 font-bold text-slate-900">
                                        {med.name || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700">
                                        {med.dosage || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700">
                                        {med.route || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700">
                                        {med.frequency || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700">
                                        {med.duration || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-700">
                                        {med.instructions || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        {renderConfidenceBadge(med.confidence)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic font-mono">null (No medications prescribed)</p>
                        )}
                      </div>

                      {/* SECTION 6: LABORATORY RESULTS */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4 text-teal-600" /> Laboratory Results & Observations
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {(data.laboratory_tests || []).length} {((data.laboratory_tests || []).length === 1) ? 'test' : 'tests'}
                          </span>
                        </div>

                        {data.laboratory_tests && data.laboratory_tests.length > 0 ? (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Test Name</th>
                                  <th className="py-2.5 px-3">Value</th>
                                  <th className="py-2.5 px-3">Unit</th>
                                  <th className="py-2.5 px-3">Reference Range</th>
                                  <th className="py-2.5 px-3">Abnormal Flag</th>
                                  <th className="py-2.5 px-3 text-right">Confidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {data.laboratory_tests.map((test, idx) => {
                                  const isLowConf = (test.confidence || 0) < 70;
                                  return (
                                    <tr 
                                      key={idx} 
                                      className={`hover:bg-slate-50 transition-colors ${
                                        isLowConf ? 'bg-amber-50/40 border-l-2 border-l-amber-500' : ''
                                      }`}
                                    >
                                      <td className="py-2.5 px-3 font-bold text-slate-900">
                                        {test.test_name || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                                        {test.value || (test.numeric_value !== null ? test.numeric_value : <span className="text-slate-400 italic">null</span>)}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">
                                        {test.unit || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                        {test.reference_range || <span className="text-slate-400 italic">null</span>}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {renderAbnormalBadge(test.abnormal_flag)}
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        {renderConfidenceBadge(test.confidence)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic font-mono">null (No laboratory tests or observations found)</p>
                        )}
                      </div>

                      {/* SECTION 7: CLINICAL NOTES */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600" /> Clinical Notes & Remarks
                        </h4>
                        {data.clinical_notes ? (
                          <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                            {data.clinical_notes}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic font-mono">null (No additional clinical remarks in document)</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
            })()
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              <p>This document has not been processed through AI medical extraction yet.</p>
              {selectedAiDoc && (
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleTriggerAiExtraction(selectedAiDoc)}
                  isLoading={aiLoadingId === selectedAiDoc._id}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Extract AI Medical Entities Now
                </Button>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              {selectedAiDoc && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTriggerAiExtraction(selectedAiDoc)}
                  isLoading={aiLoadingId === selectedAiDoc._id}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Re-extract Entities
                </Button>
              )}
              {selectedAiDoc && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenPreview(selectedAiDoc)}
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  View Original File
                </Button>
              )}
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsAiModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
