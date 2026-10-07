import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Plus, 
  Activity, 
  Calendar, 
  Sparkles, 
  ArrowUpRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, Dialog, Input, Select, LoadingState } from '../../components/ui';

export const TrendsPage = () => {
  const [selectedMetric, setSelectedMetric] = useState('HbA1c');
  const [availableMetrics, setAvailableMetrics] = useState([]);
  const [metricData, setMetricData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Log new measurement modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLog, setNewLog] = useState({
    metricName: 'HbA1c',
    value: '',
    unit: '%',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const standardMetrics = [
    { name: 'HbA1c', unit: '%', target: '< 5.7 %', min: 4, max: 12 },
    { name: 'Blood Pressure - Systolic', unit: 'mmHg', target: '< 120 mmHg', min: 90, max: 180 },
    { name: 'Blood Pressure - Diastolic', unit: 'mmHg', target: '< 80 mmHg', min: 60, max: 120 },
    { name: 'Fasting Blood Glucose', unit: 'mg/dL', target: '70 - 99 mg/dL', min: 50, max: 250 },
    { name: 'Total Cholesterol', unit: 'mg/dL', target: '< 200 mg/dL', min: 120, max: 300 },
    { name: 'Serum Creatinine', unit: 'mg/dL', target: '0.7 - 1.3 mg/dL', min: 0.4, max: 3.0 },
  ];

  const currentMetricDef = standardMetrics.find(m => m.name === selectedMetric) || standardMetrics[0];

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trends?metric=${encodeURIComponent(selectedMetric)}`);
      setMetricData(res.metrics || []);
      setAvailableMetrics(res.availableMetrics?.length ? res.availableMetrics : standardMetrics.map(m => m.name));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [selectedMetric]);

  const handleAddMetric = async (e) => {
    e.preventDefault();
    if (!newLog.value) return;
    try {
      setSaving(true);
      await api.post('/trends', newLog);
      setShowLogModal(false);
      setNewLog({
        metricName: selectedMetric,
        value: '',
        unit: currentMetricDef.unit,
        date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      await fetchTrends();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const latestPoint = metricData[metricData.length - 1];
  const previousPoint = metricData.length > 1 ? metricData[metricData.length - 2] : null;
  const delta = latestPoint && previousPoint ? (latestPoint.value - previousPoint.value).toFixed(1) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lab Results & Health Trends</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Longitudinal clinical indicators tracked across laboratory diagnostic visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/laboratory')}
            leftIcon={<Activity className="w-4 h-4 text-teal-600" />}
          >
            Lab Dashboard
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setNewLog(prev => ({ ...prev, metricName: selectedMetric, unit: currentMetricDef.unit }));
              setShowLogModal(true);
            }}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Log Reading
          </Button>
        </div>
      </div>

      {/* Metric Select Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {standardMetrics.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => setSelectedMetric(m.name)}
            className={`
              px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors
              ${selectedMetric === m.name
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
            `}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latest Recorded Value</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {latestPoint ? latestPoint.value : '--'}
            </span>
            <span className="text-sm font-semibold text-slate-500">{currentMetricDef.unit}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {latestPoint ? new Date(latestPoint.date).toLocaleDateString() : 'No data recorded'}
          </p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progress Trend</span>
          <div className="flex items-baseline gap-2 mt-2">
            {delta !== null ? (
              Number(delta) <= 0 ? (
                <span className="text-3xl font-extrabold text-emerald-600 flex items-center font-mono">
                  <TrendingDown className="w-6 h-6 mr-1" /> {delta}
                </span>
              ) : (
                <span className="text-3xl font-extrabold text-rose-600 flex items-center font-mono">
                  <TrendingUp className="w-6 h-6 mr-1" /> +{delta}
                </span>
              )
            ) : (
              <span className="text-2xl font-bold text-slate-400">Baseline</span>
            )}
            <span className="text-sm text-slate-500">{currentMetricDef.unit}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {previousPoint ? `Compared to ${new Date(previousPoint.date).toLocaleDateString()}` : 'First reading'}
          </p>
        </Card>

        <Card className="p-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Reference Target</span>
          <div className="mt-2 text-xl font-bold text-teal-800 font-mono">
            {currentMetricDef.target}
          </div>
          <p className="text-xs text-slate-500 mt-1">Standard normal healthy reference range</p>
        </Card>
      </div>

      {/* Interactive Trend Chart */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {selectedMetric} Longitudinal Trajectory
            </h3>
            <p className="text-xs text-slate-500">
              Structured database trend curve with historical milestone points.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/copilot?q=explain+my+trends')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-semibold transition-colors border border-teal-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Explain trend with Copilot</span>
          </button>
        </div>

        {/* Clean responsive SVG Line Chart */}
        {loading ? (
          <LoadingState message="Rendering health trend chart..." />
        ) : (
          <div className="w-full h-64 relative flex flex-col justify-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 180" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="130" x2="500" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

              {/* Render connecting line and data points */}
              {metricData.length >= 2 ? (
                <>
                  {/* Area fill */}
                  <polygon
                    points={`
                      40,${160 - ((metricData[0].value - currentMetricDef.min) / (currentMetricDef.max - currentMetricDef.min)) * 120}
                      ${metricData.map((pt, idx) => {
                        const x = 40 + (idx / (metricData.length - 1)) * 420;
                        const norm = Math.max(0, Math.min(1, (pt.value - currentMetricDef.min) / (currentMetricDef.max - currentMetricDef.min)));
                        const y = 160 - norm * 120;
                        return `${x},${y}`;
                      }).join(' ')}
                      ${40 + 420},160
                      40,160
                    `}
                    fill="url(#chartGlow)"
                  />

                  {/* Stroke path */}
                  <polyline
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={metricData.map((pt, idx) => {
                      const x = 40 + (idx / (metricData.length - 1)) * 420;
                      const norm = Math.max(0, Math.min(1, (pt.value - currentMetricDef.min) / (currentMetricDef.max - currentMetricDef.min)));
                      const y = 160 - norm * 120;
                      return `${x},${y}`;
                    }).join(' ')}
                  />

                  {/* Individual circles */}
                  {metricData.map((pt, idx) => {
                    const x = 40 + (idx / (metricData.length - 1)) * 420;
                    const norm = Math.max(0, Math.min(1, (pt.value - currentMetricDef.min) / (currentMetricDef.max - currentMetricDef.min)));
                    const y = 160 - norm * 120;
                    return (
                      <g key={idx}>
                        <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#0d9488" strokeWidth="3" />
                        <text x={x} y={y - 12} fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle">
                          {pt.value} {pt.unit}
                        </text>
                        <text x={x} y={175} fill="#64748b" fontSize="10" textAnchor="middle">
                          {new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </text>
                      </g>
                    );
                  })}
                </>
              ) : (
                <text x="250" y="90" fill="#94a3b8" fontSize="12" textAnchor="middle">
                  Log at least 2 readings to view graphical trajectory
                </text>
              )}
            </svg>
          </div>
        )}
      </Card>

      {/* Log Reading Modal */}
      <Dialog
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title={`Log Measurement: ${selectedMetric}`}
        description="Add a point from your lab report or home monitoring device."
      >
        <form onSubmit={handleAddMetric} className="space-y-4 pt-2">
          <Input
            label={`Value (${currentMetricDef.unit})`}
            type="number"
            step="0.1"
            value={newLog.value}
            onChange={(e) => setNewLog({ ...newLog, value: e.target.value })}
            placeholder={`e.g. ${selectedMetric === 'HbA1c' ? '7.1' : '135'}`}
            required
          />

          <Input
            label="Date of Measurement"
            type="date"
            value={newLog.date}
            onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
            required
          />

          <Input
            label="Notes (Optional)"
            value={newLog.notes}
            onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
            placeholder="e.g. Fasting 10 hours, taken before breakfast"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowLogModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              Save Reading
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default TrendsPage;
