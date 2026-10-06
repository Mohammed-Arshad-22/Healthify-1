import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Globe, 
  User, 
  Activity, 
  ShieldAlert, 
  QrCode, 
  Sliders, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, languages } from '../../context/LanguageContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';

export const OnboardingPage = () => {
  const { user, updateUserLocal } = useAuth();
  const { currentLang, changeLanguage, t } = useTranslation();
  const { 
    highContrast, setHighContrast, 
    largeText, setLargeText, 
    simpleMode, setSimpleMode,
    voiceAssistance, setVoiceAssistance 
  } = useAccessibility();
  const navigate = useNavigate();

  // Onboarding steps: 1: Language -> 2: Basic Profile -> 3: Health Info -> 4: Emergency Contact -> 5: ABHA Connect -> 6: Accessibility
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [dob, setDob] = useState(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '1985-06-15');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [allergiesText, setAllergiesText] = useState((user?.allergies || []).join(', '));
  const [chronicText, setChronicText] = useState((user?.chronicConditions || []).join(', '));
  
  // Emergency contact
  const [emName, setEmName] = useState(user?.emergencyContacts?.[0]?.name || '');
  const [emRelation, setEmRelation] = useState(user?.emergencyContacts?.[0]?.relationship || 'Spouse');
  const [emPhone, setEmPhone] = useState(user?.emergencyContacts?.[0]?.phone || '');

  // ABHA
  const [abhaChoice, setAbhaChoice] = useState('demo'); // 'demo' | 'skip' | 'manual'
  const [manualAbha, setManualAbha] = useState('');

  const bloodGroupOptions = [
    { value: 'A+', label: 'A+ (Positive)' },
    { value: 'A-', label: 'A- (Negative)' },
    { value: 'B+', label: 'B+ (Positive)' },
    { value: 'B-', label: 'B- (Negative)' },
    { value: 'AB+', label: 'AB+ (Positive)' },
    { value: 'AB-', label: 'AB- (Negative)' },
    { value: 'O+', label: 'O+ (Positive)' },
    { value: 'O-', label: 'O- (Negative)' },
    { value: 'Unknown', label: 'Not Sure / Unknown' },
  ];

  const handleNext = async () => {
    if (step < 6) {
      setStep((prev) => prev + 1);
    } else {
      // Save full onboarding profile to backend
      try {
        setIsSaving(true);
        const allergies = allergiesText.split(',').map(s => s.trim()).filter(Boolean);
        const chronicConditions = chronicText.split(',').map(s => s.trim()).filter(Boolean);

        const payload = {
          name,
          gender,
          dateOfBirth: dob ? new Date(dob) : undefined,
          bloodGroup,
          allergies,
          chronicConditions,
          preferredLanguage: currentLang,
          highContrast,
          largeText,
          simpleMode,
          voiceAssistance,
        };

        if (abhaChoice === 'demo') {
          payload.abhaConnected = true;
          payload.abhaNumber = 'DEMO-ABHA-8842-1920-5511';
          payload.abhaAddress = `${name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'patient'}@abdm`;
          payload.abhaDemoMode = true;
        } else if (abhaChoice === 'manual' && manualAbha) {
          payload.abhaConnected = true;
          payload.abhaNumber = manualAbha;
          payload.abhaDemoMode = false;
        }

        if (emName && emPhone) {
          payload.emergencyContacts = [{
            name: emName,
            relationship: emRelation,
            phone: emPhone,
            isPrimary: true,
          }];
          payload.criticalAllergies = allergies;
          payload.criticalConditions = chronicConditions;
        }

        const res = await api.put('/user/profile', payload);
        if (res.profile) {
          updateUserLocal(res.profile);
        }
        navigate('/');
      } catch (err) {
        console.error('Failed to complete onboarding:', err);
        // Continue to dashboard even on error
        navigate('/');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/70 via-slate-50 to-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full">
        {/* Step Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Step {step} of 6</span>
            <span>{Math.round((step / 6) * 100)}% Complete</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container Card */}
        <Card className="p-6 sm:p-8 shadow-elevated border-slate-200">
          
          {/* STEP 1: Language Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Globe className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Choose Your Preferred Language</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Healthify supports seamless multilingual UI, medical explanations, and Health Copilot understanding.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {languages.map((l) => {
                  const isSelected = currentLang === l.code;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => changeLanguage(l.code)}
                      className={`
                        p-4 rounded-2xl border text-left transition-all
                        ${isSelected
                          ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-200 text-teal-950 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-base">{l.native}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                      </div>
                      <span className="text-xs text-slate-500 font-normal">{l.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Basic Profile */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold mb-2">
                  <User className="w-3.5 h-3.5" />
                  Basic Health Profile
                </div>
                <h2 className="text-xl font-bold text-slate-900">Personal Details</h2>
                <p className="text-xs text-slate-500 mt-1">This helps tailor your dosages and medical records.</p>
              </div>

              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arun Kumar"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
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
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <Select
                label="Blood Group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                options={bloodGroupOptions}
                helperText="Crucial for emergency card and hospital consultations."
              />
            </div>
          )}

          {/* STEP 3: Health Information */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-700 text-xs font-semibold mb-2">
                  <Activity className="w-3.5 h-3.5" />
                  Medical Background
                </div>
                <h2 className="text-xl font-bold text-slate-900">Allergies & Chronic Conditions</h2>
                <p className="text-xs text-slate-500 mt-1">Optional. You can update or skip this anytime.</p>
              </div>

              <Input
                label="Known Drug or Food Allergies"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Peanuts, Sulfa drugs"
                helperText="Separate multiple allergies with a comma."
              />

              <Input
                label="Chronic Conditions (If any)"
                value={chronicText}
                onChange={(e) => setChronicText(e.target.value)}
                placeholder="e.g. Type 2 Diabetes, Hypertension, Asthma"
                helperText="Separate multiple conditions with a comma."
              />
            </div>
          )}

          {/* STEP 4: Emergency Contact */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-semibold mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  Critical Care
                </div>
                <h2 className="text-xl font-bold text-slate-900">Emergency Contact</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Shown on your Emergency Health Card & emergency QR scan.
                </p>
              </div>

              <Input
                label="Contact Person Name"
                value={emName}
                onChange={(e) => setEmName(e.target.value)}
                placeholder="e.g. Priya Kumar"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Relationship"
                  value={emRelation}
                  onChange={(e) => setEmRelation(e.target.value)}
                  options={[
                    { value: 'Spouse', label: 'Spouse' },
                    { value: 'Parent', label: 'Parent' },
                    { value: 'Sibling', label: 'Sibling' },
                    { value: 'Child', label: 'Child' },
                    { value: 'Friend', label: 'Friend' },
                    { value: 'Caregiver', label: 'Caregiver' },
                  ]}
                />

                <Input
                  label="Mobile Number"
                  type="tel"
                  value={emPhone}
                  onChange={(e) => setEmPhone(e.target.value)}
                  placeholder="+91 98765 11223"
                />
              </div>
            </div>
          )}

          {/* STEP 5: ABHA / ABDM Connection */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold mb-2">
                  <QrCode className="w-3.5 h-3.5" />
                  Digital Health Interoperability
                </div>
                <h2 className="text-xl font-bold text-slate-900">Connect ABHA Digital ID</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ayushman Bharat Digital Mission (ABDM) enables paperless health record sharing with hospitals.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Option 1: Demo Sandbox ABHA */}
                <div
                  onClick={() => setAbhaChoice('demo')}
                  className={`
                    p-4 rounded-2xl border cursor-pointer transition-all
                    ${abhaChoice === 'demo'
                      ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-900">
                      Enable Interactive Demo ABHA Account (Recommended)
                    </span>
                    {abhaChoice === 'demo' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  </div>
                  <p className="text-xs text-slate-600">
                    Connects simulated demo sandbox ABHA (DEMO-ABHA-8842-1920-5511) to discover and import sample hospital records.
                  </p>
                  <span className="inline-block mt-2 text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                    DEMO ABHA — Not a real government health identity
                  </span>
                </div>

                {/* Option 2: Skip */}
                <div
                  onClick={() => setAbhaChoice('skip')}
                  className={`
                    p-4 rounded-2xl border cursor-pointer transition-all
                    ${abhaChoice === 'skip'
                      ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-200'
                      : 'border-slate-200 bg-white hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">
                      I'll connect ABHA later
                    </span>
                    {abhaChoice === 'skip' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You can link your ABHA card anytime from the ABDM section.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Accessibility Preferences */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-semibold mb-2">
                  <Sliders className="w-3.5 h-3.5" />
                  Inclusive Experience
                </div>
                <h2 className="text-xl font-bold text-slate-900">Accessibility Preferences</h2>
                <p className="text-xs text-slate-500 mt-1">Configure readability settings tailored for you.</p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">High Contrast Mode</p>
                    <p className="text-xs text-slate-500">Sharper contrasts for users with vision constraints</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Large Text Display</p>
                    <p className="text-xs text-slate-500">Boosts typography scale for easier reading</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={largeText}
                    onChange={(e) => setLargeText(e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Simple / Senior Mode</p>
                    <p className="text-xs text-slate-500">Simplified cards, big buttons & minimal clutter</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={simpleMode}
                    onChange={(e) => setSimpleMode(e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Voice Assistance Mode</p>
                    <p className="text-xs text-slate-500">Enables speech readouts & voice prompt navigation</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceAssistance}
                    onChange={(e) => setVoiceAssistance(e.target.checked)}
                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {step > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={() => setStep((prev) => prev - 1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              {step > 1 && step < 6 && (
                <button
                  type="button"
                  onClick={() => setStep((prev) => prev + 1)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Skip for now
                </button>
              )}

              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                isLoading={isSaving}
                rightIcon={step === 6 ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              >
                {step === 6 ? 'Complete & Enter Dashboard' : 'Continue'}
              </Button>
            </div>
          </div>

        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;
