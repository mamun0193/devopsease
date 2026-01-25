import { analyzeContainer } from '../src/services/containerAnalysis.service.js';

const containerId = 'c9ee0505c502';

(async () => {
  try {
    const analysis = await analyzeContainer(containerId);
    console.log(JSON.stringify(analysis, null, 2));
  } catch (err) {
    console.error('Analysis failed:', err.message);
  }
})();
