/**
 * Migration: Populate userId on existing Deployment documents.
 *
 * For each Deployment that has repoId but no userId, resolves
 * the userId from the associated Repository and sets it.
 *
 * Safe to re-run (idempotent). Orphaned deployments (deleted repo) are logged and skipped.
 *
 * Usage:
 *   node --experimental-modules src/scripts/migrate-deployment-userId.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Deployment from '../models/deployment.model.js';
import Repository from '../models/repository.model.js';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;

if (!MONGO_URI) {
    console.error('ERROR: MONGO_URI or DATABASE_URL environment variable is required.');
    process.exit(1);
}

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.\n');

    // Find all deployments missing userId
    const deploymentsToFix = await Deployment.find({ userId: null }).select('_id repoId').lean();
    console.log(`Found ${deploymentsToFix.length} deployments without userId.\n`);

    if (deploymentsToFix.length === 0) {
        console.log('Nothing to migrate. All deployments already have userId.');
        await mongoose.disconnect();
        return;
    }

    // Batch-fetch all unique repoIds to minimize DB queries
    const repoIds = [...new Set(deploymentsToFix.map(d => d.repoId?.toString()).filter(Boolean))];
    const repos = await Repository.find({ _id: { $in: repoIds } }).select('_id userId').lean();
    const repoUserMap = new Map(repos.map(r => [r._id.toString(), r.userId]));

    let updated = 0;
    let orphaned = 0;
    let errors = 0;

    for (const deployment of deploymentsToFix) {
        const repoIdStr = deployment.repoId?.toString();
        const userId = repoUserMap.get(repoIdStr);

        if (!userId) {
            orphaned++;
            console.warn(`  WARN: Deployment ${deployment._id} has repoId ${repoIdStr} but repo not found (orphaned). Skipping.`);
            continue;
        }

        try {
            await Deployment.updateOne(
                { _id: deployment._id, userId: null },
                { $set: { userId } }
            );
            updated++;
        } catch (err) {
            errors++;
            console.error(`  ERROR: Failed to update deployment ${deployment._id}: ${err.message}`);
        }
    }

    console.log(`\nMigration complete:`);
    console.log(`  Updated:  ${updated}`);
    console.log(`  Orphaned: ${orphaned} (skipped — repo deleted)`);
    console.log(`  Errors:   ${errors}`);

    await mongoose.disconnect();
    console.log('Disconnected.');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
