import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  FolderHeart, 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  User, 
  Building, 
  Trash2, 
  ExternalLink,
  Tag
} from 'lucide-react';
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
  EmptyState 
} from '../../components/ui';

export const RecordsPage = () => {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New record modal state
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'new');
  const [newRecord, setNewRecord] = useState({
    title: '',
    recordType: 'consultation',
    date: new Date().toISOString().slice(0, 10),
    doctorName: '',
    hospitalClinicName: '',
    notes: '',
    diagnosis: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const recordTypes = [
    { value: 'all', label: 'All Record Types' },
    { value: 'prescription', label: 'Prescriptions' },
    { value: 'lab_report', label: 'Laboratory Reports' },
    { value: 'consultation', label: 'Consultations' },
    { value: 'diagnosis', label: 'Diagnoses' },
    { value: 'hospitalization', label: 'Hospitalizations' },
    { value: 'vaccination', label: 'Vaccinations' },
    { value: 'procedure', label: 'Procedures' },
  ];

  const fetchRecords = async () => {
    try {
      setLoading(true);
      let url = `/records?type=${filterType}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      const res = await api.get(url);
      setRecords(res.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filterType, searchQuery]);

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!newRecord.title) return;
    try {
      setSaving(true);
      const payload = {
        ...newRecord,
        diagnosis: newRecord.diagnosis ? newRecord.diagnosis.split(',').map(s => s.trim()) : [],
      };
      await api.post('/records', payload);
      setShowCreateModal(false);
      setNewRecord({
        title: '',
        recordType: 'consultation',
        date: new Date().toISOString().slice(0, 10),
        doctorName: '',
        hospitalClinicName: '',
        notes: '',
        diagnosis: '',
      });
      await fetchRecords();
      setFeedback({ type: 'success', message: 'Medical record added successfully.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to create record.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await api.delete(`/records/${id}`);
      await fetchRecords();
      setFeedback({ type: 'success', message: 'Record deleted.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & New Record Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medical Records</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete database repository of doctor consultations, prescriptions, lab results, and hospital summaries.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Record
        </Button>
      </div>

      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search records by title, doctor, clinic, or diagnosis..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors"
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            options={recordTypes}
          />
        </div>
      </div>

      {/* Records Listing */}
      {loading ? (
        <LoadingState message="Loading health records..." />
      ) : records.length === 0 ? (
        <EmptyState
          icon={<FolderHeart className="w-8 h-8" />}
          title="No medical records found"
          description="Create your first health record or import records from ABHA to start building your longitudinal health history."
          actionLabel="Add New Record"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <Card key={rec._id} className="p-5 hover:shadow-card transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900">{rec.title}</h3>
                      <Badge variant="teal" size="sm">{rec.recordType.replace('_', ' ')}</Badge>
                      {rec.source === 'ABHA_ABDM' && (
                        <Badge variant="info" size="sm">ABDM Import</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(rec.date).toLocaleDateString()}
                      </span>
                      {rec.doctorName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {rec.doctorName}
                        </span>
                      )}
                      {rec.hospitalClinicName && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {rec.hospitalClinicName}
                        </span>
                      )}
                    </div>

                    {rec.notes && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {rec.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleDeleteRecord(rec._id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE RECORD MODAL */}
      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Medical Record"
        description="Record a clinical consultation, hospital stay, test report, or diagnosis."
      >
        <form onSubmit={handleCreateRecord} className="space-y-4 pt-2">
          <Input
            label="Record Title"
            value={newRecord.title}
            onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
            placeholder="e.g. Cardiologist Consultation or Routine Lipid Panel"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Record Type"
              value={newRecord.recordType}
              onChange={(e) => setNewRecord({ ...newRecord, recordType: e.target.value })}
              options={recordTypes.filter(r => r.value !== 'all')}
            />

            <Input
              label="Record Date"
              type="date"
              value={newRecord.date}
              onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Doctor Name"
              value={newRecord.doctorName}
              onChange={(e) => setNewRecord({ ...newRecord, doctorName: e.target.value })}
              placeholder="e.g. Dr. Ramesh Sharma"
            />

            <Input
              label="Hospital / Clinic Name"
              value={newRecord.hospitalClinicName}
              onChange={(e) => setNewRecord({ ...newRecord, hospitalClinicName: e.target.value })}
              placeholder="e.g. Apollo Healthcare"
            />
          </div>

          <Input
            label="Diagnosis / Findings (Optional)"
            value={newRecord.diagnosis}
            onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
            placeholder="e.g. Essential Hypertension, Mild Bronchitis"
            helperText="Separate multiple findings with commas."
          />

          <Textarea
            label="Clinical Notes / Prescription Summary"
            value={newRecord.notes}
            onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
            placeholder="Doctor advice, follow-up instructions, dosage guidelines..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={saving}>
              Save Health Record
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default RecordsPage;
