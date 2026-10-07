import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import { buildStructuredHealthProfile } from '../services/healthProfile.service.js';

// Get Current User Profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User profile not found.', 404));
    }

    res.status(200).json({
      status: 'success',
      profile: user,
    });
  } catch (err) {
    next(err);
  }
};

// Update Profile Sections (Personal, Health, Emergency, Preferences, Accessibility)
export const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'name', 'dateOfBirth', 'age', 'gender', 'avatarUrl', 'preferredLanguage',
      'bloodGroup', 'heightCm', 'weightKg', 'allergies', 'chronicConditions',
      'previousSurgeries', 'familyHistory', 'importantNotes',
      'criticalAllergies', 'criticalConditions', 'importantMedicines',
      'primaryDoctorName', 'primaryDoctorPhone', 'lastCheckupDate',
      'abhaConnected', 'abhaNumber', 'abhaAddress', 'abhaDemoMode',
      'highContrast', 'largeText', 'simpleMode', 'voiceAssistance',
      'notificationPreferences', 'emergencyContacts'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Auto-calculate age if dateOfBirth is provided
    if (updates.dateOfBirth) {
      const birthDate = new Date(updates.dateOfBirth);
      const diffMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(diffMs);
      updates.age = Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { 
        $set: updates,
        $push: {
          auditLogs: {
            action: 'PROFILE_UPDATED',
            ip: req.ip || '',
            userAgent: req.headers['user-agent'] || '',
            details: { updatedFields: Object.keys(updates) },
          }
        }
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully.',
      profile: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

// Add Emergency Contact
export const addEmergencyContact = async (req, res, next) => {
  try {
    const { name, relationship, phone, isPrimary } = req.body;
    if (!name || !relationship || !phone) {
      return next(new AppError('Name, relationship, and phone are required for emergency contacts.', 400));
    }

    const user = await User.findById(req.user._id);
    if (isPrimary) {
      user.emergencyContacts.forEach(c => c.isPrimary = false);
    }

    user.emergencyContacts.push({ name, relationship, phone, isPrimary: Boolean(isPrimary) });
    user.auditLogs.push({
      action: 'EMERGENCY_CONTACT_ADDED',
      details: { name, relationship },
    });

    await user.save();

    res.status(200).json({
      status: 'success',
      emergencyContacts: user.emergencyContacts,
    });
  } catch (err) {
    next(err);
  }
};

// Remove Emergency Contact
export const removeEmergencyContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const user = await User.findById(req.user._id);

    user.emergencyContacts = user.emergencyContacts.filter(c => c._id.toString() !== contactId);
    user.auditLogs.push({
      action: 'EMERGENCY_CONTACT_REMOVED',
      details: { contactId },
    });

    await user.save();

    res.status(200).json({
      status: 'success',
      emergencyContacts: user.emergencyContacts,
    });
  } catch (err) {
    next(err);
  }
};

// Get Privacy & Access Audit Logs
export const getAccessLogs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('auditLogs sessions');
    res.status(200).json({
      status: 'success',
      auditLogs: user.auditLogs.slice(-50).reverse(),
      activeSessions: user.sessions,
    });
  } catch (err) {
    next(err);
  }
};

// PHASE 7: Get Structured Health Profile
export const getStructuredHealthProfile = async (req, res, next) => {
  try {
    const healthProfile = await buildStructuredHealthProfile(req.user._id);
    res.status(200).json({
      status: 'success',
      health_profile: healthProfile,
    });
  } catch (err) {
    next(err);
  }
};
