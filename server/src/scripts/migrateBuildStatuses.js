import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MONGO_URI environment variable is required.');
    process.exit(1);
}

const STATUS_MAP = {
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed',
    TIMEOUT: 'timeout',
};

async function migrate() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collection = db.collection('builds');

    let totalUpdated = 0;

    for (const [upper, lower] of Object.entries(STATUS_MAP)) {
        const result = await collection.updateMany(
            { status: upper },
            { $set: { status: lower } }
        );

        if (result.modifiedCount > 0) {
            console.log(`  ${upper} → ${lower}: ${result.modifiedCount} document(s) updated`);
            totalUpdated += result.modifiedCount;
        } else {
            console.log(`  ${upper} → ${lower}: no documents to update`);
        }
    }

    console.log(`\nMigration complete. Total documents updated: ${totalUpdated}`);

    await mongoose.disconnect();
    console.log('Disconnected.');
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
