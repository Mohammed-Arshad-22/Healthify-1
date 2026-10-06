import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Pill, 
  FileText, 
  Activity, 
  Stethoscope, 
  Building, 
  Search, 
  Filter, 
  ChevronDown, 
  Sparkles 
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, Badge, LoadingState, EmptyState } from '../../components/ui';

export const TimelinePage = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        let url = `/records?sort=-date`;
        if (filterType !== 'all') url += `&type=${filterType}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        const res = await api.get(url);
        setRecords(res.records || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [filterType, searchQuery]);

  // Group records by Year and Month
  const groupedTimeline = records.reduce((acc, rec) => {
    const d = new Date(rec.date);
    const year = d.getFullYear() || 2026;
    const month = d.toLocaleString('default', { month: 'long' });
    
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push(rec);
    return acc;
  }, {});

  const getRecordIcon = (type) => {
    switch (type) {
      case 'prescription':
        return <Pill className="w-4 h-4 text-teal-600" />;
      case 'lab_report':
        return <Activity className="w-4 h-4 text-cyan-600" />;
      case 'consultation':
        return <Stethoscope className="w-4 h-4 text-emerald-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Health Timeline</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Chronological timeline of your medical consultations, laboratory reports, and medication histories.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline by doctor, clinic or event..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'prescription', label: 'Prescriptions' },
            { id: 'lab_report', label: 'Lab Reports' },
            { id: 'consultation', label: 'Consultations' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterType(item.id)}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors
                ${filterType === item.id
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}
              `}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Display */}
      {loading ? (
        <LoadingState message="Organizing health timeline..." />
      ) : Object.keys(groupedTimeline).length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="No timeline events recorded"
          description="Upload medical documents or create health records to start visualizing your timeline."
        />
      ) : (
        <div className="space-y-8 pt-2">
          {Object.keys(groupedTimeline).map((year) => (
            <div key={year} className="space-y-6">
              {/* Year Marker Header */}
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-xl bg-slate-900 text-white font-bold text-sm tracking-wide shadow-xs">
                  {year}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Months */}
              {Object.keys(groupedTimeline[year]).map((month) => (
                <div key={month} className="relative pl-6 sm:pl-8 space-y-4">
                  {/* Vertical Timeline Guide Line */}
                  <div className="absolute left-2.5 sm:left-3.5 top-2 bottom-0 w-0.5 bg-slate-200" />

                  {/* Month Label */}
                  <div className="relative flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-600 ring-4 ring-teal-100 -ml-[23px] sm:-ml-[27px]" />
                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                      {month}
                    </span>
                  </div>

                  {/* Month's Event Cards */}
                  <div className="space-y-3">
                    {groupedTimeline[year][month].map((rec) => (
                      <Card
                        key={rec._id}
                        className="p-4 sm:p-5 hover:shadow-card transition-all border-slate-200/90 relative"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {getRecordIcon(rec.recordType)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                  {rec.title}
                                </h3>
                                <Badge variant="neutral" size="sm">
                                  {rec.recordType.replace('_', ' ')}
                                </Badge>
                                {rec.source === 'ABHA_ABDM' && (
                                  <Badge variant="teal" size="sm">ABHA Interop</Badge>
                                )}
                              </div>

                              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                                <span>{new Date(rec.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                {rec.doctorName && (
                                  <span>&bull; {rec.doctorName}</span>
                                )}
                                {rec.hospitalClinicName && (
                                  <span>&bull; {rec.hospitalClinicName}</span>
                                )}
                              </p>

                              {rec.notes && (
                                <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                                  {rec.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
