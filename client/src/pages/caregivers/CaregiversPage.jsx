import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Clock, 
  Lock, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  UserPlus,
  Eye
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, Dialog, Input, Select, LoadingState, EmptyState, Alert } from '../../components/ui';

export const CaregiversPage = () => {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCaregiver, setNewCaregiver] = useState({
    name: '',
    relationship: 'Spouse',
    phone: '',
    email: '',
    permissionLevel: 'medications_only',
    durationDays: 30,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchCaregivers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/caregivers');
      setCaregivers(res.caregivers?.length ? res.caregivers : [
        {
          _id: 'cg-01',
          name: 'Priya Kumar',
          relationship: 'Spouse',
          phone: '+91 98765 11223',
          email: 'priya.k@example.com',
          permissionLevel: 'full_view',
          status: 'active',
          consentGrantedAt: '2026-09-01',
          expiresAt: '2027-09-01',
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const handleAddCaregiver = async (e) => {
    e.preventDefault();
    if (!newCaregiver.name || !newCaregiver.phone) return;
    try {
      setSaving(true);
      await api.post('/caregivers', newCaregiver);
      setShowAddModal(false);
      setNewCaregiver({
        name: '',
        relationship: 'Spouse',
        phone: '',
        email: '',
        permissionLevel: 'medications_only',
        durationDays: 30,
      });
      await fetchCaregivers();
      setFeedback({ type: 'success', message: 'Caregiver invited with explicit consent duration.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to add caregiver.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.delete(`/caregivers/${id}`);
      await fetchCaregivers();
      setFeedback({ type: 'success', message: 'Caregiver access permissions revoked immediately.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  const getPermissionLabel = (perm) => {
    switch (perm) {
      case 'emergency_only': return 'Emergency Information Only';
      case 'medications_only': return 'Medication Schedule & Adherence';
      case 'view_reports': return 'View Reports & Prescriptions';
      case 'full_view': return 'Full Health Record Viewing';
      default: return 'Limited Access';
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Caregiver & Family Mode</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Grant granular, time-bound health access to trusted family members with full consent tracking.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setShowAddModal(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Trusted Caregiver
        </Button>
      </div>

      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* Safety Notice */}
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Zero-Default Unrestricted Access:</span> Every caregiver access grant is strictly limited to the chosen permission tier and automatically expires after the configured consent duration.
        </div>
      </div>

      {/* Caregivers List */}
      {loading ? (
        <LoadingState message="Loading authorized caregivers..." />
      ) : caregivers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No caregivers designated"
          description="Designate a spouse, adult child, or caregiver to help supervise medications and appointments."
          actionLabel="Add Caregiver"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {caregivers.map((cg) => {
            const isRevoked = cg.status === 'revoked';
            return (
              <Card key={cg._id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={isRevoked ? 'danger' : 'success'} size="sm" dot>
                      {isRevoked ? 'Access Revoked' : 'Active Consent'}
                    </Badge>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Expires: {cg.expiresAt ? new Date(cg.expiresAt).toLocaleDateString() : '1 Year'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-teal-700 flex items-center justify-center font-bold flex-shrink-0">
                      {cg.name[0]}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{cg.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cg.relationship} &bull; {cg.phone}
                      </p>
                    </div>
                  </div>

                  {/* Permission badge */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Granted Scope
                    </span>
                    <p className="text-xs font-semibold text-teal-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-teal-600" />
                      {getPermissionLabel(cg.permissionLevel)}
                    </p>
                  </div>
                </div>

                {/* Revoke Access Button */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Consent logged: {new Date(cg.consentGrantedAt || Date.now()).toLocaleDateString()}
                  </span>

                  {!isRevoked && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(cg._id)}
                    >
                      Revoke Access
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADD CAREGIVER MODAL */}
      <Dialog
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Authorize Trusted Caregiver"
        description="Configure specific permissions and duration. Access can be revoked anytime."
      >
        <form onSubmit={handleAddCaregiver} className="space-y-4 pt-2">
          <Input
            label="Caregiver Full Name"
            value={newCaregiver.name}
            onChange={(e) => setNewCaregiver({ ...newCaregiver, name: e.target.value })}
            placeholder="e.g. Priya Kumar"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Relationship"
              value={newCaregiver.relationship}
              onChange={(e) => setNewCaregiver({ ...newCaregiver, relationship: e.target.value })}
              options={[
                { value: 'Spouse', label: 'Spouse' },
                { value: 'Child', label: 'Son / Daughter' },
                { value: 'Parent', label: 'Parent' },
                { value: 'Sibling', label: 'Sibling' },
                { value: 'Professional Caregiver', label: 'Professional Caregiver' },
                { value: 'Friend', label: 'Friend' },
              ]}
            />

            <Input
              label="Phone Number"
              type="tel"
              value={newCaregiver.phone}
              onChange={(e) => setNewCaregiver({ ...newCaregiver, phone: e.target.value })}
              placeholder="+91 98765 11223"
              required
            />
          </div>

          <Select
            label="Permission Scope (Least Privilege)"
            value={newCaregiver.permissionLevel}
            onChange={(e) => setNewCaregiver({ ...newCaregiver, permissionLevel: e.target.value })}
            options={[
              { value: 'emergency_only', label: 'Emergency Profile Only (Contacts, Blood group, Allergies)' },
              { value: 'medications_only', label: 'Medications Only (Doses, Schedules, Reminders)' },
              { value: 'view_reports', label: 'Diagnostic Reports & Prescriptions' },
              { value: 'full_view', label: 'Full Health Record Viewing' },
            ]}
          />

          <Select
            label="Consent Validity Duration"
            value={newCaregiver.durationDays}
            onChange={(e) => setNewCaregiver({ ...newCaregiver, durationDays: Number(e.target.value) })}
            options={[
              { value: 7, label: '7 Days (Temporary)' },
              { value: 30, label: '30 Days (1 Month)' },
              { value: 90, label: '90 Days (3 Months)' },
              { value: 365, label: '1 Year' },
            ]}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={saving}>Grant Consent</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default CaregiversPage;
