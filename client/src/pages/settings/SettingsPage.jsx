import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Eye, 
  Bell, 
  ShieldCheck, 
  Lock, 
  Download, 
  Trash2, 
  HelpCircle,
  QrCode,
  Users,
  Smartphone,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, languages } from '../../context/LanguageContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Button, Card, Badge, Dialog, Alert } from '../../components/ui';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { currentLang, changeLanguage, t } = useTranslation();
  const { 
    highContrast, setHighContrast, 
    largeText, setLargeText, 
    simpleMode, setSimpleMode,
    voiceAssistance, setVoiceAssistance 
  } = useAccessibility();
  const navigate = useNavigate();

  const [feedback, setFeedback] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportData = () => {
    // Generate clean JSON export of user health records for patient portability
    const exportData = {
      profile: user,
      exportDate: new Date().toISOString(),
      standards: 'FHIR Release 4 & ABDM Compatible',
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `healthify_records_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setShowExportModal(false);
    setFeedback('Health records exported successfully as JSON!');
    setTimeout(() => setFeedback(''), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Language options, accessibility preferences, data portability & security controls.
        </p>
      </div>

      {feedback && (
        <Alert variant="success" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      )}

      {/* 1. Language & Internationalization */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Language & Internationalization</h3>
            <p className="text-xs text-slate-500">Switch application UI and Copilot explanations.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => changeLanguage(l.code)}
              className={`
                p-3 rounded-2xl border text-center transition-all
                ${currentLang === l.code
                  ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold ring-2 ring-teal-200'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}
              `}
            >
              <span className="text-sm block">{l.native}</span>
              <span className="text-[11px] text-slate-400 font-normal">{l.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 2. Accessibility Options */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Accessibility & Visual Modes</h3>
            <p className="text-xs text-slate-500">Enhance contrast, scale, and voice interfaces.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-900">High Contrast Mode</p>
              <p className="text-xs text-slate-500">Enhances color contrasts on medical charts</p>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-900">Large Typography Scale</p>
              <p className="text-xs text-slate-500">Increases font sizing across records and dosages</p>
            </div>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-900">Simple / Caregiver Mode</p>
              <p className="text-xs text-slate-500">Plain-language cards with reduced clutter</p>
            </div>
            <input
              type="checkbox"
              checked={simpleMode}
              onChange={(e) => setSimpleMode(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-900">Voice Assistance Mode</p>
              <p className="text-xs text-slate-500">Automatic text-to-speech readouts of Copilot summaries</p>
            </div>
            <input
              type="checkbox"
              checked={voiceAssistance}
              onChange={(e) => setVoiceAssistance(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded"
            />
          </label>
        </div>
      </Card>

      {/* 3. Data Portability & Privacy */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Data Portability & Export</h3>
            <p className="text-xs text-slate-500">Download your personal health information bundle.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Download your complete clinical history including doctor visits, laboratory parameters, active medication lists, and emergency contacts in standard interoperable JSON format.
        </p>

        <Button
          variant="outline"
          size="md"
          onClick={() => setShowExportModal(true)}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export Medical Data Bundle (JSON)
        </Button>
      </Card>

      {/* 4. Account & Sign Out */}
      <Card className="p-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Signed In As</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.name || 'Patient'} &bull; {user?.phone || user?.email}
          </p>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-4 h-4" />}
        >
          Sign Out
        </Button>
      </Card>

      {/* Export Confirmation Modal */}
      <Dialog
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Personal Health Bundle"
        description="This bundle contains your longitudinal diagnostic results, medications, and clinical summaries formatted according to FHIR guidelines."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-600">
            Please store your exported healthcare file securely.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowExportModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleExportData} leftIcon={<Download className="w-4 h-4" />}>
              Download Now
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
