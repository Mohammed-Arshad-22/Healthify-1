import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  QrCode, 
  PhoneCall, 
  Heart, 
  AlertTriangle, 
  User, 
  Phone, 
  Printer, 
  Share2, 
  CheckCircle2,
  Stethoscope,
  Pill,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, LoadingState, Alert } from '../../components/ui';

export const EmergencyPage = () => {
  const [emergencyData, setEmergencyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tollFreeQuery, setTollFreeQuery] = useState('');
  const [tollFreeAnswer, setTollFreeAnswer] = useState('');
  const [tollFreeLoading, setTollFreeLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    const fetchEmergency = async () => {
      try {
        setLoading(true);
        const res = await api.get('/emergency');
        setEmergencyData(res.emergency || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmergency();
  }, []);

  const handleTestTollFree = async (queryText) => {
    const q = queryText || tollFreeQuery;
    if (!q) return;
    setTollFreeLoading(true);
    setTollFreeAnswer('');

    // Simulate IVR / Toll-Free Voice Assistant logic (restricted to minimal emergency data)
    setTimeout(() => {
      const qLower = q.toLowerCase();
      let answer = '';

      if (qLower.includes('blood')) {
        answer = emergencyData?.bloodGroup ? `Your recorded blood group is ${emergencyData.bloodGroup}.` : 'No blood group recorded in profile.';
      } else if (qLower.includes('medicine')) {
        answer = emergencyData?.importantMedicines?.length ? `Your registered life-sustaining medicines are: ${emergencyData.importantMedicines.join(', ')}.` : 'No critical medicines listed in emergency profile.';
      } else if (qLower.includes('allerg')) {
        answer = emergencyData?.criticalAllergies?.length ? `Critical recorded allergies: ${emergencyData.criticalAllergies.join(', ')}.` : 'No critical allergies recorded.';
      } else if (qLower.includes('doctor')) {
        answer = emergencyData?.primaryDoctorName ? `Your primary treating doctor is ${emergencyData.primaryDoctorName}${emergencyData.primaryDoctorPhone ? `, contact: ${emergencyData.primaryDoctorPhone}` : ''}.` : 'No primary doctor registered.';
      } else if (qLower.includes('checkup')) {
        answer = emergencyData?.lastCheckupDate ? `Your last recorded doctor checkup was on ${new Date(emergencyData.lastCheckupDate).toLocaleDateString()}.` : 'No checkup date registered.';
      } else {
        answer = `Emergency Voice System: You are listening to the Healthify emergency line for ${emergencyData?.name || 'patient'}. ${emergencyData?.emergencyContacts?.[0]?.phone ? `Primary contact: ${emergencyData.emergencyContacts[0].phone}` : 'For immediate assistance call 112.'}`;
      }

      setTollFreeAnswer(answer);
      setTollFreeLoading(false);
    }, 700);
  };

  const emergencyQrUrl = `${window.location.origin}/emergency/view/${user?._id || 'demo_user'}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(emergencyQrUrl);
    setCopyFeedback('Emergency portal URL copied to clipboard!');
    setTimeout(() => setCopyFeedback(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            First Responder Emergency Health System
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Emergency Health Card & QR</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Privacy-scoped vital profile accessible during medical accidents and trauma care.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Card
          </Button>
          <Button
            variant="primary"
            onClick={handleCopyLink}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share Link
          </Button>
        </div>
      </div>

      {copyFeedback && (
        <Alert variant="success">{copyFeedback}</Alert>
      )}

      {loading ? (
        <LoadingState message="Loading secure emergency profile..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Physical Emergency Health Card (Printable / Wallet Size) */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="rounded-3xl border-2 border-rose-300 bg-white p-6 sm:p-8 shadow-card relative overflow-hidden">
              {/* Red Header Tag */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-rose-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <Heart className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-widest block">
                      Emergency Health Card
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900">{emergencyData?.name || 'Arun Kumar'}</h2>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                  <span className="text-2xl font-black text-rose-600 font-mono">
                    {emergencyData?.bloodGroup || 'O+'}
                  </span>
                </div>
              </div>

              {/* Minimal Scoped Emergency Information (Phase 24 requirement) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                
                {/* Critical Allergies */}
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Critical Allergies
                  </span>
                  <p className="text-xs font-semibold text-rose-950">
                    {(emergencyData?.criticalAllergies || ['Penicillin (Anaphylaxis risk)']).join(', ')}
                  </p>
                </div>

                {/* Critical Conditions */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Heart className="w-3.5 h-3.5 text-amber-600" />
                    Chronic / Critical Conditions
                  </span>
                  <p className="text-xs font-semibold text-amber-950">
                    {(emergencyData?.criticalConditions || ['Type 2 Diabetes', 'Hypertension']).join(', ')}
                  </p>
                </div>

                {/* Important Medicines */}
                <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200">
                  <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Pill className="w-3.5 h-3.5 text-teal-600" />
                    Essential Life-Sustaining Medicines
                  </span>
                  <p className="text-xs font-semibold text-teal-950">
                    {(emergencyData?.importantMedicines || ['Metformin 500mg', 'Telmisartan 40mg']).join(', ')}
                  </p>
                </div>

                {/* Primary Treating Doctor */}
                <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                    Primary Doctor & Clinic
                  </span>
                  <p className="text-xs font-semibold text-slate-900">
                    {emergencyData?.primaryDoctorName ? `${emergencyData.primaryDoctorName} • ${emergencyData.primaryDoctorPhone || 'Phone not registered'}` : 'No primary doctor registered'}
                  </p>
                </div>

              </div>

              {/* Emergency Contacts */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Immediate Family Emergency Contacts
                </span>
                {(!emergencyData?.emergencyContacts || emergencyData.emergencyContacts.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-dashed">
                    No emergency contacts added yet. Add family or caregiver contacts below.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {emergencyData.emergencyContacts.map((contact, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{contact.name}</span>
                          <span className="text-slate-500 ml-1.5">({contact.relationship})</span>
                        </div>
                        <a
                          href={`tel:${contact.phone}`}
                          className="font-mono font-bold text-teal-700 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Strict Scoping Privacy Note */}
              <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Scoped profile: Non-vital records are not exposed to scanners.
                </span>
                <span>ABHA: {emergencyData?.abhaNumber || 'DEMO-ABHA'}</span>
              </div>
            </div>

            {/* PHASE 26: Toll-Free Health Assistant Architecture (Simulation) */}
            <Card className="p-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Toll-Free Emergency Voice Line</h3>
                    <p className="text-xs text-slate-500">24x7 IVR Audio Interface: <strong>{emergencyData?.tollFreeAssistanceNumber}</strong></p>
                  </div>
                </div>
                <Badge variant="teal">Dial-In Demo</Badge>
              </div>

              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                When calling the toll-free number during network loss, the automated assistant responds to verbal prompts with your vital health parameters. Test sample queries:
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  'What is my blood group?',
                  'What medicines am I taking?',
                  'What allergies are recorded?',
                  'Who is my doctor?',
                  'When was my last checkup?'
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setTollFreeQuery(prompt);
                      handleTestTollFree(prompt);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 text-xs font-medium transition-colors border border-slate-200"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>

              {tollFreeLoading && (
                <p className="text-xs text-teal-600 font-medium animate-pulse">
                  Connecting to emergency IVR voice assistant...
                </p>
              )}

              {tollFreeAnswer && (
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 font-medium leading-relaxed">
                  <span className="font-bold block mb-1">IVR Voice Response:</span>
                  {tollFreeAnswer}
                </div>
              )}
            </Card>

          </div>

          {/* Right Column: Secure Emergency QR Code (Phase 25) */}
          <div className="space-y-6">
            <Card className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
                <QrCode className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Emergency QR Code</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  First responders and hospital emergency rooms can scan this code to access your critical allergy and contact details without needing your phone password.
                </p>
              </div>

              {/* Render visual QR Code frame */}
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 inline-block mx-auto shadow-sm">
                <div className="w-48 h-48 bg-slate-900 p-2 flex items-center justify-center rounded-xl text-white">
                  {/* High contrast SVG QR Representation */}
                  <svg className="w-full h-full text-white" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="10" y="10" width="24" height="24" rx="3" />
                    <rect x="66" y="10" width="24" height="24" rx="3" />
                    <rect x="10" y="66" width="24" height="24" rx="3" />
                    <rect x="15" y="15" width="14" height="14" fill="#0f172a" />
                    <rect x="71" y="15" width="14" height="14" fill="#0f172a" />
                    <rect x="15" y="71" width="14" height="14" fill="#0f172a" />
                    <rect x="42" y="15" width="8" height="8" />
                    <rect x="42" y="35" width="16" height="8" />
                    <rect x="15" y="45" width="18" height="8" />
                    <rect x="66" y="45" width="12" height="12" />
                    <rect x="42" y="55" width="8" height="18" />
                    <rect x="55" y="70" width="18" height="12" />
                    <rect x="80" y="70" width="8" height="8" />
                  </svg>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Encrypted Emergency Endpoint</p>
                <p className="text-[11px] font-mono text-slate-400">All scans logged in your Privacy audit trail.</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopyLink}
              >
                Copy QR Access Link
              </Button>
            </Card>

            <Card className="p-5 bg-slate-50 text-xs space-y-2 text-slate-600">
              <span className="font-bold text-slate-900 block">Where to keep this card?</span>
              <p>&bull; Print and insert into your wallet or behind your physical ID.</p>
              <p>&bull; Save the QR image to your phone's lock screen wallpaper.</p>
              <p>&bull; Share with your primary emergency contacts.</p>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
};

export default EmergencyPage;
