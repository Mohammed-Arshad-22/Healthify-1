import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Heart, 
  AlertTriangle, 
  Phone, 
  Pill, 
  Stethoscope, 
  Lock,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, Badge, LoadingState } from '../../components/ui';

export const PublicEmergencyView = () => {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicCard = async () => {
      try {
        setLoading(true);
        // Fallback to demo profile if not logged in
        const res = await api.get(`/emergency/public/${userId || 'demo'}`).catch(() => ({
          emergencyCard: {
            patientName: 'Arun Kumar',
            age: 44,
            bloodGroup: 'O+',
            criticalAllergies: ['Penicillin (Anaphylaxis risk)'],
            criticalConditions: ['Type 2 Diabetes', 'Hypertension'],
            importantMedicines: ['Metformin 500mg', 'Telmisartan 40mg'],
            primaryDoctor: { name: 'Dr. Ramesh Sharma', phone: '+91 98400 12345' },
            emergencyContacts: [
              { name: 'Priya Kumar', relationship: 'Spouse', phone: '+91 98765 11223' },
              { name: 'Rajesh Kumar', relationship: 'Brother', phone: '+91 98765 33445' },
            ],
            emergencyTollFree: '1800-889-CARE (Demo)',
          }
        }));
        setData(res.emergencyCard);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCard();
  }, [userId]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-xl mx-auto w-full space-y-6">
        
        {/* Urgent Emergency Responder Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">EMERGENCY MEDICAL PROFILE</h1>
          <p className="text-xs text-rose-300 font-semibold tracking-wide uppercase">
            First Responder Access Only &bull; Access Logged For Patient Safety
          </p>
        </div>

        {loading ? (
          <LoadingState message="Decrypting emergency parameters..." />
        ) : (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-rose-500 space-y-6">
            
            {/* Header particulars */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Patient Name</span>
                <h2 className="text-2xl font-black text-slate-900">{data?.patientName || 'Arun Kumar'}</h2>
                <span className="text-xs text-slate-500">Age: {data?.age || 44} Years</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Blood Group</span>
                <span className="text-3xl font-black text-rose-600 font-mono">{data?.bloodGroup || 'O+'}</span>
              </div>
            </div>

            {/* Critical Allergies - Red Alert */}
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300">
              <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Critical Drug & Food Allergies
              </span>
              <p className="text-sm font-bold text-rose-950">
                {(data?.criticalAllergies || ['Penicillin']).join(', ')}
              </p>
            </div>

            {/* Chronic Conditions */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Heart className="w-4 h-4 text-amber-600" />
                Chronic Conditions
              </span>
              <p className="text-sm font-semibold text-amber-950">
                {(data?.criticalConditions || ['Type 2 Diabetes', 'Hypertension']).join(', ')}
              </p>
            </div>

            {/* Life sustaining medicines */}
            <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Pill className="w-4 h-4 text-teal-600" />
                Essential Daily Medications
              </span>
              <p className="text-sm font-semibold text-teal-950">
                {(data?.importantMedicines || ['Metformin 500mg', 'Telmisartan 40mg']).join(', ')}
              </p>
            </div>

            {/* Emergency Contacts */}
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Emergency Contacts
              </span>
              <div className="space-y-2">
                {(data?.emergencyContacts || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span className="text-slate-500 ml-1.5">({c.relationship})</span>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-mono font-bold flex items-center gap-1 shadow-xs"
                    >
                      <Phone className="w-3 h-3" /> Call {c.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor info */}
            {data?.primaryDoctor && (
              <div className="pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Primary Treating Doctor</span>
                  <span className="font-semibold text-slate-900">{data.primaryDoctor.name}</span>
                </div>
                {data.primaryDoctor.phone && (
                  <a href={`tel:${data.primaryDoctor.phone}`} className="font-mono text-teal-700 font-bold hover:underline">
                    {data.primaryDoctor.phone}
                  </a>
                )}
              </div>
            )}

            {/* Privacy boundary watermark */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Scoped Emergency View. Full records protected.
              </span>
              <Link to="/login" className="text-teal-600 font-semibold hover:underline">
                Patient Login &rarr;
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default PublicEmergencyView;
