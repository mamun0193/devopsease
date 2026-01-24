import { collectSignals } from '../src/intelligence/signals/index.js';

const signals = collectSignals({
  state: {
    Running: false,
    ExitCode: 137,
    OOMKilled: true
  },
  exitCode: 137,
  restartCount: 6,
  logs: 'Error: connect ECONNREFUSED 127.0.0.1:6379'
});

console.log(JSON.stringify(signals, null, 2));
