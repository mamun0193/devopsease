import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import readinessService from '../services/readiness.service.js';

let isConnected = false;

export const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        logger.error("MONGO_URI is not defined in environment variables");
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        isConnected = true;
        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Update readiness service if available
        if (readinessService && typeof readinessService.setDatabaseReady === 'function') {
            readinessService.setDatabaseReady(true);
        }

    } catch (error) {
        logger.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    isConnected = false;
    if (readinessService && typeof readinessService.setDatabaseReady === 'function') {
        readinessService.setDatabaseReady(false);
    }
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
    isConnected = true;
    if (readinessService && typeof readinessService.setDatabaseReady === 'function') {
        readinessService.setDatabaseReady(true);
    }
});

export const isDBConnected = () => isConnected;

export const disconnectDB = async () => {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed');
};
