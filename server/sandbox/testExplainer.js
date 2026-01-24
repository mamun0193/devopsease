import { explainFailure } from '../src/intelligence/explainer.js';

const failure = {
  category: 'resource',
  stage: 'run',
  confidence: 'high',
  reasons: ['OOM', 'Restarted', 'Redis down']
};

const explanation = explainFailure(failure);
console.log(JSON.stringify(explanation, null, 2));
