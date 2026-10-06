import React, { useState, useEffect } from 'react';
import { 
  User, 
  Activity, 
  ShieldAlert, 
  Stethoscope, 
  Sliders, 
  Lock, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, languages } from '../../context/LanguageContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { api } from '../../services/api';
import { 
  Button, 
  Input, 
  Select, 
  Textarea, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Tabs, 
  Badge, 
  Alert,
  LoadingState 
} from '../../components/ui';

export const ProfilePage = () => {
  const { user, updateUserLocal } = useAuth();
  const { currentLang, changeLanguage, t } = useTranslation();
  const { 
    highContrast, setHighContrast, 
    largeText, setLargeText, 
    simpleMode, setSimpleMode,
    voiceAssistance, setVoiceAssistance 
  } = useAccessibility();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [accessLogs, setAccessLogs] = useState([]);

  // Profile Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    age: '',
    gender: 'male',
    preferredLanguage: 'en',
    bloodGroup: 'O+',
    heightCm: '',
    weightKg: '',
    allergies: '',
    chronicConditions: '',
    previousSurgeries: '',
    familyHistory: '',
    importantNotes: '',
    // Emergency
    criticalAllergies: '',
    criticalConditions: '',
    importantMedicines: '',
    primaryDoctorName: '',
    primaryDoctorPhone: '',
    lastCheckupDate: '',
    // Emergency contacts array
    emergencyContacts: [],
    // Notifications
    medicineReminders: true,
    appointmentReminders: true,
    reportStatus: true,
    emailAlerts: true,
  });

  // Emergency contact modal/form state
  const [newContact, setNewContact] = useState({ name: '', relationship: 'Spouse', phone: '', isPrimary: false });
  const [showAddContact, setShowAddContact] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
        age: user.age || '',
        gender: user.gender || 'male',
        preferredLanguage: user.preferredLanguage || currentLang,
        bloodGroup: user.bloodGroup || 'O+',
        heightCm: user.heightCm || '',
        weightKg: user.weightKg || '',
        allergies: (user.allergies || []).join(', '),
        chronicConditions: (user.chronicConditions || []).join(', '),
        previousSurgeries: (user.previousSurgeries || []).join(', '),
        familyHistory: (user.familyHistory || []).join(', '),
        importantNotes: user.importantNotes || '',
        criticalAllergies: (user.criticalAllergies || []).join(', '),
        criticalConditions: (user.criticalConditions || []).join(', '),
        importantMedicines: (user.importantMedicines || []).join(', '),
        primaryDoctorName: user.primaryDoctorName || '',
        primaryDoctorPhone: user.primaryDoctorPhone || '',
        lastCheckupDate: user.lastCheckupDate ? user.lastCheckupDate.slice(0, 10) : '',
        emergencyContacts: user.emergencyContacts || [],
        medicineReminders: user.notificationPreferences?.medicineReminders ?? true,
        appointmentReminders: user.notificationPreferences?.appointmentReminders ?? true,
        reportStatus: user.notificationPreferences?.reportStatus ?? true,
        emailAlerts: user.notificationPreferences?.emailAlerts ?? true,
      });
    }
  }, [user, currentLang]);

  // Load access logs if privacy tab selected
  useEffect(() => {
    if (activeTab === 'privacy') {
      const fetchLogs = async () => {
        try {
          const res = await api.get('/user/access-logs');
          setAccessLogs(res.auditLogs || []);
        } catch (err) {
          console.error(err);
        }
      };
      fetchLogs();
    }
  }, [activeTab]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = {
        name: formData.name,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        heightCm: formData.heightCm ? Number(formData.heightCm) : undefined,
        weightKg: formData.weightKg ? Number(formData.weightKg) : undefined,
        allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
        chronicConditions: formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
        previousSurgeries: formData.previousSurgeries.split(',').map(s => s.trim()).filter(Boolean),
        familyHistory: formData.familyHistory.split(',').map(s => s.trim()).filter(Boolean),
        importantNotes: formData.importantNotes,
        criticalAllergies: formData.criticalAllergies.split(',').map(s => s.trim()).filter(Boolean),
        criticalConditions: formData.criticalConditions.split(',').map(s => s.trim()).filter(Boolean),
        importantMedicines: formData.importantMedicines.split(',').map(s => s.trim()).filter(Boolean),
        primaryDoctorName: formData.primaryDoctorName,
        primaryDoctorPhone: formData.primaryDoctorPhone,
        lastCheckupDate: formData.lastCheckupDate ? new Date(formData.lastCheckupDate) : undefined,
        preferredLanguage: formData.preferredLanguage,
        highContrast,
        largeText,
        simpleMode,
        voiceAssistance,
        notificationPreferences: {
          medicineReminders: formData.medicineReminders,
          appointmentReminders: formData.appointmentReminders,
          reportStatus: formData.reportStatus,
          emailAlerts: formData.emailAlerts,
        },
      };

      const res = await api.put('/user/profile', payload);
      if (res.profile) {
        updateUserLocal(res.profile);
      }
      if (formData.preferredLanguage !== currentLang) {
        changeLanguage(formData.preferredLanguage);
      }
      setFeedback({ type: 'success', message: 'Profile details saved successfully.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    try {
      const res = await api.post('/user/emergency-contact', newContact);
      setFormData(prev => ({ ...prev, emergencyContacts: res.emergencyContacts }));
      setNewContact({ name: '', relationship: 'Spouse', phone: '', isPrimary: false });
      setShowAddContact(false);
      setFeedback({ type: 'success', message: 'Emergency contact added.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      const res = await api.delete(`/user/emergency-contact/${contactId}`);
      setFormData(prev => ({ ...prev, emergencyContacts: res.emergencyContacts }));
      setFeedback({ type: 'success', message: 'Emergency contact removed.' });
    } catch (err) {
      setFeedback({ type: 'danger', message: err.message });
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: <User className="w-4 h-4" /> },
    { id: 'health', label: 'Health Profile', icon: <Activity className="w-4 h-4" /> },
    { id: 'emergency', label: 'Emergency', icon: <ShieldAlert className="w-4 h-4 text-rose-600" /> },
    { id: 'team', label: 'Care Team', icon: <Stethoscope className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Logs', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
            {formData.name ? formData.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{formData.name || 'User Profile'}</h1>
              {user?.phoneVerified && <Badge variant="success" dot>Verified</Badge>}
              {user?.abhaConnected && <Badge variant="teal">ABHA Linked</Badge>}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              {formData.phone || formData.email} &bull; Blood Group: {formData.bloodGroup || 'O+'}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Changes
        </Button>
      </div>

      {/* Feedback banner */}
      {feedback.message && (
        <Alert variant={feedback.type} onClose={() => setFeedback({ type: '', message: '' })}>
          {feedback.message}
        </Alert>
      )}

      {/* Section Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: PERSONAL */}
      {activeTab === 'personal' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
            <p className="text-xs text-slate-500">Basic identification and contact particulars.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Legal Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />

            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
                { value: 'prefer_not_to_say', label: 'Prefer not to say' },
              ]}
            />

            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            />

            <Input
              label="Age (Years)"
              type="number"
              value={formData.age}
              disabled
              helperText="Auto-calculated from date of birth."
            />

            <Input
              label="Registered Phone Number"
              value={formData.phone}
              disabled
              helperText="Verified authentication mobile number."
            />

            <Input
              label="Email Address"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />

            <Select
              label="Preferred System Language"
              value={formData.preferredLanguage}
              onChange={(e) => handleChange('preferredLanguage', e.target.value)}
              options={languages.map(l => ({ value: l.code, label: `${l.native} (${l.name})` }))}
            />
          </div>
        </Card>
      )}

      {/* TAB 2: HEALTH PROFILE */}
      {activeTab === 'health' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Medical Background & Vitals</h3>
            <p className="text-xs text-slate-500">
              Crucial parameters analyzed during Copilot document reviews and medication safety checks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Blood Group"
              value={formData.bloodGroup}
              onChange={(e) => handleChange('bloodGroup', e.target.value)}
              options={[
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />

            <Input
              label="Height (cm)"
              type="number"
              value={formData.heightCm}
              onChange={(e) => handleChange('heightCm', e.target.value)}
              placeholder="e.g. 175"
            />

            <Input
              label="Weight (kg)"
              type="number"
              value={formData.weightKg}
              onChange={(e) => handleChange('weightKg', e.target.value)}
              placeholder="e.g. 72"
            />
          </div>

          <div className="space-y-4">
            <Input
              label="Known Allergies"
              value={formData.allergies}
              onChange={(e) => handleChange('allergies', e.target.value)}
              placeholder="e.g. Penicillin, Peanuts, Sulfa (comma-separated)"
              helperText="Helps the Health Copilot warn you against conflicting prescribed substances."
            />

            <Input
              label="Chronic Medical Conditions"
              value={formData.chronicConditions}
              onChange={(e) => handleChange('chronicConditions', e.target.value)}
              placeholder="e.g. Type 2 Diabetes, Hypertension, Hypothyroidism"
            />

            <Input
              label="Previous Surgeries & Hospitalizations"
              value={formData.previousSurgeries}
              onChange={(e) => handleChange('previousSurgeries', e.target.value)}
              placeholder="e.g. Appendectomy (2018), Knee Arthroscopy (2022)"
            />

            <Input
              label="Family Medical History"
              value={formData.familyHistory}
              onChange={(e) => handleChange('familyHistory', e.target.value)}
              placeholder="e.g. Father: Heart Disease, Mother: Diabetes"
            />

            <Textarea
              label="Important Medical Notes & Doctor Instructions"
              value={formData.importantNotes}
              onChange={(e) => handleChange('importantNotes', e.target.value)}
              placeholder="Any specific instructions, dietary restrictions or clinical details..."
              rows={3}
            />
          </div>
        </Card>
      )}

      {/* TAB 3: EMERGENCY */}
      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Emergency Contacts
                </h3>
                <p className="text-xs text-slate-500">
                  Visible instantly on your Emergency Health Card and QR code scans.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddContact(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Contact
              </Button>
            </div>

            {/* Contacts List */}
            {formData.emergencyContacts.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-xs text-slate-500">No emergency contacts added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.emergencyContacts.map((contact) => (
                  <div
                    key={contact._id || contact.phone}
                    className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{contact.name}</span>
                        {contact.isPrimary && <Badge variant="danger" size="sm">Primary</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {contact.relationship} &bull; {contact.phone}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveContact(contact._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Contact Modal / Inline Form */}
            {showAddContact && (
              <form onSubmit={handleAddContact} className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wide">New Emergency Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input
                    placeholder="Contact Name"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    required
                  />
                  <Select
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                    options={[
                      { value: 'Spouse', label: 'Spouse' },
                      { value: 'Parent', label: 'Parent' },
                      { value: 'Sibling', label: 'Sibling' },
                      { value: 'Child', label: 'Child' },
                      { value: 'Friend', label: 'Friend' },
                      { value: 'Doctor', label: 'Doctor' },
                    ]}
                  />
                  <Input
                    placeholder="Phone Number"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddContact(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" type="submit">
                    Save Contact
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Critical Emergency Medical Data</h3>
            <p className="text-xs text-slate-500">
              Only these vital fields are revealed to responders when an emergency QR card is scanned.
            </p>

            <Input
              label="Critical Allergies (Anaphylaxis Risk)"
              value={formData.criticalAllergies}
              onChange={(e) => handleChange('criticalAllergies', e.target.value)}
              placeholder="e.g. Penicillin, Severe bee sting allergy"
            />

            <Input
              label="Critical Conditions (e.g. Insulin-dependent Diabetes, Pacemaker)"
              value={formData.criticalConditions}
              onChange={(e) => handleChange('criticalConditions', e.target.value)}
              placeholder="e.g. Type 1 Diabetes, Cardiac Stent"
            />

            <Input
              label="Important Life-Sustaining Medicines"
              value={formData.importantMedicines}
              onChange={(e) => handleChange('importantMedicines', e.target.value)}
              placeholder="e.g. Insulin Glargine, Telmisartan 40mg"
            />
          </Card>
        </div>
      )}

      {/* TAB 4: CARE TEAM */}
      {activeTab === 'team' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Primary Doctor & Care Team</h3>
            <p className="text-xs text-slate-500">
              Keep your primary treating physician's details on record for quick consultation links.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Doctor Name"
              value={formData.primaryDoctorName}
              onChange={(e) => handleChange('primaryDoctorName', e.target.value)}
              placeholder="e.g. Dr. Ramesh Sharma"
            />

            <Input
              label="Doctor Phone / Clinic Contact"
              value={formData.primaryDoctorPhone}
              onChange={(e) => handleChange('primaryDoctorPhone', e.target.value)}
              placeholder="e.g. +91 98400 12345"
            />

            <Input
              label="Last Medical Consultation Date"
              type="date"
              value={formData.lastCheckupDate}
              onChange={(e) => handleChange('lastCheckupDate', e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* TAB 5: PREFERENCES */}
      {activeTab === 'preferences' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Accessibility & Notification Preferences</h3>
            <p className="text-xs text-slate-500">Customize how Healthify notifies you and displays content.</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Display & Voice</h4>
            
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">High Contrast Mode</p>
                <p className="text-xs text-slate-500">Increased color contrast across medical charts & text</p>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">Large Text Scaling</p>
                <p className="text-xs text-slate-500">Optimized reading scale for elderly or low-vision users</p>
              </div>
              <input
                type="checkbox"
                checked={largeText}
                onChange={(e) => setLargeText(e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">Simple / Caregiver Mode</p>
                <p className="text-xs text-slate-500">Reduces complex data tables into high-touch plain cards</p>
              </div>
              <input
                type="checkbox"
                checked={simpleMode}
                onChange={(e) => setSimpleMode(e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">Voice Assistance</p>
                <p className="text-xs text-slate-500">Allow speech readouts for lab report summaries</p>
              </div>
              <input
                type="checkbox"
                checked={voiceAssistance}
                onChange={(e) => setVoiceAssistance(e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded"
              />
            </label>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deterministic Reminders</h4>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">Medicine Dose Alerts</p>
                <p className="text-xs text-slate-500">Timely notifications for morning, afternoon and night medicines</p>
              </div>
              <input
                type="checkbox"
                checked={formData.medicineReminders}
                onChange={(e) => handleChange('medicineReminders', e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-slate-900">Upcoming Doctor Appointments</p>
                <p className="text-xs text-slate-500">Reminders 24 hours and 1 hour before scheduled consultations</p>
              </div>
              <input
                type="checkbox"
                checked={formData.appointmentReminders}
                onChange={(e) => handleChange('appointmentReminders', e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded"
              />
            </label>
          </div>
        </Card>
      )}

      {/* TAB 6: PRIVACY & AUDIT LOGS */}
      {activeTab === 'privacy' && (
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-600" />
              Privacy & Access Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Complete compliance log of all logins, record exports, and caregiver access sessions.
            </p>
          </div>

          {accessLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No recent access events recorded.</p>
          ) : (
            <div className="space-y-2">
              {accessLogs.map((log, index) => (
                <div
                  key={log._id || index}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <div>
                      <span className="font-semibold text-slate-800 font-mono">{log.action}</span>
                      <p className="text-[11px] text-slate-500">
                        {log.details ? JSON.stringify(log.details) : 'Authorized action'}
                      </p>
                    </div>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
