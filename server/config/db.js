import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './config.js';

let mongodInstance = null;

export const connectDB = async () => {
  try {
    // Attempt connecting to the configured MongoDB URI with a short timeout
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Successfully connected to MongoDB at ${config.mongoUri}`);
    return;
  } catch (err) {
    console.warn(`[Database] Local MongoDB unreachable at ${config.mongoUri}: ${err.message}`);
    console.log('[Database] Initializing embedded MongoDB memory server for development fallback...');
    
    try {
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to Embedded MongoDB instance at ${memoryUri}`);
    } catch (memErr) {
      console.error('[Database] Failed to initialize embedded MongoDB:', memErr.message);
      throw memErr;
    }
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
    console.log('[Database] Disconnected from MongoDB');
  } catch (err) {
    console.error('[Database] Error disconnecting:', err.message);
  }
};
