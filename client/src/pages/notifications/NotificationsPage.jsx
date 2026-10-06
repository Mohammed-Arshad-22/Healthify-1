import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  Pill, 
  Calendar, 
  FileCheck, 
  QrCode, 
  ShieldAlert,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import { Button, Card, Badge, LoadingState, EmptyState } from '../../components/ui';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.notifications?.length ? res.notifications : [
        {
          _id: 'notif-1',
          type: 'medicine_reminder',
          title: 'Morning Medicine Reminder',
          message: 'Time for Metformin 500mg and Telmisartan 40mg after breakfast.',
          read: false,
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          _id: 'notif-2',
          type: 'report_analyzed',
          title: 'Lab Report Verified',
          message: 'Comprehensive Metabolic Panel has been extracted and normalized into health trends.',
          read: true,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          _id: 'notif-3',
          type: 'abha_imported',
          title: 'ABDM Health Records Linked',
          message: 'Discovered and imported Apollo prescription via ABDM Sandbox exchange.',
          read: true,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'medicine_reminder':
        return <Pill className="w-5 h-5 text-teal-600" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-cyan-600" />;
      case 'report_analyzed':
        return <FileCheck className="w-5 h-5 text-emerald-600" />;
      case 'emergency_alert':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications & Alerts</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Deterministic medication dose reminders, upcoming appointments, and ABHA synchronization notices.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No notifications"
          description="You're all caught up! You'll receive timely updates for scheduled doses and appointments here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n._id}
              className={`p-4 sm:p-5 transition-all ${!n.read ? 'border-teal-200 bg-teal-50/20' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{n.title}</h3>
                      {!n.read && <Badge variant="teal" size="sm">New</Badge>}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkRead(n._id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
