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
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPublicCard = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        if (!userId || userId === 'demo_user' || userId === 'not_available' || userId.length !== 24) {
          setNotFound(true);
          setData(null);
          return;
        }

        const res = await api.get(`/emergency/public/${userId}`);
        if (res.emergencyCard) {
          setData(res.emergencyCard);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Error fetching emergency card:', err);
        setNotFound(true);
        setData(null);
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
        ) : notFound || !data ? (
          <div className="bg-slate-800 text-center p-8 rounded-3xl border border-slate-700 space-y-4">
            <ShieldAlert className="w-12 h-12 text-slate-500 mx-auto" />
            <h2 className="text-lg font-bold text-white">Emergency Record Not Found</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              This emergency health card QR identifier is invalid, has expired, or is not accessible.
            </p>
            <Link to="/login" className="inline-block text-xs font-semibold text-teal-400 hover:underline">
              Return to Healthify
            </Link>
          </div>
        ) : (
          <div className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-rose-500 space-y-6">
            
            {/* Header particulars */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Patient Name</span>
                <h2 className="text-2xl font-black text-slate-900">{data.patientName || 'Registered Patient'}</h2>
                <span className="text-xs text-slate-500">{data.age ? `Age: ${data.age} Years` : 'Age: Not specified'}</span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Blood Group</span>
                <span className="text-3xl font-black text-rose-600 font-mono">{data.bloodGroup || 'N/A'}</span>
              </div>
            </div>

            {/* Critical Allergies - Red Alert */}
            {data.criticalAllergies && data.criticalAllergies.length > 0 ? (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Critical Drug & Food Allergies
                </span>
                <p className="text-sm font-bold text-rose-950">
                  {data.criticalAllergies.join(', ')}
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                No critical allergies recorded.
              </div>
            )}

            {/* Chronic Conditions */}
            {data.criticalConditions && data.criticalConditions.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Heart className="w-4 h-4 text-amber-600" />
                  Chronic Conditions
                </span>
                <p className="text-sm font-semibold text-amber-950">
                  {data.criticalConditions.join(', ')}
                </p>
              </div>
            )}

            {/* Life sustaining medicines */}
            {data.importantMedicines && data.importantMedicines.length > 0 && (
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Pill className="w-4 h-4 text-teal-600" />
                  Essential Daily Medications
                </span>
                <p className="text-sm font-semibold text-teal-950">
                  {data.importantMedicines.join(', ')}
                </p>
              </div>
            )}

            {/* Emergency Contacts */}
            {data.emergencyContacts && data.emergencyContacts.length > 0 ? (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Emergency Contacts
                </span>
                <div className="space-y-2">
                  {data.emergencyContacts.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{c.name}</p>
                        <p className="text-[11px] text-slate-500">{c.relationship}</p>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-rose-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call Now
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No emergency family contacts recorded.</p>
            )}

            {/* Primary Doctor */}
            {data.primaryDoctor?.name && (
              <div className="pt-2 flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Treating Physician</span>
                  <span className="font-bold text-slate-800">{data.primaryDoctor.name}</span>
                </div>
                {data.primaryDoctor.phone && (
                  <a href={`tel:${data.primaryDoctor.phone}`} className="font-mono text-teal-700 font-bold hover:underline">
                    {data.primaryDoctor.phone}
                  </a>
                )}
              </div>
            )}

            {/* Toll-free IVR & Disclaimers */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-teal-600" /> Encrypted Access Audit
              </span>
              <span>24/7 Helpline: 1800-889-CARE</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default PublicEmergencyView;
