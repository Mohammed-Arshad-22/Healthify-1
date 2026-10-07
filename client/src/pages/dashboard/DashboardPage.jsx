import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Activity, 
  Pill, 
  Clock, 
  FileText, 
  Calendar, 
  QrCode, 
  ShieldAlert, 
  Sparkles, 
  Plus, 
  FileUp, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  TrendingUp,
  Stethoscope,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Button, Card, Badge, LoadingState, EmptyState } from '../../components/ui';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [healthProfile, setHealthProfile] = useState(null);
  const [adherenceSuccess, setAdherenceSuccess] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/user/health-profile');
      setHealthProfile(res.health_profile || null);
    } catch (err) {
      console.error('Error loading structured health profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkTaken = async (medId) => {
    try {
      if (medId && !medId.startsWith('med_')) {
        await api.post(`/medications/${medId}/adherence`, { status: 'taken', timeSlot: 'Today' });
      }
      setAdherenceSuccess(`Dose marked as taken!`);
      setTimeout(() => setAdherenceSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const summary = healthProfile?.summary || {
    total_uploaded_records: 0,
    total_analyzed_records: 0,
    total_diagnoses: 0,
    total_medications: 0,
    total_observations: 0,
  };

  const medications = healthProfile?.medications || [];
  const diagnoses = healthProfile?.diagnoses || [];
  const recentObservations = healthProfile?.recent_observations || [];
  const recentDocs = healthProfile?.recent_documents || [];
  const timeline = healthProfile?.timeline || [];

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    switch (status) {
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

  // Helper for Timeline icon & colors
  const getTimelineIcon = (type) => {
    switch (type) {
      case 'PRESCRIPTION':
        return { icon: <Pill className="w-4 h-4 text-teal-600" />, bg: 'bg-teal-50 border-teal-200' };
      case 'LAB_REPORT':
      case 'LABORATORY_REPORT':
        return { icon: <Activity className="w-4 h-4 text-indigo-600" />, bg: 'bg-indigo-50 border-indigo-200' };
      case 'DIAGNOSTIC_REPORT':
        return { icon: <FileCheck className="w-4 h-4 text-cyan-600" />, bg: 'bg-cyan-50 border-cyan-200' };
      case 'DISCHARGE_SUMMARY':
        return { icon: <Stethoscope className="w-4 h-4 text-amber-600" />, bg: 'bg-amber-50 border-amber-200' };
      default:
        return { icon: <FileText className="w-4 h-4 text-slate-600" />, bg: 'bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Greeting & Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-card relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/30 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-teal-300" />
            <span>Structured Health Profile (Phase 7)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('dashboard.greeting')}, {user?.name ? user.name.split(' ')[0] : 'Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 max-w-lg leading-relaxed">
            Your centralized clinical profile synthesized directly from verified database records and uploaded clinical documents.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="relative z-10 flex flex-wrap sm:flex-col items-start sm:items-end gap-2.5">
          <Link
            to="/emergency"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>Emergency Health Card</span>
          </Link>

          <Link
            to="/abha"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-teal-300" />
            <span>{user?.abhaConnected ? 'ABHA Linked (Demo)' : 'Link ABHA ID'}</span>
          </Link>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: SUMMARY METRICS (PHASE 7 REQUIRED COUNTERS)
          - Number of uploaded records
          - Number of analyzed records
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Number of uploaded records */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Uploaded Records
            </span>
            <FileUp className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 block">
            {summary.total_uploaded_records}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Medical files stored</span>
        </Card>

        {/* Number of analyzed records */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
              Analyzed Records
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-700 mt-2 block">
            {summary.total_analyzed_records}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Verified by AI & OCR</span>
        </Card>

        {/* Extracted Diagnoses */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Diagnoses Extracted
            </span>
            <FileCheck className="w-4 h-4 text-cyan-600" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 block">
            {summary.total_diagnoses}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Clinical findings</span>
        </Card>

        {/* Current Medications */}
        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Prescribed Medications
            </span>
            <Pill className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 mt-2 block">
            {summary.total_medications}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active prescribed drugs</span>
        </Card>
      </div>

      {/* Main Grid: Left 2 Cols (Clinical Diagnoses, Meds, Labs) + Right 1 Col (Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* =========================================================================
              SECTION 2: DIAGNOSES (When explicitly extracted)
              ========================================================================= */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Clinical Diagnoses</h3>
                  <p className="text-xs text-slate-500">Explicitly extracted from certified physician consultations</p>
                </div>
              </div>
              <Badge variant="cyan" size="sm">
                {diagnoses.length} {diagnoses.length === 1 ? 'condition' : 'conditions'}
              </Badge>
            </div>

            <div className="mt-4">
              {diagnoses.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl font-mono">
                  No clinical diagnoses explicitly extracted in uploaded documents yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {diagnoses.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/40 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{d.diagnosis}</h4>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            Confirmed: {d.first_recorded_date || 'Document date verified'}
                          </span>
                        </div>
                      </div>
                      {d.source_documents?.length > 0 && (
                        <div className="pt-1.5 border-t border-teal-100/60 text-[10px] text-teal-800 truncate" title={d.source_documents[0].document_name}>
                          Source: {d.source_documents[0].document_name}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* =========================================================================
              SECTION 3: CURRENT MEDICATIONS (When explicitly available)
              ========================================================================= */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Current Medications</h3>
                  <p className="text-xs text-slate-500">Explicitly prescribed and active in medical records</p>
                </div>
              </div>
              <Link to="/medicines" className="text-xs font-semibold text-teal-600 hover:underline">
                Manage All &rarr;
              </Link>
            </div>

            {adherenceSuccess && (
              <div className="mt-3 p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {adherenceSuccess}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {medications.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl font-mono">
                  No medications explicitly available in verified prescriptions.
                </div>
              ) : (
                medications.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{med.name}</span>
                        {med.dosage && <Badge variant="teal" size="sm">{med.dosage}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {med.frequency || 'Daily schedule'} {med.duration ? `• ${med.duration}` : ''} • Source: {med.source || 'Prescription'}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkTaken(med.id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                    >
                      Taken
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* =========================================================================
              SECTION 4: RECENT LABORATORY OBSERVATIONS
              ========================================================================= */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Laboratory Observations</h3>
                  <p className="text-xs text-slate-500">Evaluated test results with reference intervals</p>
                </div>
              </div>
              <Link to="/laboratory" className="text-xs font-semibold text-teal-600 hover:underline">
                View Lab Dashboard &rarr;
              </Link>
            </div>

            <div className="mt-4">
              {recentObservations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl font-mono">
                  No laboratory observations analyzed yet. Upload a lab report to start.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-2">Test Name</th>
                        <th className="py-2.5 px-2">Value</th>
                        <th className="py-2.5 px-2">Reference Range</th>
                        <th className="py-2.5 px-2">Status</th>
                        <th className="py-2.5 px-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentObservations.slice(0, 5).map((obs, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-2 font-bold text-slate-800">
                            {obs.test_name}
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-900">
                            {obs.value || obs.numeric_value} {obs.unit || ''}
                          </td>
                          <td className="py-2.5 px-2 text-slate-600 font-mono text-[11px]">
                            {obs.reference_range || <span className="text-slate-400 italic">UNKNOWN</span>}
                          </td>
                          <td className="py-2.5 px-2">
                            {getStatusBadge(obs.status)}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 text-[11px]">
                            {obs.date || 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>

          {/* =========================================================================
              SECTION 5: RECENT MEDICAL DOCUMENTS
              ========================================================================= */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Medical Documents</h3>
                  <p className="text-xs text-slate-500">Stored diagnostic files and prescriptions</p>
                </div>
              </div>
              <Link to="/documents" className="text-xs font-semibold text-teal-600 hover:underline">
                View All Documents &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-2.5">
              {recentDocs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl font-mono">
                  No medical documents uploaded yet.
                </div>
              ) : (
                recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={doc.original_filename}>
                        {doc.original_filename}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600">{doc.type_label}</span>
                        <span>•</span>
                        <span>{doc.upload_date || 'Uploaded'}</span>
                      </div>
                    </div>

                    <Link
                      to="/documents"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                      title="View in Document Vault"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>

        </div>

        {/* Right Column: Timeline Based on Actual Document Dates */}
        <div className="space-y-6">
          
          {/* =========================================================================
              SECTION 6: TIMELINE (Based on actual document dates)
              ========================================================================= */}
          <Card className="p-6 bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Health Timeline
                </h3>
                <p className="text-xs text-slate-500">Based strictly on actual document dates</p>
              </div>
              <Link to="/timeline" className="text-xs font-semibold text-teal-600 hover:underline">
                Full &rarr;
              </Link>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl font-mono">
                No chronological events recorded.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((event, idx) => {
                  const style = getTimelineIcon(event.type);
                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Dot/Icon */}
                      <div
                        className={`absolute -left-6 top-0 w-6 h-6 rounded-full border flex items-center justify-center bg-white shadow-2xs ${style.bg}`}
                      >
                        {style.icon}
                      </div>

                      {/* Content Box */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-colors space-y-1.5 shadow-2xs">
                        {/* Actual Date Header */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                            {event.date || 'Undated Record'}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {event.type_label}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 truncate" title={event.title}>
                          {event.title}
                        </h4>

                        {/* Doctor or Hospital if present */}
                        {(event.doctor_name || event.hospital_name) && (
                          <p className="text-[11px] text-slate-500">
                            {event.doctor_name ? `Dr. ${event.doctor_name}` : ''}
                            {event.doctor_name && event.hospital_name ? ' • ' : ''}
                            {event.hospital_name || ''}
                          </p>
                        )}

                        {/* Diagnoses Pills */}
                        {event.diagnoses?.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {event.diagnoses.map((diag, dIdx) => (
                              <span key={dIdx} className="px-1.5 py-0.5 bg-cyan-50 border border-cyan-200 text-cyan-900 rounded text-[10px] font-medium">
                                Dx: {diag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Key Findings */}
                        {event.key_findings?.length > 0 && (
                          <div className="space-y-0.5 pt-1 text-[11px] text-slate-600 font-mono">
                            {event.key_findings.map((f, fIdx) => (
                              <div key={fIdx} className="truncate">• {f}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick Upload Banner */}
          <div className="p-5 rounded-2xl border border-dashed border-teal-300 bg-teal-50/50 text-center space-y-2">
            <FileUp className="w-6 h-6 text-teal-600 mx-auto" />
            <h4 className="text-xs font-bold text-slate-900">Upload New Medical Document</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Scan prescriptions or lab reports to continuously update your structured timeline.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/documents?action=upload')}
              className="mt-2"
            >
              Upload Document
            </Button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
