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
  User
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, Dialog, Input, Select, LoadingState, EmptyState } from '../../components/ui';

export const DoctorsPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
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

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docsRes, apptsRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/appointments'),
      ]);
      setDoctors(docsRes.doctors?.length ? docsRes.doctors : [
        {
          _id: 'doc-001',
          name: 'Dr. Ramesh Sharma',
          specialization: 'MD (Internal Medicine & Diabetology)',
          hospitalClinic: 'Apollo Speciality Hospital, Greams Road',
          phone: '+91 98400 12345',
          email: 'ramesh.sharma@apollo.org',
          lastConsultationDate: '2026-09-12',
          notes: 'Primary physician managing Type 2 Diabetes and Hypertension regimen.',
        },
        {
          _id: 'doc-002',
          name: 'Dr. Swati Deshmukh',
          specialization: 'Consultant Pathologist',
          hospitalClinic: 'Metropolis Diagnostic Centre',
          phone: '+91 98200 67890',
          email: 'swati.d@metropolis.in',
          lastConsultationDate: '2026-09-18',
          notes: 'Reviews comprehensive metabolic and glycated hemoglobin panels.',
        }
      ]);
      setAppointments(apptsRes.appointments || []);
    } catch (err) {
      console.error(err);
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

  const handleBookAppt = async (e) => {
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Healthcare Providers & Care Team</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Doctors, specialists, clinics, consultation records and scheduled visits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBookAppt(true)}
            leftIcon={<Calendar className="w-4 h-4" />}
          >
            Schedule Visit
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowAddDoctor(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Doctor
          </Button>
        </div>
      </div>

      {/* Upcoming Appointments section */}
      {appointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Scheduled Visits</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {appointments.map((appt) => (
              <Card key={appt._id} className="p-4 border-teal-200/80 bg-teal-50/20">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="teal" size="sm">Confirmed Visit</Badge>
                  <span className="text-xs font-bold text-teal-900">
                    {new Date(appt.date).toLocaleDateString()} at {appt.time}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{appt.doctorName}</h4>
                <p className="text-xs text-slate-500">{appt.specialty} &bull; {appt.hospitalClinic}</p>
                <p className="text-xs text-slate-700 mt-2 font-medium">Reason: {appt.reason}</p>
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
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base flex-shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{doc.name}</h3>
                    <p className="text-xs font-semibold text-teal-800 mt-0.5">{doc.specialization}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.hospitalClinic}</span>
                    </p>
                  </div>
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
                      hospitalClinic: doc.hospitalClinic
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
        title="Add Doctor / Specialist"
        description="Register a doctor to organize your prescriptions, reports, and appointments."
      >
        <form onSubmit={handleAddDoctor} className="space-y-4 pt-2">
          <Input
            label="Doctor Name"
            value={newDoctor.name}
            onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
            placeholder="e.g. Dr. Ramesh Sharma"
            required
          />

          <Input
            label="Specialization"
            value={newDoctor.specialization}
            onChange={(e) => setNewDoctor({ ...newDoctor, specialization: e.target.value })}
            placeholder="e.g. Cardiologist, Diabetologist, General Physician"
            required
          />

          <Input
            label="Hospital / Clinic"
            value={newDoctor.hospitalClinic}
            onChange={(e) => setNewDoctor({ ...newDoctor, hospitalClinic: e.target.value })}
            placeholder="e.g. Apollo Hospital"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Phone Number"
              value={newDoctor.phone}
              onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })}
              placeholder="+91 98400 12345"
            />
            <Input
              label="Email Address"
              value={newDoctor.email}
              onChange={(e) => setNewDoctor({ ...newDoctor, email: e.target.value })}
              placeholder="doctor@hospital.org"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddDoctor(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={saving}>Save Doctor</Button>
          </div>
        </form>
      </Dialog>

      {/* SCHEDULE APPOINTMENT MODAL */}
      <Dialog
        isOpen={showBookAppt}
        onClose={() => setShowBookAppt(false)}
        title="Schedule Doctor Appointment"
        description="Save scheduled visit details for calendar integration and timely notifications."
      >
        <form onSubmit={handleBookAppt} className="space-y-4 pt-2">
          <Input
            label="Doctor Name"
            value={newAppt.doctorName}
            onChange={(e) => setNewAppt({ ...newAppt, doctorName: e.target.value })}
            placeholder="e.g. Dr. Ramesh Sharma"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={newAppt.date}
              onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })}
              required
            />
            <Input
              label="Time"
              type="text"
              value={newAppt.time}
              onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })}
              placeholder="e.g. 10:30 AM"
              required
            />
          </div>

          <Input
            label="Reason for Visit"
            value={newAppt.reason}
            onChange={(e) => setNewAppt({ ...newAppt, reason: e.target.value })}
            placeholder="e.g. Routine blood pressure & HbA1c review"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowBookAppt(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={saving}>Confirm Appointment</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default DoctorsPage;
