import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { connectDB, disconnectDB } from '../config/db.js';

dotenv.config();

const seedUser = async () => {
    try {
        await connectDB();

        const user = {
            oauthProvider: 'local',
            oauthId: 'dev-user-01',
            email: 'dev@example.com',
            name: 'DevOps Operator',
            role: 'operator',
            plan: 'pro'
        };

        // Upsert user
        const updatedUser = await User.findOneAndUpdate(
            { oauthProvider: user.oauthProvider, oauthId: user.oauthId },
            user,
            { new: true, upsert: true }
        );

        console.log('User Seeded Successfully:');
        console.log(`ID: ${updatedUser._id}`);
        console.log(`Use this ID in 'x-simulated-user-id' header.`);

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

seedUser();
