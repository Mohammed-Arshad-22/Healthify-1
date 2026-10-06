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
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Button, Card, Badge } from '../../components/ui';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [adherenceSuccess, setAdherenceSuccess] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [medsRes, recsRes, apptsRes, docsRes] = await Promise.all([
          api.get('/medications').catch(() => ({ medications: [] })),
          api.get('/records?sort=-date').catch(() => ({ records: [] })),
          api.get('/appointments').catch(() => ({ appointments: [] })),
          api.get('/documents').catch(() => ({ documents: [] })),
        ]);

        setMedications(medsRes.medications || []);
        setRecentRecords(recsRes.records?.slice(0, 3) || []);
        setAppointments(apptsRes.appointments || []);
        setRecentDocs(docsRes.documents?.slice(0, 3) || []);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleMarkTaken = async (medId) => {
    try {
      await api.post(`/medications/${medId}/adherence`, { status: 'taken', timeSlot: 'Today' });
      setAdherenceSuccess(`Dose marked as taken!`);
      setTimeout(() => setAdherenceSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const activeMedicines = medications.filter(m => m.status === 'active');
  const nextAppointment = appointments.find(a => a.status === 'upcoming');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. Greeting & Hero Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-card relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/30 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-2">
            <Heart className="w-3.5 h-3.5 fill-teal-300" />
            <span>Healthify Copilot Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('dashboard.greeting')}, {user?.name ? user.name.split(' ')[0] : 'Patient'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 max-w-lg leading-relaxed">
            Your personal healthcare record center. Track today's medications, explore verified diagnostic reports, and ask your Health Copilot.
          </p>
        </div>

        {/* Quick ABHA & Emergency Pill */}
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

      {/* 2. Three Questions Layout */}
      {/* Quick Action Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => navigate('/documents?action=upload')}
          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500 hover:shadow-card transition-all flex items-center gap-3 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <FileUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Upload Report</p>
            <p className="text-[11px] text-slate-500">Scan or PDF</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/medicines?action=add')}
          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-cyan-500 hover:shadow-card transition-all flex items-center gap-3 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Pill className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Add Medicine</p>
            <p className="text-[11px] text-slate-500">Schedule dose</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/trends')}
          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-card transition-all flex items-center gap-3 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Health Trends</p>
            <p className="text-[11px] text-slate-500">BP & HbA1c</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate('/timeline')}
          className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-teal-500 hover:shadow-card transition-all flex items-center gap-3 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Timeline</p>
            <p className="text-[11px] text-slate-500">Full history</p>
          </div>
        </button>
      </div>

      {/* Main Grid: QUESTION 1 (What do I need to do today?) + QUESTION 2 (What has changed?) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Today's Medications + Recent Timeline & Reports */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Today's Medicines (QUESTION 1) */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t('dashboard.todayMedicines')}</h3>
                  <p className="text-xs text-slate-500">Track and log your daily prescribed schedule</p>
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
              {activeMedicines.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 border border-dashed rounded-xl">
                  No active medicines scheduled. <Link to="/medicines" className="text-teal-600 font-semibold underline">Add medicine</Link>
                </div>
              ) : (
                activeMedicines.map((med) => (
                  <div
                    key={med._id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{med.name}</span>
                        <Badge variant="teal" size="sm">{med.dosage}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {med.frequency} &bull; {med.instructions}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkTaken(med._id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                    >
                      Taken
                    </Button>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Card: Recent Timeline & Medical Reports (QUESTION 2: What has changed?) */}
          <Card className="p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Health Records & Events</h3>
                  <p className="text-xs text-slate-500">Chronological history from verified uploads & doctors</p>
                </div>
              </div>
              <Link to="/timeline" className="text-xs font-semibold text-teal-600 hover:underline">
                View Full Timeline &rarr;
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentRecords.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500 border border-dashed rounded-xl">
                  No recorded events yet. Upload a prescription or lab report to start.
                </div>
              ) : (
                recentRecords.map((rec) => (
                  <div
                    key={rec._id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{rec.title}</span>
                          <Badge variant="neutral" size="sm">{rec.recordType.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {rec.hospitalClinicName || rec.doctorName || 'Medical clinic'} &bull; {new Date(rec.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/records"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                      title="View record"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </Card>

        </div>

        {/* Right 1 Col: Copilot Intelligence Entry + Upcoming Appointment + Emergency Card */}
        <div className="space-y-6">
          
          {/* Subtle Copilot Entry Point (Prompt Rule: "Need help understanding something? [Ask Health Copilot]") */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-50 via-cyan-50 to-white border border-teal-200/80 shadow-subtle space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-teal-950">Need help understanding something?</h4>
                <p className="text-[11px] text-teal-800">Personal Health Copilot</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ask questions about your uploaded blood test reports, medication times, or get plain-language summaries in Tamil, Hindi, or Telugu.
            </p>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => navigate('/copilot')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Ask Health Copilot
            </Button>
          </div>

          {/* Upcoming Appointment */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Upcoming Consultation
              </span>
              <Calendar className="w-4 h-4 text-teal-600" />
            </div>

            {nextAppointment ? (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900">{nextAppointment.doctorName}</h4>
                <p className="text-xs text-slate-500">
                  {nextAppointment.specialty} &bull; {nextAppointment.hospitalClinic}
                </p>
                <div className="p-2.5 rounded-xl bg-teal-50 text-teal-800 text-xs font-medium">
                  {new Date(nextAppointment.date).toLocaleDateString()} at {nextAppointment.time}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Next recommended checkup with <span className="font-semibold text-slate-800">Dr. Ramesh Sharma</span> for diabetes & BP monitoring.
                </p>
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600 text-xs">
                  Recommended: Mid-October 2026
                </div>
                <Link to="/doctors" className="block text-xs font-semibold text-teal-600 hover:underline pt-1">
                  Schedule appointment &rarr;
                </Link>
              </div>
            )}
          </Card>

          {/* Emergency Card Quick Preview */}
          <Card className="p-5 border-rose-200/80 bg-rose-50/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Emergency Health Card</span>
              </div>
              <Badge variant="danger" size="sm">Active</Badge>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Instant access card with Blood Group ({user?.bloodGroup || 'O+'}), primary contact ({user?.emergencyContacts?.[0]?.name || 'Priya Kumar'}), and critical allergies.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-rose-200 text-rose-700 hover:bg-rose-50"
              onClick={() => navigate('/emergency')}
            >
              Open Emergency QR Card
            </Button>
          </Card>

        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
