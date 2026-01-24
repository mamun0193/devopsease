import { classifyFailure } from '../src/intelligence/classifier.js';

const signals = [
  { signal: 'OOM_KILLED', severity: 'high', reason: 'OOM' },
  { signal: 'CRASH_LOOP', severity: 'high', reason: 'Restarted' },
  { signal: 'CONNECTION_REFUSED', severity: 'high', reason: 'Redis down' }
];

const failure = classifyFailure(signals);
console.log(JSON.stringify(failure, null, 2));