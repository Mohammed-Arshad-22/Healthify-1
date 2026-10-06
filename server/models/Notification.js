import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['medicine_reminder', 'appointment', 'report_analyzed', 'abha_imported', 'emergency_alert', 'system'],
    default: 'system',
  },
  read: { type: Boolean, default: false },
  actionUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

export const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
