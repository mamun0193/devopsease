import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is required.');
    process.exit(1);
}

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.\n');

    const db = mongoose.connection.db;

    // 1. ContainerMetric: Update TTL from 7d → 30d 
    console.log('=== ContainerMetric TTL Update ===');
    try {
        const result = await db.command({
            collMod: 'containermetrics',
            index: {
                keyPattern: { timestamp: 1 },
                expireAfterSeconds: 30 * 24 * 60 * 60,  // 30 days
            },
        });
        console.log('  ContainerMetric TTL updated to 30 days.');
        console.log('  Result:', JSON.stringify(result, null, 2));
    } catch (err) {
        if (err.codeName === 'IndexNotFound') {
            console.log('  TTL index on `timestamp` not found. It will be created on next server start via the schema definition.');
        } else {
            console.error('  Failed to update ContainerMetric TTL:', err.message);
        }
    }

    // 2. Alert: Add 90-day absolute TTL on createdAt 
    console.log('\n=== Alert TTL Addition ===');
    try {
        // Check if the index already exists
        const indexes = await db.collection('alerts').indexes();
        const hasCreatedAtTTL = indexes.some(
            (idx) => idx.key && idx.key.createdAt === 1 && idx.expireAfterSeconds != null
        );

        if (hasCreatedAtTTL) {
            // Update existing TTL to ensure it's 90 days
            const result = await db.command({
                collMod: 'alerts',
                index: {
                    keyPattern: { createdAt: 1 },
                    expireAfterSeconds: 90 * 24 * 60 * 60,  // 90 days
                },
            });
            console.log('  Alert TTL on `createdAt` updated to 90 days.');
            console.log('  Result:', JSON.stringify(result, null, 2));
        } else {
            // Create the TTL index
            await db.collection('alerts').createIndex(
                { createdAt: 1 },
                { expireAfterSeconds: 90 * 24 * 60 * 60 }  // 90 days
            );
            console.log('  Alert TTL on `createdAt` created (90 days).');
        }
    } catch (err) {
        console.error('  Failed to update Alert TTL:', err.message);
    }

    // ── Verify ──
    console.log('\n=== Verification ===');

    try {
        const metricIndexes = await db.collection('containermetrics').indexes();
        const metricTTL = metricIndexes.find(i => i.key?.timestamp === 1 && i.expireAfterSeconds != null);
        console.log(`  ContainerMetric TTL: ${metricTTL ? `${metricTTL.expireAfterSeconds}s (${Math.round(metricTTL.expireAfterSeconds / 86400)}d)` : 'NOT FOUND'}`);
    } catch (err) {
        console.log('  Could not verify ContainerMetric indexes:', err.message);
    }

    try {
        const alertIndexes = await db.collection('alerts').indexes();
        const alertResolvedTTL = alertIndexes.find(i => i.key?.resolvedAt === 1 && i.expireAfterSeconds != null);
        const alertCreatedTTL = alertIndexes.find(i => i.key?.createdAt === 1 && i.expireAfterSeconds != null);
        console.log(`  Alert resolved TTL: ${alertResolvedTTL ? `${alertResolvedTTL.expireAfterSeconds}s (${Math.round(alertResolvedTTL.expireAfterSeconds / 86400)}d)` : 'NOT FOUND'}`);
        console.log(`  Alert absolute TTL: ${alertCreatedTTL ? `${alertCreatedTTL.expireAfterSeconds}s (${Math.round(alertCreatedTTL.expireAfterSeconds / 86400)}d)` : 'NOT FOUND'}`);
    } catch (err) {
        console.log('  Could not verify Alert indexes:', err.message);
    }

    console.log('\nMigration complete.');
    await mongoose.disconnect();
    console.log('Disconnected.');
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
