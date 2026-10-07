import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  ShieldCheck,
  Plus,
  ExternalLink,
  Calendar,
  AlertCircle,
  HelpCircle,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from 'recharts';
import { api } from '../../services/api';
import { Button, Card, Badge, Dialog, Input, Select, LoadingState, EmptyState } from '../../components/ui';

export const LaboratoryDashboardPage = () => {
  const navigate = useNavigate();
  const [interpretations, setInterpretations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interpretingDocId, setInterpretingDocId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartViewMetric, setChartViewMetric] = useState('ALL');

  // Manual Test Evaluation Modal
  const [isEvaluateModalOpen, setIsEvaluateModalOpen] = useState(false);
  const [evalTestName, setEvalTestName] = useState('');
  const [evalValue, setEvalValue] = useState('');
  const [evalUnit, setEvalUnit] = useState('mg/dL');
  const [evalRefRange, setEvalRefRange] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Fetch interpretations and documents
  const fetchData = async () => {
    try {
      setLoading(true);
      const [interpRes, docsRes] = await Promise.all([
        api.get('/lab/interpretations'),
        api.get('/documents'),
      ]);

      setInterpretations(interpRes.interpretations || []);
      setDocuments(docsRes.documents || []);
    } catch (err) {
      console.error('Error loading laboratory dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Trigger lab interpretation for an existing document
  const handleInterpretDocument = async (docId) => {
    try {
      setInterpretingDocId(docId);
      setFeedback({ type: '', message: '' });

      const res = await api.post(`/documents/${docId}/interpret-labs`, {});
      setFeedback({
        type: 'success',
        message: `Successfully interpreted ${res.count || 0} laboratory observations from document.`,
      });
      await fetchData();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.message || 'Failed to interpret document laboratory observations.',
      });
    } finally {
      setInterpretingDocId(null);
    }
  };

  // Evaluate standalone observation via modal
  const handleEvaluateCustomObservation = async (e) => {
    e.preventDefault();
    if (!evalTestName || !evalValue) return;

    try {
      setIsEvaluating(true);
      setFeedback({ type: '', message: '' });

      const payload = {
        observations: [
          {
            test_name: evalTestName,
            value: evalValue,
            unit: evalUnit || null,
            reference_range: evalRefRange.trim() ? evalRefRange.trim() : null,
          },
        ],
      };

      const res = await api.post('/lab/interpret', payload);
      setFeedback({
        type: 'success',
        message: `Evaluation completed for ${evalTestName}.`,
      });
      setIsEvaluateModalOpen(false);
      setEvalTestName('');
      setEvalValue('');
      setEvalRefRange('');
      await fetchData();
    } catch (err) {
      setFeedback({
        type: 'danger',
        message: err.message || 'Custom evaluation failed.',
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Filtered interpretations
  const filteredList = interpretations.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      (item.test_name && item.test_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.explanation && item.explanation.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSeverity && matchesSearch;
  });

  // Unique test names for charting & selector
  const availableTestNames = Array.from(new Set(interpretations.map((i) => i.test_name))).filter(Boolean);

  // Prepare chart dataset (Recharts)
  const chartData = interpretations
    .filter((item) => chartViewMetric === 'ALL' || item.test_name === chartViewMetric)
    .filter((item) => item.numeric_value !== null && !isNaN(item.numeric_value))
    .slice(0, 15)
    .map((item) => ({
      name: item.test_name.length > 16 ? `${item.test_name.slice(0, 14)}...` : item.test_name,
      fullName: item.test_name,
      value: item.numeric_value,
      unit: item.unit || '',
      refMin: item.reference_min !== null ? item.reference_min : undefined,
      refMax: item.reference_max !== null ? item.reference_max : undefined,
      status: item.status,
      refRange: item.reference_range || 'Unknown',
    }));

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'HIGH':
        return <Badge variant="danger" size="sm">HIGH</Badge>;
      case 'LOW':
        return <Badge variant="warning" size="sm">LOW</Badge>;
      case 'NORMAL':
        return <Badge variant="success" size="sm">NORMAL</Badge>;
      case 'UNKNOWN':
      default:
        return <Badge variant="neutral" size="sm">UNKNOWN</Badge>;
    }
  };

  // Severity Badge Helper
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'URGENT_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            URGENT REVIEW
          </span>
        );
      case 'REVIEW_RECOMMENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            REVIEW RECOMMENDED
          </span>
        );
      case 'INFORMATIONAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Info className="w-3 h-3 text-slate-500" />
            INFORMATIONAL
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            NORMAL
          </span>
        );
    }
  };

  // Metric summaries
  const totalCount = interpretations.length;
  const normalCount = interpretations.filter((i) => i.status === 'NORMAL').length;
  const outOfRangeCount = interpretations.filter((i) => i.status === 'HIGH' || i.status === 'LOW').length;
  const unknownCount = interpretations.filter((i) => i.status === 'UNKNOWN').length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-teal-600" />
            Laboratory Results & Interpretation Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Safe laboratory observation interpretation engine with verified reference ranges and plain-language clinical explanations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsEvaluateModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Evaluate Lab Test
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {feedback.message && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback({ type: '', message: '' })} className="font-bold underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Clinical Safety Notice Banner (Mandatory Safety Rule) */}
      <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-sm">Clinical Decision Support Notice & Non-Diagnostic Rule</span>
          <p className="leading-relaxed text-amber-800">
            Laboratory interpretations are algorithmic comparisons against report reference intervals. This system does <strong>NOT formulate medical diagnoses</strong> (e.g. will not diagnose diabetes or anemia from a single blood test). Always discuss unexpected results with a qualified healthcare professional.
          </p>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Observations
          </span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">
            {totalCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Recorded lab results</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Within Normal Range
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
            {normalCount}
          </span>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Standard physiological levels</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
            Outside Reference Range
          </span>
          <span className="text-2xl font-extrabold text-rose-700 mt-1 block">
            {outOfRangeCount}
          </span>
          <span className="text-[11px] text-rose-600 mt-0.5 block">Low or High values</span>
        </Card>

        <Card className="p-4 bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Unknown / Unverified Range
          </span>
          <span className="text-2xl font-extrabold text-slate-700 mt-1 block">
            {unknownCount}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Informational review</span>
        </Card>
      </div>

      {/* =========================================================================
          SECTION 1: RECHARTS INTERACTIVE VISUALIZATION
          ========================================================================= */}
      <Card className="p-6 border-slate-200 shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Laboratory Observation Measurements (Recharts)
            </h2>
            <p className="text-xs text-slate-500">
              Visual overview of quantified laboratory biomarkers and reference intervals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Biomarker:</span>
            <select
              value={chartViewMetric}
              onChange={(e) => setChartViewMetric(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-800 font-medium focus:outline-teal-600"
            >
              <option value="ALL">All Biomarkers</option>
              {availableTestNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No numeric laboratory values available to plot.</p>
          </div>
        ) : (
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1 shadow-lg border border-slate-800">
                          <p className="font-bold text-teal-300">{data.fullName}</p>
                          <p>
                            Measured: <strong>{data.value} {data.unit}</strong>
                          </p>
                          <p className="text-slate-300">
                            Reference Range: <span>{data.refRange}</span>
                          </p>
                          <div className="pt-1">
                            {getStatusBadge(data.status)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const color =
                      entry.status === 'HIGH' ? '#f43f5e' :
                      entry.status === 'LOW' ? '#f59e0b' :
                      entry.status === 'NORMAL' ? '#10b981' : '#64748b';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* =========================================================================
          SECTION 2: LABORATORY OBSERVATIONS TABLE (PHASE 6 CORE SPECIFICATION)
          ========================================================================= */}
      <Card className="p-6 border-slate-200 shadow-sm bg-white space-y-4">
        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by test name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-teal-600"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="NORMAL">NORMAL</option>
                <option value="HIGH">HIGH</option>
                <option value="LOW">LOW</option>
                <option value="UNKNOWN">UNKNOWN</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 font-medium"
              >
                <option value="ALL">All Severities</option>
                <option value="NORMAL">NORMAL</option>
                <option value="REVIEW_RECOMMENDED">REVIEW RECOMMENDED</option>
                <option value="URGENT_REVIEW">URGENT REVIEW</option>
                <option value="INFORMATIONAL">INFORMATIONAL</option>
              </select>
            </div>
          </div>
        </div>

        {/* Observation Table */}
        {loading ? (
          <div className="py-12">
            <LoadingState message="Loading laboratory interpretations..." />
          </div>
        ) : filteredList.length === 0 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8 text-teal-600" />}
            title="No laboratory observations match filter"
            description="Upload a lab report or run evaluation to analyze clinical findings."
            actionLabel="Evaluate Test"
            onAction={() => setIsEvaluateModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider bg-slate-50/70">
                  <th className="py-3 px-3">Test</th>
                  <th className="py-3 px-3">Value</th>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3">Reference Range</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-4 min-w-[280px]">Plain-Language Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const isLow = item.status === 'LOW';
                  const isHigh = item.status === 'HIGH';
                  const isUrgent = item.severity === 'URGENT_REVIEW';

                  return (
                    <tr
                      key={item._id || item.observation_id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isUrgent ? 'bg-rose-50/40 border-l-4 border-l-rose-500' :
                        isHigh ? 'bg-rose-50/20' :
                        isLow ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Test */}
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {item.test_name}
                        {item.source && (
                          <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                            Source: {item.source === 'DOCUMENT_REPORT' ? 'Document Report' : item.source}
                          </span>
                        )}
                      </td>

                      {/* Value */}
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {item.value || item.numeric_value || <span className="text-slate-400 font-mono italic">null</span>}
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 text-slate-600">
                        {item.unit || <span className="text-slate-400 font-mono italic">null</span>}
                      </td>

                      {/* Reference Range */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                        {item.reference_range ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-semibold">
                            {item.reference_range}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">UNKNOWN</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-3">
                        {getSeverityBadge(item.severity)}
                      </td>

                      {/* Plain-Language Explanation */}
                      <td className="py-3 px-4 text-slate-700 text-xs leading-relaxed">
                        <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {item.explanation}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* =========================================================================
          SECTION 3: DOCUMENT QUICK INTERPRETATION PIPELINE
          ========================================================================= */}
      {documents.length > 0 && (
        <Card className="p-6 border-slate-200 shadow-sm bg-gradient-to-b from-white to-slate-50/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Uploaded Medical Documents with Laboratory Reports
              </h3>
              <p className="text-xs text-slate-500">
                Run Phase 6 safe laboratory interpretation on your uploaded medical document scans.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/documents')}
              rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Document Vault
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documents
              .filter((doc) => doc.document_type === 'LAB_REPORT' || doc.extractedData?.labTests?.length > 0)
              .slice(0, 6)
              .map((doc) => (
                <div
                  key={doc._id}
                  className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate" title={doc.original_filename || doc.originalName}>
                      {doc.original_filename || doc.originalName || 'Lab Document'}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {doc.extractedData?.labTests?.length || 0} lab tests extracted
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleInterpretDocument(doc._id)}
                    isLoading={interpretingDocId === doc._id}
                    leftIcon={<Activity className="w-3 h-3" />}
                  >
                    Interpret
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Modal: Evaluate Custom Observation */}
      <Dialog
        isOpen={isEvaluateModalOpen}
        onClose={() => setIsEvaluateModalOpen(false)}
        title="Safe Laboratory Observation Evaluation"
        description="Evaluate a specific laboratory biomarker using document reference range or curated standard."
      >
        <form onSubmit={handleEvaluateCustomObservation} className="space-y-4 pt-2">
          <Input
            label="Laboratory Test Name"
            placeholder="e.g. Fasting Blood Glucose, HbA1c, Serum Creatinine"
            value={evalTestName}
            onChange={(e) => setEvalTestName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Measured Value"
              placeholder="e.g. 105 or 7.2"
              value={evalValue}
              onChange={(e) => setEvalValue(e.target.value)}
              required
            />

            <Input
              label="Unit of Measurement"
              placeholder="e.g. mg/dL, %, g/dL"
              value={evalUnit}
              onChange={(e) => setEvalUnit(e.target.value)}
            />
          </div>

          <Input
            label="Reference Range (from Report)"
            placeholder="e.g. 70 - 99 or < 5.7 (leave blank if not on report)"
            value={evalRefRange}
            onChange={(e) => setEvalRefRange(e.target.value)}
            helperText="If omitted, curated standards are only applied if test, unit, and patient context meet all safety criteria."
          />

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
            <strong>Rule:</strong> If no document range is provided and strict curated criteria are not met, status defaults safely to <code>UNKNOWN</code>.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsEvaluateModalOpen(false)} disabled={isEvaluating}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isEvaluating}>
              Evaluate Safely
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default LaboratoryDashboardPage;
