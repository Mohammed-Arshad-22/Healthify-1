import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Pill, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  User,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../../services/api';
import { 
  Button, 
  Card, 
  Badge, 
  Dialog, 
  Input, 
  Select, 
  Textarea, 
  Alert, 
  LoadingState, 
  EmptyState,
  Tabs 
} from '../../components/ui';

export const MedicinesPage = () => {
  const [searchParams] = useSearchParams();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed'
  
  // Add medication modal state
  const [showAddModal, setShowAddModal] = useState(searchParams.get('action') === 'add');
  const [newMed, setNewMed] = useState({
    name: '',
    dosage: '500 mg',
    form: 'tablet',
    frequency: 'Twice daily',
    scheduleTime: '08:30',
    scheduleLabel: 'Morning (After food)',
    instructions: 'Take after meal with warm water',
    prescribedBy: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/medications');
      setMedications(res.medications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const handleMarkAdherence = async (medId, status) => {
    try {
      await api.post(`/medications/${medId}/adherence`, { status, timeSlot: 'Today' });
      if (status === 'taken') {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
        setFeedback({ type: 'success', message: 'Dose logged as taken!' });
      } else {
        setFeedback({ type: 'warning', message: 'Dose marked as missed.' });
      }
      await fetchMedications();
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  const handleToggleStatus = async (medId) => {
    try {
      await api.patch(`/medications/${medId}/toggle`);
      await fetchMedications();
      setFeedback({ type: 'success', message: 'Medication status updated.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!newMed.name || !newMed.dosage) return;

    try {
      setSaving(true);
      const payload = {
        name: newMed.name,
        dosage: newMed.dosage,
        form: newMed.form,
        frequency: newMed.frequency,
        schedule: [{ time: newMed.scheduleTime, label: newMed.scheduleLabel }],
        instructions: newMed.instructions,
        prescribedBy: newMed.prescribedBy,
      };

      await api.post('/medications', payload);
      setShowAddModal(false);
      setNewMed({
        name: '',
        dosage: '500 mg',
        form: 'tablet',
        frequency: 'Twice daily',
        scheduleTime: '08:30',
        scheduleLabel: 'Morning (After food)',
        instructions: 'Take after meal with warm water',
        prescribedBy: '',
      });
      await fetchMedications();
      setFeedback({ type: 'success', message: 'Medication added to daily schedule.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to add medication.' });
    } finally {
      setSaving(false);
    }
  };

  const activeMeds = medications.filter(m => m.status === 'active');
  const completedMeds = medications.filter(m => m.status === 'completed');
  const displayedMeds = activeTab === 'active' ? activeMeds : completedMeds;

  const tabs = [
    { id: 'active', label: 'Active Medicines', badge: activeMeds.length },
    { id: 'completed', label: 'Completed / Past', badge: completedMeds.length },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medications & Prescriptions</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Deterministic daily adherence tracking, dosages, schedules & refill reminders.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Medication
        </Button>
      </div>

      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Medication List */}
      {loading ? (
        <LoadingState message="Loading medications..." />
      ) : displayedMeds.length === 0 ? (
        <EmptyState
          icon={<Pill className="w-8 h-8" />}
          title={activeTab === 'active' ? 'No active medications' : 'No past medications'}
          description="Prescribed medications extracted from your doctor prescriptions will appear here."
          actionLabel={activeTab === 'active' ? 'Add Medication' : undefined}
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedMeds.map((med) => {
            const hasTakenToday = med.adherenceLogs?.some(log => {
              const logDate = new Date(log.date).toDateString();
              const today = new Date().toDateString();
              return logDate === today && log.status === 'taken';
            });

            return (
              <Card key={med._id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={med.status === 'active' ? 'teal' : 'neutral'} size="sm">
                      {med.form}
                    </Badge>

                    {hasTakenToday ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Taken Today
                      </span>
                    ) : med.status === 'active' ? (
                      <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending Dose
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{med.name}</h3>
                      <p className="text-xs text-teal-800 font-semibold mt-0.5">
                        {med.dosage} &bull; {med.frequency}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{med.instructions}</p>
                      {med.prescribedBy && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> Prescribed by {med.prescribedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Schedule Pills */}
                  {med.schedule?.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                      {med.schedule.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{s.time}</span>
                          <span className="text-[10px] text-slate-500 font-sans">({s.label})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adherence Check Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {med.status === 'active' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={hasTakenToday ? 'subtle' : 'primary'}
                        size="sm"
                        onClick={() => handleMarkAdherence(med._id, 'taken')}
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        {hasTakenToday ? 'Logged Taken' : 'Mark Taken'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAdherence(med._id, 'missed')}
                        leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
                      >
                        Missed
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Treatment completed</span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(med._id)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    {med.status === 'active' ? 'Mark Completed' : 'Reactivate'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Medication"
        description="Configure dosage, frequency, and daily deterministic alerts."
      >
        <form onSubmit={handleAddMedication} className="space-y-4 pt-2">
          <Input
            label="Medicine Name"
            value={newMed.name}
            onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
            placeholder="e.g. Metformin Hydrochloride"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Dosage"
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              placeholder="e.g. 500 mg or 10 ml"
              required
            />

            <Select
              label="Form"
              value={newMed.form}
              onChange={(e) => setNewMed({ ...newMed, form: e.target.value })}
              options={[
                { value: 'tablet', label: 'Tablet' },
                { value: 'capsule', label: 'Capsule' },
                { value: 'syrup', label: 'Syrup' },
                { value: 'injection', label: 'Injection' },
                { value: 'inhaler', label: 'Inhaler' },
                { value: 'drops', label: 'Drops' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Frequency"
              value={newMed.frequency}
              onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
              options={[
                { value: 'Once daily', label: 'Once daily' },
                { value: 'Twice daily', label: 'Twice daily' },
                { value: 'Thrice daily', label: 'Thrice daily' },
                { value: 'As needed (SOS)', label: 'As needed (SOS)' },
              ]}
            />

            <Input
              label="Schedule Time"
              type="time"
              value={newMed.scheduleTime}
              onChange={(e) => setNewMed({ ...newMed, scheduleTime: e.target.value })}
            />
          </div>

          <Input
            label="Schedule Label / Time of Day"
            value={newMed.scheduleLabel}
            onChange={(e) => setNewMed({ ...newMed, scheduleLabel: e.target.value })}
            placeholder="e.g. Morning (After food)"
          />

          <Input
            label="Instructions"
            value={newMed.instructions}
            onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
            placeholder="e.g. Take with water after breakfast"
          />

          <Input
            label="Prescribed by Doctor"
            value={newMed.prescribedBy}
            onChange={(e) => setNewMed({ ...newMed, prescribedBy: e.target.value })}
            placeholder="e.g. Dr. Ramesh Sharma"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              Save Medicine
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default MedicinesPage;
