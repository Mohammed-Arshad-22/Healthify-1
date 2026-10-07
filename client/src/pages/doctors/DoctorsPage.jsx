import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Plus, 
  Phone, 
  Mail, 
  Building, 
  Calendar, 
  Clock, 
  Stethoscope, 
  FileText,
  User,
  Trash2,
  Share2,
  ShieldCheck,
  Award
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, Dialog, Input, Select, LoadingState, EmptyState } from '../../components/ui';

export const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [activeShares, setActiveShares] = useState([]);
  const [directoryDoctors, setDirectoryDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Add doctor modal
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    specialization: 'Internal Medicine',
    hospitalClinic: '',
    phone: '',
    email: '',
    notes: '',
  });

  // Book appointment modal
  const [showBookAppt, setShowBookAppt] = useState(false);
  const [newAppt, setNewAppt] = useState({
    doctorName: '',
    specialty: 'Internal Medicine',
    hospitalClinic: '',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    time: '10:00 AM',
    reason: 'Follow-up Consultation',
  });

  // Share records modal (Phase 7)
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDoctorToShare, setSelectedDoctorToShare] = useState('');

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, apptsRes, sharesRes, dirRes] = await Promise.all([
        api.get('/doctors').catch(() => ({ doctors: [] })),
        api.get('/appointments').catch(() => ({ appointments: [] })),
        api.get('/doctor/shares').catch(() => ({ shares: [] })),
        api.get('/doctor/directory').catch(() => ({ doctors: [] })),
      ]);
      // Use strictly real user data - NO fake fallbacks (Phase 8 & 9 requirement)
      setDoctors(docsRes.doctors || []);
      setAppointments(apptsRes.appointments || []);
      setActiveShares(sharesRes.shares || []);
      setDirectoryDoctors(dirRes.doctors || []);
    } catch (err) {
      console.error('Error fetching doctors data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    if (!newDoctor.name) return;
    try {
      setSaving(true);
      await api.post('/doctors', newDoctor);
      setShowAddDoctor(false);
      setNewDoctor({ name: '', specialization: 'Internal Medicine', hospitalClinic: '', phone: '', email: '', notes: '' });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDoctor = async (id) => {
    try {
      await api.delete(`/doctors/${id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!newAppt.doctorName) return;
    try {
      setSaving(true);
      await api.post('/appointments', newAppt);
      setShowBookAppt(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async (id) => {
    try {
      await api.delete(`/appointments/${id}`);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareWithDoctor = async (e) => {
    e.preventDefault();
    if (!selectedDoctorToShare) return;
    try {
      setSaving(true);
      await api.post('/doctor/share', {
        doctorId: selectedDoctorToShare,
        permissions: { profile: true, reports: true, medicines: true, timeline: true },
      });
      setShowShareModal(false);
      setSelectedDoctorToShare('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await api.delete(`/doctor/share/${shareId}`);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Care Team & Doctors</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage your treating physicians, schedule follow-ups, and control clinical record permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareModal(true)}
            leftIcon={<Share2 className="w-4 h-4 text-teal-600" />}
          >
            Share with Clinician
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBookAppt(true)}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Book Visit
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddDoctor(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Doctor
          </Button>
        </div>
      </div>

      {/* Authorized Doctor Access Sharing (Phase 7) */}
      {activeShares.length > 0 && (
        <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-3">
          <div className="flex items-center gap-2 text-teal-900 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Active Record Sharing with Clinicians ({activeShares.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeShares.map(s => (
              <div key={s._id} className="p-3 bg-white rounded-xl border border-teal-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{s.doctorId?.name || 'Authorized Doctor'}</p>
                  <p className="text-[11px] text-slate-500">{s.doctorId?.specialization || 'Clinical Specialist'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeShare(s._id)}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Appointments Ribbon */}
      {appointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Scheduled Visits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {appointments.map((appt) => (
              <Card key={appt._id} className="p-4 border-teal-200/80 bg-teal-50/20 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="teal" size="sm">Confirmed Visit</Badge>
                    <span className="text-xs font-bold text-teal-900">
                      {new Date(appt.date).toLocaleDateString()} at {appt.time}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{appt.doctorName}</h4>
                  <p className="text-xs text-slate-500">{appt.specialty} &bull; {appt.hospitalClinic}</p>
                  <p className="text-xs text-slate-700 mt-2 font-medium">Reason: {appt.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(appt._id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  title="Remove appointment"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Doctors List */}
      {loading ? (
        <LoadingState message="Loading care team providers..." />
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={<UserCheck className="w-8 h-8" />}
          title="No doctors added yet"
          description="Add your primary physician and treating specialists to link prescriptions and consultations."
          actionLabel="Add Doctor"
          onAction={() => setShowAddDoctor(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((doc) => (
            <Card key={doc._id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                      <p className="text-xs font-semibold text-teal-800 mt-0.5">{doc.specialization}</p>
                      {doc.hospitalClinic && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.hospitalClinic}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteDoctor(doc._id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Remove doctor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {doc.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.phone}</span>
                    </p>
                  )}
                  {doc.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.email}</span>
                    </p>
                  )}
                  {doc.lastConsultationDate && (
                    <p className="flex items-center gap-2 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Last consultation: {new Date(doc.lastConsultationDate).toLocaleDateString()}</span>
                    </p>
                  )}
                  {doc.notes && (
                    <p className="mt-2 text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                      "{doc.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewAppt(prev => ({
                      ...prev,
                      doctorName: doc.name,
                      specialty: doc.specialization,
                      hospitalClinic: doc.hospitalClinic || ''
                    }));
                    setShowBookAppt(true);
                  }}
                  leftIcon={<Calendar className="w-3.5 h-3.5" />}
                >
                  Schedule Appointment
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      <Dialog
        isOpen={showAddDoctor}
        onClose={() => setShowAddDoctor(false)}
        title="Add Physician / Specialist"
      >
        <form onSubmit={handleAddDoctor} className="space-y-4">
          <Input
            label="Doctor's Full Name"
            value={newDoctor.name}
            onChange={(e) => setNewDoctor(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Dr. Priya Ram"
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Specialization / Department"
            value={newDoctor.specialization}
            onChange={(e) => setNewDoctor(prev => ({ ...prev, specialization: e.target.value }))}
            placeholder="e.g. Diabetology / Cardiology"
            leftIcon={<Stethoscope className="w-4 h-4" />}
            required
          />

          <Input
            label="Hospital or Clinic Name"
            value={newDoctor.hospitalClinic}
            onChange={(e) => setNewDoctor(prev => ({ ...prev, hospitalClinic: e.target.value }))}
            placeholder="e.g. Apollo Speciality Clinic"
            leftIcon={<Building className="w-4 h-4" />}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Contact Phone"
              value={newDoctor.phone}
              onChange={(e) => setNewDoctor(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 98400 12345"
              leftIcon={<Phone className="w-4 h-4" />}
            />

            <Input
              label="Email Address"
              value={newDoctor.email}
              onChange={(e) => setNewDoctor(prev => ({ ...prev, email: e.target.value }))}
              placeholder="doctor@hospital.org"
              leftIcon={<Mail className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Consultation Notes & Guidance"
            value={newDoctor.notes}
            onChange={(e) => setNewDoctor(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g. Treats hypertension; follow up every 3 months"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddDoctor(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saving}
            >
              Save Doctor
            </Button>
          </div>
        </form>
      </Dialog>

      {/* BOOK APPOINTMENT MODAL */}
      <Dialog
        isOpen={showBookAppt}
        onClose={() => setShowBookAppt(false)}
        title="Schedule Doctor Visit"
      >
        <form onSubmit={handleBookAppointment} className="space-y-4">
          <Input
            label="Doctor's Name"
            value={newAppt.doctorName}
            onChange={(e) => setNewAppt(prev => ({ ...prev, doctorName: e.target.value }))}
            placeholder="e.g. Dr. Priya Ram"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Specialty"
              value={newAppt.specialty}
              onChange={(e) => setNewAppt(prev => ({ ...prev, specialty: e.target.value }))}
            />

            <Input
              label="Hospital / Clinic"
              value={newAppt.hospitalClinic}
              onChange={(e) => setNewAppt(prev => ({ ...prev, hospitalClinic: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Visit Date"
              type="date"
              value={newAppt.date}
              onChange={(e) => setNewAppt(prev => ({ ...prev, date: e.target.value }))}
              required
            />

            <Input
              label="Time"
              value={newAppt.time}
              onChange={(e) => setNewAppt(prev => ({ ...prev, time: e.target.value }))}
              placeholder="e.g. 10:30 AM"
              required
            />
          </div>

          <Input
            label="Reason for Consultation"
            value={newAppt.reason}
            onChange={(e) => setNewAppt(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="e.g. Blood Sugar review & medication check"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowBookAppt(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saving}
            >
              Confirm Appointment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* SHARE RECORDS WITH REGISTERED DOCTOR MODAL (Phase 7) */}
      <Dialog
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Health Records with Verified Clinician"
      >
        <form onSubmit={handleShareWithDoctor} className="space-y-4">
          <p className="text-xs text-slate-600">
            Select a verified clinician from the Healthify Medical Directory. They will receive access to your clinical timeline, active prescriptions, and laboratory reports until you revoke consent.
          </p>

          {directoryDoctors.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              No registered clinicians currently in directory. When doctors register an account on Healthify, they will appear here.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select Clinician
              </label>
              <select
                value={selectedDoctorToShare}
                onChange={(e) => setSelectedDoctorToShare(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:ring-1 focus:ring-teal-500"
                required
              >
                <option value="">-- Choose Doctor --</option>
                {directoryDoctors.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name} &bull; {d.specialization} ({d.clinicHospital || 'Private Practice'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={saving}
              disabled={directoryDoctors.length === 0 || !selectedDoctorToShare}
            >
              Grant Explicit Access
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default DoctorsPage;
