import mongoose from 'mongoose';
import LoginAttempt from '../src/models/LoginAttempt.js';
import SecurityLog from '../src/models/SecurityLog.js';
import { checkBruteForce, recordFailedAttempt, resetAttempts } from '../src/services/bruteForce.service.js';
import { logAuthEvent, AUTH_EVENTS } from '../src/services/authAudit.service.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/devopsease';

let passed = 0;
let failed = 0;

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}`);
        failed++;
    }
}

async function cleanup() {
    await LoginAttempt.deleteMany({ email: /^test-brute-/ });
    await SecurityLog.deleteMany({ email: /^test-brute-/ });
}

async function testBruteForce() {
    console.log('\n━━━ Brute-Force Protection ━━━');

    const email = 'test-brute-' + Date.now() + '@example.com';

    // 1. First attempt should be allowed
    let result = await checkBruteForce(email);
    assert(result.allowed === true, 'First attempt allowed');

    // 2. Record 4 failed attempts (under threshold)
    for (let i = 0; i < 4; i++) {
        await recordFailedAttempt(email);
    }
    result = await checkBruteForce(email);
    assert(result.allowed === true, '4 failed attempts: still allowed');

    // 3. Record 5th failed attempt → triggers 2s delay
    await recordFailedAttempt(email);
    result = await checkBruteForce(email);
    assert(result.allowed === false, '5 failed attempts: throttled');
    assert(result.retryAfter > 0, 'retryAfter is positive');
    assert(result.locked === false, 'Not locked yet');

    // 4. Wait for delay to expire and retry
    await new Promise(r => setTimeout(r, 2500));
    result = await checkBruteForce(email);
    assert(result.allowed === true, 'After delay: allowed again');

    // 5. Record up to 20 failed attempts → triggers lock
    for (let i = 5; i < 20; i++) {
        await recordFailedAttempt(email);
    }
    result = await checkBruteForce(email);
    assert(result.allowed === false, '20 failed attempts: locked');
    assert(result.locked === true, 'locked flag is true');
    assert(result.retryAfter > 0, 'Lock retryAfter > 0');

    // 6. Reset attempts
    await resetAttempts(email);
    result = await checkBruteForce(email);
    assert(result.allowed === true, 'After reset: allowed again');
}

async function testAuditLogging() {
    console.log('\n━━━ Audit Logging ━━━');

    const email = 'test-brute-audit-' + Date.now() + '@example.com';
    const testUserId = new mongoose.Types.ObjectId();

    // Log a few different events
    logAuthEvent({
        event: AUTH_EVENTS.LOGIN_SUCCESS,
        userId: testUserId,
        email,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
    });

    logAuthEvent({
        event: AUTH_EVENTS.LOGIN_FAILED,
        email,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        metadata: { reason: 'wrong_password' },
    });

    logAuthEvent({
        event: AUTH_EVENTS.REUSE_DETECTED,
        userId: testUserId,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        metadata: { familyId: 'test-family' },
    });

    // Wait for async writes
    await new Promise(r => setTimeout(r, 1000));

    // Verify logs were written
    const logs = await SecurityLog.find({ email }).sort({ timestamp: -1 });
    assert(logs.length >= 2, `${logs.length} audit logs written`);

    const successLog = logs.find(l => l.action === AUTH_EVENTS.LOGIN_SUCCESS);
    assert(successLog?.severity === 'INFO', 'LOGIN_SUCCESS severity is INFO');
    assert(successLog?.result === 'allowed', 'LOGIN_SUCCESS result is allowed');

    const failLog = logs.find(l => l.action === AUTH_EVENTS.LOGIN_FAILED);
    assert(failLog?.severity === 'WARN', 'LOGIN_FAILED severity is WARN');
    assert(failLog?.result === 'denied', 'LOGIN_FAILED result is denied');

    const reuseLog = await SecurityLog.findOne({ action: AUTH_EVENTS.REUSE_DETECTED, userId: testUserId });
    assert(reuseLog?.severity === 'HIGH', 'REUSE_DETECTED severity is HIGH');
}

async function main() {
    console.log('🔐 Day 37 — Auth Security Verification\n');

    await mongoose.connect(MONGO_URI);
    console.log(`📦 Connected to MongoDB`);

    await cleanup();

    await testBruteForce();
    await testAuditLogging();

    await cleanup();
    await mongoose.disconnect();

    console.log(`\n━━━ Results ━━━`);
    console.log(`  Passed: ${passed}  |  Failed: ${failed}`);
    console.log(failed === 0 ? '  ✅ All checks passed' : '  ❌ Some checks failed');

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
