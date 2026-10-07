import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  Users, 
  UserCheck, 
  Calendar, 
  FileText, 
  Pill, 
  Clock, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search,
  Eye,
  LogOut,
  Building
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { api } from '../../services/api';
import { Button, Card, Badge, Dialog, Input, Textarea, LoadingState, EmptyState } from '../../components/ui';

export const DoctorDashboardPage = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);

  // New Consultation Modal
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultTitle, setConsultTitle] = useState('Clinical Consultation');
  const [consultNotes, setConsultNotes] = useState('');
  const [consultDiagnosis, setConsultDiagnosis] = useState('');
  const [prescribedMeds, setPrescribedMeds] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Profile Edit Modal
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    specialization: '',
    professionalDesignation: '',
    clinicHospital: '',
    registrationNumber: '',
    phone: '',
  });

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const [profileRes, patientsRes] = await Promise.all([
        api.get('/doctor/profile'),
        api.get('/doctor/patients'),
      ]);
      setProfile(profileRes.profile);
      setEditForm({
        name: profileRes.profile.name || '',
        specialization: profileRes.profile.specialization || '',
        professionalDesignation: profileRes.profile.professionalDesignation || '',
        clinicHospital: profileRes.profile.clinicHospital || '',
        registrationNumber: profileRes.profile.registrationNumber || '',
        phone: profileRes.profile.phone || '',
      });
      setPatients(patientsRes.patients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []);

  const handleSelectPatient = async (p) => {
    setSelectedPatient(p);
    try {
      setPatientLoading(true);
      const data = await api.get(`/doctor/patients/${p.patient._id}`);
      setPatientData(data);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to load patient records.' });
    } finally {
      setPatientLoading(false);
    }
  };

  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      setIsSubmitting(true);
      const medsArray = prescribedMeds
        .split('\n')
        .filter(m => m.trim().length > 0)
        .map(m => {
          const parts = m.split('-');
          return {
            name: parts[0]?.trim() || m.trim(),
            dosage: parts[1]?.trim() || 'Standard Dose',
            frequency: parts[2]?.trim() || 'As advised',
          };
        });

      await api.post(`/doctor/patients/${selectedPatient.patient._id}/consultations`, {
        title: consultTitle,
        notes: consultNotes,
        diagnosis: consultDiagnosis ? consultDiagnosis.split(',').map(d => d.trim()) : [],
        medicationsPrescribed: medsArray,
      });

      setShowConsultationModal(false);
      setConsultNotes('');
      setConsultDiagnosis('');
      setPrescribedMeds('');
      setFeedback({ type: 'success', message: 'Consultation note and prescription saved to patient timeline.' });
      
      // Refresh patient data
      handleSelectPatient(selectedPatient);
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to record consultation.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.put('/doctor/profile', editForm);
      setProfile(res.profile);
      setShowEditProfile(false);
      setFeedback({ type: 'success', message: 'Professional profile updated.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Profile update failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Loading Doctor Portal..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                Healthify Clinician
                <Badge variant={profile?.verificationStatus === 'verified' ? 'success' : 'amber'} size="sm">
                  {profile?.verificationStatus === 'verified' ? 'Verified Clinician' : 'Verification Pending'}
                </Badge>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">Doctor Workspace &bull; Clinical Records</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditProfile(true)}
            >
              Edit Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-4 h-4 text-slate-500" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {feedback.message && (
          <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-medium ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}>
            <span>{feedback.message}</span>
            <button type="button" onClick={() => setFeedback({ type: '', message: '' })} className="font-bold">✕</button>
          </div>
        )}

        {/* Doctor Profile Banner */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-card relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/30 border border-teal-400/30 text-teal-200 text-xs font-semibold mb-1">
                <Award className="w-3.5 h-3.5" />
                <span>{profile?.professionalDesignation || 'Consultant Physician'}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {profile?.name}
              </h1>
              <p className="text-xs sm:text-sm text-teal-200">
                {profile?.specialization} &bull; {profile?.clinicHospital || 'Hospital / Clinic not specified'}
              </p>
              {profile?.registrationNumber && (
                <p className="text-[11px] text-teal-300 font-mono">
                  Registration ID: {profile.registrationNumber}
                </p>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20 text-center min-w-[140px]">
              <span className="text-2xl font-bold">{patients.length}</span>
              <p className="text-xs text-teal-200 mt-0.5">Authorized Patients</p>
            </div>
          </div>
        </div>

        {/* Patients & Records Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Authorized Patient List */}
          <Card className="p-5 space-y-4 lg:col-span-1">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Authorized Patients</h3>
              </div>
              <Badge variant="teal" size="sm">{patients.length}</Badge>
            </div>

            {patients.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-500 border border-dashed rounded-2xl space-y-2">
                <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No patients yet</p>
                <p>When patients grant you access in their Healthify app, their profile will securely appear here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {patients.map(p => {
                  const isSelected = selectedPatient?.shareId === p.shareId;
                  return (
                    <button
                      key={p.shareId}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{p.patient?.name}</span>
                        <Badge variant="success" size="sm">Active Consent</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {p.patient?.gender ? `${p.patient.gender}, ` : ''}{p.patient?.age ? `${p.patient.age} yrs` : ''} &bull; Blood: {p.patient?.bloodGroup || 'O+'}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.permissions.reports && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Reports</span>}
                        {p.permissions.medicines && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Medicines</span>}
                        {p.permissions.timeline && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Timeline</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Right 2 Columns: Clinical File of Selected Patient */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedPatient ? (
              <Card className="p-12 text-center text-slate-500 space-y-3">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Select an Authorized Patient</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click on any patient on the left to securely review their clinical history, verified diagnostic reports, and active prescription schedule.
                </p>
              </Card>
            ) : patientLoading ? (
              <Card className="p-12">
                <LoadingState message="Decrypting authorized clinical files..." />
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Patient Header Card */}
                <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {patientData?.patient?.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Blood Group: <strong className="text-slate-800">{patientData?.patient?.bloodGroup || 'Not specified'}</strong> &bull; 
                      Age: <strong className="text-slate-800">{patientData?.patient?.age || 'N/A'}</strong> &bull; 
                      Phone: <strong className="text-slate-800">{patientData?.patient?.phone || 'Confidential'}</strong>
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowConsultationModal(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Add Clinical Note / Rx
                  </Button>
                </Card>

                {/* Patient Active Medicines */}
                <Card className="p-5 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Pill className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Prescribed Medications</h4>
                  </div>
                  {patientData?.medicines?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No active medications registered for this patient.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {patientData.medicines.map(m => (
                        <div key={m._id} className="p-3 rounded-xl border border-slate-200 bg-white">
                          <span className="text-xs font-bold text-slate-900">{m.name}</span>
                          <span className="ml-2 text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-semibold">{m.dosage}</span>
                          <p className="text-[11px] text-slate-500 mt-1">{m.frequency} &bull; {m.instructions}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Patient Verified Reports & Timeline */}
                <Card className="p-5 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Clock className="w-4 h-4 text-cyan-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Clinical Timeline & Reports</h4>
                  </div>
                  {patientData?.records?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No timeline records created yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {patientData.records.map(rec => (
                        <div key={rec._id} className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{rec.title}</span>
                              <Badge variant="neutral" size="sm">{rec.recordType.replace('_', ' ')}</Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {rec.hospitalClinicName || rec.doctorName || 'Clinical Record'} &bull; {new Date(rec.date).toLocaleDateString()}
                            </p>
                            {rec.notes && (
                              <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                {rec.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Consultation Modal */}
      <Dialog
        isOpen={showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        title={`Add Consultation: ${selectedPatient?.patient?.name}`}
      >
        <form onSubmit={handleSaveConsultation} className="space-y-4">
          <Input
            label="Consultation Title"
            value={consultTitle}
            onChange={(e) => setConsultTitle(e.target.value)}
            placeholder="e.g. Diabetology Assessment & Follow-up"
            required
          />

          <Input
            label="Diagnosis / Clinical Findings (comma-separated)"
            value={consultDiagnosis}
            onChange={(e) => setConsultDiagnosis(e.target.value)}
            placeholder="e.g. Type 2 Diabetes, Mild Hyperglycemia"
          />

          <Textarea
            label="Physician Notes & Clinical Advice"
            value={consultNotes}
            onChange={(e) => setConsultNotes(e.target.value)}
            placeholder="Document clinical observations, dietary suggestions, or follow-up instructions..."
            rows={3}
          />

          <Textarea
            label="Prescribe Medications (One per line: Medicine - Dosage - Frequency)"
            value={prescribedMeds}
            onChange={(e) => setPrescribedMeds(e.target.value)}
            placeholder="Metformin 500mg - 500mg - Twice daily after meals&#10;Telmisartan 40mg - 40mg - Once daily in morning"
            rows={3}
            helperText="Prescriptions will be added to the patient's active medicines schedule."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConsultationModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Save Consultation
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Profile Modal */}
      <Dialog
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Edit Doctor Profile"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-3.5">
          <Input
            label="Doctor Name"
            value={editForm.name}
            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />

          <Input
            label="Specialization"
            value={editForm.specialization}
            onChange={(e) => setEditForm(prev => ({ ...prev, specialization: e.target.value }))}
            required
          />

          <Input
            label="Professional Designation"
            value={editForm.professionalDesignation}
            onChange={(e) => setEditForm(prev => ({ ...prev, professionalDesignation: e.target.value }))}
          />

          <Input
            label="Hospital / Clinic"
            value={editForm.clinicHospital}
            onChange={(e) => setEditForm(prev => ({ ...prev, clinicHospital: e.target.value }))}
          />

          <Input
            label="Medical Registration ID"
            value={editForm.registrationNumber}
            onChange={(e) => setEditForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
          />

          <Input
            label="Phone"
            value={editForm.phone}
            onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowEditProfile(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              Update Profile
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default DoctorDashboardPage;
