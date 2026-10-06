import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  ShieldCheck, 
  DownloadCloud, 
  Building, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, Alert, LoadingState } from '../../components/ui';

export const AbhaPage = () => {
  const [abhaProfile, setAbhaProfile] = useState(null);
  const [availableRecords, setAvailableRecords] = useState([]);
  const [selectedRecords, setSelectedRecords] = useState(['abdm-rec-001', 'abdm-rec-002']);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchAbhaData = async () => {
    try {
      setLoading(true);
      const [profileRes, recordsRes] = await Promise.all([
        api.get('/abha/profile'),
        api.get('/abha/demo/records'),
      ]);
      setAbhaProfile(profileRes.abha || null);
      setAvailableRecords(recordsRes.availableRecords || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbhaData();
  }, []);

  const handleConnectDemo = async () => {
    try {
      setLoading(true);
      const res = await api.post('/abha/demo/connect');
      setAbhaProfile(res.abha);
      setFeedback({ type: 'success', message: 'Demo ABHA identity connected.' });
      await fetchAbhaData();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectRecord = (recId) => {
    setSelectedRecords(prev => 
      prev.includes(recId) ? prev.filter(id => id !== recId) : [...prev, recId]
    );
  };

  const handleImportSelected = async () => {
    if (selectedRecords.length === 0) return;
    try {
      setImporting(true);
      const res = await api.post('/abha/demo/import', { selectedRecordIds: selectedRecords });
      setFeedback({ 
        type: 'success', 
        message: `${res.importedRecords.length} records mapped into FHIR standard and imported to your health timeline!` 
      });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Ayushman Bharat Digital Mission (ABDM / ABHA)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          India's national digital health ecosystem for seamless, consent-driven health record portability.
        </p>
      </div>

      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* Prominent Demo Notice Banner (Required by prompt) */}
      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold tracking-tight">DEMO ABHA ENVIRONMENT</h4>
          <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
            This module operates in <strong>interactive simulation mode</strong> for testing and demonstration. The generated ABHA numbers and linked records are simulated and do NOT represent real government identities.
          </p>
        </div>
      </div>

      {/* ABHA Digital ID Card Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Visual ABHA Health Card */}
        <div className="rounded-3xl p-6 bg-gradient-to-tr from-teal-800 via-teal-900 to-slate-950 text-white shadow-elevated border border-teal-700/50 flex flex-col justify-between relative overflow-hidden min-h-[220px]">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <QrCode className="w-48 h-48" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs">
                  ABDM
                </div>
                <span className="text-xs font-bold tracking-wider text-teal-200 uppercase">
                  National Health Authority
                </span>
              </div>
              <Badge variant="teal" size="sm">Demo ID</Badge>
            </div>

            <p className="text-xs text-teal-300 uppercase font-mono tracking-widest mt-4">ABHA Number</p>
            <p className="text-xl sm:text-2xl font-bold font-mono tracking-wider text-white mt-0.5">
              {abhaProfile?.abhaNumber || 'DEMO-ABHA-8842-1920-5511'}
            </p>
          </div>

          <div className="pt-4 border-t border-teal-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-teal-400 block text-[10px] uppercase font-mono">ABHA Address (PHR)</span>
              <span className="font-semibold text-white">{abhaProfile?.abhaAddress || 'arun.kumar@abdm'}</span>
            </div>
            <div className="text-right">
              <span className="text-teal-400 block text-[10px] uppercase font-mono">Status</span>
              <span className="font-semibold text-emerald-400">Sandbox Linked</span>
            </div>
          </div>
        </div>

        {/* Integration Controls */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">ABHA Digital Health Locker</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              When connected to accredited hospitals and diagnostic centers, you can discover existing diagnostic reports and convert them into FHIR standards.
            </p>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>Interoperable FHIR Resource mapping</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>Consent-driven selective record retrieval</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>One-click sync with Healthify personal timeline</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleConnectDemo}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Reset / Reconnect Sandbox ABHA
            </Button>
          </div>
        </Card>

      </div>

      {/* PHASE 17 & 18: Record Discovery & Selective FHIR Import */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Discover Hospital Records (ABDM Gateway)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select specific clinical records to import into your personal Healthify database.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleImportSelected}
            isLoading={importing}
            disabled={selectedRecords.length === 0}
            leftIcon={<DownloadCloud className="w-4 h-4" />}
          >
            Import Selected Records ({selectedRecords.length})
          </Button>
        </div>

        {/* Discovery checklist items */}
        <div className="mt-4 space-y-3">
          {availableRecords.map((item) => {
            const isChecked = selectedRecords.includes(item.recordId);
            return (
              <label
                key={item.recordId}
                className={`
                  p-4 rounded-2xl border transition-all flex items-start gap-4 cursor-pointer
                  ${isChecked
                    ? 'border-teal-500 bg-teal-50/40 ring-1 ring-teal-200'
                    : 'border-slate-200 bg-white hover:bg-slate-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelectRecord(item.recordId)}
                  className="w-5 h-5 text-teal-600 rounded mt-0.5"
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{item.hospitalName}</span>
                    <Badge variant="teal" size="sm">{item.type}</Badge>
                    <Badge variant="neutral" size="sm">FHIR: {item.fhirResourceType}</Badge>
                  </div>

                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {item.summary}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>Doctor: {item.doctorName}</span>
                    <span>Date: {item.date}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default AbhaPage;
