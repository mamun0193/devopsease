import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';

dotenv.config();

const createAdmin = async () => {
    try {
        await connectDB();

        // Check for environment variables
        const email = process.env.ADMIN_EMAIL || 'admin@devopsease.com';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const name = process.env.ADMIN_NAME || 'System Admin';

        if (!process.env.ADMIN_PASSWORD) {
            console.warn('WARNING: Using default insecure password. Set ADMIN_PASSWORD in .env for production safety.');
        } else {
            console.info('Using secure credentials from environment variables.');
        }

        // Check if exists
        const existing = await User.findOne({ primaryEmail: email });
        if (existing) {
            console.log('Admin user already exists. Updating role to admin...');
            existing.role = 'admin';
            existing.password = await bcrypt.hash(password, 10); // Reset password to ensure we know it
            await existing.save();
            console.log('Admin user updated.');
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({
                primaryEmail: email,
                password: hashedPassword,
                name,
                role: 'admin',
                plan: 'premium',
                status: 'active'
            });
            console.log('Admin user created.');
        }

        console.log('\n--- Admin Credentials ---');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('-------------------------\n');

    } catch (error) {
        console.error('Failed to create admin:', error);
    } finally {
        await disconnectDB();
        process.exit(0);
    }
};

createAdmin();
