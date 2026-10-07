import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this health feature.', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = currentUser;
    req.sessionId = decoded.sessionId;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired authentication token.', 401));
  }
};

export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const currentUser = await User.findById(decoded.id);
    if (currentUser) {
      req.user = currentUser;
      req.sessionId = decoded.sessionId;
    }
    next();
  } catch (err) {
    // Proceed as unauthenticated
    next();
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Access denied. You do not have permission to access this resource.', 403));
    }
    next();
  };
};
